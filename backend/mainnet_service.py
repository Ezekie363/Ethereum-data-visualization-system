"""以太坊主网看板数据服务模块。"""

from __future__ import annotations

import json
import math
import os
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import pandas as pd
from web3 import HTTPProvider, Web3
from web3.exceptions import BlockNotFound


@dataclass
class DayWindow:
    """定义单日时间窗口，统一处理日期与时间戳边界。"""

    date_text: str
    start_ts: int
    end_ts: int


class EthereumMainnetService:
    """负责抓取以太坊主网数据并组织成前端需要的结构。"""

    def __init__(self, rpc_url: str, cache_dir: Path, cache_ttl_seconds: int = 900) -> None:
        """初始化 RPC 连接、缓存路径与算法参数。"""

        if not rpc_url:
            raise ValueError("ETH_RPC_URL 未设置，无法连接以太坊主网")

        self.web3 = Web3(HTTPProvider(rpc_url, request_kwargs={"timeout": 25}))
        if not self.web3.is_connected():
            raise ConnectionError("无法连接以太坊主网 RPC，请检查 ETH_RPC_URL")

        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.cache_ttl_seconds = cache_ttl_seconds

        self.sample_blocks_per_day = int(os.getenv("SAMPLE_BLOCKS_PER_DAY", "12"))
        self.erc20_log_sample_per_day = int(os.getenv("ERC20_LOG_SAMPLE_PER_DAY", "2"))
        self.whale_tx_threshold_eth = float(os.getenv("WHALE_TX_THRESHOLD_ETH", "500"))
        self.max_retry = int(os.getenv("RPC_RETRY", "3"))

        self.transfer_topic = Web3.keccak(text="Transfer(address,address,uint256)")

        self._block_cache: Dict[Tuple[int, int], dict] = {}

    def get_dashboard_summary(self, days: int, network: str, force_refresh: bool = False) -> dict:
        """返回前端看板所需的完整数据结构。"""

        if network.lower() != "ethereum":
            raise ValueError("当前仅支持 ethereum 主网")
        if days < 1 or days > 120:
            raise ValueError("days 参数范围应为 1-120")

        cache_key = f"{network.lower()}_{days}.json"
        if not force_refresh:
            cached_data = self._read_cache(cache_key)
            if cached_data is not None:
                return cached_data

        latest_block_number = self.web3.eth.block_number
        windows = self._build_day_windows(days)
        boundaries = self._resolve_boundaries(windows, latest_block_number)

        daily_records: List[dict] = []
        whale_address_aggregate: Dict[str, Dict[str, float]] = {}
        amount_distribution_total: Dict[str, int] = {
            "0-0.1": 0,
            "0.1-1": 0,
            "1-10": 0,
            "10-100": 0,
            "100-1k": 0,
            ">1k": 0,
        }

        for index, window in enumerate(windows):
            day_start_block = boundaries[index]
            day_end_block = boundaries[index + 1] - 1
            if day_end_block < day_start_block:
                day_end_block = day_start_block

            day_record, day_whale_map, day_distribution = self._collect_day_metrics(
                date_text=window.date_text,
                start_block=day_start_block,
                end_block=day_end_block,
            )
            daily_records.append(day_record)

            for address, flow_data in day_whale_map.items():
                if address not in whale_address_aggregate:
                    whale_address_aggregate[address] = {"inflow": 0.0, "outflow": 0.0}
                whale_address_aggregate[address]["inflow"] += flow_data["inflow"]
                whale_address_aggregate[address]["outflow"] += flow_data["outflow"]

            for bucket_key, bucket_value in day_distribution.items():
                amount_distribution_total[bucket_key] += bucket_value

        overview = self._build_overview(daily_records)
        whale_ranking = self._build_whale_ranking(whale_address_aggregate)
        amount_distribution = [
            {"bucket": bucket, "transactionCount": int(count)}
            for bucket, count in amount_distribution_total.items()
        ]

        dataset = {
            "meta": {
                "source": "api",
                "method": "ethereum_mainnet_rpc_sampling",
                "network": network.lower(),
                "days": days,
                "generatedAt": datetime.now(timezone.utc).isoformat(),
                "notes": "activeAddresses、erc20TransferCount、whale 行为采用区块抽样估计；tx 与 gas 来自同批主网样本",
            },
            "overview": overview,
            "daily": daily_records,
            "amountDistribution": amount_distribution,
            "whaleRanking": whale_ranking,
        }

        self._write_cache(cache_key, dataset)
        return dataset

    def _build_day_windows(self, days: int) -> List[DayWindow]:
        """构造按 UTC 日切分的时间窗口，保证统计口径一致。"""

        today_utc = datetime.now(timezone.utc).date()
        start_date = today_utc - timedelta(days=days - 1)

        windows: List[DayWindow] = []
        for offset in range(days):
            date_value = start_date + timedelta(days=offset)
            start_dt = datetime(date_value.year, date_value.month, date_value.day, tzinfo=timezone.utc)
            end_dt = start_dt + timedelta(days=1)
            windows.append(
                DayWindow(
                    date_text=start_dt.strftime("%Y-%m-%d"),
                    start_ts=int(start_dt.timestamp()),
                    end_ts=int(end_dt.timestamp()),
                )
            )
        return windows

    def _resolve_boundaries(self, windows: List[DayWindow], latest_block: int) -> List[int]:
        """将每天起始时间戳映射到区块号。

        只对窗口起始做一次精确二分，其余边界用线性插值估算，将 RPC 调用从
        O(days × log N) 降为 O(log N)。
        """

        if not windows:
            return []

        latest_block_data = self._safe_get_block(latest_block, full_transactions=False)
        now_ts = int(latest_block_data["timestamp"])

        # 估算窗口起始区块，以避免二分范围过宽
        first_ts = windows[0].start_ts
        approx_offset = int((now_ts - first_ts) / 12)
        search_low = max(0, latest_block - approx_offset - 2000)
        search_high = min(latest_block, latest_block - approx_offset + 2000)

        anchor_block = self._find_first_block_ge_timestamp(first_ts, search_low, search_high)
        anchor_data = self._safe_get_block(anchor_block, full_transactions=False)
        anchor_ts = int(anchor_data["timestamp"])

        # 计算平均出块时间（秒/块）
        elapsed_blocks = max(1, latest_block - anchor_block)
        elapsed_seconds = max(1, now_ts - anchor_ts)
        seconds_per_block = elapsed_seconds / elapsed_blocks

        def ts_to_block(target_ts: int) -> int:
            offset = (target_ts - anchor_ts) / seconds_per_block
            estimated = anchor_block + int(offset)
            return max(0, min(latest_block, estimated))

        boundaries = [ts_to_block(w.start_ts) for w in windows]
        boundaries.append(ts_to_block(windows[-1].end_ts))
        return boundaries

    def _find_first_block_ge_timestamp(self, target_ts: int, left: int, right: int) -> int:
        """二分查找首个时间戳大于等于目标值的区块。"""

        low = max(0, left)
        high = max(low, right)

        while low < high:
            mid = (low + high) // 2
            block = self._safe_get_block(mid, full_transactions=False)
            block_ts = int(block["timestamp"])
            if block_ts < target_ts:
                low = mid + 1
            else:
                high = mid

        return low

    def _safe_get_block(self, block_number: int, full_transactions: bool) -> dict:
        """带重试机制获取区块信息，降低偶发 RPC 异常影响。"""

        cache_key = (block_number, int(full_transactions))
        if cache_key in self._block_cache:
            return self._block_cache[cache_key]

        last_error: Optional[Exception] = None
        for attempt in range(self.max_retry):
            try:
                block_data = self.web3.eth.get_block(block_number, full_transactions=full_transactions)
                self._block_cache[cache_key] = block_data
                return block_data
            except BlockNotFound as error:
                last_error = error
                time.sleep(0.08)
            except Exception as error:  # noqa: BLE001
                last_error = error
                time.sleep(0.25 * (attempt + 1))

        raise RuntimeError(f"获取区块失败 block={block_number}") from last_error

    def _sample_block_numbers(self, start_block: int, end_block: int) -> List[int]:
        """按天生成等间隔抽样区块列表，控制请求规模。"""

        total_blocks = end_block - start_block + 1
        if total_blocks <= 0:
            return [start_block]

        if total_blocks <= self.sample_blocks_per_day:
            return list(range(start_block, end_block + 1))

        step = total_blocks / float(self.sample_blocks_per_day)
        sampled = set()
        for idx in range(self.sample_blocks_per_day):
            block_number = start_block + int(idx * step)
            sampled.add(min(end_block, block_number))

        sampled.add(start_block)
        sampled.add(end_block)
        return sorted(sampled)

    def _collect_day_metrics(
        self,
        date_text: str,
        start_block: int,
        end_block: int,
    ) -> Tuple[dict, Dict[str, Dict[str, float]], Dict[str, int]]:
        """收集单日指标数据并返回表格与分布所需中间结果。"""

        sampled_blocks = self._sample_block_numbers(start_block, end_block)
        sample_count = len(sampled_blocks)
        total_block_count = max(1, end_block - start_block + 1)
        scale_ratio = max(1.0, total_block_count / max(1, sample_count))

        active_addresses = set()
        gas_price_list_gwei: List[float] = []
        sampled_tx_count = 0
        sampled_transfer_eth = 0.0

        whale_flow_map: Dict[str, Dict[str, float]] = {}
        amount_distribution = {
            "0-0.1": 0,
            "0.1-1": 0,
            "1-10": 0,
            "10-100": 0,
            "100-1k": 0,
            ">1k": 0,
        }

        for block_number in sampled_blocks:
            block = self._safe_get_block(block_number, full_transactions=True)
            transactions = block["transactions"]
            sampled_tx_count += len(transactions)

            for tx in transactions:
                from_address = tx.get("from")
                to_address = tx.get("to")
                if from_address:
                    active_addresses.add(from_address.lower())
                if to_address:
                    active_addresses.add(to_address.lower())

                gas_price_wei = tx.get("gasPrice")
                if gas_price_wei is None:
                    gas_price_wei = tx.get("maxFeePerGas", 0)
                gas_price_gwei = float(self.web3.from_wei(gas_price_wei, "gwei"))
                gas_price_list_gwei.append(gas_price_gwei)

                value_eth = float(self.web3.from_wei(tx.get("value", 0), "ether"))
                sampled_transfer_eth += value_eth

                bucket = self._bucket_tx_value(value_eth)
                amount_distribution[bucket] += 1

                if value_eth >= self.whale_tx_threshold_eth and from_address and to_address:
                    sender = from_address.lower()
                    receiver = to_address.lower()
                    if sender not in whale_flow_map:
                        whale_flow_map[sender] = {"inflow": 0.0, "outflow": 0.0}
                    if receiver not in whale_flow_map:
                        whale_flow_map[receiver] = {"inflow": 0.0, "outflow": 0.0}
                    whale_flow_map[sender]["outflow"] += value_eth
                    whale_flow_map[receiver]["inflow"] += value_eth

        estimated_tx_count = int(sampled_tx_count * scale_ratio)
        estimated_transfer_eth = sampled_transfer_eth * scale_ratio
        estimated_distribution = {
            key: int(value * scale_ratio)
            for key, value in amount_distribution.items()
        }

        estimated_active = int(len(active_addresses) * math.sqrt(scale_ratio))
        estimated_active = max(0, min(estimated_active, max(estimated_tx_count * 2, 1_200_000)))

        avg_gas_gwei = float(sum(gas_price_list_gwei) / max(1, len(gas_price_list_gwei)))
        avg_tx_amount = estimated_transfer_eth / max(1, estimated_tx_count)

        erc20_transfers = self._estimate_erc20_transfer_count(
            start_block=start_block,
            end_block=end_block,
            scale_ratio=scale_ratio,
            sampled_blocks=sampled_blocks,
        )

        whale_netflow = self._estimate_whale_netflow(whale_flow_map, scale_ratio)

        daily_record = {
            "date": date_text,
            "activeAddresses": int(estimated_active),
            "avgGasGwei": round(avg_gas_gwei, 2),
            "erc20TransferCount": int(erc20_transfers),
            "whaleNetflowEth": round(whale_netflow, 2),
            "totalTransferEth": round(estimated_transfer_eth, 2),
            "transactionCount": int(estimated_tx_count),
            "avgTxAmountEth": round(avg_tx_amount, 4),
        }

        # 巨鲸流量不做 scale_ratio 放大——每笔大额交易是真实发生的单次事件，
        # 按抽样比例线性外推会严重虚高（单笔 1000 ETH × 600 = 60 万 ETH）。
        return daily_record, whale_flow_map, estimated_distribution

    def _estimate_erc20_transfer_count(
        self,
        start_block: int,
        end_block: int,
        scale_ratio: float,
        sampled_blocks: List[int],
    ) -> int:
        """通过 Transfer 事件日志抽样估计 ERC20 转账笔数。"""

        total_blocks = max(1, end_block - start_block + 1)
        if not sampled_blocks:
            return 0

        if len(sampled_blocks) <= self.erc20_log_sample_per_day:
            log_samples = sampled_blocks
        else:
            step = len(sampled_blocks) / float(self.erc20_log_sample_per_day)
            selected = {sampled_blocks[int(index * step)] for index in range(self.erc20_log_sample_per_day)}
            selected.add(sampled_blocks[0])
            selected.add(sampled_blocks[-1])
            log_samples = sorted(selected)

        sampled_log_count = 0
        counted_blocks = 0

        for block_number in log_samples:
            try:
                logs = self.web3.eth.get_logs(
                    {
                        "fromBlock": block_number,
                        "toBlock": block_number,
                        "topics": [self.transfer_topic],
                    }
                )
                sampled_log_count += len(logs)
                counted_blocks += 1
            except Exception:  # noqa: BLE001
                continue

        if counted_blocks == 0:
            return 0

        avg_logs_per_block = sampled_log_count / float(counted_blocks)
        estimated_logs = avg_logs_per_block * total_blocks
        if scale_ratio > 1.0:
            estimated_logs = max(estimated_logs, sampled_log_count * scale_ratio)

        return int(max(0, round(estimated_logs)))

    def _estimate_whale_netflow(self, whale_flow_map: Dict[str, Dict[str, float]], scale_ratio: float) -> float:
        """估计单日巨鲸净流入值，按高金额地址流量进行聚合。

        不乘以 scale_ratio：鲸鱼大额交易是稀有单次事件，线性外推会导致严重虚高。
        """

        netflow = 0.0
        min_whale_address_flow = self.whale_tx_threshold_eth * 1.6

        for flow_data in whale_flow_map.values():
            inflow = flow_data["inflow"]
            outflow = flow_data["outflow"]
            if max(inflow, outflow) < min_whale_address_flow:
                continue
            netflow += (inflow - outflow)

        return netflow

    def _bucket_tx_value(self, value_eth: float) -> str:
        """按论文常见分箱划分交易金额区间。"""

        if value_eth < 0.1:
            return "0-0.1"
        if value_eth < 1:
            return "0.1-1"
        if value_eth < 10:
            return "1-10"
        if value_eth < 100:
            return "10-100"
        if value_eth < 1000:
            return "100-1k"
        return ">1k"

    def _build_overview(self, daily_records: List[dict]) -> dict:
        """基于每日序列计算顶部 KPI 汇总指标。"""

        if not daily_records:
            return {
                "latestActiveAddresses": 0,
                "latestActiveChangePct": 0.0,
                "latestGasGwei": 0.0,
                "latestGasChangePct": 0.0,
                "erc20Total": 0,
                "erc20DailyMean": 0,
                "whaleNetflow7dEth": 0.0,
                "whaleImpactRatioPct": 0.0,
            }

        frame = pd.DataFrame(daily_records)
        frame = frame.sort_values("date").reset_index(drop=True)

        latest = frame.iloc[-1]
        compare_index = max(0, len(frame) - 8)
        compare = frame.iloc[compare_index]

        active_change = self._safe_change_ratio(
            numerator=float(latest["activeAddresses"] - compare["activeAddresses"]),
            denominator=float(compare["activeAddresses"]),
        )
        gas_change = self._safe_change_ratio(
            numerator=float(latest["avgGasGwei"] - compare["avgGasGwei"]),
            denominator=float(compare["avgGasGwei"]),
        )

        erc20_total = int(frame["erc20TransferCount"].sum())
        erc20_daily_mean = int(round(frame["erc20TransferCount"].mean()))

        whale_netflow_7d = float(frame.tail(7)["whaleNetflowEth"].sum())
        total_transfer_window = float(frame["totalTransferEth"].sum())
        whale_impact_ratio = abs(whale_netflow_7d) / max(total_transfer_window, 1.0) * 100.0

        return {
            "latestActiveAddresses": int(latest["activeAddresses"]),
            "latestActiveChangePct": round(active_change, 2),
            "latestGasGwei": round(float(latest["avgGasGwei"]), 2),
            "latestGasChangePct": round(gas_change, 2),
            "erc20Total": erc20_total,
            "erc20DailyMean": erc20_daily_mean,
            "whaleNetflow7dEth": round(whale_netflow_7d, 2),
            "whaleImpactRatioPct": round(whale_impact_ratio, 3),
        }

    def _safe_change_ratio(self, numerator: float, denominator: float) -> float:
        """安全计算变化率，防止除零异常。"""

        if abs(denominator) < 1e-9:
            return 0.0
        return numerator / denominator * 100.0

    def _build_whale_ranking(self, whale_map: Dict[str, Dict[str, float]]) -> List[dict]:
        """将巨鲸地址流向聚合结果转换为 Top 8 排行。"""

        ranking = []
        for address, flow_data in whale_map.items():
            inflow = float(flow_data["inflow"])
            outflow = float(flow_data["outflow"])
            netflow = inflow - outflow
            if max(inflow, outflow) < self.whale_tx_threshold_eth * 2:
                continue

            ranking.append(
                {
                    "address": address,
                    "inflowEth": round(inflow, 2),
                    "outflowEth": round(outflow, 2),
                    "netflowEth": round(netflow, 2),
                }
            )

        ranking.sort(key=lambda item: abs(item["netflowEth"]), reverse=True)
        return ranking[:8]

    def _read_cache(self, cache_key: str) -> Optional[dict]:
        """读取本地缓存，减少重复抓取主网数据。"""

        cache_path = self.cache_dir / cache_key
        if not cache_path.exists():
            return None

        age_seconds = time.time() - cache_path.stat().st_mtime
        if age_seconds > self.cache_ttl_seconds:
            return None

        try:
            return json.loads(cache_path.read_text(encoding="utf-8"))
        except Exception:  # noqa: BLE001
            return None

    def _write_cache(self, cache_key: str, payload: dict) -> None:
        """写入缓存文件，提升多次访问时的响应速度。"""

        cache_path = self.cache_dir / cache_key
        cache_path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
