# Security checklist — The Daily Lens

## Application (Express + Next.js)

| Control | Status |
|---------|--------|
| Helmet security headers | `server/middleware/security.js` |
| HSTS in production | Helmet + Nginx |
| CORS restricted to allowed origins | `getAllowedOrigins()` |
| Rate limiting (API, auth, AI, image proxy) | `server/middleware/rateLimiter.js` |
| Admin JWT + role check (admin/editor) | `requireAdmin` on `/api/admin/*` |
| Login brute-force limit (10 / 15 min) | `authLimiter` |
| Production env validation | `server/utils/envValidate.js` |
| Generic 500 errors in production | `errorHandler` |
| SSRF protection on image proxy | `server/utils/ssrfGuard.js` |
| Body size limits (1 MB JSON) | `server.js` |
| Trust proxy behind Nginx | `app.set('trust proxy', 1)` |
| Secrets in `.env` (gitignored) | `.gitignore` |

## Server (VPS)

- [ ] `ufw` — only 22, 80, 443
- [ ] `fail2ban` enabled
- [ ] MongoDB not exposed publicly (bind 127.0.0.1 or Atlas)
- [ ] Redis password + not public
- [ ] `JWT_SECRET` ≥ 32 random chars
- [ ] Change default admin password after seed
- [ ] HTTPS via Certbot
- [ ] `NODE_ENV=production`

## GitHub Actions deploy

Add repository secrets:

- `HOST` — VPS IP
- `USERNAME` — SSH user
- `SSH_KEY` — private key (ed25519)
- `PORT` — `22`

Push to `main` triggers `.github/workflows/deploy.yml`.

## Never commit

- `server/.env`, `web/.env.local`
- API keys, JWT secrets, MongoDB passwords
- SSH private keys
