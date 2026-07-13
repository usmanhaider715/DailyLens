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

Required repository secrets (Settings → Secrets and variables → Actions):

- `HOST` — VPS IP
- `USERNAME` — SSH user (e.g. `root`)
- `SSH_KEY` — private key (ed25519)
- `PORT` — optional, default `22`

Push to `main` triggers `.github/workflows/deploy.yml`.

### One-time setup (recommended)

```bash
gh auth login
bash scripts/setup-github-actions-deploy.sh
```

This creates `~/.ssh/dailylens_github_actions`, authorizes it on the VPS, and writes all secrets.

### If deploys fail at “Deploy over SSH”

Usually **SSH auth**: `SSH_KEY` must match a key in the VPS `authorized_keys`. Re-run the setup script above, then **Actions → Deploy The Daily Lens → Run workflow**.

## Never commit

- `server/.env`, `web/.env.local`
- API keys, JWT secrets, MongoDB passwords
- SSH private keys
