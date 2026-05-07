"""离线 CSV 刷新 API 服务。

提供接口：
1) GET  /api/v1/offline/health
2) POST /api/v1/offline/refresh-csv
"""

from __future__ import annotations

import csv
import json
import os
import re
import subprocess
import sys
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Dict, List


PROJECT_ROOT = Path(__file__).resolve().parent.parent
BACKEND_DIR = Path(__file__).resolve().parent
EXPORT_SCRIPT = BACKEND_DIR / "export_offline_csv.py"
DATA_ROOT = PROJECT_ROOT / "dashboard" / "data"

RUN_LOCK = threading.Lock()


def read_window_meta(network: str, windows: List[int]) -> Dict[str, str]:
    """读取各窗口 meta.csv 的 generated_at，便于前端展示刷新结果。"""

    result: Dict[str, str] = {}
    for days in windows:
        meta_file = DATA_ROOT / network / str(days) / "meta.csv"
        if not meta_file.exists():
            result[str(days)] = ""
            continue

        try:
            with meta_file.open("r", encoding="utf-8-sig", newline="") as csv_file:
                rows = list(csv.DictReader(csv_file))
            generated_at = rows[0].get("generated_at", "") if rows else ""
            result[str(days)] = generated_at
        except Exception:  # noqa: BLE001
            result[str(days)] = ""

    return result


def summarize_refresh_error(stderr_text: str, stdout_text: str, return_code: int) -> str:
    """将后端脚本失败信息压缩为更易读的提示文本。"""

    raw_message = (stderr_text or stdout_text or "").strip()
    if not raw_message:
        return f"刷新失败（退出码 {return_code}）"

    matched = re.search(r"non-zero exit status\s+(\d+)", raw_message)
    curl_exit_code = matched.group(1) if matched else ""

    if curl_exit_code == "6":
        return "下载失败：无法解析 Etherscan 域名，请检查网络或稍后重试。"
    if curl_exit_code == "16":
        return "下载失败：与 Etherscan 建连不稳定（curl exit 16），请稍后重试。"
    if curl_exit_code:
        return f"下载失败：curl 退出码 {curl_exit_code}，请稍后重试。"

    lines = [line.strip() for line in raw_message.splitlines() if line.strip()]
    if lines:
        return lines[-1][:300]
    return f"刷新失败（退出码 {return_code}）"


class OfflineRefreshHandler(BaseHTTPRequestHandler):
    """处理离线刷新请求与健康检查请求。"""

    server_version = "OfflineRefreshServer/1.0"

    def _set_cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def _send_json(self, payload: dict, status_code: int = 200) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status_code)
        self._set_cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _read_json_body(self) -> dict:
        content_length = int(self.headers.get("Content-Length", "0"))
        if content_length <= 0:
            return {}
        raw = self.rfile.read(content_length).decode("utf-8", errors="ignore")
        if not raw.strip():
            return {}
        return json.loads(raw)

    def do_OPTIONS(self) -> None:  # noqa: N802
        """处理浏览器预检请求。"""

        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        """提供健康检查接口。"""

        if self.path.startswith("/api/v1/offline/health"):
            self._send_json({"status": "ok", "service": "offline_refresh"}, 200)
            return

        self._send_json({"error": "NOT_FOUND", "message": "API route not found"}, 404)

    def do_POST(self) -> None:  # noqa: N802
        """执行离线 CSV 刷新任务。"""

        if not self.path.startswith("/api/v1/offline/refresh-csv"):
            self._send_json({"error": "NOT_FOUND", "message": "API route not found"}, 404)
            return

        if not EXPORT_SCRIPT.exists():
            self._send_json(
                {"error": "SCRIPT_MISSING", "message": f"未找到导出脚本: {EXPORT_SCRIPT}"},
                500,
            )
            return

        try:
            payload = self._read_json_body()
        except json.JSONDecodeError:
            self._send_json({"error": "INVALID_JSON", "message": "请求体不是合法 JSON"}, 400)
            return

        network = str(payload.get("network", "ethereum")).strip().lower()
        windows_payload = payload.get("windows", [7, 30, 90])
        try:
            windows = sorted({int(item) for item in windows_payload})
        except Exception:  # noqa: BLE001
            self._send_json({"error": "INVALID_WINDOWS", "message": "windows 参数必须是整数数组"}, 400)
            return

        if network != "ethereum":
            self._send_json({"error": "INVALID_NETWORK", "message": "当前仅支持 ethereum"}, 400)
            return
        if not windows:
            self._send_json({"error": "INVALID_WINDOWS", "message": "windows 不能为空"}, 400)
            return

        if not RUN_LOCK.acquire(blocking=False):
            self._send_json({"error": "BUSY", "message": "刷新任务正在执行，请稍后重试"}, 409)
            return

        try:
            command = [
                sys.executable,
                str(EXPORT_SCRIPT),
                "--network",
                network,
                "--windows",
                *[str(days) for days in windows],
            ]

            completed = subprocess.run(
                command,
                cwd=str(BACKEND_DIR),
                capture_output=True,
                text=True,
                timeout=600,
                check=False,
            )

            stdout_text = completed.stdout.strip()
            stderr_text = completed.stderr.strip()
            meta_map = read_window_meta(network, windows)

            if completed.returncode != 0:
                message = summarize_refresh_error(stderr_text, stdout_text, completed.returncode)
                self._send_json(
                    {
                        "error": "REFRESH_FAILED",
                        "message": message,
                        "returnCode": completed.returncode,
                    },
                    500,
                )
                return

            self._send_json(
                {
                    "status": "ok",
                    "message": "离线 CSV 已更新",
                    "network": network,
                    "windows": windows,
                    "generatedAtByWindow": meta_map,
                    "logTail": (stdout_text or "")[-800:],
                },
                200,
            )
        except subprocess.TimeoutExpired:
            self._send_json(
                {"error": "TIMEOUT", "message": "刷新超时，请稍后重试"},
                504,
            )
        except Exception as error:  # noqa: BLE001
            self._send_json(
                {"error": "INTERNAL_ERROR", "message": str(error)},
                500,
            )
        finally:
            RUN_LOCK.release()


def main() -> None:
    """启动离线刷新 API。"""

    host = os.getenv("OFFLINE_API_HOST", "127.0.0.1")
    port = int(os.getenv("OFFLINE_API_PORT", "5001"))
    server = ThreadingHTTPServer((host, port), OfflineRefreshHandler)
    print(f"[INFO] Offline refresh API listening on http://{host}:{port}")
    server.serve_forever()


if __name__ == "__main__":
    main()
