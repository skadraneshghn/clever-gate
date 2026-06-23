"""Rate limiting via Redis sliding-window sorted sets.

Rate limiting is enforced **per virtual API key** through the
``enforce_rate_limit`` FastAPI dependency, not as a global middleware.  The
limit for each key is read from the ``rate_limits`` table (cached in Redis)
so different keys can have different limits, and keys without a configured
limit are unrestricted — supporting the gateway's "unlimited throughput"
design goal.
"""

from __future__ import annotations

import time
import uuid
from typing import TYPE_CHECKING

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.auth.api_key import hash_api_key
from app.auth.dependencies import get_current_api_key
from app.core.pooling import get_redis
from app.db.models.api_key import ApiKey
from app.db.models.tracking import RateLimit
from app.db.models.user import User
from app.db.session import get_db
from app.observability.logging import get_logger

if TYPE_CHECKING:
    from starlette.requests import Request

logger = get_logger(__name__)

_WINDOW_KEY = "cg:ratelimit:{key}"
_RL_CACHE_KEY = "cg:keyrl:{api_key_id}"
_RL_CACHE_TTL = 60  # seconds — short so config changes propagate quickly


async def check_rate_limit(
    key: str,
    limit: int,
    window_seconds: int = 60,
) -> tuple[bool, int]:
    """Sliding-window rate limit check using a Redis sorted set.

    Each request adds a unique member scored by the current timestamp. Members
    older than the window are evicted, and the set cardinality is compared
    against ``limit``.

    Returns a tuple of ``(allowed, remaining)`` where ``remaining`` is the
    number of requests still permitted within the current window.
    """
    redis = await get_redis()
    now = time.time()
    cutoff = now - window_seconds
    redis_key = _WINDOW_KEY.format(key=key)
    member = f"{now}:{uuid.uuid4().hex}"

    pipe = redis.pipeline()
    pipe.zremrangebyscore(redis_key, 0, cutoff)
    pipe.zadd(redis_key, {member: now})
    pipe.zcard(redis_key)
    pipe.expire(redis_key, window_seconds)
    results = await pipe.execute()

    count = int(results[2])
    remaining = max(0, limit - count)
    allowed = count <= limit
    return allowed, remaining


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-API-key rate limit middleware.

    Requests bearing an ``Authorization: Bearer <key>`` header are counted
    against a sliding window keyed by the SHA-256 of the API key (the raw key is
    never stored). Requests without a bearer token are passed through.
    """

    def __init__(
        self,
        app,
        limit: int = 60,
        window_seconds: int = 60,
    ) -> None:
        super().__init__(app)
        self.limit = limit
        self.window_seconds = window_seconds

    async def dispatch(self, request: Request, call_next):
        # Skip rate limiting for admin panel and health check endpoints
        path = request.url.path
        if (
            path.startswith("/api/admin/")
            or path.startswith("/health")
            or path.startswith("/metrics")
        ):
            return await call_next(request)

        api_key = self._extract_api_key(request)
        if api_key is not None:
            key_hash = hash_api_key(api_key)
            try:
                allowed, remaining = await check_rate_limit(
                    f"apikey:{key_hash}",
                    self.limit,
                    self.window_seconds,
                )
            except Exception as exc:
                logger.warning(
                    "rate_limit.redis_error",
                    error=str(exc),
                    key_hash=key_hash,
                )
                allowed, remaining = True, self.limit

            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "error": {
                            "message": "Rate limit exceeded",
                            "type": "rate_limit_error",
                        }
                    },
                    headers={
                        "X-RateLimit-Limit": str(self.limit),
                        "X-RateLimit-Remaining": "0",
                        "Retry-After": str(self.window_seconds),
                    },
                )
            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(self.limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            return response
        return await call_next(request)

    @staticmethod
    def _extract_api_key(request: Request) -> str | None:
        auth = request.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth[7:].strip()
            # Only treat as API key if it starts with the valid sk-cg- prefix
            if token.startswith("sk-cg-"):
                return token
        return None


# --------------------------------------------------------------------------- #
# Per-key dynamic rate-limit dependency
# --------------------------------------------------------------------------- #

async def _get_cached_rpm_limit(
    db: AsyncSession,
    api_key_id: str,
) -> int | None:
    """Return the RPM limit for *api_key_id*, cached in Redis.

    Queries the ``rate_limits`` table for an active, api-key-scoped limit.
    The result is cached for ``_RL_CACHE_TTL`` seconds so repeated requests
    don't hit the database.  ``None`` means "no limit configured" (unlimited).
    """
    redis = await get_redis()
    cache_key = _RL_CACHE_KEY.format(api_key_id=api_key_id)

    cached = await redis.get(cache_key)
    if cached is not None:
        val = int(cached)
        return val if val > 0 else None

    result = await db.execute(
        select(RateLimit.rpm)
        .where(RateLimit.api_key_id == api_key_id)
        .where(RateLimit.is_active.is_(True))
        .where(RateLimit.scope == "api_key")
        .limit(1)
    )
    rpm = result.scalar_one_or_none()

    await redis.setex(cache_key, _RL_CACHE_TTL, str(rpm or 0))
    return rpm


async def enforce_rate_limit(
    auth: tuple[ApiKey, User] = Depends(get_current_api_key),
    db: AsyncSession = Depends(get_db),
) -> tuple[ApiKey, User]:
    """FastAPI dependency: enforce per-key rate limiting.

    Replaces the global ``RateLimitMiddleware``.  Looks up the RPM limit for
    the authenticated API key from the database (cached in Redis) and, when a
    limit is configured, checks the sliding-window counter.  Keys without a
    configured limit are unrestricted.

    Use this in place of ``get_current_api_key`` on endpoints that need rate
    limiting — it returns the same ``(ApiKey, User)`` tuple.
    """
    api_key, user = auth

    try:
        rpm_limit = await _get_cached_rpm_limit(db, str(api_key.id))
    except Exception as exc:
        logger.warning(
            "rate_limit.config_lookup_failed",
            error=str(exc),
            api_key_id=str(api_key.id),
        )
        rpm_limit = None

    if rpm_limit is None or rpm_limit <= 0:
        return auth

    try:
        allowed, remaining = await check_rate_limit(
            f"apikey:{api_key.key_hash}",
            rpm_limit,
            60,
        )
    except Exception as exc:
        logger.warning(
            "rate_limit.redis_error",
            error=str(exc),
            api_key_id=str(api_key.id),
        )
        return auth

    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": {
                    "message": "Rate limit exceeded",
                    "type": "rate_limit_error",
                }
            },
            headers={
                "X-RateLimit-Limit": str(rpm_limit),
                "X-RateLimit-Remaining": "0",
                "Retry-After": "60",
            },
        )

    return auth
