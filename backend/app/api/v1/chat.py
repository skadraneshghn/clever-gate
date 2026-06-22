"""OpenAI-compatible chat completions endpoint — ``POST /v1/chat/completions``."""

from __future__ import annotations

import orjson
from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_api_key
from app.core.engine import CoreEngine
from app.core.streaming import format_sse, format_sse_done
from app.db.models.api_key import ApiKey
from app.db.models.provider import Deployment
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.openai import ChatCompletionRequest
from app.api.deps import openai_error

router = APIRouter()


@router.post("/chat/completions")
async def create_chat_completion(
    request: Request,
    body: ChatCompletionRequest,
    auth: tuple[ApiKey, User] = Depends(get_current_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Handle a chat completion request (streaming or non-streaming)."""
    api_key, user = auth

    if api_key.allowed_models:
        if body.model not in api_key.allowed_models:
            raise openai_error(
                f"Model '{body.model}' is not allowed for this API key.",
                type_="invalid_request_error",
                status_code=403,
                code="model_not_allowed",
            )

    deployments_exist = await db.scalar(
        select(Deployment.id)
        .where(Deployment.model_name == body.model)
        .where(Deployment.is_enabled.is_(True))
        .limit(1)
    )
    if deployments_exist is None:
        raise openai_error(
            f"The model '{body.model}' does not exist or you do not have access to it.",
            type_="invalid_request_error",
            status_code=404,
            code="model_not_found",
        )

    engine = CoreEngine(api_key=api_key, user=user)

    if body.stream:
        return StreamingResponse(
            _stream(engine, body),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
            },
        )

    try:
        result = await engine.chat_completion(body)
    except RuntimeError as exc:
        raise openai_error(str(exc), status_code=503, type_="api_error") from exc
    except Exception as exc:
        raise openai_error(
            f"Internal error: {exc}",
            status_code=500,
            type_="api_error",
        ) from exc

    return result


async def _stream(engine: CoreEngine, body: ChatCompletionRequest):
    """Wrap the engine's async iterator into SSE chunks for StreamingResponse."""
    try:
        async for chunk in engine.stream_chat_completion(body):
            yield chunk
    except RuntimeError as exc:
        import json

        error_data = orjson.dumps(
            {"error": {"message": str(exc), "type": "api_error"}}
        ).decode("utf-8")
        yield format_sse(error_data)
        yield format_sse_done()
    except Exception as exc:
        error_data = orjson.dumps(
            {"error": {"message": f"Internal error: {exc}", "type": "api_error"}}
        ).decode("utf-8")
        yield format_sse(error_data)
        yield format_sse_done()


__all__ = ["router"]
