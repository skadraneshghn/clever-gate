# ─── Production Dockerfile (Approach B: single app, supervisord + nginx) ───
# nginx listens on port 8080 and routes:
#   /v1/* /api/admin/* /health* /metrics → FastAPI (127.0.0.1:8000)
#   everything else                      → Next.js (127.0.0.1:3000)

# --- Backend base ---
FROM python:3.12-slim AS backend-base
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev curl supervisor nginx \
    && rm -rf /var/lib/apt/lists/*
COPY backend/pyproject.toml backend/uv.lock* ./
RUN pip install --upgrade pip && pip install uv && uv sync --frozen --no-dev
COPY backend/ ./backend/

# --- Frontend build ---
FROM node:20-slim AS frontend-build
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci || npm install
COPY frontend/ ./
RUN npm run build

# --- Final image ---
FROM backend-base AS final
COPY --from=frontend-build /fe/.next/standalone /app/frontend-standalone
COPY --from=frontend-build /fe/.next/static /app/frontend-standalone/.next/static
COPY --from=frontend-build /fe/public /app/frontend-standalone/public
COPY docker/supervisord.conf /etc/supervisor/conf.d/app.conf
COPY docker/nginx.conf /etc/nginx/nginx.conf

WORKDIR /app/backend
ENV CG_HTTP_PORT=8080
EXPOSE 8080

CMD ["supervisord", "-c", "/etc/supervisor/supervisord.conf"]
