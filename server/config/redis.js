import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

let client;

export function getRedis() {
  if (!client) {
    const url = process.env.REDIS_URL || 'redis://localhost:6379';
    client = new Redis(url, { maxRetriesPerRequest: null });
    client.on('error', (err) => logger.error('Redis error', err.message));
  }
  return client;
}
