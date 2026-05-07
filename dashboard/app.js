"use strict";

const APP_CONFIG = {
  defaultLanguage: "zh",
  defaultDays: 30,
  defaultNetwork: "ethereum",
  fallbackToMock: false,
  offlineRefreshApiPath: "/api/v1/offline/refresh-csv",
  offlineRefreshApiPort: 5001,
  offlineRefreshTimeoutMs: 600000,
  csvFiles: {
    meta: "meta.csv",
    daily: "daily_metrics.csv",
    distribution: "amount_distribution.csv",
    whale: "whale_ranking.csv"
  }
};

const SCRIPT_BASE_URL = (function () {
  if (document.currentScript && document.currentScript.src) {
    return new URL("./", document.currentScript.src);
  }
  return new URL("./", window.location.href);
})();

const TRANSLATIONS = {
  zh: {
    brand_tag: "BLOCKCHAIN ANALYTICS",
    project_name: "以太坊链上数据分析与可视化系统",
    project_desc: "模块覆盖数据采集、清洗、分析、可视化，支持离线数据复现。",
    label_network: "网络",
    label_time_range: "分析窗口（天）",
    label_language: "语言",
    button_refresh: "重新加载 CSV",
    button_refresh_fetching: "拉取主网中...",
    button_refresh_loading: "读取中...",
    refresh_api_unavailable: "自动下载接口不可用，请先使用 ./run_full_dashboard.sh 启动服务。",
    toast_refresh_success: "主网 CSV 已更新，窗口 {days} 天数据时间：{time}",
    toast_refresh_failed: "主网 CSV 更新失败：{message}",
    network_ethereum: "以太坊主网",
    api_panel_title: "离线数据文件",
    api_panel_desc: "页面从本地 CSV 文件读取数据并计算指标。",
    dashboard_title: "链上指标综合看板",
    header_last_updated: "最后更新：{time}（数据来源：{source}）",
    header_fallback: "未找到可用 CSV 数据，已切换为模拟数据。",
    header_error: "CSV 读取失败：{message}",
    source_csv: "离线 CSV",
    source_mock: "模拟数据",
    badge_csv: "当前来源：CSV",
    badge_mock: "当前来源：Mock",
    kpi_active_addresses: "活跃地址数（日均，窗口期）",
    kpi_avg_gas: "平均 Gas 价格（窗口均值）",
    kpi_erc20_total: "ERC20 转账总量（窗口期）",
    kpi_whale_netflow: "巨鲸净流入（窗口期）",
    formula_active_addresses: "计算：活跃地址日均值 = Σ(每日活跃地址) / N（日）",
    formula_gas: "计算：窗口均值 Gas = Σ(每日平均 Gas 价格) / N（日）（单位：Gwei）",
    formula_erc20: "计算：ERC20 转账总量 = Σ(Transfer 事件数量)",
    formula_whale: "计算：净流入 = Σ(流入 ETH) - Σ(流出 ETH)",
    chart_active_addresses_title: "活跃地址趋势",
    chart_active_addresses_subtitle: "x 轴：日期；y 轴：地址数（个）",
    chart_gas_title: "Gas 使用趋势",
    chart_gas_subtitle: "x 轴：日期；y 轴：平均 Gas 价格（Gwei）",
    chart_erc20_title: "ERC20 每日转账统计",
    chart_erc20_subtitle: "x 轴：日期；y 轴：转账笔数（笔）",
    chart_whale_title: "巨鲸地址净流入",
    chart_whale_subtitle: "x 轴：日期；y 轴：净流入量（ETH，正负表示方向）",
    chart_distribution_title: "交易金额分布",
    chart_distribution_subtitle: "x 轴：金额区间（ETH）；y 轴：交易笔数（笔）",
    chart_distribution_ratio_title: "交易金额结构占比",
    chart_distribution_ratio_subtitle: "统计口径：窗口期金额分箱交易笔数占比（单位：%）",
    chart_whale_flow_ratio_title: "巨鲸资金流向占比",
    chart_whale_flow_ratio_subtitle: "统计口径：Top10 巨鲸流入/流出总量占比（单位：%）",
    table_title: "巨鲸地址行为统计（Top 10）",
    table_col_rank: "排名",
    table_col_address: "地址",
    table_col_inflow: "流入（ETH）",
    table_col_outflow: "流出（ETH）",
    table_col_netflow: "净流入（ETH）",
    table_empty: "暂无数据",
    method_title: "指标方法说明",
    method_col_indicator: "指标",
    method_col_formula: "计算公式",
    method_col_source: "数据来源",
    method_col_interpretation: "解释与用途",
    method_row_active_indicator: "活跃地址（日均）",
    method_row_active_formula: "Active_mean = Σ Active(d) / N，Active(d)=|Addr_send∪Addr_recv|",
    method_row_active_source: "Etherscan Active Address CSV",
    method_row_active_interpretation: "反映窗口期账户参与强度。用于判断用户活跃水平及活跃趋势变化。",
    method_row_gas_indicator: "平均 Gas（窗口均值）",
    method_row_gas_formula: "Gas_mean = Σ Gas_gwei(d) / N，Gas_gwei=Value(Wei)/10^9",
    method_row_gas_source: "Etherscan Gas Price CSV",
    method_row_gas_interpretation: "衡量链上拥堵与交易成本。数值越高通常表示网络资源竞争越激烈。",
    method_row_erc20_indicator: "ERC20 转账总量",
    method_row_erc20_formula: "ERC20_total = Σ ERC20_count(d)",
    method_row_erc20_source: "Etherscan ERC20 Transfers CSV",
    method_row_erc20_interpretation: "衡量代币流转活跃度。可用于观察市场情绪和应用交互热度。",
    method_row_whale_indicator: "巨鲸净流入（窗口期）",
    method_row_whale_formula: "Netflow_window = Σ (Inflow_i - Outflow_i)，按 |Netflow_i| 排序取 Top10",
    method_row_whale_source: "Top Accounts 快照 + 日序列代理估计",
    method_row_whale_interpretation: "用于刻画高净值地址资金方向。正值偏流入，负值偏流出。",
    method_row_amount_indicator: "交易金额分布",
    method_row_amount_formula: "按区间分箱统计 count(bucket_j)，区间：[0,0.1)、[0.1,1)、[1,10)、[10,100)、[100,1000)、>1000",
    method_row_amount_source: "离线分箱代理（交易活跃度 + Gas 成本）",
    method_row_amount_interpretation: "展示小额/中额/大额交易结构，识别资金规模分层特征。",
    method_row_amount_pie_indicator: "金额结构占比饼图",
    method_row_amount_pie_formula: "Share_j = count(bucket_j) / Σ count(bucket)",
    method_row_amount_pie_source: "amount_distribution.csv",
    method_row_amount_pie_interpretation: "直观比较各金额区间占比，便于快速识别主导交易层级。",
    method_row_whale_pie_indicator: "巨鲸流向占比饼图",
    method_row_whale_pie_formula: "Inflow_share = ΣInflow / (ΣInflow+ΣOutflow)，Outflow_share 同理",
    method_row_whale_pie_source: "whale_ranking.csv（Top10）",
    method_row_whale_pie_interpretation: "直观呈现巨鲸资金流入/流出结构，辅助判断资金方向一致性。",
    metric_change_7d: "窗口首末变化：{value}",
    metric_daily_mean: "日均转账：{value}",
    metric_whale_ratio: "资金影响占比：{value}",
    unit_transfer_count: "笔",
    axis_date: "日期",
    axis_addresses: "地址数（个）",
    axis_gwei: "Gas 价格（Gwei）",
    axis_transfer_count: "转账笔数（笔）",
    axis_eth: "ETH 数量（ETH）",
    axis_bucket: "金额区间（ETH）",
    series_active: "活跃地址",
    series_gas: "平均 Gas",
    series_erc20: "ERC20 转账",
    series_whale: "巨鲸净流入",
    series_distribution: "交易笔数",
    pie_inflow: "流入总量",
    pie_outflow: "流出总量"
  },
  en: {
    brand_tag: "BLOCKCHAIN ANALYTICS",
    project_name: "Ethereum On-Chain Analytics & Visualization System",
    project_desc: "Modules include data acquisition, cleaning, analysis, and visualization with offline reproducibility.",
    label_network: "Network",
    label_time_range: "Window (Days)",
    label_language: "Language",
    button_refresh: "Reload CSV",
    button_refresh_fetching: "Syncing mainnet...",
    button_refresh_loading: "Loading...",
    refresh_api_unavailable: "Auto refresh API is unavailable. Please start services with ./run_full_dashboard.sh.",
    toast_refresh_success: "Mainnet CSV updated. Window {days} latest time: {time}",
    toast_refresh_failed: "Mainnet CSV update failed: {message}",
    network_ethereum: "Ethereum Mainnet",
    api_panel_title: "Offline Data Files",
    api_panel_desc: "The dashboard reads local CSV files and computes metrics.",
    dashboard_title: "Integrated On-Chain Metrics Dashboard",
    header_last_updated: "Last update: {time} (Source: {source})",
    header_fallback: "CSV files not found, switched to mock data.",
    header_error: "CSV load failed: {message}",
    source_csv: "Offline CSV",
    source_mock: "Mock Data",
    badge_csv: "Current Source: CSV",
    badge_mock: "Current Source: Mock",
    kpi_active_addresses: "Active Addresses (Window Daily Mean)",
    kpi_avg_gas: "Average Gas Price (Window Mean)",
    kpi_erc20_total: "ERC20 Transfers (Window Total)",
    kpi_whale_netflow: "Whale Net Inflow (Window Total)",
    formula_active_addresses: "Formula: active-address daily mean = Σ(daily active addresses) / N(days)",
    formula_gas: "Formula: window gas mean = Σ(daily average gas price) / N(days) (unit: Gwei)",
    formula_erc20: "Formula: ERC20 transfer volume = Σ(count of Transfer events)",
    formula_whale: "Formula: net inflow = Σ(inflow ETH) - Σ(outflow ETH)",
    chart_active_addresses_title: "Active Address Trend",
    chart_active_addresses_subtitle: "x-axis: date; y-axis: address count",
    chart_gas_title: "Gas Usage Trend",
    chart_gas_subtitle: "x-axis: date; y-axis: average gas price (Gwei)",
    chart_erc20_title: "Daily ERC20 Transfer Count",
    chart_erc20_subtitle: "x-axis: date; y-axis: transfer count",
    chart_whale_title: "Whale Address Netflow",
    chart_whale_subtitle: "x-axis: date; y-axis: netflow (ETH, sign indicates direction)",
    chart_distribution_title: "Transaction Amount Distribution",
    chart_distribution_subtitle: "x-axis: amount bucket (ETH); y-axis: transaction count",
    chart_distribution_ratio_title: "Transaction Amount Structure Share",
    chart_distribution_ratio_subtitle: "Scope: share of bucketed transaction counts within the selected window (unit: %)",
    chart_whale_flow_ratio_title: "Whale Flow Direction Share",
    chart_whale_flow_ratio_subtitle: "Scope: share of total inflow vs outflow among Top10 whales in the selected window (unit: %)",
    table_title: "Whale Address Behavior (Top 10)",
    table_col_rank: "Rank",
    table_col_address: "Address",
    table_col_inflow: "Inflow (ETH)",
    table_col_outflow: "Outflow (ETH)",
    table_col_netflow: "Netflow (ETH)",
    table_empty: "No data",
    method_title: "Metric Methodology",
    method_col_indicator: "Metric",
    method_col_formula: "Formula",
    method_col_source: "Data Source",
    method_col_interpretation: "Interpretation & Usage",
    method_row_active_indicator: "Active Addresses (Window Mean)",
    method_row_active_formula: "Active_mean = Σ Active(d) / N, Active(d)=|Addr_send∪Addr_recv|",
    method_row_active_source: "Etherscan Active Address CSV",
    method_row_active_interpretation: "Represents participation intensity in the selected window and helps detect activity changes.",
    method_row_gas_indicator: "Average Gas (Window Mean)",
    method_row_gas_formula: "Gas_mean = Σ Gas_gwei(d) / N, Gas_gwei=Value(Wei)/10^9",
    method_row_gas_source: "Etherscan Gas Price CSV",
    method_row_gas_interpretation: "Measures congestion and transaction-cost pressure; higher values usually imply stronger block-space competition.",
    method_row_erc20_indicator: "ERC20 Transfer Total",
    method_row_erc20_formula: "ERC20_total = Σ ERC20_count(d)",
    method_row_erc20_source: "Etherscan ERC20 Transfers CSV",
    method_row_erc20_interpretation: "Captures token-circulation intensity and ecosystem interaction activity.",
    method_row_whale_indicator: "Whale Netflow (Window)",
    method_row_whale_formula: "Netflow_window = Σ (Inflow_i - Outflow_i), ranked by |Netflow_i| for Top10",
    method_row_whale_source: "Top Accounts snapshot + offline proxy estimation",
    method_row_whale_interpretation: "Tracks high-value capital direction; positive implies inflow dominance and negative implies outflow dominance.",
    method_row_amount_indicator: "Transaction Amount Distribution",
    method_row_amount_formula: "Bucketed counts count(bucket_j) over [0,0.1), [0.1,1), [1,10), [10,100), [100,1000), >1000",
    method_row_amount_source: "Offline bucket proxy (activity + gas-cost series)",
    method_row_amount_interpretation: "Shows low/mid/high-value structure and supports scale-layer analysis of transaction behavior.",
    method_row_amount_pie_indicator: "Amount Structure Pie",
    method_row_amount_pie_formula: "Share_j = count(bucket_j) / Σ count(bucket)",
    method_row_amount_pie_source: "amount_distribution.csv",
    method_row_amount_pie_interpretation: "Provides an intuitive comparison of bucket proportions to identify dominant size layers quickly.",
    method_row_whale_pie_indicator: "Whale Flow Direction Pie",
    method_row_whale_pie_formula: "Inflow_share = ΣInflow / (ΣInflow+ΣOutflow), likewise for Outflow_share",
    method_row_whale_pie_source: "whale_ranking.csv (Top10)",
    method_row_whale_pie_interpretation: "Visualizes inflow-vs-outflow composition for whales and helps evaluate directional consensus.",
    metric_change_7d: "Start-to-end change: {value}",
    metric_daily_mean: "Daily mean: {value}",
    metric_whale_ratio: "Capital impact ratio: {value}",
    unit_transfer_count: "tx",
    axis_date: "Date",
    axis_addresses: "Address Count",
    axis_gwei: "Gas Price (Gwei)",
    axis_transfer_count: "Transfer Count",
    axis_eth: "ETH Amount (ETH)",
    axis_bucket: "Amount Bucket (ETH)",
    series_active: "Active Addresses",
    series_gas: "Average Gas",
    series_erc20: "ERC20 Transfers",
    series_whale: "Whale Netflow",
    series_distribution: "Transactions",
    pie_inflow: "Total Inflow",
    pie_outflow: "Total Outflow"
  }
};

const appState = {
  language: APP_CONFIG.defaultLanguage,
  rangeDays: APP_CONFIG.defaultDays,
  network: APP_CONFIG.defaultNetwork,
  dataset: null,
  dataSource: "csv",
  lastUpdated: null,
  lastError: ""
};

const chartInstances = {
  activeAddresses: null,
  gasTrend: null,
  erc20Transfers: null,
  whaleNetflow: null,
  amountDistribution: null,
  distributionPie: null,
  whaleFlowPie: null
};

/** 根据当前语言读取翻译文案。 */
function t(key) {
  const languagePack = TRANSLATIONS[appState.language] || TRANSLATIONS.zh;
  return languagePack[key] || TRANSLATIONS.zh[key] || key;
}

/** 执行带参数的翻译模板替换。 */
function tFormat(key, params) {
  let template = t(key);
  Object.keys(params).forEach(function (paramKey) {
    template = template.replace(new RegExp("\\{" + paramKey + "\\}", "g"), String(params[paramKey]));
  });
  return template;
}

/** 将页面中标记 data-i18n 的静态文本更新为当前语言。 */
function applyStaticTranslations() {
  const nodes = document.querySelectorAll("[data-i18n]");
  nodes.forEach(function (node) {
    const key = node.getAttribute("data-i18n");
    node.textContent = t(key);
  });
  document.title = t("project_name");
  document.documentElement.setAttribute("lang", appState.language === "zh" ? "zh-CN" : "en");
}

/** 更新网络下拉框文案，确保中英文切换一致。 */
function updateNetworkOptions() {
  const networkSelect = document.getElementById("networkSelect");
  networkSelect.options[0].textContent = t("network_ethereum");
}

/** 限制数值范围，防止模拟数据出现异常极值。 */
function clampNumber(value, minValue, maxValue) {
  if (value < minValue) {
    return minValue;
  }
  if (value > maxValue) {
    return maxValue;
  }
  return value;
}

/** 将字符串映射为稳定随机种子，保证模拟数据可复现。 */
function hashSeedFromText(text) {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** 构造线性同余随机数生成器，用于生成可复现样本数据。 */
function createSeededRng(seed) {
  let current = seed || 1;
  return function nextRandom() {
    current = (Math.imul(1664525, current) + 1013904223) >>> 0;
    return current / 4294967296;
  };
}

/** 生成最近 N 天的日期标签数组。 */
function generateDateArray(days) {
  const labels = [];
  const now = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const current = new Date(now);
    current.setDate(now.getDate() - offset);
    labels.push(current.toISOString().slice(0, 10));
  }
  return labels;
}

/** 生成每日核心指标序列，覆盖活跃地址、Gas、ERC20 与巨鲸净流入。 */
function generateMockDailySeries(days, network) {
  const seed = hashSeedFromText(network + "-" + String(days) + "-thesis-dashboard");
  const random = createSeededRng(seed);
  const dates = generateDateArray(days);

  let activeBase = 520000 + Math.round(random() * 40000);
  let gasBase = 32 + random() * 5;
  let erc20Base = 340000 + Math.round(random() * 50000);
  let transferBase = 180000 + Math.round(random() * 26000);
  let txBase = 980000 + Math.round(random() * 90000);

  return dates.map(function (date, index) {
    const weeklySignal = Math.sin((index / 7) * Math.PI * 2);
    const marketSignal = Math.cos((index / 11) * Math.PI * 2);
    const noise1 = (random() - 0.5) * 2;
    const noise2 = (random() - 0.5) * 2;

    activeBase = clampNumber(
      Math.round(activeBase + weeklySignal * 12000 + noise1 * 18000 + 1800),
      320000,
      860000
    );
    gasBase = clampNumber(gasBase + marketSignal * 2.1 + noise2 * 3.4, 8, 120);
    erc20Base = clampNumber(
      Math.round(erc20Base + weeklySignal * 14000 + noise1 * 26000 + 2200),
      160000,
      920000
    );
    transferBase = clampNumber(
      Math.round(transferBase + marketSignal * 8500 + noise2 * 13000 + 1600),
      80000,
      420000
    );
    txBase = clampNumber(
      Math.round(txBase + weeklySignal * 18000 + noise1 * 30000 + 2600),
      520000,
      2100000
    );

    const whaleNetflow = Number((noise1 * 4200 + marketSignal * 1900).toFixed(2));
    const avgTxAmountEth = Number(clampNumber(0.72 + random() * 1.4 + marketSignal * 0.12, 0.15, 3.8).toFixed(4));

    return {
      date: date,
      activeAddresses: activeBase,
      avgGasGwei: Number(gasBase.toFixed(2)),
      erc20TransferCount: erc20Base,
      whaleNetflowEth: whaleNetflow,
      totalTransferEth: transferBase,
      transactionCount: txBase,
      avgTxAmountEth: avgTxAmountEth
    };
  });
}

/** 生成交易金额分布分箱统计，模拟论文中直方图输入。 */
function buildMockAmountDistribution(random, dailySeries) {
  const bucketTemplate = [
    { label: "0-0.1", weight: 0.42 },
    { label: "0.1-1", weight: 0.26 },
    { label: "1-10", weight: 0.17 },
    { label: "10-100", weight: 0.09 },
    { label: "100-1k", weight: 0.04 },
    { label: ">1k", weight: 0.02 }
  ];

  const averageTxCount = dailySeries.reduce(function (sum, item) {
    return sum + item.transactionCount;
  }, 0) / Math.max(dailySeries.length, 1);

  return bucketTemplate.map(function (bucket) {
    const jitter = 1 + (random() - 0.5) * 0.18;
    return {
      bucket: bucket.label,
      transactionCount: Math.round(averageTxCount * bucket.weight * jitter)
    };
  });
}

/** 生成巨鲸地址表格数据，体现地址级资金流向统计。 */
function buildMockWhaleRanking(random) {
  const records = [];
  for (let index = 0; index < 10; index += 1) {
    const address = "0x" + Array.from({ length: 40 }, function () {
      return Math.floor(random() * 16).toString(16);
    }).join("");

    const inflowEth = Number((8500 + random() * 26000).toFixed(2));
    const outflowEth = Number((7800 + random() * 24000).toFixed(2));
    records.push({
      address: address,
      inflowEth: inflowEth,
      outflowEth: outflowEth,
      netflowEth: Number((inflowEth - outflowEth).toFixed(2))
    });
  }

  records.sort(function (left, right) {
    return Math.abs(right.netflowEth) - Math.abs(left.netflowEth);
  });

  return records;
}

/** 计算 KPI 概览指标，用于顶部统计卡片展示。 */
function calculateOverviewMetrics(dailySeries, whaleRanking) {
  if (!dailySeries || dailySeries.length === 0) {
    return {
      latestActiveAddresses: 0,
      latestActiveChangePct: 0,
      latestGasGwei: 0,
      latestGasChangePct: 0,
      erc20Total: 0,
      erc20DailyMean: 0,
      whaleNetflowWindowEth: 0,
      whaleImpactRatioPct: 0
    };
  }

  const firstPoint = dailySeries[0];
  const lastPoint = dailySeries[dailySeries.length - 1];
  const avgActiveAddresses = dailySeries.reduce(function (sum, item) {
    return sum + item.activeAddresses;
  }, 0) / Math.max(dailySeries.length, 1);
  const avgGasGwei = dailySeries.reduce(function (sum, item) {
    return sum + item.avgGasGwei;
  }, 0) / Math.max(dailySeries.length, 1);

  const latestGasChange = ((lastPoint.avgGasGwei - firstPoint.avgGasGwei) / Math.max(firstPoint.avgGasGwei, 0.0001)) * 100;
  const latestActiveChange = ((lastPoint.activeAddresses - firstPoint.activeAddresses) / Math.max(firstPoint.activeAddresses, 1)) * 100;

  const erc20Total = dailySeries.reduce(function (sum, item) {
    return sum + item.erc20TransferCount;
  }, 0);

  let whaleNetflowWindow = dailySeries.reduce(function (sum, item) {
    return sum + item.whaleNetflowEth;
  }, 0);

  let whaleFlowMagnitudeWindow = dailySeries.reduce(function (sum, item) {
    return sum + Math.abs(item.whaleNetflowEth);
  }, 0);

  if (Array.isArray(whaleRanking) && whaleRanking.length > 0) {
    const totalInflow = whaleRanking.reduce(function (sum, item) {
      return sum + Math.max(0, item.inflowEth);
    }, 0);
    const totalOutflow = whaleRanking.reduce(function (sum, item) {
      return sum + Math.max(0, item.outflowEth);
    }, 0);
    whaleNetflowWindow = totalInflow - totalOutflow;
    whaleFlowMagnitudeWindow = totalInflow + totalOutflow;
  }

  const whaleImpactRatio = (Math.abs(whaleNetflowWindow) / Math.max(whaleFlowMagnitudeWindow, 0.0001)) * 100;

  return {
    latestActiveAddresses: Number(avgActiveAddresses.toFixed(0)),
    latestActiveChangePct: Number(latestActiveChange.toFixed(2)),
    latestGasGwei: Number(avgGasGwei.toFixed(2)),
    latestGasChangePct: Number(latestGasChange.toFixed(2)),
    erc20Total: erc20Total,
    erc20DailyMean: Math.round(erc20Total / Math.max(dailySeries.length, 1)),
    whaleNetflowWindowEth: Number(whaleNetflowWindow.toFixed(2)),
    whaleImpactRatioPct: Number(whaleImpactRatio.toFixed(3))
  };
}

/** 组装完整模拟数据集，结构与离线 CSV 结构一致。 */
function buildMockDataset(days, network) {
  const seed = hashSeedFromText(network + "-" + String(days) + "-distribution");
  const random = createSeededRng(seed);
  const dailySeries = generateMockDailySeries(days, network);
  const amountDistribution = buildMockAmountDistribution(random, dailySeries);
  const whaleRanking = buildMockWhaleRanking(random);

  return {
    meta: {
      source: "mock",
      network: network,
      days: days,
      generatedAt: new Date().toISOString()
    },
    overview: calculateOverviewMetrics(dailySeries, whaleRanking),
    daily: dailySeries,
    amountDistribution: amountDistribution,
    whaleRanking: whaleRanking
  };
}

/** 将外部输入转换为数值，异常时返回默认值。 */
function normalizeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** 规范化每日记录格式，保证字段完整。 */
function normalizeDailyRecord(record) {
  return {
    date: String(record.date || ""),
    activeAddresses: Math.round(normalizeNumber(record.activeAddresses, 0)),
    avgGasGwei: Number(normalizeNumber(record.avgGasGwei, 0).toFixed(2)),
    erc20TransferCount: Math.round(normalizeNumber(record.erc20TransferCount, 0)),
    whaleNetflowEth: Number(normalizeNumber(record.whaleNetflowEth, 0).toFixed(2)),
    totalTransferEth: Number(normalizeNumber(record.totalTransferEth, 0).toFixed(2)),
    transactionCount: Math.round(normalizeNumber(record.transactionCount, 0)),
    avgTxAmountEth: Number(normalizeNumber(record.avgTxAmountEth, 0).toFixed(4))
  };
}

/** 解析 CSV 单行文本，支持双引号包裹场景。 */
function parseCsvLine(lineText) {
  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let index = 0; index < lineText.length; index += 1) {
    const char = lineText[index];

    if (char === '"') {
      if (insideQuotes && lineText[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values;
}

/** 将 CSV 文本转换为对象数组。 */
function parseCsvText(csvText) {
  const normalizedText = String(csvText || "").replace(/^\uFEFF/, "").trim();
  if (!normalizedText) {
    return [];
  }

  const lines = normalizedText.split(/\r?\n/).filter(function (line) {
    return line.trim().length > 0;
  });
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]).map(function (header) {
    return header.trim();
  });

  return lines.slice(1).map(function (line) {
    const columns = parseCsvLine(line);
    const row = {};
    headers.forEach(function (header, index) {
      row[header] = (columns[index] || "").trim();
    });
    return row;
  });
}

/** 请求本地 CSV 文件文本。 */
async function requestCsvText(fileUrl) {
  const response = await fetch(fileUrl, { method: "GET", cache: "no-store" });
  if (!response.ok) {
    throw new Error("HTTP " + response.status + " " + fileUrl);
  }
  return response.text();
}

/** 带超时控制发送 POST JSON 请求。 */
async function postJsonWithTimeout(url, payload, timeoutMs) {
  const controller = new AbortController();
  const timer = window.setTimeout(function () {
    controller.abort();
  }, timeoutMs);

  try {
    return await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timer);
  }
}

/** 构建“自动拉取主网 CSV”接口候选地址，兼容同端口与独立 API 端口两种模式。 */
function buildOfflineRefreshApiCandidates() {
  const candidates = [];
  const path = APP_CONFIG.offlineRefreshApiPath;
  const host = window.location.hostname || "127.0.0.1";
  const fallbackUrl = "http://" + host + ":" + String(APP_CONFIG.offlineRefreshApiPort) + path;
  candidates.push(fallbackUrl);

  const currentPort = window.location.port || "";
  // 当前项目默认由 8080 静态服务 + 5001 刷新 API 组成，8080 上的 /api 路由会返回 501。
  // 仅在非 8080 场景下再尝试同源地址，避免产生误导性报错。
  if (currentPort !== "8080") {
    const sameOriginUrl = new URL(path, window.location.origin).toString();
    if (sameOriginUrl !== fallbackUrl) {
      candidates.push(sameOriginUrl);
    }
  }

  return candidates;
}

/** 触发后端刷新任务：下载主网最新 CSV 并覆盖本地离线文件。 */
async function triggerOfflineCsvRefresh() {
  const payload = {
    network: appState.network,
    windows: [7, 30, 90]
  };
  const apiCandidates = buildOfflineRefreshApiCandidates();
  const errors = [];

  for (let index = 0; index < apiCandidates.length; index += 1) {
    const apiUrl = apiCandidates[index];
    try {
      const response = await postJsonWithTimeout(apiUrl, payload, APP_CONFIG.offlineRefreshTimeoutMs);
      let body = {};
      try {
        body = await response.json();
      } catch (_error) {
        body = {};
      }

      if (!response.ok) {
        const message = body.message || body.error || ("HTTP " + response.status);
        errors.push(apiUrl + " -> " + message);
        continue;
      }

      return body;
    } catch (error) {
      const message = error && error.message ? error.message : "request failed";
      errors.push(apiUrl + " -> " + message);
    }
  }

  throw new Error(t("refresh_api_unavailable") + " " + errors.join(" | "));
}

/** 基于当前窗口期构建离线数据文件 URL。 */
function buildCsvFileUrl(fileName) {
  const url = new URL(
    "data/" + appState.network + "/" + String(appState.rangeDays) + "/" + fileName,
    SCRIPT_BASE_URL
  );
  // 追加时间戳参数，避免浏览器缓存导致刷新后读取旧 CSV。
  url.searchParams.set("_ts", String(Date.now()));
  return url.toString();
}

/** 返回当前窗口期对应的离线文件相对路径，便于页面展示。 */
function buildCsvFileHint(fileName) {
  return "data/" + appState.network + "/" + String(appState.rangeDays) + "/" + fileName;
}

/** 加载一个窗口期所需的全部 CSV 文件。 */
async function loadCsvBundle() {
  const csvUrls = {
    meta: buildCsvFileUrl(APP_CONFIG.csvFiles.meta),
    daily: buildCsvFileUrl(APP_CONFIG.csvFiles.daily),
    distribution: buildCsvFileUrl(APP_CONFIG.csvFiles.distribution),
    whale: buildCsvFileUrl(APP_CONFIG.csvFiles.whale)
  };

  const responses = await Promise.all([
    requestCsvText(csvUrls.meta),
    requestCsvText(csvUrls.daily),
    requestCsvText(csvUrls.distribution),
    requestCsvText(csvUrls.whale)
  ]);

  return {
    metaRows: parseCsvText(responses[0]),
    dailyRows: parseCsvText(responses[1]),
    distributionRows: parseCsvText(responses[2]),
    whaleRows: parseCsvText(responses[3])
  };
}

/** 将离线 CSV 数据归一化为前端统一数据结构。 */
function normalizeCsvDataset(csvBundle) {
  const daily = csvBundle.dailyRows
    .filter(function (row) {
      return !row.network || row.network.toLowerCase() === appState.network;
    })
    .map(function (row) {
      return normalizeDailyRecord({
        date: row.date,
        activeAddresses: row.active_addresses,
        avgGasGwei: row.avg_gas_gwei,
        erc20TransferCount: row.erc20_transfer_count,
        whaleNetflowEth: row.whale_netflow_eth,
        totalTransferEth: row.total_transfer_eth,
        transactionCount: row.transaction_count,
        avgTxAmountEth: row.avg_tx_amount_eth
      });
    })
    .sort(function (left, right) {
      return left.date.localeCompare(right.date);
    });

  if (daily.length === 0) {
    throw new Error("CSV daily_metrics.csv is empty");
  }

  const distribution = csvBundle.distributionRows
    .filter(function (row) {
      return !row.network || row.network.toLowerCase() === appState.network;
    })
    .map(function (row) {
      return {
        bucket: String(row.bucket || "N/A"),
        transactionCount: Math.round(normalizeNumber(row.transaction_count, 0))
      };
    });

  const whales = csvBundle.whaleRows
    .filter(function (row) {
      return !row.network || row.network.toLowerCase() === appState.network;
    })
    .map(function (row) {
      return {
        address: String(row.address || ""),
        inflowEth: Number(normalizeNumber(row.inflow_eth, 0).toFixed(2)),
        outflowEth: Number(normalizeNumber(row.outflow_eth, 0).toFixed(2)),
        netflowEth: Number(normalizeNumber(row.netflow_eth, 0).toFixed(2))
      };
    })
    .sort(function (left, right) {
      return Math.abs(right.netflowEth) - Math.abs(left.netflowEth);
    })
    .slice(0, 10);

  const metaRow = csvBundle.metaRows[0] || {};
  const generatedAt = String(metaRow.generated_at || new Date().toISOString());

  const normalizedAmountDistribution = distribution.length > 0
    ? distribution
    : buildMockAmountDistribution(createSeededRng(hashSeedFromText("csv-dist-fallback")), daily);
  const normalizedWhaleRanking = whales.length > 0
    ? whales
    : buildMockWhaleRanking(createSeededRng(hashSeedFromText("csv-whale-fallback")));

  return {
    meta: {
      source: "csv",
      network: appState.network,
      days: appState.rangeDays,
      generatedAt: generatedAt,
      method: String(metaRow.method || "offline_csv")
    },
    overview: calculateOverviewMetrics(daily, normalizedWhaleRanking),
    daily: daily,
    amountDistribution: normalizedAmountDistribution,
    whaleRanking: normalizedWhaleRanking
  };
}

/** 获取看板数据：优先读取离线 CSV，不可用时回退模拟数据。 */
async function loadDashboardDataset() {
  try {
    const csvBundle = await loadCsvBundle();
    return {
      source: "csv",
      dataset: normalizeCsvDataset(csvBundle),
      error: ""
    };
  } catch (error) {
    if (!APP_CONFIG.fallbackToMock) {
      throw error;
    }

    return {
      source: "mock",
      dataset: buildMockDataset(appState.rangeDays, appState.network),
      error: error && error.message ? error.message : "Unknown error"
    };
  }
}

/** 依据当前语言格式化整数值。 */
function formatInteger(value) {
  const locale = appState.language === "zh" ? "zh-CN" : "en-US";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

/** 依据当前语言格式化带小数的数值。 */
function formatDecimal(value, digits) {
  const locale = appState.language === "zh" ? "zh-CN" : "en-US";
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

/** 格式化带正负号的百分比字符串。 */
function formatSignedPercent(value) {
  const sign = value >= 0 ? "+" : "";
  return sign + formatDecimal(value, 2) + "%";
}

/** 格式化 ETH 数值，保留两位小数。 */
function formatEth(value) {
  return formatDecimal(value, 2) + " ETH";
}

/** 将数值转换为以 k 为单位的坐标轴显示格式。 */
function formatKAxis(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return "0k";
  }

  const sign = numericValue < 0 ? "-" : "";
  const scaledValue = Math.abs(numericValue) / 1000;
  const roundedValue = scaledValue >= 100 ? Math.round(scaledValue) : Math.round(scaledValue * 10) / 10;
  const displayValue = Number.isInteger(roundedValue) ? String(roundedValue) : String(roundedValue);
  return sign + displayValue + "k";
}

/** 格式化本地化时间文本，匹配中英文环境。 */
function formatLocalTime(isoText) {
  const locale = appState.language === "zh" ? "zh-CN" : "en-US";
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).format(new Date(isoText));
}

/** 显示全局提示消息（成功/失败）。 */
function showToast(message, type) {
  const toastType = type === "error" ? "error" : "success";
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = "toast-message toast-" + toastType;
  toast.textContent = message;
  container.appendChild(toast);

  window.setTimeout(function () {
    toast.classList.add("toast-hide");
    window.setTimeout(function () {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 250);
  }, 3200);
}

/** 根据指标正负变化设置颜色状态，便于快速判断趋势方向。 */
function applyChangeStyle(element, value) {
  element.classList.remove("positive");
  element.classList.remove("negative");
  if (value > 0) {
    element.classList.add("positive");
  } else if (value < 0) {
    element.classList.add("negative");
  }
}

/** 在文本模板中仅为数值部分设置涨跌颜色。 */
function renderLabeledValueWithColor(node, templateKey, valueText, signValue) {
  const valueClass = signValue > 0
    ? "metric-number-positive"
    : signValue < 0
      ? "metric-number-negative"
      : "metric-number-neutral";
  const valueHtml = "<span class=\"" + valueClass + "\">" + valueText + "</span>";
  node.innerHTML = t(templateKey).replace("{value}", valueHtml);
}

/** 渲染顶部 KPI 卡片内容。 */
function renderKpiCards(dataset) {
  const overview = dataset.overview;
  const activeValueNode = document.getElementById("kpiActiveAddresses");
  const activeChangeNode = document.getElementById("kpiActiveAddressesChange");
  const gasValueNode = document.getElementById("kpiAvgGas");
  const gasChangeNode = document.getElementById("kpiAvgGasChange");
  const erc20ValueNode = document.getElementById("kpiErc20Total");
  const erc20MeanNode = document.getElementById("kpiErc20Mean");
  const whaleValueNode = document.getElementById("kpiWhaleNetflow");
  const whaleRatioNode = document.getElementById("kpiWhaleRatio");

  activeValueNode.textContent = formatInteger(overview.latestActiveAddresses);
  renderLabeledValueWithColor(
    activeChangeNode,
    "metric_change_7d",
    formatSignedPercent(overview.latestActiveChangePct),
    overview.latestActiveChangePct
  );

  gasValueNode.textContent = formatDecimal(overview.latestGasGwei, 2) + " Gwei";
  renderLabeledValueWithColor(
    gasChangeNode,
    "metric_change_7d",
    formatSignedPercent(overview.latestGasChangePct),
    overview.latestGasChangePct
  );

  erc20ValueNode.textContent = formatInteger(overview.erc20Total) + " " + t("unit_transfer_count");
  erc20MeanNode.textContent = tFormat("metric_daily_mean", {
    value: formatInteger(overview.erc20DailyMean) + " " + t("unit_transfer_count")
  });

  whaleValueNode.textContent = formatEth(overview.whaleNetflowWindowEth);
  whaleRatioNode.textContent = tFormat("metric_whale_ratio", {
    value: formatDecimal(overview.whaleImpactRatioPct, 3) + "%"
  });
  applyChangeStyle(whaleValueNode, overview.whaleNetflowWindowEth);
}

/** 将地址压缩为论文截图友好的短格式。 */
function shortAddress(address) {
  if (address.length <= 14) {
    return address;
  }
  return address.slice(0, 8) + "..." + address.slice(-6);
}

/** 渲染巨鲸地址行为表格。 */
function renderWhaleTable(rows) {
  const tableBody = document.getElementById("whaleTableBody");
  tableBody.innerHTML = "";
  const targetRowCount = 10;

  if (!Array.isArray(rows) || rows.length === 0) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.colSpan = 5;
    cell.textContent = t("table_empty");
    row.appendChild(cell);
    tableBody.appendChild(row);
    return;
  }

  const displayRows = rows.slice(0, targetRowCount);
  while (displayRows.length < targetRowCount) {
    displayRows.push({
      address: "--",
      inflowEth: 0,
      outflowEth: 0,
      netflowEth: 0,
      placeholder: true
    });
  }

  displayRows.forEach(function (record, index) {
    const row = document.createElement("tr");

    const rankCell = document.createElement("td");
    rankCell.textContent = String(index + 1);

    const addressCell = document.createElement("td");
    addressCell.textContent = record.placeholder ? "--" : shortAddress(record.address);
    addressCell.className = "address-cell";

    const inflowCell = document.createElement("td");
    inflowCell.textContent = record.placeholder ? "--" : formatDecimal(record.inflowEth, 2);

    const outflowCell = document.createElement("td");
    outflowCell.textContent = record.placeholder ? "--" : formatDecimal(record.outflowEth, 2);

    const netflowCell = document.createElement("td");
    netflowCell.textContent = record.placeholder ? "--" : formatDecimal(record.netflowEth, 2);
    if (!record.placeholder && record.netflowEth > 0) {
      netflowCell.classList.add("positive");
    } else if (!record.placeholder && record.netflowEth < 0) {
      netflowCell.classList.add("negative");
    }

    row.appendChild(rankCell);
    row.appendChild(addressCell);
    row.appendChild(inflowCell);
    row.appendChild(outflowCell);
    row.appendChild(netflowCell);
    tableBody.appendChild(row);
  });
}

/** 构造图表通用样式配置，保持视觉统一。 */
function buildBaseChartOption() {
  return {
    textStyle: { color: "#d8e4ef", fontFamily: "IBM Plex Sans, Noto Sans SC, sans-serif" },
    animation: false,
    grid: { left: 56, right: 22, top: 30, bottom: 52 },
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(11, 16, 21, 0.95)",
      borderColor: "#2c3f54",
      borderWidth: 1,
      textStyle: { color: "#d8e4ef" }
    },
    xAxis: {
      type: "category",
      axisLine: { lineStyle: { color: "#2f4257" } },
      axisLabel: { color: "#92a7bb", fontSize: 11 },
      axisTick: { show: false },
      splitLine: { show: false },
      name: t("axis_date"),
      nameLocation: "middle",
      nameGap: 32,
      nameTextStyle: { color: "#8fa3b7", fontSize: 11 }
    },
    yAxis: {
      type: "value",
      axisLine: { show: false },
      axisLabel: { color: "#92a7bb", fontSize: 11 },
      splitLine: { lineStyle: { color: "rgba(255,255,255,0.08)" } },
      nameTextStyle: { color: "#8fa3b7", fontSize: 11 }
    }
  };
}

/** 构建活跃地址折线图配置。 */
function buildActiveAddressOption(dataset) {
  const base = buildBaseChartOption();
  const labels = dataset.daily.map(function (item) { return item.date; });
  const values = dataset.daily.map(function (item) { return item.activeAddresses; });

  return {
    ...base,
    xAxis: {
      ...base.xAxis,
      data: labels,
      name: t("axis_date")
    },
    yAxis: {
      ...base.yAxis,
      name: t("axis_addresses"),
      axisLabel: {
        ...base.yAxis.axisLabel,
        formatter: function (value) {
          return formatKAxis(value);
        }
      }
    },
    series: [{
      name: t("series_active"),
      type: "line",
      smooth: 0.25,
      data: values,
      symbol: "none",
      lineStyle: { width: 2, color: "#3bcf7c" },
      areaStyle: { color: "rgba(59, 207, 124, 0.15)" }
    }]
  };
}

/** 构建 Gas 趋势折线图配置。 */
function buildGasTrendOption(dataset) {
  const base = buildBaseChartOption();
  const labels = dataset.daily.map(function (item) { return item.date; });
  const values = dataset.daily.map(function (item) { return item.avgGasGwei; });

  return {
    ...base,
    xAxis: {
      ...base.xAxis,
      data: labels,
      name: t("axis_date")
    },
    yAxis: {
      ...base.yAxis,
      name: t("axis_gwei")
    },
    series: [{
      name: t("series_gas"),
      type: "line",
      smooth: true,
      data: values,
      symbol: "none",
      lineStyle: { width: 2, color: "#42a5f5" },
      areaStyle: { color: "rgba(66, 165, 245, 0.14)" }
    }]
  };
}

/** 构建 ERC20 转账柱状图配置。 */
function buildErc20Option(dataset) {
  const base = buildBaseChartOption();
  const labels = dataset.daily.map(function (item) { return item.date; });
  const values = dataset.daily.map(function (item) { return item.erc20TransferCount; });

  return {
    ...base,
    xAxis: {
      ...base.xAxis,
      data: labels,
      name: t("axis_date")
    },
    yAxis: {
      ...base.yAxis,
      name: t("axis_transfer_count"),
      axisLabel: {
        ...base.yAxis.axisLabel,
        formatter: function (value) {
          return formatKAxis(value);
        }
      }
    },
    series: [{
      name: t("series_erc20"),
      type: "bar",
      barMaxWidth: 12,
      data: values,
      itemStyle: {
        color: "#26c6da",
        borderRadius: [4, 4, 0, 0]
      }
    }]
  };
}

/** 构建巨鲸净流入柱状图配置，正负值用于区分方向。 */
function buildWhaleOption(dataset) {
  const base = buildBaseChartOption();
  const labels = dataset.daily.map(function (item) { return item.date; });
  const values = dataset.daily.map(function (item) { return item.whaleNetflowEth; });

  return {
    ...base,
    xAxis: {
      ...base.xAxis,
      data: labels,
      name: t("axis_date")
    },
    yAxis: {
      ...base.yAxis,
      name: t("axis_eth")
    },
    series: [{
      name: t("series_whale"),
      type: "bar",
      barMaxWidth: 10,
      data: values,
      itemStyle: {
        color: function (params) {
          return params.value >= 0 ? "#4dd985" : "#ff8b8b";
        },
        borderRadius: [4, 4, 4, 4]
      }
    }]
  };
}

/** 构建交易金额分布柱状图配置。 */
function buildDistributionOption(dataset) {
  const base = buildBaseChartOption();
  const labels = dataset.amountDistribution.map(function (item) { return item.bucket; });
  const values = dataset.amountDistribution.map(function (item) { return item.transactionCount; });

  return {
    ...base,
    xAxis: {
      ...base.xAxis,
      data: labels,
      name: t("axis_bucket")
    },
    yAxis: {
      ...base.yAxis,
      name: t("axis_transfer_count"),
      axisLabel: {
        ...base.yAxis.axisLabel,
        formatter: function (value) {
          return formatKAxis(value);
        }
      }
    },
    series: [{
      name: t("series_distribution"),
      type: "bar",
      barMaxWidth: 24,
      data: values,
      itemStyle: {
        color: "#a5d6a7",
        borderRadius: [4, 4, 0, 0]
      }
    }]
  };
}

/** 构建交易金额分布占比饼图配置。 */
function buildDistributionPieOption(dataset) {
  const pieData = dataset.amountDistribution.map(function (item) {
    return {
      name: item.bucket + " ETH",
      value: item.transactionCount
    };
  });

  return {
    textStyle: { color: "#d8e4ef", fontFamily: "IBM Plex Sans, Noto Sans SC, sans-serif" },
    animation: false,
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(11, 16, 21, 0.95)",
      borderColor: "#2c3f54",
      borderWidth: 1,
      textStyle: { color: "#d8e4ef" },
      formatter: "{b}<br/>{c} ({d}%)"
    },
    legend: {
      bottom: 4,
      textStyle: { color: "#9cb0c4", fontSize: 11 }
    },
    series: [{
      name: t("chart_distribution_ratio_title"),
      type: "pie",
      radius: ["40%", "70%"],
      center: ["50%", "45%"],
      minAngle: 2,
      label: { color: "#d8e4ef", formatter: "{d}%" },
      labelLine: { lineStyle: { color: "#9cb0c4" } },
      data: pieData
    }]
  };
}

/** 构建巨鲸流入流出占比饼图配置。 */
function buildWhaleFlowPieOption(dataset) {
  const totalInflow = dataset.whaleRanking.reduce(function (sum, item) {
    return sum + Math.max(0, item.inflowEth);
  }, 0);
  const totalOutflow = dataset.whaleRanking.reduce(function (sum, item) {
    return sum + Math.max(0, item.outflowEth);
  }, 0);

  return {
    textStyle: { color: "#d8e4ef", fontFamily: "IBM Plex Sans, Noto Sans SC, sans-serif" },
    animation: false,
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(11, 16, 21, 0.95)",
      borderColor: "#2c3f54",
      borderWidth: 1,
      textStyle: { color: "#d8e4ef" },
      formatter: "{b}<br/>{c} ETH ({d}%)"
    },
    legend: {
      bottom: 4,
      textStyle: { color: "#9cb0c4", fontSize: 11 }
    },
    series: [{
      name: t("chart_whale_flow_ratio_title"),
      type: "pie",
      radius: ["42%", "72%"],
      center: ["50%", "45%"],
      label: { color: "#d8e4ef", formatter: "{d}%" },
      labelLine: { lineStyle: { color: "#9cb0c4" } },
      data: [
        { name: t("pie_inflow"), value: Number(totalInflow.toFixed(2)), itemStyle: { color: "#4dd985" } },
        { name: t("pie_outflow"), value: Number(totalOutflow.toFixed(2)), itemStyle: { color: "#ff8b8b" } }
      ]
    }]
  };
}

/** 初始化所有 ECharts 实例。 */
function initCharts() {
  chartInstances.activeAddresses = echarts.init(document.getElementById("chartActiveAddresses"));
  chartInstances.gasTrend = echarts.init(document.getElementById("chartGasTrend"));
  chartInstances.erc20Transfers = echarts.init(document.getElementById("chartErc20Transfers"));
  chartInstances.whaleNetflow = echarts.init(document.getElementById("chartWhaleNetflow"));
  chartInstances.amountDistribution = echarts.init(document.getElementById("chartAmountDistribution"));
  chartInstances.distributionPie = echarts.init(document.getElementById("chartDistributionPie"));
  chartInstances.whaleFlowPie = echarts.init(document.getElementById("chartWhaleFlowPie"));
}

/** 将当前数据集同步渲染到所有图表。 */
function renderCharts(dataset) {
  chartInstances.activeAddresses.setOption(buildActiveAddressOption(dataset), true);
  chartInstances.gasTrend.setOption(buildGasTrendOption(dataset), true);
  chartInstances.erc20Transfers.setOption(buildErc20Option(dataset), true);
  chartInstances.whaleNetflow.setOption(buildWhaleOption(dataset), true);
  chartInstances.amountDistribution.setOption(buildDistributionOption(dataset), true);
  chartInstances.distributionPie.setOption(buildDistributionPieOption(dataset), true);
  chartInstances.whaleFlowPie.setOption(buildWhaleFlowPieOption(dataset), true);
}

/** 更新页面右上角数据来源标签。 */
function renderDataSourceBadge(source) {
  const badge = document.getElementById("dataSourceBadge");
  badge.classList.remove("csv");
  badge.classList.remove("mock");

  if (source === "csv") {
    badge.classList.add("csv");
    badge.textContent = t("badge_csv");
  } else {
    badge.classList.add("mock");
    badge.textContent = t("badge_mock");
  }
}

/** 更新头部的最后更新时间与回退提示信息。 */
function renderHeaderMeta() {
  const metaNode = document.getElementById("lastUpdatedText");
  const sourceText = appState.dataSource === "csv" ? t("source_csv") : t("source_mock");
  const header = tFormat("header_last_updated", {
    time: formatLocalTime(appState.lastUpdated || new Date().toISOString()),
    source: sourceText
  });

  if (appState.lastError) {
    metaNode.textContent = header + " | " + tFormat("header_error", { message: appState.lastError });
  } else if (appState.dataSource === "mock") {
    metaNode.textContent = header + " | " + t("header_fallback");
  } else {
    metaNode.textContent = header;
  }
}

/** 更新侧边栏离线文件路径提示。 */
function renderDatasetFileHints() {
  document.getElementById("datasetPathSummary").textContent = buildCsvFileHint(APP_CONFIG.csvFiles.meta);
  document.getElementById("dailyFileHint").textContent = buildCsvFileHint(APP_CONFIG.csvFiles.daily);
  document.getElementById("distributionFileHint").textContent = buildCsvFileHint(APP_CONFIG.csvFiles.distribution);
  document.getElementById("whaleFileHint").textContent = buildCsvFileHint(APP_CONFIG.csvFiles.whale);
}

/** 统一控制刷新按钮状态，避免重复加载。 */
function setRefreshLoadingState(isLoading, loadingTextKey) {
  const button = document.getElementById("refreshButton");
  button.disabled = isLoading;
  button.textContent = isLoading
    ? t(loadingTextKey || "button_refresh_loading")
    : t("button_refresh");
}

/** 渲染全量页面，包括 KPI、图表和表格。 */
function renderDashboard() {
  if (!appState.dataset) {
    return;
  }
  renderKpiCards(appState.dataset);
  renderWhaleTable(appState.dataset.whaleRanking);
  renderCharts(appState.dataset);
  renderDataSourceBadge(appState.dataSource);
  renderHeaderMeta();
  renderDatasetFileHints();
}

/** 加载并刷新当前窗口期数据。 */
async function reloadDashboardData() {
  setRefreshLoadingState(true, "button_refresh_loading");
  try {
    const result = await loadDashboardDataset();
    appState.dataset = result.dataset;
    appState.dataSource = result.source;
    appState.lastUpdated = appState.dataset.meta.generatedAt || new Date().toISOString();
    appState.lastError = result.error;
    renderDashboard();
  } catch (error) {
    appState.lastError = error && error.message ? error.message : "Unknown error";
    if (appState.dataset) {
      renderHeaderMeta();
      renderDataSourceBadge(appState.dataSource || "csv");
      renderDatasetFileHints();
    } else {
      const metaNode = document.getElementById("lastUpdatedText");
      metaNode.textContent = tFormat("header_error", { message: appState.lastError });
      renderDataSourceBadge("csv");
      renderDatasetFileHints();
    }
  } finally {
    setRefreshLoadingState(false);
  }
}

/** 一键刷新：先拉取主网最新 CSV，再重载当前页面数据。 */
async function refreshCsvFromMainnetAndReload() {
  setRefreshLoadingState(true, "button_refresh_fetching");
  try {
    const refreshResult = await triggerOfflineCsvRefresh();
    const generatedAtByWindow = refreshResult && refreshResult.generatedAtByWindow
      ? refreshResult.generatedAtByWindow
      : {};
    const windowKey = String(appState.rangeDays);
    const generatedAt = generatedAtByWindow[windowKey] || new Date().toISOString();
    appState.lastError = "";
    await reloadDashboardData();
    showToast(
      tFormat("toast_refresh_success", {
        days: appState.rangeDays,
        time: formatLocalTime(generatedAt)
      }),
      "success"
    );
  } catch (error) {
    appState.lastError = error && error.message ? error.message : "Unknown error";
    showToast(
      tFormat("toast_refresh_failed", { message: appState.lastError }),
      "error"
    );
    if (appState.dataset) {
      renderHeaderMeta();
      renderDataSourceBadge(appState.dataSource || "csv");
      renderDatasetFileHints();
    } else {
      const metaNode = document.getElementById("lastUpdatedText");
      metaNode.textContent = tFormat("header_error", { message: appState.lastError });
      renderDataSourceBadge("csv");
      renderDatasetFileHints();
    }
  } finally {
    setRefreshLoadingState(false);
  }
}

/** 切换语言后同步刷新静态文案与动态内容。 */
function switchLanguage(language) {
  appState.language = language;
  applyStaticTranslations();
  updateNetworkOptions();
  renderDatasetFileHints();
  if (appState.dataset) {
    renderDashboard();
  }
}

/** 绑定用户交互事件，包括时间窗口、语言和刷新动作。 */
function bindEvents() {
  const timeRangeSelect = document.getElementById("timeRangeSelect");
  const languageSelect = document.getElementById("languageSelect");
  const networkSelect = document.getElementById("networkSelect");
  const refreshButton = document.getElementById("refreshButton");

  timeRangeSelect.addEventListener("change", function () {
    appState.rangeDays = normalizeNumber(timeRangeSelect.value, APP_CONFIG.defaultDays);
    reloadDashboardData();
  });

  languageSelect.addEventListener("change", function () {
    switchLanguage(languageSelect.value === "en" ? "en" : "zh");
  });

  networkSelect.addEventListener("change", function () {
    appState.network = networkSelect.value;
    reloadDashboardData();
  });

  refreshButton.addEventListener("click", function () {
    refreshCsvFromMainnetAndReload();
  });

  window.addEventListener("resize", function () {
    Object.keys(chartInstances).forEach(function (key) {
      if (chartInstances[key]) {
        chartInstances[key].resize();
      }
    });
  });
}

/** 初始化页面控件默认值。 */
function initControls() {
  document.getElementById("languageSelect").value = appState.language;
  document.getElementById("timeRangeSelect").value = String(appState.rangeDays);
  document.getElementById("networkSelect").value = appState.network;
}

/** 应用启动入口：初始化控件、图表、事件并加载首屏数据。 */
async function initApp() {
  initControls();
  applyStaticTranslations();
  updateNetworkOptions();
  renderDatasetFileHints();
  initCharts();
  bindEvents();
  await reloadDashboardData();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", function () {
    initApp();
  });
} else {
  initApp();
}
