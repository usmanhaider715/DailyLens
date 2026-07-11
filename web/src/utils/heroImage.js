const DEFAULT_HERO =
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=630&fit=crop&q=80&auto=format';

export function fallbackHeroUrl() {
  return DEFAULT_HERO;
}

const DIRECT_HOSTS = ['images.unsplash.com', 'plus.unsplash.com', 'res.cloudinary.com'];

function parseUrl(url) {
  try {
    return new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
  } catch {
    return null;
  }
}

function needsProxy(url) {
  if (!url) return false;
  if (url.startsWith('/uploads/') || url.startsWith('/api/')) return false;
  const u = parseUrl(url);
  if (!u) return false;
  if (typeof window !== 'undefined' && u.origin === window.location.origin) return false;
  if (DIRECT_HOSTS.some((h) => u.hostname.includes(h))) return false;
  return u.protocol === 'http:' || u.protocol === 'https:';
}

/** Resolve hero URL for <img src> — local paths direct; never proxy publisher images. */
export function resolveHeroSrc(url, category) {
  const trimmed = (url || '').trim();
  if (!trimmed) return fallbackHeroUrl(category);
  if (trimmed.startsWith('data:')) return trimmed;
  if (trimmed.startsWith('/uploads/')) return trimmed;

  if (typeof window !== 'undefined') {
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return trimmed;
  }

  if (needsProxy(trimmed)) {
    return `/api/images/proxy?url=${encodeURIComponent(trimmed)}`;
  }
  return trimmed;
}

/** Preload hero image; resolves true when loaded, false on error/timeout. */
export function preloadHeroImage(url, category, timeoutMs = 12000) {
  return new Promise((resolve) => {
    const src = resolveHeroSrc(url, category);
    if (!src) {
      resolve(false);
      return;
    }
    const img = new Image();
    let done = false;
    const finish = (ok) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.referrerPolicy = 'no-referrer';
    img.src = src;
  });
}
