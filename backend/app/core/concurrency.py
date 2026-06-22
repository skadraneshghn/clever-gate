"""Concurrency utilities: ProcessPoolExecutor for CPU-bound work and semaphores."""
from __future__ import annotations

import asyncio
import os
from collections.abc import Callable
from concurrent.futures import ProcessPoolExecutor
from typing import Any

_process_pool: ProcessPoolExecutor | None = None
_deployment_semaphores: dict[str, asyncio.Semaphore] = {}


def get_process_pool() -> ProcessPoolExecutor:
    global _process_pool
    if _process_pool is None:
        _process_pool = ProcessPoolExecutor(max_workers=os.cpu_count() or 4)
    return _process_pool


async def run_in_process(func: Callable[..., Any], *args: Any) -> Any:
    """Run a CPU-bound function in the process pool without blocking the event loop."""
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(get_process_pool(), func, *args)


def get_deployment_semaphore(
    deployment_id: str, max_concurrency: int = 100
) -> asyncio.Semaphore:
    """Get or create a concurrency-limiting semaphore for a deployment."""
    if deployment_id not in _deployment_semaphores:
        _deployment_semaphores[deployment_id] = asyncio.Semaphore(max_concurrency)
    return _deployment_semaphores[deployment_id]


def reset_semaphores() -> None:
    _deployment_semaphores.clear()


async def shutdown_process_pool() -> None:
    global _process_pool
    if _process_pool is not None:
        _process_pool.shutdown(wait=False)
        _process_pool = None
