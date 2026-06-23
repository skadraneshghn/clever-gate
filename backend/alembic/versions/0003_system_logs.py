"""System logs table with pgvector semantic search.

Revision ID: 0003
Revises: 0002
Create Date: 2025-06-23 00:00:00

The pgvector extension is optional — if the PostgreSQL instance does not
support it, the table is created without the embedding column and the
system falls back to text-only search.
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _pgvector_available() -> bool:
    """Check whether the pgvector extension can be installed."""
    bind = op.get_bind()
    try:
        bind.execute(sa.text("CREATE EXTENSION IF NOT EXISTS vector"))
        return True
    except Exception:
        return False


def upgrade() -> None:
    has_vector = _pgvector_available()

    columns = [
        sa.Column(
            "id",
            sa.dialects.postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("uuid_generate_v4()"),
        ),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("level", sa.String(20), nullable=False),
        sa.Column("logger_name", sa.String(255), nullable=False),
        sa.Column("message", sa.Text, nullable=False),
        sa.Column(
            "context",
            sa.dialects.postgresql.JSONB,
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    ]

    if has_vector:
        from pgvector.sqlalchemy import Vector

        columns.append(sa.Column("embedding", Vector(384), nullable=True))

    op.create_table("system_logs", *columns)

    op.create_index("ix_system_logs_timestamp", "system_logs", ["timestamp"])
    op.create_index("ix_system_logs_level", "system_logs", ["level"])
    op.create_index("ix_system_logs_logger_name", "system_logs", ["logger_name"])
    op.create_index(
        "ix_system_logs_context",
        "system_logs",
        ["context"],
        postgresql_using="gin",
    )
    op.create_index(
        "ix_system_logs_level_timestamp",
        "system_logs",
        ["level", "timestamp"],
    )

    if has_vector:
        op.create_index(
            "ix_system_logs_embedding_hnsw",
            "system_logs",
            ["embedding"],
            postgresql_using="hnsw",
            postgresql_with={"m": 16, "ef_construction": 64},
            postgresql_ops={"embedding": "vector_cosine_ops"},
        )


def downgrade() -> None:
    try:
        op.drop_index("ix_system_logs_embedding_hnsw", table_name="system_logs")
    except Exception:
        pass
    op.drop_index("ix_system_logs_level_timestamp", table_name="system_logs")
    op.drop_index("ix_system_logs_context", table_name="system_logs")
    op.drop_index("ix_system_logs_logger_name", table_name="system_logs")
    op.drop_index("ix_system_logs_level", table_name="system_logs")
    op.drop_index("ix_system_logs_timestamp", table_name="system_logs")
    op.drop_table("system_logs")
