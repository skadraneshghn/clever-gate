"""System log model.

Stores every functional event in the gateway — internal structlog events and
third-party library logs (LiteLLM, HTTPX, etc.) — with structured JSONB
context.

The optional ``embedding`` column (pgvector) is created by the migration
only when the PostgreSQL ``vector`` extension is available.  Embedding
operations are handled via raw SQL to avoid a hard model dependency.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, UUIDMixin


class SystemLog(UUIDMixin, Base):
    """A single system log event with structured context."""

    __tablename__ = "system_logs"

    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
    )
    level: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    logger_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    context: Mapped[dict] = mapped_column(JSONB, default=dict, nullable=False)

    __table_args__ = (
        Index("ix_system_logs_context", "context", postgresql_using="gin"),
        Index("ix_system_logs_level_timestamp", "level", "timestamp"),
    )


__all__ = ["SystemLog"]
