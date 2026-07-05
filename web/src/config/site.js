export const SITE_NAME = 'The Daily Lens';
export const SITE_TAGLINE =
  'Breaking news, analysis, and forecasts — clear reporting you can trust.';
export const DEFAULT_OG_IMAGE = '/logo.png';

/** Add social profile URLs here for Organization schema sameAs. */
export const SOCIAL_LINKS = [
  process.env.NEXT_PUBLIC_SOCIAL_X,
  process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK,
  process.env.NEXT_PUBLIC_SOCIAL_LINKEDIN,
].filter(Boolean);

export function getSiteOrigin() {
  if (typeof window !== 'undefined') return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://thedailylens.space';
}

export function absoluteUrl(path = '/') {
  const base = getSiteOrigin().replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/** Self-referencing canonical URL for metadata alternates. */
export function canonicalUrl(path = '/') {
  return absoluteUrl(path);
}
