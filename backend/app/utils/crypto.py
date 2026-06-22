"""Symmetric encryption for provider API keys at rest (Fernet/AES)."""

from __future__ import annotations

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings

_fernet: Fernet | None = None


def _get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = get_settings().CG_ENCRYPTION_KEY
        if not key:
            raise RuntimeError(
                "CG_ENCRYPTION_KEY is not set. Generate one with: "
                "python -c \"from cryptography.fernet import Fernet; "
                "print(Fernet.generate_key().decode())\""
            )
        _fernet = Fernet(key.encode())
    return _fernet


def encrypt(plaintext: str) -> bytes:
    """Encrypt a plaintext string, returning the Fernet token as bytes."""
    return _get_fernet().encrypt(plaintext.encode("utf-8"))


def decrypt(token: bytes) -> str:
    """Decrypt a Fernet token back to the original plaintext string.

    Raises:
        InvalidToken: If the token is corrupt or was encrypted with a different key.
    """
    return _get_fernet().decrypt(token).decode("utf-8")


def hash_key(value: str) -> str:
    """Return a non-reversible SHA-256 digest of a provider key for dedup/lookup."""
    import hashlib

    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def key_prefix(value: str) -> str:
    """Return a non-secret display prefix of a provider key."""
    return value[:8] + "..." if len(value) > 8 else value + "..."


__all__ = ["InvalidToken", "decrypt", "encrypt", "hash_key", "key_prefix"]
