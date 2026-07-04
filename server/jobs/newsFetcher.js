import cron from 'node-cron';
import { Article } from '../models/Article.js';
import { Category } from '../models/Category.js';
import { getSiteSettings } from '../models/SiteSettings.js';
import { fetchAllNews, extractArticleFromUrl } from '../services/newsService.js';
import { processArticle, processBatch } from '../services/aiService.js';
import { generateSeoArticle } from '../services/groqService.js';
import { generateAndUploadImage } from '../services/imageService.js';
import { slugify } from '../utils/slugify.js';
import { emitBreakingNews } from '../services/socketService.js';
import { logger } from '../utils/logger.js';
import { updateTrendingCache } from './trendingUpdater.js';
import { invalidateArticleCaches } from '../controllers/articleController.js';
import { normalizeHeroImage } from '../utils/heroImageUtils.js';

async function ensureUniqueSlug(base) {
  let slug = base || 'article';
  let n = 0;
  while (await Article.exists({ slug })) {
    n += 1;
    slug = `${base}-${n}`;
  }
  return slug;
}

async function bumpCategoryCount(categoryName) {
  await Category.updateOne({ name: categoryName }, { $inc: { articleCount: 1 } });
}

async function saveFromAi(raw, parsed, heroImage, published) {
  const baseSlug = slugify(parsed.headline);
  const slug = await ensureUniqueSlug(baseSlug);
  const doc = await Article.create({
    title: parsed.headline,
    slug,
    originalTitle: raw.title,
    originalUrl: raw.url,
    urlHash: raw.urlHash,
    summary: parsed.summary,
    body: parsed.body,
    category: parsed.category,
    tags: parsed.tags || [],
    heroImage,
    author: 'AI Editorial Team',
    source: { name: raw.sourceName, url: raw.sourceUrl },
    seoScore: parsed.seoScore,
    readTime: parsed.readTime,
    isBreaking: !!parsed.isBreaking,
    isFeatured: false,
    isPublished: published,
    publishedAt: raw.publishedAt || new Date(),
    aiProcessedAt: new Date(),
  });
  await bumpCategoryCount(parsed.category);
  return doc;
}

async function saveFailed(raw, errMsg) {
  const slug = await ensureUniqueSlug(slugify(raw.title));
  const doc = await Article.create({
    title: raw.title,
    slug,
    originalTitle: raw.title,
    originalUrl: raw.url,
    urlHash: raw.urlHash,
    summary: raw.description?.slice(0, 500) || raw.title,
    body: raw.content || raw.description || raw.title,
    category: raw.suggestedCategory || 'World',
    tags: [],
    heroImage: normalizeHeroImage(
      raw.imageUrl ? { url: raw.imageUrl, alt: raw.title, source: 'original' } : null,
      raw.suggestedCategory || 'World'
    ),
    source: { name: raw.sourceName, url: raw.sourceUrl },
    isPublished: false,
    publishedAt: raw.publishedAt || new Date(),
  });
  logger.warn('Saved unpublished article after AI failure', String(doc._id), errMsg);
  return doc;
}

async function persistProcessed(raw, parsed) {
  const settings = await getSiteSettings();
  const baseSlug = slugify(parsed.headline);
  const slug = await ensureUniqueSlug(baseSlug);
  const useDallE = settings.generateAiImages !== false;
  let heroImage;
  if (useDallE && process.env.OPENAI_API_KEY) {
    heroImage = await generateAndUploadImage(parsed.imagePrompt, slug, {
      originalImageUrl: raw.imageUrl,
      category: parsed.category,
    });
  } else {
    heroImage = await generateAndUploadImage(null, slug, {
      originalImageUrl: raw.imageUrl,
      category: parsed.category,
    });
  }

  const doc = await saveFromAi(raw, parsed, heroImage, true);

  if (parsed.isBreaking) {
    emitBreakingNews({
      id: doc._id.toString(),
      headline: doc.title,
      slug: doc.slug,
      category: doc.category,
      publishedAt: doc.publishedAt,
    });
  }
  return doc;
}

async function rewriteArticle(raw) {
  if (process.env.GROQ_API_KEY) {
    return generateSeoArticle(raw);
  }
  return processArticle(raw);
}

export async function processRawArticle(raw) {
  let parsed;
  try {
    parsed = await rewriteArticle(raw);
  } catch (err) {
    return saveFailed(raw, err.message);
  }
  return persistProcessed(raw, parsed);
}

export async function runPipelineForArticles(rawArticles) {
  const batchSize = 5;
  let processed = 0;
  let saved = 0;
  let errors = 0;

  for (let i = 0; i < rawArticles.length; i += batchSize) {
    const chunk = rawArticles.slice(i, i + batchSize);
    const results = await processBatch(chunk, 3, rewriteArticle);
    for (const r of results) {
      processed += 1;
      if (!r) continue;
      if (!r.ok) {
        errors += 1;
        try {
          await saveFailed(r.raw, r.error?.message);
          saved += 1;
        } catch {
          /* duplicate url */
        }
        continue;
      }
      try {
        await persistProcessed(r.raw, r.parsed);
        saved += 1;
      } catch (e) {
        errors += 1;
        logger.error(e);
        try {
          await saveFailed(r.raw, e.message);
        } catch {
          /* noop */
        }
      }
    }
  }
  return { processed, saved, errors };
}

export async function runNewsFetchCycle() {
  logger.info('News fetch cycle start');
  const raw = await fetchAllNews();
  logger.info('Raw new articles', raw.length);
  const stats = await runPipelineForArticles(raw);
  await updateTrendingCache();
  await invalidateArticleCaches();
  logger.info('News fetch cycle done', stats);
  return stats;
}

export async function runManualFetch(url) {
  const raw = await extractArticleFromUrl(url);
  const existing = await Article.findOne({ urlHash: raw.urlHash });
  if (existing) return existing;
  return processRawArticle(raw);
}

export function scheduleNewsFetcher() {
  cron.schedule('*/15 * * * *', async () => {
    try {
      await runNewsFetchCycle();
    } catch (e) {
      logger.error('Cron fetch failed', e);
    }
  });
}
