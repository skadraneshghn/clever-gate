#!/usr/bin/env bash
set -euo pipefail

# ─── Colors ───
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_LOG="/tmp/cg-backend.log"
FRONTEND_LOG="/tmp/cg-frontend.log"
BACKEND_PID=""
FRONTEND_PID=""
_CLEANING_UP=false

echo -e "${CYAN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║     Clever Gateway — Local Development      ║${NC}"
echo -e "${CYAN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""

# ─── Kill any previous instances ───
echo -e "${BOLD}[0/4] Killing previous processes...${NC}"

# Kill by process pattern (catches orphaned children that lsof might miss)
pkill -f "uvicorn app.main:app" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
sleep 1

# Kill anything still holding ports 8000 or 3000
for port in 8000 3000; do
    pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo -e "  Port $port: killing PID(s) ${pids//$'\n'/, }"
        kill $pids 2>/dev/null || true
        sleep 1
        pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
        [ -n "$pids" ] && kill -9 $pids 2>/dev/null || true
    fi
done

# Wait until both ports are free
for port in 8000 3000; do
    for i in $(seq 1 10); do
        lsof -ti tcp:"$port" >/dev/null 2>&1 || break
        sleep 0.5
    done
    if lsof -ti tcp:"$port" >/dev/null 2>&1; then
        echo -e "  Port $port: ${RED}still in use after kill attempts${NC}"
        exit 1
    fi
    echo -e "  Port $port: ${GREEN}free${NC}"
done

# ─── Cleanup on exit ───
cleanup() {
    [ "$_CLEANING_UP" = true ] && return 0
    _CLEANING_UP=true
    echo ""
    echo -e "${YELLOW}Stopping services...${NC}"
    # Kill by PID (the wrapper processes)
    [ -n "$BACKEND_PID" ]   && kill "$BACKEND_PID" 2>/dev/null   && echo -e "  Backend  (PID $BACKEND_PID) stopped"
    [ -n "$FRONTEND_PID" ]  && kill "$FRONTEND_PID" 2>/dev/null  && echo -e "  Frontend (PID $FRONTEND_PID) stopped"
    sleep 1
    # Kill by process pattern (catches orphaned children)
    pkill -f "uvicorn app.main:app" 2>/dev/null || true
    pkill -f "next dev" 2>/dev/null || true
    pkill -f "next-server" 2>/dev/null || true
    # Force kill anything still on the ports
    for port in 8000 3000; do
        pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
        [ -n "$pids" ] && kill -9 $pids 2>/dev/null || true
    done
    echo -e "${GREEN}All services stopped.${NC}"
    exit 0
}
trap cleanup INT TERM EXIT

# ─── 1. Install dependencies ───
echo -e "${BOLD}[1/4] Checking dependencies...${NC}"

if [ ! -d "$BACKEND_DIR/.venv" ]; then
    echo -e "  ${YELLOW}Installing backend deps (uv sync)...${NC}"
    cd "$BACKEND_DIR" && uv sync
else
    echo -e "  ${GREEN}Backend deps already installed.${NC}"
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo -e "  ${YELLOW}Installing frontend deps (npm install)...${NC}"
    cd "$FRONTEND_DIR" && npm install
else
    echo -e "  ${GREEN}Frontend deps already installed.${NC}"
fi

# ─── 2. Run database migrations ───
echo ""
echo -e "${BOLD}[2/4] Running database migrations...${NC}"
cd "$BACKEND_DIR" && uv run alembic upgrade head
echo -e "  ${GREEN}Migrations complete.${NC}"

# Check Redis (optional — warning if not running)
if redis-cli ping 2>/dev/null | grep -q PONG; then
    echo -e "  ${GREEN}Redis: running${NC}"
else
    echo -e "  ${YELLOW}Redis: not running (cache/rate-limit/provider-health will be unavailable)${NC}"
    echo -e "         Install with: sudo apt install redis-server && sudo systemctl start redis-server"
fi

# ─── 3. Start backend ───
echo ""
echo -e "${BOLD}[3/4] Starting backend (port 8000)...${NC}"
cd "$BACKEND_DIR"
uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 > "$BACKEND_LOG" 2>&1 &
BACKEND_PID=$!
echo -e "  Backend PID: ${BACKEND_PID}"
echo -e "  Logs:        ${BACKEND_LOG}"

# Wait for backend to be ready
echo -ne "  Waiting for backend"
for i in $(seq 1 60); do
    if curl -s http://localhost:8000/health >/dev/null 2>&1; then
        echo -e " ${GREEN}ready${NC}"
        break
    fi
    echo -ne "."
    sleep 1
    if [ "$i" -eq 60 ]; then
        echo -e " ${RED}TIMEOUT${NC}"
        echo -e "  Check logs: tail -50 $BACKEND_LOG"
        exit 1
    fi
done

# ─── 4. Start frontend ───
echo ""
echo -e "${BOLD}[4/4] Starting frontend (port 3000)...${NC}"
cd "$FRONTEND_DIR"
npm run dev > "$FRONTEND_LOG" 2>&1 &
FRONTEND_PID=$!
echo -e "  Frontend PID: ${FRONTEND_PID}"
echo -e "  Logs:         ${FRONTEND_LOG}"

# Wait for frontend to be ready
echo -ne "  Waiting for frontend"
for i in $(seq 1 30); do
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo -e " ${GREEN}ready${NC}"
        break
    fi
    echo -ne "."
    sleep 1
    if [ "$i" -eq 30 ]; then
        echo -e " ${YELLOW}timeout (may still be compiling)${NC}"
    fi
done

# ─── Summary ───
echo ""
echo -e "${GREEN}${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}${BOLD}║          All services running!              ║${NC}"
echo -e "${GREEN}${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}Frontend:${NC}  http://localhost:3000"
echo -e "  ${BOLD}Backend:${NC}   http://localhost:8000"
echo -e "  ${BOLD}API Docs:${NC}   http://localhost:8000/docs"
echo ""
echo -e "  ${BOLD}Admin Login:${NC}"
echo -e "    URL:      http://localhost:3000/login"
echo -e "    Username: slaman"
echo -e "    Password: 136517"
echo ""
echo -e "  ${BOLD}Logs:${NC}"
echo -e "    Backend:  tail -f $BACKEND_LOG"
echo -e "    Frontend: tail -f $FRONTEND_LOG"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop all services.${NC}"
echo ""

# ─── Keep running until Ctrl+C or a service dies ───
while true; do
    sleep 5
    if ! curl -s http://localhost:8000/health >/dev/null 2>&1; then
        echo ""
        echo -e "${RED}Backend is not responding. Stopping all...${NC}"
        echo -e "  Check logs: tail -50 $BACKEND_LOG"
        break
    fi
    if ! curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo ""
        echo -e "${RED}Frontend is not responding. Stopping all...${NC}"
        echo -e "  Check logs: tail -50 $FRONTEND_LOG"
        break
    fi
done
cleanup
