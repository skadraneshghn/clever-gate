"""Tests for the virtual API key generation and hashing utilities."""

from app.auth.api_key import generate_api_key, hash_api_key, get_api_key_prefix


def test_generate_api_key_returns_tuple():
    full_key, key_hash, key_prefix = generate_api_key()
    assert full_key.startswith("sk-cg-")
    assert len(key_hash) == 64
    assert key_prefix == full_key[:12]


def test_hash_api_key_is_deterministic():
    key = "sk-cg-testkey123"
    assert hash_api_key(key) == hash_api_key(key)


def test_hash_api_key_different_inputs():
    assert hash_api_key("sk-cg-a") != hash_api_key("sk-cg-b")


def test_get_api_key_prefix():
    assert get_api_key_prefix("sk-cg-abcdef") == "sk-cg-abcdef"[:12]
