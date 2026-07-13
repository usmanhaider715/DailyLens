#!/usr/bin/env bash
# One-time setup for GitHub Actions → VPS auto-deploy.
# 1) Creates a dedicated deploy SSH key (if missing)
# 2) Adds the public key to the VPS authorized_keys
# 3) Stores HOST/USERNAME/PORT/SSH_KEY in GitHub Actions secrets (requires gh auth)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="${GITHUB_REPO:-usmanhaider715/DailyLens}"
VPS_HOST="${VPS_HOST:-root@187.124.117.113}"
VPS_IP="${VPS_IP:-187.124.117.113}"
SSH_PORT="${SSH_PORT:-22}"
ADMIN_KEY="${ADMIN_KEY:-$HOME/.ssh/id_ed25519}"
DEPLOY_KEY="${DEPLOY_KEY:-$HOME/.ssh/dailylens_github_actions}"

echo "==> GitHub Actions deploy setup for $REPO"

if [ ! -f "$ADMIN_KEY" ]; then
  echo "Admin SSH key not found at $ADMIN_KEY — set ADMIN_KEY to a key that can reach the VPS."
  exit 1
fi

if [ ! -f "$DEPLOY_KEY" ]; then
  echo "==> Generating deploy key at $DEPLOY_KEY"
  ssh-keygen -t ed25519 -C "github-actions-dailylens-deploy" -f "$DEPLOY_KEY" -N ""
fi

PUB="$(cat "${DEPLOY_KEY}.pub")"
SSH_OPTS=(-i "$ADMIN_KEY" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new)

echo "==> Authorizing deploy key on VPS ($VPS_HOST)"
ssh "${SSH_OPTS[@]}" "$VPS_HOST" bash -s <<EOF
set -e
mkdir -p ~/.ssh
chmod 700 ~/.ssh
touch ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
grep -Fq 'github-actions-dailylens-deploy' ~/.ssh/authorized_keys || echo '$PUB' >> ~/.ssh/authorized_keys
echo "Authorized keys:"
ssh-keygen -lf ~/.ssh/authorized_keys
EOF

echo "==> Testing deploy key"
ssh -i "$DEPLOY_KEY" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new "$VPS_HOST" "echo deploy-key-ok"

if ! command -v gh >/dev/null 2>&1; then
  echo ""
  echo "gh CLI not installed — add secrets manually in GitHub:"
  echo "  Repo → Settings → Secrets and variables → Actions"
  echo "  HOST=$VPS_IP"
  echo "  USERNAME=root"
  echo "  PORT=$SSH_PORT"
  echo "  SSH_KEY=<contents of $DEPLOY_KEY>"
  exit 0
fi

if ! gh auth status >/dev/null 2>&1; then
  echo ""
  echo "Run: gh auth login"
  echo "Then re-run: bash scripts/setup-github-actions-deploy.sh"
  exit 1
fi

echo "==> Setting GitHub Actions secrets on $REPO"
gh secret set HOST --repo "$REPO" --body "$VPS_IP"
gh secret set USERNAME --repo "$REPO" --body "root"
gh secret set PORT --repo "$REPO" --body "$SSH_PORT"
gh secret set SSH_KEY --repo "$REPO" < "$DEPLOY_KEY"

echo ""
echo "✓ Done. Push to main or run the workflow manually:"
echo "  gh workflow run deploy.yml --repo $REPO"
