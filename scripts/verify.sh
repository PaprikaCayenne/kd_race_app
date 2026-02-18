#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

has_script() {
  local pkg_json="$1"
  local script="$2"
  node -e "const p=require('${pkg_json}'); process.exit(p.scripts && p.scripts['${script}'] ? 0 : 1)"
}

run_script_if_present() {
  local label="$1"
  local cmd="$2"
  if eval "$cmd"; then
    :
  else
    echo "Skipping missing script: $label"
  fi
}

echo "Node version:"
node -v
echo

echo "Install root deps:"
if [ -f package-lock.json ]; then
  npm ci || npm install
else
  npm install
fi
echo

echo "Root checks:"
if has_script "./package.json" "lint"; then
  npm run -s lint
else
  echo "Skipping root lint. No npm script named lint."
fi

if has_script "./package.json" "test"; then
  npm run -s test
else
  echo "Skipping root test. No npm script named test."
fi

if has_script "./package.json" "typecheck"; then
  npm run -s typecheck
else
  echo "Skipping root typecheck. No npm script named typecheck."
fi
echo

echo "Frontend install and build:"
if ! command -v pnpm >/dev/null 2>&1; then
  npm install -g pnpm
fi

if [ -f pnpm-lock.yaml ]; then
  pnpm -C frontend install --frozen-lockfile || pnpm -C frontend install
else
  pnpm -C frontend install
fi

if has_script "./frontend/package.json" "lint"; then
  pnpm -C frontend run lint
else
  echo "Skipping frontend lint. No pnpm script named lint."
fi

pnpm -C frontend run build

# Normalize output for environments that expect ./frontend_build at repo root.
# Vite emits to ./frontend/frontend_build, while deployment copies to ./frontend_build.
if [ -d "$ROOT_DIR/frontend/frontend_build" ]; then
  mkdir -p "$ROOT_DIR/frontend_build"
  rm -rf "$ROOT_DIR/frontend_build"/*
  cp -a "$ROOT_DIR/frontend/frontend_build"/. "$ROOT_DIR/frontend_build"/
fi

# Confirm build produced expected outputs
for f in users.html admin.html race.html; do
  if [ ! -f "$ROOT_DIR/frontend_build/$f" ] && [ ! -f "$ROOT_DIR/frontend/frontend_build/$f" ]; then
    echo "Missing $f in frontend build output"
    exit 1
  fi
done

echo

echo "OK"
