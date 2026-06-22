"""Admin dashboard, monitoring, cache, and settings endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import paginated
from app.auth.dependencies import get_current_admin_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.admin import DashboardMetrics
from app.services import cache as cache_service
from app.services import spend as spend_service

router = APIRouter()


@router.get("/dashboard/metrics", response_model=DashboardMetrics)
async def dashboard_metrics(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> DashboardMetrics:
    """Return aggregate real-time metrics for the dashboard."""
    data = await spend_service.dashboard_metrics(db)
    return DashboardMetrics(**data)


@router.get("/request-logs", response_model=None)
async def list_request_logs(
    page: int = 1,
    page_size: int = 50,
    api_key_id: uuid.UUID | None = None,
    model: str | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    items, total = await spend_service.list_request_logs(
        db,
        page=page,
        page_size=page_size,
        api_key_id=api_key_id,
        model=model,
    )
    serialized = [
        {
            "id": str(log.id),
            "request_id": str(log.request_id),
            "api_key_id": str(log.api_key_id) if log.api_key_id else None,
            "user_id": str(log.user_id) if log.user_id else None,
            "model": log.model,
            "deployment_id": str(log.deployment_id) if log.deployment_id else None,
            "provider_id": str(log.provider_id) if log.provider_id else None,
            "is_stream": log.is_stream,
            "prompt_tokens": log.prompt_tokens,
            "completion_tokens": log.completion_tokens,
            "total_tokens": log.total_tokens,
            "cost_usd": float(log.cost_usd) if log.cost_usd else None,
            "latency_ms": log.latency_ms,
            "status_code": log.status_code,
            "error_class": log.error_class,
            "cache_hit": log.cache_hit,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in items
    ]
    return paginated(serialized, total, page, page_size)


@router.get("/spend", response_model=None)
async def list_spend(
    page: int = 1,
    page_size: int = 50,
    user_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    items, total = await spend_service.list_spend_records(
        db, page=page, page_size=page_size, user_id=user_id
    )
    serialized = [
        {
            "id": str(s.id),
            "request_log_id": str(s.request_log_id),
            "user_id": str(s.user_id) if s.user_id else None,
            "team_id": str(s.team_id) if s.team_id else None,
            "provider_id": str(s.provider_id) if s.provider_id else None,
            "model": s.model,
            "prompt_tokens": s.prompt_tokens,
            "completion_tokens": s.completion_tokens,
            "cost_usd": float(s.cost_usd) if s.cost_usd else None,
            "created_at": s.created_at.isoformat() if s.created_at else None,
        }
        for s in items
    ]
    return paginated(serialized, total, page, page_size)


@router.get("/provider-health")
async def provider_health(
    _: User = Depends(get_current_admin_user),
):
    """Return live provider health from the circuit breaker state."""
    from app.routing.breaker import get_state
    from app.providers.router_builder import get_router_builder

    router_builder = get_router_builder()
    router = router_builder.router
    if router is None:
        return {"providers": []}

    health: list[dict] = []
    model_list = router.get_model_list() or []
    seen: set[str] = set()
    for entry in model_list:
        info = entry.get("model_info") or {}
        deployment_id = str(info.get("id", ""))
        if not deployment_id or deployment_id in seen:
            continue
        seen.add(deployment_id)
        state = await get_state(deployment_id)
        health.append(
            {
                "deployment_id": deployment_id,
                "model_name": entry.get("model_name"),
                **state,
            }
        )
    return {"providers": health}


@router.post("/cache/invalidate")
async def invalidate_cache(
    model: str | None = None,
    _: User = Depends(get_current_admin_user),
):
    """Invalidate cache entries — all, or for a specific model."""
    if model:
        count = await cache_service.invalidate_model(model)
    else:
        count = await cache_service.invalidate_all()
    return {"invalidated": count}


@router.get("/cache/stats")
async def cache_stats(
    _: User = Depends(get_current_admin_user),
):
    """Return cache statistics."""
    return await cache_service.stats()


@router.get("/settings")
async def get_settings_endpoint(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """Return all global settings."""
    from sqlalchemy import select
    from app.db.models.tracking import Setting

    result = await db.execute(select(Setting).order_by(Setting.key))
    settings = result.scalars().all()
    return {
        "settings": [
            {
                "key": s.key,
                "value": s.value,
                "description": s.description,
            }
            for s in settings
        ]
    }


@router.patch("/settings")
async def update_settings(
    updates: dict,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """Update global settings (key-value pairs)."""
    from app.db.models.tracking import Setting

    for key, value in updates.items():
        result = await db.execute(select(Setting).where(Setting.key == key))
        setting = result.scalar_one_or_none()
        if setting is None:
            setting = Setting(key=key, value=value)
            db.add(setting)
        else:
            setting.value = value
    await db.commit()
    return {"ok": True}


__all__ = ["router"]
