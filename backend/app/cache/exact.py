"""L1 exact-match response cache backed by Redis."""
from __future__ import annotations

import hashlib
import json
from typing import Any

import orjson

from app.core.pooling import get_redis
from app.observability.logging import get_logger

logger = get_logger(__name__)

_CACHE_PREFIX = "cg:cache:"
_STREAM_SUFFIX = ":stream"
_MODEL_INDEX_PREFIX = "cg:cache:idx:model:"


def _normalize(obj: Any) -> Any:
    """Recursively normalize a value for stable hashing.

    Strings are stripped of surrounding whitespace and dict keys are sorted so
    that semantically identical payloads produce identical cache keys.
    """
    if isinstance(obj, str):
        return obj.strip()
    if isinstance(obj, dict):
        return {k: _normalize(v) for k, v in sorted(obj.items())}
    if isinstance(obj, list):
        return [_normalize(item) for item in obj]
    return obj


def cache_key(model: str, messages: list[Any], params: dict[str, Any]) -> str:
    """Compute a deterministic cache key for a model + messages + params."""
    normalized = _normalize(
        {"model": model, "messages": messages, "params": params}
    )
    payload = json.dumps(normalized, sort_keys=True, ensure_ascii=False)
    digest = hashlib.sha256(payload.encode("utf-8")).hexdigest()
    return f"{_CACHE_PREFIX}{digest}"


async def get(cache_key: str) -> dict[str, Any] | None:
    """Return the cached response dict, or None on miss."""
    try:
        redis = await get_redis()
        raw = await redis.get(cache_key)
        if raw is None:
            return None
        return orjson.loads(raw)
    except Exception as exc:
        logger.warning("cache.get_failed", error=str(exc), key=cache_key)
        return None


async def set(
    cache_key: str,
    value: dict[str, Any],
    ttl: int = 3600,
) -> None:
    """Store a response dict with a TTL and index it by model for invalidation."""
    try:
        redis = await get_redis()
        pipe = redis.pipeline()
        pipe.setex(cache_key, ttl, orjson.dumps(value))
        model = value.get("model") if isinstance(value, dict) else None
        if model:
            idx_key = f"{_MODEL_INDEX_PREFIX}{model}"
            pipe.sadd(idx_key, cache_key)
            pipe.expire(idx_key, ttl)
        await pipe.execute()
    except Exception as exc:
        logger.warning("cache.set_failed", error=str(exc), key=cache_key)


async def get_stream(cache_key: str) -> list[str] | None:
    """Return cached SSE chunks for a key, or None on miss."""
    try:
        redis = await get_redis()
        raw = await redis.get(f"{cache_key}{_STREAM_SUFFIX}")
        if raw is None:
            return None
        return orjson.loads(raw)
    except Exception as exc:
        logger.warning("cache.get_stream_failed", error=str(exc), key=cache_key)
        return None


async def set_stream(
    cache_key: str,
    chunks: list[str],
    ttl: int = 3600,
) -> None:
    """Store cached SSE chunks for a key with a TTL."""
    try:
        redis = await get_redis()
        pipe = redis.pipeline()
        stream_key = f"{cache_key}{_STREAM_SUFFIX}"
        pipe.setex(stream_key, ttl, orjson.dumps(chunks))
        await pipe.execute()
    except Exception as exc:
        logger.warning("cache.set_stream_failed", error=str(exc), key=cache_key)


async def invalidate(pattern: str = "cg:cache:*") -> int:
    """Delete all cache keys matching the given glob pattern.

    Returns the number of keys deleted.
    """
    try:
        redis = await get_redis()
        count = 0
        async for key in redis.scan_iter(match=pattern, count=100):
            await redis.delete(key)
            count += 1
        return count
    except Exception as exc:
        logger.warning("cache.invalidate_failed", error=str(exc), pattern=pattern)
        return 0


async def invalidate_by_model(model: str) -> int:
    """Delete all cached entries associated with a model.

    Uses a per-model set index maintained by :func:`set` to avoid scanning the
    entire keyspace. Returns the number of entries removed.
    """
    try:
        redis = await get_redis()
        idx_key = f"{_MODEL_INDEX_PREFIX}{model}"
        keys = await redis.smembers(idx_key)
        if not keys:
            return 0
        pipe = redis.pipeline()
        for key in keys:
            pipe.delete(key)
            pipe.delete(f"{key}{_STREAM_SUFFIX}")
        pipe.delete(idx_key)
        await pipe.execute()
        return len(keys)
    except Exception as exc:
        logger.warning("cache.invalidate_by_model_failed", error=str(exc), model=model)
        return 0
