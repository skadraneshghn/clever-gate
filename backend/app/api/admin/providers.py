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
    DeploymentInfo,
    ProviderCreate,
    ProviderInfo,
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
    """Run a manual health-check against the provider's first enabled deployment."""
    from sqlalchemy import select

    # Load the first enabled deployment for this provider
    result = await db.execute(
        select(Deployment)
        .where(Deployment.provider_id == provider_id)
        .where(Deployment.is_enabled.is_(True))
        .limit(1)
    )
    deployment = result.scalar_one_or_none()
    if deployment is None:
        raise HTTPException(status_code=404, detail="No enabled deployment for this provider")

    # Load the provider (for base_url)
    provider = await provider_service.get_provider(db, provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail="Provider not found")

    # Load the first enabled provider key so we can pass the API key to LiteLLM
    key_result = await db.execute(
        select(ProviderKey)
        .where(ProviderKey.provider_id == provider_id)
        .where(ProviderKey.is_enabled.is_(True))
        .limit(1)
    )
    provider_key = key_result.scalar_one_or_none()

    # Build litellm_params with the decrypted api_key and api_base
    litellm_params: dict = dict(deployment.litellm_params or {})
    if provider_key is not None:
        from app.utils.crypto import decrypt
        try:
            api_key = decrypt(provider_key.encrypted_key)
            litellm_params.setdefault("api_key", api_key)
        except Exception as exc:
            logger.error("test_provider.decrypt_failed", provider_key_id=str(provider_key.id), error=str(exc))
            raise HTTPException(status_code=500, detail="Failed to decrypt provider API key")

    # Merge params from provider.config (e.g. {"api_key": "..."} set via the
    # "Config (JSON)" field in the admin UI). ProviderKey-based key wins.
    for config_key, config_val in (provider.config or {}).items():
        litellm_params.setdefault(config_key, config_val)

    if provider.base_url:
        litellm_params.setdefault("api_base", provider.base_url)

    from app.providers.registry import get_registry

    adapter = get_registry().get_required("litellm")
    descriptor = {
        "litellm_model": deployment.litellm_model,
        "litellm_params": litellm_params,
    }

    logger.info(
        "test_provider.start",
        provider_id=str(provider_id),
        model=deployment.litellm_model,
        has_key=provider_key is not None,
    )

    healthy = await adapter.health_check(descriptor)
    if not healthy:
        logger.warning(
            "test_provider.unhealthy",
            provider_id=str(provider_id),
            model=deployment.litellm_model,
        )
        raise HTTPException(status_code=502, detail="Health check failed — see System Logs for the exact error")

    logger.info("test_provider.healthy", provider_id=str(provider_id), model=deployment.litellm_model)
    return {"healthy": True}



@router.get("/providers/{provider_id}/info", response_model=ProviderInfo)
async def get_provider_info(
    provider_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_admin_user),
) -> ProviderInfo:
    """Return LiteLLM model metadata + DB-tracked usage stats for a provider."""
    from sqlalchemy import select, func
    from app.db.models.tracking import RequestLog

    # --- Load provider ---
    provider = await provider_service.get_provider(db, provider_id)
    if provider is None:
        raise HTTPException(status_code=404, detail="Provider not found")

    # --- Load all deployments (enabled or not) for this provider ---
    from app.db.models.provider import Deployment
    dep_result = await db.execute(
        select(Deployment).where(Deployment.provider_id == provider_id)
    )
    deployments = dep_result.scalars().all()

    # --- Aggregate DB usage per deployment_id ---
    usage_result = await db.execute(
        select(
            RequestLog.deployment_id,
            func.count().label("requests"),
            func.coalesce(func.sum(RequestLog.prompt_tokens), 0).label("prompt_tokens"),
            func.coalesce(func.sum(RequestLog.completion_tokens), 0).label("completion_tokens"),
            func.coalesce(func.sum(RequestLog.cost_usd), 0).label("cost_usd"),
        )
        .where(RequestLog.provider_id == provider_id)
        .group_by(RequestLog.deployment_id)
    )
    usage_by_dep: dict[str, dict] = {}
    for row in usage_result.all():
        key = str(row.deployment_id) if row.deployment_id else "__unknown__"
        usage_by_dep[key] = {
            "requests": int(row.requests),
            "prompt_tokens": int(row.prompt_tokens),
            "completion_tokens": int(row.completion_tokens),
            "cost_usd": float(row.cost_usd),
        }

    # --- Build per-deployment info ---
    import litellm
    deployment_infos: list[DeploymentInfo] = []
    for dep in deployments:
        dep_key = str(dep.id)
        usage = usage_by_dep.get(dep_key, {})

        # Fetch LiteLLM model metadata (returns None for unknown models)
        lm: dict = {}
        try:
            lm = litellm.get_model_info(dep.litellm_model) or {}
        except Exception:
            pass

        deployment_infos.append(DeploymentInfo(
            deployment_id=dep_key,
            model_name=dep.model_name,
            litellm_model=dep.litellm_model,
            max_input_tokens=lm.get("max_input_tokens"),
            max_output_tokens=lm.get("max_output_tokens"),
            input_cost_per_token=lm.get("input_cost_per_token"),
            output_cost_per_token=lm.get("output_cost_per_token"),
            supports_streaming=lm.get("supports_streaming"),
            supports_function_calling=lm.get("supports_function_calling"),
            supports_vision=lm.get("supports_vision"),
            requests=usage.get("requests", 0),
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            cost_usd=usage.get("cost_usd", 0.0),
        ))

    # --- Compute provider-level totals ---
    total_req_result = await db.execute(
        select(func.count()).select_from(RequestLog)
        .where(RequestLog.provider_id == provider_id)
    )
    total_tok_result = await db.execute(
        select(func.coalesce(func.sum(RequestLog.total_tokens), 0))
        .where(RequestLog.provider_id == provider_id)
    )
    total_cost_result = await db.execute(
        select(func.coalesce(func.sum(RequestLog.cost_usd), 0))
        .where(RequestLog.provider_id == provider_id)
    )

    return ProviderInfo(
        provider_id=str(provider_id),
        provider_name=provider.name,
        total_requests=int(total_req_result.scalar() or 0),
        total_tokens=int(total_tok_result.scalar() or 0),
        total_cost_usd=float(total_cost_result.scalar() or 0),
        deployments=deployment_infos,
    )


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
