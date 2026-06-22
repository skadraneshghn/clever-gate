"""Connection pool management for Redis and HTTP clients."""
from __future__ import annotations

import httpx
import redis.asyncio as aioredis

from app.config import get_settings

# Redis pool
_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        settings = get_settings()
        _redis = aioredis.from_url(
            settings.REDIS_URL, decode_responses=True, max_connections=50
        )
    return _redis


async def close_redis() -> None:
    global _redis
    if _redis is not None:
        await _redis.aclose()
        _redis = None


# HTTP client pool for direct provider calls (separate from LiteLLM)
_http_clients: dict[str, httpx.AsyncClient] = {}


async def get_http_client(name: str = "default") -> httpx.AsyncClient:
    if name not in _http_clients:
        _http_clients[name] = httpx.AsyncClient(
            http2=True,
            timeout=httpx.Timeout(60.0, connect=10.0),
            limits=httpx.Limits(
                max_connections=1000, max_keepalive_connections=100
            ),
        )
    return _http_clients[name]


async def close_http_clients() -> None:
    for client in _http_clients.values():
        await client.aclose()
    _http_clients.clear()
