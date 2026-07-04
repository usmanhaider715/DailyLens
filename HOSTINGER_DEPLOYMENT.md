# Hostinger VPS deployment — The Daily Lens

This guide deploys **DailyLens** (`newssite/`) on a **Hostinger VPS** (Ubuntu 22.04) with Nginx, PM2, MongoDB, Redis, SSL, and production security.

For local setup, see [SETUP_AND_DEPLOYMENT.md](./SETUP_AND_DEPLOYMENT.md).

---

## What you deploy

| Process | Port | Role |
|---------|------|------|
| `web` (Next.js) | 3000 | Public site (SSR, weather SEO pages) |
| `server` (Express) | 5001 | API, Socket.io, cron, sitemap |
| MongoDB | 27017 | Articles, settings |
| Redis | 6379 | Cache, trending |
| Nginx | 80 / 443 | HTTPS reverse proxy |

---

## Part 1 — Give your developer/agent VPS access (safe)

To deploy for you, share access **without** putting passwords in Git:

### Option A — SSH key (recommended)

1. On Hostinger VPS panel: **SSH access** → note IP and root/sudo user.
2. On your Mac, generate a key if needed:
   ```bash
   ssh-keygen -t ed25519 -C "dailylens-deploy" -f ~/.ssh/dailylens_deploy
   ```
3. Add the **public** key to the server:
   ```bash
   ssh-copy-id -i ~/.ssh/dailylens_deploy.pub user@YOUR_VPS_IP
   ```
4. Send the agent only:
   - VPS IP
   - SSH user (e.g. `root` or `deploy`)
   - Path to private key (or add their public key on the server)
   - Domain name (e.g. `dailylens.com`)

### Option B — Hostinger browser terminal

Use Hostinger **Browser terminal** for one-off setup; for ongoing deploys, SSH keys are still better.

### Do not commit to the repo

- SSH passwords  
- `JWT_SECRET`, `GROQ_API_KEY`, MongoDB passwords  
- Hostinger panel login  

Use `server/.env` on the VPS only (`chmod 600`).

---

## Part 2 — First-time VPS setup

SSH in:

```bash
ssh user@YOUR_VPS_IP
```

### 2.1 System packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx certbot python3-certbot-nginx ufw fail2ban
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2.2 Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2.3 MongoDB & Redis

**MongoDB** (local):

```bash
# Follow MongoDB 7 Ubuntu install docs, or use Atlas and set MONGODB_URI
```

**Redis**:

```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
```

### 2.4 Clone from GitHub (recommended)

```bash
sudo mkdir -p /var/www/dailylens
sudo chown $USER:$USER /var/www/dailylens
cd /var/www/dailylens
git clone https://github.com/usmanhaider715/DailyLens.git .
```

Or run the automated bootstrap:

```bash
curl -fsSL https://raw.githubusercontent.com/usmanhaider715/DailyLens/main/scripts/bootstrap-vps.sh | bash
# Or after clone: bash scripts/bootstrap-vps.sh
```

---

## Part 3 — Production environment

```bash
cd /var/www/dailylens/server
cp .env.example .env
nano .env
chmod 600 .env
```

**Required:**

```env
NODE_ENV=production
PORT=5001
MONGODB_URI=mongodb://127.0.0.1:27017/dailylens
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=<long-random-string>
GROQ_API_KEY=<your-groq-key>
SITE_URL=https://yourdomain.com
CLIENT_URL=https://yourdomain.com
DISABLE_AI_PIPELINE=true
```

**Recommended for SEO / images:**

```env
GOOGLE_CSE_API_KEY=
GOOGLE_CSE_ID=
```

**Web** (`web/.env.local`):

```env
API_URL=http://127.0.0.1:5001
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

Install, build, and start:

```bash
cd /var/www/dailylens
bash scripts/deploy-vps-from-github.sh
```

---

## Part 4 — GitHub → VPS auto-deploy

### One-time GitHub secrets

In **GitHub → usmanhaider715/DailyLens → Settings → Secrets → Actions**, add:

| Secret | Value |
|--------|--------|
| `HOST` | VPS IP address |
| `USERNAME` | SSH user (e.g. `root`) |
| `SSH_KEY` | Private key contents (`cat ~/.ssh/dailylens_deploy`) |
| `PORT` | `22` |

Every push to **`main`** runs `.github/workflows/deploy.yml` and executes `scripts/deploy-vps-from-github.sh` on the VPS.

Manual deploy on VPS:

```bash
cd /var/www/dailylens && bash scripts/deploy-vps-from-github.sh
```

---

## Part 5 — PM2

Use the included `ecosystem.config.cjs` at repo root:

```bash
cd /var/www/dailylens
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

---

## Part 6 — Nginx + SSL

Copy `nginx/newssite-next.conf` to `/etc/nginx/sites-available/dailylens`, set `server_name yourdomain.com www.yourdomain.com`, then:

```bash
sudo ln -s /etc/nginx/sites-available/dailylens /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Proxy rules (summary):

- `/` → `http://127.0.0.1:3000`
- `/api`, `/socket.io`, `/sitemap.xml`, `/robots.txt`, `/feed.xml`, `/health` → `http://127.0.0.1:5001`

---

## Part 7 — Security

See [SECURITY.md](./SECURITY.md) for the full checklist. Minimum before go-live:

- `NODE_ENV=production`
- Strong `JWT_SECRET` (32+ chars)
- HTTPS via Certbot
- `ufw` + fail2ban
- MongoDB not public; Redis bound to localhost
- Change admin password after seed

---

## Part 8 — SEO after go-live

The site includes:

- **Weather SEO pages:** `/weather/us/{state}` and `/weather/uk/{city}` (in sitemap)
- **Category metadata** for Weather, Crypto, Technology
- **Sitemap:** `https://yourdomain.com/sitemap.xml`
- **RSS:** `/feed.xml`

Submit in [Google Search Console](https://search.google.com/search-console):

1. Add property `https://yourdomain.com`
2. Submit sitemap URL
3. Request indexing for `/weather` hub and top cities

**Ranking at the top** depends on content volume, backlinks, and time — technical SEO is in place; continue publishing unique articles and weather pages.

---

## Part 9 — Security checklist (summary)

| Item | Status |
|------|--------|
| `NODE_ENV=production` | Required |
| Strong `JWT_SECRET` | Required |
| HTTPS (Certbot) | Required |
| `ufw` + fail2ban | Recommended |
| `.env` not in git | Required |
| Helmet + HSTS (server) | Enabled in production |
| Rate limits on API | Enabled |
| Admin only via `/admin/login` | No public admin link |

---

## Part 10 — Deploy updates

```bash
cd /var/www/dailylens
git pull origin main
bash scripts/deploy-vps-from-github.sh
```

Or push to `main` on GitHub — Actions deploys automatically if secrets are set.

---

## Part 11 — Verify weather feature

- https://yourdomain.com/category/Weather — analysis tool + forecast  
- https://yourdomain.com/weather — city index  
- https://yourdomain.com/weather/us/ny — example US page  
- https://yourdomain.com/weather/uk/england-london — example UK page  

---

## Support

If you want an agent to deploy on your VPS, provide **SSH key access** and domain DNS pointing to the VPS IP — do not share panel passwords in chat logs; rotate secrets after handoff.
