# Dashboard 前端模块说明（离线 CSV 版）

## 1. 模块定位

`dashboard/` 目录负责系统的可视化展示层，实现以下目标：

- 从离线 CSV 读取数据，不进行实时链上请求
- 输出论文友好的多板块可视化页面
- 提供窗口切换（7/30/90）与中英文切换
- 保证“指标定义-计算逻辑-图表展示”一致

该模块由纯静态文件构成，可直接通过本地 HTTP 服务运行。

---

## 2. 目录与文件职责

```text
dashboard/
├── index.html               # 页面骨架（结构与组件占位）
├── styles.css               # 布局、配色、表格、图表容器样式
├── app.js                   # 数据读取、计算、渲染、交互、i18n
├── README.md                # 本文档
└── data/
    ├── sources/ethereum/    # 后端下载的原始公开文件
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

## 3. 页面板块说明

## 3.1 左侧固定导航区

1. **品牌区**
   - 英文标识、中文项目名、系统能力简介。
2. **控制区**
   - 网络选择（当前固定 ethereum）
   - 分析窗口（7/30/90）
   - 语言切换（中文/English）
   - 重新加载 CSV
3. **离线数据文件区**
   - 展示当前窗口对应的四个数据文件路径
   - 用于说明可追溯的数据来源

> 交互逻辑：左侧固定不滚动，右侧内容滚动，适合演示与截图。

## 3.2 右侧内容区

1. 页头：看板标题、最后更新时间、数据来源标签
2. KPI 四卡：活跃地址、Gas、ERC20、巨鲸净流入
3. 主图区：5 张趋势/分布图
4. 占比区：2 张饼图
5. 明细区：巨鲸 Top10 行为统计表
6. 方法区：指标方法说明矩阵（公式/来源/解释）

---

## 4. 前端数据流与渲染流程

## 4.1 运行时状态

核心状态对象 `appState`：

- `language`：当前语言
- `rangeDays`：当前窗口（7/30/90）
- `network`：当前网络（ethereum）
- `dataset`：当前已加载的数据集
- `dataSource`：`csv` 或 `mock`
- `lastUpdated`：显示在页头的更新时间

## 4.2 数据加载流程

1. 根据窗口构造路径：`data/{network}/{days}/{file}.csv`
2. 并发读取四个文件：`meta/daily/distribution/whale`
3. CSV 解析为对象数组
4. 标准化字段并转数值类型
5. 计算概览指标 `overview`
6. 渲染 KPI、图表、表格、头部信息、路径提示

## 4.3 容错策略

- 读取失败时默认回退 mock 数据（防止页面空白）
- UI 上用来源标签显示当前为 CSV 或 Mock

---

## 5. CSV 字段映射关系（前端）

`daily_metrics.csv` -> `dataset.daily[]`

- `active_addresses` -> `activeAddresses`
- `avg_gas_gwei` -> `avgGasGwei`
- `erc20_transfer_count` -> `erc20TransferCount`
- `whale_netflow_eth` -> `whaleNetflowEth`
- `total_transfer_eth` -> `totalTransferEth`
- `transaction_count` -> `transactionCount`
- `avg_tx_amount_eth` -> `avgTxAmountEth`

`amount_distribution.csv` -> `dataset.amountDistribution[]`

- `bucket` -> `bucket`
- `transaction_count` -> `transactionCount`

`whale_ranking.csv` -> `dataset.whaleRanking[]`

- `address` -> `address`
- `inflow_eth` -> `inflowEth`
- `outflow_eth` -> `outflowEth`
- `netflow_eth` -> `netflowEth`

---

## 6. 指标计算逻辑（前端口径）

## 6.1 KPI 计算函数

主函数：`calculateOverviewMetrics(dailySeries, whaleRanking)`

### 活跃地址（日均）

- `latestActiveAddresses = mean(activeAddresses)`
- 变化率：`(last - first) / first`

### 平均 Gas（窗口均值）

- `latestGasGwei = mean(avgGasGwei)`
- 变化率：`(last - first) / first`

### ERC20 转账总量

- `erc20Total = Σ erc20TransferCount`
- `erc20DailyMean = erc20Total / N`

### 巨鲸净流入与资金影响占比

- `whaleNetflowWindowEth = Σ inflow(top10) - Σ outflow(top10)`
- `whaleImpactRatioPct = |净流入| / (Σ inflow + Σ outflow) * 100`

> 说明：该口径与“巨鲸资金流向饼图”和“Top10 表格”保持一致，避免同页口径冲突。

---

## 7. 图表与表格模块说明

## 7.1 趋势/柱状图

1. 活跃地址趋势（折线）
2. Gas 使用趋势（折线）
3. ERC20 每日转账统计（柱状）
4. 巨鲸净流入（柱状，正负异色）
5. 交易金额分布（柱状）

## 7.2 饼图

1. 交易金额结构占比（分箱占比）
2. 巨鲸资金流向占比（Top10 inflow vs outflow）

## 7.3 巨鲸 Top10 表

- 排序：按 `|netflowEth|` 绝对值降序
- 列：排名、地址、流入、流出、净流入
- 占位：不足 10 行时填充占位行

## 7.4 方法说明矩阵

每项指标对应四列：

- 指标名
- 计算公式
- 数据来源
- 解释与用途

包含新增两个饼图的公式与说明。

---

## 8. 国际化（i18n）机制

## 8.1 文案组织

- 所有中英文文案集中在 `TRANSLATIONS` 对象中
- `zh` 与 `en` key 对齐

## 8.2 渲染方式

- 静态文本通过 `data-i18n` 替换
- 动态文本通过 `t()` 和 `tFormat()` 生成
- 切换语言时同步刷新图表标题、轴标签、单位与描述

---

## 9. 样式与布局约束

- 深色学术风格，减少视觉干扰
- 左侧侧栏固定，右侧内容滚动
- 图表卡片统一边距、边框、字体
- 动画关闭（`animation: false`），避免炫技干扰
- 纵轴大数以 `k` 单位展示，提升可读性

---

## 10. 交互事件清单

在 `bindEvents()` 中统一管理：

1. 时间窗口切换 -> 重新加载对应窗口 CSV
2. 语言切换 -> 重渲染静态文案 + 动态组件
3. 网络切换 -> 重新加载数据（预留扩展）
4. 手动刷新按钮 -> 强制重载 CSV
5. 窗口 resize -> 图表自适应

---

## 11. 运行方式

在项目根目录执行：

```bash
cd /Users/ezekiel/Documents/论文/cursor_test
python3 -m http.server 8080
```

访问：

- `http://127.0.0.1:8080/dashboard/`
- `http://127.0.0.1:8080/thesis-dashboard.html`

---

## 12. 自检建议（前端侧）

1. 窗口切换后检查：
   - KPI 数值是否变化
   - 5 图 + 2 饼图是否变化
   - Top10 表数据是否变化
2. 语言切换后检查：
   - 所有标题与说明是否同步变化
   - 数值本身不应变化
3. 数据一致性检查：
   - 巨鲸表 `inflow-outflow` 与 `netflow` 是否一致
   - 饼图两项占比是否接近 100%
4. 缓存检查：
   - 如果页面仍显示旧结果，执行 `Cmd + Shift + R`

---

## 13. 论文写作可引用要点

可在“可视化模块实现”章节使用以下描述：

- 前端采用纯静态技术栈实现，避免框架依赖，降低部署复杂度。
- 可视化由 KPI、趋势、结构、行为明细四类组件构成，形成完整分析闭环。
- 前端与离线 CSV 解耦，输入路径标准化，保证可复现与可验证。
- 双语与窗口切换机制支持论文展示与答辩演示场景。

---

## 14. 扩展建议

1. 新增图表导出按钮（PNG/SVG）
2. 新增指标对比模式（窗口 A vs 窗口 B）
3. 新增主题配置（打印版浅色学术主题）
4. 接入更多离线指标文件（稳定币、DeFi 协议维度）

