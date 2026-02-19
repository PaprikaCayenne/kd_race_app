#!/usr/bin/env bash
# File: scripts/rebuild_all.sh
# Version: v1.3.0 — Portable compose usage and safer container checks

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

clear
echo "♻️  Rebuilding full stack: frontend → ./frontend_build → API → Nginx..."

# 🔁 Step 0: Clean local build output
rm -rf ./frontend_build
mkdir -p ./frontend_build

# 🏗️ Step 1: Build frontend via Docker
echo -e "\n🏗️  Building frontend via Docker..."
docker build -f frontend/Dockerfile -t kd_frontend_build_temp .

# 📦 Step 2: Extract built frontend from container
echo -e "\n📦 Extracting built output from container..."
temp_container="temp_kd_frontend_$(date +%s)"
docker create --name "$temp_container" kd_frontend_build_temp >/dev/null
trap 'docker rm -f "$temp_container" >/dev/null 2>&1 || true' EXIT
if docker cp "$temp_container":/app/frontend_build/. ./frontend_build 2>/dev/null; then
  echo "✅ Copied /app/frontend_build from builder container"
elif docker cp "$temp_container":/app/frontend/frontend_build/. ./frontend_build 2>/dev/null; then
  echo "✅ Copied /app/frontend/frontend_build from builder container"
else
  echo "❌ Could not find frontend build output in container."
  exit 1
fi
docker rm "$temp_container" >/dev/null
trap - EXIT

# 🏗️ Step 3: Rebuild backend API to apply route/code changes
echo -e "\n🏗️  Rebuilding kd_api with --no-cache..."
"${COMPOSE_CMD[@]}" build --no-cache kd_api

# 🔁 Step 4: Restart containers
echo -e "\n🔁 Restarting backend and Nginx..."
"${COMPOSE_CMD[@]}" up -d kd_api
"${COMPOSE_CMD[@]}" down --remove-orphans kd_nginx
"${COMPOSE_CMD[@]}" up -d kd_nginx

# 🧼 Step 5: Regenerate Prisma client
echo -e "\n🧼 Regenerating Prisma Client inside API container..."
"${COMPOSE_CMD[@]}" exec -T kd_api npx prisma generate

# ✅ Final confirmation
echo -e "\n📦 Final contents of ./frontend_build:"
ls -l ./frontend_build

echo -e "\n🔎 What Nginx sees inside container:"
"${COMPOSE_CMD[@]}" exec -T kd_nginx ls -l /usr/share/nginx/html

echo -e "\n✅ Deployment complete. Visit: https://kd.paprikacayenne.com/"
