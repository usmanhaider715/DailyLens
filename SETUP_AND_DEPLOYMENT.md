# The Daily Lens — Complete setup and go-live guide

This document walks you from a fresh machine to a **fully functional** production deployment: databases, API keys, AI pipeline, admin panel, ads, SSL, Nginx, PM2, and optional CI/CD.

**Repository layout (what you are deploying):**

| Path | Role |
|------|------|
| `client/` | React (Vite) frontend — build output is `client/dist/` |
| `server/` | Node.js API, Socket.io, cron jobs, MongoDB models |
| `nginx/newssite.conf` | Template reverse proxy for production |
| `docker-compose.yml` | Local MongoDB + Redis |
| `.github/workflows/deploy.yml` | Deploy on push to `main` (optional) |

---

## Part 1 — What “full functionality” requires

| Feature | Requirement |
|---------|-------------|
| Homepage, categories, articles, search | MongoDB + seeded or ingested articles |
| AI rewriting, categories, SEO fields | `ANTHROPIC_API_KEY` (Claude) |
| Hero images (DALL·E + Cloudinary) | `OPENAI_API_KEY` + `CLOUDINARY_*` |
| News ingestion (APIs + RSS) | `NEWSAPI_KEY`, `GNEWS_KEY` (optional but recommended) + network access |
| Trending / list caching | Redis (`REDIS_URL`) |
| Live breaking ticker + viewer count | Socket.io (same origin as site in production, or correct `CLIENT_URL`) |
| Admin dashboard | JWT (`JWT_SECRET`) + admin user (seed or manual) |
| Google AdSense slots | `VITE_ADSENSE_PUBLISHER_ID` + AdSense slot IDs in admin **Ad Manager** |
| HTTPS + SPA routing | Nginx + Let’s Encrypt |
| Process supervision | PM2 |

You can go live **without** NewsAPI/GNews (RSS-only ingestion still runs), but article volume will be lower. You **cannot** get AI-processed copy without Anthropic; images fall back without OpenAI/Cloudinary.

---

## Part 2 — Prerequisites

### On your laptop (for development)

- **Node.js 20+** ([nodejs.org](https://nodejs.org/) or `nvm install 20`)
- **Git**
- **Docker Desktop** (or Docker Engine + Compose plugin) — for local MongoDB/Redis
- A code editor and terminal

### For production (VPS, e.g. Hostinger)

- **Ubuntu 22.04 LTS** (or similar) with `sudo`
- A **domain** pointed to the VPS **A record** (and `www` if you use it)
- **SSH access** (key-based login recommended)
- **Ports:** 22 (SSH), 80 (HTTP), 443 (HTTPS) open in the provider firewall and `ufw`

### Accounts to prepare (production)

Create accounts and keys as needed:

1. **MongoDB** — local on VPS, or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. **Redis** — local on VPS, or [Redis Cloud](https://redis.io/cloud/)
3. **[Anthropic Console](https://console.anthropic.com/)** — API key for Claude
4. **[OpenAI Platform](https://platform.openai.com/)** — API key for DALL·E 3
5. **[Cloudinary](https://cloudinary.com/)** — Cloud name, API key, API secret
6. **[NewsAPI](https://newsapi.org/)** — optional API key
7. **[GNews](https://gnews.io/)** — optional API key
8. **[Google AdSense](https://www.google.com/adsense/)** — publisher ID + ad units (after site approval)

---

## Part 3 — Local development (full stack on your machine)

### Step 3.1 — Clone and enter the project

```bash
git clone <YOUR_REPO_URL> newssite
cd newssite
```

### Step 3.2 — Start MongoDB and Redis

From the **`newssite`** directory (where `docker-compose.yml` lives):

```bash
docker compose up -d
```

Verify:

```bash
docker compose ps
```

You should see `mongo` and `redis` running. Mongo listens on **27017**, Redis on **6379**.

### Step 3.3 — Server environment

```bash
cd server
cp .env.example .env
```

Edit **`server/.env`** with at minimum:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
SITE_URL=http://localhost:5173

MONGODB_URI=mongodb://localhost:27017/newssite
REDIS_URL=redis://localhost:6379

JWT_SECRET=change-this-to-a-long-random-string
JWT_EXPIRE=7d

ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=YourSecurePassword123!
```

Add keys when you are ready to test AI and images:

```env
ANTHROPIC_API_KEY=sk-ant-api03-...
OPENAI_API_KEY=sk-...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

NEWSAPI_KEY=...
GNEWS_KEY=...
```

Install and run:

```bash
npm install
npm run seed
```

**What `npm run seed` does:** creates the admin user (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), default categories, placeholder ad slots, news sources, default site settings, then runs **one** news fetch cycle (will ingest RSS even if NewsAPI/GNews keys are empty; Claude/OpenAI steps need keys).

Start the API:

```bash
npm run dev
```

You should see a log line that the server is listening on **port 5000**. Health check: [http://localhost:5000/health](http://localhost:5000/health)

### Step 3.4 — Client environment

Open a **second** terminal:

```bash
cd newssite/client
cp .env.example .env
```

For local dev, **`VITE_API_URL` can be empty**. Vite proxies `/api` and `/socket.io` to `http://localhost:5000` (see `client/vite.config.js`).

If you use AdSense locally (optional):

```env
VITE_ADSENSE_PUBLISHER_ID=ca-pub-xxxxxxxxxxxxxxxx
```

```bash
npm install
npm run dev
```

Open **[http://localhost:5173](http://localhost:5173)**.

### Step 3.5 — Local verification checklist

| Check | How |
|-------|-----|
| API | Visit `/health` on port 5000 |
| Articles | Homepage shows cards after seed/fetch |
| Article page | Click an article; title and meta in tab |
| Admin | [http://localhost:5173/admin/login](http://localhost:5173/admin/login) with seed credentials |
| Socket | Breaking ticker shows “online” count; open two browser tabs |
| Manual fetch | Admin → Articles → **Fetch URL** with a news article URL |

---

## Part 4 — Environment variables (reference)

### Server (`server/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | HTTP port (default `5000`). Nginx proxies to this in production. |
| `NODE_ENV` | Yes (prod) | Use `production` on the server. |
| `CLIENT_URL` | Yes | Exact origin of the browser app (e.g. `https://thedailylens.com`). Used for **CORS** and **Socket.io** origin. Must match what users type in the address bar (no trailing slash). |
| `SITE_URL` | Yes | Public site URL for **sitemap**, **robots.txt**, and canonical/OG hints (e.g. `https://thedailylens.com`). |
| `MONGODB_URI` | Yes | Mongo connection string. Local: `mongodb://localhost:27017/newssite`. Atlas: `mongodb+srv://USER:PASS@cluster.../newssite?retryWrites=true&w=majority` |
| `REDIS_URL` | Yes | Redis URL, e.g. `redis://localhost:6379` or cloud URL with password. |
| `JWT_SECRET` | Yes | Long random string for signing admin JWTs. |
| `JWT_EXPIRE` | No | Token lifetime (default `7d`). |
| `ANTHROPIC_API_KEY` | For AI copy | Without it, new articles may save as unpublished/raw depending on pipeline errors. |
| `OPENAI_API_KEY` | For DALL·E | Without it, hero images use article thumbnail or Unsplash-style fallback. |
| `CLOUDINARY_CLOUD_NAME` etc. | For hosted heroes | Without it, generated images from OpenAI may not be persisted to CDN (depends on code path). |
| `NEWSAPI_KEY` / `GNEWS_KEY` | Optional | Extra headlines; RSS still works without them. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | For seed | Used by `npm run seed` to create the first admin. |

**Note:** `VITE_*` variables belong in the **client** build, not in `server/.env`, unless you duplicate for documentation only. The built React app embeds `import.meta.env.VITE_*` at **build time**.

### Client (production build — `client/.env`)

Create **`client/.env`** before `npm run build`:

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | **Production:** set to your public origin with **no path**, e.g. `https://thedailylens.com` so axios calls `https://thedailylens.com/api/...`. Same origin as the site is typical when Nginx serves `/` and `/api` on one host. |
| `VITE_ADSENSE_PUBLISHER_ID` | Your `ca-pub-...` ID from AdSense. |

If `VITE_API_URL` is wrong, the browser will call the wrong host and APIs will fail.

---

## Part 5 — Production VPS setup (methodical)

Assume **Ubuntu 22.04**, domain **`thedailylens.com`**, app path **`/var/www/newssite`**. Replace domain and paths with yours.

### Step 5.1 — Create deploy user (optional but recommended)

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
```

Copy your SSH public key to `/home/deploy/.ssh/authorized_keys`. Test login as `deploy`.

### Step 5.2 — Install system packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git nginx ufw curl build-essential
```

### Step 5.3 — Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # should show v20.x
```

### Step 5.4 — Install PM2 globally

```bash
sudo npm install -g pm2
```

Enable PM2 on boot (run as the user that will run the app):

```bash
pm2 startup systemd
# Run the command it prints (sudo env PATH=...)
```

### Step 5.5 — Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

### Step 5.6 — MongoDB and Redis on the VPS

**Option A — Docker on VPS (same as local)**

Install Docker from [docs.docker.com](https://docs.docker.com/engine/install/ubuntu/), then copy `docker-compose.yml` to the server (or clone repo) and run:

```bash
cd /var/www/newssite
docker compose up -d
```

Set `MONGODB_URI` and `REDIS_URL` in `server/.env` to point to these containers. If Mongo/Redis run in Docker, use the **host** URL from the Node process’s perspective (often `mongodb://127.0.0.1:27017/newssite` and `redis://127.0.0.1:6379` when ports are published).

**Option B — MongoDB Atlas + Redis Cloud**

- Create a database user and whitelist your **VPS public IP** (or `0.0.0.0/0` only for testing).
- Paste the SRV connection string into `MONGODB_URI`.
- Paste the Redis URL (with password) into `REDIS_URL`.

### Step 5.7 — Clone the application

```bash
sudo mkdir -p /var/www
sudo chown deploy:deploy /var/www
cd /var/www
git clone <YOUR_REPO_URL> newssite
cd newssite
```

### Step 5.8 — Server `.env` on production

```bash
cd /var/www/newssite/server
cp .env.example .env
nano .env   # or vim
```

Set at least:

- `NODE_ENV=production`
- `CLIENT_URL=https://thedailylens.com`
- `SITE_URL=https://thedailylens.com`
- `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`
- All API keys you need for production quality

Install production dependencies:

```bash
npm install --production
```

Run seed **once** (creates admin, categories, ads, first fetch):

```bash
npm run seed
```

### Step 5.9 — Build the client for production

```bash
cd /var/www/newssite/client
nano .env
```

Example production `client/.env`:

```env
VITE_API_URL=https://thedailylens.com
VITE_ADSENSE_PUBLISHER_ID=ca-pub-xxxxxxxxxxxxxxxx
```

```bash
npm ci
npm run build
```

Confirm **`client/dist/index.html`** exists.

### Step 5.10 — Start the API with PM2

The server loads `.env` from the **current working directory**. Start PM2 from **`server/`** so `dotenv` finds `server/.env`:

```bash
cd /var/www/newssite/server
pm2 start server.js --name newssite
pm2 save
```

Check logs:

```bash
pm2 logs newssite
```

### Step 5.11 — Nginx

Copy the template and edit domain and paths:

```bash
sudo cp /var/www/newssite/nginx/newssite.conf /etc/nginx/sites-available/thedailylens.conf
sudo nano /etc/nginx/sites-available/thedailylens.conf
```

Replace:

- `yourdomain.com` → `thedailylens.com`
- `www.yourdomain.com` → `www.thedailylens.com` (or remove `www` server_name if unused)
- Confirm `root` points to `/var/www/newssite/client/dist`

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/thedailylens.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Important:** For the **first** SSL certificate, you often need a **temporary** HTTP server block that serves the app or certbot webroot **before** forcing HTTPS-only, or use `certbot --nginx` which can adjust config. Typical flow:

1. Temporarily comment out the `return 301 https://...` block **or** use Certbot’s nginx plugin on the HTTP server.
2. Run Certbot (see next step).
3. Ensure final config has SSL paths and still proxies `/api`, `/socket.io`, `/sitemap.xml`, `/robots.txt`.

### Step 5.12 — SSL with Let’s Encrypt (Certbot)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d thedailylens.com -d www.thedailylens.com
```

Follow prompts (email, agree to terms). Certbot will install certs under `/etc/letsencrypt/live/thedailylens.com/` if that matches your `-d` names.

Reload Nginx:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

Auto-renewal is usually installed as a timer; verify:

```bash
sudo certbot renew --dry-run
```

### Step 5.13 — Production verification

| Test | Expected |
|------|----------|
| `https://thedailylens.com` | SPA loads, no mixed-content errors |
| `https://thedailylens.com/api/articles` | JSON (may be `[]` or paginated articles) |
| `https://thedailylens.com/health` | `{"ok":true}` |
| `https://thedailylens.com/sitemap.xml` | XML (proxied to Node) |
| Admin login | `https://thedailylens.com/admin/login` |
| WebSocket | Ticker / live count update (browser devtools → Network → WS) |

**CORS / Socket:** If the site loads but API or sockets fail, **`CLIENT_URL` must exactly match** the browser origin (scheme + host + port).

---

## Part 6 — Ongoing operations

### Deploy updates manually

On the server:

```bash
cd /var/www/newssite
git pull origin main
cd server && npm install --production
cd ../client && npm ci && npm run build
pm2 reload newssite
```

Or use **`scripts/deploy.sh`** after editing paths inside it to match your server.

### Cron / AI pipeline

The server starts a **node-cron** job every **15 minutes** when `server.js` runs. No separate crontab entry is required as long as PM2 keeps the process alive.

### Logs

```bash
pm2 logs newssite --lines 200
```

### Backups

- **MongoDB:** `mongodump` on a schedule, or Atlas backups.
- **`.env`:** store secrets in a password manager; never commit `.env`.

---

## Part 7 — GitHub Actions (optional CI/CD)

Workflow file: **`.github/workflows/deploy.yml`**.

### Repository secrets (GitHub → Settings → Secrets and variables → Actions)

| Secret | Example value |
|--------|----------------|
| `HOST` | VPS IP or hostname |
| `USERNAME` | `deploy` |
| `SSH_KEY` | **Full** private key PEM (including `BEGIN` / `END` lines). Paste carefully. |
| `PORT` | `22` or your SSH port |

On each push to **`main`**, the workflow SSHes in and runs pull, install, client build, and `pm2 reload newssite`.

**Requirements on the VPS:** `git`, `node`, `npm`, `pm2`, repo already cloned at the path in the workflow (`/var/www/newssite`), PM2 app already named **`newssite`**, and SSH key authorized for the deploy user.

---

## Part 8 — Google AdSense (full ad functionality)

1. Deploy the site with real content and pages (AdSense reviews the site).
2. Apply in AdSense; after approval, create **ad units** and note **slot IDs**.
3. Set **`VITE_ADSENSE_PUBLISHER_ID`** in `client/.env` and **rebuild** the client.
4. In **Admin → Ad Manager**, create or edit slots: set position (`leaderboard-top`, etc.), type **AdSense**, paste **slot ID**, activate.

Impression/click endpoints are wired to the API.

---

## Part 9 — Troubleshooting

| Symptom | Likely cause | Fix |
|---------|----------------|-----|
| Blank articles / API errors | Mongo down or wrong `MONGODB_URI` | Check `pm2 logs`, `docker compose ps`, connection string |
| Slow lists | Redis down | Fix `REDIS_URL`; app degrades but caching fails |
| CORS errors | `CLIENT_URL` mismatch | Set to exact frontend URL |
| Socket.io never connects | Wrong host/port, or Nginx missing `/socket.io` proxy | Fix Nginx; ensure `upgrade` headers |
| 502 on `/api` | Node not listening or wrong `proxy_pass` port | `pm2 status`, check `PORT` |
| SSL errors | Wrong `server_name` or cert path | `sudo nginx -t`, re-run certbot |
| AI never runs | Missing `ANTHROPIC_API_KEY` | Add key, restart PM2 |
| No images | OpenAI/Cloudinary keys | Add keys; check Cloudinary folder permissions |
| `source.unsplash.com` broken | Third-party deprecation | Use article `imageUrl` or switch to Unsplash API / static CDN in `imageService.js` |

---

## Part 10 — Quick command reference

```text
Local DB:           docker compose up -d
Server dev:         cd server && npm install && npm run dev
Client dev:         cd client && npm install && npm run dev
Seed DB:            cd server && npm run seed
Prod client build:  cd client && npm ci && npm run build
Prod server deps:   cd server && npm install --production
PM2 start:          cd server && pm2 start server.js --name newssite && pm2 save
```

---

For a short overview, see [README.md](README.md).
