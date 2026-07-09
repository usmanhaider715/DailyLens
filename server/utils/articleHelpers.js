import { Article } from '../models/Article.js';
import { slugify } from './slugify.js';
import { hashUrl } from './hashUrl.js';
import { stripHtml } from './stripHtml.js';
import { parseReadTimeMinutes } from './seoArticleNormalize.js';
import { normalizeHeroImage, isUploadedHeroUrl } from './heroImageUtils.js';
import { deleteHeroUploadFile, extractUploadFilename } from './heroFileUpload.js';
import { resolveFeaturedImageUrl } from './imageGenerator.js';
import { persistFeaturedImageIfRemote } from './persistHeroImage.js';
import { isSourceNewsHero, isAdminHeroOverride } from './heroPriority.js';

export async function ensureUniqueSlug(base) {
  let slug = base || 'article';
  let n = 0;
  while (await Article.exists({ slug })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

export function estimateReadTime(body) {
  const words = String(body || '').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function buildArticlePayload(input, existing = null) {
  const title = input.title?.trim();
  const body = input.body?.trim();
  const summary = stripHtml(input.summary?.trim() || body?.slice(0, 280) || title);

  if (!title || !body) {
    const err = new Error('Title and body are required');
    err.status = 400;
    throw err;
  }

  const slugBase = slugify(input.slug || title);
  const forecast = input.forecast || {};
  const showForecast = !!forecast.enabled;

  const incomingFeatured = input.featuredImage?.trim() || '';
  const incomingHeroUrl = input.heroImage?.url?.trim() || '';
  const heroSource = input.heroImage?.source || '';
  const userPickedHero =
    incomingHeroUrl &&
    (heroSource === 'search' || heroSource === 'upload' || heroSource === 'manual' || heroSource === 'ai');

  let featuredImage = incomingFeatured;
  if (userPickedHero && incomingHeroUrl) {
    featuredImage = incomingHeroUrl;
  } else if (!featuredImage && incomingHeroUrl && !isSourceNewsHero({ url: incomingHeroUrl, source: heroSource })) {
    featuredImage = incomingHeroUrl;
  } else if (!featuredImage && existing?.featuredImage) {
    featuredImage = existing.featuredImage;
  }

  const payload = {
    title,
    summary,
    body,
    category: input.category || 'World',
    tags: Array.isArray(input.tags) ? input.tags : [],
    author: input.author || 'The Daily Lens Desk',
    heroImage: normalizeHeroImage(
      input.heroImage?.url
        ? {
            url: input.heroImage.url,
            alt: input.heroImage.alt || title,
            credit: input.heroImage.credit || '',
            creditUrl: input.heroImage.creditUrl || '',
            source: input.heroImage.source || (isUploadedHeroUrl(input.heroImage.url) ? 'upload' : 'original'),
            uploadFilename:
              input.heroImage.uploadFilename ||
              extractUploadFilename(input.heroImage.url) ||
              '',
          }
        : existing?.heroImage,
      input.category || existing?.category || 'World'
    ),
    seoScore: input.seoScore ?? existing?.seoScore ?? 7,
    readTime: parseReadTimeMinutes(input.readTime, body),
    featuredImage: featuredImage || undefined,
    isBreaking: !!input.isBreaking,
    isFeatured: !!input.isFeatured,
    isPublished: input.isPublished !== false,
    isPaused: input.isPaused !== undefined ? !!input.isPaused : !!existing?.isPaused,
    publishedAt: input.publishedAt ? new Date(input.publishedAt) : existing?.publishedAt || new Date(),
    sourceType: 'manual',
    forecast: {
      enabled: showForecast,
      headline: showForecast ? forecast.headline || '' : '',
      body: showForecast ? forecast.body || '' : '',
      confidence: forecast.confidence || 'Medium',
    },
  };

  if (!existing) {
    payload.slug = slugBase;
    const sourceUrl = String(input.originalUrl || '').trim();
    if (sourceUrl && /^https?:\/\//i.test(sourceUrl)) {
      payload.originalUrl = sourceUrl;
      payload.urlHash = input.urlHash || hashUrl(sourceUrl);
      payload.originalTitle = input.originalTitle?.trim() || title;
      payload.source = input.source?.name
        ? {
            name: input.source.name,
            url: input.source.url || sourceUrl,
          }
        : { name: 'News source', url: sourceUrl };
      payload.sourceType = 'automated';
      payload.aiProcessedAt = input.aiProcessedAt || new Date();
    } else {
      const manualUrl = `manual://${slugBase}-${Date.now()}`;
      payload.originalUrl = manualUrl;
      payload.urlHash = hashUrl(manualUrl);
      payload.originalTitle = title;
      payload.source = { name: 'The Daily Lens', url: '' };
    }
  }

  return payload;
}

/** Ensure featured hero follows priority: source news → AI → URL. Never overwrite source heroImage. */
export async function ensureFeaturedImage(payload, slugHint = '') {
  if (!payload.title?.trim()) return payload;
  const hint = slugHint || payload.slug || payload.title;
  const heroSource = payload.heroImage?.source || '';

  if (isSourceNewsHero(payload.heroImage) && !isAdminHeroOverride(heroSource)) {
    return payload;
  }

  if (isAdminHeroOverride(heroSource)) {
    const url = payload.featuredImage?.trim() || payload.heroImage?.url?.trim();
    if (url) {
      payload.featuredImage = await persistFeaturedImageIfRemote(url, hint);
      if (payload.heroImage) {
        payload.heroImage = { ...payload.heroImage, url: payload.featuredImage };
      }
    }
    return payload;
  }

  if (!payload.featuredImage?.trim()) {
    payload.featuredImage = await resolveFeaturedImageUrl(payload.title, payload.category || 'World', hint);
    return payload;
  }

  payload.featuredImage = await persistFeaturedImageIfRemote(payload.featuredImage, hint);
  return payload;
}
