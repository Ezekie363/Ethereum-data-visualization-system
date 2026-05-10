# 以太坊链上数据分析与可视化系统

以太坊链上数据分析与可视化面板，支持离线 CSV 与实时主网 RPC 双模式。

## 1. 项目简介

本项目对应本科毕业设计题目：

**《以太坊链上数据分析与可视化系统设计与实现》**

系统核心目标是在不依赖实时 RPC 的前提下，基于公开可下载数据构建一个可复现、可验证、可展示的链上分析平台，系统覆盖完整数据处理流程：

1. 数据采集（公开 CSV/HTML 下载）
2. 数据清洗（字段标准化、时间统一、单位换算）
3. 数据分析（窗口聚合、指标计算、分布与行为分析）
4. 数据可视化（KPI、趋势图、分布图、明细表、方法说明）

在毕业设计基础上，系统额外扩展了**实时 API 模式**：通过 Alchemy RPC 对以太坊主网进行区块抽样，实现全量指标的实时计算，可在侧栏切换数据源。

该实现偏学术展示风格，适合毕业论文的系统实现章节与结果展示章节直接引用。

---

🔗 可视化页面（GitHub Pages）：https://ezekie363.github.io/Ethereum-data-visualization-system/thesis-dashboard.html

---

## 2. 数据模式

系统提供两种数据模式，可在页面侧栏的"数据源"下拉框中切换：

### 2.1 离线 CSV 模式（默认，论文核心模式）

- 数据来源：Etherscan 公开统计 CSV，通过 `export_offline_csv.py` 下载并处理
- 所有指标从本地 `dashboard/data/` 目录的 CSV 文件读取
- 可完全离线运行，无需任何 API Key 或网络连接
- 结果可复现：相同输入数据产生相同输出
- 适合论文演示与引用

### 2.2 实时 API 模式（扩展功能）

- 数据来源：通过 Alchemy RPC 连接以太坊主网，对区块进行抽样估计
- 所有 4 个 KPI 卡片显示 **LIVE** 徽标，数据来自真实链上状态
- 每 15 分钟自动刷新一次（Flask 文件缓存 TTL = 15 分钟）
- 首次加载约需 60–120 秒（后续从缓存读取，几乎瞬时）
- 需要本地启动 Flask 服务，并配置 `ETH_RPC_URL`

> **注意**：Etherscan 免费 API 不提供历史日级聚合数据（该功能为 Pro），因此实时模式采用 RPC 区块抽样，属于统计估计而非精确值。

---

## 3. 设计目标与约束

### 3.1 设计目标

- **可复现**：同样的输入数据可得到同样的输出结果。
- **结构清晰**：前后端模块边界明确，数据流路径可追踪。
- **论文可引用**：指标定义、公式、口径、来源可以直接写入论文。
- **离线可演示**：默认模式不依赖链节点、API Key、数据库服务。

### 3.2 现实约束

- 离线模式不调用 JSON-RPC 实时接口。
- 使用公开统计数据而非逐笔原始交易明细。
- 部分指标（尤其巨鲸流向、金额分布）采用**离线代理模型**构建。

> 说明：离线代理并不等于伪造数据，代理值由公开真实统计序列推导得到，适用于课程设计/论文演示口径。

---

## 4. 技术栈

### 4.1 后端（离线 ETL）

- Python 3.10+
- 标准库：`csv`、`datetime`、`statistics`、`subprocess`、`re`、`math`
- 下载工具：`curl`（由脚本通过 subprocess 调用）

### 4.2 后端（实时 RPC 服务，可选）

- Python 3.10+
- `Flask`：HTTP API 服务（端口 5000）
- `web3.py`：以太坊 RPC 连接与区块查询
- `pandas`：日级指标聚合与统计
- `requests`：Etherscan API 调用
- 本地文件缓存（TTL 900 秒）

### 4.3 前端（可视化）

- HTML + CSS + JavaScript（原生，无框架依赖）
- ECharts 5（图表渲染）
- 双语切换（中文 / English）

---

## 5. 项目目录结构

```text
cursor_test/
├── README.md                                # 项目总说明（本文件）
├── thesis-dashboard.html                    # 根目录入口（GitHub Pages 用）
├── run_full_dashboard.sh                    # 一键启动本地全量服务脚本
├── backend/
│   ├── export_offline_csv.py                # 离线数据下载、清洗、聚合、导出
│   ├── offline_refresh_server.py            # 本地离线刷新 API 服务（端口 5001）
│   ├── etherscan_api_service.py             # Etherscan V2 API 客户端（Gas 快照）
│   ├── app.py                               # Flask 实时 RPC 服务（端口 5000）
│   ├── mainnet_service.py                   # 以太坊主网区块抽样与指标计算
│   ├── requirements.txt
│   ├── .env.example                         # 环境变量示例（不含真实 Key）
│   └── cache/                               # Flask 运行时文件缓存（.gitignore）
└── dashboard/
    ├── index.html                           # 可视化页面主体
    ├── styles.css                           # 页面样式（含 LIVE 徽标动画）
    ├── app.js                               # 数据读取、指标计算、图表渲染、i18n
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

## 6. 快速启动

### 6.1 离线 CSV 模式（无需 API Key）

```bash
# 启动静态文件服务
python3 -m http.server 8080
# 浏览器访问
open http://127.0.0.1:8080/dashboard/
```

如需重新下载最新链上数据（需要网络）：

```bash
python3 -m http.server 8080 &
python3 backend/offline_refresh_server.py &
# 在页面点击"重新加载 CSV"按钮，或直接调用：
curl -X POST http://127.0.0.1:5001/api/v1/offline/refresh-csv \
  -H "Content-Type: application/json" \
  -d '{"network":"ethereum","windows":[7,30,90]}'
```

### 6.2 实时 API 模式（需要 Alchemy RPC）

复制环境变量模板并填写 Key：

```bash
cp backend/.env.example backend/.env
# 编辑 backend/.env，填入你的 ETHERSCAN_API_KEY 和 ETH_RPC_URL
```

一键启动所有服务：

```bash
export ETHERSCAN_API_KEY=your_etherscan_key
export ETH_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your_alchemy_key
./run_full_dashboard.sh
```

启动后访问 `http://127.0.0.1:8080/dashboard/`，在侧栏"数据源"下拉框选择**实时 API（混合）**即可。

| 服务 | 端口 | 说明 |
|------|------|------|
| 静态文件服务 | 8080 | 页面与 CSV 文件 |
| 离线刷新 API | 5001 | CSV 下载 + Etherscan Gas 快照 |
| Flask RPC 服务 | 5000 | 全量实时指标（需要 ETH_RPC_URL） |

---

## 7. 系统架构

系统整体分为两条数据链路，共用同一个前端展示层：

```
【离线 CSV 链路】
Etherscan 公开源
  → backend/export_offline_csv.py（下载 + 清洗 + 聚合）
  → dashboard/data/{network}/{window}/*.csv
  → dashboard/app.js（读取 + 计算 + 渲染）
  → 页面图表与 KPI

【实时 RPC 链路】
以太坊主网（Alchemy RPC）
  → backend/mainnet_service.py（区块抽样 + 指标估计）
  → backend/app.py（Flask HTTP API，端口 5000，含文件缓存）
  → dashboard/app.js（loadApiDataset + normalizeApiDataset）
  → 页面图表与 KPI（全部带 LIVE 徽标）
```

### 实时模式区块抽样策略

- 每天抽取 **12 个区块**（默认，每天约 7200 个区块，抽样率 0.17%）
- 边界区块号通过**首尾二分 + 线性插值**确定，避免每日独立二分（节省 ~95% 的边界查询 RPC 调用）
- ERC20 转账通过 `eth_getLogs` 抽样估计（每天 2 个区块）
- 巨鲸流量取实际采样值，不做抽样比例外推（避免大额单笔交易被线性放大）
- Flask 文件缓存 TTL 900 秒，前端自动刷新间隔与之一致

---

## 8. 数据来源与字段口径

### 8.1 离线模式数据来源（公开下载）

- `https://etherscan.io/chart/tx?output=csv`
- `https://etherscan.io/chart/active-address?output=csv`
- `https://etherscan.io/chart/gasprice?output=csv`
- `https://etherscan.io/chart/tokenerc-20txns?output=csv`
- `https://etherscan.io/chart/transactionfee?output=csv`
- `https://etherscan.io/accounts?ps=100&p=1`

### 8.2 实时模式数据来源

- Alchemy Ethereum Mainnet RPC（`eth_getBlockByNumber`、`eth_getLogs`）
- Etherscan API V2（Gas Oracle，用于侧边栏快照，可选）

### 8.3 输出数据文件说明（离线模式）

#### `meta.csv`

| 字段 | 说明 |
|------|------|
| `network` | 网络名（当前 `ethereum`） |
| `days` | 窗口长度（7/30/90） |
| `generated_at` | 导出时间（UTC ISO） |
| `method` | 导出方法标识 |
| `notes` | 口径描述 |

#### `daily_metrics.csv`

| 字段 | 说明 |
|------|------|
| `date` | 日期（YYYY-MM-DD） |
| `active_addresses` | 每日活跃地址数 |
| `avg_gas_gwei` | 日均 Gas 价格（Gwei） |
| `erc20_transfer_count` | 每日 ERC20 转账数 |
| `whale_netflow_eth` | 巨鲸净流入代理（日级） |
| `total_transfer_eth` | 每日交易手续费总量（ETH） |
| `transaction_count` | 每日链上交易数 |
| `avg_tx_amount_eth` | 手续费均值代理（`total_transfer_eth / transaction_count`） |

#### `amount_distribution.csv`

| 字段 | 说明 |
|------|------|
| `bucket` | 金额分箱（ETH 区间） |
| `transaction_count` | 分箱对应交易笔数（窗口聚合代理） |

#### `whale_ranking.csv`

| 字段 | 说明 |
|------|------|
| `address` | 巨鲸地址（Top10） |
| `inflow_eth` | 窗口内流入量（代理） |
| `outflow_eth` | 窗口内流出量（代理） |
| `netflow_eth` | 净流入（`inflow_eth - outflow_eth`） |

---

## 9. 指标体系与公式说明

### 9.1 顶部 KPI（四项）

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
   - 资金影响占比：`Impact_ratio = |Netflow_window| / (Σ Inflow + Σ Outflow)`

### 9.2 图表指标

| 图表 | 数据字段 | 类型 |
|------|---------|------|
| 活跃地址趋势 | `active_addresses` 时间序列 | 折线图 |
| Gas 使用趋势 | `avg_gas_gwei` 时间序列 | 折线图 |
| ERC20 每日转账 | `erc20_transfer_count` 时间序列 | 柱状图 |
| 巨鲸净流入趋势 | `whale_netflow_eth` 时间序列 | 正负柱状图 |
| 交易金额分布 | `amount_distribution` 分箱计数 | 柱状图 |
| 交易金额结构占比 | `bucket_count / Σ bucket_count` | 饼图 |
| 巨鲸资金流向占比 | `Σ inflow / (Σ inflow + Σ outflow)` | 饼图 |

---

## 10. 前端功能板块（页面结构）

### 10.1 左侧侧栏

- 项目名称与系统定位简介
- 控件：网络、分析窗口（7/30/90）、语言切换、**数据源切换**、CSV 重载
- 离线文件路径提示（当前窗口对应四个 CSV）

### 10.2 右侧主体

- 顶部标题 + 最后更新时间 + 数据来源标记
- KPI 四卡片（实时模式下每张卡片带脉冲 LIVE 绿色徽标）
- 主分析图区（5 个趋势/分布图）
- 占比分析区（2 个饼图）
- 巨鲸地址行为表（Top10）
- 指标方法说明矩阵（指标/公式/来源/解释）

### 10.3 交互行为

| 操作 | 行为 |
|------|------|
| 切换分析窗口 | 所有 KPI、图表、表格联动刷新 |
| 切换语言 | 静态文案与动态标签同步更新 |
| 切换数据源 → 离线 CSV | 读取本地 CSV，移除 LIVE 徽标 |
| 切换数据源 → 实时 API | 从 Flask RPC 服务拉取全量主网数据，所有 KPI 显示 LIVE 徽标，15 分钟后自动刷新 |
| 点击"重新加载 CSV" | 触发后端重新下载 Etherscan 公开 CSV 并覆盖本地文件 |
