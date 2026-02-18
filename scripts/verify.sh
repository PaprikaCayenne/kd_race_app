#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

has_script() {
  local pkg_json="$1"
  local script="$2"
  node -e "const p=require('${pkg_json}'); process.exit(p.scripts && p.scripts['${script}'] ? 0 : 1)"
}

RUN_DB_CHECKS="${RUN_DB_CHECKS:-0}"

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

frontend_build_candidates=(
  "$ROOT_DIR/frontend/frontend_build"
  "$ROOT_DIR/frontend_build"
)

resolved_build_dir=""
for candidate in "${frontend_build_candidates[@]}"; do
  if [ -d "$candidate" ]; then
    resolved_build_dir="$candidate"
    break
  fi
done

if [ -z "$resolved_build_dir" ]; then
  echo "ERROR: Frontend build output not found. Expected one of:" >&2
  echo "  - $ROOT_DIR/frontend/frontend_build" >&2
  echo "  - $ROOT_DIR/frontend_build" >&2
  echo "Run 'pnpm -C frontend run build' and verify Vite outputDir." >&2
  exit 1
fi

echo "Using frontend build output: $resolved_build_dir"

for f in users.html admin.html race.html; do
  if [ ! -f "$resolved_build_dir/$f" ]; then
    echo "Missing expected frontend artifact '$f' in $resolved_build_dir" >&2
    exit 1
  fi
done

if [ "$RUN_DB_CHECKS" = "1" ]; then
  echo
  echo "Optional DB-backed smoke checks enabled (RUN_DB_CHECKS=1):"
  bash scripts/smoke_test.sh
else
  echo
  echo "Skipping DB/network smoke checks (set RUN_DB_CHECKS=1 to enable)."
fi

echo

echo "OK"
