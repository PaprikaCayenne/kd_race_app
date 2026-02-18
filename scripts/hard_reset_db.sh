#!/bin/bash

set -euo pipefail

# File: scripts/hard_reset_db.sh
# Version: v1.4.0 — Ensures kd_api is running before Prisma reset commands

clear
echo "🚨 WARNING: This will WIPE the derby database and rebuild the full stack."
read -p "Type 'yes' to continue: " confirm

if [[ "$confirm" != "yes" ]]; then
  echo "❌ Cancelled"
  exit 1
fi

echo "🚀 Ensuring required services are running (kd_api, kd_nginx)..."
docker compose up -d kd_api kd_nginx || { echo "❌ Failed to start required services"; exit 1; }

echo "📦 Resetting database via Prisma..."
docker compose exec kd_api npx prisma db push --force-reset || { echo "❌ Failed to push schema"; exit 1; }

echo "🌱 Reseeding database..."
docker compose exec kd_api npx tsx prisma/seed-dev.ts || { echo "❌ Dev seed failed"; exit 1; }

echo "🔧 Regenerating Prisma client..."
docker compose exec kd_api npx prisma generate || { echo "❌ Prisma client generate failed"; exit 1; }

echo "🛠️ Rebuilding API Docker image with --no-cache..."
docker compose build --no-cache kd_api || { echo "❌ API image rebuild failed"; exit 1; }

echo "♻️ Rebuilding full stack: frontend → ./frontend_build → Nginx bind..."

# 🔁 Clean local build output
rm -rf ./frontend_build
mkdir -p ./frontend_build

# 🏗️ Build frontend via Docker
echo -e "\n🏗️  Building frontend via Docker..."
docker build -f frontend/Dockerfile -t kd_frontend_build_temp .

# 📦 Extract /app/frontend/frontend_build from container
echo -e "\n📦 Extracting built output from container..."
docker create --name temp_kd_frontend kd_frontend_build_temp
docker cp temp_kd_frontend:/app/frontend/frontend_build/. ./frontend_build
docker rm temp_kd_frontend

# 🔁 Restart backend and forcibly recreate Nginx and API
echo -e "\n🔁 Restarting backend and forcing Nginx remount..."
docker compose down --remove-orphans
docker compose up -d kd_api kd_nginx

# ✅ Confirm success
echo -e "\n📦 Final contents of ./frontend_build:"
ls -l ./frontend_build

echo -e "\n🔎 What Nginx sees inside container:"
docker exec kd_race_app-kd_nginx-1 ls -l /usr/share/nginx/html

echo -e "\n✅ Hard reset and full stack rebuild complete. Visit: https://kd.paprikacayenne.com/"
