"""Health check endpoints — ``/health``, ``/health/live``, ``/health/ready``."""

from __future__ import annotations

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.core.pooling import get_redis
from app.db.session import get_engine
from app.providers.router_builder import get_router_builder

router = APIRouter(prefix="/health", tags=["health"])


@router.get("")
@router.get("/")
@router.get("/live")
async def live() -> dict[str, str]:
    """Liveness probe — the process is up and accepting requests."""
    return {"status": "ok"}


@router.get("/ready")
async def ready() -> JSONResponse:
    """Readiness probe — checks DB, Redis, and router availability."""
    checks: dict[str, str] = {}
    healthy = True

    try:
        engine = get_engine()
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"
        healthy = False

    try:
        redis = await get_redis()
        await redis.ping()
        checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "error"
        healthy = False

    router_builder = get_router_builder()
    if router_builder.router is not None:
        checks["router"] = "ok"
    else:
        checks["router"] = "not_configured"

    code = status.HTTP_200_OK if healthy else status.HTTP_503_SERVICE_UNAVAILABLE
    return JSONResponse(
        status_code=code,
        content={"status": "ok" if healthy else "degraded", "checks": checks},
    )


__all__ = ["router"]
