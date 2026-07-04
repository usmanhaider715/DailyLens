#!/usr/bin/env bash
# Builds a zip-ready folder for Hostinger "Upload your files" Node.js deployment.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$(cd "$ROOT/.." && pwd)/DailyLens-upload"
ZIP="$(cd "$ROOT/.." && pwd)/DailyLens-upload.zip"

echo "→ Cleaning previous upload bundle…"
rm -rf "$OUT" "$ZIP"
mkdir -p "$OUT"

echo "→ Copying project files (excluding node_modules, secrets, build cache)…"
rsync -a \
  --exclude 'node_modules' \
  --exclude 'web/node_modules' \
  --exclude 'server/node_modules' \
  --exclude 'web/.next' \
  --exclude '.git' \
  --exclude '.gitignore' \
  --exclude 'server/.env' \
  --exclude 'web/.env.local' \
  --exclude '.DS_Store' \
  --exclude 'DailyLens-upload' \
  "$ROOT/" "$OUT/"

echo "→ Creating ZIP archive…"
(cd "$(dirname "$OUT")" && zip -r "$(basename "$ZIP")" "$(basename "$OUT")" -x "*.DS_Store" > /dev/null)

BYTES=$(wc -c < "$ZIP" | tr -d ' ')
MB=$(echo "scale=1; $BYTES / 1048576" | bc)

echo ""
echo "✓ Upload folder: $OUT"
echo "✓ ZIP file:      $ZIP (${MB} MB)"
echo ""
echo "Upload DailyLens-upload.zip in Hostinger → Node.js Web App → Upload your files"
echo "Full guide: newssite/HOSTINGER_UPLOAD_DEPLOY.md"
