"""Token estimation utilities for payload sizing.

Uses ``tiktoken`` for fast OpenAI-style token counting. For non-OpenAI models
the count is an approximation (cl100k_base), which is sufficient for the
splitting decision — the upstream provider performs the authoritative count.
"""

from __future__ import annotations

import functools


@functools.lru_cache(maxsize=8)
def _get_encoding(encoding_name: str = "cl100k_base"):
    import tiktoken

    return tiktoken.get_encoding(encoding_name)


def count_tokens(text: str, encoding_name: str = "cl100k_base") -> int:
    """Return the approximate token count for ``text``."""
    enc = _get_encoding(encoding_name)
    return len(enc.encode(text))


def count_messages_tokens(
    messages: list[dict[str, object]],
    encoding_name: str = "cl100k_base",
) -> int:
    """Approximate token count for a list of chat messages.

    Adds a per-message overhead of 4 tokens (role + delimiters) and 3 tokens
    for the conversation priming, mirroring OpenAI's documented heuristic.
    """
    enc = _get_encoding(encoding_name)
    total = 0
    for message in messages:
        total += 4
        for value in message.values():
            if isinstance(value, str):
                total += len(enc.encode(value))
            elif isinstance(value, list):
                for item in value:
                    if isinstance(item, dict) and "text" in item:
                        total += len(enc.encode(str(item["text"])))
    total += 3
    return total


__all__ = ["count_messages_tokens", "count_tokens"]
