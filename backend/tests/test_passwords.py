"""Tests for password hashing and verification."""

from app.auth.passwords import hash_password, verify_password


def test_hash_and_verify_password():
    plain = "my-secret-password"
    hashed = hash_password(plain)
    assert hashed != plain
    assert verify_password(plain, hashed) is True


def test_verify_wrong_password():
    hashed = hash_password("correct")
    assert verify_password("wrong", hashed) is False


def test_hashes_are_unique():
    assert hash_password("same") != hash_password("same")
