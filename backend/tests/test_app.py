"""Smoke tests for the FastAPI app and OpenAI-compatible endpoints."""

from __future__ import annotations


async def test_health_live_async(client):
    """The /health/live endpoint should return 200."""
    resp = await client.get("/health/live")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_health_root(client):
    """The /health endpoint should return 200."""
    resp = await client.get("/health")
    assert resp.status_code == 200


async def test_v1_models_requires_auth(client):
    """The /v1/models endpoint should reject requests without a key."""
    resp = await client.get("/v1/models")
    assert resp.status_code == 401


async def test_chat_completions_requires_auth(client):
    """The /v1/chat/completions endpoint should reject requests without a key."""
    resp = await client.post(
        "/v1/chat/completions",
        json={"model": "gpt-4o", "messages": [{"role": "user", "content": "hi"}]},
    )
    assert resp.status_code == 401


async def test_admin_login_requires_credentials(client):
    """The admin login endpoint should return 401 for bad credentials."""
    resp = await client.post(
        "/api/admin/auth/login",
        json={"username": "nonexistent", "password": "wrong"},
    )
    assert resp.status_code == 401


async def test_openapi_docs_available_in_dev(client):
    """The OpenAPI docs should be available in development mode."""
    resp = await client.get("/docs")
    assert resp.status_code == 200
