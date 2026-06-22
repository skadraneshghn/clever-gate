"""OpenAI-compatible embeddings endpoint — ``POST /v1/embeddings``."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_api_key
from app.core.engine import CoreEngine
from app.db.models.api_key import ApiKey
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.openai import EmbeddingRequest
from app.api.deps import openai_error

router = APIRouter()


@router.post("/embeddings")
async def create_embedding(
    body: EmbeddingRequest,
    auth: tuple[ApiKey, User] = Depends(get_current_api_key),
    db: AsyncSession = Depends(get_db),
):
    """Handle an embedding request."""
    api_key, user = auth

    if api_key.allowed_models and body.model not in api_key.allowed_models:
        raise openai_error(
            f"Model '{body.model}' is not allowed for this API key.",
            status_code=403,
            code="model_not_allowed",
        )

    engine = CoreEngine(api_key=api_key, user=user)

    try:
        result = await engine.embedding(body)
    except RuntimeError as exc:
        raise openai_error(str(exc), status_code=503, type_="api_error") from exc
    except Exception as exc:
        raise openai_error(
            f"Internal error: {exc}", status_code=500, type_="api_error"
        ) from exc

    return result


__all__ = ["router"]
