"""Prometheus metrics for the Clever Gateway.

All metrics are exposed as module-level variables so they can be imported and
recorded from anywhere in the application (middleware, providers, routing, etc.).
"""

from __future__ import annotations

from prometheus_client import Counter, Gauge, Histogram

# --- Request metrics ---------------------------------------------------------

cg_requests_total = Counter(
    "cg_requests_total",
    "Total number of requests processed by the gateway.",
    labelnames=["provider", "model", "status", "cache_hit"],
)

cg_request_duration_seconds = Histogram(
    "cg_request_duration_seconds",
    "Latency of gateway requests in seconds.",
    labelnames=["provider", "model"],
)

# --- Token & cost metrics ----------------------------------------------------

cg_tokens_total = Counter(
    "cg_tokens_total",
    "Total number of tokens processed, split by direction and model.",
    labelnames=["direction", "model"],
)

cg_cost_usd_total = Counter(
    "cg_cost_usd_total",
    "Total estimated cost in USD of processed requests.",
)

# --- Provider health & concurrency -------------------------------------------

cg_provider_health = Gauge(
    "cg_provider_health",
    "Health status of a provider (1 = healthy, 0 = unhealthy).",
    labelnames=["provider"],
)

cg_active_concurrency = Gauge(
    "cg_active_concurrency",
    "Number of in-flight requests per provider.",
    labelnames=["provider"],
)

# --- Cache metrics -----------------------------------------------------------

cg_cache_hits_total = Counter(
    "cg_cache_hits_total",
    "Total number of cache hits served.",
)

cg_cache_misses_total = Counter(
    "cg_cache_misses_total",
    "Total number of cache misses encountered.",
)
