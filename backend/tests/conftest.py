"""Test fixtures shared across the test suite."""

from __future__ import annotations

import asyncio
import os
from collections.abc import AsyncGenerator

import pytest
from httpx import ASGITransport, AsyncClient

# Set test environment before importing the app
os.environ.setdefault("CG_ENV", "test")
os.environ.setdefault("CG_JWT_SECRET", "test-secret")
os.environ.setdefault("CG_MASTER_KEY", "sk-cg-master-test")
os.environ.setdefault("CG_ENCRYPTION_KEY", "")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test.db")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/15")


@pytest.fixture(scope="session")
def event_loop():
    """Create a single event loop for the entire test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    """HTTP client wired to the FastAPI app (no network)."""
    from app.main import create_app

    app = create_app()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
