const DEFAULT_HERO =
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=630&fit=crop&q=80&auto=format';

export function fallbackHeroUrl() {
  return DEFAULT_HERO;
}

function needsProxy(url) {
  if (!url) return false;
  try {
    const u = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    if (typeof window !== 'undefined') {
      return u.origin !== window.location.origin && !u.hostname.includes('cloudinary.com');
    }
    return !u.hostname.includes('cloudinary.com');
  } catch {
    return false;
  }
}

/** Resolve hero URL for <img src> — proxies hotlinked publisher images through our API. */
export function resolveHeroSrc(url, category) {
  const trimmed = (url || '').trim();
  if (!trimmed) return fallbackHeroUrl(category);
  if (trimmed.startsWith('data:')) return trimmed;
  if (needsProxy(trimmed)) {
    return `/api/images/proxy?url=${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}
