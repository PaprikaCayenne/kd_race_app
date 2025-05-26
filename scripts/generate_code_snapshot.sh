#!/bin/bash

# File: scripts/generate_code_snapshot.sh
# Version: v1.1.0 — Includes Docker, Tailwind, and HTML entrypoints

DATE=$(date +%F)
OUTPUT="scripts/project_snapshot_$DATE.txt"
ROOT=$(cd "$(dirname "$0")/.." && pwd)

echo "📦 Generating full source snapshot for kd_race_app" > "$OUTPUT"
echo "Timestamp: $(date)" >> "$OUTPUT"
echo "Root: $ROOT" >> "$OUTPUT"
echo "==================================================" >> "$OUTPUT"

find "$ROOT" \
  -type f \
  \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.json" \
     -o -name "*.html" -o -name "*.css" -o -name "Dockerfile" -o -name "docker-compose.yml" \
     -o -name "*.conf" -o -name ".env" -o -name "*.sh" \) \
  ! -path "*/node_modules/*" \
  ! -path "$ROOT/volumes/*" \
  ! -path "$ROOT/frontend/dist/*" \
  ! -path "$ROOT/frontend_dist_temp/*" \
  | sort | while read -r file; do
    rel_path="${file#$ROOT/}"
    echo -e "\n\n==== FILE: $rel_path ====\n" >> "$OUTPUT"
    cat "$file" >> "$OUTPUT"
done

echo "✅ Done. Snapshot written to $OUTPUT"
