# Clever Gateway — مستند طراحی فنی (Technical Design Document)

> یک میان‌افزار (Middleware) خالصِ لودبالانسر و روترِ APIهای هوش مصنوعی، با خروجی **OpenAI-Compatible**، هسته‌ی پردازشی موازی و غیرانسدادی، و پنل مدیریتی پیشرفته.

---

## فهرست

1. [خلاصه اجرایی و چشم‌انداز](#1-خلاصه-اجرایی-و-چشم‌انداز)
2. [اصول طراحی و اهداف غیرقابل مذاکره](#2-اصول-طراحی-و-اهداف-غیرقابل-مذاکره)
3. [تصمیمات تکنولوژی و دلیل انتخاب](#3-تصمیمات-تکنولوژی-و-دلیل-انتخاب)
4. [معماری کلی سیستم](#4-معماری-کلی-سیستم)
5. [طراحی هسته‌ی پردازشی (Core Engine)](#5-طراحی-هسته-پردازشی-core-engine)
6. [لایه انتزاع ارائه‌دهندگان (Provider Abstraction Layer)](#6-لایه-انتزاع-ارائهدهندگان-provider-abstraction-layer)
7. [مسیریابی و موازنه بار هوشمند](#7-مسیریابی-و-موازنه-بار-هوشمند)
8. [لایه API سازگار با OpenAI](#8-لایه-api-سازگار-با-openai)
9. [تقسیم و شکستن پیام‌های حجیم (Payload Splitting)](#9-تقسیم-و-شکستن-پیامهای-حجیم-payload-splitting)
10. [کش معنایی دو سطحی](#10-کش-معنایی-دو-سطحی)
11. [امنیت و Guardrails](#11-امنیت-و-guardrails)
12. [پنل ادمین (Next.js + Joy UI)](#12-پنل-ادمین-nextjs--joy-ui)
13. [طراحی پایگاه داده (PostgreSQL)](#13-طراحی-پایگاه-داده-postgresql)
14. [طراحی API (ادمین + کاربر)](#14-طراحی-api-ادمین--کاربر)
15. [ساختار پروژه (Monorepo)](#15-ساختار-پروژه-monorepo)
16. [داکرایز و استقرار روی Clever Cloud](#16-داکرایز-و-استقرار-روی-clever-cloud)
17. [مایگریشن و Seed اکانت ادمین](#17-مایگریشن-و-seed-اکانت-ادمین)
18. [مانیتورینگ بلادرنگ و Observability](#18-مانیتورینگ-بلادرنگ-و-observability)
19. [نقشه راه توسعه فازبندی‌شده](#19-نقشه-راه-توسعه-فازبندیشده)
20. [خطرات، مبادلات و تصمیمات معلق](#20-خطرات-مبادلات-و-تصمیمات-معلق)
21. [پیوست](#21-پیوست)

---

## 1. خلاصه اجرایی و چشم‌انداز

**Clever Gateway** یک دروازه‌ی یکپارچه است که چندین سرویس‌دهنده‌ی مدل AI (مثل Gemini، OpenAI، Anthropic، Bedrock، …) را پشت یک **API واحدِ سازگار با OpenAI** قرار می‌دهد. کلاینت نهایی فقط با یک Base URL و یک Virtual API Key کار دارد و هیچ‌گاه با پیچیدگی‌های چندین سرویس‌دهنده درگیر نمی‌شود.

هسته‌ی این سیستم سه ویژگی متمایز دارد:

- **غیرانسدادی مطلق (Non-blocking):** هر درخواست ورودی بی‌درنگ به یک تسک ناهمگام تبدیل می‌شود و پردازش شبکه بلافاصله آغاز می‌شود. هیچ درخواستی منتظر تکمیل درخواست قبلی نمی‌ماند.
- **موازانه واقعی روی هسته‌های CPU:** با ترکیب `asyncio` (برای I/O شبکه) و استخرهای پردازشی چندگانه (`multiprocessing`/ProcessPool) برای محاسبات CPU-bound، محدودیت GIL پایتون دور زده می‌شود.
- **هوشمندی هسته در مدیریت پیچیدگی:** تقسیم پیام‌های حجیم، کش معنایی، موازنه بار، Circuit Breaker و Fallback همگی در لایه‌ی میان‌افزار و به‌صورت شفاف برای کلاینت انجام می‌شود.

فاز اول، از **LiteLLM** به‌عنوان آداپتور اتصال‌دهنده‌ی مدل‌ها به API سازگار با OpenAI استفاده می‌کند؛ اما طراحی به‌صورت **ماژولار** است تا در آینده هر سرویس‌دهنده‌ی AI در جهان بتواند بدون تغییر هسته اضافه شود.

---

## 2. اصول طراحی و اهداف غیرقابل مذاکره

| # | اصل | توضیح |
|---|-----|-------|
| D1 | **میان‌افزار خالص** | هسته هیچ منطق تجاری کلاینت ندارد. فقط دریافت درخواست، هدایت، پردازش و پاسخ. |
| D2 | **تأخیر صفر در شروع** | به محض دریافت درخواست، یک coroutine/تسک مستقل متولد می‌شود. هیچ صفِ مسدودکننده‌ای قبل از شروع I/O وجود ندارد. |
| D3 | **موازی‌سازی کامل** | همزمانی I/O با `asyncio`، و CPU-bound با Process Pool روی تمام هسته‌ها. |
| D4 | **مدل‌پذیری بدون محدودیت حجم** | هر درخواست با هر طولی پردازش می‌شود؛ تقسیم بر عهده‌ی هسته است. |
| D5 | **ماژولار بودن ارائه‌دهندگان** | افزودن provider جدید نباید هسته را تغییر دهد (Open/Closed Principle). |
| D6 | **Resilience پیش‌فرض** | Circuit Breaker، Cooldown، Retry و Fallback در همه‌ی مسیرها فعال‌اند. |
| D7 | **Hot Reload پیکربندی** | تغییر تنظیمات provider از پنل، بدون ری‌استارت سرور اعمال می‌شود. |
| D8 | **قابل استقرار به‌صورت Docker App روی Clever Cloud** | پیکربندی باید با محدودیت‌ها و قراردادهای Clever Cloud هم‌خوان باشد. |
| D9 | **قابلیت مشاهده (Observability)** | هر تراکنش قابل ردیابی، قابل ممیزی و قابل اندازه‌گیری است. |
| D10 | **امنیت پیش‌فرض** | کلیدهای واقعی provider هرگز آشکار ذخیره نمی‌شوند؛ Virtual Key برای کاربران صادر می‌شود. |

---

## 3. تصمیمات تکنولوژی و دلیل انتخاب

### 3.1 بک‌اند: FastAPI

| دلیل | توضیح |
|------|-------|
| ASGI/native async | پشتیبانی بومی از `asyncio` برای I/O غیرانسدادی که هسته‌ی اصلی D2 است. |
| Stream first-class | پشتیبانی طبیعی از `StreamingResponse` و SSE برای پاسخ‌های جریانی OpenAI. |
| Pydantic v2 | اعتبارسنجی سریع (Rust-core) و تایپ‌پذیری قوی برای payloadهای OpenAI. |
| Dependency Injection | مناسب برای لایه‌بندی auth، rate limit، logging به‌صورت middleware/guard. |
| اکوسیستم | سازگاری کامل با SQLAlchemy، Alembic، httpx، Pydantic Settings. |

**سرور تولید:** `uvicorn` با `uvloop` و `httptools`، پشت `gunicorn` به‌عنوان process manager با چند worker (به تعداد هسته‌ها) — هر worker یک event loop مستقل.

### 3.2 پایگاه داده: PostgreSQL + SQLAlchemy 2.0 + Alembic

- **PostgreSQL:** رابطه‌ای قدرتمند، JSONB برای ذخیره‌ی payloadهای منعطف (messages, response)، `pg_trgm` و `pgvector` (extension) برای جستجوی متنی و برداری (کش معنایی در فاز بعد).
- **SQLAlchemy 2.0:** با تایپ‌پذیری (Typed `Mapped`)، async engine (`asyncpg`).
- **Alembic:** مایگریشن قدرتمند و قابل بازگشت، با Autogenerate و seed data در فایل migration مجزا.

### 3.3 کش و حالت موقت: Redis

- کش معنایی سطح اول (exact-hash)،
- شمارش نرخ (rate limit sliding-window)،
- نگاشت Circuit Breaker و cooldown،
- صف‌های سبک (stream/RPC) و pub/sub برای مانیتورینگ بلادرنگ،
- جلسات ادمین (session store) و rate-limit-per-key.

### 3.4 لایه اتصال provider: LiteLLM (فاز اول)

> **تصمیم کلیدی معماری:** LiteLLM **به‌عنوان کتابخانه/SDK درون فرآیند FastAPI** استفاده می‌شود، نه به‌عنوان یک پروکسی مجزای در حال اجرا. یعنی ما `litellm.Router` (یا `litellm.acompletion`) را مستقیماً در کد gateway فراخوانی می‌کنیم.

دلیل این تصمیم:
- حذف یک hop شبکه‌ی اضافی و کاهش تأخیر (D2).
- کنترل کامل روی routing strategy، retry و fallback از دیتابیس به‌صورت پویا.
- قابلیت Hot Reload پیکربندی Router از پنل ادمین بدون ری‌استارتِ proxy جداگانه.

`litellm` از صدها provider (OpenAI, Azure, Gemini, Bedrock, Anthropic, Cohere, Mistral, TogetherAI, Ollama, vLLM, …) پشتیبانی می‌کند و این دقیقاً هدف ماژولاریتی D5 را در فاز اول تأمین می‌کند. در فازهای بعد، providerهایی که نیاز به منطق سفارشی دارند (مثلاً MCP Gateway داخلی، یا API اختصاصی) از طریق **Provider Adapter** مستقل پیاده‌سازی می‌شوند و LiteLLM فقط یکی از adapterها خواهد بود.

### 3.5 فرانت‌اند پنل: Next.js (App Router) + Joy UI

> **هشدار مهم درباره‌ی Joy UI:** طبق مستندات رسمی MUI، Joy UI در وضعیت beta است و **توسعه‌ی آن در حال حاضر متوقف (on hold)** شده. MUI برای پروژه‌های جدید Material UI را توصیه می‌کند. این موضوع را در تصمیم‌گیری نهایی مدنظر داشته باشید.

**توصیه:** دو گزینه پیشنهاد می‌شود:

1. **(توصیه‌شده) MUI Material UI v6** — پشتیبانی تضمین‌شده، اکوسیستم بالغ، قابلیت Pigment CSS برای zero-runtime styling. برای یک پنل ادمین با نیاز به پایداری بلندمدت مناسب‌تر است.
2. **Joy UI** — اگر به زیباییِ out-of-the-box و طراحی منحصربه‌فرد آن اصرار دارید، پذیرفته می‌شود اما با ریسکِ عدم آپدیت طولانی‌مدت.

در این مستند، طراحی پنل به‌گونه‌ای ارائه می‌شود که با **هر دو** کتابخانه قابل پیاده‌سازی باشد (لایه‌ی abstraction روی component primitives). بخش component-level به Joy UI اشاره می‌کند اما قابل تعویض است.

**چرا Next.js:** App Router، Server Components، API routes (در صورت نیاز به BFF)، standalone output برای Docker، SSR برای داشبورد.

### 3.6 سایر ابزارهای بک‌اند

| ابزار | کاربرد |
|-------|--------|
| `httpx` | کلاینت HTTP ناهمگام با connection pooling و HTTP/2 برای فراخوانی providerها (زیر لایه LiteLLM). |
| `pydantic-settings` | مدیریت تنظیمات از env با تایپ‌پذیری. |
| `passlib[bcrypt]` / `argon2-cffi` | هش رمز عبور ادمین/کاربر. |
| `python-jose[cryptography]` | صدور و اعتبارسنجی JWT (ادمین) و Virtual API Key. |
| `structlog` | لاگ‌سازی ساختاریافته با context (request_id، user_id، provider). |
| `prometheus-client` / `prometheus-fastapi-instrumentator` | متریک‌ها. |
| `tenacity` | خط‌مشی retry با backoff نمایی (مکمل Circuit Breaker). |
| `orjson` | سریالایز JSON فوق‌سریع. |
| `uvloop` + `httptools` | جایگزینی event loop و parser HTTP با پیاده‌سازی C. |
| `apscheduler` یا Celery (فاز بعد) | وظایف پس‌زمینه (تمیزکاری کش، گزارش‌های دوره‌ای، batch). |

---

## 4. معماری کلی سیستم

```
                        ┌─────────────────────────────────────────────┐
                        │            کلاینت‌های نهایی / SDKs           │
                        │   (OpenAI SDK, LangChain, curl, اپلیکیشن)    │
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
   │  Admin Panel (Next.js + Joy UI)     │  ← Docker app مجزا (یا static export)
   │  داشبورد بلادرنگ / مدیریت providers │     که Admin API را صدا می‌زند
   └─────────────────────────────────────┘
```

**توضیح جریان درخواست (Happy Path):**

1. کلاینت با Virtual Key به `/v1/chat/completions` درخواست می‌زند.
2. Auth Guard کلید را اعتبارسنجی و user/team/budget را بارگذاری می‌کند.
3. Rate Limiter (Redis) نرخ را بررسی می‌کند.
4. Semantic Cache بررسی می‌کند (exact → vector)؛ در صورت hit، پاسخ از کش (با پخش SSE) بازگردانده می‌شود.
5. Payload Splitter بررسی می‌کند آیا payload از ظرفیت context window عبور می‌کند؛ در صورت نیاز تقسیم می‌کند.
6. Guardrails ورودی را در پس‌زمینه (async) پاک‌سازی می‌کند.
7. Core Engine یک coroutine مستقل می‌سازد و آن را به Load Balancer می‌سپارد.
8. Load Balancer بر اساس strategy (least-busy / latency / weighted) یک deployment سالم انتخاب می‌کند (با احتساب Circuit Breaker و cooldown).
9. Provider Adapter درخواست را (از طریق LiteLLM) به upstream می‌فرستد؛ پاسخ جریانی از طریق Non-blocking Buffer به کلاینت streaming می‌شود.
10. در پس‌زمینه: spend/token usage ثبت، audit log نوشته، متریک‌ها به‌روزرسانی و cache (در صورت مناسب بودن) پر می‌شود.

---

## 5. طراحی هسته‌ی پردازشی (Core Engine)

این بخش قلب D2، D3 و D4 است: **تأخیر صفر + موازی‌سازی واقعی + بدون انسداد**.

### 5.1 مدل همزمانی ترکیبی (Hybrid Concurrency)

چالش اصلی پایتون **GIL** است: یک thread نمی‌تواند به‌طور همزمان روی چند هسته کد پایتون اجرا کند. اما برای یک gateway که ۹۵٪ کارش I/O شبکه است، GIL مشکل کوچکی است؛ زیرا I/O در `asyncio` GIL را آزاد می‌کند. مشکل واقعی در **CPU-bound** است (تقسیم متن، هش، رمزنگاری، embedding محلی).

راهکار ترکیبی:

```
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
│  گunicorn: N workers × (1 event loop + 1 process pool)     │
└─────────────────────────────────────────────────────────────┘
```

**قاعده‌ی طلایی تقسیم کار:**

- **I/O-bound (شبکه، DB، Redis):** همیشه در event loop با `await` (هیچ `time.sleep` یا `requests` مسدودکننده‌ای مجاز نیست).
- **CPU-bound محاسباتی:** به `ProcessPoolExecutor` واگذار می‌شود تا GIL را دور بزند. این کار با `asyncio.get_running_loop().run_in_executor(pool, fn, ...)` به‌صورت ناهمگام انجام می‌شود و event loop را مسدود نمی‌کند.

### 5.2 بدون تأخیر در شروع (Zero Start Latency)

هیچ کدام از مراحل زیر نباید قبل از شروع شبکه‌ی upstream مسدود باشند:

- Auth، Rate Limit، Cache Lookup همگی async و موازی (`asyncio.gather` برای مستقل‌ها).
- **هر درخواست مستقل برای یک مدل، یک تسک جدید می‌سازد.** اگر Gemini در حال پاسخ‌دهی به ۵ درخواست است و درخواست ششم می‌آید، ششمین coroutine فوراً آغاز می‌شود (در صورت وجود deployment سالم یا fallback). LiteLLM Router با `routing_strategy="least-busy"` این توزیع را مدیریت می‌کند.
- **هیچ صفِ سراسری بلاکینگ وجود ندارد.** کنترل بار از طریق rate limit و circuit breaker انجام می‌شود، نه از طریق صفِ FIFO مسدودکننده.

### 5.3 Connection Pooling

- `httpx.AsyncClient` با HTTP/2، keep-alive و pool limits بزرگ (مثلاً `max_connections=1000`).
- Connection poolهای جداگانه به ازای هر provider برای ایزوله‌سازی (D1 و عدم سرایت خطا).
- `asyncpg` connection pool برای PostgreSQL.
- Redis async pool (`redis.asyncio`).

### 5.4 Non-blocking Streaming Buffer

برای پاسخ‌های SSE از upstream که باید به کلاینت streaming شوند:

```python
# مفهومی
async def stream_passthrough(upstream_aiter, client_send):
    async for chunk in upstream_aiter:        # non-blocking دریافت از upstream
        await client_send(chunk)              # non-blocking ارسال به کلاینت
    await client_send("[DONE]")
```

از یک `asyncio.Queue` به‌عنوان ring buffer بین upstream-consumer و client-producer استفاده می‌شود تا حتی اگر کلاینت کند باشد، upstream متوقف نشود (backpressure کنترل‌شده با `maxsize`).

### 5.5 Backpressure و کنترل اضافه‌بار

به‌جای رد کردن درخواست‌ها در یک صف بلاکینگ، از موارد زیر استفاده می‌شود:
- **Rate limit per virtual key / per IP** (Redis sliding window).
- **Max concurrency per provider** (semaphore per deployment) — وقتی پر شد، router به deployment بعدی یا fallback می‌رود.
- **Adaptive concurrency limit** بر اساس latency (congestion control شبیه به AIMD) برای جلوگیری از فروپاشی تحت بار.

---

## 6. لایه انتزاع ارائه‌دهندگان (Provider Abstraction Layer)

این لایه تضمین می‌کند که **هسته هرگز به یک provider خاص وابسته نیست** (D5).

### 6.1 رابط Provider (Protocol/ABC)

```python
# app/providers/base.py  (مفهومی)
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

### 6.2 Registry و Plug-in

- یک `ProviderRegistry` که adapterها را بر اساس نوع provider ثبت می‌کند.
- افزودن provider جدید = ساخت یک کلاس adapter جدید + ثبت در registry. **هسته تغییر نمی‌کند.**
- فاز اول: فقط `LiteLLMAdapter` که `litellm.Router` را wrap می‌کند.
- فازهای بعد: `GeminiDirectAdapter`، `MCPGatewayAdapter`، `BatchAdapter`، …

### 6.3 نگاشت مدل دیتابیس به‌ LiteLLM config

پنل ادمین provider/deployment/key را در دیتابیس ذخیره می‌کند. یک سرویس `RouterBuilder` به‌صورت پویا از این رکوردها یک `litellm.Router` می‌سازد:

```
DB rows (providers, deployments, api_keys)
        │
        ▼
RouterBuilder.build()  →  litellm.Router(model_list=[...], router_settings={...})
        │
        ▼
LiteLLMAdapter.router  (به‌روزرسانی بدون ری‌استارت = Hot Reload)
```

پشتیبانی از قابلیت‌های LiteLLM: `routing_strategy`، `fallbacks`، `context_window_fallbacks`، `num_retries`، `timeout`، `tpm/rpm`، `allowed_fails`، `cooldown_time`.

### 6.4 Hot Reload

- وقتی ادمین provider/deployment/key را در پنل تغییر می‌دهد، یک سیگنال داخلی (یا Pub/Sub از Redis برای instanceهای چندگانه) `RouterBuilder` را مجدداً فعال می‌کند.
- Router جدید به‌صورت اتمیک با قبلی جایگزین می‌شود (`asyncio.Lock`). درخواست‌های در جریان روی router قدیمی ادامه می‌دهند.

---

## 7. مسیریابی و موازنه بار هوشمند

| قابلیت | مکانیزم | دستاورد |
|--------|---------|---------|
| **چرخش توکن (Token Rotation)** | چند deployment با `model_name` یکسان → LiteLLM بین آن‌ها load balance می‌کند. استراتژی: `simple-shuffle` (وزنی بر اساس tpm/rpm) یا `least-busy`. | توزیع متوازن و جلوگیری از 429. |
| **مسیریابی مبتنی بر تأخیر** | `routing_strategy="latency-based-routing"` با رصد مداوم latency. | هدایت به سریع‌ترین provider در لحظه. |
| **Circuit Breaker** | `allowed_fails` + `cooldown_time` در LiteLLM؛ deployment پس از N خطا از مدار خارج و پس از cooldown برمی‌گردد. | جلوگیری از هدررفت زمان روی provider معیوب. |
| **Cooldown خودکار** | کلیدهای مسدودشده (429/5xx) در قرنطینه با TTL در Redis. | ریکاوری خودکار بدون دخالت ادمین. |
| **Fallback Chain** | `fallbacks: [{gpt-4o: [claude-3-5, gemini-pro]}]` و `context_window_fallbacks`. | دسترسی همیشگی حتی در قطعی یک پلتفرم. |
| **Retry هوشمند** | `num_retries` با backoff نمایی (tenacity) فقط روی خطاهای قابل retry (429, 5xx, timeout). | تاب‌آوری بدون طوفان retry. |
| **Max Concurrency per deployment** | `asyncio.Semaphore` به ازای هر deployment. | کنترل backpressure و جلوگیری از اشباع یک کلید. |

**سیاست پیش‌فرض پیشنهادی فاز اول:**
```yaml
router_settings:
  routing_strategy: simple-shuffle   # با tpm/rpm ست‌شده → weighted pick
  num_retries: 3
  timeout: 60
  allowed_fails: 3
  cooldown_time: 60
  fallbacks: [...]                   # از دیتابیس
```

---

## 8. لایه API سازگار با OpenAI

این لایه قرارداد با کلاینت است. باید **دقیقاً** مانند OpenAI رفتار کند تا هر SDK بدون تغییر کار کند (فقط تغییر `base_url` و `api_key`).

### 8.1 Endpoints پیاده‌سازی‌شده (فاز اول)

| متد | مسیر | توضیح |
|-----|------|-------|
| POST | `/v1/chat/completions` |_chat (stream + non-stream) |
| POST | `/v1/completions` | text completions |
| POST | `/v1/embeddings` | embedding |
| GET  | `/v1/models` | لیست مدل‌های مجاز کاربر |
| GET  | `/v1/models/{id}` | اطلاعات مدل |
| POST | `/v1/images/generations` | (فاز بعد) |
| POST | `/v1/audio/*` | (فاز بعد) |
| GET  | `/health`, `/health/live`, `/health/ready` | health check |

### 8.2 احراز هویت

- **کلاینت‌ها:** با `Authorization: Bearer <Virtual API Key>` → رکورد `api_keys` در DB. کلیدها فرمت `sk-cg-...` دارند.
- **ادمین پنل:** با JWT (پس از login با username/password + 2FA اختیاری). JWT کوتاه‌مدت + refresh token.
- **Master Key:** یک `MASTER_KEY` برای bootstrap/پنل (در env).

### 8.3 Streaming (SSE)

- هدر `Content-Type: text/event-stream`، فرمت دقیقاً مطابق OpenAI (`data: {chunk}\n\n`).
- پاسخ جریانی upstream به‌صورت passthrough با non-blocking buffer.
- پشتیبانی از `stream_options: {include_usage: true}`.

### 8.4 سازگاری پارامترها

`drop_params=True` در litellm: پارامترهای نامعتبر برای یک provider به‌صورت بی‌خطر حذف می‌شوند تا سازگاری حفظ شود. Mapping مدل (مثلاً `gpt-4` → چند deployment) شفاف است.

---

## 9. تقسیم و شکستن پیام‌های حجیم (Payload Splitting)

این زیرسیستم D4 را برآورده می‌کند: **هیچ درخواستی به‌خاطر حجم رد نمی‌شود.**

### 9.1 جریان پردازش

```
payload بزرگ
   │
   ▼
(1) تخمین توکن (tiktoken / tokenizer provider)
   │  آیا از context window deployment عبور می‌کند؟
   │  ── خیر ──► ارسال مستقیم
   │  ─ـ بله ──▼
(2) Recursive Text Splitter (CPU Pool)
   │   بخش‌بندی بر اساس: Markdown headings → پاراگراف → جمله → کلمه
   │   با sliding window overlap (10–20%)
   ▼
(3) Map: ارسال موازی قطعات به deployments مختلف (asyncio.gather)
   ▼
(4) Reduce: تجمیع و پیراستن پاسخ‌ها → یکپارچه‌سازی معنایی
   ▼
پاسخ نهایی به کلاینت
```

### 9.2 جزئیات فنی

- **توکنایزر:** `tiktoken` برای تخمین سریع (CPU pool). برای providerهای غیر-OpenAI، تقریب با tokenizer متناظر.
- **مرز طبیعی:** اولویت با مرزهای معنادار (code fences، headings، پاراگراف) برای حفظ یکپارچگی.
- **هم‌پوشانی:** جلوگیری از گم شدن اطلاعات روی مرزها.
- **موازی‌سازی:** هر chunk یک coroutine مستقل → توزیع روی چند provider/توکن → کاهش زمان کل (wall time).
- **استثنا:** برای مکالمات چندتایی (chat history طولانی) به‌جای تقسیم، از **Context Compression** (فاز ۳) استفاده می‌شود.

---

## 10. کش معنایی دو سطحی

| سطح | مکانیزم | تأخیر |
|------|---------|-------|
| **L1 — Exact** | هش SHA256 از (model + normalized messages + params) → کلید در Redis. | < 1ms |
| **L2 — Semantic** (فاز ۲) | embedding پرامپت → جستجوی برداری (pgvector/Redis) → تشابه کسینوسی > threshold ادمین. | ~10–30ms |

- **Streaming cache:** ذخیره‌ی chunkهای SSE و بازپخش طبیعی برای حفظ رفتار streaming.
- **Adaptive TTL:** TTL بر اساس فراوانی دسترسی.
- **Invalidation:** دستی از پنل (پاک‌سازی گزینشی بر اساس مدل/کاربر/زمان).

---

## 11. امنیت و Guardrails

### 11.1 مدیریت کلیدها

- کلیدهای واقعی provider رمزنگاری‌شده در DB ذخیره می‌شوند (Fernet/AES با master key از env).
- کاربران فقط **Virtual API Key** دریافت می‌کنند که به user/team متصل است.
- آینده: ادغام با Vault (فاز enterprise).

### 11.2 Guardrails (فاز ۳، اما hooks از فاز ۱ آماده)

- **Input Phase:** PII Redaction (regex + NER سبک در CPU pool)، Prompt Injection detection (semantic guard).
- **Output Phase:** فیلتر محتوای غیرمجاز، De-masking (بازگردانی مقادیر اصلی با نگاشت موقت محلی).
- همه‌ی این‌ها **async و در پس‌زمینه** اجرا می‌شوند تا مسیر اصلی را نبندند (مگر در حالت strict که مسدود کردن ورودی لازم است).

### 11.3 Rate Limiting

- Sliding window در Redis به ازای (virtual_key, model, minute).
- سقف‌های جداگانه: RPM, TPM, Budget (دلاری/توکنی).

### 11.4 احراز هویت ادمین

- username/password (bcrypt/argon2) + **2FA (TOTP)** اختیاری.
- JWT کوتاه‌مدت (۱۵ دقیقه) + refresh token در cookie httpOnly.
- seed ادمین در migration (بخش ۱۷).

---

## 12. پنل ادمین (Next.js + Joy UI)

### 12.1 معماری

- Next.js App Router (standalone output برای Docker).
- ارتباط با **Admin API** بک‌اند از طریق Server Components / Client fetch با JWT.
- احراز هویت: صفحه‌ی login → دریافت JWT → ذخیره در httpOnly cookie.
- Real-time: **SSE/WebSocket** از بک‌اند برای داشبورد بلادرنگ (متریک‌ها، ترافیک زنده، health providers).

### 12.2 بخش‌های پنل

| بخش | قابلیت‌ها |
|-----|-----------|
| **Dashboard (بلادرنگ)** | نمودار RPS، latency p50/p95/p99، خطاها، مصرف CPU/RAM، وضعیت زنده‌ی providers، نمودار ترافیک ورودی/خروجی. |
| **Providers Management** | CRUD provider (نام، نوع، api_base، تنظیمات) و deployment (model_name، litellm_params، tpm/rpm). افزودن چند توکن. Hot reload. |
| **Models & Routing** | تعریف alias مدل، استراتژی routing، fallback chain، context window fallback. |
| **Users & Teams** | CRUD کاربر/تیم، سازمان‌دهی سلسله‌مراتبی، تخصیص دسترسی مدل. |
| **Virtual Keys** | تولید/ابطال کلید، تنظیم budget/rate limit، بررسی مصرف هر کلید. |
| **Spend & Cost** | داشبورد هزینه بر اساس کاربر/تیم/model/provider، توکن مصرفی. |
| **Monitoring / Audit** | لاگ‌های تراکنش (prompt خلاصه‌شده، response metadata، provider، latency، خطا)، جستجو و فیلتر. |
| **Cache Management** | مشاهده‌ی آمار کش، invalidation گزینشی، تنظیم TTL/threshold. |
| **Guardrails** (فاز ۳) | فعال‌سازی PII/Prompt Guard، سیاست‌ها. |
| **Settings** | تنظیمات عمومی، master key، 2FA، alerting webhooks. |

### 12.3 طراحی UI/UX

- چیدمان: **Sidebar** دائمی + **Topbar** با search و profile.
- تم: Dark/Light با ذخیره‌ی ترجیح.
- کامپوننت‌های کلیدی Joy UI: `Sheet`, `Card`, `Table`, `Charts` (با `@nivo` یا `recharts`), `Stat` (متریک کارت), `ListItem` برای وضعیت providers, `Alert`/`Toast` برای نوتیف.
- صفحات مدیریت: جداول قابل فیلتر/صفحه‌بندی، drawer برای ویرایش، modal برای تأیید.
- **Real-time dashboard** با به‌روزرسانی از طریق EventSource (SSE) هر ۱–۲ ثانیه + push فوری برای رویدادهای مهم.

### 12.4 ملاحظات Joy UI

با توجه به وضعیت on-hold بودن Joy UI:
- لایه‌ی component abstraction (مثلاً wrapperهای `cg/Card`, `cg/Table`) بسازید تا در صورت مهاجرت به Material UI، فقط wrapperها تغییر کنند و صفحات دست‌نخورده بمانند.
- از قابلیت‌های پایدار و موجود Joy UI استفاده کنید و به ویژگی‌های آزمایشی تکیه نکنید.

---

## 13. طراحی پایگاه داده (PostgreSQL)

### 13.1 لیست جدول‌ها (نمای کلی)

```
users            — کاربران سیستم (ادمین + کاربران API)
teams            — تیم‌ها/سازمان‌ها
user_teams       — رابطه کاربر-تیم با نقش
api_keys         — Virtual API Keys کاربران
providers        — ارائه‌دهندگان بالادستی (نوع، تنظیمات)
deployments      — نمونه‌ی یک مدل روی یک provider (model_name, litellm_params, tpm, rpm)
provider_keys    — کلیدهای واقعی provider (رمزنگاری‌شده)
model_aliases    — نگاشت alias کاربر-پسند به deployments (routing group)
routing_rules    — استراتژی routing، fallback، context_window_fallback
budgets          — سقف بودجه (توکن/دلار) به ازای user/team/key
rate_limits      — سقف نرخ به ازای user/team/key/model
request_logs     — لاگ هر درخواست (metadata، نه prompt کامل در فاز اول)
audit_logs       — لاگ اقدامات ادمین
spend_records    — مصرف توکن/هزینه به ازای درخواست
cache_entries    — متادیتای کش (اختیاری؛ داده‌ی اصلی در Redis)
provider_health  — snapshot وضعیت provider (breakers, latency, error rate)
settings         — تنظیمات عمومی سیستم (key-value)
```

### 13.2 نمونه‌ی اسکیمای کلیدی (مفهومی)

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

-- deployments (هر ردیف = یک litellm deployment)
CREATE TABLE deployments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    model_name      TEXT NOT NULL,               -- نام کاربر-پسند (alias group)
    litellm_model   TEXT NOT NULL,               -- مثلاً "gemini/gemini-1.5-pro"
    litellm_params  JSONB NOT NULL DEFAULT '{}', -- api_base, api_version, ...
    tpm             INT,
    rpm             INT,
    context_window  INT,
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    priority        INT NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- provider_keys (رمزنگاری‌شده)
CREATE TABLE provider_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
    label           TEXT NOT NULL,
    encrypted_key   BYTEA NOT NULL,              -- Fernet/AES
    key_hash        TEXT NOT NULL,               -- برای جستجو/عدم تکرار
    is_enabled      BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- api_keys (Virtual Keys کاربران)
CREATE TABLE api_keys (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    team_id         UUID REFERENCES teams(id) ON DELETE SET NULL,
    key_hash        TEXT UNIQUE NOT NULL,        -- هش کلید برای جستجوی سریع
    key_prefix      TEXT NOT NULL,               -- "sk-cg-abc..." نمایشی
    name            TEXT,
    allowed_models  TEXT[],                      -- محدودیت مدل
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at    TIMESTAMPTZ
);

-- request_logs (metadata؛ payload کامل optionally در فاز بعد با retention)
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

> اسکیمای کامل در فایل‌های Alembic پیاده‌سازی می‌شود. این‌جا فقط نمای کلی است.

### 13.3 ایندکس‌گذاری و بهینه‌سازی

- ایندکس روی `api_keys.key_hash` (جستجوی احراز هویت در هر درخواست).
- ایندکس روی `request_logs(created_at)` و پارتیشن‌بندی ماهانه برای جلوگیری از رشد جدول.
- `pgvector` extension (آماده‌سازی برای کش معنایی فاز ۲).
- JSONB GIN index روی `litellm_params` و `config`.

---

## 14. طراحی API (ادمین + کاربر)

### 14.1 Admin API (پشت پنل)

پیشوند: `/api/admin` (محافظت‌شده با JWT ادمین)

```
POST   /api/admin/auth/login            {username, password, totp?} → {access, refresh}
POST   /api/admin/auth/refresh
POST   /api/admin/auth/logout

GET    /api/admin/dashboard/metrics      → real-time KPIs (SSE/WebSocket نیز)
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
POST   /api/admin/api-keys               → تولید و بازگشت کلید (یک‌بار)
DELETE /api/admin/api-keys/{id}

GET    /api/admin/spend                  → گزارش هزینه (فیلتر/گروه)
GET    /api/admin/audit-logs
GET    /api/admin/request-logs           → با فیلتر/صفحه‌بندی
GET    /api/admin/provider-health        → وضعیت زنده providers

POST   /api/admin/cache/invalidate
GET    /api/admin/settings
PATCH  /api/admin/settings

POST   /api/admin/providers/{id}/test    → health check دستی
```

### 14.2 OpenAI-Compatible API

پیشوند: `/v1` (محافظت‌شده با Virtual API Key)

```
POST   /v1/chat/completions
POST   /v1/completions
POST   /v1/embeddings
GET    /v1/models
GET    /v1/models/{id}
GET    /health
```

### 14.3 قراردادهای مشترک

- نسخه‌بندی در هدر یا مسیر.
- صفحه‌بندی: `?page=&page_size=` با `Link` header.
- خطاها در فرمت OpenAI error envelope (`{"error": {...}}`).
- request_id در هدر `X-Request-ID` برای ردیابی end-to-end.

---

## 15. ساختار پروژه (Monorepo)

```
clever-gateway/
├── docs/
│   └── DESIGN.md                 ← همین مستند
├── backend/                      ← FastAPI core
│   ├── app/
│   │   ├── main.py               ← ساخت app + lifespan + middleware
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
│   │   │   ├── litellm_adapter.py← فاز اول
│   │   │   └── router_builder.py ← DB → litellm.Router (hot reload)
│   │   ├── routing/
│   │   │   ├── balancer.py
│   │   │   ├── breaker.py        ← Circuit Breaker (Redis-backed)
│   │   │   └── cooldown.py
│   │   ├── cache/
│   │   │   ├── exact.py          ← L1
│   │   │   └── semantic.py       ← L2 (فاز ۲)
│   │   ├── payload/
│   │   │   ├── splitter.py       ← recursive text splitter (CPU pool)
│   │   │   ├── aggregator.py
│   │   │   └── tokenizer.py
│   │   ├── guardrails/
│   │   │   ├── pii.py
│   │   │   └── prompt_guard.py   ← فاز ۳
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
│   │       └── 0001_admin_seed.py ← seed ادمین
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
│   └── docker-compose.yml        ← dev local
├── .env.example
├── Makefile
└── README.md
```

---

## 16. داکرایز و استقرار روی Clever Cloud

### 16.1 قراردادهای Clever Cloud Docker

بر اساس مستندات رسمی:
- اپ Docker با یک **Dockerfile** در ریشه (یا مسیر `CC_DOCKERFILE`) شناسایی می‌شود.
- اپ باید روی **پورت 8080** گوش دهد (یا با `CC_DOCKER_EXPOSED_HTTP_PORT` تنظیم شود).
- **Docker Compose پشتیبانی نمی‌شود**؛ هر اپ = یک کانتینر.
- env varها از کنسول Clever Cloud تزریق می‌شوند.
- **Addons:** PostgreSQL و Redis به‌صورت addon مدیریت‌شده ارائه می‌شوند و `POSTGRESQL_ADDON_*` و `REDIS_ADDON_*` به env تزریق می‌شوند.
- FS Bucket برای فایل‌های پایدار (اگر لازم شد).
- Build hooks (`CC_PRE_BUILD_HOOK`, `CC_POST_BUILD_HOOK`, `CC_PRE_RUN_HOOK`).

### 16.2 استراتژی استقرار پیشنهادی

چون Docker Compose پشتیبانی نمی‌شود، دو رویکرد داریم:

**رویکرد A (توصیه‌شده) — چند اپ مجزا:**
- اپ Docker **backend** (FastAPI) روی پورت 8080.
- اپ Docker (یا Node.js) **frontend** (Next.js standalone) روی پورت 8080.
- addon **PostgreSQL** (مشترک).
- addon **Redis** (مشترک).
- هر اپ با Dockerfile مستقل. ارتباط frontend→backend از طریق URL عمومی backend (یا internal routing در صورت موجود بودن).

**رویکرد B — اپ واحد با process manager:**
- یک Dockerfile با `supervisord` یا `s6-overlay` که هم FastAPI و هم Next.js را در یک کانتینر اجرا کند. روی پورت 8080 یک reverse proxy سبک (Caddy/nginx) قرار می‌گیرد.
- ساده‌تر برای شروع اما کمتر مقیاس‌پذیر.

> **توصیه:** فاز اول با **رویکرد B** (سادگی و استقرار سریع) شروع کنید، سپس در فاز ۲ به **رویکرد A** (مقیاس‌پذیری مستقل frontend/backend) مهاجرت کنید. این مستند هر دو را پشتیبانی می‌کند.

### 16.3 نمونه Dockerfile بک‌اند (رویکرد B، اپ واحد)

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
# migrations در CC_PRE_RUN_HOOK اجرا می‌شود
ENV CG_HTTP_PORT=8080
EXPOSE 8080
CMD ["supervisord", "-c", "/etc/supervisor/supervisord.conf"]
```

nginx روی 8080 گوش می‌دهد: `/v1/*` و `/api/admin/*` و `/health` → FastAPI (مثلاً 8000)، بقیه → Next.js (مثلاً 3000).

### 16.4 تنظیمات Clever Cloud

| متغیر | مقدار |
|-------|-------|
| `CC_DOCKER_EXPOSED_HTTP_PORT` | `8080` |
| `CC_PRE_RUN_HOOK` | `cd /app/backend && uv run alembic upgrade head` |
| `DATABASE_URL` | از addon PostgreSQL (`POSTGRESQL_ADDON_URI`) |
| `REDIS_URL` | از addon Redis (`REDIS_ADDON_URL`) |
| `CG_MASTER_KEY` | (سری) |
| `CG_JWT_SECRET` | (سری) |
| `CG_ADMIN_USERNAME` | `slaman` (همچنین از seed) |
| `CG_ADMIN_PASSWORD` | (سری؛ در seed با مقدار نهایی هماهنگ) |

> Health check: Clever Cloud به‌صورت خودکار روی مسیر ریشه بررسی می‌کند. بهتر است `/health` روی `/` هم پاسخ دهد یا یک rewrite انجام شود.

### 16.5 مقیاس‌پذیری روی Clever Cloud

- افزایش تعداد instance (horizontal) از کنسول → چند کانتینر پشت load balancer داخلی Clever Cloud.
- **حالت توزیع‌شده:** چون چند instance ممکن است اجرا شود، **حالت Router و Circuit Breaker باید در Redis مشترک باشند** (نه در حافظه‌ی محلی) تا بین instanceها همگن بمانند. LiteLLM از Redis برای این منظور پشتیبانی می‌کند (`redis_host`).

---

## 17. مایگریشن و Seed اکانت ادمین

### 17.1 ابزار

- **Alembic** با autogenerate از مدل‌های SQLAlchemy 2.0.
- هر migration مستقل، قابل بازگشت (downgrade) و idempotent.
- مایگریشن‌ها به‌صورت خودکار در `CC_PRE_RUN_HOOK` قبل از старт اپ اجرا می‌شوند.

### 17.2 Seed ادمین

یک migration جداگانه (یا data migration) که ادمین را در صورت عدم وجود درج می‌کند:

```python
# alembic/seeds/0001_admin_seed.py  (مفهومی)
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

> **امنیت:** رمز عبور `136517` در محیط تولید باید از env override شود (`CG_ADMIN_PASSWORD`)؛ seed فقط برای bootstrap اولیه است. توصیه می‌شود پس از اولین لاگین، رمز تغییر کند.

| فیلد | مقدار seed |
|------|-----------|
| username | `slaman` |
| password | `136517` (هش‌شده) |
| email | `olddealers@gmail.com` |
| first_name | `Salman` |
| last_name | `JB` |
| is_admin | `TRUE` |

---

## 18. مانیتورینگ بلادرنگ و Observability

### 18.1 متریک‌ها (Prometheus)

- `cg_requests_total{provider, model, status, cache_hit}`
- `cg_request_duration_seconds` (histogram, p50/p95/p99)
- `cg_tokens_total{direction, model}`
- `cg_cost_usd_total`
- `cg_provider_health{provider}` (1=healthy, 0=down/cooldown)
- `cg_active_concurrency{provider}`
- `cg_cache_hits_total` / `cg_cache_misses_total`
- سیستم: CPU, RAM, event loop lag, pool sizes.

### 18.2 داشبورد بلادرنگ پنل

- SSE endpoint (`/api/admin/stream/metrics`) که هر ۱–۲ ثانیه snapshot می‌فرستد.
- push فوری برای رویدادها (provider down, budget exceeded, خطای بحرانی).
- نمودارها: RPS، latency، token throughput، خطا بر اساس provider، نقشه‌ی حرارتی utilization.

### 18.3 لاگ‌سازی

- `structlog` با context (request_id, user_id, api_key_id, provider, deployment, model).
- سطح INFO در تولید، DEBUG قابل فعال‌سازی از env.
- payload کامل به‌صورت اختیاری و با retention کوتاه (حریم خصوصی + حجم) در `request_logs` یا سیستم خارجی.

### 18.4 Alerting (فاز ۲)

- Webhook به Slack/PagerDuty برای: provider down، budget exceeded، latency > threshold، error rate > threshold.

---

## 19. نقشه راه توسعه فازبندی‌شده

### فاز ۰ — Bootstrap (هفته ۱–۲)
- ساختار monorepo، pyproject، Dockerfile، docker-compose محلی.
- FastAPI skeleton + lifespan + config + logging + health.
- PostgreSQL + Alembic + مدل‌های پایه + **seed ادمین**.
- Auth ادمین (login/JWT) + یک Admin API حداقلی.
- Next.js + Joy UI skeleton + صفحه‌ی login + layout.
- استقرار اولیه روی Clever Cloud (رویکرد B).

### فاز ۱ — هسته و OpenAI API (هفته ۳–۶)
- Provider Abstraction Layer + `LiteLLMAdapter` + `RouterBuilder` (از DB).
- OpenAI-compatible endpoints (`/v1/chat/completions`، `/v1/completions`، `/v1/embeddings`، `/v1/models`) با streaming SSE.
- Virtual API Key auth + rate limit (Redis).
- Core Engine: async orchestration، ProcessPool، connection pools، non-blocking streaming buffer.
- Load balancing (LiteLLM Router) + Circuit Breaker + Cooldown + Fallback.
- Hot Reload پیکربندی provider.
- پنل: Providers Management، Virtual Keys، Dashboard حداقلی.
- مانیتورینگ: متریک‌های پایه + داشبورد بلادرنگ اولیه.

### فاز ۲ — بهینه‌سازی و کش (هفته ۷–۱۰)
- کش معنایی دو سطحی (L1 exact در Redis، L2 با pgvector).
- Streaming cache replay.
- Spend/cost tracking کامل + داشبورد هزینه.
- Audit logs + request logs با جستجو.
- Alerting webhooks.
- بهینه‌سازی مقیاس‌پذیری (Router/Breaker در Redis برای چند instance).
- مهاجرت به رویکرد A (frontend/backend مجزا) در صورت نیاز.

### فاز ۳ — هوشمندی پیشرفته (هفته ۱۱–۱۶)
- Payload Splitting (recursive + sliding window + map/reduce).
- Context Compression (مدل محلی سبک یا provider ارزان).
- Guardrails: PII Redaction + De-masking + Prompt Injection detection.
- MCP Gateway (اولیه) برای tool calling.
- Batch inference (تجمیع و زمان‌بندی).

### فاز ۴ — Enterprise (بعد از فاز ۳)
- SSO/SAML، RBAC گرانولار، multi-team.
- ادغام Vault، BYOK.
- A/B testing / traffic mirroring.
- Fine-tuning orchestration.
- پلاگین‌های provider اختصاصی (جدای از LiteLLM).

---

## 20. خطرات، مبادلات و تصمیمات معلق

| موضوع | خطر/مبادله | تصمیم/توصیه |
|-------|-----------|-------------|
| **Joy UI on-hold** | عدم آپدیت بلندمدت، ریسک نگهداری. | لایه‌ی abstraction بسازید؛ Material UI به‌عنوان fallback آماده باشد. |
| **LiteLLM به‌عنوان وابستگی هسته** | حجم وابستگی بالا، رفتار آپدیت. | آن را پشت ProviderAdapter نگه دارید تا قابل تعویض باشد. |
| **GIL و CPU-bound** | تقسیم متن/embedding محلی ممکن است گلوگاه شود. | ProcessPool با size = cores؛ embedding را در فاز ۳ به provider بسپارید. |
| **Clever Cloud تک‌کانتینری** | Docker Compose نیست؛ scale مستقل سخت. | فاز ۱ رویکرد B، فاز ۲ رویکرد A. |
| **حالت توزیع‌شده Router** | چند instance → نیاز به Redis مشترک. | از همان فاز ۱ Redis را برای state استفاده کنید. |
| **تأخیر Guardrails/PII** | پردازش ممکن است مسیر را کند کند. | async در پس‌زمینه؛ فقط حالت strict مسدودکننده. |
| **ذخیره‌ی payload کامل** | حجم و حریم خصوصی. | metadata در فاز ۱؛ payload با retention کوتاه و اختیاری بعداً. |
| **رمز seed ادمین (`136517`)** | ضعیف برای تولید. | override با env در تولید؛ اجبار تغییر پس از اولین لاگین. |
| **استریم چندprovider در split** | ترتیب chunkها در تجمیع. | gather کامل سپس reduce؛ یا ordered stream با شماره قطعه. |

---

## 21. پیوست

### 21.1 مدل مفهومی تأخیر

```
T_total = T_auth + T_ratelimit + T_cache_lookup + T_guardrail + T_queue + T_upstream + T_stream
                └──── async/موازی ────┘     └ CPU pool (async) ┘   └ I/O ناهمگام ┘
هدف: T_queue ≈ 0 ، T_guardrail غیرمسدودکننده، T_upstream با less-busy minimization.
```

### 21.2 نقشه‌ی قابلیت‌ها به فازها

| قابلیت | فاز ۱ | فاز ۲ | فاز ۳ | فاز ۴ |
|--------|:-----:|:-----:|:-----:|:-----:|
| OpenAI-compatible API + streaming | ✅ | | | |
| LiteLLM adapter + hot reload | ✅ | | | |
| Load balancing + CB + fallback | ✅ | | | |
| Virtual keys + rate limit | ✅ | | | |
| Admin panel (providers/keys/dashboard) | ✅ | | | |
| Semantic cache (L1+L2) | | ✅ | | |
| Spend tracking + audit | پایه | ✅ | | |
| Payload splitting | | | ✅ | |
| Context compression | | | ✅ | |
| PII / Prompt guard | | | ✅ | |
| MCP Gateway | | | ✅ | |
| Batch inference | | | ✅ | |
| SSO / RBAC granular / Vault | | | | ✅ |
| Custom provider plugins | | | | ✅ |

### 21.3 منابع مرجع

- LiteLLM Proxy docs — config.yaml, routing/load-balancing, virtual keys, caching, guardrails.
- Clever Cloud Docker docs — port 8080, env vars, addons, build hooks.
- MUI Joy UI docs — وضعیت beta و on-hold (توصیه Material UI).
- الگوهای طراحی: async gateway, circuit breaker, semantic cache, recursive text splitting.

---

> **پایان مستند.** این مستند پایه‌ی طراحی است و در طول توسعه به‌روزرسانی می‌شود. گام بعدی: تأیید رویکرد استقرار (A/B) و انتخاب نهایی کتابخانه‌ی UI، سپس شروع فاز ۰.
