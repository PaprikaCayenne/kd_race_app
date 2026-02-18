#!/usr/bin/env bash
# File: scripts/force_sync_main_and_rebuild.sh
# Purpose: Stop stack, force sync repo to origin/main, then rebuild only after explicit confirmation.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Repo: $ROOT_DIR"
echo

if ! command -v git >/dev/null 2>&1; then
  echo "ERROR: git is not installed."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker is not installed."
  exit 1
fi

if [ ! -d ".git" ]; then
  echo "ERROR: This folder is not a git repo."
  exit 1
fi

if [ ! -f "./scripts/rebuild_all.sh" ]; then
  echo "ERROR: ./scripts/rebuild_all.sh not found."
  exit 1
fi

if [ ! -f "./scripts/smoke_test.sh" ]; then
  echo "ERROR: ./scripts/smoke_test.sh not found."
  exit 1
fi

# Safety check: refuse if .env is tracked (it should never be in git)
if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  echo "ERROR: .env is tracked by git. Remove it from git history and add it to .gitignore."
  echo "Refusing to proceed."
  exit 1
fi

echo "Stopping Docker stack..."
docker compose down --remove-orphans || true
echo

echo "Fetching origin..."
git fetch origin
echo

echo "Checking out main..."
git checkout main
echo

echo "Force syncing to origin/main (this discards local changes)..."
git reset --hard origin/main

# Clean untracked files, but preserve local .env and .env.* if present
echo "Cleaning untracked files (preserving .env and .env.* if present)..."
git clean -fd -e .env -e .env.* || true
echo

echo "Current HEAD:"
git log -1 --oneline
echo

echo "Working tree status:"
git status
echo

echo "If the above shows the commit you expected from GitHub, type 'yes' to run rebuild_all.sh."
read -r -p "Type 'yes' to rebuild and restart the stack: " confirm

if [ "$confirm" != "yes" ]; then
  echo "Cancelled. No rebuild was run."
  exit 0
fi

echo
echo "Running rebuild..."
bash ./scripts/rebuild_all.sh
echo

echo "Running smoke tests..."
bash ./scripts/smoke_test.sh
echo

echo "Done."
