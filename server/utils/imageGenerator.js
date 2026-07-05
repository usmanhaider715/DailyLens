import { generateArticleImage as buildPollinationsUrl } from './pollinationsUrl.js';
import { persistHeroImageFromUrl } from './persistHeroImage.js';
import { logger } from './logger.js';

export { buildPollinationsUrl as generateArticleImage };

export const DEFAULT_FEATURED_PLACEHOLDER =
  'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=1200&h=630&fit=crop&q=80&auto=format';

/**
 * Generate an AI hero and save it locally so the site loads instantly.
 */
export async function resolveFeaturedImageUrl(title, category, slugHint = '') {
  const remoteUrl = buildPollinationsUrl(title, category);
  const hint = slugHint || title || 'hero';
  try {
    return await persistHeroImageFromUrl(remoteUrl, { slugHint: hint, timeoutMs: 90000 });
  } catch (err) {
    logger.warn('AI hero persist failed — using Unsplash placeholder', {
      title: String(title || '').slice(0, 60),
      error: err?.message,
    });
    try {
      return await persistHeroImageFromUrl(DEFAULT_FEATURED_PLACEHOLDER, {
        slugHint: hint,
        timeoutMs: 20000,
      });
    } catch {
      return DEFAULT_FEATURED_PLACEHOLDER;
    }
  }
}
