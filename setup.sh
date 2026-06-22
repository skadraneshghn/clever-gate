#!/usr/bin/env bash
set -euo pipefail

echo "=== Clever Gateway — Local Environment Setup ==="
echo ""

# PostgreSQL is remote (Clever Cloud) — only Redis needs to be local.

# ─── 1. Install Redis ───
echo "[1/3] Installing Redis..."
sudo apt update
sudo apt install -y redis-server

# ─── 2. Start Redis ───
echo ""
echo "[2/3] Starting Redis..."
sudo systemctl enable redis-server
sudo systemctl start redis-server

# ─── 3. Verify connectivity ───
echo ""
echo "[3/3] Verifying connectivity..."

if redis-cli ping 2>/dev/null | grep -q PONG; then
    echo "  Redis:      OK"
else
    echo "  Redis:      FAILED — check 'sudo systemctl status redis-server'"
    exit 1
fi

# Test remote PostgreSQL
if cd "$(dirname "$0")/backend" && uv run python -c "
import asyncio
from app.db.session import db_context
from sqlalchemy import text
async def check():
    async with db_context() as s:
        await s.execute(text('SELECT 1'))
        print('  PostgreSQL: OK (remote)')
asyncio.run(check())
" 2>/dev/null; then
    true
else
    echo "  PostgreSQL: FAILED — check DATABASE_URL in .env"
    exit 1
fi

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Now run:  ./start.sh"
