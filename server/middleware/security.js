import helmet from 'helmet';

/** Production security headers and hardening. */
export function applySecurity(app) {
  const siteUrl = process.env.SITE_URL || process.env.CLIENT_URL || '';
  const isProd = process.env.NODE_ENV === 'production';

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: isProd
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'", 'https://pagead2.googlesyndication.com'],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:', 'http:'],
              connectSrc: ["'self'", 'https:', 'wss:'],
              frameSrc: ["'self'", 'https://googleads.g.doubleclick.net'],
              fontSrc: ["'self'", 'https:', 'data:'],
            },
          }
        : false,
      hsts: isProd
        ? { maxAge: 31536000, includeSubDomains: true, preload: true }
        : false,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
  );

  app.disable('x-powered-by');

  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Permissions-Policy', 'geolocation=(self), camera=(), microphone=()');
    next();
  });
}

export function getAllowedOrigins() {
  const raw = [
    process.env.CLIENT_URL,
    process.env.SITE_URL,
    process.env.NEXT_PUBLIC_SITE_URL,
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter(Boolean);
  return [...new Set(raw)];
}
