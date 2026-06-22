"""Admin virtual API key management endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import paginated
from app.auth.dependencies import get_current_admin_user
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.admin import ApiKeyCreate, ApiKeyCreatedResponse, ApiKeyResponse
from app.services import keys as key_service

router = APIRouter()


@router.get("/api-keys", response_model=None)
async def list_api_keys(
    user_id: uuid.UUID | None = None,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    items, total = await key_service.list_api_keys(
        db, user_id=user_id, page=page, page_size=page_size
    )
    return paginated(
        [ApiKeyResponse.model_validate(k).model_dump() for k in items],
        total, page, page_size,
    )


@router.post("/api-keys", response_model=ApiKeyCreatedResponse, status_code=201)
async def create_api_key(
    payload: ApiKeyCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> ApiKeyCreatedResponse:
    api_key, full_key = await key_service.create_api_key(db, payload)
    resp = ApiKeyCreatedResponse(
        **ApiKeyResponse.model_validate(api_key).model_dump(),
        key=full_key,
    )
    return resp


@router.delete("/api-keys/{key_id}", status_code=204)
async def revoke_api_key(
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    api_key = await key_service.get_api_key(db, key_id)
    if api_key is None:
        raise HTTPException(status_code=404, detail="API key not found")
    await key_service.revoke_api_key(db, api_key)


__all__ = ["router"]
