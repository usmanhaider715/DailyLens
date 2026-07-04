#!/usr/bin/env bash
# First-time Hostinger VPS setup — clone from GitHub and start DailyLens.
# Run on Ubuntu 22.04+ as a sudo user.
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/dailylens}"
REPO_URL="${REPO_URL:-https://github.com/usmanhaider715/DailyLens.git}"
BRANCH="${BRANCH:-main}"
DOMAIN="${DOMAIN:-dailylens.com}"

echo "==> DailyLens VPS bootstrap"
echo "    App dir:  $APP_DIR"
echo "    Repo:     $REPO_URL"
echo "    Domain:   $DOMAIN"

sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y git curl nginx certbot python3-certbot-nginx ufw fail2ban

if ! command -v node >/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null; then
  sudo npm install -g pm2
fi

sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable

sudo mkdir -p "$APP_DIR"
sudo chown "$USER:$USER" "$APP_DIR"

if [ ! -d "$APP_DIR/.git" ]; then
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR" && git pull origin "$BRANCH"
fi

cd "$APP_DIR"

if [ ! -f server/.env ]; then
  cp server/.env.example server/.env
  chmod 600 server/.env
  echo ""
  echo "!! Edit $APP_DIR/server/.env before continuing (MONGODB_URI, JWT_SECRET, GROQ_API_KEY, SITE_URL)"
  echo "!! Then run: bash scripts/deploy-vps-from-github.sh"
  exit 0
fi

bash scripts/deploy-vps-from-github.sh

if [ ! -f "/etc/nginx/sites-enabled/dailylens" ]; then
  sudo cp nginx/newssite-next.conf "/etc/nginx/sites-available/dailylens"
  sudo sed -i "s/dailylens.com/$DOMAIN/g" "/etc/nginx/sites-available/dailylens"
  sudo ln -sf "/etc/nginx/sites-available/dailylens" "/etc/nginx/sites-enabled/dailylens"
  sudo nginx -t
  sudo systemctl reload nginx
  echo "Run SSL: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
fi

echo "✓ Bootstrap complete. Ensure MongoDB + Redis are running and .env is configured."
