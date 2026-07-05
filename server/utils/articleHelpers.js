import { Article } from '../models/Article.js';
import { slugify } from './slugify.js';
import { hashUrl } from './hashUrl.js';
import { stripHtml } from './stripHtml.js';
import { normalizeHeroImage, isUploadedHeroUrl } from './heroImageUtils.js';
import { deleteHeroUploadFile, extractUploadFilename } from './heroFileUpload.js';
import { resolveFeaturedImageUrl } from './imageGenerator.js';

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
    readTime: input.readTime ?? estimateReadTime(body),
    featuredImage: input.featuredImage?.trim() || existing?.featuredImage || undefined,
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

/** Ensure every article has an AI featured hero for the public site. */
export async function ensureFeaturedImage(payload) {
  if (payload.featuredImage?.trim()) return payload;
  if (!payload.title?.trim()) return payload;
  payload.featuredImage = await resolveFeaturedImageUrl(payload.title, payload.category || 'World');
  return payload;
}
