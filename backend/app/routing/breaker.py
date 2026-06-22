"""Circuit breaker backed by Redis for per-deployment failure tracking."""
from __future__ import annotations

from typing import Any

from app.core.pooling import get_redis
from app.routing.cooldown import is_in_cooldown, set_cooldown

_FAILS_KEY = "cg:breaker:{deployment_id}:fails"


async def record_failure(
    deployment_id: str,
    max_fails: int = 3,
    cooldown_time: int = 60,
) -> int:
    """Increment the failure counter and open the circuit if threshold reached.

    When the failure count reaches ``max_fails`` the deployment is placed in
    cooldown and the counter is reset so the deployment becomes eligible again
    once the cooldown expires.

    Returns the failure count observed after incrementing.
    """
    redis = await get_redis()
    key = _FAILS_KEY.format(deployment_id=deployment_id)
    fail_count = await redis.incr(key)
    if fail_count >= max_fails:
        await set_cooldown(deployment_id, ttl_seconds=cooldown_time)
        await redis.delete(key)
    return fail_count


async def record_success(deployment_id: str) -> None:
    """Reset the failure counter after a successful call."""
    redis = await get_redis()
    await redis.delete(_FAILS_KEY.format(deployment_id=deployment_id))


async def is_available(deployment_id: str, max_fails: int = 3) -> bool:
    """Return True when the deployment is not in cooldown and below fail threshold."""
    if await is_in_cooldown(deployment_id):
        return False
    redis = await get_redis()
    raw = await redis.get(_FAILS_KEY.format(deployment_id=deployment_id))
    fail_count = int(raw) if raw is not None else 0
    return fail_count < max_fails


async def get_state(
    deployment_id: str,
    max_fails: int = 3,
) -> dict[str, Any]:
    """Return the current circuit breaker state for a deployment."""
    redis = await get_redis()
    raw = await redis.get(_FAILS_KEY.format(deployment_id=deployment_id))
    fail_count = int(raw) if raw is not None else 0
    in_cooldown = await is_in_cooldown(deployment_id)
    return {
        "fail_count": fail_count,
        "is_in_cooldown": in_cooldown,
        "is_available": not in_cooldown and fail_count < max_fails,
    }
