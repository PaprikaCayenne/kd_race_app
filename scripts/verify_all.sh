#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Step 1: root tests"
npm test

echo "Step 2: frontend build"
FRONTEND_DIR="$(find . -maxdepth 3 -name package.json -print | xargs -I{} sh -c "node -e \"const p=require('./{}'); if(p.name==='kd-frontend') console.log(require('path').dirname('./{}'))\"") | head -n 1)"
if [ -z "${FRONTEND_DIR}" ]; then
  echo "Could not find kd-frontend package.json"
  exit 1
fi
pushd "$FRONTEND_DIR" >/dev/null
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi
npm run build
popd >/dev/null

echo "Step 3: docker rebuild and start"
docker compose up -d --build

echo "Step 4: smoke http"
bash scripts/smoke_http.sh
