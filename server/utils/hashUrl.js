import crypto from 'crypto';

export function hashUrl(url) {
  return crypto.createHash('md5').update(url.trim()).digest('hex');
}
