"""Provider adapter protocol — the abstraction that keeps the core provider-agnostic.

Every upstream AI provider is wrapped behind a :class:`ProviderAdapter`. The
core engine and routing layer only ever talk to this interface, so adding a new
provider means implementing the adapter and registering it — the core never
changes (design principle D5).
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, AsyncIterator, Protocol, runtime_checkable

if TYPE_CHECKING:
    from app.schemas.openai import (
        ChatCompletionRequest,
        EmbeddingRequest,
        EmbeddingResponse,
    )
    from app.schemas.openai import ChatCompletionResponse


@runtime_checkable
class ProviderAdapter(Protocol):
    """Interface every provider adapter must implement.

    A *deployment* is a concrete model instance on a provider (one row in the
    ``deployments`` table). Adapters receive the deployment descriptor and the
    OpenAI-shaped request, and return OpenAI-shaped responses.
    """

    name: str

    async def chat(
        self,
        deployment: dict[str, Any],
        request: ChatCompletionRequest,
    ) -> ChatCompletionResponse: ...

    async def stream_chat(
        self,
        deployment: dict[str, Any],
        request: ChatCompletionRequest,
    ) -> AsyncIterator[dict[str, Any]]: ...

    async def embed(
        self,
        deployment: dict[str, Any],
        request: EmbeddingRequest,
    ) -> EmbeddingResponse: ...

    async def health_check(self, deployment: dict[str, Any]) -> bool: ...


__all__ = ["ProviderAdapter"]
