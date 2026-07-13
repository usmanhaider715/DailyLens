import axios from 'axios';
import { isUsableImageUrl, isRejectedHeroImageUrl, unsplashHeroUrl } from '../utils/heroImageUtils.js';
import { resolveLicensedHeroImage, buildImageAttribution } from './licensedImageService.js';

export async function fetchOgImage(pageUrl) {
  try {
    const { data: html } = await axios.get(pageUrl, {
      timeout: 12000,
      headers: { 'User-Agent': 'DailyLensBot/1.0' },
      maxRedirects: 5,
      validateStatus: (s) => s < 400,
    });
    const str = String(html);
    const patterns = [
      /<meta[^>]+property=["']og:image(?::secure_url)?["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::secure_url)?["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    ];
    for (const re of patterns) {
      const m = str.match(re);
      if (m?.[1] && isUsableImageUrl(m[1]) && !isRejectedHeroImageUrl(m[1])) return m[1].trim();
    }
  } catch {
    /* skip */
  }
  return null;
}

async function searchGoogleImageList(query, { freeUseOnly = true, limit = 6 } = {}) {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID || process.env.GOOGLE_CSE_CX;
  if (!apiKey || !cx) return [];

  try {
    const params = {
      key: apiKey,
      cx,
      q: `${query} -logo -icon -avatar -screenshot`,
      searchType: 'image',
      num: Math.min(limit, 10),
      safe: 'active',
      imgSize: 'large',
      imgType: 'photo',
    };
    if (freeUseOnly) {
      params.rights =
        'cc_publicdomain|cc_attribute|cc_sharealike|cc_noncommercial|cc_nonderived';
    }

    const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params,
      timeout: 12000,
    });

    const out = [];
    for (const item of data.items || []) {
      const link = item.link || item.image?.thumbnailLink;
      const display = String(item.displayLink || '').toLowerCase();
      if (display.includes('google.com') || display.includes('gstatic.com')) continue;
      if (!isUsableImageUrl(link) || isRejectedHeroImageUrl(link)) continue;
      out.push({
        url: link,
        credit: item.displayLink || 'Google Images (CC / free use)',
        creditUrl: item.image?.contextLink || item.link,
        viaGoogle: true,
        license: freeUseOnly ? 'creative_commons' : null,
        source: 'google_images',
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function searchGoogleImage(query, { freeUseOnly = true } = {}) {
  const list = await searchGoogleImageList(query, { freeUseOnly, limit: 1 });
  return list[0] || null;
}

async function searchWikimediaCommonsList(query, limit = 6) {
  try {
    const { data } = await axios.get('https://commons.wikimedia.org/w/api.php', {
      params: {
        action: 'query',
        format: 'json',
        generator: 'search',
        gsrsearch: `${query} news`,
        gsrlimit: limit,
        prop: 'imageinfo',
        iiprop: 'url|extmetadata',
        iiurlwidth: 1200,
        origin: '*',
      },
      timeout: 12000,
    });

    const pages = data?.query?.pages;
    if (!pages) return [];

    const out = [];
    for (const page of Object.values(pages)) {
      const info = page.imageinfo?.[0];
      const imageUrl = info?.thumburl || info?.url;
      if (!isUsableImageUrl(imageUrl)) continue;

      const license =
        info?.extmetadata?.LicenseShortName?.value ||
        info?.extmetadata?.UsageTerms?.value ||
        'Wikimedia Commons';
      const artist = info?.extmetadata?.Artist?.value?.replace(/<[^>]+>/g, '') || 'Wikimedia Commons';

      out.push({
        url: imageUrl,
        credit: artist,
        creditUrl: `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title || '')}`,
        viaGoogle: false,
        license: stripHtml(license),
        source: 'wikimedia',
      });
    }
    return out;
  } catch {
    return [];
  }
}

/** Search Wikimedia + Google Images (CC / free-use filter). */
export async function searchFreeImagesForQuery(query, { limit = 3 } = {}) {
  const q = String(query || '').trim();
  if (!q) return [];

  const wiki = await searchWikimediaCommonsList(q, limit);
  if (wiki.length >= limit) return wiki.slice(0, limit);

  const google = await searchGoogleImageList(q, { freeUseOnly: true, limit: limit - wiki.length });
  return [...wiki, ...google].slice(0, limit);
}

/** Wikimedia Commons — free-to-use images for news heroes. */
async function searchWikimediaCommons(query) {
  const list = await searchWikimediaCommonsList(query, 1);
  return list[0] || null;
}

function stripHtml(s) {
  return String(s || '').replace(/<[^>]+>/g, '').trim();
}

/**
 * Resolve a licensed hero image — never hotlink publisher-hosted photos.
 */
export async function resolveHeroImage({ title, category, primaryKeyword, tags = [] }) {
  const licensed = await resolveLicensedHeroImage({
    title,
    category,
    keywords: [primaryKeyword, ...(Array.isArray(tags) ? tags : [])].filter(Boolean),
  });

  return {
    url: licensed.url,
    alt: title || 'News image',
    credit: licensed.credit,
    creditUrl: licensed.creditUrl,
    source: licensed.source,
    license: licensed.license,
    imageAttribution: buildImageAttribution(licensed),
  };
}

export function appendImageCreditToBody(body, hero) {
  if (!hero?.url) return body;
  if (/##\s*Image credit/i.test(body || '')) return body;

  const creditLine = hero.viaGoogle
    ? `Image located via Google Images; rights belong to [${hero.credit}](${hero.creditUrl}). Used for news reporting purposes.`
    : `Image courtesy of [${hero.credit}](${hero.creditUrl}). Used for news reporting purposes; all rights remain with the original publisher.`;

  const block = `

## Image credit

${creditLine}`;

  return `${(body || '').trim()}${block}`;
}

const UNSPLASH_BY_CATEGORY = {
  Technology: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&h=630&fit=crop&q=80',
  Business: 'https://images.unsplash.com/photo-1611974789855-9c8a298e8f05?w=1200&h=630&fit=crop&q=80',
  Sports: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=1200&h=630&fit=crop&q=80',
  Health: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&h=630&fit=crop&q=80',
  Politics: 'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=1200&h=630&fit=crop&q=80',
  Crypto: 'https://images.unsplash.com/photo-1621761191319-c9fb62084057?w=1200&h=630&fit=crop&q=80',
  Weather: 'https://images.unsplash.com/photo-1504608524841-42fe6f008b4b?w=1200&h=630&fit=crop&q=80',
  Science: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=1200&h=630&fit=crop&q=80',
  Entertainment: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&h=630&fit=crop&q=80',
};

function unsplashAlternatives(category) {
  const urls = [
    UNSPLASH_BY_CATEGORY[category],
    unsplashHeroUrl(category),
    'https://images.unsplash.com/photo-1495020689066-41b99a22d0f8?w=1200&h=630&fit=crop&q=80',
    'https://images.unsplash.com/photo-1586339949916-3e9457bef6d3?w=1200&h=630&fit=crop&q=80',
  ].filter(Boolean);
  return urls.map((url) => ({
    url,
    credit: 'Unsplash (free to use)',
    creditUrl: 'https://unsplash.com/license',
    viaGoogle: false,
    license: 'Unsplash License',
    source: 'unsplash',
  }));
}

/** Return multiple free-use hero options for admin picker. */
export async function searchHeroImageCandidates({
  title = '',
  category = 'World',
  excludeUrl = '',
  query = '',
  limit = 8,
} = {}) {
  const searchQuery = (query || [title, category, 'news photo'].filter(Boolean).join(' '))
    .trim()
    .slice(0, 120);
  const seen = new Set();
  if (excludeUrl) seen.add(excludeUrl.trim());
  const results = [];

  const push = (item) => {
    if (!item?.url || seen.has(item.url)) return;
    seen.add(item.url);
    results.push({
      url: item.url,
      credit: item.credit || '',
      creditUrl: item.creditUrl || '',
      alt: title || 'News image',
      viaGoogle: !!item.viaGoogle,
      license: item.license || null,
      source: item.source || 'unknown',
    });
  };

  for (const item of await searchWikimediaCommonsList(searchQuery, 6)) {
    push(item);
    if (results.length >= limit) return results;
  }

  for (const item of await searchGoogleImageList(searchQuery, { freeUseOnly: true, limit: 6 })) {
    push(item);
    if (results.length >= limit) return results;
  }

  for (const item of unsplashAlternatives(category)) {
    push(item);
    if (results.length >= limit) return results;
  }

  return results.slice(0, limit);
}

export function buildHeroCaption(hero) {
  if (!hero?.url) return '';
  if (hero.viaGoogle) {
    return `Image: ${hero.credit} (via Google Images)`;
  }
  return `Image: ${hero.credit}`;
}
