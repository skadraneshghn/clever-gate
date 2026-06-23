"""Background consumer: Redis Stream → embedding → PostgreSQL bulk insert.

Reads log events from the Redis Stream in batches, generates vector
embeddings via the executor, and performs bulk inserts into the
``system_logs`` table.

If the pgvector extension is not available, embeddings are silently
skipped — the system still stores and queries logs, just without
semantic search.
"""

from __future__ import annotations

import asyncio
import orjson
import os
import uuid as uuid_mod
from datetime import datetime, timezone

from sqlalchemy import text

from app.core.pooling import get_redis
from app.db.session import db_context
from app.observability.embedding import embed_text

_STREAM_KEY = "cg:logs:stream"
_CONSUMER_GROUP = "cg-log-consumer"
_CONSUMER_NAME = f"cg-log-consumer-{os.getpid()}"
_BATCH_SIZE = 100
# Keep block time short (2 s) so the TCP socket is never idle long enough
# for managed Redis proxies (Clever Cloud, etc.) to drop it.
_POLL_TIMEOUT = 2_000  # milliseconds
_BULK_INSERT_SIZE = 100
_MAX_RECONNECT_BACKOFF = 30  # seconds

_started = False
_has_embedding_col: bool | None = None


async def _check_embedding_column(db: any) -> bool:
    """Check (once) whether the embedding column exists on system_logs."""
    global _has_embedding_col
    if _has_embedding_col is not None:
        return _has_embedding_col
    result = await db.execute(
        text(
            "SELECT 1 FROM information_schema.columns "
            "WHERE table_name = 'system_logs' AND column_name = 'embedding'"
        )
    )
    _has_embedding_col = result.scalar() is not None
    return _has_embedding_col


async def _ensure_consumer_group(redis: any) -> None:
    """Create the consumer group if it doesn't exist."""
    try:
        await redis.xgroup_create(_STREAM_KEY, _CONSUMER_GROUP, id="0", mkstream=True)
    except Exception as exc:
        if "BUSYGROUP" not in str(exc):
            print(f"[log_consumer] xgroup_create error: {exc}", flush=True)


async def _consumer_loop() -> None:
    """Main consumer loop: read → embed → insert → ack.

    Handles Redis connection drops gracefully by resetting the client and
    reconnecting with exponential backoff. This is needed for managed Redis
    addons (Clever Cloud, Heroku, etc.) that terminate idle connections.
    """
    from app.core.pooling import close_redis

    redis = await get_redis()
    await _ensure_consumer_group(redis)

    buffer: list[tuple[str, dict]] = []  # (msg_id, event)
    backoff = 1  # seconds, for reconnect attempts

    while True:
        try:
            response = await redis.xreadgroup(
                _CONSUMER_GROUP,
                _CONSUMER_NAME,
                {_STREAM_KEY: ">"},
                count=_BATCH_SIZE,
                block=_POLL_TIMEOUT,
            )

            backoff = 1  # reset on success

            if not response:
                if buffer:
                    await _flush_buffer(redis, buffer)
                    buffer.clear()
                continue

            for _stream, messages in response:
                for msg_id, fields in messages:
                    raw = fields.get("data")
                    if not raw:
                        continue
                    try:
                        event = orjson.loads(raw)
                        buffer.append((msg_id, event))
                    except Exception:
                        pass

            if len(buffer) >= _BULK_INSERT_SIZE:
                await _flush_buffer(redis, buffer)
                buffer.clear()

        except asyncio.CancelledError:
            if buffer:
                await _flush_buffer(redis, buffer)
            raise
        except (TimeoutError, ConnectionError, OSError) as exc:
            # Network-level connection drop — reset the client and reconnect
            print(
                f"[log_consumer] connection lost ({type(exc).__name__}): {exc} — "
                f"reconnecting in {backoff}s",
                flush=True,
            )
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, _MAX_RECONNECT_BACKOFF)
            try:
                await close_redis()
            except Exception:
                pass
            redis = await get_redis()
            await _ensure_consumer_group(redis)
        except Exception as exc:
            # Use print, not logger, to avoid feedback loop
            print(f"[log_consumer] error: {exc}", flush=True)
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, _MAX_RECONNECT_BACKOFF)


async def _flush_buffer(redis: any, entries: list[tuple[str, dict]]) -> None:
    """Generate embeddings and bulk-insert a batch of log events, then ACK."""
    if not entries:
        return

    msg_ids = [eid for eid, _ in entries]
    events = [evt for _, evt in entries]

    async with db_context() as session:
        use_embedding = await _check_embedding_column(session)

        if use_embedding:
            texts = [
                f"{e.get('message', '')} {e.get('logger_name', '')}" for e in events
            ]
            try:
                loop = asyncio.get_running_loop()
                embeddings = await loop.run_in_executor(None, _embed_batch, texts)
            except Exception as exc:
                print(f"[log_consumer] embedding_failed: {exc}", flush=True)
                embeddings = [None] * len(events)

            for event, emb in zip(events, embeddings, strict=False):
                await _insert_with_embedding(session, event, emb)
        else:
            for event in events:
                await _insert_without_embedding(session, event)

        try:
            await session.commit()
        except Exception as exc:
            print(f"[log_consumer] insert_failed: {exc}", flush=True)
            await session.rollback()
            return

    # ACK all processed messages
    if msg_ids:
        try:
            await redis.xack(_STREAM_KEY, _CONSUMER_GROUP, *msg_ids)
        except Exception:
            pass


async def _insert_with_embedding(
    session: any, event: dict, emb: list[float] | None
) -> None:
    """Insert a single log row with embedding via raw SQL."""
    ts = _parse_timestamp(event)
    log_id = str(uuid_mod.uuid4())
    ctx = orjson.dumps(event.get("context", {})).decode()

    if emb is not None:
        emb_str = "[" + ",".join(str(v) for v in emb) + "]"
        await session.execute(
            text(
                "INSERT INTO system_logs "
                "(id, timestamp, level, logger_name, message, context, embedding) "
                "VALUES (:id, :ts, :lvl, :ln, :msg, CAST(:ctx AS jsonb), CAST(:emb AS vector))"
            ),
            {
                "id": log_id,
                "ts": ts,
                "lvl": event.get("level", "INFO"),
                "ln": event.get("logger_name", "unknown"),
                "msg": event.get("message", ""),
                "ctx": ctx,
                "emb": emb_str,
            },
        )
    else:
        await _insert_without_embedding(session, event)


async def _insert_without_embedding(session: any, event: dict) -> None:
    """Insert a single log row without embedding."""
    ts = _parse_timestamp(event)
    log_id = str(uuid_mod.uuid4())
    ctx = orjson.dumps(event.get("context", {})).decode()

    await session.execute(
        text(
            "INSERT INTO system_logs "
            "(id, timestamp, level, logger_name, message, context) "
            "VALUES (:id, :ts, :lvl, :ln, :msg, CAST(:ctx AS jsonb))"
        ),
        {
            "id": log_id,
            "ts": ts,
            "lvl": event.get("level", "INFO"),
            "ln": event.get("logger_name", "unknown"),
            "msg": event.get("message", ""),
            "ctx": ctx,
        },
    )


def _parse_timestamp(event: dict) -> datetime:
    """Parse the timestamp from a log event."""
    ts_str = event.get("timestamp")
    if isinstance(ts_str, str):
        try:
            return datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
        except Exception:
            pass
    return datetime.now(timezone.utc)


def _embed_batch(texts: list[str]) -> list[list[float] | None]:
    """Embed a batch of texts synchronously (called from executor)."""
    return [embed_text(t) for t in texts]


def start_log_consumer() -> asyncio.Task[None]:
    """Start the background consumer task."""
    global _started
    if _started:
        raise RuntimeError("Log consumer already started")
    _started = True
    return asyncio.create_task(_consumer_loop())


async def stop_log_consumer() -> None:
    """No-op placeholder — the consumer is cancelled via task cancellation."""
    global _started
    _started = False


__all__ = ["start_log_consumer", "stop_log_consumer"]
