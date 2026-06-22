"""Provider, deployment, and provider key models."""

from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import BYTEA, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class Provider(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "providers"

    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    adapter_type: Mapped[str] = mapped_column(String(100), nullable=False, default="litellm")
    base_url: Mapped[str | None] = mapped_column(Text)
    config: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    deployments: Mapped[list["Deployment"]] = relationship(back_populates="provider", cascade="all, delete-orphan")
    keys: Mapped[list["ProviderKey"]] = relationship(back_populates="provider", cascade="all, delete-orphan")


class Deployment(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "deployments"

    provider_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("providers.id", ondelete="CASCADE"), nullable=False)
    model_name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    litellm_model: Mapped[str] = mapped_column(String(300), nullable=False)
    litellm_params: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    tpm: Mapped[int | None] = mapped_column(Integer)
    rpm: Mapped[int | None] = mapped_column(Integer)
    context_window: Mapped[int | None] = mapped_column(Integer)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    priority: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    provider: Mapped["Provider"] = relationship(back_populates="deployments")


class ProviderKey(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "provider_keys"

    provider_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("providers.id", ondelete="CASCADE"), nullable=False)
    label: Mapped[str] = mapped_column(String(200), nullable=False)
    encrypted_key: Mapped[bytes] = mapped_column(BYTEA, nullable=False)
    key_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    provider: Mapped["Provider"] = relationship(back_populates="keys")


class ModelAlias(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "model_aliases"

    alias: Mapped[str] = mapped_column(String(200), unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)


class RoutingRule(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "routing_rules"

    model_alias: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    routing_strategy: Mapped[str] = mapped_column(String(100), default="simple-shuffle", nullable=False)
    fallbacks: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    context_window_fallbacks: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)
    num_retries: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    timeout: Mapped[int] = mapped_column(Integer, default=60, nullable=False)
    is_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
