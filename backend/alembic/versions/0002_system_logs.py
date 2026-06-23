"""System logs table with pgvector semantic search.

Revision ID: 0002
Revises: 0001
Create Date: 2025-06-23 00:00:00
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.create_table(
        "system_logs",
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
        sa.Column("embedding", Vector(384), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
    )

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
    op.create_index(
        "ix_system_logs_embedding_hnsw",
        "system_logs",
        ["embedding"],
        postgresql_using="hnsw",
        postgresql_with={"m": 16, "ef_construction": 64},
        postgresql_ops={"embedding": "vector_cosine_ops"},
    )


def downgrade() -> None:
    op.drop_index("ix_system_logs_embedding_hnsw", table_name="system_logs")
    op.drop_index("ix_system_logs_level_timestamp", table_name="system_logs")
    op.drop_index("ix_system_logs_context", table_name="system_logs")
    op.drop_index("ix_system_logs_logger_name", table_name="system_logs")
    op.drop_index("ix_system_logs_level", table_name="system_logs")
    op.drop_index("ix_system_logs_timestamp", table_name="system_logs")
    op.drop_table("system_logs")
