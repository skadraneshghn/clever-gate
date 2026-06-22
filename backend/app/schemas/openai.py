"""OpenAI-compatible API request and response schemas (Pydantic v2)."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ChatCompletionRequest(BaseModel):
    """OpenAI-compatible chat completion request.

    Extra fields are allowed so clients may pass provider-specific options
    (e.g. ``response_format``, ``tools``, ``tool_choice``, ``seed``) without
    being rejected by the gateway.
    """

    model_config = ConfigDict(extra="allow")

    model: str
    messages: list[dict[str, Any]]
    stream: bool = False
    temperature: float | None = None
    max_tokens: int | None = None
    top_p: float | None = None
    frequency_penalty: float | None = None
    presence_penalty: float | None = None
    stop: str | list[str] | None = None
    n: int = 1
    user: str | None = None
    stream_options: dict[str, Any] | None = None


class ChatCompletionResponse(BaseModel):
    """Non-streaming chat completion response."""

    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: list[dict[str, Any]]
    usage: dict[str, Any] | None = None


class ChatCompletionChunk(BaseModel):
    """Single server-sent event chunk for streaming chat completions."""

    id: str
    object: str = "chat.completion.chunk"
    created: int
    model: str
    choices: list[dict[str, Any]]


class TextCompletionRequest(BaseModel):
    """OpenAI-compatible legacy text completion request."""

    model_config = ConfigDict(extra="allow")

    model: str
    prompt: str | list[str]
    stream: bool = False
    max_tokens: int | None = None
    temperature: float | None = None
    top_p: float | None = None
    n: int = 1
    stop: str | list[str] | None = None
    frequency_penalty: float | None = None
    presence_penalty: float | None = None
    logprobs: int | None = None
    echo: bool = False
    user: str | None = None
    suffix: str | None = None


class TextCompletionResponse(BaseModel):
    """Non-streaming text completion response."""

    id: str
    object: str = "text_completion"
    created: int
    model: str
    choices: list[dict[str, Any]]
    usage: dict[str, Any]


class EmbeddingRequest(BaseModel):
    """OpenAI-compatible embeddings request."""

    model_config = ConfigDict(extra="allow")

    model: str
    input: str | list[str]
    encoding_format: str = "float"
    dimensions: int | None = None
    user: str | None = None


class EmbeddingData(BaseModel):
    """Single embedding entry."""

    object: str = "embedding"
    index: int
    embedding: list[float] | str


class EmbeddingResponse(BaseModel):
    """Embeddings response."""

    object: str = "list"
    data: list[dict[str, Any]]
    model: str
    usage: dict[str, Any] = Field(default_factory=lambda: {"prompt_tokens": 0, "total_tokens": 0})


class ModelObject(BaseModel):
    """Single model entry in the /models listing."""

    id: str
    object: str = "model"
    created: int
    owned_by: str


class ModelList(BaseModel):
    """Response for GET /v1/models."""

    object: str = "list"
    data: list[ModelObject] = Field(default_factory=list)


class OpenAIErrorDetail(BaseModel):
    """Inner detail of an OpenAI-style error."""

    message: str
    type: str
    param: str | None = None
    code: str | None = None


class OpenAIError(BaseModel):
    """Top-level OpenAI-style error envelope."""

    error: OpenAIErrorDetail
