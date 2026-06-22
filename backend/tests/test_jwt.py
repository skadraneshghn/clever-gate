"""Tests for JWT creation and verification."""

from datetime import datetime
from types import SimpleNamespace

from app.auth.jwt import create_access_token, create_refresh_token, decode_token


def _fake_user():
    return SimpleNamespace(
        id="00000000-0000-0000-0000-000000000001",
        username="testadmin",
        is_admin=True,
    )


def test_create_and_decode_access_token():
    user = _fake_user()
    token = create_access_token(user)
    payload = decode_token(token)
    assert payload["sub"] == str(user.id)
    assert payload["username"] == "testadmin"
    assert payload["is_admin"] is True
    assert payload["type"] == "access"


def test_create_and_decode_refresh_token():
    user = _fake_user()
    token = create_refresh_token(user)
    payload = decode_token(token)
    assert payload["type"] == "refresh"


def test_decode_invalid_token_raises():
    import pytest

    with pytest.raises(ValueError):
        decode_token("not.a.valid.token")
