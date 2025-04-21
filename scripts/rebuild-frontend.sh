#!/bin/bash

set -e
clear

echo "🚀 [KD] Build Script – Rebuilding Frontend + Restarting Nginx"
echo "🕓 Started at $(date)"

# Step 1: Rebuild Vite frontend
echo "🛠️  [Step 1] Running: docker compose run --rm kd_frontend_builder"
if docker compose run --rm kd_frontend_builder; then
  echo "✅ [Step 1] Frontend build completed successfully"
else
  echo "❌ [Step 1] Frontend build failed"
  exit 1
fi

# Step 2: Restart Nginx
echo "🔁 [Step 2] Restarting Nginx container..."
if docker compose restart kd_nginx; then
  echo "✅ [Step 2] Nginx restarted"
else
  echo "❌ [Step 2] Failed to restart Nginx"
  exit 1
fi

echo "✅ Done! All steps completed at $(date)"
