import { fallbackHeroUrl } from './heroImage';
import { isPollinationsUrl } from './pollinationsImage';

function isTrustedHeroUrl(url) {
  if (!url) return false;
  if (url.startsWith('/uploads/heroes/')) return true;
  if (url.startsWith('data:')) return true;
  if (isPollinationsUrl(url)) return true;
  if (/cloudinary\.com|images\.unsplash\.com/i.test(url)) return true;
  return false;
}

/** Prefer AI featured image; ignore hotlinked publisher URLs as display hero. */
export function getArticleFeaturedImage(article) {
  const featured = article?.featuredImage?.trim();
  if (featured) return featured;
  const hero = article?.heroImage?.url?.trim();
  if (hero && isTrustedHeroUrl(hero)) return hero;
  return null;
}

export function getArticleImageAlt(article) {
  return article?.heroImage?.alt || article?.title || 'News article';
}

export function resolveArticleImageSrc(article, category) {
  const url = getArticleFeaturedImage(article);
  if (!url) return fallbackHeroUrl(category);
  if (url.startsWith('data:')) return url;
  return url;
}
