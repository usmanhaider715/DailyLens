#!/usr/bin/env bash
# Pull latest from GitHub, install deps, build Next.js, restart PM2.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Deploy DailyLens from GitHub"
git fetch origin main
git pull origin main

echo "==> Install API dependencies"
cd server
npm ci --omit=dev 2>/dev/null || npm install --production

echo "==> Ensure Google Trends USA auto-share source"
node scripts/add-google-trends-source.js || echo "  (skipped — could not reach DB)"

echo "==> Install & build frontend"
cd ../web
npm ci 2>/dev/null || npm install
npm run build

echo "==> Restart PM2"
cd "$ROOT"
if pm2 describe dailylens-api >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
  pm2 save
fi

echo "✓ Deploy complete"
pm2 status
