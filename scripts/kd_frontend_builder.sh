#!/bin/bash
set -e

clear
echo "♻️  Rebuilding frontend assets..."

# Clean temp build directory
rm -rf frontend_dist_temp
mkdir -p frontend_dist_temp

# Step 1: Build the frontend image
docker build -f frontend/Dockerfile -t kd_frontend_build_temp .

# Step 2: Extract built assets to temp
docker create --name temp_kd_frontend kd_frontend_build_temp
docker cp temp_kd_frontend:/app/frontend/dist/. ./frontend_dist_temp
docker rm temp_kd_frontend

# Step 3: Copy final assets into bind mount directory
mkdir -p ./volumes/kd_race_app_dist_build
rm -rf ./volumes/kd_race_app_dist_build/*
cp -r ./frontend_dist_temp/* ./volumes/kd_race_app_dist_build/

# Step 4: Restart Nginx to ensure fresh file serve
docker compose up -d kd_nginx

# Step 5: Confirm contents in local bind mount
echo -e "\n📦 Final build contents in ./volumes/kd_race_app_dist_build:"
ls -l ./volumes/kd_race_app_dist_build
