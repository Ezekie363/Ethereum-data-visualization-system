# 后端离线数据下载（无 RPC）

本目录用于从公开网站直接下载以太坊主网 CSV，并整理为前端可读取的数据文件。

## 数据来源

- Etherscan 公开图表 CSV（直接下载）
  - Daily Transactions
  - Daily Active Addresses
  - Average Gas Price
  - ERC20 Token Transfers
  - Transaction Fees
- Etherscan Top Accounts 页面（用于巨鲸地址快照）

> 不使用 JSON-RPC，不调用链节点。

## 一键导出离线 CSV

```bash
cd /Users/ezekiel/Documents/论文/cursor_test/backend
python3 export_offline_csv.py --windows 7 30 90
```

默认输出目录：`/Users/ezekiel/Documents/论文/cursor_test/dashboard/data`

默认会生成：

```text
dashboard/data/
  sources/ethereum/
    tx_growth.csv
    active_addresses.csv
    gas_price.csv
    erc20_transfers.csv
    transaction_fee.csv
    top_accounts.html
  ethereum/
    7/
      meta.csv
      daily_metrics.csv
      amount_distribution.csv
      whale_ranking.csv
    30/
      ...
    90/
      ...
```

## 指标口径

- `active_addresses`：来自公开 Daily Active Addresses CSV
- `avg_gas_gwei`：由公开 Average Gas Price CSV 的 `Value (Wei)` 换算得到
- `erc20_transfer_count`：来自公开 ERC20 Transfer CSV
- `transaction_count`：来自公开 Daily Transactions CSV
- `total_transfer_eth`：采用公开 Transaction Fee CSV 的日总值
- `whale_netflow_eth`：由活跃地址收发差异与交易费规模构建的离线代理指标
- `whale_ranking.csv`：基于公开 Top Accounts 快照与窗口期活跃度构建的离线代理流向
- `amount_distribution.csv`：基于窗口期交易活跃度和 Gas 水平构建的离线代理分箱

该方案满足“离线复现”与“无需 RPC”要求，适合论文演示与截图。
