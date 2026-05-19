#!/usr/bin/env bash
set -euo pipefail
# Example VPS bootstrap — run as root on Ubuntu 22.04+
apt-get update
apt-get install -y nginx git ufw
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs
npm install -g pm2
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
echo "Clone repo to /var/www/newssite, copy nginx/newssite.conf to /etc/nginx/sites-enabled/, certbot --nginx, pm2 start server/server.js --name newssite"
