"""LiteLLM adapter — the phase-1 provider integration layer.

Uses LiteLLM as an in-process library (not a separate proxy) so there is no
extra network hop. The adapter wraps :func:`litellm.acompletion`,
:func:`litellm.aembedding` and the streaming variants, translating between the
gateway's OpenAI-shaped schemas and LiteLLM's calling conventions.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, AsyncIterator

import litellm

from app.observability.logging import get_logger

if TYPE_CHECKING:
    from app.schemas.openai import (
        ChatCompletionRequest,
        EmbeddingRequest,
        EmbeddingResponse,
    )
    from app.schemas.openai import ChatCompletionResponse

logger = get_logger(__name__)

litellm.drop_params = True
litellm.suppress_debug_info = True


class LiteLLMAdapter:
    """Adapter that delegates to the LiteLLM SDK.

    The adapter itself is stateless — routing, load balancing, retries and
    fallbacks are handled by the :class:`~litellm.Router` built externally by
    :mod:`app.providers.router_builder` and passed via the ``router`` kwarg.
    When no router is supplied the adapter falls back to direct
    ``litellm.acompletion`` / ``litellm.aembedding`` calls.
    """

    name = "litellm"

    async def chat(
        self,
        deployment: dict[str, Any],
        request: ChatCompletionRequest,
        *,
        router: litellm.Router | None = None,
    ) -> ChatCompletionResponse:
        """Non-streaming chat completion via LiteLLM."""
        from app.schemas.openai import ChatCompletionResponse

        payload = self._build_payload(deployment, request, stream=False)
        response = await self._acompletion(payload, router=router)
        return ChatCompletionResponse.model_validate(response)

    async def stream_chat(
        self,
        deployment: dict[str, Any],
        request: ChatCompletionRequest,
        *,
        router: litellm.Router | None = None,
    ) -> AsyncIterator[dict[str, Any]]:
        """Streaming chat completion yielding LiteLLM chunk dicts."""
        payload = self._build_payload(deployment, request, stream=True)
        stream = await self._acompletion(payload, router=router)
        async for chunk in stream:
            yield self._chunk_to_dict(chunk)

    async def embed(
        self,
        deployment: dict[str, Any],
        request: EmbeddingRequest,
        *,
        router: litellm.Router | None = None,
    ) -> EmbeddingResponse:
        """Embedding request via LiteLLM."""
        from app.schemas.openai import EmbeddingResponse

        model = deployment["litellm_model"]
        data = request.model_dump(exclude_none=True)
        kwargs: dict[str, Any] = {
            "model": model,
            "input": data["input"],
        }
        if "encoding_format" in data:
            kwargs["encoding_format"] = data["encoding_format"]
        if "dimensions" in data:
            kwargs["dimensions"] = data["dimensions"]

        if router is not None:
            response = await router.aembedding(**kwargs)
        else:
            response = await litellm.aembedding(**kwargs)
        return EmbeddingResponse.model_validate(response.model_dump())

    async def health_check(self, deployment: dict[str, Any]) -> bool:
        """Lightweight health check — a 1-token completion."""
        model = deployment["litellm_model"]
        # litellm_params carries the api_key, api_base, etc. from the DB.
        litellm_params: dict[str, Any] = dict(deployment.get("litellm_params") or {})
        try:
            await litellm.acompletion(
                model=model,
                messages=[{"role": "user", "content": "ping"}],
                max_tokens=1,
                **litellm_params,
            )
        except Exception as exc:
            logger.warning(
                "health_check.failed",
                model=model,
                error=str(exc),
                exc_type=type(exc).__name__,
            )
            return False
        return True

    # ------------------------------------------------------------------ #
    # Internal helpers
    # ------------------------------------------------------------------ #
    @staticmethod
    def _build_payload(
        deployment: dict[str, Any],
        request: ChatCompletionRequest,
        *,
        stream: bool,
    ) -> dict[str, Any]:
        """Build the kwargs dict for ``litellm.acompletion``."""
        model = deployment["litellm_model"]
        data = request.model_dump(exclude_none=True)
        messages = data.pop("messages")
        data.pop("model", None)
        data.pop("stream", None)
        litellm_params = deployment.get("litellm_params") or {}
        payload: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "stream": stream,
            **data,
            **litellm_params,
        }
        return payload

    @staticmethod
    async def _acompletion(
        payload: dict[str, Any],
        *,
        router: litellm.Router | None,
    ) -> Any:
        if router is not None:
            model_name = payload.get("model")
            return await router.acompletion(**payload)
        return await litellm.acompletion(**payload)

    @staticmethod
    def _chunk_to_dict(chunk: Any) -> dict[str, Any]:
        """Normalise a LiteLLM streaming chunk to a plain dict."""
        if isinstance(chunk, dict):
            return chunk
        if hasattr(chunk, "model_dump"):
            return chunk.model_dump()
        if hasattr(chunk, "to_dict"):
            return chunk.to_dict()
        return dict(chunk)


__all__ = ["LiteLLMAdapter"]
