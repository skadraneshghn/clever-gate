"""Admin account seed.

Revision ID: 0002
Revises: 0001
Create Date: 2025-01-01 00:00:01

"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Insert the bootstrap admin user if it does not already exist.

    Credentials are read from the application environment (CG_ADMIN_*).
    The password is hashed with argon2 via passlib.
    """
    from app.config import get_settings
    from app.auth.passwords import hash_password

    settings = get_settings()
    bind = op.get_bind()

    existing = bind.execute(
        sa.text("SELECT 1 FROM users WHERE username = :u"),
        {"u": settings.CG_ADMIN_USERNAME},
    ).scalar()

    if existing:
        return

    bind.execute(
        sa.text(
            "INSERT INTO users (username, email, password_hash, "
            "first_name, last_name, is_active, is_admin) "
            "VALUES (:u, :e, :p, :fn, :ln, TRUE, TRUE)"
        ),
        {
            "u": settings.CG_ADMIN_USERNAME,
            "e": settings.CG_ADMIN_EMAIL,
            "p": hash_password(settings.CG_ADMIN_PASSWORD),
            "fn": settings.CG_ADMIN_FIRST_NAME,
            "ln": settings.CG_ADMIN_LAST_NAME,
        },
    )


def downgrade() -> None:
    from app.config import get_settings

    settings = get_settings()
    op.execute(
        sa.text("DELETE FROM users WHERE username = :u").bindparams(
            u=settings.CG_ADMIN_USERNAME
        )
    )
