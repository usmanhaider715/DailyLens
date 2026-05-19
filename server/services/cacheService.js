import { getRedis } from '../config/redis.js';

const redis = () => getRedis();

export async function cacheGet(key) {
  try {
    const v = await redis().get(key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds) {
  try {
    await redis().set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    /* ignore */
  }
}

export async function cacheDel(key) {
  try {
    await redis().del(key);
  } catch {
    /* ignore */
  }
}

export function cacheKeys() {
  return {
    articleList: (q) => `articles:list:${JSON.stringify(q)}`,
    breaking: 'articles:breaking',
    trending: 'articles:trending',
    articleBySlug: (slug) => `articles:slug:${slug}`,
  };
}
