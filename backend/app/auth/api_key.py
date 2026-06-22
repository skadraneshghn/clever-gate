"""Virtual API key generation and verification."""

from __future__ import annotations

import hashlib
import secrets

_KEY_PREFIX = "sk-cg-"
_RANDOM_HEX_LENGTH = 48


def generate_api_key() -> tuple[str, str, str]:
    """Generate a new virtual API key.

    Returns:
        A tuple of (full_key, key_hash, key_prefix) where ``full_key`` is the
        complete key shown to the user once, ``key_hash`` is the sha256 digest
        stored in the database, and ``key_prefix`` is a non-secret prefix used
        for display and identification.
    """
    random_hex = secrets.token_hex(_RANDOM_HEX_LENGTH // 2)
    full_key = f"{_KEY_PREFIX}{random_hex}"
    return full_key, hash_api_key(full_key), get_api_key_prefix(full_key)


def hash_api_key(key: str) -> str:
    """Return the sha256 hexdigest of a full API key."""
    return hashlib.sha256(key.encode("utf-8")).hexdigest()


def get_api_key_prefix(key: str) -> str:
    """Return the non-secret display prefix of a full API key."""
    return key[:12]
