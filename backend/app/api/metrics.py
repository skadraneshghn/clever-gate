"""Prometheus metrics endpoint — ``GET /metrics``.

Exposes all metrics registered via ``prometheus_client`` in the standard
text exposition format. This replaces the broken
``prometheus-fastapi-instrumentator`` auto-exposure (which failed due to a
Starlette/FastAPI compatibility issue with ``_IncludedRouter.path``).
"""

from __future__ import annotations

from fastapi import APIRouter, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest

router = APIRouter()


@router.get("/metrics", include_in_schema=False)
async def metrics() -> Response:
    """Return Prometheus-format metrics for scraping."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


__all__ = ["router"]
