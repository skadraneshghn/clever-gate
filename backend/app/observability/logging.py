"""Structured logging configuration using structlog.

Wires together:
* **structlog** for internal gateway logs with context-variable enrichment.
* A **capture processor** that routes every event into the non-blocking
  Redis pipeline (see ``log_pipeline.py``).
* A **stdlib bridge handler** that intercepts third-party library logs
  (LiteLLM, HTTPX, OpenAI, …) and feeds them through the same pipeline.
* Granular per-namespace log levels configurable via environment variables.
"""

from __future__ import annotations

import logging
import sys

import structlog

from app.config import get_settings

# Namespaces whose logs we want to capture (not silence).
_THIRD_PARTY_NAMESPACES = (
    "LiteLLM",
    "LiteLLM Router",
    "LiteLLM Proxy",
    "httpcore",
    "httpx",
    "openai",
    "urllib3",
    "botocore",
)

# Default level for third-party libs (overridable via CG_THIRD_PARTY_LOG_LEVEL).
_THIRD_PARTY_DEFAULT_LEVEL = "WARNING"


def setup_logging() -> None:
    settings = get_settings()
    level = getattr(logging, settings.CG_LOG_LEVEL.upper(), logging.INFO)

    third_party_level = getattr(
        logging,
        getattr(settings, "CG_THIRD_PARTY_LOG_LEVEL", _THIRD_PARTY_DEFAULT_LEVEL).upper(),
        logging.WARNING,
    )

    structlog.configure(
        processors=[
            structlog.contextvars.merge_contextvars,
            structlog.processors.add_log_level,
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            # Capture every event into the Redis pipeline (non-blocking).
            _safe_capture_processor,
            structlog.dev.ConsoleRenderer()
            if settings.is_dev
            else structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(),
        cache_logger_on_first_use=True,
    )

    # Configure stdlib logging to route through structlog + capture pipeline.
    logging.basicConfig(level=level, stream=sys.stdout)

    # Bridge third-party library logs into our capture pipeline.
    from app.observability.log_pipeline import StdlibBridgeHandler

    bridge = StdlibBridgeHandler()
    for ns in _THIRD_PARTY_NAMESPACES:
        lib_logger = logging.getLogger(ns)
        lib_logger.setLevel(third_party_level)
        lib_logger.addHandler(bridge)

    # Also bridge the root stdlib logger at a high level so we don't miss
    # unconfigured third-party namespaces at WARNING+.
    root = logging.getLogger()
    if bridge not in root.handlers:
        root.addHandler(bridge)


def _safe_capture_processor(
    logger: object,
    method_name: str,
    event_dict: dict,
) -> dict:
    """Wrapper that never lets capture failures crash logging."""
    try:
        from app.observability.log_pipeline import capture_processor

        return capture_processor(logger, method_name, event_dict)
    except Exception:
        return event_dict


def get_logger(name: str = __name__):
    return structlog.get_logger(name)
