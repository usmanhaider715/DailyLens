export const SITE_NAME = 'The Daily Lens';
export const SITE_TAGLINE =
  'Breaking news, analysis, and forecasts — clear reporting you can trust.';
export const DEFAULT_OG_IMAGE = '/logo.png';

export function getSiteOrigin() {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL || 'https://dailylens.com';
}

export function absoluteUrl(path = '/') {
  const base = getSiteOrigin().replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
