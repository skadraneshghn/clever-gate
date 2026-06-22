"""Admin auth endpoints — login, refresh, logout."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import get_current_admin_user
from app.auth.jwt import create_token_pair, decode_token
from app.config import get_settings
from app.db.models.user import User
from app.db.session import get_db
from app.observability.logging import get_logger
from app.schemas.admin import LoginRequest, RefreshRequest, TokenResponse
from app.services.users import get_user_by_username, touch_last_login
from app.auth.passwords import verify_password

router = APIRouter()
logger = get_logger(__name__)


@router.post("/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Authenticate an admin user and return a JWT token pair."""
    user = await get_user_by_username(db, payload.username)

    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled",
        )

    if user.totp_secret and not payload.totp_code:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="TOTP code required",
        )

    await touch_last_login(db, user)

    access, refresh_token = create_token_pair(user)
    settings = get_settings()
    logger.info("admin.login", user_id=str(user.id), username=user.username)

    return TokenResponse(
        access_token=access,
        refresh_token=refresh_token,
        expires_in=settings.CG_JWT_ACCESS_EXPIRE_MINUTES * 60,
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Exchange a refresh token for a new access token pair."""
    try:
        decoded = decode_token(payload.refresh_token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        ) from exc

    if decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
        )

    from sqlalchemy import select

    result = await db.execute(
        select(User).where(User.id == decoded["sub"])
    )
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )

    access, new_refresh = create_token_pair(user)
    settings = get_settings()
    return TokenResponse(
        access_token=access,
        refresh_token=new_refresh,
        expires_in=settings.CG_JWT_ACCESS_EXPIRE_MINUTES * 60,
    )


@router.post("/logout")
async def logout(
    user: User = Depends(get_current_admin_user),
) -> dict[str, bool]:
    """Logout (stateless JWT — client simply discards the token)."""
    logger.info("admin.logout", user_id=str(user.id))
    return {"ok": True}


@router.get("/me")
async def me(
    user: User = Depends(get_current_admin_user),
) -> dict:
    """Return the current admin user's profile."""
    return {
        "id": str(user.id),
        "username": user.username,
        "email": user.email,
        "is_admin": user.is_admin,
        "first_name": user.first_name,
        "last_name": user.last_name,
    }


__all__ = ["router"]
