#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-}"

if [ -z "${BASE_URL}" ]; then
  PORT="$(docker compose port nginx 80 2>/dev/null | awk -F: '{print $2}' | tail -n 1 || true)"
  if [ -z "${PORT}" ]; then
    PORT="8085"
  fi
  BASE_URL="http://localhost:${PORT}"
fi

echo "Using BASE_URL=${BASE_URL}"

curl -fsS "${BASE_URL}/" >/dev/null
curl -fsS "${BASE_URL}/race" >/dev/null
curl -fsS "${BASE_URL}/dashboard" >/dev/null
curl -fsS "${BASE_URL}/admin" >/dev/null

curl -fsS "${BASE_URL}/api/horses" >/dev/null
curl -fsS "${BASE_URL}/api/races" >/dev/null

echo "Smoke checks passed"
