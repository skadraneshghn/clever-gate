"""Non-blocking SSE streaming buffer using asyncio.Queue."""
from __future__ import annotations

import asyncio
from collections.abc import AsyncIterator


class StreamingBuffer:
    """Ring buffer between upstream provider and client for SSE streaming.

    Uses asyncio.Queue with maxsize for controlled backpressure.
    """

    def __init__(self, maxsize: int = 256) -> None:
        self._queue: asyncio.Queue[str | None] = asyncio.Queue(maxsize=maxsize)
        self._done = False

    async def put(self, chunk: str) -> None:
        """Put a chunk into the buffer (non-blocking if not full)."""
        if not self._done:
            await self._queue.put(chunk)

    async def put_done(self) -> None:
        """Signal that the upstream is done."""
        self._done = True
        await self._queue.put(None)

    async def put_error(self, error: str) -> None:
        """Signal an error and close the buffer."""
        self._done = True
        await self._queue.put(None)

    async def stream(self) -> AsyncIterator[str]:
        """Consume chunks from the buffer as an async iterator."""
        while True:
            chunk = await self._queue.get()
            if chunk is None:
                break
            yield chunk


def format_sse(data: str) -> str:
    """Format a string as an SSE data line."""
    return f"data: {data}\n\n"


def format_sse_done() -> str:
    """Format the SSE [DONE] terminator."""
    return "data: [DONE]\n\n"
