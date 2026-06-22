"""Admin API request and response schemas (Pydantic v2)."""

from __future__ import annotations

import uuid  # noqa: TC003  - required at runtime by Pydantic
from datetime import datetime  # noqa: TC003  - required at runtime by Pydantic
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


# --------------------------------------------------------------------------- #
# Auth
# --------------------------------------------------------------------------- #
class LoginRequest(BaseModel):
    """Admin login credentials with optional TOTP code."""

    username: str
    password: str
    totp_code: str | None = None


class TokenResponse(BaseModel):
    """JWT access + refresh token pair."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class RefreshRequest(BaseModel):
    """Refresh token request."""

    refresh_token: str


# --------------------------------------------------------------------------- #
# Users
# --------------------------------------------------------------------------- #
class UserCreate(BaseModel):
    """Payload to create a new admin user."""

    username: str
    email: str
    password: str
    first_name: str | None = None
    last_name: str | None = None
    is_admin: bool = False
    is_active: bool = True


class UserUpdate(BaseModel):
    """Payload to partially update a user. All fields optional."""

    first_name: str | None = None
    last_name: str | None = None
    is_active: bool | None = None
    is_admin: bool | None = None


class UserResponse(BaseModel):
    """Public user representation."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    username: str
    email: str
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool
    is_admin: bool
    created_at: datetime
    last_login_at: datetime | None = None


# --------------------------------------------------------------------------- #
# Providers
# --------------------------------------------------------------------------- #
class ProviderCreate(BaseModel):
    """Payload to create a provider."""

    name: str
    adapter_type: str = "litellm"
    base_url: str | None = None
    config: dict[str, Any] = Field(default_factory=dict)
    is_enabled: bool = True


class ProviderUpdate(BaseModel):
    """Payload to partially update a provider. All fields optional."""

    name: str | None = None
    base_url: str | None = None
    config: dict[str, Any] | None = None
    is_enabled: bool | None = None


class ProviderResponse(BaseModel):
    """Provider representation."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    adapter_type: str
    base_url: str | None = None
    config: dict[str, Any]
    is_enabled: bool
    created_at: datetime
    updated_at: datetime


# --------------------------------------------------------------------------- #
# Deployments
# --------------------------------------------------------------------------- #
class DeploymentCreate(BaseModel):
    """Payload to create a deployment (model binding) under a provider."""

    provider_id: uuid.UUID
    model_name: str
    litellm_model: str
    litellm_params: dict[str, Any] = Field(default_factory=dict)
    tpm: int | None = None
    rpm: int | None = None
    context_window: int | None = None
    is_enabled: bool = True
    priority: int = 0


class DeploymentUpdate(BaseModel):
    """Payload to partially update a deployment. All fields optional."""

    model_name: str | None = None
    litellm_model: str | None = None
    litellm_params: dict[str, Any] | None = None
    tpm: int | None = None
    rpm: int | None = None
    context_window: int | None = None
    is_enabled: bool | None = None
    priority: int | None = None


class DeploymentResponse(BaseModel):
    """Deployment representation."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    provider_id: uuid.UUID
    model_name: str
    litellm_model: str
    litellm_params: dict[str, Any]
    tpm: int | None = None
    rpm: int | None = None
    context_window: int | None = None
    is_enabled: bool
    priority: int
    created_at: datetime
    updated_at: datetime


# --------------------------------------------------------------------------- #
# Provider keys
# --------------------------------------------------------------------------- #
class ProviderKeyCreate(BaseModel):
    """Payload to register a provider API key.

    The ``key_value`` is encrypted at rest and never returned by the API.
    """

    provider_id: uuid.UUID
    label: str
    key_value: str


class ProviderKeyResponse(BaseModel):
    """Provider key representation.

    Only a non-reversible ``key_prefix`` is ever exposed.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    provider_id: uuid.UUID
    label: str
    key_prefix: str
    is_enabled: bool
    created_at: datetime


# --------------------------------------------------------------------------- #
# API keys (virtual keys)
# --------------------------------------------------------------------------- #
class ApiKeyCreate(BaseModel):
    """Payload to create a virtual API key for a user."""

    user_id: uuid.UUID
    name: str | None = None
    team_id: uuid.UUID | None = None
    allowed_models: list[str] | None = None
    expires_at: datetime | None = None


class ApiKeyResponse(BaseModel):
    """Virtual API key representation (no secret)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    key_prefix: str
    name: str | None = None
    user_id: uuid.UUID
    team_id: uuid.UUID | None = None
    allowed_models: list[str] | None = None
    is_active: bool
    expires_at: datetime | None = None
    created_at: datetime
    last_used_at: datetime | None = None


class ApiKeyCreatedResponse(ApiKeyResponse):
    """Response returned exactly once on API key creation.

    Includes the full ``key`` value which is never retrievable again.
    """

    key: str


# --------------------------------------------------------------------------- #
# Health & metrics
# --------------------------------------------------------------------------- #
class ProviderHealthResponse(BaseModel):
    """Health snapshot for a provider."""

    provider_id: uuid.UUID
    is_healthy: bool
    error_rate: float | None = None
    avg_latency_ms: float | None = None
    last_error: str | None = None
    last_check_at: datetime


class DashboardMetrics(BaseModel):
    """Aggregate metrics for the admin dashboard."""

    total_requests: int
    total_tokens: int
    total_cost_usd: float
    cache_hit_rate: float
    active_keys: int
    error_rate: float
    rps: float
    avg_latency_ms: float


# --------------------------------------------------------------------------- #
# Pagination
# --------------------------------------------------------------------------- #
class PaginationMeta(BaseModel):
    """Pagination metadata for list responses."""

    page: int
    page_size: int
    total: int
    total_pages: int


class PaginatedResponse[T](BaseModel):
    """Generic paginated list response."""

    items: list[T]
    pagination: PaginationMeta
