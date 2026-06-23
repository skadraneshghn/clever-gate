"""Background consumer: Redis Stream → embedding → PostgreSQL bulk insert.

Runs as an asyncio task in the application lifespan.  Reads log events from
the Redis Stream in batches, generates vector embeddings via the
ProcessPool, and performs bulk inserts into the ``system_logs`` table.
"""

from __future__ import annotations

import asyncio
import orjson
from datetime import datetime, timezone

from app.core.pooling import get_redis
from app.db.models.system_log import SystemLog
from app.db.session import db_context
from app.observability.embedding import embed_text
from app.observability.logging import get_logger

logger = get_logger(__name__)

_STREAM_KEY = "cg:logs:stream"
_CONSUMER_GROUP = "cg-log-consumer"
_CONSUMER_NAME = "cg-log-consumer-1"
_BATCH_SIZE = 100
_POLL_TIMEOUT = 5_000  # milliseconds
_BULK_INSERT_SIZE = 100

_started = False


async def _ensure_consumer_group(redis: any) -> None:
    """Create the consumer group if it doesn't exist."""
    try:
        await redis.xgroup_create(_STREAM_KEY, _CONSUMER_GROUP, id="0", mkstream=True)
    except Exception as exc:
        if "BUSYGROUP" not in str(exc):
            raise


async def _consumer_loop() -> None:
    """Main consumer loop: read → embed → insert → ack."""
    redis = await get_redis()
    await _ensure_consumer_group(redis)

    buffer: list[dict] = []

    while True:
        try:
            response = await redis.xreadgroup(
                _CONSUMER_GROUP,
                _CONSUMER_NAME,
                {_STREAM_KEY: ">"},
                count=_BATCH_SIZE,
                block=_POLL_TIMEOUT,
            )

            if not response:
                if buffer:
                    await _flush_buffer(buffer)
                    buffer.clear()
                continue

            for _stream, messages in response:
                for msg_id, fields in messages:
                    raw = fields.get("data")
                    if not raw:
                        continue
                    try:
                        event = orjson.loads(raw)
                        buffer.append(event)
                    except Exception:
                        pass

            if len(buffer) >= _BULK_INSERT_SIZE:
                await _flush_buffer(buffer)
                buffer.clear()

        except asyncio.CancelledError:
            if buffer:
                await _flush_buffer(buffer)
            raise
        except Exception as exc:
            logger.warning("log_consumer.error", error=str(exc))
            await asyncio.sleep(2)


async def _flush_buffer(events: list[dict]) -> None:
    """Generate embeddings and bulk-insert a batch of log events."""
    if not events:
        return

    texts = [f"{e.get('message', '')} {e.get('logger_name', '')}" for e in events]

    try:
        loop = asyncio.get_running_loop()
        embeddings = await loop.run_in_executor(None, _embed_batch, texts)
    except Exception as exc:
        logger.warning("log_consumer.embedding_failed", error=str(exc))
        embeddings = [None] * len(events)

    rows = []
    for event, emb in zip(events, embeddings, strict=False):
        try:
            ts_str = event.get("timestamp")
            if isinstance(ts_str, str):
                timestamp = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            else:
                timestamp = datetime.now(timezone.utc)
        except Exception:
            timestamp = datetime.now(timezone.utc)

        rows.append(
            SystemLog(
                timestamp=timestamp,
                level=event.get("level", "INFO"),
                logger_name=event.get("logger_name", "unknown"),
                message=event.get("message", ""),
                context=event.get("context", {}),
                embedding=emb,
            )
        )

    try:
        async with db_context() as session:
            session.add_all(rows)
            await session.commit()
    except Exception as exc:
        logger.warning("log_consumer.insert_failed", error=str(exc), count=len(rows))


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
