"""Admin JWT token creation and verification."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import TYPE_CHECKING, Any, Literal

from jose import JWTError, jwt

from app.config import get_settings

if TYPE_CHECKING:
    from app.db.models.user import User

TokenType = Literal["access", "refresh"]


def _create_token(user: User, token_type: TokenType, expires_delta: timedelta) -> str:
    """Build and encode a signed JWT for the given user."""
    settings = get_settings()
    now = datetime.now(timezone.utc)
    payload: dict[str, Any] = {
        "sub": str(user.id),
        "username": user.username,
        "is_admin": user.is_admin,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    return jwt.encode(payload, settings.CG_JWT_SECRET, algorithm=settings.CG_JWT_ALGORITHM)


def create_access_token(user: User) -> str:
    """Create a short-lived access token for an admin user."""
    settings = get_settings()
    return _create_token(user, "access", timedelta(minutes=settings.CG_JWT_ACCESS_EXPIRE_MINUTES))


def create_refresh_token(user: User) -> str:
    """Create a longer-lived refresh token for an admin user."""
    settings = get_settings()
    return _create_token(user, "refresh", timedelta(days=settings.CG_JWT_REFRESH_EXPIRE_DAYS))


def create_token_pair(user: User) -> tuple[str, str]:
    """Create and return an (access_token, refresh_token) pair."""
    return create_access_token(user), create_refresh_token(user)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and verify a JWT, returning its payload.

    Raises:
        ValueError: If the token is invalid, expired, or cannot be decoded.
    """
    settings = get_settings()
    try:
        payload: dict[str, Any] = jwt.decode(
            token,
            settings.CG_JWT_SECRET,
            algorithms=[settings.CG_JWT_ALGORITHM],
        )
    except JWTError as exc:
        raise ValueError("Invalid or expired token") from exc
    return payload
