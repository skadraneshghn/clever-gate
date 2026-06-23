"""System log model with pgvector semantic search support.

Stores every functional event in the gateway — internal structlog events and
third-party library logs (LiteLLM, HTTPX, etc.) — with structured JSONB
context and a dense vector embedding for semantic similarity search.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector

from app.db.base import Base, UUIDMixin

_EMBEDDING_DIMS = 384


class SystemLog(UUIDMixin, Base):
    """A single system log event with structured context and semantic embedding."""

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
    embedding: Mapped[list[float] | None] = mapped_column(
        Vector(_EMBEDDING_DIMS), nullable=True,
    )

    __table_args__ = (
        Index("ix_system_logs_context", "context", postgresql_using="gin"),
        Index(
            "ix_system_logs_embedding_hnsw",
            "embedding",
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        ),
        Index("ix_system_logs_level_timestamp", "level", "timestamp"),
    )


__all__ = ["SystemLog"]
