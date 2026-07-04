import { logger } from './logger.js';

const WEAK_SECRETS = new Set(['your_jwt_secret_here', 'change-me', 'secret', 'jwt_secret']);

export function validateProductionEnv() {
  if (process.env.NODE_ENV !== 'production') return;

  const required = ['MONGODB_URI', 'JWT_SECRET', 'SITE_URL', 'CLIENT_URL'];
  const missing = required.filter((k) => !String(process.env[k] || '').trim());
  if (missing.length) {
    throw new Error(`Missing required production env: ${missing.join(', ')}`);
  }

  const jwt = process.env.JWT_SECRET.trim();
  if (jwt.length < 32 || WEAK_SECRETS.has(jwt.toLowerCase())) {
    throw new Error('JWT_SECRET must be at least 32 characters and not a default placeholder');
  }

  if (!process.env.MONGODB_URI.startsWith('mongodb')) {
    throw new Error('MONGODB_URI must be a valid MongoDB connection string');
  }

  logger.info('Production environment validated');
}
