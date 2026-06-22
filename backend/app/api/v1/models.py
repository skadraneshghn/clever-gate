"""OpenAI-compatible models endpoints — ``GET /v1/models`` and ``/v1/models/{id}``."""

from __future__ import annotations

import time
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import distinct, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_api_key
from app.db.models.api_key import ApiKey
from app.db.models.provider import Deployment
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.openai import ModelList, ModelObject
from app.api.deps import openai_error

router = APIRouter()


@router.get("/models")
async def list_models(
    auth: tuple[ApiKey, User] = Depends(get_current_api_key),
    db: AsyncSession = Depends(get_db),
) -> ModelList:
    """List the models available to the authenticated API key."""
    api_key, _ = auth

    result = await db.execute(
        select(distinct(Deployment.model_name))
        .where(Deployment.is_enabled.is_(True))
        .order_by(Deployment.model_name)
    )
    all_models = list(result.scalars().all())

    if api_key.allowed_models:
        allowed = set(api_key.allowed_models)
        all_models = [m for m in all_models if m in allowed]

    now = int(time.time())
    data = [
        ModelObject(id=m, created=now, owned_by="clever-gateway")
        for m in all_models
    ]
    return ModelList(data=data)


@router.get("/models/{model_id}")
async def get_model(
    model_id: str,
    auth: tuple[ApiKey, User] = Depends(get_current_api_key),
    db: AsyncSession = Depends(get_db),
) -> ModelObject:
    """Return information about a single model."""
    api_key, _ = auth

    if api_key.allowed_models and model_id not in api_key.allowed_models:
        raise openai_error(
            f"Model '{model_id}' is not allowed for this API key.",
            status_code=403,
            code="model_not_allowed",
        )

    result = await db.execute(
        select(Deployment)
        .where(Deployment.model_name == model_id)
        .where(Deployment.is_enabled.is_(True))
        .limit(1)
    )
    deployment = result.scalar_one_or_none()
    if deployment is None:
        raise openai_error(
            f"The model '{model_id}' does not exist.",
            status_code=404,
            code="model_not_found",
        )

    return ModelObject(
        id=deployment.model_name,
        created=int(deployment.created_at.timestamp()),
        owned_by="clever-gateway",
    )


__all__ = ["router"]
