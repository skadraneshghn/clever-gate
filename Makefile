.PHONY: help install dev lint typecheck test migrate seed docker-up docker-down \
        fe-install fe-dev fe-build dev-all setup-db start setup

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

start: ## Start the full stack (backend + frontend) — Ctrl+C to stop
	./start.sh

setup: ## One-time setup: install Redis + run migrations
	./setup.sh

install: ## Install backend deps
	cd backend && uv sync

dev: ## Run backend dev server (port 8000)
	cd backend && uv run uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

lint: ## Run ruff
	cd backend && uv run ruff check . && uv run ruff format --check .

typecheck: ## Run mypy
	cd backend && uv run mypy app

test: ## Run pytest
	cd backend && uv run pytest

migrate: ## Run alembic migrations
	cd backend && uv run alembic upgrade head

seed: ## Run admin seed (included in migrate)
	cd backend && uv run alembic upgrade head

setup-db: ## Create local PostgreSQL database and user
	sudo -u postgres psql -c "CREATE USER cg WITH PASSWORD 'cg';" 2>/dev/null || true
	sudo -u postgres psql -c "CREATE DATABASE clever_gateway OWNER cg;" 2>/dev/null || true
	sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE clever_gateway TO cg;" 2>/dev/null || true

# ─── Frontend ───
fe-install: ## Install frontend deps
	cd frontend && npm install

fe-dev: ## Run frontend dev server (port 3000)
	cd frontend && npm run dev

fe-build: ## Build frontend for production
	cd frontend && npm run build

# ─── Combined ───
dev-all: ## Run backend + frontend together (requires tmux or run in two terminals)
	@echo "Run in two terminals:"
	@echo "  Terminal 1: make dev"
	@echo "  Terminal 2: make fe-dev"
	@echo ""
	@echo "Or use tmux:"
	@echo "  tmux new-session 'make dev' \\; split-window 'make fe-dev' \\; attach"

# ─── Docker (local dev with postgres + redis) ───
docker-up: ## Start local docker-compose (postgres + redis + backend)
	docker compose -f docker/docker-compose.yml up --build

docker-down: ## Stop local docker-compose
	docker compose -f docker/docker-compose.yml down
