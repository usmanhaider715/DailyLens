# The Daily Lens — Local quick start

## Admin login

| Field | Value |
|-------|--------|
| URL | http://localhost:3000/admin/login |
| Email | `admin@dailylens.com` |
| Password | `DailyLens2026!` |

## Start databases

**Option A — Docker** (if Docker Desktop is installed):

```bash
cd newssite
docker compose up -d
```

**Option B — Homebrew** (macOS):

```bash
brew services start mongodb/brew/mongodb-community@7.0
```

## Start the app

```bash
# Terminal 1 — API (port 5001)
cd newssite/server
npm install
npm run seed    # demo articles + admin user (safe to re-run)
npm run dev

# Terminal 2 — Next.js (port 3000)
cd newssite/web
npm install
npm run dev
```

Open **http://localhost:3000**

## What works

- SSR article pages with SEO score badge (1–10)
- Related reading links (Wikipedia / external) in *italics*
- Admin panel at `/admin`
- Live scores, weather locator, AI news feed (with `GROQ_API_KEY`)
