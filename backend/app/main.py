"""Clever Gateway — FastAPI application entry point.

Wires together the lifespan (DB/Redis/process pool setup), middleware
(request-id, logging, CORS), and routers (OpenAI v1 + admin + metrics).
Rate limiting is enforced per-key via the ``enforce_rate_limit`` dependency
on individual endpoints, not as a global middleware.
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.admin import router as admin_router
from app.api.metrics import router as metrics_router
from app.api.v1 import router as v1_router
from app.api.v1.health import router as health_router
from app.config import get_settings
from app.core.concurrency import shutdown_process_pool
from app.core.pooling import close_http_clients, close_redis
from app.db.session import dispose_engine
from app.middleware.logging import LoggingMiddleware
from app.middleware.request_id import RequestIDMiddleware
from app.observability.logging import get_logger, setup_logging
from app.providers.registry import register_default_adapters

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown hooks."""
    setup_logging()
    settings = get_settings()
    logger.info(
        "startup",
        env=settings.CG_ENV,
        port=settings.CG_HTTP_PORT,
    )

    register_default_adapters()
    logger.info("startup.adapters_registered")

    try:
        from app.db.session import db_context
        from app.services.users import ensure_admin_seed

        async with db_context() as session:
            await ensure_admin_seed(session)
        logger.info("startup.admin_seed_done")
    except Exception as exc:
        logger.warning("startup.admin_seed_skipped", error=str(exc))

    yield

    logger.info("shutdown.begin")
    await close_redis()
    await close_http_clients()
    await dispose_engine()
    await shutdown_process_pool()
    logger.info("shutdown.complete")


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    settings = get_settings()
    app = FastAPI(
        title="Clever Gateway",
        description="Pure middleware for load balancing and routing AI APIs.",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/docs" if not settings.is_production else None,
        redoc_url="/redoc" if not settings.is_production else None,
    )

    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(LoggingMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CG_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health_router)
    app.include_router(metrics_router)
    app.include_router(v1_router)
    app.include_router(admin_router)

    @app.exception_handler(Exception)
    async def unhandled_exception_handler(request: Request, exc: Exception):
        logger.error(
            "unhandled_exception",
            path=request.url.path,
            error=str(exc),
            error_type=type(exc).__name__,
        )
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "message": "Internal server error",
                    "type": "internal_error",
                }
            },
        )

    return app


app = create_app()


__all__ = ["app", "create_app", "lifespan"]
