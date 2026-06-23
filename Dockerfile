# ─── Clever Gateway — Production Dockerfile for Clever Cloud ───────────────────
# Base: Ubuntu 24.04 LTS
# Architecture:
#   nginx  (port 8080) → FastAPI  (127.0.0.1:8000)
#                      → Next.js  (127.0.0.1:3000)
# Process manager: supervisord
# Entrypoint: /docker-entrypoint.sh (DB wait → migrations → supervisord)
# ────────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Next.js builder ─────────────────────────────────────────────────
FROM node:20-bookworm-slim AS frontend-build

WORKDIR /fe

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# ── Stage 2: uv binary source ────────────────────────────────────────────────
# Grab uv from the official image — no pip needed, avoids PEP 668 on Ubuntu
FROM ghcr.io/astral-sh/uv:latest AS uv-source

# ── Stage 3: Final Ubuntu 24.04 image ────────────────────────────────────────
FROM ubuntu:24.04

ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=UTC

# ── System packages ───────────────────────────────────────────────────────────
# Step A: base tools + Node.js 20 via NodeSource (needs curl + ca-certs first)
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        ca-certificates \
        gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends \
        # Python 3.12 with venv support (required by uv)
        python3.12 \
        python3.12-dev \
        python3.12-venv \
        python3-full \
        # Build tools for native Python extensions
        build-essential \
        libpq-dev \
        libssl-dev \
        libffi-dev \
        # Node.js 20 from NodeSource
        nodejs \
        # Process management & reverse proxy
        supervisor \
        nginx \
        redis-server \
        # Signal handling for PID 1
        tini \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ── uv binary (copied from official image — no pip required) ─────────────────
COPY --from=uv-source /uv  /usr/local/bin/uv
COPY --from=uv-source /uvx /usr/local/bin/uvx

# ── Python symlinks ───────────────────────────────────────────────────────────
RUN ln -sf /usr/bin/python3.12 /usr/local/bin/python3 \
    && ln -sf /usr/bin/python3.12 /usr/local/bin/python

# Tell uv to use system Python 3.12
ENV UV_PYTHON=/usr/bin/python3.12

# ── Backend: install Python dependencies ─────────────────────────────────────
WORKDIR /app

# Copy lockfiles + source together
# --no-install-project: skip hatchling editable build of clever-gateway itself
# (the app runs as 'uvicorn app.main:app' by path, not as an installed package)
COPY backend/pyproject.toml backend/uv.lock* ./
COPY backend/ ./backend/
RUN uv sync --frozen --no-dev --no-install-project

# ── Frontend: copy Next.js standalone build ───────────────────────────────────
COPY --from=frontend-build /fe/.next/standalone /app/frontend-standalone
COPY --from=frontend-build /fe/.next/static     /app/frontend-standalone/.next/static
COPY --from=frontend-build /fe/public           /app/frontend-standalone/public

# ── Config files ──────────────────────────────────────────────────────────────
COPY docker/nginx.conf       /etc/nginx/nginx.conf
COPY docker/supervisord.conf /etc/supervisor/conf.d/clever-gateway.conf
COPY docker/entrypoint.sh    /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Create nginx runtime dirs
RUN mkdir -p /var/log/nginx /var/lib/nginx /run/nginx \
    && chown -R www-data:www-data /var/log/nginx /var/lib/nginx

# ── Runtime environment defaults ─────────────────────────────────────────────
ENV CG_ENV=production \
    CG_HTTP_PORT=8080 \
    CG_LOG_LEVEL=INFO \
    NODE_ENV=production \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# ── Port ──────────────────────────────────────────────────────────────────────
EXPOSE 8080

# ── Entrypoint ────────────────────────────────────────────────────────────────
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/docker-entrypoint.sh"]
