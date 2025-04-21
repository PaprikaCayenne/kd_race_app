#!/bin/bash

# 🚀 total_rebuild.sh – Full clean + rebuild for KD Race App
# Version: v1.0.0

set -e
clear

echo "🧨 [Step 1] Stopping and removing all containers, volumes, and orphans..."
docker compose down -v --remove-orphans

echo "🧼 [Step 2] System-wide Docker cleanup (removes dangling images/containers)..."
docker system prune -af

echo "🔧 [Step 3] Building all services from scratch with no cache..."
docker compose build --no-cache

echo "🚀 [Step 4] Starting services in detached mode..."
docker compose up -d

echo "✅ Done! KD Race App is rebuilt and running."
