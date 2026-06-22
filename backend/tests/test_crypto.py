"""Tests for the encryption utility (Fernet)."""

import pytest

from app.utils.crypto import decrypt, encrypt, hash_key, key_prefix


@pytest.fixture(autouse=True)
def _set_encryption_key(monkeypatch):
    from cryptography.fernet import Fernet

    key = Fernet.generate_key().decode()
    monkeypatch.setenv("CG_ENCRYPTION_KEY", key)
    # Reset the cached fernet
    import app.utils.crypto

    app.utils.crypto._fernet = None
    yield
    app.utils.crypto._fernet = None


def test_encrypt_decrypt_roundtrip():
    plaintext = "sk-provider-secret-key-12345"
    token = encrypt(plaintext)
    assert isinstance(token, bytes)
    assert token != plaintext.encode()
    assert decrypt(token) == plaintext


def test_hash_key_is_deterministic():
    assert hash_key("abc") == hash_key("abc")


def test_hash_key_differs():
    assert hash_key("abc") != hash_key("abd")


def test_key_prefix_truncates():
    assert key_prefix("sk-1234567890") == "sk-12345..."
    assert key_prefix("short") == "short..."
