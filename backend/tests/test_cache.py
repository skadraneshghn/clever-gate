"""Tests for the L1 exact-match cache key computation."""

from app.cache.exact import cache_key, _normalize


def test_cache_key_is_deterministic():
    messages = [{"role": "user", "content": "hello"}]
    params = {"temperature": 0.7}
    k1 = cache_key("gpt-4o", messages, params)
    k2 = cache_key("gpt-4o", messages, params)
    assert k1 == k2


def test_cache_key_differs_by_model():
    messages = [{"role": "user", "content": "hello"}]
    k1 = cache_key("gpt-4o", messages, {})
    k2 = cache_key("claude-3", messages, {})
    assert k1 != k2


def test_cache_key_differs_by_message():
    k1 = cache_key("gpt-4o", [{"role": "user", "content": "a"}], {})
    k2 = cache_key("gpt-4o", [{"role": "user", "content": "b"}], {})
    assert k1 != k2


def test_normalize_sorts_dict_keys():
    assert _normalize({"b": 1, "a": 2}) == {"a": 2, "b": 1}


def test_normalize_strips_strings():
    assert _normalize("  hello  ") == "hello"
