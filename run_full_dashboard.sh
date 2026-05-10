#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_PORT="${OFFLINE_API_PORT:-5001}"
RPC_PORT="${RPC_API_PORT:-5000}"
WEB_PORT="${DASHBOARD_PORT:-8080}"

echo "[INFO] 启动看板服务..."
echo "[INFO] Web:         http://127.0.0.1:${WEB_PORT}/dashboard/"
echo "[INFO] 离线刷新 API: http://127.0.0.1:${API_PORT}/api/v1/offline/refresh-csv"
echo "[INFO] 实时 RPC API: http://127.0.0.1:${RPC_PORT}/api/v1/dashboard/summary"

cd "$ROOT_DIR"

# 启动离线刷新 + Etherscan 快照服务（端口 5001）
ETHERSCAN_API_KEY="${ETHERSCAN_API_KEY:-}" python3 backend/offline_refresh_server.py &
OFFLINE_PID=$!
sleep 0.6
if ! kill -0 "$OFFLINE_PID" >/dev/null 2>&1; then
  echo "[ERROR] 离线刷新 API 启动失败，请检查端口 ${API_PORT} 是否被占用。"
  exit 1
fi

# 启动 Flask 实时 RPC 服务（端口 5000，需要 ETH_RPC_URL）
RPC_PID=""
if [ -n "${ETH_RPC_URL:-}" ]; then
  ETH_RPC_URL="${ETH_RPC_URL}" python3 backend/app.py &
  RPC_PID=$!
  sleep 1.2
  if ! kill -0 "$RPC_PID" >/dev/null 2>&1; then
    echo "[WARN] 实时 RPC 服务启动失败，侧栏"实时 API"模式将不可用。"
    RPC_PID=""
  else
    echo "[INFO] 实时 RPC 服务已启动（port ${RPC_PORT}）"
  fi
else
  echo "[WARN] ETH_RPC_URL 未设置，实时 API（全量）模式不可用。仅 Gas 快照可用。"
fi

cleanup() {
  if kill -0 "$OFFLINE_PID" >/dev/null 2>&1; then
    kill "$OFFLINE_PID" >/dev/null 2>&1 || true
  fi
  if [ -n "$RPC_PID" ] && kill -0 "$RPC_PID" >/dev/null 2>&1; then
    kill "$RPC_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM
python3 -m http.server "$WEB_PORT"
