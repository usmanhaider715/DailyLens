import axios from 'axios';

function isUsableImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) return false;
    return !u.hostname.includes('google.com/logos') && !u.pathname.endsWith('.svg');
  } catch {
    return false;
  }
}

async function fetchOgImage(pageUrl) {
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
      if (m?.[1] && isUsableImageUrl(m[1])) return m[1].trim();
    }
  } catch {
    /* skip */
  }
  return null;
}

async function searchGoogleImage(query) {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cx = process.env.GOOGLE_CSE_ID || process.env.GOOGLE_CSE_CX;
  if (!apiKey || !cx) return null;

  try {
    const { data } = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: apiKey,
        cx,
        q: query,
        searchType: 'image',
        num: 5,
        safe: 'active',
        imgSize: 'large',
      },
      timeout: 12000,
    });

    for (const item of data.items || []) {
      const link = item.link || item.image?.thumbnailLink;
      if (isUsableImageUrl(link)) {
        return {
          url: link,
          credit: item.displayLink || item.image?.contextLink || 'Google Images',
          creditUrl: item.image?.contextLink || item.link,
          viaGoogle: true,
        };
      }
    }
  } catch {
    /* skip */
  }
  return null;
}

/**
 * Resolve a hero image from the story source, page metadata, or Google Image Search.
 */
export async function resolveHeroImage({ title, imageUrl, url, sourceName, sourceUrl }) {
  const publisher = sourceName || 'Original publisher';
  const storyLink = sourceUrl || url || '';

  if (isUsableImageUrl(imageUrl)) {
    return {
      url: imageUrl,
      alt: title || 'News image',
      credit: publisher,
      creditUrl: storyLink,
      source: 'original',
      viaGoogle: false,
    };
  }

  const og = await fetchOgImage(url);
  if (og) {
    return {
      url: og,
      alt: title || 'News image',
      credit: publisher,
      creditUrl: storyLink,
      source: 'original',
      viaGoogle: false,
    };
  }

  const google = await searchGoogleImage(`${title} ${publisher} news`);
  if (google) {
    return {
      url: google.url,
      alt: title || 'News image',
      credit: google.credit,
      creditUrl: google.creditUrl || storyLink,
      source: 'original',
      viaGoogle: true,
    };
  }

  return null;
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

export function buildHeroCaption(hero) {
  if (!hero?.url) return '';
  if (hero.viaGoogle) {
    return `Image: ${hero.credit} (via Google Images)`;
  }
  return `Image: ${hero.credit}`;
}
