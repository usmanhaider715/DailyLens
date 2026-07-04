# Hostinger upload deployment — The Daily Lens

Deploy **DailyLens** using Hostinger **Node.js Web App → Upload your files** (Business or Cloud hosting).

For full VPS control (Nginx, PM2, local MongoDB), use [HOSTINGER_DEPLOYMENT.md](./HOSTINGER_DEPLOYMENT.md) instead.

---

## What you need first

| Item | Why |
|------|-----|
| **Hostinger Business or Cloud** plan | Node.js Web App is not on basic shared hosting |
| **Domain** pointed to Hostinger | A record → your hosting IP |
| **[MongoDB Atlas](https://www.mongodb.com/cloud/atlas)** (free tier OK) | Database — not included in Node hosting |
| **[Redis Cloud](https://redis.io/cloud/)** (free tier OK) | Caching — optional but recommended |
| **Groq API key** | Admin AI articles & weather summaries ([console.groq.com](https://console.groq.com)) |

---

## Step 1 — Build the upload ZIP on your Mac

From the project folder:

```bash
cd "/Users/mac/Documents/Web Dev/new projects/DailyLens/newssite"
chmod +x scripts/build-hostinger-upload.sh
./scripts/build-hostinger-upload.sh
```

This creates:

| Output | Location |
|--------|----------|
| Folder | `DailyLens/DailyLens-upload/` |
| ZIP | `DailyLens/DailyLens-upload.zip` |

**Do not** add `node_modules`, `.env`, or `server/.env` to the zip — Hostinger installs dependencies and you set secrets in hPanel.

---

## Step 2 — Upload in Hostinger hPanel

1. Log in to **hPanel** → **Websites** → **Add Website**
2. Choose **Node.js Web App**
3. Select **Upload your website files** (not GitHub)
4. Upload **`DailyLens-upload.zip`**
5. When asked for build settings, use:

| Setting | Value |
|---------|--------|
| **Node.js version** | **20** (LTS) |
| **Build command** | `npm run build` |
| **Start command** | `npm start` |
| **Entry file** | `start.js` |
| **Output directory** | `web/.next` |
| **Application root** | `/` (root of extracted zip) |

6. Click **Deploy** and wait for the build log to finish.

---

## Step 3 — Environment variables (hPanel)

In **Deployments → Settings → Environment variables**, add these (adjust values):

### Required

```env
NODE_ENV=production
PORT=3000
API_PORT=5001

MONGODB_URI=mongodb+srv://USER:PASS@cluster.mongodb.net/dailylens
REDIS_URL=redis://default:PASS@redis-xxxxx.cloud.redislabs.com:6379

JWT_SECRET=use-a-long-random-string-at-least-32-chars
GROQ_API_KEY=gsk_xxxxxxxx

SITE_URL=https://yourdomain.com
CLIENT_URL=https://yourdomain.com

DISABLE_AI_PIPELINE=true
```

### Web (Next.js) — add in same env panel

```env
API_URL=http://127.0.0.1:5001
NEXT_PUBLIC_SITE_URL=https://yourdomain.com
NEXT_PUBLIC_API_URL=https://yourdomain.com
```

> `NEXT_PUBLIC_API_URL` should be your **public domain** so browser API calls go through Next.js rewrites (`/api/...`).

### Optional

```env
GROQ_MODEL=llama-3.3-70b-versatile
GOOGLE_CSE_API_KEY=
GOOGLE_CSE_ID=
CRICKETDATA_API_KEY=
ADMIN_EMAIL=admin@dailylens.com
ADMIN_PASSWORD=ChangeThisPassword!
```

Click **Save** → **Redeploy** after changing variables.

---

## Step 4 — MongoDB Atlas setup

1. Create a free **M0** cluster
2. **Database Access** → create user with password
3. **Network Access** → **Allow access from anywhere** (`0.0.0.0/0`) or Hostinger’s outbound IP
4. Copy connection string → paste as `MONGODB_URI`

---

## Step 5 — Seed the database (first run)

After the first successful deploy, open **hPanel → Advanced → SSH** or **Browser terminal** (if available):

```bash
cd ~/domains/yourdomain.com/public_html   # path may differ — check File Manager
cd server
cp .env.example .env
# Edit .env with same values as hPanel env vars, OR rely on hPanel env only
npm run seed
```

If SSH is not available, create the admin user once locally pointing `MONGODB_URI` at Atlas, then redeploy.

**Default seed admin** (change after login):

- Email: `admin@dailylens.com`
- Password: `DailyLens2026!`

---

## Step 6 — Verify the site

| URL | Expected |
|-----|----------|
| `https://yourdomain.com` | Homepage loads |
| `https://yourdomain.com/category/Weather` | Weather analysis tool |
| `https://yourdomain.com/weather` | City index |
| `https://yourdomain.com/admin/login` | Admin login |
| `https://yourdomain.com/sitemap.xml` | XML sitemap |
| `https://yourdomain.com/health` | `{"status":"ok"}` or similar |

---

## How the upload bundle works

```
start.js (entry)
  ├── Express API  → 127.0.0.1:5001  (MongoDB, Redis, cron, sitemap)
  └── Next.js web  → PORT 3000       (public site, proxies /api to API)
```

Root `package.json` scripts:

- `postinstall` — installs `server/` and `web/` dependencies
- `build` — runs `next build` in `web/`
- `start` — runs `start.js`

---

## Updating the site later

Hostinger **upload method does not auto-redeploy**. To update:

1. Edit code locally
2. Run `./scripts/build-hostinger-upload.sh` again
3. Upload the new **`DailyLens-upload.zip`**
4. Redeploy from hPanel

---

## Troubleshooting

### “Failed to build the application”

- Check build logs in hPanel
- Confirm **Node 20** is selected
- Confirm `package.json` is at the **root** of the zip (not inside a subfolder)
- Do **not** include `node_modules` in the zip

### Site loads but no articles / API errors

- Check `MONGODB_URI` in environment variables
- Run `npm run seed` in `server/` via SSH
- Confirm `API_URL=http://127.0.0.1:5001` is set

### Weather / AI features fail

- Add valid `GROQ_API_KEY`
- Open-Meteo is external — temporary 502 errors can happen; retry

### Admin login fails

- Run seed script or reset password in MongoDB
- Check `JWT_SECRET` is set and unchanged after first login tokens were issued

---

## SEO after go-live

1. Open [Google Search Console](https://search.google.com/search-console)
2. Add property `https://yourdomain.com`
3. Submit `https://yourdomain.com/sitemap.xml`
4. Request indexing for `/weather` and top city pages

Technical SEO (metadata, JSON-LD, sitemap) is built in. **Top Google rankings** still need content, time, and backlinks.

---

## Security checklist

- [ ] Strong `JWT_SECRET` and admin password
- [ ] HTTPS enabled in Hostinger (auto on most plans)
- [ ] Never commit `.env` or API keys to the zip
- [ ] Rotate secrets if shared during setup
- [ ] `DISABLE_AI_PIPELINE=true` until you add all news API keys

---

## Need full server control?

If you outgrow managed Node hosting (custom Nginx, two VPS processes, local MongoDB), migrate to **Hostinger VPS** using [HOSTINGER_DEPLOYMENT.md](./HOSTINGER_DEPLOYMENT.md).
