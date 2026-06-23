"""Admin system log endpoints — query, filter, semantic search, and export."""

from __future__ import annotations

import asyncio
import urllib.parse
from datetime import datetime, timezone

import orjson
from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import paginated
from app.auth.dependencies import get_current_admin_user
from app.db.models.system_log import SystemLog
from app.db.models.user import User
from app.db.session import db_context, get_db
from app.observability.embedding import embed_text
from app.observability.logging import get_logger
from app.schemas.admin import SystemLogResponse

logger = get_logger(__name__)
router = APIRouter()

_VALID_LEVELS = {"DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"}
_EXPORT_BATCH = 500


@router.get("/logs", response_model=None)
async def list_logs(
    level: str | None = Query(None),
    logger_name: str | None = Query(None),
    start_time: datetime | None = Query(None),
    end_time: datetime | None = Query(None),
    search: str | None = Query(None),
    request_id: str | None = Query(None),
    user_id: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """Query system logs with relational filters."""
    stmt = select(SystemLog)
    count_stmt = select(func.count()).select_from(SystemLog)

    if level and level.upper() in _VALID_LEVELS:
        stmt = stmt.where(SystemLog.level == level.upper())
        count_stmt = count_stmt.where(SystemLog.level == level.upper())

    if logger_name:
        stmt = stmt.where(SystemLog.logger_name.ilike(f"%{logger_name}%"))
        count_stmt = count_stmt.where(SystemLog.logger_name.ilike(f"%{logger_name}%"))

    if start_time:
        stmt = stmt.where(SystemLog.timestamp >= start_time)
        count_stmt = count_stmt.where(SystemLog.timestamp >= start_time)

    if end_time:
        stmt = stmt.where(SystemLog.timestamp <= end_time)
        count_stmt = count_stmt.where(SystemLog.timestamp <= end_time)

    if search:
        stmt = stmt.where(SystemLog.message.ilike(f"%{search}%"))
        count_stmt = count_stmt.where(SystemLog.message.ilike(f"%{search}%"))

    if request_id:
        stmt = stmt.where(SystemLog.context["request_id"].astext == request_id)
        count_stmt = count_stmt.where(
            SystemLog.context["request_id"].astext == request_id
        )

    if user_id:
        stmt = stmt.where(SystemLog.context["user_id"].astext == user_id)
        count_stmt = count_stmt.where(SystemLog.context["user_id"].astext == user_id)

    total = await db.scalar(count_stmt)
    offset = (page - 1) * page_size
    result = await db.execute(
        stmt.order_by(desc(SystemLog.timestamp)).offset(offset).limit(page_size)
    )
    items = result.scalars().all()

    return paginated(
        [SystemLogResponse.model_validate(log).model_dump() for log in items],
        int(total or 0),
        page,
        page_size,
    )


@router.get("/logs/search", response_model=None)
async def semantic_search_logs(
    q: str = Query(..., min_length=2),
    level: str | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """Semantic similarity search over log messages using pgvector.

    Falls back to text search if the pgvector extension or embedding column
    is not available.
    """
    has_emb = await _has_embedding_column(db)

    if has_emb:
        try:
            loop = asyncio.get_running_loop()
            query_vec = await loop.run_in_executor(None, embed_text, q)
            emb_str = "[" + ",".join(str(v) for v in query_vec) + "]"

            sql = (
                "SELECT id, timestamp, level, logger_name, message, context "
                "FROM system_logs WHERE embedding IS NOT NULL"
            )
            params: dict = {"emb": emb_str, "limit": limit}
            if level and level.upper() in _VALID_LEVELS:
                sql += " AND level = :lvl"
                params["lvl"] = level.upper()
            sql += " ORDER BY embedding <=> :emb::vector LIMIT :limit"

            result = await db.execute(text(sql), params)
            rows = result.mappings().all()
            items = [
                {
                    "id": str(r["id"]),
                    "timestamp": r["timestamp"].isoformat() if r["timestamp"] else "",
                    "level": r["level"],
                    "logger_name": r["logger_name"],
                    "message": r["message"],
                    "context": r["context"] or {},
                }
                for r in rows
            ]
            return {"items": items, "query": q, "mode": "semantic"}
        except Exception as exc:
            logger.warning("logs.semantic_search_failed", error=str(exc))

    # Fallback: text search
    stmt = select(SystemLog).where(SystemLog.message.ilike(f"%{q}%"))
    if level and level.upper() in _VALID_LEVELS:
        stmt = stmt.where(SystemLog.level == level.upper())
    result = await db.execute(stmt.order_by(desc(SystemLog.timestamp)).limit(limit))
    items = [SystemLogResponse.model_validate(log).model_dump() for log in result.scalars().all()]
    return {"items": items, "query": q, "mode": "text"}


@router.get("/logs/export")
async def export_logs(
    level: str | None = Query(None),
    logger_name: str | None = Query(None),
    start_time: datetime | None = Query(None),
    end_time: datetime | None = Query(None),
    search: str | None = Query(None),
    _: User = Depends(get_current_admin_user),
):
    """Stream-log export as a downloadable .txt file.

    Uses cursor-based streaming so memory stays flat even for huge exports.
    """
    filename_ts = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    filename = f"clever-gateway-logs-{filename_ts}.txt"

    encoded_filename = urllib.parse.quote(filename)
    content_disposition = (
        f"attachment; filename=\"{filename}\"; filename*=UTF-8''{encoded_filename}"
    )

    async def generate():
        async with db_context() as session:
            offset = 0
            while True:
                stmt = select(SystemLog).order_by(desc(SystemLog.timestamp))
                if level and level.upper() in _VALID_LEVELS:
                    stmt = stmt.where(SystemLog.level == level.upper())
                if logger_name:
                    stmt = stmt.where(SystemLog.logger_name.ilike(f"%{logger_name}%"))
                if start_time:
                    stmt = stmt.where(SystemLog.timestamp >= start_time)
                if end_time:
                    stmt = stmt.where(SystemLog.timestamp <= end_time)
                if search:
                    stmt = stmt.where(SystemLog.message.ilike(f"%{search}%"))

                result = await session.execute(stmt.offset(offset).limit(_EXPORT_BATCH))
                rows = result.scalars().all()
                if not rows:
                    break

                for row in rows:
                    line = _format_log_line(row)
                    yield line + "\n"

                offset += _EXPORT_BATCH
                await asyncio.sleep(0)

    return StreamingResponse(
        generate(),
        media_type="text/plain",
        headers={"Content-Disposition": content_disposition},
    )


async def _has_embedding_column(db: AsyncSession) -> bool:
    """Check whether the embedding column exists on system_logs."""
    result = await db.execute(
        text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'system_logs' AND column_name = 'embedding'"
        )
    )
    return result.scalar() is not None


def _format_log_line(log: SystemLog) -> str:
    """Format a log row as a human-readable text line."""
    ts = log.timestamp.strftime("%Y-%m-%d %H:%M:%S.%f")[:-3]
    ctx_str = orjson.dumps(log.context).decode() if log.context else ""
    return f"[{ts}] {log.level:8s} {log.logger_name:30s} | {log.message}  {ctx_str}"


__all__ = ["router"]
