#!/bin/bash

# File: scripts/api_rebuild.sh
# Version: v1.0.0 - Simple rebuild and restart of kd_api service

set -e

# Navigate to the correct project directory
cd /docker/stacks/kd_race_app

# Rebuild the API service
echo "\n🔨 Rebuilding kd_api..."
docker compose build kd_api

# Restart the API service in detached mode
echo "\n🚀 Restarting kd_api..."
docker compose up -d kd_api

