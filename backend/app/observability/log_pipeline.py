"""Non-blocking log capture pipeline.

Architecture (3 stages, all non-blocking):
  1. **Capture** — A structlog processor and a stdlib ``logging.Handler``
     push serialised log events into a thread-safe in-memory ``queue.Queue``.
     This is instant (< 1 µs) and never blocks the caller, even from
     third-party threads (LiteLLM, HTTPX).
  2. **Transport** — A background asyncio task drains the queue and pushes
     each event to a Redis Stream (durable) **and** a Redis Pub/Sub channel
     (for real-time WebSocket fan-out).
  3. **Persistence** — A separate background consumer (``log_consumer.py``)
     reads from the Redis Stream, generates vector embeddings via the
     ProcessPool, and bulk-inserts into PostgreSQL.
"""

from __future__ import annotations

import asyncio
import logging
import queue
import threading
from datetime import datetime, timezone
from typing import Any

import orjson

from app.observability.logging import get_logger

logger = get_logger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────── #

_QUEUE_MAXSIZE = 10_000
_REDIS_STREAM_KEY = "cg:logs:stream"
_REDIS_PUBSUB_CHANNEL = "cg:logs:pubsub"
_FLUSH_BATCH_SIZE = 50
_FLUSH_INTERVAL = 0.15  # seconds

# ── Stage 1: in-memory capture queue ──────────────────────────────────────── #

_log_queue: queue.Queue[bytes | None] = queue.Queue(maxsize=_QUEUE_MAXSIZE)
_transport_task: asyncio.Task[None] | None = None
_started = False
_started_lock = threading.Lock()


def _serialise_event(
    level: str,
    logger_name: str,
    message: str,
    context: dict[str, Any],
    timestamp: str | None = None,
) -> bytes:
    """Serialise a log event to compact JSON bytes."""
    return orjson.dumps(
        {
            "timestamp": timestamp or datetime.now(timezone.utc).isoformat(),
            "level": level,
            "logger_name": logger_name,
            "message": message,
            "context": context,
        }
    )


def _enqueue(data: bytes) -> None:
    """Non-blocking enqueue — drops on full queue (never crashes the caller)."""
    try:
        _log_queue.put_nowait(data)
    except queue.Full:
        pass
    except Exception:
        pass


# ── structlog processor ───────────────────────────────────────────────────── #

def capture_processor(
    logger: Any,
    method_name: str,
    event_dict: dict[str, Any],
) -> dict[str, Any]:
    """Structlog processor: serialise and enqueue the event.

    Placed early in the processor chain (before rendering) so the raw
    structured data is captured regardless of the output format.
    """
    try:
        ts = event_dict.get("timestamp")
        if isinstance(ts, str):
            timestamp = ts
        elif isinstance(ts, datetime):
            timestamp = ts.isoformat()
        else:
            timestamp = datetime.now(timezone.utc).isoformat()

        level = str(event_dict.get("level", method_name.upper())).upper()
        logger_name = str(event_dict.get("logger") or method_name)
        message = str(event_dict.get("event", ""))

        context = {
            k: _safe_value(v)
            for k, v in event_dict.items()
            if k not in ("timestamp", "level", "logger", "event")
        }

        _enqueue(_serialise_event(level, logger_name, message, context, timestamp))
    except Exception:
        pass

    return event_dict


def _safe_value(v: Any) -> Any:
    """Make a value JSON-serialisable, falling back to str()."""
    if v is None or isinstance(v, (bool, int, float, str)):
        return v
    if isinstance(v, (list, tuple)):
        return [_safe_value(x) for x in v]
    if isinstance(v, dict):
        return {str(k): _safe_value(val) for k, val in v.items()}
    return str(v)


# ── stdlib logging bridge ─────────────────────────────────────────────────── #

class StdlibBridgeHandler(logging.Handler):
    """Forward stdlib ``logging`` records (LiteLLM, HTTPX, …) into the pipeline."""

    def emit(self, record: logging.LogRecord) -> None:
        try:
            context: dict[str, Any] = {
                "source": "stdlib",
                "module": record.module,
                "line": record.lineno,
                "func": record.funcName,
            }
            if record.exc_info and record.exc_info[1]:
                context["exception"] = str(record.exc_info[1])

            _enqueue(
                _serialise_event(
                    level=record.levelname,
                    logger_name=record.name,
                    message=record.getMessage(),
                    context=context,
                    timestamp=datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
                )
            )
        except Exception:
            pass


# ── Stage 2: async transport (queue → Redis) ─────────────────────────────── #

async def _transport_loop() -> None:
    """Background task: drain the in-memory queue into Redis Stream + Pub/Sub."""
    from app.core.pooling import get_redis

    redis = await get_redis()
    batch: list[bytes] = []

    while True:
        try:
            item = _log_queue.get_nowait()
            if item is None:
                break
            batch.append(item)
            if len(batch) >= _FLUSH_BATCH_SIZE:
                await _flush_batch(redis, batch)
                batch.clear()
        except queue.Empty:
            if batch:
                await _flush_batch(redis, batch)
                batch.clear()
            await asyncio.sleep(_FLUSH_INTERVAL)
        except Exception as exc:
            logger.warning("log_transport.error", error=str(exc))
            await asyncio.sleep(1)

    if batch:
        try:
            await _flush_batch(redis, batch)
        except Exception:
            pass


async def _flush_batch(redis: Any, batch: list[bytes]) -> None:
    """Push a batch of log events to Redis Stream and Pub/Sub."""
    pipe = redis.pipeline()
    for data in batch:
        pipe.xadd(_REDIS_STREAM_KEY, {"data": data}, maxlen=50_000, approximate=True)
        pipe.publish(_REDIS_PUBSUB_CHANNEL, data)
    await pipe.execute()


def start_log_transport(loop: asyncio.AbstractEventLoop | None = None) -> None:
    """Start the background transport task (idempotent, thread-safe)."""
    global _transport_task

    with _started_lock:
        if _started:
            return

    if loop is None:
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            return

    _transport_task = loop.create_task(_transport_loop())

    with _started_lock:
        _started = True


async def stop_log_transport() -> None:
    """Signal the transport task to stop and wait for it."""
    global _transport_task, _started

    with _started_lock:
        if not _started:
            return
        _started = False

    _log_queue.put(None)
    if _transport_task is not None:
        try:
            await asyncio.wait_for(_transport_task, timeout=5)
        except (asyncio.TimeoutError, asyncio.CancelledError):
            _transport_task.cancel()
        _transport_task = None


# ── Context variable helpers ──────────────────────────────────────────────── #

def bind_request_context(
    request_id: str | None = None,
    user_id: str | None = None,
    api_key_id: str | None = None,
    deployment_id: str | None = None,
    model: str | None = None,
) -> None:
    """Bind cross-cutting metadata to the current async context.

    These appear automatically in every subsequent log event (internal or
    third-party) via ``structlog.contextvars.merge_contextvars``.
    """
    import structlog

    if request_id:
        structlog.contextvars.bind_contextvars(request_id=request_id)
    if user_id:
        structlog.contextvars.bind_contextvars(user_id=user_id)
    if api_key_id:
        structlog.contextvars.bind_contextvars(api_key_id=api_key_id)
    if deployment_id:
        structlog.contextvars.bind_contextvars(deployment_id=deployment_id)
    if model:
        structlog.contextvars.bind_contextvars(model=model)


def clear_request_context() -> None:
    """Clear all bound context variables (call at request end)."""
    import structlog

    structlog.contextvars.clear_contextvars()


__all__ = [
    "StdlibBridgeHandler",
    "bind_request_context",
    "capture_processor",
    "clear_request_context",
    "start_log_transport",
    "stop_log_transport",
]
