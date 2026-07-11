import axios from 'axios';
import { searchFreeImagesForQuery } from './imageDiscoveryService.js';
import { resolveFeaturedImageUrl } from '../utils/imageGenerator.js';
import { isUsableImageUrl, isRejectedHeroImageUrl } from '../utils/heroImageUtils.js';
import { logger } from '../utils/logger.js';

async function searchUnsplash(query) {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;

  try {
    const { data } = await axios.get('https://api.unsplash.com/search/photos', {
      params: { query, per_page: 1, orientation: 'landscape' },
      headers: { Authorization: `Client-ID ${key}` },
      timeout: 12000,
    });
    const photo = data?.results?.[0];
    if (!photo?.urls?.regular) return null;
    return {
      url: photo.urls.regular,
      credit: photo.user?.name ? `${photo.user.name} / Unsplash` : 'Unsplash',
      creditUrl: photo.links?.html || 'https://unsplash.com/license',
      source: 'unsplash',
      license: 'Unsplash License',
    };
  } catch (err) {
    logger.warn('Unsplash search failed', err.message);
    return null;
  }
}

async function searchPexels(query) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;

  try {
    const { data } = await axios.get('https://api.pexels.com/v1/search', {
      params: { query, per_page: 1, orientation: 'landscape' },
      headers: { Authorization: key },
      timeout: 12000,
    });
    const photo = data?.photos?.[0];
    if (!photo?.src?.large) return null;
    return {
      url: photo.src.large,
      credit: photo.photographer ? `${photo.photographer} / Pexels` : 'Pexels',
      creditUrl: photo.url || 'https://www.pexels.com/license/',
      source: 'pexels',
      license: 'Pexels License',
    };
  } catch (err) {
    logger.warn('Pexels search failed', err.message);
    return null;
  }
}

async function searchWikimedia(query) {
  const list = await searchFreeImagesForQuery(query, { limit: 1 });
  const hit = list.find((item) => item.source === 'wikimedia') || list[0];
  if (!hit?.url) return null;
  return {
    url: hit.url,
    credit: hit.credit || 'Wikimedia Commons',
    creditUrl: hit.creditUrl || 'https://commons.wikimedia.org/',
    source: 'wikimedia',
    license: hit.license || 'Creative Commons',
  };
}

/**
 * Resolve a licensed hero image — never hotlink publisher-hosted photos.
 * Priority: Unsplash → Pexels → Wikimedia → AI-generated (Pollinations).
 */
export async function resolveLicensedHeroImage({ title, category, keywords = [] }) {
  const query = [title, ...(Array.isArray(keywords) ? keywords : []), category, 'news']
    .filter(Boolean)
    .join(' ')
    .slice(0, 120);

  for (const search of [searchUnsplash, searchPexels, searchWikimedia]) {
    const hit = await search(query);
    if (hit?.url && isUsableImageUrl(hit.url) && !isRejectedHeroImageUrl(hit.url)) {
      return hit;
    }
  }

  try {
    const aiUrl = await resolveFeaturedImageUrl(title, category);
    return {
      url: aiUrl,
      credit: 'AI-generated image (Pollinations.ai)',
      creditUrl: 'https://pollinations.ai/',
      source: 'ai_generated',
      license: 'AI-generated',
    };
  } catch (err) {
    logger.warn('AI image fallback failed', err.message);
    return {
      url: '',
      credit: '',
      creditUrl: '',
      source: 'ai_generated',
      license: 'AI-generated',
    };
  }
}

/** True when URL appears hosted on a news publisher domain (not licensed stock). */
export function isPublisherHostedImageUrl(url, publisherDomains = []) {
  if (!url || !/^https?:\/\//i.test(url)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    const blockedPatterns = [
      'wp-content',
      'wp.com',
      'getty',
      'shutterstock',
      'techcrunch.com',
      'theverge.com',
      'bbc.co.uk',
      'bbc.com',
      'cnn.com',
      'nytimes.com',
      'reuters.com',
      'apnews.com',
      'espn.com',
      'ign.com',
      'polygon.com',
    ];
    if (blockedPatterns.some((p) => host.includes(p) || url.toLowerCase().includes(p))) return true;
    for (const domain of publisherDomains) {
      if (domain && host.includes(String(domain).toLowerCase())) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function buildImageAttribution(hero) {
  if (!hero?.credit) return '';
  if (hero.creditUrl) return `${hero.credit} — ${hero.creditUrl}`;
  return hero.credit;
}
