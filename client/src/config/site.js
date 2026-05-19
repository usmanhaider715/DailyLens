export const SITE_NAME = 'The Daily Lens';
export const SITE_TAGLINE =
  'Breaking news, analysis, and forecasts — world-class journalism powered by AI editorial tools.';
export const DEFAULT_OG_IMAGE = '/favicon.svg';

export function getSiteOrigin() {
  if (typeof window !== 'undefined') return window.location.origin;
  return import.meta.env.VITE_SITE_URL || 'https://dailylens.com';
}

export function absoluteUrl(path = '/') {
  const base = getSiteOrigin().replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}
