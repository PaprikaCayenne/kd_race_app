#!/bin/bash
echo "🛠️  Rebuilding frontend..."
docker compose run --rm kd_frontend_builder

echo "🔁 Restarting nginx..."
docker compose restart kd_nginx

echo "✅ Done!"