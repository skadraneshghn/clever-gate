"""Map/reduce aggregation for large payload splitting.

Phase 3 feature. The hooks are defined here so the core engine can call into
them later without structural changes. In phase 1 the aggregator is a no-op
passthrough.
"""

from __future__ import annotations

import asyncio
from typing import Any

from app.observability.logging import get_logger

logger = get_logger(__name__)


async def map_reduce_split(
    messages: list[dict[str, Any]],
    max_chunk_tokens: int = 4000,
    overlap_tokens: int = 400,
) -> list[list[dict[str, Any]]]:
    """Split a conversation into parallelizable sub-conversations.

    Returns a list of message-lists, each within ``max_chunk_tokens``. The
    splitting uses a recursive text splitter on the concatenated user content
    and is executed in the process pool.
    """
    from app.core.concurrency import run_in_process
    from app.payload.splitter import split_text
    from app.payload.tokenizer import count_messages_tokens

    total_tokens = count_messages_tokens(messages)
    if total_tokens <= max_chunk_tokens:
        return [messages]

    last_user_idx = None
    for i in range(len(messages) - 1, -1, -1):
        if messages[i].get("role") == "user":
            last_user_idx = i
            break

    if last_user_idx is None:
        return [messages]

    user_content = messages[last_user_idx].get("content", "")
    if not isinstance(user_content, str) or not user_content:
        return [messages]

    overlap_chars = overlap_tokens * 4
    max_chars = max_chunk_tokens * 4

    chunks = await run_in_process(split_text, user_content, max_chars, overlap_chars)
    if len(chunks) <= 1:
        return [messages]

    result: list[list[dict[str, Any]]] = []
    for chunk in chunks:
        sub_messages = list(messages[:last_user_idx])
        sub_messages.append({**messages[last_user_idx], "content": chunk.text})
        result.append(sub_messages)
    return result


async def reduce_responses(
    responses: list[dict[str, Any]],
) -> dict[str, Any]:
    """Merge multiple sub-responses into a single response.

    Concatenates the assistant text from all responses and sums usage.
    """
    if not responses:
        return {}
    if len(responses) == 1:
        return responses[0]

    parts: list[str] = []
    prompt_tokens = 0
    completion_tokens = 0
    total_tokens = 0

    for resp in responses:
        choices = resp.get("choices") or []
        if choices:
            message = choices[0].get("message") or {}
            content = message.get("content")
            if content:
                parts.append(content)
        usage = resp.get("usage") or {}
        prompt_tokens += usage.get("prompt_tokens", 0)
        completion_tokens += usage.get("completion_tokens", 0)
        total_tokens += usage.get("total_tokens", 0)

    merged = {
        **responses[0],
        "choices": [
            {
                "index": 0,
                "message": {"role": "assistant", "content": "\n\n".join(parts)},
                "finish_reason": "stop",
            }
        ],
        "usage": {
            "prompt_tokens": prompt_tokens,
            "completion_tokens": completion_tokens,
            "total_tokens": total_tokens,
        },
    }
    return merged


__all__ = ["map_reduce_split", "reduce_responses"]
