"""Admin API router — all admin endpoints under ``/api/admin``."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.admin import auth, dashboard, keys, providers, users

router = APIRouter(prefix="/api/admin")
router.include_router(auth.router, prefix="/auth", tags=["admin-auth"])
router.include_router(providers.router, tags=["admin-providers"])
router.include_router(users.router, tags=["admin-users"])
router.include_router(keys.router, tags=["admin-keys"])
router.include_router(dashboard.router, tags=["admin-dashboard"])

__all__ = ["router"]
