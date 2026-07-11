import crypto from 'crypto';
import { normalizeSourceUrl } from './normalizeSourceUrl.js';

export function hashUrl(url) {
  const normalized = normalizeSourceUrl(url);
  return crypto.createHash('md5').update(normalized || String(url || '').trim()).digest('hex');
}
