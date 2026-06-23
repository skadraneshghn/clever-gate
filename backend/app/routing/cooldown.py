"""Cooldown management for blocked deployments using Redis TTL."""
from __future__ import annotations

from app.core.pooling import get_redis
from app.observability.logging import get_logger

logger = get_logger(__name__)


async def set_cooldown(deployment_id: str, ttl_seconds: int = 60) -> None:
    """Put a deployment in cooldown."""
    try:
        redis = await get_redis()
        await redis.setex(f"cg:cooldown:{deployment_id}", ttl_seconds, "1")
    except Exception as exc:
        logger.warning("cooldown.set_failed", error=str(exc), deployment_id=deployment_id)


async def is_in_cooldown(deployment_id: str) -> bool:
    """Check if a deployment is in cooldown."""
    try:
        redis = await get_redis()
        return await redis.exists(f"cg:cooldown:{deployment_id}") > 0
    except Exception as exc:
        logger.warning("cooldown.check_failed", error=str(exc), deployment_id=deployment_id)
        return False


async def clear_cooldown(deployment_id: str) -> None:
    """Remove a deployment from cooldown."""
    try:
        redis = await get_redis()
        await redis.delete(f"cg:cooldown:{deployment_id}")
    except Exception as exc:
        logger.warning("cooldown.clear_failed", error=str(exc), deployment_id=deployment_id)
