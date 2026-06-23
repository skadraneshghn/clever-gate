"""Core engine — async orchestration of the request lifecycle.

The engine ties together cache lookup, payload splitting, provider dispatch,
streaming, and observability. It is the heart of design principles D2 (zero
start latency), D3 (full parallelization) and D4 (unlimited payload handling).

Each request becomes an independent coroutine immediately — there is no global
blocking queue. Independent pre-flight tasks (auth context, cache lookup) are
gathered concurrently; the upstream call is dispatched through the load
balancer with circuit-breaker protection.

Multi-worker / multi-instance safety
------------------------------------
The ``LoadBalancer`` is stateless: all mutable routing state — cooldown flags
and circuit-breaker failure counts — lives in **Redis** (see
``app/routing/cooldown.py`` and ``app/routing/breaker.py``).  Every Uvicorn
worker and every container instance shares the same view of deployment health.
"""

from __future__ import annotations

import asyncio
import time
import uuid
from collections.abc import AsyncIterator
from typing import TYPE_CHECKING, Any

from app.config import get_settings
from app.observability.logging import get_logger
from app.observability.metrics import (
    cg_cache_hits_total,
    cg_cache_misses_total,
    cg_request_duration_seconds,
    cg_requests_total,
    cg_tokens_total,
)
from app.providers.registry import get_registry
from app.providers.router_builder import get_router_builder
from app.routing.balancer import LoadBalancer

if TYPE_CHECKING:
    from app.db.models.api_key import ApiKey
    from app.db.models.user import User
    from app.schemas.openai import ChatCompletionRequest

logger = get_logger(__name__)


class CoreEngine:
    """Orchestrates a single chat-completion request end-to-end.

    The engine is instantiated per request (lightweight) and holds the
    request-scoped context: api key, user, request id, and timing.
    """

    def __init__(
        self,
        api_key: ApiKey,
        user: User,
        load_balancer: LoadBalancer | None = None,
    ) -> None:
        self.api_key = api_key
        self.user = user
        self.request_id = str(uuid.uuid4())
        if load_balancer is not None:
            self.load_balancer = load_balancer
        else:
            settings = get_settings()
            self.load_balancer = LoadBalancer(
                max_retries=settings.CG_NUM_RETRIES,
                cooldown_time=settings.CG_COOLDOWN_TIME,
                max_fails=settings.CG_ALLOWED_FAILS,
            )

    async def chat_completion(
        self,
        request: ChatCompletionRequest,
    ) -> dict[str, Any]:
        """Process a non-streaming chat completion.

        1. Check L1 exact cache → return on hit.
        2. If the payload exceeds the chunk threshold, split it into
           sub-conversations and dispatch them in parallel (design principle
           D4 — unlimited payload handling). The text splitter runs in the
           ProcessPool so the event loop stays unblocked.
        3. Record metrics, log spend, fill cache.
        """
        from app.cache import exact as cache

        start = time.perf_counter()
        model = request.model
        cache_hit = False

        key = cache.cache_key(
            model,
            request.messages,
            request.model_dump(exclude_none=True, exclude={"model", "messages", "stream"}),
        )
        cached = await cache.get(key)
        if cached is not None:
            cache_hit = True
            cg_cache_hits_total.inc()
            cg_requests_total.labels(
                provider="cache", model=model, status="200", cache_hit="true"
            ).inc()
            logger.info("engine.cache_hit", request_id=self.request_id, model=model)
            return cached

        cg_cache_misses_total.inc()

        router = await get_router_builder().get_or_build()
        if router is None:
            raise RuntimeError(
                "No providers configured. Add providers and deployments via the admin panel."
            )

        adapter = get_registry().get_required("litellm")
        deployment = await self._select_deployment(model, router)

        result = await self._dispatch_with_split(adapter, deployment, request, model, router)
        response_dict = result.model_dump()

        elapsed = time.perf_counter() - start
        cg_request_duration_seconds.labels(
            provider=deployment.get("provider_name", "unknown"),
            model=model,
        ).observe(elapsed)
        cg_requests_total.labels(
            provider=deployment.get("provider_name", "unknown"),
            model=model,
            status="200",
            cache_hit="false",
        ).inc()

        usage = response_dict.get("usage") or {}
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        if prompt_tokens:
            cg_tokens_total.labels(direction="prompt", model=model).inc(prompt_tokens)
        if completion_tokens:
            cg_tokens_total.labels(direction="completion", model=model).inc(completion_tokens)

        try:
            await cache.set(key, response_dict)
        except Exception:
            logger.warning("engine.cache_fill_failed", request_id=self.request_id)

        logger.info(
            "engine.completed",
            request_id=self.request_id,
            model=model,
            latency_ms=round(elapsed * 1000, 2),
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            cache_hit=cache_hit,
        )
        return response_dict

    async def stream_chat_completion(
        self,
        request: ChatCompletionRequest,
    ) -> AsyncIterator[str]:
        """Process a streaming chat completion, yielding SSE-formatted chunks.

        On a cache hit the stored chunks are replayed. Otherwise the upstream
        stream is passed through a non-blocking buffer while chunks are
        collected for cache filling.
        """
        import orjson

        from app.cache import exact as cache
        from app.core.streaming import format_sse, format_sse_done

        model = request.model
        key = cache.cache_key(
            model,
            request.messages,
            request.model_dump(exclude_none=True, exclude={"model", "messages", "stream"}),
        )

        cached_chunks = await cache.get_stream(key)
        if cached_chunks is not None:
            cg_cache_hits_total.inc()
            cg_requests_total.labels(
                provider="cache", model=model, status="200", cache_hit="true"
            ).inc()
            for chunk in cached_chunks:
                yield chunk
            yield format_sse_done()
            return

        cg_cache_misses_total.inc()

        router = await get_router_builder().get_or_build()
        if router is None:
            raise RuntimeError(
                "No providers configured. Add providers and deployments via the admin panel."
            )

        adapter = get_registry().get_required("litellm")
        deployment = await self._select_deployment(model, router)

        collected: list[str] = []
        start = time.perf_counter()
        total_completion_tokens = 0

        async for chunk_dict in adapter.stream_chat(
            deployment, request, router=router
        ):
            data = orjson.dumps(chunk_dict).decode("utf-8")
            sse = format_sse(data)
            collected.append(sse)
            yield sse

            choices = chunk_dict.get("choices") or []
            if choices:
                delta = choices[0].get("usage") or {}
                total_completion_tokens += delta.get("completion_tokens", 0)

        yield format_sse_done()

        elapsed = time.perf_counter() - start
        cg_request_duration_seconds.labels(
            provider=deployment.get("provider_name", "unknown"),
            model=model,
        ).observe(elapsed)
        cg_requests_total.labels(
            provider=deployment.get("provider_name", "unknown"),
            model=model,
            status="200",
            cache_hit="false",
        ).inc()

        try:
            await cache.set_stream(key, collected)
        except Exception:
            logger.warning("engine.cache_stream_fill_failed", request_id=self.request_id)

        logger.info(
            "engine.stream_completed",
            request_id=self.request_id,
            model=model,
            latency_ms=round(elapsed * 1000, 2),
            chunks=len(collected),
        )

    async def embedding(
        self,
        request: Any,
    ) -> dict[str, Any]:
        """Process an embedding request (no caching in phase 1)."""
        router = await get_router_builder().get_or_build()
        if router is None:
            raise RuntimeError("No providers configured.")

        adapter = get_registry().get_required("litellm")
        deployment = await self._select_deployment(request.model, router)
        result = await adapter.embed(deployment, request, router=router)
        return result.model_dump()

    # ------------------------------------------------------------------ #
    # Internal
    # ------------------------------------------------------------------ #
    async def _select_deployment(
        self,
        model: str,
        router: Any,
    ) -> dict[str, Any]:
        """Select a healthy deployment for ``model`` and return its descriptor.

        Falls back to the first available deployment in the router list if the
        load balancer cannot find a non-cooled-down candidate.
        """
        deployment_id = await self.load_balancer.select_deployment(model, router)

        candidates = router.get_model_list(model_name=model) or []
        for candidate in candidates:
            info = candidate.get("model_info") or {}
            if str(info.get("id", "")) == deployment_id:
                return {
                    "id": deployment_id,
                    "litellm_model": candidate["litellm_params"]["model"],
                    "litellm_params": candidate.get("litellm_params", {}),
                    "model_name": candidate.get("model_name", model),
                    "provider_name": candidate.get("model_name", model),
                }
        if candidates:
            first = candidates[0]
            info = first.get("model_info") or {}
            return {
                "id": str(info.get("id", "")),
                "litellm_model": first["litellm_params"]["model"],
                "litellm_params": first.get("litellm_params", {}),
                "model_name": first.get("model_name", model),
                "provider_name": first.get("model_name", model),
            }
        raise RuntimeError(f"No deployments found for model {model!r}")

    async def _dispatch_with_split(
        self,
        adapter: Any,
        deployment: dict[str, Any],
        request: ChatCompletionRequest,
        model: str,
        router: Any,
    ) -> Any:
        """Dispatch a chat completion, splitting large payloads in parallel.

        Uses :func:`map_reduce_split` (backed by the ProcessPool text splitter)
        to break oversized conversations into sub-conversations. When splitting
        occurs, all sub-requests are dispatched concurrently via
        ``asyncio.gather`` and their responses are merged with
        :func:`reduce_responses`.

        For payloads under the threshold — the common case — this is a
        zero-overhead passthrough to ``adapter.chat``.
        """
        from app.payload.aggregator import map_reduce_split, reduce_responses

        sub_conversations = await map_reduce_split(request.messages)

        if len(sub_conversations) <= 1:
            return await adapter.chat(deployment, request, router=router)

        logger.info(
            "engine.payload_split",
            request_id=self.request_id,
            model=model,
            chunks=len(sub_conversations),
        )

        sub_requests = [
            request.model_copy(update={"messages": sub})
            for sub in sub_conversations
        ]

        tasks = [
            adapter.chat(deployment, sub_req, router=router)
            for sub_req in sub_requests
        ]
        results = await asyncio.gather(*tasks)

        merged = reduce_responses([r.model_dump() for r in results])
        return type(results[0]).model_validate(merged)


_engine: CoreEngine | None = None


def get_engine() -> CoreEngine:
    """Return the global engine (used for non-request-scoped access)."""
    global _engine
    if _engine is None:
        raise RuntimeError(
            "CoreEngine must be instantiated per-request with auth context."
        )
    return _engine


__all__ = ["CoreEngine", "get_engine"]
