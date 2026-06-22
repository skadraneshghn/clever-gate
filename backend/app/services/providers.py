"""Provider, deployment, and provider-key management service."""

from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.provider import Deployment, Provider, ProviderKey
from app.schemas.admin import (
    DeploymentCreate,
    DeploymentUpdate,
    ProviderCreate,
    ProviderKeyCreate,
    ProviderUpdate,
)
from app.utils.crypto import encrypt, hash_key, key_prefix


# --------------------------------------------------------------------------- #
# Providers
# --------------------------------------------------------------------------- #
async def list_providers(
    db: AsyncSession, *, page: int = 1, page_size: int = 50
) -> tuple[list[Provider], int]:
    total = await db.scalar(select(func.count()).select_from(Provider))
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Provider).order_by(Provider.created_at.desc()).offset(offset).limit(page_size)
    )
    return list(result.scalars().all()), int(total or 0)


async def get_provider(db: AsyncSession, provider_id: uuid.UUID) -> Provider | None:
    result = await db.execute(select(Provider).where(Provider.id == provider_id))
    return result.scalar_one_or_none()


async def create_provider(db: AsyncSession, payload: ProviderCreate) -> Provider:
    provider = Provider(
        name=payload.name,
        adapter_type=payload.adapter_type,
        base_url=payload.base_url,
        config=payload.config,
        is_enabled=payload.is_enabled,
    )
    db.add(provider)
    await db.commit()
    await db.refresh(provider)
    return provider


async def update_provider(
    db: AsyncSession, provider: Provider, payload: ProviderUpdate
) -> Provider:
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(provider, field, value)
    await db.commit()
    await db.refresh(provider)
    return provider


async def delete_provider(db: AsyncSession, provider: Provider) -> None:
    await db.delete(provider)
    await db.commit()


# --------------------------------------------------------------------------- #
# Deployments
# --------------------------------------------------------------------------- #
async def list_deployments(
    db: AsyncSession,
    *,
    provider_id: uuid.UUID | None = None,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[Deployment], int]:
    stmt = select(Deployment)
    count_stmt = select(func.count()).select_from(Deployment)
    if provider_id is not None:
        stmt = stmt.where(Deployment.provider_id == provider_id)
        count_stmt = count_stmt.where(Deployment.provider_id == provider_id)

    total = await db.scalar(count_stmt)
    offset = (page - 1) * page_size
    result = await db.execute(
        stmt.order_by(Deployment.priority.desc(), Deployment.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return list(result.scalars().all()), int(total or 0)


async def get_deployment(db: AsyncSession, deployment_id: uuid.UUID) -> Deployment | None:
    result = await db.execute(select(Deployment).where(Deployment.id == deployment_id))
    return result.scalar_one_or_none()


async def create_deployment(db: AsyncSession, payload: DeploymentCreate) -> Deployment:
    deployment = Deployment(
        provider_id=payload.provider_id,
        model_name=payload.model_name,
        litellm_model=payload.litellm_model,
        litellm_params=payload.litellm_params,
        tpm=payload.tpm,
        rpm=payload.rpm,
        context_window=payload.context_window,
        is_enabled=payload.is_enabled,
        priority=payload.priority,
    )
    db.add(deployment)
    await db.commit()
    await db.refresh(deployment)
    return deployment


async def update_deployment(
    db: AsyncSession, deployment: Deployment, payload: DeploymentUpdate
) -> Deployment:
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(deployment, field, value)
    await db.commit()
    await db.refresh(deployment)
    return deployment


async def delete_deployment(db: AsyncSession, deployment: Deployment) -> None:
    await db.delete(deployment)
    await db.commit()


# --------------------------------------------------------------------------- #
# Provider keys
# --------------------------------------------------------------------------- #
async def list_provider_keys(
    db: AsyncSession, *, provider_id: uuid.UUID, page: int = 1, page_size: int = 50
) -> tuple[list[ProviderKey], int]:
    total = await db.scalar(
        select(func.count()).select_from(ProviderKey).where(ProviderKey.provider_id == provider_id)
    )
    offset = (page - 1) * page_size
    result = await db.execute(
        select(ProviderKey)
        .where(ProviderKey.provider_id == provider_id)
        .order_by(ProviderKey.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return list(result.scalars().all()), int(total or 0)


async def create_provider_key(
    db: AsyncSession, payload: ProviderKeyCreate
) -> ProviderKey:
    key = ProviderKey(
        provider_id=payload.provider_id,
        label=payload.label,
        encrypted_key=encrypt(payload.key_value),
        key_hash=hash_key(payload.key_value),
        is_enabled=True,
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)
    return key


async def delete_provider_key(db: AsyncSession, key: ProviderKey) -> None:
    await db.delete(key)
    await db.commit()


def provider_key_prefix(encrypted: bytes) -> str:
    """Best-effort prefix display — tries to decrypt, falls back to hash."""
    from app.utils.crypto import decrypt, InvalidToken

    try:
        value = decrypt(encrypted)
        return key_prefix(value)
    except (InvalidToken, RuntimeError):
        return "********"


__all__ = [
    "create_deployment",
    "create_provider",
    "create_provider_key",
    "delete_deployment",
    "delete_provider",
    "delete_provider_key",
    "get_deployment",
    "get_provider",
    "list_deployments",
    "list_provider_keys",
    "list_providers",
    "provider_key_prefix",
    "update_deployment",
    "update_provider",
]
