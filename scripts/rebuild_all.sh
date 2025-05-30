#!/bin/bash
# File: scripts/rebuild_all.sh
# Version: v1.2.2 — Forces clean backend rebuild to prevent stale code

set -e
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
docker create --name temp_kd_frontend kd_frontend_build_temp
docker cp temp_kd_frontend:/app/frontend/frontend_build/. ./frontend_build
docker rm temp_kd_frontend

# 🏗️ Step 3: Rebuild backend API to apply route/code changes
echo -e "\n🏗️  Rebuilding kd_api with --no-cache..."
docker compose build --no-cache kd_api

# 🔁 Step 4: Restart containers
echo -e "\n🔁 Restarting backend and Nginx..."
docker compose up -d kd_api
docker compose down --remove-orphans kd_nginx
docker compose up -d kd_nginx

# 🧼 Step 5: Regenerate Prisma client
echo -e "\n🧼 Regenerating Prisma Client inside API container..."
docker compose exec kd_api npx prisma generate

# ✅ Final confirmation
echo -e "\n📦 Final contents of ./frontend_build:"
ls -l ./frontend_build

echo -e "\n🔎 What Nginx sees inside container:"
docker exec kd_race_app-kd_nginx-1 ls -l /usr/share/nginx/html

echo -e "\n✅ Deployment complete. Visit: https://kd.paprikacayenne.com/"
