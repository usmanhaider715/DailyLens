#!/usr/bin/env bash
# Deploy DailyLens to Hostinger VPS from your Mac (requires SSH key on server).
set -euo pipefail

VPS_HOST="${VPS_HOST:-root@187.124.117.113}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/id_ed25519}"
APP_DIR="/var/www/dailylens"

SSH_OPTS=(-i "$SSH_KEY" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new)

echo "→ Testing SSH to $VPS_HOST…"
if ! ssh "${SSH_OPTS[@]}" "$VPS_HOST" "echo ok" 2>/dev/null; then
  echo ""
  echo "SSH failed. Add your public key to the VPS first:"
  echo ""
  cat "${SSH_KEY}.pub" 2>/dev/null || cat "$HOME/.ssh/id_ed25519.pub"
  echo ""
  echo "Hostinger hPanel → VPS → SSH keys → Add key → paste line above"
  echo "Then run this script again."
  exit 1
fi

echo "→ Running full install on VPS…"
ssh "${SSH_OPTS[@]}" "$VPS_HOST" "VPS_IP=187.124.117.113 bash -s" < "$(dirname "$0")/vps-full-install.sh"

echo ""
echo "→ Done. Open http://187.124.117.113"
