#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_PORT="${OFFLINE_API_PORT:-5001}"
WEB_PORT="${DASHBOARD_PORT:-8080}"

echo "[INFO] 启动看板服务..."
echo "[INFO] Web: http://127.0.0.1:${WEB_PORT}"
echo "[INFO] Refresh API: http://127.0.0.1:${API_PORT}/api/v1/offline/refresh-csv"
echo "[INFO] 点击页面“重新加载 CSV”将自动拉取主网最新 CSV 并覆盖本地文件"

cd "$ROOT_DIR"
python3 backend/offline_refresh_server.py &
API_PID=$!
sleep 0.6
if ! kill -0 "$API_PID" >/dev/null 2>&1; then
  echo "[ERROR] 刷新 API 启动失败，请检查端口 ${API_PORT} 是否被占用。"
  exit 1
fi

cleanup() {
  if kill -0 "$API_PID" >/dev/null 2>&1; then
    kill "$API_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT INT TERM
python3 -m http.server "$WEB_PORT"
