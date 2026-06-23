"""OpenAI-compatible text completions endpoint — ``POST /v1/completions``."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.api_key import ApiKey
from app.db.models.user import User
from app.db.session import get_db
from app.middleware.rate_limit import enforce_rate_limit
from app.schemas.openai import TextCompletionRequest
from app.api.deps import openai_error

router = APIRouter()


@router.post("/completions")
async def create_completion(
    body: TextCompletionRequest,
    auth: tuple[ApiKey, User] = Depends(enforce_rate_limit),
    db: AsyncSession = Depends(get_db),
):
    """Handle a legacy text completion request.

    Translates the legacy ``prompt`` field into a single-message chat
    completion and dispatches through the core engine.
    """
    from app.core.engine import CoreEngine
    from app.schemas.openai import ChatCompletionRequest

    api_key, user = auth

    if api_key.allowed_models and body.model not in api_key.allowed_models:
        raise openai_error(
            f"Model '{body.model}' is not allowed for this API key.",
            status_code=403,
            code="model_not_allowed",
        )

    prompt = body.prompt if isinstance(body.prompt, str) else "\n".join(body.prompt)
    messages = [{"role": "user", "content": prompt}]

    chat_request = ChatCompletionRequest(
        model=body.model,
        messages=messages,
        stream=body.stream,
        temperature=body.temperature,
        max_tokens=body.max_tokens,
        top_p=body.top_p,
        n=body.n,
        stop=body.stop,
        frequency_penalty=body.frequency_penalty,
        presence_penalty=body.presence_penalty,
        user=body.user,
    )

    engine = CoreEngine(api_key=api_key, user=user)

    try:
        if body.stream:
            return _stream_completion(engine, chat_request)
        result = await engine.chat_completion(chat_request)
    except RuntimeError as exc:
        raise openai_error(str(exc), status_code=503, type_="api_error") from exc

    choices = []
    for choice in result.get("choices", []):
        message = choice.get("message", {})
        text = message.get("content", "")
        choices.append(
            {
                "text": text,
                "index": choice.get("index", 0),
                "finish_reason": choice.get("finish_reason", "stop"),
                "logprobs": None,
            }
        )

    return {
        "id": result.get("id", ""),
        "object": "text_completion",
        "created": result.get("created", 0),
        "model": result.get("model", body.model),
        "choices": choices,
        "usage": result.get("usage", {}),
    }


async def _stream_completion(engine, chat_request):
    """Yield text-completion-shaped SSE chunks from the chat stream."""
    from fastapi.responses import StreamingResponse

    async def generate():
        async for chunk in engine.stream_chat_completion(chat_request):
            yield chunk

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


__all__ = ["router"]
