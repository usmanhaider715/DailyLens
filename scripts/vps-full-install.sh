#!/usr/bin/env bash
# Full DailyLens install on Ubuntu VPS — run as root.
# Usage on VPS:
#   curl -fsSL https://raw.githubusercontent.com/usmanhaider715/DailyLens/main/scripts/vps-full-install.sh | bash
# Or after SSH works:
#   bash scripts/vps-full-install.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/dailylens}"
REPO_URL="${REPO_URL:-https://github.com/usmanhaider715/DailyLens.git}"
BRANCH="${BRANCH:-main}"
VPS_IP="${VPS_IP:-187.124.117.113}"
SITE_URL="${SITE_URL:-http://${VPS_IP}}"

echo "=========================================="
echo " DailyLens VPS install"
echo " App dir:  $APP_DIR"
echo " Site URL: $SITE_URL"
echo "=========================================="

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
apt-get install -y -qq git curl nginx ufw fail2ban ca-certificates gnupg

# Node.js 20
if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y -qq nodejs
fi

npm install -g pm2

# Docker (MongoDB + Redis)
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi

systemctl enable docker
systemctl start docker

# Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# App directory
mkdir -p "$APP_DIR"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
else
  cd "$APP_DIR" && git fetch origin "$BRANCH" && git reset --hard "origin/$BRANCH"
fi

cd "$APP_DIR"

# Mongo + Redis (localhost only)
docker compose -f docker-compose.prod.yml up -d
sleep 3

# Production .env
JWT_SECRET="$(openssl rand -hex 32)"
if [ ! -f server/.env ]; then
  cat > server/.env <<EOF
PORT=5001
NODE_ENV=production
CLIENT_URL=${SITE_URL}
SITE_URL=${SITE_URL}

MONGODB_URI=mongodb://127.0.0.1:27017/dailylens
REDIS_URL=redis://127.0.0.1:6379

JWT_SECRET=${JWT_SECRET}
JWT_EXPIRE=7d

GROQ_API_KEY=
GROQ_MODEL=llama-3.3-70b-versatile

DISABLE_AI_PIPELINE=true

ADMIN_EMAIL=admin@dailylens.com
ADMIN_PASSWORD=DailyLens2026!
EOF
  chmod 600 server/.env
  echo "→ Created server/.env (add GROQ_API_KEY later if needed)"
else
  echo "→ server/.env already exists — keeping it"
fi

# Web env
cat > web/.env.local <<EOF
API_URL=http://127.0.0.1:5001
NEXT_PUBLIC_SITE_URL=${SITE_URL}
NEXT_PUBLIC_API_URL=${SITE_URL}
EOF

echo "→ Installing dependencies & building…"
cd server && npm ci --omit=dev 2>/dev/null || npm install --production
echo "→ Starting API temporarily for Next.js build…"
node server.js &
API_PID=$!
sleep 6
cd ../web && npm ci 2>/dev/null || npm install
npm run build
kill "$API_PID" 2>/dev/null || true
sleep 1

echo "→ Seeding database…"
cd ../server
node scripts/seed.js || echo "Seed skipped or already done"

echo "→ Starting PM2…"
cd "$APP_DIR"
pm2 delete dailylens-api dailylens-web 2>/dev/null || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root 2>/dev/null | tail -1 | bash || true

# Nginx
cat > /etc/nginx/sites-available/dailylens <<NGINX
server {
    listen 80;
    server_name ${VPS_IP} _;

    client_max_body_size 2m;
    server_tokens off;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    location /api {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    location = /sitemap.xml { proxy_pass http://127.0.0.1:5001; }
    location = /robots.txt  { proxy_pass http://127.0.0.1:5001; }
    location = /feed.xml    { proxy_pass http://127.0.0.1:5001; }
    location = /health      { proxy_pass http://127.0.0.1:5001; }

    location /uploads/ {
        proxy_pass http://127.0.0.1:5001;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/dailylens /etc/nginx/sites-enabled/dailylens
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo ""
echo "=========================================="
echo " ✓ DailyLens deployed!"
echo " Site:  ${SITE_URL}"
echo " Admin: ${SITE_URL}/admin/login"
echo " Email: admin@dailylens.com"
echo " Pass:  DailyLens2026!  (change after login)"
echo "=========================================="
pm2 status
