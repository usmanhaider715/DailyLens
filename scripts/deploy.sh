#!/usr/bin/env bash
set -euo pipefail
cd /var/www/newssite
git pull origin main
cd server && npm install --production
cd ../web && npm install && npm run build
pm2 reload ecosystem.config.cjs --update-env
