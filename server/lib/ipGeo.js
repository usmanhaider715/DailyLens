import axios from 'axios';
import { logger } from '../utils/logger.js';

export function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    const first = String(forwarded).split(',')[0].trim();
    if (first) return first;
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

export async function lookupIpLocation(ip) {
  const clean = String(ip || '').trim();
  if (!clean || clean === 'unknown' || clean === '::1' || clean.startsWith('127.')) {
    return 'Local / private network';
  }

  try {
    const { data } = await axios.get(`http://ip-api.com/json/${encodeURIComponent(clean)}`, {
      params: { fields: 'status,country,regionName,city,isp' },
      timeout: 5000,
    });
    if (data?.status !== 'success') return 'Location lookup unavailable';
    const parts = [data.city, data.regionName, data.country].filter(Boolean);
    const loc = parts.join(', ') || 'Unknown';
    return data.isp ? `${loc} (${data.isp})` : loc;
  } catch (err) {
    logger.warn('IP geo lookup failed', err.message);
    return 'Location lookup failed';
  }
}
