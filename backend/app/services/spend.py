"""Spend, request log, and dashboard analytics service."""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.tracking import RequestLog, SpendRecord


async def record_request(
    db: AsyncSession,
    *,
    request_id: uuid.UUID,
    api_key_id: uuid.UUID | None,
    user_id: uuid.UUID | None,
    model: str | None,
    deployment_id: uuid.UUID | None = None,
    provider_id: uuid.UUID | None = None,
    is_stream: bool | None = None,
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
    total_tokens: int | None = None,
    cost_usd: Decimal | None = None,
    latency_ms: int | None = None,
    status_code: int | None = None,
    error_class: str | None = None,
    cache_hit: bool = False,
) -> RequestLog:
    """Persist a request log entry."""
    log = RequestLog(
        request_id=request_id,
        api_key_id=api_key_id,
        user_id=user_id,
        model=model,
        deployment_id=deployment_id,
        provider_id=provider_id,
        is_stream=is_stream,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        cost_usd=cost_usd,
        latency_ms=latency_ms,
        status_code=status_code,
        error_class=error_class,
        cache_hit=cache_hit,
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)
    return log


async def dashboard_metrics(
    db: AsyncSession,
    *,
    since: datetime | None = None,
) -> dict[str, float | int]:
    """Compute aggregate metrics for the dashboard over the given window."""
    if since is None:
        since = datetime.now(timezone.utc) - timedelta(hours=24)

    base = select(RequestLog).where(RequestLog.created_at >= since)

    total_requests = await db.scalar(
        select(func.count()).select_from(base.subquery())
    )
    total_tokens = await db.scalar(
        select(func.coalesce(func.sum(RequestLog.total_tokens), 0))
        .where(RequestLog.created_at >= since)
    )
    total_cost = await db.scalar(
        select(func.coalesce(func.sum(RequestLog.cost_usd), 0))
        .where(RequestLog.created_at >= since)
    )
    cache_hits = await db.scalar(
        select(func.count())
        .select_from(RequestLog)
        .where(RequestLog.created_at >= since, RequestLog.cache_hit.is_(True))
    )
    errors = await db.scalar(
        select(func.count())
        .select_from(RequestLog)
        .where(
            RequestLog.created_at >= since,
            RequestLog.status_code.is_not(None),
            RequestLog.status_code >= 400,
        )
    )
    avg_latency = await db.scalar(
        select(func.coalesce(func.avg(RequestLog.latency_ms), 0))
        .where(RequestLog.created_at >= since)
    )

    total_req = int(total_requests or 0)
    hours = max(1.0, (datetime.now(timezone.utc) - since).total_seconds() / 3600)

    return {
        "total_requests": total_req,
        "total_tokens": int(total_tokens or 0),
        "total_cost_usd": float(total_cost or 0),
        "cache_hit_rate": (int(cache_hits or 0) / total_req) if total_req else 0.0,
        "active_keys": 0,
        "error_rate": (int(errors or 0) / total_req) if total_req else 0.0,
        "rps": total_req / (hours * 3600),
        "avg_latency_ms": float(avg_latency or 0),
    }


async def list_request_logs(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 50,
    api_key_id: uuid.UUID | None = None,
    model: str | None = None,
) -> tuple[list[RequestLog], int]:
    stmt = select(RequestLog)
    count_stmt = select(func.count()).select_from(RequestLog)
    if api_key_id is not None:
        stmt = stmt.where(RequestLog.api_key_id == api_key_id)
        count_stmt = count_stmt.where(RequestLog.api_key_id == api_key_id)
    if model is not None:
        stmt = stmt.where(RequestLog.model == model)
        count_stmt = count_stmt.where(RequestLog.model == model)

    total = await db.scalar(count_stmt)
    offset = (page - 1) * page_size
    result = await db.execute(
        stmt.order_by(RequestLog.created_at.desc()).offset(offset).limit(page_size)
    )
    return list(result.scalars().all()), int(total or 0)


async def list_spend_records(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 50,
    user_id: uuid.UUID | None = None,
) -> tuple[list[SpendRecord], int]:
    stmt = select(SpendRecord)
    count_stmt = select(func.count()).select_from(SpendRecord)
    if user_id is not None:
        stmt = stmt.where(SpendRecord.user_id == user_id)
        count_stmt = count_stmt.where(SpendRecord.user_id == user_id)

    total = await db.scalar(count_stmt)
    offset = (page - 1) * page_size
    result = await db.execute(
        stmt.order_by(SpendRecord.created_at.desc()).offset(offset).limit(page_size)
    )
    return list(result.scalars().all()), int(total or 0)


__all__ = [
    "dashboard_metrics",
    "list_request_logs",
    "list_spend_records",
    "record_request",
]
