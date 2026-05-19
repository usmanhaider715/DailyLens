# The Daily Lens — Local quick start (no AI)

## Admin login

| Field | Value |
|-------|--------|
| URL | http://localhost:5173/admin/login |
| Email | `admin@dailylens.com` |
| Password | `DailyLens2026!` |

## Start databases

**Option A — Docker** (if Docker Desktop is installed):

```bash
cd newssite
docker compose up -d
```

**Option B — Homebrew** (macOS, used on this machine):

```bash
brew services start mongodb/brew/mongodb-community@7.0
# Redis was already running on port 6379
```

## Start the app

```bash
# Terminal 1 — API (port 5001 — macOS often uses 5000 for AirPlay)
cd newssite/server
npm install
npm run seed    # demo articles + admin user (safe to re-run)
npm run dev

# Terminal 2 — Frontend
cd newssite/client
npm install
npm run dev
```

Open **http://localhost:5173**

## What works without AI

- 12 demo articles (breaking, featured, forecasts)
- **Admin → Write article** — create/edit headlines, body, category, breaking/featured flags
- **Forecast block** — enable per article; shows on site, sidebar, categories, cards
- **Admin → Articles** — edit, toggle breaking/featured, delete
- **Admin → Breaking News** — push ticker instantly
- Socket.io ticker and live viewer count

AI cron is off when `DISABLE_AI_PIPELINE=true` in `server/.env`.

## Re-seed demo content

```bash
cd newssite/server && npm run seed
```
