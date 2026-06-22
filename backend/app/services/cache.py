"""Cache management service for the admin panel."""

from __future__ import annotations

from app.cache import exact as cache


async def invalidate_all() -> int:
    """Delete all cached entries and return the count removed."""
    return await cache.invalidate("cg:cache:*")


async def invalidate_model(model: str) -> int:
    """Delete all cached entries for a specific model."""
    return await cache.invalidate_by_model(model)


async def stats() -> dict[str, int]:
    """Return basic cache statistics (key counts)."""
    from app.core.pooling import get_redis

    redis = await get_redis()
    total = 0
    async for _ in redis.scan_iter(match="cg:cache:*", count=200):
        total += 1
    return {"total_entries": total}


__all__ = ["invalidate_all", "invalidate_model", "stats"]
