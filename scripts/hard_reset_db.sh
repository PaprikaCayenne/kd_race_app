#!/usr/bin/env bash

set -euo pipefail

# File: scripts/hard_reset_db.sh
# Version: v1.5.0 — Portable compose usage and safer temp container cleanup

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

echo "🚨 WARNING: This will WIPE the derby database and rebuild the full stack."
read -p "Type 'yes' to continue: " confirm

if [[ "$confirm" != "yes" ]]; then
  echo "❌ Cancelled"
  exit 1
fi

echo "🚀 Ensuring required services are running (kd_api, kd_nginx)..."
"${COMPOSE_CMD[@]}" up -d kd_api kd_nginx || { echo "❌ Failed to start required services"; exit 1; }

echo "📦 Resetting database via Prisma..."
"${COMPOSE_CMD[@]}" exec -T kd_api npx prisma db push --force-reset || { echo "❌ Failed to push schema"; exit 1; }

echo "🌱 Reseeding database..."
"${COMPOSE_CMD[@]}" exec -T kd_api npx tsx prisma/seed-dev.ts || { echo "❌ Dev seed failed"; exit 1; }

echo "🔧 Regenerating Prisma client..."
"${COMPOSE_CMD[@]}" exec -T kd_api npx prisma generate || { echo "❌ Prisma client generate failed"; exit 1; }

echo "🛠️ Rebuilding API Docker image with --no-cache..."
"${COMPOSE_CMD[@]}" build --no-cache kd_api || { echo "❌ API image rebuild failed"; exit 1; }

echo "♻️ Rebuilding full stack: frontend → ./frontend_build → Nginx bind..."

# 🔁 Clean local build output
rm -rf ./frontend_build
mkdir -p ./frontend_build

# 🏗️ Build frontend via Docker
echo -e "\n🏗️  Building frontend via Docker..."
docker build -f frontend/Dockerfile -t kd_frontend_build_temp .

# 📦 Extract /app/frontend/frontend_build from container
echo -e "\n📦 Extracting built output from container..."
temp_container="temp_kd_frontend_$(date +%s)"
docker create --name "$temp_container" kd_frontend_build_temp >/dev/null
trap 'docker rm -f "$temp_container" >/dev/null 2>&1 || true' EXIT
docker cp "$temp_container":/app/frontend/frontend_build/. ./frontend_build
docker rm "$temp_container" >/dev/null
trap - EXIT

# 🔁 Restart backend and forcibly recreate Nginx and API
echo -e "\n🔁 Restarting backend and forcing Nginx remount..."
"${COMPOSE_CMD[@]}" down --remove-orphans
"${COMPOSE_CMD[@]}" up -d kd_api kd_nginx

# ✅ Confirm success
echo -e "\n📦 Final contents of ./frontend_build:"
ls -l ./frontend_build

echo -e "\n🔎 What Nginx sees inside container:"
"${COMPOSE_CMD[@]}" exec -T kd_nginx ls -l /usr/share/nginx/html

echo -e "\n✅ Hard reset and full stack rebuild complete. Visit: https://kd.paprikacayenne.com/"
