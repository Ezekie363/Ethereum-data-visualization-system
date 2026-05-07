# 以太坊链上数据分析与可视化系统

这是一个可视化的以太坊数据分析面板。

## 1. 项目简介

本项目对应本科毕业设计题目：

**《以太坊链上数据分析与可视化系统设计与实现》**

系统目标是在不依赖实时 RPC 的前提下，基于公开可下载数据构建一个可复现、可验证、可展示的链上分析平台。系统覆盖完整流程：

1. 数据采集（公开 CSV/HTML 下载）
2. 数据清洗（字段标准化、时间统一、单位换算）
3. 数据分析（窗口聚合、指标计算、分布与行为分析）
4. 数据可视化（KPI、趋势图、分布图、明细表、方法说明）

该实现偏学术展示风格，适合毕业论文的系统实现章节与结果展示章节直接引用。

---

## 2. 设计目标与约束

### 2.1 设计目标

- **可复现**：同样的输入数据可得到同样的输出结果。
- **结构清晰**：前后端模块边界明确，数据流路径可追踪。
- **论文可引用**：指标定义、公式、口径、来源可以直接写入论文。
- **离线可演示**：不依赖链节点、API Key、数据库服务。

### 2.2 现实约束

- 不调用 JSON-RPC 实时接口。
- 使用公开统计数据而非逐笔原始交易明细。
- 部分指标（尤其巨鲸流向、金额分布）采用**离线代理模型**构建。

> 说明：离线代理并不等于伪造数据，代理值由公开真实统计序列推导得到，适用于课程设计/论文演示口径。

---

## 3. 技术栈

### 3.1 后端（离线 ETL）

- Python 3.10+
- 标准库：`csv`、`datetime`、`statistics`、`subprocess`、`re`、`math`
- 下载工具：`curl`（由脚本通过 subprocess 调用）

### 3.2 前端（可视化）

- HTML + CSS + JavaScript（原生）
- ECharts 5（图表渲染）
- 双语切换（中文 / English）

---

## 4. 项目目录结构

```text
cursor_test/
├── README.md                                # 项目总说明（本文件）
├── thesis-dashboard.html                    # 根目录入口（加载 dashboard 静态资源）
├── refresh_offline_data.sh                  # 一键刷新离线数据
├── run_full_dashboard.sh                    # 启动本地服务脚本
├── backend/
│   ├── export_offline_csv.py                # 离线数据下载、清洗、聚合、导出
│   ├── README.md                            # 后端脚本说明
│   ├── requirements.txt
│   └── .env.example
└── dashboard/
    ├── index.html                           # 可视化页面
    ├── styles.css                           # 页面样式
    ├── app.js                               # 数据读取、指标计算、图表渲染、i18n
    ├── README.md                            # 前端模块详细说明
    └── data/
        ├── sources/ethereum/                # 原始下载文件（公开源）
        │   ├── tx_growth.csv
        │   ├── active_addresses.csv
        │   ├── gas_price.csv
        │   ├── erc20_transfers.csv
        │   ├── transaction_fee.csv
        │   └── top_accounts.html
        └── ethereum/
            ├── 7/
            ├── 30/
            └── 90/
                ├── meta.csv
                ├── daily_metrics.csv
                ├── amount_distribution.csv
                └── whale_ranking.csv
```

---

## 5. 系统架构（论文可用描述）

系统采用三层架构：

1. **数据层**：Etherscan 公开统计 CSV 与 Top Accounts 页面
2. **处理层**：Python 离线脚本完成清洗、单位转换、指标构造、窗口切片
3. **展示层**：静态前端读取 CSV，完成可视化渲染与交互

数据流路径：

`Etherscan公开源 -> backend/export_offline_csv.py -> dashboard/data/{network}/{window}/*.csv -> dashboard/app.js -> 页面图表与指标`

关键特点：

- 输出文件结构固定，前端按统一路径读取。
- 指标计算与图表显示共享同一数据口径，避免展示与解释脱节。
- 方法说明区与实际计算逻辑保持一致，支持论文审查。

---

## 6. 数据来源与字段口径

### 6.1 数据来源（公开下载）

- `https://etherscan.io/chart/tx?output=csv`
- `https://etherscan.io/chart/active-address?output=csv`
- `https://etherscan.io/chart/gasprice?output=csv`
- `https://etherscan.io/chart/tokenerc-20txns?output=csv`
- `https://etherscan.io/chart/transactionfee?output=csv`
- `https://etherscan.io/accounts?ps=100&p=1`

### 6.2 输出数据文件说明

#### 1) `meta.csv`

- `network`：网络名（当前 `ethereum`）
- `days`：窗口长度（7/30/90）
- `generated_at`：导出时间（UTC ISO）
- `method`：导出方法标识
- `notes`：口径描述

#### 2) `daily_metrics.csv`

- `date`：日期（YYYY-MM-DD）
- `active_addresses`：每日活跃地址数
- `avg_gas_gwei`：日均 Gas 价格（Gwei）
- `erc20_transfer_count`：每日 ERC20 转账数
- `whale_netflow_eth`：巨鲸净流入代理（日级）
- `total_transfer_eth`：每日交易手续费总量（ETH）
- `transaction_count`：每日链上交易数
- `avg_tx_amount_eth`：手续费均值代理（`total_transfer_eth / transaction_count`）

#### 3) `amount_distribution.csv`

- `bucket`：金额分箱
- `transaction_count`：分箱对应交易笔数（窗口聚合代理）

#### 4) `whale_ranking.csv`

- `address`：巨鲸地址（Top10）
- `inflow_eth`：窗口内流入量（代理）
- `outflow_eth`：窗口内流出量（代理）
- `netflow_eth`：净流入（`inflow_eth - outflow_eth`）

---

## 7. 指标体系与公式说明

### 7.1 顶部 KPI（四项）

1. **活跃地址数（日均，窗口期）**
   - 公式：`Active_mean = Σ Active(d) / N`
   - 变化率：`(Active_end - Active_start) / Active_start`

2. **平均 Gas 价格（窗口均值）**
   - 单位换算：`Gas_gwei(d) = Gas_wei(d) / 10^9`
   - 窗口均值：`Gas_mean = Σ Gas_gwei(d) / N`
   - 变化率：`(Gas_end - Gas_start) / Gas_start`

3. **ERC20 转账总量（窗口期）**
   - 公式：`ERC20_total = Σ ERC20_count(d)`
   - 日均：`ERC20_daily_mean = ERC20_total / N`

4. **巨鲸净流入（窗口期）**
   - 公式：`Netflow_window = Σ Inflow_top10(i) - Σ Outflow_top10(i)`
   - 资金影响占比：
     - `Impact_ratio = |Netflow_window| / (Σ Inflow_top10 + Σ Outflow_top10)`

### 7.2 图表指标

- 活跃地址趋势：`active_addresses` 时间序列
- Gas 趋势：`avg_gas_gwei` 时间序列
- ERC20 每日转账：`erc20_transfer_count` 时间序列
- 巨鲸净流入趋势：`whale_netflow_eth` 时间序列
- 交易金额分布柱图：`amount_distribution.csv` 分箱计数
- 交易金额结构占比饼图：`bucket_count / Σ bucket_count`
- 巨鲸资金流向占比饼图：`Σ inflow / (Σ inflow + Σ outflow)` 与对应 outflow 比例

---

## 8. 前端功能板块（页面结构）

### 8.1 左侧侧栏

- 项目名称与系统定位简介
- 控件：网络、分析窗口（7/30/90）、语言切换、CSV 重载
- 离线文件路径提示（当前窗口对应四个 CSV）

### 8.2 右侧主体

- 顶部标题 + 最后更新时间 + 数据来源标记
- KPI 四卡片
- 主分析图区（5 个趋势/分布图）
- 占比分析区（2 个饼图）
- 巨鲸地址行为表（Top10）
- 指标方法说明矩阵（指标/公式/来源/解释）

### 8.3 交互行为

- 切换窗口后：所有 KPI、图表、表格联动刷新
- 切换语言后：静态文案与动态标签同步更新
- 点击“重新加载 CSV”：重新读取对应窗口文件


