#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "Installing server deps..."
(cd server && npm install)

echo "Installing web deps..."
(cd web && npm install && npm run build)

echo "Build complete. Start with:"
echo "  API:  cd server && npm start"
echo "  Web:  cd web && npm start"
