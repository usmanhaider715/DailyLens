import { isUsableImageUrl } from './heroImageUtils.js';

const ADMIN_OVERRIDE_SOURCES = new Set(['upload', 'search', 'manual', 'ai']);

/** Hero from RSS / publisher / OG discovery — not admin-picked or AI. */
export function isSourceNewsHero(hero) {
  const url = hero?.url?.trim();
  if (!url || !isUsableImageUrl(url)) return false;
  const source = String(hero?.source || '').toLowerCase();
  if (!source || source === 'placeholder') return false;
  if (ADMIN_OVERRIDE_SOURCES.has(source)) return false;
  return source === 'original' || source === 'rss' || source === 'feed';
}

export function isAdminHeroOverride(source) {
  return ADMIN_OVERRIDE_SOURCES.has(String(source || '').toLowerCase());
}

/**
 * Display priority: source news → AI featuredImage → URL / other hero fallback.
 * Admin picks (upload, search, manual, ai) always win.
 */
export function resolveArticleDisplayHero(article) {
  const hero = article?.heroImage;
  const heroUrl = hero?.url?.trim() || '';
  const heroSource = hero?.source || '';
  const featured = article?.featuredImage?.trim() || '';

  if (isAdminHeroOverride(heroSource)) {
    return featured || heroUrl || null;
  }

  if (featured) {
    return featured;
  }

  if (heroUrl && heroSource === 'generated') {
    return heroUrl;
  }

  const licensedSources = new Set(['unsplash', 'pexels', 'wikimedia', 'ai_generated', 'ai', 'upload', 'search', 'manual']);
  if (heroUrl && licensedSources.has(String(heroSource).toLowerCase())) {
    return heroUrl;
  }

  return null;
}
