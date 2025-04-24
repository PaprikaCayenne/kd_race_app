#!/bin/bash
# File: scripts/kd_frontend_builder.sh
# Version: v0.7.40 – Restores full build and verify flow with volume bind and Nginx check

set -e

clear
echo "♻️  Rebuilding frontend assets..."

# 🔁 Clean temp build directory
rm -rf frontend_dist_temp
mkdir -p frontend_dist_temp

# 🏗️ Step 1: Build the frontend image using Docker multi-stage build
docker build -f frontend/Dockerfile -t kd_frontend_build_temp .

# 📦 Step 2: Extract /app/frontend/dist from the image to temp dir
docker create --name temp_kd_frontend kd_frontend_build_temp
docker cp temp_kd_frontend:/app/frontend/dist/. ./frontend_dist_temp
docker rm temp_kd_frontend

# 📁 Step 3: Copy built files into the volume bind mount used by Nginx
mkdir -p ./volumes/kd_race_app_dist_build
rm -rf ./volumes/kd_race_app_dist_build/*
cp -r ./frontend_dist_temp/* ./volumes/kd_race_app_dist_build/

# 🔄 Step 4: Restart Nginx to reload updated static files
docker compose restart kd_nginx

# ✅ Step 5: Confirm files copied locally
echo -e "\n📦 Final build contents in ./volumes/kd_race_app_dist_build:"
ls -l ./volumes/kd_race_app_dist_build

# 🔍 Step 6: Confirm contents visible inside Nginx container
echo -e "\n🔎 Verifying Nginx container sees build assets:"
docker exec kd_race_app-kd_nginx-1 ls -l /usr/share/nginx/html
