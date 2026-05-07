"""毕业设计看板后端 API。"""

from __future__ import annotations

import os
from pathlib import Path

from flask import Flask, jsonify, request

from mainnet_service import EthereumMainnetService


def create_app() -> Flask:
    """创建 Flask 应用并初始化以太坊数据服务。"""

    app = Flask(__name__)

    rpc_url = os.getenv("ETH_RPC_URL", "").strip()
    cache_ttl = int(os.getenv("CACHE_TTL_SECONDS", "900"))
    cache_dir = Path(__file__).resolve().parent / "cache"

    service = None
    service_error = ""

    try:
        service = EthereumMainnetService(
            rpc_url=rpc_url,
            cache_dir=cache_dir,
            cache_ttl_seconds=cache_ttl,
        )
    except Exception as error:  # noqa: BLE001
        service_error = str(error)

    @app.after_request
    def add_cors_headers(response):
        """添加 CORS 头，允许静态页面跨端口调用 API。"""

        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type"
        return response

    @app.route("/api/v1/health", methods=["GET"])
    def health_check():
        """返回后端健康状态与 RPC 连接状态。"""

        if service is None:
            return jsonify({"status": "error", "message": service_error}), 500
        return jsonify({"status": "ok", "network": "ethereum"}), 200

    @app.route("/api/v1/dashboard/summary", methods=["GET", "OPTIONS"])
    def dashboard_summary():
        """提供前端看板所需的数据聚合接口。"""

        if request.method == "OPTIONS":
            return ("", 204)

        if service is None:
            return jsonify({
                "error": "SERVICE_UNAVAILABLE",
                "message": service_error or "Service initialization failed",
            }), 500

        network = request.args.get("network", "ethereum").strip().lower()
        days_text = request.args.get("days", "30").strip()
        force_refresh = request.args.get("refresh", "0") == "1"

        try:
            days = int(days_text)
        except ValueError:
            return jsonify({"error": "INVALID_DAYS", "message": "days 必须是整数"}), 400

        try:
            payload = service.get_dashboard_summary(days=days, network=network, force_refresh=force_refresh)
            return jsonify(payload), 200
        except ValueError as error:
            return jsonify({"error": "INVALID_PARAM", "message": str(error)}), 400
        except Exception as error:  # noqa: BLE001
            return jsonify({"error": "RPC_FAILURE", "message": str(error)}), 502

    return app


if __name__ == "__main__":
    flask_app = create_app()
    host = os.getenv("API_HOST", "127.0.0.1")
    port = int(os.getenv("API_PORT", "5000"))
    debug_mode = os.getenv("FLASK_DEBUG", "0") == "1"
    flask_app.run(host=host, port=port, debug=debug_mode)
