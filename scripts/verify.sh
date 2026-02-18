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

# Confirm build produced expected outputs
test -f frontend_build/race.html
test -f frontend_build/admin.html
test -f frontend_build/users.html

echo

echo "OK"
