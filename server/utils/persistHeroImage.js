import axios from 'axios';
import { saveCompressedHeroFile, heroUploadPublicUrl } from './heroFileUpload.js';
import { logger } from './logger.js';

const USER_AGENT =
  'Mozilla/5.0 (compatible; DailyLens/1.0; +https://thedailylens.space) AppleWebKit/537.36';

export function isLocalHeroUrl(url) {
  return String(url || '').trim().startsWith('/uploads/heroes/');
}

/** Download a remote hero image, compress to WebP, store under /uploads/heroes. */
export async function persistHeroImageFromUrl(url, { slugHint = 'hero', timeoutMs = 90000 } = {}) {
  const trimmed = String(url || '').trim();
  if (!trimmed) return null;
  if (isLocalHeroUrl(trimmed)) return trimmed;

  const { data } = await axios.get(trimmed, {
    responseType: 'arraybuffer',
    timeout: timeoutMs,
    maxRedirects: 5,
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
    },
    validateStatus: (s) => s >= 200 && s < 400,
  });

  if (!data?.byteLength) {
    throw new Error('Empty image response');
  }

  const { filename } = await saveCompressedHeroFile(Buffer.from(data), { slugHint });
  return heroUploadPublicUrl(filename);
}

/** Save featured image locally when it is still a remote URL. */
export async function persistFeaturedImageIfRemote(featuredImage, slugHint = 'hero') {
  const trimmed = String(featuredImage || '').trim();
  if (!trimmed || isLocalHeroUrl(trimmed)) return trimmed;
  try {
    return await persistHeroImageFromUrl(trimmed, { slugHint });
  } catch (err) {
    logger.warn('Could not persist hero image locally — keeping remote URL', {
      slugHint,
      error: err?.message,
    });
    return trimmed;
  }
}
