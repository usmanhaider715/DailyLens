import { fallbackHeroUrl } from './heroImage';
import { isPollinationsUrl } from './pollinationsImage';

const ADMIN_OVERRIDE_SOURCES = new Set(['upload', 'search', 'manual', 'ai']);

function isUsableHeroUrl(url) {
  if (!url) return false;
  const raw = url.trim().toLowerCase();
  if (raw.startsWith('/uploads/heroes/') || raw.startsWith('data:')) return true;
  if (isPollinationsUrl(url)) return true;
  if (/cloudinary\.com|images\.unsplash\.com/i.test(url)) return true;
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    const blocked = ['googleusercontent.com', 'gstatic.com', 'news.google.com', 'favicon', '/logo'];
    return !blocked.some((b) => raw.includes(b));
  } catch {
    return false;
  }
}

/** Hero from the original news source (RSS / publisher), not admin-picked or AI. */
export function isSourceNewsHero(hero) {
  const url = hero?.url?.trim();
  if (!url || !isUsableHeroUrl(url)) return false;
  const source = String(hero?.source || '').toLowerCase();
  if (!source || source === 'placeholder') return false;
  if (ADMIN_OVERRIDE_SOURCES.has(source)) return false;
  return source === 'original' || source === 'rss' || source === 'feed';
}

export function isAdminHeroOverride(source) {
  return ADMIN_OVERRIDE_SOURCES.has(String(source || '').toLowerCase());
}

/**
 * Resolve the hero URL shown on the site.
 * Priority: source news → AI → URL fallback. Admin picks override all.
 */
export function resolveArticleDisplayHero(article) {
  const hero = article?.heroImage;
  const heroUrl = hero?.url?.trim() || article?.heroImageUrl?.trim() || '';
  const heroSource = hero?.source || article?.heroImageSource || '';
  const featured = article?.featuredImage?.trim() || '';

  if (isAdminHeroOverride(heroSource)) {
    return featured || heroUrl || null;
  }

  if (isSourceNewsHero(hero || { url: heroUrl, source: heroSource })) {
    return heroUrl;
  }

  if (featured) {
    return featured;
  }

  if (heroUrl && heroSource === 'generated') {
    return heroUrl;
  }

  if (heroUrl && heroSource !== 'placeholder') {
    return heroUrl;
  }

  return null;
}

/** @deprecated use resolveArticleDisplayHero */
export function getArticleFeaturedImage(article) {
  return resolveArticleDisplayHero(article);
}

export function getArticleImageAlt(article) {
  return article?.heroImage?.alt || article?.heroImageAlt || article?.title || 'News article';
}

export function resolveArticleImageSrc(article, category) {
  const url = resolveArticleDisplayHero(article);
  if (!url) return fallbackHeroUrl(category);
  if (url.startsWith('data:')) return url;
  return url;
}
