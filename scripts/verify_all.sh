#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Step 1/5: root tests"
npm test

echo "Step 2/5: frontend build (kd-frontend)"
if [ ! -d "frontend" ]; then
  echo "❌ frontend directory not found"
  exit 1
fi
pushd frontend >/dev/null
npm run build
popd >/dev/null

echo "Step 3/5: rebuild_all script"
bash scripts/rebuild_all.sh

echo "Step 4/5: docker compose up -d --build"
docker compose up -d --build

echo "Step 5/5: smoke tests"
bash scripts/smoke_test.sh

echo "✅ verify_all complete"
