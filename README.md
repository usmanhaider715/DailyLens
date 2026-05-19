# The Daily Lens

Next.js (SSR) frontend + Express API for a news site with AI-assisted editorial tools, live sports scores, and location-based weather.

## Stack

| Layer | Path | Port (dev) |
|-------|------|------------|
| Next.js 15 | `web/` | 3000 |
| Express API | `server/` | 5001 |
| MongoDB | — | 27017 |

Legacy Vite client remains in `client/` for reference; **use `web/` for production**.

## Quick start

```bash
# 1. API
cd server
cp .env.example .env   # add MONGODB_URI, JWT_SECRET, GROQ_API_KEY
npm install
npm run dev

# 2. Next.js (new terminal)
cd web
cp .env.example .env.local
npm install
npm run dev
```

Open http://localhost:3000 — API requests proxy to port 5001 via `next.config.mjs` rewrites.

## Production

```bash
# Build frontend
cd web && npm run build && npm start

# API
cd server && NODE_ENV=production npm start
```

Use `nginx/newssite-next.conf` as a reverse-proxy template (Next on 3000, API on 5001).

### Environment

**server/.env**
- `MONGODB_URI`, `JWT_SECRET`, `GROQ_API_KEY`, `SITE_URL`, `PORT=5001`

**web/.env.local** (build + runtime)
- `API_URL=http://127.0.0.1:5001` (server-side fetch)
- `NEXT_PUBLIC_SITE_URL=https://yourdomain.com`

## Admin

- URL: `/admin/login`
- Seed user (if seeded): `admin@dailylens.com` / see server seed script

## SEO

- SSR article & category pages with `generateMetadata`
- `/sitemap.xml`, `/robots.txt`, `/feed.xml`, `/llms.txt` proxied from API
- Legal pages: `/legal/privacy`, `/legal/terms`, `/legal/disclaimer`

## Features

- **Weather**: browser geolocation + US state / UK region-city dropdowns
- **Live scores**: NFL, NBA, MLB, NHL, soccer leagues, cricket (ESPN + cricket APIs)
- **AI news feed**: categorized sources in admin panel

## License

Proprietary — all rights reserved.
