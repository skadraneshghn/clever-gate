#!/usr/bin/env bash
# ─── Clever Gateway — Docker Entrypoint ────────────────────────────────────────
# Runs automatically when the container starts on Clever Cloud.
# Steps:
#   1. Wait for the database to be reachable (up to 60s)
#   2. Run Alembic migrations (schema + seed data)
#   3. Hand off to supervisord (nginx + FastAPI + Next.js)
# ────────────────────────────────────────────────────────────────────────────────
set -euo pipefail

echo "======================================================"
echo " Clever Gateway — Production Container Starting"
echo "======================================================"
echo " ENV:          ${CG_ENV:-production}"
echo " DATABASE_URL: ${DATABASE_URL:-(not set — check Clever Cloud env vars)}"
echo " REDIS_URL:    ${REDIS_URL:-(not set — check Clever Cloud env vars)}"
echo "======================================================"

# ── 1. Wait for PostgreSQL to be reachable ─────────────────────────────────────
if [ -n "${DATABASE_URL:-}" ]; then
    echo ""
    echo "[1/3] Waiting for database..."

    # Extract host and port from DATABASE_URL
    # Supports: postgresql+asyncpg://user:pass@host:port/db
    DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^/:]+):?([0-9]*)\/.*|\1|')
    DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*@[^:]+:([0-9]+)\/.*|\1|')
    DB_PORT="${DB_PORT:-5432}"

    for i in $(seq 1 60); do
        if timeout 2 bash -c "cat < /dev/null > /dev/tcp/${DB_HOST}/${DB_PORT}" 2>/dev/null; then
            echo "    Database reachable at ${DB_HOST}:${DB_PORT}"
            break
        fi
        if [ "$i" -eq 60 ]; then
            echo "    ERROR: Database not reachable after 60s — aborting."
            exit 1
        fi
        echo "    Waiting... (${i}/60)"
        sleep 1
    done
else
    echo "[1/3] DATABASE_URL not set — skipping DB wait."
fi

# ── 2. Run database migrations ─────────────────────────────────────────────────
echo ""
echo "[2/3] Running database migrations..."
cd /app/backend
uv run alembic upgrade head
echo "    Migrations complete."

# ── 3. Start supervisord ───────────────────────────────────────────────────────
echo ""
echo "[3/3] Starting supervisord (nginx + FastAPI + Next.js)..."
echo ""
exec supervisord -c /etc/supervisor/supervisord.conf
