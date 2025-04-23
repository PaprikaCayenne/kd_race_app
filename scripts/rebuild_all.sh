#!/bin/bash
set -e

echo "♻️  Rebuilding frontend assets..."

# Clean temp
rm -rf frontend_dist_temp
mkdir -p frontend_dist_temp

# Build the frontend Docker image from root context
docker build -f frontend/Dockerfile -t kd_frontend_build_temp .

# Create container and extract /app/frontend/dist into temp folder
docker create --name temp_kd_frontend kd_frontend_build_temp
docker cp temp_kd_frontend:/app/frontend/dist/. ./frontend_dist_temp
docker rm temp_kd_frontend

echo -e "\n🔍 Built files in ./frontend_dist_temp:"
ls -l ./frontend_dist_temp

# Ensure Docker volume exists
docker volume create kd_race_app_dist_build >/dev/null 2>&1 || true

# Copy files from temp folder into Docker volume
docker run --rm \
  -v "$(pwd)/frontend_dist_temp:/copy" \
  -v kd_race_app_dist_build:/app \
  alpine sh -c "cp -r /copy/* /app/"

echo -e "\n🚀 Starting backend and Nginx..."
docker compose up -d kd_api kd_nginx

echo -e "\n🧪 Verifying contents in dist volume:"
docker run --rm -v kd_race_app_dist_build:/data alpine ls -l /data

echo -e "\n✅ Deployment complete. Visit: https://kd.paprikacayenne.com/"
