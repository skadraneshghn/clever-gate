# Clever Gateway — Technical Design Document

> A pure middleware layer for load balancing and routing AI APIs, with **OpenAI-Compatible** output, a parallel and non-blocking processing core, and an advanced admin panel.

---

## Table of Contents

1. [Executive Summary and Vision](#1-executive-summary-and-vision)
2. [Design Principles and Non-Negotiable Goals](#2-design-principles-and-non-negotiable-goals)
3. [Technology Choices and Rationale](#3-technology-choices-and-rationale)
4. [Overall System Architecture](#4-overall-system-architecture)
5. [Core Engine Design](#5-core-engine-design)
6. [Provider Abstraction Layer](#6-provider-abstraction-layer)
7. [Smart Routing and Load Balancing](#7-smart-routing-and-load-balancing)
8. [OpenAI-Compatible API Layer](#8-openai-compatible-api-layer)
9. [Large Payload Splitting](#9-large-payload-splitting)
10. [Two-Tier Semantic Cache](#10-two-tier-semantic-cache)
11. [Security and Guardrails](#11-security-and-guardrails)
12. [Admin Panel (Next.js + Joy UI)](#12-admin-panel-nextjs--joy-ui)
13. [Database Design (PostgreSQL)](#13-database-design-postgresql)
14. [API Design (Admin + User)](#14-api-design-admin--user)
15. [Project Structure (Monorepo)](#15-project-structure-monorepo)
16. [Dockerization and Deployment on Clever Cloud](#16-dockerization-and-deployment-on-clever-cloud)
17. [Migration and Admin Account Seed](#17-migration-and-admin-account-seed)
18. [Real-Time Monitoring and Observability](#18-real-time-monitoring-and-observability)
19. [Phased Development Roadmap](#19-phased-development-roadmap)
20. [Risks, Trade-Offs, and Open Decisions](#20-risks-trade-offs-and-open-decisions)
21. [Appendix](#21-appendix)

---

## 1. Executive Summary and Vision

**Clever Gateway** is an integrated gateway that places multiple AI model providers (such as Gemini, OpenAI, Anthropic, Bedrock, …) behind a single **OpenAI-compatible API**. The end client works with only one Base URL and one Virtual API Key, and never has to deal with the complexity of multiple providers.

The core of this system has three distinguishing characteristics:

* **Absolutely non-blocking:** every incoming request is immediately converted into an asynchronous task, and network processing begins right away. No request waits for the previous one to finish.
* **True parallelism across CPU cores:** by combining `asyncio` (for network I/O) and multiple processing pools (`multiprocessing`/ProcessPool) for CPU-bound computation, Python’s GIL limitation is bypassed.
* **Intelligent core complexity management:** large payload splitting, semantic caching, load balancing, Circuit Breaker, and Fallback are all handled transparently in the middleware layer.

The first phase uses **LiteLLM** as the adapter connecting models to the OpenAI-compatible API; however, the design is **modular**, so that in the future any AI provider in the world can be added without changing the core.

---

## 2. Design Principles and Non-Negotiable Goals

| #   | Principle                                      | Description                                                                                                               |
| --- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| D1  | **Pure Middleware**                            | The core has no client business logic. It only receives requests, routes, processes, and responds.                        |
| D2  | **Zero Start Latency**                         | As soon as a request is received, an independent coroutine/task is spawned. There is no blocking queue before I/O begins. |
| D3  | **Full Parallelization**                       | I/O concurrency with `asyncio`, and CPU-bound work with a Process Pool across all cores.                                  |
| D4  | **Unlimited Payload Handling**                 | Every request is processed regardless of length; splitting is handled by the core.                                        |
| D5  | **Provider Modularity**                        | Adding a new provider must not require changing the core (Open/Closed Principle).                                         |
| D6  | **Default Resilience**                         | Circuit Breaker, Cooldown, Retry, and Fallback are active on all paths.                                                   |
| D7  | **Hot Config Reload**                          | Provider settings changed from the panel are applied without restarting the server.                                       |
| D8  | **Deployable as a Docker App on Clever Cloud** | Configuration must align with Clever Cloud constraints and conventions.                                                   |
| D9  | **Observability**                              | Every transaction is traceable, auditable, and measurable.                                                                |
| D10 | **Security by Default**                        | Real provider keys are never stored in plain text; a Virtual Key is issued to users.                                      |

---

## 3. Technology Choices and Rationale

### 3.1 Backend: FastAPI

| Reason               | Description                                                                           |
| -------------------- | ------------------------------------------------------------------------------------- |
| ASGI/native async    | Native `asyncio` support for non-blocking I/O, which is the foundation of D2.         |
| Stream first-class   | Natural support for `StreamingResponse` and SSE for OpenAI-style streaming responses. |
| Pydantic v2          | Fast validation (Rust-core) and strong typing for OpenAI payloads.                    |
| Dependency Injection | Suitable for layering auth, rate limiting, and logging as middleware/guards.          |
| Ecosystem            | Full compatibility with SQLAlchemy, Alembic, httpx, and Pydantic Settings.            |

**Production server:** `uvicorn` with `uvloop` and `httptools`, behind `gunicorn` as the process manager with multiple workers (one per CPU core) — each worker has its own event loop.

### 3.2 Database: PostgreSQL + SQLAlchemy 2.0 + Alembic

* **PostgreSQL:** powerful relational database, JSONB for flexible payload storage (`messages`, `response`), `pg_trgm` and `pgvector` (extension) for text and vector search (semantic cache in a later phase).
* **SQLAlchemy 2.0:** typed `Mapped` support, async engine (`asyncpg`).
* **Alembic:** robust, reversible migrations with autogenerate and seed data in a separate migration file.

### 3.3 Cache and Temporary State: Redis

* L1 semantic cache (exact-hash),
* rate counting (sliding-window rate limit),
* Circuit Breaker and cooldown mapping,
* lightweight queues (stream/RPC) and pub/sub for real-time monitoring,
* admin sessions (session store) and per-key rate limiting.

### 3.4 Provider Integration Layer: LiteLLM (Phase 1)

> **Key architectural decision:** LiteLLM is used as an in-process library/SDK inside FastAPI, not as a separate running proxy. In other words, we call `litellm.Router` (or `litellm.acompletion`) directly from the gateway code.

Why this decision:

* eliminates an extra network hop and reduces latency (D2).
* gives full control over routing strategy, retry, and fallback dynamically from the database.
* enables hot reloading of Router configuration from the admin panel without restarting a separate proxy.

`litellm` supports hundreds of providers (OpenAI, Azure, Gemini, Bedrock, Anthropic, Cohere, Mistral, TogetherAI, Ollama, vLLM, …), which exactly serves the modularity goal of D5 in phase 1. In later phases, providers that need custom logic (for example an internal MCP Gateway or a proprietary API) will be implemented through independent **Provider Adapters**, and LiteLLM will become only one of the adapters.

### 3.5 Frontend Panel: Next.js (App Router) + Joy UI

> **Important note about Joy UI:** According to MUI’s official documentation, Joy UI is in beta and its development is currently on hold. MUI recommends Material UI for new projects. Keep this in mind for the final decision.

**Recommendation:** Two options are suggested:

1. **(Recommended) MUI Material UI v6** — guaranteed support, mature ecosystem, Pigment CSS support for zero-runtime styling. Better suited for a long-term stable admin panel.
2. **Joy UI** — acceptable if you strongly prefer its out-of-the-box visual style and unique design, but with the risk of limited long-term updates.

In this document, the panel design is presented so it can be implemented with **either** library (via a component primitive abstraction layer). The component-level sections refer to Joy UI, but they are replaceable.

**Why Next.js:** App Router, Server Components, API routes (when BFF is needed), standalone output for Docker, SSR for the dashboard.

### 3.6 Other Backend Tools

| Tool                                                      | Use                                                                                                   |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `httpx`                                                   | Async HTTP client with connection pooling and HTTP/2 for calling providers (under the LiteLLM layer). |
| `pydantic-settings`                                       | Typed environment-based configuration management.                                                     |
| `passlib[bcrypt]` / `argon2-cffi`                         | Hashing admin/user passwords.                                                                         |
| `python-jose[cryptography]`                               | Issuing and validating JWTs (admin) and Virtual API Keys.                                             |
| `structlog`                                               | Structured logging with context (request_id, user_id, provider).                                      |
| `prometheus-client` / `prometheus-fastapi-instrumentator` | Metrics.                                                                                              |
| `tenacity`                                                | Retry policy with exponential backoff (complements Circuit Breaker).                                  |
| `orjson`                                                  | Ultra-fast JSON serialization.                                                                        |
| `uvloop` + `httptools`                                    | Replacing the event loop and HTTP parser with C implementations.                                      |
| `apscheduler` or Celery (later phase)                     | Background jobs (cache cleanup, periodic reports, batch tasks).                                       |

---

## 4. Overall System Architecture

```text
                        ┌─────────────────────────────────────────────┐
                        │            End Clients / SDKs               │
                        │   (OpenAI SDK, LangChain, curl, app)        │
                        └───────────────────┬─────────────────────────┘
                                            │  Bearer <Virtual API Key>
                                            ▼
   ┌──────────────────────────────────────────────────────────────────────────┐
   │                        CLEVER GATEWAY (FastAPI ASGI)                     │
   │                                                                          │
   │  ┌────────────┐  ┌────────────┐  ┌──────────────┐  ┌──────────────────┐ │
   │  │ Auth Layer │→ │ Rate Limit │→ │ Cache Check  │→ │ OpenAI Endpoint  │ │
   │  │ (VKey/JWT) │  │ (Redis)    │  │ (Semantic)   │  │ Router (/v1/*)   │ │
   │  └────────────┘  └────────────┘  └──────────────┘  └────────┬─────────┘ │
   │                                                              │           │
   │  ┌───────────────────────────────────────────────────────────▼────────┐ │
   │  │                     CORE ENGINE (asyncio + uvloop)                 │ │
   │  │  ┌───────────────┐  ┌────────────────┐  ┌──────────────────────┐  │ │
   │  │  │ Payload       │  │ Load Balancer /│  │ Provider Adapter     │  │ │
   │  │  │ Splitter      │  │ Router + CB    │  │ Registry (Plug-in)   │  │ │
   │  │  └───────────────┘  └────────────────┘  └──────────┬───────────┘  │ │
   │  │  ┌───────────────┐  ┌────────────────┐  ┌──────────▼───────────┐  │ │
   │  │  │ CPU Pool      │  │ Streaming SSE  │  │  LiteLLM Adapter     │  │ │
   │  │  │ (ProcessPool) │  │ Buffer         │  │  (phase-1 provider)  │  │ │
   │  │  └───────────────┘  └────────────────┘  └──────────┬───────────┘  │ │
   │  └─────────────────────────────────────────────────────┼─────────────┘ │
   │                                                        │               │
   │  ┌──────────────┐  ┌──────────────┐  ┌────────────────▼────────────┐  │
   │  │ Admin API    │  │ Metrics      │  │  Guardrails (PII/Injection) │  │
   │  │ (panel BFF)  │  │ /audit log   │  │  (pre/post hooks, async)    │  │
   │  └──────┬───────┘  └──────────────┘  └─────────────────────────────┘  │
   └─────────┼──────────────────────────────────────────────────────────────┘
             │
   ┌─────────▼──────────┐   ┌───────────────┐   ┌──────────────────────┐
   │  PostgreSQL (addon)│   │ Redis (addon) │   │ Upstream AI Providers │
   │  config/users/keys │   │ cache/limit/  │   │ (Gemini, OpenAI, ...) │
   │  audit/spend       │   │ breaker/state │   └──────────────────────┘
   └────────────────────┘   └───────────────┘

   ┌─────────────────────────────────────┐
   │  Admin Panel (Next.js + Joy UI)     │  ← Separate Docker app (or static export)
   │  Real-time dashboard / provider mgmt│     that calls the Admin API
   └─────────────────────────────────────┘
```

**Request flow explanation (Happy Path):**

1. The client sends a request to `/v1/chat/completions` with a Virtual Key.
2. The Auth Guard validates the key and loads the user/team/budget.
3. The Rate Limiter (Redis) checks the request rate.
4. The Semantic Cache is checked (exact → vector); on a hit, the response is returned from cache (with SSE streaming).
5. The Payload Splitter checks whether the payload exceeds the context window; if needed, it splits it.
6. Guardrails sanitize the input in the background (async).
7. The Core Engine creates an independent coroutine and hands it to the Load Balancer.
8. The Load Balancer selects a healthy deployment based on strategy (least-busy / latency / weighted), considering Circuit Breaker and cooldown.
9. The Provider Adapter sends the request (via LiteLLM) to the upstream; the streaming response is passed through a non-blocking buffer to the client.
10. In the background: spend/token usage is recorded, the audit log is written, metrics are updated, and the cache is filled where appropriate.

---

## 5. Core Engine Design

This section is the heart of D2, D3, and D4: **zero latency at start + real parallelism + no blocking**.

### 5.1 Hybrid Concurrency Model

The main challenge in Python is the **GIL**: one thread cannot execute Python code on multiple CPU cores at the same time. But for a gateway whose work is 95% network I/O, the GIL is a minor issue because I/O in `asyncio` releases the GIL. The real problem is **CPU-bound** work (text splitting, hashing, cryptography, local embeddings).

Hybrid solution:

```text
┌─────────────────────────────────────────────────────────────┐
│  FastAPI ASGI Process (per CPU core) ─ gunicorn worker      │
│                                                             │
│  Event Loop (uvloop) ─────────────────────────────────┐     │
│   │  ├── 1000s of async I/O tasks (provider calls)    │     │
│   │  ├── Streaming SSE buffers (asyncio.Queue)        │     │
│   │  ├── Cache lookups (async redis)                  │     │
│   │  └── DB queries (asyncpg)                         │     │
│   │                                                   │     │
│   │  ProcessPoolExecutor (size = N cores) ◄──────────┘     │
│   │  ├── payload splitting (recursive text)                │
│   │  ├── PII regex / NER detection                         │
│   │  ├── semantic hashing / tokenization                   │
│   │  └── compression / encoding                           │
│   └──                                                      │
│                                                            │
│  gunicorn: N workers × (1 event loop + 1 process pool)     │
└─────────────────────────────────────────────────────────────┘
```

**Golden rule for workload division:**

* **I/O-bound (network, DB, Redis):** always in the event loop with `await` (no blocking `time.sleep` or `requests` allowed).
* **CPU-bound computation:** delegated to `ProcessPoolExecutor` to bypass the GIL. This is done asynchronously with `asyncio.get_running_loop().run_in_executor(pool, fn, ...)` so the event loop stays unblocked.

### 5.2 Zero Start Latency

None of the following steps should block before the upstream network begins:

* Auth, Rate Limit, and Cache Lookup are all async and can run in parallel (`asyncio.gather` for independent tasks).
* **Each request for a model creates a new task.** If Gemini is responding to 5 requests and the sixth arrives, the sixth coroutine starts immediately (if a healthy deployment or fallback exists). LiteLLM Router manages this distribution with `routing_strategy="least-busy"`.
* **There is no global blocking queue.** Load control is handled by rate limiting and circuit breaker, not by a blocking FIFO queue.

### 5.3 Connection Pooling

* `httpx.AsyncClient` with HTTP/2, keep-alive, and large pool limits (for example `max_connections=1000`).
* Separate connection pools per provider for isolation (D1 and error containment).
* `asyncpg` connection pool for PostgreSQL.
* Redis async pool (`redis.asyncio`).

### 5.4 Non-Blocking Streaming Buffer

For SSE responses from upstream that must be streamed to the client:

```python
# conceptual
async def stream_passthrough(upstream_aiter, client_send):
    async for chunk in upstream_aiter:        # non-blocking receive from upstream
        await client_send(chunk)              # non-blocking send to client
    await client_send("[DONE]")
```

An `asyncio.Queue` is used as a ring buffer between the upstream consumer and the client producer so that even if the client is slow, the upstream does not get blocked (controlled backpressure with `maxsize`).

### 5.5 Backpressure and Overload Control

Instead of rejecting requests in a blocking queue, the system uses:

* **Rate limit per virtual key / per IP** (Redis sliding window).
* **Max concurrency per provider** (semaphore per deployment) — when full, the router moves to the next deployment or a fallback.
* **Adaptive concurrency limit** based on latency (congestion control similar to AIMD) to prevent collapse under load.

---

## 6. Provider Abstraction Layer

This layer ensures that the **core is never tied to a specific provider** (D5).

### 6.1 Provider Interface (Protocol/ABC)

```python
# app/providers/base.py  (conceptual)
from typing import Protocol, AsyncIterator
from app.schemas.openai import ChatCompletionRequest, ChatCompletionChunk, ChatCompletionResponse

class ProviderAdapter(Protocol):
    name: str                       # "litellm" | "custom-gemini" | ...

    async def chat(
        self, deployment: "Deployment", request: ChatCompletionRequest
    ) -> ChatCompletionResponse: ...

    async def stream_chat(
        self, deployment: "Deployment", request: ChatCompletionRequest
    ) -> AsyncIterator[ChatCompletionChunk]: ...

    async def embed(
        self, deployment: "Deployment", request: "EmbeddingRequest"
    ) -> "EmbeddingResponse": ...

    async def health_check(self, deployment: "Deployment") -> bool: ...
```

### 6.2 Registry and Plug-in

* A `ProviderRegistry` that registers adapters by provider type.
* Adding a new provider = create a new adapter class + register it in the registry. **The core does not change.**
* Phase 1: only `LiteLLMAdapter`, which wraps `litellm.Router`.
* Later phases: `GeminiDirectAdapter`, `MCPGatewayAdapter`, `BatchAdapter`, …

### 6.3 Mapping Database Models to LiteLLM Config

The admin panel stores provider/deployment/key records in the database. A `RouterBuilder` service dynamically builds a `litellm.Router` from these records:

```text
DB rows (providers, deployments, api_keys)
        │
        ▼
RouterBuilder.build()  →  litellm.Router(model_list=[...], router_settings={...})
        │
        ▼
LiteLLMAdapter.router  (hot reload without restart)
```

Supported LiteLLM features: `routing_strategy`, `fallbacks`, `context_window_fallbacks`, `num_retries`, `timeout`, `tpm/rpm`, `allowed_fails`, `cooldown_time`.

### 6.4 Hot Reload

* When an admin changes a provider/deployment/key in the panel, an internal signal (or Redis Pub/Sub for multiple instances) re-triggers `RouterBuilder`.
* The new Router atomically replaces the old one (`asyncio.Lock`). In-flight requests continue on the old router.

---

## 7. Smart Routing and Load Balancing

| Capability                         | Mechanism                                                                                                                                               | Outcome                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Token Rotation**                 | Multiple deployments with the same `model_name` → LiteLLM load balances between them. Strategy: `simple-shuffle` (weighted by tpm/rpm) or `least-busy`. | Balanced distribution and fewer 429s.                  |
| **Latency-Based Routing**          | `routing_strategy="latency-based-routing"` with continuous latency monitoring.                                                                          | Routes to the fastest provider at the moment.          |
| **Circuit Breaker**                | `allowed_fails` + `cooldown_time` in LiteLLM; a deployment is taken out of rotation after N errors and returns after cooldown.                          | Avoids wasting time on a faulty provider.              |
| **Automatic Cooldown**             | Blocked keys (429/5xx) are quarantined in Redis with TTL.                                                                                               | Automatic recovery without admin intervention.         |
| **Fallback Chain**                 | `fallbacks: [{gpt-4o: [claude-3-5, gemini-pro]}]` and `context_window_fallbacks`.                                                                       | Always available even during one platform outage.      |
| **Smart Retry**                    | `num_retries` with exponential backoff (tenacity) only for retryable errors (429, 5xx, timeout).                                                        | Resilience without retry storms.                       |
| **Max Concurrency per deployment** | `asyncio.Semaphore` per deployment.                                                                                                                     | Backpressure control and prevention of key saturation. |

**Suggested default policy for phase 1:**

```yaml
router_settings:
  routing_strategy: simple-shuffle   # with tpm/rpm set → weighted pick
  num_retries: 3
  timeout: 60
  allowed_fails: 3
  cooldown_time: 60
  fallbacks: [...]                   # from the database
```

---

## 8. OpenAI-Compatible API Layer

This layer is the client contract. It must behave **exactly** like OpenAI so that any SDK works without changes (only `base_url` and `api_key` need to change).

### 8.1 Implemented Endpoints (Phase 1)

| Method | Path                                       | Description                         |
| ------ | ------------------------------------------ | ----------------------------------- |
| POST   | `/v1/chat/completions`                     | _chat (stream + non-stream)         |
| POST   | `/v1/completions`                          | text completions                    |
| POST   | `/v1/embeddings`                           | embedding                           |
| GET    | `/v1/models`                               | list of models allowed for the user |
| GET    | `/v1/models/{id}`                          | model information                   |
| POST   | `/v1/images/generations`                   | (later phase)                       |
| POST   | `/v1/audio/*`                              | (later phase)                       |
| GET    | `/health`, `/health/live`, `/health/ready` | health check                        |

### 8.2 Authentication

* **Clients:** use `Authorization: Bearer <Virtual API Key>` → DB record `api_keys`. Keys use the `sk-cg-...` format.
* **Admin panel:** JWT (after login with username/password + optional 2FA). Short-lived JWT + refresh token.
* **Master Key:** a `MASTER_KEY` for bootstrap/panel (in env).

### 8.3 Streaming (SSE)

* `Content-Type: text/event-stream` header, exactly matching OpenAI format (`data: {chunk}\n\n`).
* Upstream streaming response is passed through with a non-blocking buffer.
* Supports `stream_options: {include_usage: true}`.

### 8.4 Parameter Compatibility

`drop_params=True` in litellm: invalid parameters for a provider are safely dropped to preserve compatibility. Model mapping (for example `gpt-4` → multiple deployments) is transparent.

---

## 9. Large Payload Splitting

This subsystem satisfies D4: **no request is rejected because of size.**

### 9.1 Processing Flow

```text
large payload
   │
   ▼
(1) Token estimation (tiktoken / provider tokenizer)
   │  Does it exceed the deployment context window?
   │  ── No ──► direct send
   │  ── Yes ──▼
(2) Recursive Text Splitter (CPU Pool)
   │   split by: Markdown headings → paragraph → sentence → word
   │   with sliding window overlap (10–20%)
   ▼
(3) Map: send chunks in parallel to different deployments (asyncio.gather)
   ▼
(4) Reduce: merge and trim responses → semantic integration
   ▼
final response to client
```

### 9.2 Technical Details

* **Tokenizer:** `tiktoken` for fast estimation (CPU pool). For non-OpenAI providers, use the matching tokenizer approximation.
* **Natural boundaries:** prioritize meaningful boundaries (code fences, headings, paragraphs) to preserve coherence.
* **Overlap:** prevents information loss at boundaries.
* **Parallelization:** each chunk becomes an independent coroutine → distributed across multiple providers/tokens → reduced wall-clock time.
* **Exception:** for multi-turn conversations with long chat history, use **Context Compression** (phase 3) instead of splitting.

---

## 10. Two-Tier Semantic Cache

| Tier                        | Mechanism                                                                                | Latency  |
| --------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| **L1 — Exact**              | SHA256 hash of (model + normalized messages + params) → Redis key.                       | < 1ms    |
| **L2 — Semantic** (phase 2) | prompt embedding → vector search (pgvector/Redis) → cosine similarity > admin threshold. | ~10–30ms |

* **Streaming cache:** store SSE chunks and replay them naturally to preserve streaming behavior.
* **Adaptive TTL:** TTL based on access frequency.
* **Invalidation:** manual from the panel (selective cleanup by model/user/time).

---

## 11. Security and Guardrails

### 11.1 Key Management

* Real provider keys are stored encrypted in the DB (Fernet/AES with master key from env).
* Users only receive a **Virtual API Key** that is tied to a user/team.
* Future: integration with Vault (enterprise phase).

### 11.2 Guardrails (phase 3, but hooks ready from phase 1)

* **Input Phase:** PII redaction (regex + lightweight NER in CPU pool), prompt injection detection (semantic guard).
* **Output Phase:** block disallowed content, de-masking (restore original values with a local temporary mapping).
* All of this runs **async and in the background** so it does not block the main path (unless strict mode requires blocking input).

### 11.3 Rate Limiting

* Sliding window in Redis for (virtual_key, model, minute).
* Separate limits for RPM, TPM, and Budget (USD/tokens).

### 11.4 Admin Authentication

* username/password (bcrypt/argon2) + optional **2FA (TOTP)**.
* Short-lived JWT (15 minutes) + refresh token in httpOnly cookie.
* admin seed in migration (section 17).

---

## 12. Admin Panel (Next.js + Joy UI)

### 12.1 Architecture

* Next.js App Router (standalone output for Docker).
* Communication with the backend **Admin API** via Server Components / Client fetch with JWT.
* Authentication: login page → receive JWT → store in httpOnly cookie.
* Real-time: **SSE/WebSocket** from the backend for live dashboard updates (metrics, live traffic, provider health).

### 12.2 Panel Sections

| Section                   | Features                                                                                                                                  |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Dashboard (Real-Time)** | RPS chart, latency p50/p95/p99, errors, CPU/RAM usage, live provider status, inbound/outbound traffic chart.                              |
| **Providers Management**  | CRUD for provider (name, type, api_base, settings) and deployment (model_name, litellm_params, tpm/rpm). Add multiple tokens. Hot reload. |
| **Models & Routing**      | Define model aliases, routing strategies, fallback chains, context-window fallback.                                                       |
| **Users & Teams**         | CRUD users/teams, hierarchical organization, model access assignment.                                                                     |
| **Virtual Keys**          | Generate/revoke keys, set budget/rate limit, inspect per-key usage.                                                                       |
| **Spend & Cost**          | Cost dashboard by user/team/model/provider, token usage.                                                                                  |
| **Monitoring / Audit**    | Transaction logs (summarized prompt, response metadata, provider, latency, errors), search and filtering.                                 |
| **Cache Management**      | View cache statistics, selective invalidation, TTL/threshold settings.                                                                    |
| **Guardrails** (phase 3)  | Enable PII/Prompt Guard, policies.                                                                                                        |
| **Settings**              | General settings, master key, 2FA, alerting webhooks.                                                                                     |

### 12.3 UI/UX Design

* Layout: permanent **Sidebar** + **Topbar** with search and profile.
* Theme: Dark/Light with saved preference.
* Key Joy UI components: `Sheet`, `Card`, `Table`, `Charts` (with `@nivo` or `recharts`), `Stat` (metric card), `ListItem` for provider status, `Alert`/`Toast` for notifications.
* Admin pages: filterable/paginated tables, drawer for editing, modal for confirmation.
* **Real-time dashboard** with updates via EventSource (SSE) every 1–2 seconds + immediate push for important events.

### 12.4 Joy UI Considerations

Given Joy UI’s on-hold status:

* build a component abstraction layer (for example `cg/Card`, `cg/Table` wrappers) so that if you migrate to Material UI, only the wrappers change and the pages stay intact.
* use stable, available Joy UI features and avoid relying on experimental ones.

---

## 13. Database Design (PostgreSQL)

### 13.1 Table List (Overview)

```text
users            — system users (admins + API users)
teams            — teams/organizations
user_teams       — user-team relation with role
api_keys         — users' Virtual API Keys
providers        — upstream providers (type, settings)
deployments      — a model instance on a provider (model_name, litellm_params, tpm, rpm)
provider_keys    — real provider keys (encrypted)
model_aliases    — mapping from user-friendly aliases to deployments (routing group)
routing_rules    — routing strategy, fallback, context_window_fallback
budgets          — budget caps (tokens/dollars) per user/team/key
rate_limits      — rate caps per user/team/key/model
request_logs     — request logs (metadata, not full prompt in phase 1)
audit_logs       — admin action logs
spend_records    — token/cost usage per request
cache_entries    — cache metadata (optional; actual data in Redis)
provider_health  — provider status snapshot (breakers, latency, error rate)
settings         — global system settings (key-value)
```

### 13.2 Sample Key Schema (Conceptual)

```sql
-- users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username        TEXT UNIQUE NOT NULL,
    email           TEXT UNIQUE NOT NULL,
    password_hash   TEXT NOT NULL,
    first_name      TEXT,
    last_name       TEXT,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_admin        BOOLEAN NOT NULL DEFAULT FALSE,
    totp_secret     TEXT,                -- 2FA
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- providers
CREATE TABLE providers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT UNIQUE NOT NULL,        -- "openai", "gemini", "anthropic"
    adapter_type    TEXT NOT NULL,               -- "litellm" | "custom:gemini" | ...
    base_url        TEXT,
    config          JSONB NOT NULL DEFAULT '{}',
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- deployments (each row = one litellm deployment)
CREATE TABLE deployments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    model_name      TEXT NOT NULL,               -- user-friendly name (alias group)
    litellm_model   TEXT NOT NULL,               -- e.g. "gemini/gemini-1.5-pro"
    litellm_params  JSONB NOT NULL DEFAULT '{}', -- api_base, api_version, ...
    tpm             INT,
    rpm             INT,
    context_window  INT,
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    priority        INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- provider_keys (encrypted)
CREATE TABLE provider_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    label           TEXT NOT NULL,
    encrypted_key   BYTEA NOT NULL,              -- Fernet/AES
    key_hash        TEXT NOT NULL,               -- for search / deduplication
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- api_keys (Virtual Keys for users)
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id         UUID REFERENCES teams(id) ON DELETE SET NULL,
    key_hash        TEXT UNIQUE NOT NULL,        -- hash for fast lookup
    key_prefix      TEXT NOT NULL,               -- display prefix "sk-cg-abc..."
    name            TEXT,
    allowed_models  TEXT[],                      -- model restriction
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at    TIMESTAMPTZ
);

-- request_logs (metadata only; full payload optionally later with retention)
CREATE TABLE request_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id      UUID NOT NULL,
    api_key_id      UUID REFERENCES api_keys(id),
    user_id         UUID REFERENCES users(id),
    model           TEXT,
    deployment_id   UUID,
    provider_id     UUID,
    is_stream       BOOLEAN,
    prompt_tokens   INT,
    completion_tokens INT,
    total_tokens    INT,
    cost_usd        NUMERIC(12,6),
    latency_ms      INT,
    status_code     INT,
    error_class     TEXT,
    cache_hit       BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

> The full schema will be implemented in Alembic files. This is only the high-level view.

### 13.3 Indexing and Optimization

* Index on `api_keys.key_hash` (authentication lookup on every request).
* Index on `request_logs(created_at)` and monthly partitioning to prevent table growth.
* `pgvector` extension (preparation for phase 2 semantic cache).
* JSONB GIN index on `litellm_params` and `config`.

---

## 14. API Design (Admin + User)

### 14.1 Admin API (Behind the Panel)

Prefix: `/api/admin` (protected by admin JWT)

```text
POST   /api/admin/auth/login            {username, password, totp?} → {access, refresh}
POST   /api/admin/auth/refresh
POST   /api/admin/auth/logout

GET    /api/admin/dashboard/metrics      → real-time KPIs (SSE/WebSocket too)
GET    /api/admin/dashboard/timeseries   → chart data

CRUD   /api/admin/providers
CRUD   /api/admin/deployments
CRUD   /api/admin/provider-keys
CRUD   /api/admin/model-aliases
CRUD   /api/admin/routing-rules

GET    /api/admin/users
POST   /api/admin/users
PATCH  /api/admin/users/{id}
DELETE /api/admin/users/{id}

GET    /api/admin/api-keys
POST   /api/admin/api-keys               → generate and return key (one-time)
DELETE /api/admin/api-keys/{id}

GET    /api/admin/spend                  → cost report (filter/group)
GET    /api/admin/audit-logs
GET    /api/admin/request-logs           → with filter/pagination
GET    /api/admin/provider-health        → live provider status

POST   /api/admin/cache/invalidate
GET    /api/admin/settings
PATCH  /api/admin/settings

POST   /api/admin/providers/{id}/test    → manual health check
```

### 14.2 OpenAI-Compatible API

Prefix: `/v1` (protected by Virtual API Key)

```text
POST   /v1/chat/completions
POST   /v1/completions
POST   /v1/embeddings
GET    /v1/models
GET    /v1/models/{id}
GET    /health
```

### 14.3 Shared Contracts

* Versioning in the header or path.
* Pagination: `?page=&page_size=` with `Link` header.
* Errors in OpenAI error envelope format (`{"error": {...}}`).
* `request_id` in the `X-Request-ID` header for end-to-end tracing.

---

## 15. Project Structure (Monorepo)

```text
clever-gateway/
├── docs/
│   └── DESIGN.md                 ← this document
├── backend/                      ← FastAPI core
│   ├── app/
│   │   ├── main.py               ← create app + lifespan + middleware
│   │   ├── config.py             ← pydantic-settings
│   │   ├── api/
│   │   │   ├── v1/               ← OpenAI-compatible endpoints
│   │   │   │   ├── chat.py
│   │   │   │   ├── completions.py
│   │   │   │   ├── embeddings.py
│   │   │   │   └── models.py
│   │   │   └── admin/            ← Admin API
│   │   │       ├── auth.py
│   │   │       ├── providers.py
│   │   │       ├── users.py
│   │   │       ├── keys.py
│   │   │       ├── dashboard.py
│   │   │       └── ...
│   │   ├── core/
│   │   │   ├── engine.py         ← Core Engine (async orchestration)
│   │   │   ├── concurrency.py    ← ProcessPool, semaphores
│   │   │   ├── streaming.py      ← SSE buffer
│   │   │   └── pooling.py        ← httpx/redis/pg pools
│   │   ├── providers/
│   │   │   ├── base.py           ← ProviderAdapter protocol
│   │   │   ├── registry.py       ← ProviderRegistry
│   │   │   ├── litellm_adapter.py← phase 1
│   │   │   └── router_builder.py ← DB → litellm.Router (hot reload)
│   │   ├── routing/
│   │   │   ├── balancer.py
│   │   │   ├── breaker.py        ← Circuit Breaker (Redis-backed)
│   │   │   └── cooldown.py
│   │   ├── cache/
│   │   │   ├── exact.py          ← L1
│   │   │   └── semantic.py       ← L2 (phase 2)
│   │   ├── payload/
│   │   │   ├── splitter.py       ← recursive text splitter (CPU pool)
│   │   │   ├── aggregator.py
│   │   │   └── tokenizer.py
│   │   ├── guardrails/
│   │   │   ├── pii.py
│   │   │   └── prompt_guard.py   ← phase 3
│   │   ├── auth/
│   │   │   ├── api_key.py        ← Virtual Key auth
│   │   │   ├── jwt.py            ← Admin JWT
│   │   │   └── passwords.py
│   │   ├── db/
│   │   │   ├── base.py           ← SQLAlchemy Base
│   │   │   ├── session.py        ← async session
│   │   │   └── models/           ← ORM models
│   │   ├── schemas/              ← Pydantic (OpenAI + admin)
│   │   ├── services/             ← business logic (users, spend, etc.)
│   │   ├── middleware/           ← request_id, logging, rate limit
│   │   ├── observability/        ← structlog, prometheus
│   │   └── utils/
│   ├── alembic/
│   │   ├── versions/
│   │   ├── env.py
│   │   └── seeds/
│   │       └── 0001_admin_seed.py ← admin seed
│   ├── tests/
│   ├── pyproject.toml            ← poetry/uv + ruff + mypy + pytest
│   └── Dockerfile
├── frontend/                     ← Next.js + Joy UI
│   ├── app/                      ← App Router
│   │   ├── (auth)/login/
│   │   ├── (dashboard)/
│   │   │   ├── page.tsx          ← real-time dashboard
│   │   │   ├── providers/
│   │   │   ├── models/
│   │   │   ├── users/
│   │   │   ├── keys/
│   │   │   ├── spend/
│   │   │   ├── monitoring/
│   │   │   ├── cache/
│   │   │   └── settings/
│   │   └── layout.tsx
│   ├── components/
│   │   └── cg/                   ← abstraction layer (cg/Card, cg/Table ...)
│   ├── lib/                      ← api client, auth, sse
│   ├── package.json
│   └── Dockerfile
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml        ← local dev
├── .env.example
├── Makefile
└── README.md
```

---

## 16. Dockerization and Deployment on Clever Cloud

### 16.1 Clever Cloud Docker Contract

Based on the official documentation:

* A Docker app is detected by a **Dockerfile** in the root (or `CC_DOCKERFILE` path).
* The app must listen on **port 8080** (or be configured with `CC_DOCKER_EXPOSED_HTTP_PORT`).
* **Docker Compose is not supported**; one app = one container.
* Env vars are injected from the Clever Cloud console.
* **Addons:** PostgreSQL and Redis are provided as managed addons, and `POSTGRESQL_ADDON_*` and `REDIS_ADDON_*` are injected into env.
* FS Bucket for persistent files (if needed).
* Build hooks (`CC_PRE_BUILD_HOOK`, `CC_POST_BUILD_HOOK`, `CC_PRE_RUN_HOOK`).

### 16.2 Recommended Deployment Strategy

Because Docker Compose is not supported, we have two approaches:

**Approach A (recommended) — Separate apps:**

* Docker **backend** app (FastAPI) on port 8080.
* Docker (or Node.js) **frontend** app (Next.js standalone) on port 8080.
* Shared **PostgreSQL** addon.
* Shared **Redis** addon.
* Each app has its own Dockerfile. Frontend→backend communication happens through the backend’s public URL (or internal routing if available).

**Approach B — Single app with a process manager:**

* One Dockerfile with `supervisord` or `s6-overlay` that runs both FastAPI and Next.js in one container. A lightweight reverse proxy (Caddy/nginx) sits on port 8080.
* Simpler for start-up, but less scalable.

> **Recommendation:** Start in phase 1 with **Approach B** (simplicity and fast deployment), then migrate to **Approach A** in phase 2 (independent frontend/backend scaling). This document supports both.

### 16.3 Sample Backend Dockerfile (Approach B, Single App)

```dockerfile
FROM python:3.12-slim AS backend-base
ENV PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl supervisor nginx \
    && rm -rf /var/lib/apt/lists/*
COPY backend/pyproject.toml backend/uv.lock* ./
RUN pip install --upgrade pip && pip install uv && uv sync --frozen --no-dev
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# --- frontend build ---
FROM node:20-slim AS frontend-build
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build   # next standalone output

# --- final ---
FROM backend-base
COPY --from=frontend-build /fe/.next/standalone /app/frontend-standalone
COPY --from=frontend-build /fe/.next/static /app/frontend-standalone/.next/static
COPY docker/supervisord.conf /etc/supervisor/conf.d/app.conf
COPY docker/nginx.conf /etc/nginx/nginx.conf
# migrations are run in CC_PRE_RUN_HOOK
ENV CG_HTTP_PORT=8080
EXPOSE 8080
CMD ["supervisord", "-c", "/etc/supervisor/supervisord.conf"]
```

nginx listens on 8080: `/v1/*` and `/api/admin/*` and `/health` → FastAPI (for example 8000), everything else → Next.js (for example 3000).

### 16.4 Clever Cloud Settings

| Variable                      | Value                                            |
| ----------------------------- | ------------------------------------------------ |
| `CC_DOCKER_EXPOSED_HTTP_PORT` | `8080`                                           |
| `CC_PRE_RUN_HOOK`             | `cd /app/backend && uv run alembic upgrade head` |
| `DATABASE_URL`                | from PostgreSQL addon (`POSTGRESQL_ADDON_URI`)   |
| `REDIS_URL`                   | from Redis addon (`REDIS_ADDON_URL`)             |
| `CG_MASTER_KEY`               | (secret)                                         |
| `CG_JWT_SECRET`               | (secret)                                         |
| `CG_ADMIN_USERNAME`           | `slaman` (also from seed)                        |
| `CG_ADMIN_PASSWORD`           | (secret; must match final value in seed)         |

> Health check: Clever Cloud automatically checks the root path. It is better if `/health` also responds on `/`, or a rewrite is applied.

### 16.5 Scaling on Clever Cloud

* Increase the number of instances (horizontal) from the console → multiple containers behind Clever Cloud’s internal load balancer.
* **Distributed mode:** because multiple instances may run, the **Router and Circuit Breaker state must be shared in Redis** (not local memory) so they stay consistent across instances. LiteLLM supports Redis for this purpose (`redis_host`).

---

## 17. Migration and Admin Account Seed

### 17.1 Tooling

* **Alembic** with autogenerate from SQLAlchemy 2.0 models.
* Each migration is independent, reversible (downgrade), and idempotent.
* Migrations are automatically run in `CC_PRE_RUN_HOOK` before the app starts.

### 17.2 Admin Seed

A separate migration (or data migration) that inserts the admin user if it does not exist:

```python
# alembic/seeds/0001_admin_seed.py  (conceptual)
from alembic import op
import sqlalchemy as sa
from passlib.hash import argon2

def upgrade():
    bind = op.get_bind()
    exists = bind.execute(sa.text(
        "SELECT 1 FROM users WHERE username = :u"
    ), {"u": "slaman"}).scalar()
    if not exists:
        bind.execute(sa.text("""
            INSERT INTO users (username, email, password_hash,
                               first_name, last_name, is_active, is_admin)
            VALUES (:u, :e, :p, :fn, :ln, TRUE, TRUE)
        """), {
            "u": "slaman",
            "e": "olddealers@gmail.com",
            "p": argon2.hash("136517"),
            "fn": "Salman",
            "ln": "JB",
        })

def downgrade():
    op.execute("DELETE FROM users WHERE username = 'slaman'")
```

> **Security:** the password `136517` must be overridden in production via env (`CG_ADMIN_PASSWORD`); the seed is only for the initial bootstrap. It is recommended to change the password after the first login.

| Field      | Seed Value             |
| ---------- | ---------------------- |
| username   | `slaman`               |
| password   | `136517` (hashed)      |
| email      | `olddealers@gmail.com` |
| first_name | `Salman`               |
| last_name  | `JB`                   |
| is_admin   | `TRUE`                 |

---

## 18. Real-Time Monitoring and Observability

### 18.1 Metrics (Prometheus)

* `cg_requests_total{provider, model, status, cache_hit}`
* `cg_request_duration_seconds` (histogram, p50/p95/p99)
* `cg_tokens_total{direction, model}`
* `cg_cost_usd_total`
* `cg_provider_health{provider}` (1=healthy, 0=down/cooldown)
* `cg_active_concurrency{provider}`
* `cg_cache_hits_total` / `cg_cache_misses_total`
* System: CPU, RAM, event loop lag, pool sizes.

### 18.2 Real-Time Admin Dashboard

* SSE endpoint (`/api/admin/stream/metrics`) that sends snapshots every 1–2 seconds.
* Immediate push for events (provider down, budget exceeded, critical error).
* Charts: RPS, latency, token throughput, errors by provider, utilization heatmap.

### 18.3 Logging

* `structlog` with context (request_id, user_id, api_key_id, provider, deployment, model).
* INFO level in production, DEBUG can be enabled via env.
* Full payloads optionally and with short retention (privacy + size) in `request_logs` or an external system.

### 18.4 Alerting (Phase 2)

* Webhooks to Slack/PagerDuty for: provider down, budget exceeded, latency > threshold, error rate > threshold.

---

## 19. Phased Development Roadmap

### Phase 0 — Bootstrap (Weeks 1–2)

* Monorepo structure, pyproject, Dockerfile, local docker-compose.
* FastAPI skeleton + lifespan + config + logging + health.
* PostgreSQL + Alembic + base models + **admin seed**.
* Admin auth (login/JWT) + minimal Admin API.
* Next.js + Joy UI skeleton + login page + layout.
* Initial deployment on Clever Cloud (Approach B).

### Phase 1 — Core and OpenAI API (Weeks 3–6)

* Provider Abstraction Layer + `LiteLLMAdapter` + `RouterBuilder` (from DB).
* OpenAI-compatible endpoints (`/v1/chat/completions`, `/v1/completions`, `/v1/embeddings`, `/v1/models`) with SSE streaming.
* Virtual API Key auth + rate limit (Redis).
* Core Engine: async orchestration, ProcessPool, connection pools, non-blocking streaming buffer.
* Load balancing (LiteLLM Router) + Circuit Breaker + Cooldown + Fallback.
* Hot reload of provider config.
* Panel: Providers Management, Virtual Keys, minimal Dashboard.
* Monitoring: basic metrics + initial real-time dashboard.

### Phase 2 — Optimization and Cache (Weeks 7–10)

* Two-tier semantic cache (L1 exact in Redis, L2 with pgvector).
* Streaming cache replay.
* Full spend/cost tracking + cost dashboard.
* Audit logs + request logs with search.
* Alerting webhooks.
* Scalability optimization (Router/Breaker in Redis for multiple instances).
* Migration to Approach A (separate frontend/backend) if needed.

### Phase 3 — Advanced Intelligence (Weeks 11–16)

* Payload Splitting (recursive + sliding window + map/reduce).
* Context Compression (light local model or cheap provider).
* Guardrails: PII redaction + de-masking + prompt injection detection.
* MCP Gateway (initial) for tool calling.
* Batch inference (aggregation and scheduling).

### Phase 4 — Enterprise (After Phase 3)

* SSO/SAML, granular RBAC, multi-team.
* Vault integration, BYOK.
* A/B testing / traffic mirroring.
* Fine-tuning orchestration.
* Dedicated provider plugins (separate from LiteLLM).

---

## 20. Risks, Trade-Offs, and Open Decisions

| Topic                                   | Risk/Trade-Off                                     | Decision/Recommendation                                                             |
| --------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Joy UI on hold**                      | Long-term update risk, maintenance risk.           | Build an abstraction layer; Material UI should be ready as fallback.                |
| **LiteLLM as a core dependency**        | Large dependency surface, update behavior.         | Keep it behind ProviderAdapter so it can be replaced.                               |
| **GIL and CPU-bound work**              | Local splitting/embedding may become a bottleneck. | ProcessPool with size = cores; move embeddings to a provider in phase 3.            |
| **Clever Cloud single-container setup** | No Docker Compose; independent scaling is harder.  | Phase 1 Approach B, phase 2 Approach A.                                             |
| **Distributed Router state**            | Multiple instances require shared Redis.           | Use Redis for state from phase 1 onward.                                            |
| **Guardrails/PII latency**              | Processing may slow the path.                      | Async in the background; only strict mode blocks.                                   |
| **Storing full payloads**               | Size and privacy concerns.                         | Metadata in phase 1; full payloads later with short retention and optional storage. |
| **Admin seed password (`136517`)**      | Too weak for production.                           | Override with env in production; force change after first login.                    |
| **Multi-provider stream splitting**     | Chunk ordering during merging.                     | Gather fully then reduce; or use ordered streaming with chunk numbers.              |

---

## 21. Appendix

### 21.1 Conceptual Latency Model

```text
T_total = T_auth + T_ratelimit + T_cache_lookup + T_guardrail + T_queue + T_upstream + T_stream
                └──── async/parallel ────┘     └ CPU pool (async) ┘   └ async I/O ┘
Goal: T_queue ≈ 0, T_guardrail non-blocking, T_upstream minimized with less-busy routing.
```

### 21.2 Feature-to-Phase Map

| Feature                                | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
| -------------------------------------- | :-----: | :-----: | :-----: | :-----: |
| OpenAI-compatible API + streaming      |    ✅    |         |         |         |
| LiteLLM adapter + hot reload           |    ✅    |         |         |         |
| Load balancing + CB + fallback         |    ✅    |         |         |         |
| Virtual keys + rate limit              |    ✅    |         |         |         |
| Admin panel (providers/keys/dashboard) |    ✅    |         |         |         |
| Semantic cache (L1+L2)                 |         |    ✅    |         |         |
| Spend tracking + audit                 |   base  |    ✅    |         |         |
| Payload splitting                      |         |         |    ✅    |         |
| Context compression                    |         |         |    ✅    |         |
| PII / Prompt guard                     |         |         |    ✅    |         |
| MCP Gateway                            |         |         |    ✅    |         |
| Batch inference                        |         |         |    ✅    |         |
| SSO / granular RBAC / Vault            |         |         |         |    ✅    |
| Custom provider plugins                |         |         |         |    ✅    |

### 21.3 Reference Sources

* LiteLLM Proxy docs — config.yaml, routing/load-balancing, virtual keys, caching, guardrails.
* Clever Cloud Docker docs — port 8080, env vars, addons, build hooks.
* MUI Joy UI docs — beta and on-hold status (Material UI recommended).
* Design patterns: async gateway, circuit breaker, semantic cache, recursive text splitting.

---

> **End of document.** This document is the design baseline and will be updated during development. Next step: confirm the deployment approach (A/B) and the final UI library choice, then begin Phase 0.
