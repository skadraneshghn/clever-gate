"""Rate limiting via Redis sliding-window sorted sets."""
from __future__ import annotations

import time
import uuid
from typing import TYPE_CHECKING

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.auth.api_key import hash_api_key
from app.core.pooling import get_redis
from app.observability.logging import get_logger

if TYPE_CHECKING:
    from starlette.requests import Request

logger = get_logger(__name__)

_WINDOW_KEY = "cg:ratelimit:{key}"


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
            return auth[7:].strip() or None
        return None
