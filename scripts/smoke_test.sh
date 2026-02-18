#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v curl >/dev/null 2>&1; then
  echo "❌ curl is required to run smoke tests."
  exit 1
fi

COMPOSE_CMD=()
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD=(docker compose)
elif command -v docker-compose >/dev/null 2>&1; then
  COMPOSE_CMD=(docker-compose)
else
  echo "❌ Docker Compose is required (tried: 'docker compose' and 'docker-compose')."
  exit 1
fi

echo "🚀 Starting services..."
"${COMPOSE_CMD[@]}" up -d kd_api kd_nginx

echo "⏳ Waiting for API..."
for i in {1..60}; do
  if curl -fsS "http://localhost:4000/api/horses" >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

echo "🧪 Checking API directly..."
curl -fsS "http://localhost:4000/api/horses" >/dev/null

echo "🧪 Checking site via Nginx..."
curl -fsS "http://localhost:8086/" >/dev/null

echo "🧪 Checking API via Nginx proxy..."
curl -fsS "http://localhost:8086/api/horses" >/dev/null

echo "✅ Smoke test passed"
