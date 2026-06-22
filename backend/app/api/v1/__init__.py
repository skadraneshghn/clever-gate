"""V1 API router — OpenAI-compatible endpoints under ``/v1``."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.v1 import chat, completions, embeddings, models

router = APIRouter(prefix="/v1")
router.include_router(chat.router, tags=["chat"])
router.include_router(completions.router, tags=["completions"])
router.include_router(embeddings.router, tags=["embeddings"])
router.include_router(models.router, tags=["models"])

__all__ = ["router"]
