#!/usr/bin/env bash
set -euo pipefail
cd /var/www/dailylens
bash scripts/deploy-vps-from-github.sh
