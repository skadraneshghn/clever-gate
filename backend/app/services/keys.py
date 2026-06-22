"""Virtual API key management service."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.api_key import generate_api_key
from app.db.models.api_key import ApiKey
from app.schemas.admin import ApiKeyCreate


async def list_api_keys(
    db: AsyncSession,
    *,
    user_id: uuid.UUID | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[ApiKey], int]:
    stmt = select(ApiKey)
    count_stmt = select(func.count()).select_from(ApiKey)
    if user_id is not None:
        stmt = stmt.where(ApiKey.user_id == user_id)
        count_stmt = count_stmt.where(ApiKey.user_id == user_id)

    total = await db.scalar(count_stmt)
    offset = (page - 1) * page_size
    result = await db.execute(
        stmt.order_by(ApiKey.created_at.desc()).offset(offset).limit(page_size)
    )
    return list(result.scalars().all()), int(total or 0)


async def get_api_key(db: AsyncSession, key_id: uuid.UUID) -> ApiKey | None:
    result = await db.execute(select(ApiKey).where(ApiKey.id == key_id))
    return result.scalar_one_or_none()


async def create_api_key(
    db: AsyncSession, payload: ApiKeyCreate
) -> tuple[ApiKey, str]:
    """Create a new virtual API key. Returns (record, full_key).

    The full key is returned only here — it is never retrievable again.
    """
    full_key, key_hash, key_prefix = generate_api_key()
    api_key = ApiKey(
        user_id=payload.user_id,
        team_id=payload.team_id,
        key_hash=key_hash,
        key_prefix=key_prefix,
        name=payload.name,
        allowed_models=payload.allowed_models,
        is_active=True,
        expires_at=payload.expires_at,
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)
    return api_key, full_key


async def revoke_api_key(db: AsyncSession, api_key: ApiKey) -> None:
    """Soft-revoke an API key by setting ``is_active = False``."""
    api_key.is_active = False
    await db.commit()


async def list_models_for_key(api_key: ApiKey) -> list[str] | None:
    """Return the allowed-models list for a key (``None`` = all models)."""
    return api_key.allowed_models


__all__ = [
    "create_api_key",
    "get_api_key",
    "list_api_keys",
    "list_models_for_key",
    "revoke_api_key",
]
