#!/usr/bin/env bash
set -euo pipefail

# Simple dev launcher: starts backend + frontend in parallel.
# Prereqs:
# - Python deps installed in backend environment
# - Node deps installed in frontend

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "[start-dev] Starting FastAPI on :8000..."
(
  cd "$ROOT_DIR/backend"
  uvicorn app.main:app --reload --port 8000
) &
BACK_PID=$!

echo "[start-dev] Starting Vite on :5173..."
(
  cd "$ROOT_DIR/frontend"
  npm run dev
) &
FRONT_PID=$!

cleanup() {
  echo "[start-dev] Stopping..."
  kill "$BACK_PID" "$FRONT_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

wait
