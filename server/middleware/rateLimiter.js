import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 200 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests. Please try again later.' },
  skip: (req) => {
    const p = req.path || '';
    const url = req.originalUrl || '';
    return (
      p === '/robots.txt' ||
      p === '/feed.xml' ||
      p === '/llms.txt' ||
      p === '/health' ||
      p === '/sitemap.xml' ||
      /^\/sitemap-.*\.xml$/.test(p) ||
      /\/admin\/auto-share\/run-status\//.test(url) ||
      /\/admin\/idea-batch\/run-status\//.test(url)
    );
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: { message: 'Too many login attempts. Try again in 15 minutes.' },
});

export const adminAiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'AI rate limit reached. Wait a moment.' },
});

export const batchPublishLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many batch jobs started. Wait before starting another.' },
});

export const imageProxyLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Image proxy rate limit reached.' },
});
