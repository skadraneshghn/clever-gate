"""Cooldown management for blocked deployments using Redis TTL."""
from __future__ import annotations

from app.core.pooling import get_redis


async def set_cooldown(deployment_id: str, ttl_seconds: int = 60) -> None:
    """Put a deployment in cooldown."""
    redis = await get_redis()
    await redis.setex(f"cg:cooldown:{deployment_id}", ttl_seconds, "1")


async def is_in_cooldown(deployment_id: str) -> bool:
    """Check if a deployment is in cooldown."""
    redis = await get_redis()
    return await redis.exists(f"cg:cooldown:{deployment_id}") > 0


async def clear_cooldown(deployment_id: str) -> None:
    """Remove a deployment from cooldown."""
    redis = await get_redis()
    await redis.delete(f"cg:cooldown:{deployment_id}")
