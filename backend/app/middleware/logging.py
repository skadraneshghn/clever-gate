"""Request/response logging middleware."""
from __future__ import annotations

import time
from typing import TYPE_CHECKING

from starlette.middleware.base import BaseHTTPMiddleware

from app.middleware.request_id import request_id_var
from app.observability.logging import get_logger

if TYPE_CHECKING:
    from starlette.requests import Request

logger = get_logger(__name__)


class LoggingMiddleware(BaseHTTPMiddleware):
    """Log every HTTP request with method, path, status, latency, and request id."""

    async def dispatch(self, request: Request, call_next):
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            latency_ms = (time.perf_counter() - start) * 1000
            logger.error(
                "request.error",
                method=request.method,
                path=request.url.path,
                status=500,
                latency_ms=round(latency_ms, 2),
                request_id=request_id_var.get(),
            )
            raise

        latency_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "request.completed",
            method=request.method,
            path=request.url.path,
            status=response.status_code,
            latency_ms=round(latency_ms, 2),
            request_id=request_id_var.get(),
        )
        return response
