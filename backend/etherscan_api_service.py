"""Etherscan 免费 API 客户端，提供实时快照数据（Gas oracle、最新区块、ETH 供应量）。"""

from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Optional, Tuple

import requests


class EtherscanApiService:
    """封装 Etherscan 免费 API 三个实时端点，带内存缓存。"""

    BASE_URL = "https://api.etherscan.io/v2/api"  # Etherscan API V2
    CHAIN_ID = "1"  # Ethereum mainnet
    DEFAULT_TTL = 60  # 秒

    def __init__(self, api_key: Optional[str] = None, ttl_seconds: int = DEFAULT_TTL) -> None:
        self._api_key = api_key or None
        self._ttl = ttl_seconds
        # cache: key → (payload, expire_timestamp)
        self._cache: Dict[str, Tuple[Any, float]] = {}

    # ── 公开接口 ──────────────────────────────────────────────────────────────

    def fetch_realtime_snapshot(self, network: str = "ethereum") -> dict:
        """聚合调用三个端点，返回实时快照字典。任一端点失败则对应字段置 None。"""

        gas_oracle: Optional[dict] = None
        latest_block: Optional[int] = None
        eth_supply_eth: Optional[float] = None
        errors = []

        try:
            gas_oracle = self._get_cached_or_fetch("gas_oracle", self._fetch_gas_oracle)
        except Exception as error:
            errors.append(f"gasOracle: {error}")

        try:
            latest_block = self._get_cached_or_fetch("latest_block", self._fetch_latest_block)
        except Exception as error:
            errors.append(f"latestBlock: {error}")

        try:
            eth_supply_eth = self._get_cached_or_fetch("eth_supply", self._fetch_eth_supply)
        except Exception as error:
            errors.append(f"ethSupply: {error}")

        return {
            "meta": {
                "source": "etherscan_api",
                "network": network,
                "fetchedAt": datetime.now(timezone.utc).isoformat(),
                "apiKeyPresent": self._api_key is not None,
                "cacheTtlSeconds": self._ttl,
            },
            "gasOracle": gas_oracle,
            "latestBlock": latest_block,
            "ethSupplyEth": eth_supply_eth,
            "error": "; ".join(errors) if errors else None,
        }

    # ── 私有：各端点 ──────────────────────────────────────────────────────────

    def _fetch_gas_oracle(self) -> dict:
        """调用 gastracker/gasoracle，返回三档 Gas 价格（Gwei）。"""

        url = self._build_url({"module": "gastracker", "action": "gasoracle"})
        data = self._request(url)
        result = data.get("result", {})
        return {
            "safeGwei": self._to_float(result.get("SafeGasPrice")),
            "proposeGwei": self._to_float(result.get("ProposeGasPrice")),
            "fastGwei": self._to_float(result.get("FastGasPrice")),
        }

    def _fetch_latest_block(self) -> int:
        """调用 proxy/eth_blockNumber，返回最新区块号（hex→int）。"""

        url = self._build_url({"module": "proxy", "action": "eth_blockNumber"})
        data = self._request(url)
        hex_value = data.get("result", "0x0")
        return int(hex_value, 16)

    def _fetch_eth_supply(self) -> float:
        """调用 stats/ethsupply，返回 ETH 总供应量（ETH 单位）。"""

        url = self._build_url({"module": "stats", "action": "ethsupply"})
        data = self._request(url)
        wei_str = data.get("result", "0")
        return float(wei_str) / 1_000_000_000_000_000_000.0

    # ── 私有：工具方法 ─────────────────────────────────────────────────────────

    def _get_cached_or_fetch(self, cache_key: str, fetch_fn: Callable) -> Any:
        """通用缓存包装器：TTL 内返回缓存值，过期后重新获取。"""

        now = time.monotonic()
        if cache_key in self._cache:
            payload, expire_at = self._cache[cache_key]
            if now < expire_at:
                return payload

        payload = fetch_fn()
        self._cache[cache_key] = (payload, now + self._ttl)
        return payload

    def _build_url(self, params: dict) -> str:
        """拼接 V2 请求 URL，始终包含 chainid，有 API Key 时追加 apikey。"""

        base_params = {"chainid": self.CHAIN_ID}
        base_params.update(params)
        pairs = "&".join(f"{k}={v}" for k, v in base_params.items())
        url = f"{self.BASE_URL}?{pairs}"
        if self._api_key:
            url += f"&apikey={self._api_key}"
        return url

    def _request(self, url: str, timeout: int = 8) -> dict:
        """发送 GET 请求，检查 HTTP 状态和 Etherscan status 字段。"""

        response = requests.get(url, timeout=timeout)
        response.raise_for_status()
        data = response.json()
        # Etherscan API 用 status="0" 表示失败
        if str(data.get("status", "1")) == "0":
            message = data.get("message", "")
            result = data.get("result", "")
            # NOTOK 常见于无 Key 超限，result 字段含说明
            raise ValueError(f"Etherscan API error: {message} — {result}")
        return data

    @staticmethod
    def _to_float(value: Any) -> Optional[float]:
        """安全转换为 float，失败返回 None。"""

        try:
            return float(value)
        except (TypeError, ValueError):
            return None
