"""Admin provider, deployment, and provider-key management endpoints."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import paginated
from app.auth.dependencies import get_current_admin_user
from app.db.models.provider import Deployment, Provider, ProviderKey
from app.db.models.user import User
from app.db.session import get_db
from app.observability.logging import get_logger
from app.providers.router_builder import get_router_builder
from app.schemas.admin import (
    DeploymentCreate,
    DeploymentResponse,
    DeploymentUpdate,
    ProviderCreate,
    ProviderKeyCreate,
    ProviderKeyResponse,
    ProviderResponse,
    ProviderUpdate,
)
from app.services import providers as provider_service

router = APIRouter()
logger = get_logger(__name__)


# --------------------------------------------------------------------------- #
# Providers
# --------------------------------------------------------------------------- #
@router.get("/providers", response_model=None)
async def list_providers(
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    items, total = await provider_service.list_providers(db, page=page, page_size=page_size)
    return paginated(
        [ProviderResponse.model_validate(p).model_dump() for p in items],
        total, page, page_size,
    )


@router.post("/providers", response_model=ProviderResponse, status_code=201)
async def create_provider(
    payload: ProviderCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> ProviderResponse:
    provider = await provider_service.create_provider(db, payload)
    await _reload_router()
    return ProviderResponse.model_validate(provider)


@router.get("/providers/{provider_id}", response_model=ProviderResponse)
async def get_provider(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> ProviderResponse:
    provider = await provider_service.get_provider(db, provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail="Provider not found")
    return ProviderResponse.model_validate(provider)


@router.patch("/providers/{provider_id}", response_model=ProviderResponse)
async def update_provider(
    provider_id: uuid.UUID,
    payload: ProviderUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> ProviderResponse:
    provider = await provider_service.get_provider(db, provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail="Provider not found")
    provider = await provider_service.update_provider(db, provider, payload)
    await _reload_router()
    return ProviderResponse.model_validate(provider)


@router.delete("/providers/{provider_id}", status_code=204)
async def delete_provider(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    provider = await provider_service.get_provider(db, provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail="Provider not found")
    await provider_service.delete_provider(db, provider)
    await _reload_router()


@router.post("/providers/{provider_id}/test")
async def test_provider(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """Run a manual health-check against the provider's first deployment."""
    from sqlalchemy import select

    result = await db.execute(
        select(Deployment)
        .where(Deployment.provider_id == provider_id)
        .where(Deployment.is_enabled.is_(True))
        .limit(1)
    )
    deployment = result.scalar_one_or_none()
    if deployment is None:
        raise HTTPException(status_code=404, detail="No enabled deployment for this provider")

    from app.providers.registry import get_registry

    adapter = get_registry().get_required("litellm")
    descriptor = {
        "litellm_model": deployment.litellm_model,
        "litellm_params": deployment.litellm_params or {},
    }
    healthy = await adapter.health_check(descriptor)
    return {"healthy": healthy}


# --------------------------------------------------------------------------- #
# Deployments
# --------------------------------------------------------------------------- #
@router.get("/deployments", response_model=None)
async def list_deployments(
    provider_id: uuid.UUID | None = None,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    items, total = await provider_service.list_deployments(
        db, provider_id=provider_id, page=page, page_size=page_size
    )
    return paginated(
        [DeploymentResponse.model_validate(d).model_dump() for d in items],
        total, page, page_size,
    )


@router.post("/deployments", response_model=DeploymentResponse, status_code=201)
async def create_deployment(
    payload: DeploymentCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> DeploymentResponse:
    deployment = await provider_service.create_deployment(db, payload)
    await _reload_router()
    return DeploymentResponse.model_validate(deployment)


@router.get("/deployments/{deployment_id}", response_model=DeploymentResponse)
async def get_deployment(
    deployment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> DeploymentResponse:
    deployment = await provider_service.get_deployment(db, deployment_id)
    if deployment is None:
        raise HTTPException(status_code=404, detail="Deployment not found")
    return DeploymentResponse.model_validate(deployment)


@router.patch("/deployments/{deployment_id}", response_model=DeploymentResponse)
async def update_deployment(
    deployment_id: uuid.UUID,
    payload: DeploymentUpdate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> DeploymentResponse:
    deployment = await provider_service.get_deployment(db, deployment_id)
    if deployment is None:
        raise HTTPException(status_code=404, detail="Deployment not found")
    deployment = await provider_service.update_deployment(db, deployment, payload)
    await _reload_router()
    return DeploymentResponse.model_validate(deployment)


@router.delete("/deployments/{deployment_id}", status_code=204)
async def delete_deployment(
    deployment_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    deployment = await provider_service.get_deployment(db, deployment_id)
    if deployment is None:
        raise HTTPException(status_code=404, detail="Deployment not found")
    await provider_service.delete_deployment(db, deployment)
    await _reload_router()


# --------------------------------------------------------------------------- #
# Provider keys
# --------------------------------------------------------------------------- #
@router.get("/provider-keys", response_model=None)
async def list_provider_keys(
    provider_id: uuid.UUID,
    page: int = 1,
    page_size: int = 50,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    items, total = await provider_service.list_provider_keys(
        db, provider_id=provider_id, page=page, page_size=page_size
    )
    serialized = []
    for key in items:
        resp = ProviderKeyResponse(
            id=key.id,
            provider_id=key.provider_id,
            label=key.label,
            key_prefix=provider_service.provider_key_prefix(key.encrypted_key),
            is_enabled=key.is_enabled,
            created_at=key.created_at,
        )
        serialized.append(resp.model_dump())
    return paginated(serialized, total, page, page_size)


@router.post("/provider-keys", response_model=ProviderKeyResponse, status_code=201)
async def create_provider_key(
    payload: ProviderKeyCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> ProviderKeyResponse:
    key = await provider_service.create_provider_key(db, payload)
    await _reload_router()
    return ProviderKeyResponse(
        id=key.id,
        provider_id=key.provider_id,
        label=key.label,
        key_prefix=provider_service.provider_key_prefix(key.encrypted_key),
        is_enabled=key.is_enabled,
        created_at=key.created_at,
    )


@router.delete("/provider-keys/{key_id}", status_code=204)
async def delete_provider_key(
    key_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    from sqlalchemy import select

    result = await db.execute(select(ProviderKey).where(ProviderKey.id == key_id))
    key = result.scalar_one_or_none()
    if key is None:
        raise HTTPException(status_code=404, detail="Provider key not found")
    await provider_service.delete_provider_key(db, key)
    await _reload_router()


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
async def _reload_router() -> None:
    """Trigger a hot reload of the LiteLLM router after config changes."""
    try:
        await get_router_builder().build()
    except Exception:
        logger.warning("admin.router_reload_failed")


__all__ = ["router"]
