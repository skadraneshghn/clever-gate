"""Lightweight text embedding for semantic log search.

Uses a feature-hashing approach (the "hashing trick") to produce a fixed-size
dense vector from log text.  Each token is hashed to a dimension; the value
is the token frequency, L2-normalised.  This gives sub-millisecond embedding
generation with zero external dependencies and runs safely in the
ProcessPoolExecutor.

The 384-dimension output matches ``all-MiniLM-L6-v2`` so the embedding
function can be upgraded to a neural model later without a schema change.
"""

from __future__ import annotations

import hashlib
import math
import re
from collections import Counter

_EMBEDDING_DIMS = 384
_TOKEN_RE = re.compile(r"[a-zA-Z_][a-zA-Z0-9_]{1,}")


def embed_text(text: str, dims: int = _EMBEDDING_DIMS) -> list[float]:
    """Convert *text* into a fixed-size L2-normalised float vector.

    Tokenises on word boundaries, hashes each token to a dimension, and
    accumulates counts.  The result is L2-normalised for cosine similarity.
    """
    if not text:
        return [0.0] * dims

    tokens = _TOKEN_RE.findall(text.lower())
    if not tokens:
        return [0.0] * dims

    counts: Counter[int] = Counter()
    for token in tokens:
        h = int(hashlib.md5(token.encode()).hexdigest(), 16)  # noqa: S324
        counts[h % dims] += 1

    vec = [0.0] * dims
    for idx, count in counts.items():
        vec[idx] = float(count)

    norm = math.sqrt(sum(v * v for v in vec))
    if norm > 0:
        vec = [v / norm for v in vec]

    return vec


__all__ = ["embed_text", "_EMBEDDING_DIMS"]
