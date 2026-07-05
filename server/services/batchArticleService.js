import { randomUUID } from 'crypto';
import { Article } from '../models/Article.js';
import { Category } from '../models/Category.js';
import { buildArticlePayload, ensureUniqueSlug } from '../utils/articleHelpers.js';
import { slugify } from '../utils/slugify.js';
import { invalidateArticleCaches } from '../controllers/articleController.js';
import { emitBreakingNews } from '../services/socketService.js';
import { buildAiDraftResponse } from '../services/aiDraftService.js';
import { isGroqRateLimitError, groqErrorMessage } from '../services/groqService.js';

const DEFAULT_DELAY_MS = 6000;
const MAX_BATCH_SIZE = 30;

const jobs = new Map();
const JOB_TTL_MS = 60 * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRateLimitError(err) {
  return isGroqRateLimitError(err);
}

function draftToArticleInput(draft, raw) {
  return {
    title: draft.title,
    summary: draft.summary,
    body: draft.body,
    category: draft.category,
    tags: draft.tags || [],
    author: 'The Daily Lens Desk',
    heroImage: draft.heroImageUrl
      ? {
          url: draft.heroImageUrl,
          alt: draft.heroImageAlt || draft.title,
          credit: draft.heroImageCredit || raw.sourceName,
          creditUrl: draft.heroImageCreditUrl || raw.url,
          source: draft.heroImageSource || 'original',
        }
      : undefined,
    isPublished: true,
    seoScore: draft.seoScore ?? 7,
    readTime: draft.readTime,
    isBreaking: !!draft.isBreaking,
    originalUrl: raw.url,
    originalTitle: raw.title,
    source: { name: raw.sourceName || 'News source', url: raw.sourceUrl || raw.url },
    publishedAt: raw.publishedAt || new Date().toISOString(),
  };
}

function storyToRaw(item) {
  return {
    title: item.title,
    description: item.description || '',
    content: item.content || item.description || '',
    url: item.url,
    imageUrl: item.imageUrl || '',
    sourceName: item.sourceName || 'News source',
    sourceUrl: item.sourceUrl || item.url,
    publishedAt: item.publishedAt || new Date().toISOString(),
    suggestedCategory: item.suggestedCategory || item.category,
  };
}

async function generateDraftWithRetry(raw, attempts = 5) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await buildAiDraftResponse(raw, raw.suggestedCategory);
    } catch (err) {
      lastErr = err;
      if (!isRateLimitError(err) || i === attempts - 1) throw err;
      await sleep(8000 * (i + 1));
    }
  }
  throw lastErr;
}

async function persistDraftAsArticle(draft, raw) {
  const input = draftToArticleInput(draft, raw);
  const payload = buildArticlePayload(input);
  payload.slug = await ensureUniqueSlug(payload.slug || slugify(payload.title));
  const doc = await Article.create(payload);
  await Category.updateOne({ name: doc.category }, { $inc: { articleCount: 1 } });
  if (doc.isBreaking && doc.isPublished) {
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

function cleanupOldJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of jobs.entries()) {
    if (job.finishedAt && job.finishedAt < cutoff) jobs.delete(id);
  }
}

async function runBatchJob(jobId, items, delayMs = DEFAULT_DELAY_MS) {
  const job = jobs.get(jobId);
  if (!job) return;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    job.current = item.title?.slice(0, 80) || `Story ${i + 1}`;
    job.done = i;

    try {
      const raw = storyToRaw(item);
      const existing = raw.url ? await Article.findOne({ originalUrl: raw.url }).lean() : null;
      if (existing) {
        job.skipped += 1;
        job.results.push({
          ok: false,
          skipped: true,
          url: raw.url,
          title: item.title,
          message: 'Already imported',
          slug: existing.slug,
        });
      } else {
        const draft = await generateDraftWithRetry(raw);
        const doc = await persistDraftAsArticle(draft, raw);
        job.published += 1;
        job.results.push({
          ok: true,
          url: raw.url,
          title: doc.title,
          slug: doc.slug,
          id: doc._id.toString(),
        });
      }
    } catch (err) {
      job.failed += 1;
      job.results.push({
        ok: false,
        url: item.url,
        title: item.title,
        message: groqErrorMessage(err),
      });
      if (isRateLimitError(err)) {
        job.rateLimited = true;
        await sleep(15000);
      }
    }

    job.done = i + 1;
    if (i < items.length - 1) await sleep(delayMs);
  }

  await invalidateArticleCaches();
  job.status = 'complete';
  job.finishedAt = Date.now();
  job.current = null;
}

export function startBatchPublishJob(items, options = {}) {
  cleanupOldJobs();
  const list = (items || []).slice(0, MAX_BATCH_SIZE);
  if (!list.length) {
    const err = new Error('Select at least one story to publish');
    err.status = 400;
    throw err;
  }

  const jobId = randomUUID();
  const delayMs = Math.max(3000, Math.min(Number(options.delayMs) || DEFAULT_DELAY_MS, 15000));

  jobs.set(jobId, {
    id: jobId,
    status: 'running',
    total: list.length,
    done: 0,
    published: 0,
    failed: 0,
    skipped: 0,
    rateLimited: false,
    current: null,
    results: [],
    startedAt: Date.now(),
    finishedAt: null,
    delayMs,
  });

  runBatchJob(jobId, list, delayMs).catch((err) => {
    const job = jobs.get(jobId);
    if (job) {
      job.status = 'error';
      job.error = err.message || 'Batch job failed';
      job.finishedAt = Date.now();
    }
  });

  return { jobId, total: list.length, delayMs };
}

export function getBatchPublishJob(jobId) {
  cleanupOldJobs();
  return jobs.get(jobId) || null;
}

export { MAX_BATCH_SIZE, DEFAULT_DELAY_MS };
