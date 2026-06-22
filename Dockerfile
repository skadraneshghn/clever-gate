# ─── Clever Gateway — Production Dockerfile for Clever Cloud ───────────────────
# Base: Ubuntu 24.04 LTS (as required for production)
# Architecture:
#   nginx  (port 8080) → FastAPI  (127.0.0.1:8000)
#                      → Next.js  (127.0.0.1:3000)
# Process manager: supervisord (runs all three processes)
# Entrypoint: /docker-entrypoint.sh (runs DB migrations → supervisord)
# ────────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Next.js builder ─────────────────────────────────────────────────
FROM node:20-bookworm-slim AS frontend-build

WORKDIR /fe

# Install deps first (better layer caching)
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

# Copy source and build (standalone output configured in next.config.ts)
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Final Ubuntu 24.04 image ────────────────────────────────────────
FROM ubuntu:24.04

# Prevent interactive prompts during apt installs
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# ── System packages ──────────────────────────────────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Python 3.12
    python3.12 \
    python3.12-dev \
    python3.12-venv \
    python3-pip \
    # Build tools (for native extensions like argon2-cffi, cryptography)
    build-essential \
    libpq-dev \
    libssl-dev \
    libffi-dev \
    # Node.js 20 (for running Next.js standalone server)
    curl \
    ca-certificates \
    gnupg \
    # Process management & proxy
    supervisor \
    nginx \
    # Utilities
    tini \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── Python symlinks & pip ────────────────────────────────────────────────────
RUN ln -sf /usr/bin/python3.12 /usr/local/bin/python3 \
    && ln -sf /usr/bin/python3.12 /usr/local/bin/python \
    && python3 -m pip install --no-cache-dir --upgrade pip uv \
    && ln -sf $(python3 -m site --user-base 2>/dev/null || echo /root/.local)/bin/uv /usr/local/bin/uv || true \
    && pip install --no-cache-dir uv

# ── Backend: install Python dependencies via uv ──────────────────────────────
WORKDIR /app

# Copy lockfile first (cache layer)
COPY backend/pyproject.toml backend/uv.lock* ./

# Install production deps into a venv managed by uv
RUN uv sync --frozen --no-dev

# Copy backend source
COPY backend/ ./backend/

# ── Frontend: copy standalone build from builder stage ───────────────────────
COPY --from=frontend-build /fe/.next/standalone /app/frontend-standalone
COPY --from=frontend-build /fe/.next/static     /app/frontend-standalone/.next/static
COPY --from=frontend-build /fe/public           /app/frontend-standalone/public

# ── Config files ─────────────────────────────────────────────────────────────
COPY docker/nginx.conf      /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/clever-gateway.conf
COPY docker/entrypoint.sh   /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create nginx runtime dirs (Ubuntu needs these for non-root nginx pid path)
RUN mkdir -p /var/log/nginx /var/lib/nginx /run/nginx \
    && chown -R www-data:www-data /var/log/nginx /var/lib/nginx

# ── Runtime environment defaults ─────────────────────────────────────────────
# These are overridden by Clever Cloud environment variables at runtime
ENV CG_ENV=production \
    CG_HTTP_PORT=8080 \
    CG_LOG_LEVEL=INFO \
    NODE_ENV=production \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# ── Port ─────────────────────────────────────────────────────────────────────
# Clever Cloud routes external traffic to this port
EXPOSE 8080

# ── Entrypoint ───────────────────────────────────────────────────────────────
# tini ensures proper signal handling for PID 1
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/docker-entrypoint.sh"]
