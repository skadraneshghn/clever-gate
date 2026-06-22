"""User management service."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.passwords import hash_password
from app.db.models.user import User
from app.schemas.admin import UserCreate, UserUpdate


async def list_users(
    db: AsyncSession,
    *,
    page: int = 1,
    page_size: int = 50,
) -> tuple[list[User], int]:
    """Return a paginated list of users and the total count."""
    total = await db.scalar(select(func.count()).select_from(User))
    offset = (page - 1) * page_size
    result = await db.execute(
        select(User)
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    return list(result.scalars().all()), int(total or 0)


async def get_user(db: AsyncSession, user_id: uuid.UUID) -> User | None:
    """Return a single user by id or ``None``."""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    """Return a single user by username or ``None``."""
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def create_user(db: AsyncSession, payload: UserCreate) -> User:
    """Create and persist a new user."""
    user = User(
        username=payload.username,
        email=payload.email,
        password_hash=hash_password(payload.password),
        first_name=payload.first_name,
        last_name=payload.last_name,
        is_active=payload.is_active,
        is_admin=payload.is_admin,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update_user(
    db: AsyncSession, user: User, payload: UserUpdate
) -> User:
    """Partially update a user in place."""
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(user, field, value)
    await db.commit()
    await db.refresh(user)
    return user


async def delete_user(db: AsyncSession, user: User) -> None:
    """Delete a user."""
    await db.delete(user)
    await db.commit()


async def touch_last_login(db: AsyncSession, user: User) -> None:
    """Update the user's ``last_login_at`` timestamp to now."""
    user.last_login_at = datetime.now(timezone.utc)
    await db.commit()


async def ensure_admin_seed(db: AsyncSession) -> User | None:
    """Create the bootstrap admin if it does not already exist.

    Reads credentials from :class:`~app.config.Settings`. Returns the user
    (existing or newly created) or ``None`` if creation was skipped.
    """
    from app.config import get_settings

    settings = get_settings()
    existing = await get_user_by_username(db, settings.CG_ADMIN_USERNAME)
    if existing is not None:
        return existing

    user = User(
        username=settings.CG_ADMIN_USERNAME,
        email=settings.CG_ADMIN_EMAIL,
        password_hash=hash_password(settings.CG_ADMIN_PASSWORD),
        first_name=settings.CG_ADMIN_FIRST_NAME,
        last_name=settings.CG_ADMIN_LAST_NAME,
        is_active=True,
        is_admin=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


__all__ = [
    "create_user",
    "delete_user",
    "ensure_admin_seed",
    "get_user",
    "get_user_by_username",
    "list_users",
    "touch_last_login",
    "update_user",
]
