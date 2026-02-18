#!/usr/bin/env bash

# File: scripts/api_rebuild.sh
# Version: v1.1.0 - Rebuild and restart kd_api from repository root

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

COMPOSE_CMD=()
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "❌ Docker Compose is required (tried: 'docker compose' and 'docker-compose')."
  exit 1
fi

echo "🔨 Rebuilding kd_api..."
"${COMPOSE_CMD[@]}" build kd_api

echo "🚀 Restarting kd_api..."
"${COMPOSE_CMD[@]}" up -d kd_api
