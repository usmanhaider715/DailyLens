import { randomUUID } from 'crypto';
import { Article } from '../models/Article.js';
import { IdeaBatchReport } from '../models/IdeaBatchReport.js';
import { buildListicleDraftResponse } from './listicleDraftService.js';
import { buildAiDraftResponse } from './aiDraftService.js';
import { isListicleRoughText } from './seoListiclePrompt.js';
import { buildArticlePayload, ensureUniqueSlug, ensureFeaturedImage } from '../utils/articleHelpers.js';
import { slugify } from '../utils/slugify.js';
import { invalidateArticleCaches } from '../controllers/articleController.js';
import { logger } from '../utils/logger.js';
import { isAiRateLimitError, isAiContentError, parseRetryAfterMs } from './groqService.js';
import { Category } from '../models/Category.js';

export const MAX_IDEA_BATCH = 100;
const GAP_MS =
  Number(process.env.IDEA_BATCH_GAP_MS) ||
  (process.env.BLUESMINDS_API_KEY?.trim() ? 12000 : 45000);
const JOB_TTL_MS = 2 * 60 * 60 * 1000;

class StopRunError extends Error {
  constructor() {
    super('Stopped by user');
    this.code = 'STOPPED';
  }
}

class SkipArticleError extends Error {
  constructor() {
    super('Skipped by user');
    this.code = 'SKIP';
  }
}

const runJobs = new Map();

function cleanupOldRunJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of runJobs.entries()) {
    if (job.finishedAt && job.finishedAt < cutoff) runJobs.delete(id);
  }
}

function syncJobCounts(job) {
  job.done = (job.drafted || 0) + (job.failed || 0) + (job.skippedCount || 0);
}

function touchJob(job, patch) {
  Object.assign(job, patch);
  syncJobCounts(job);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assertNotStopped(job) {
  if (job?.control?.stopped) throw new StopRunError();
}

async function waitWhilePaused(job) {
  while (job?.control?.paused) {
    assertNotStopped(job);
    touchJob(job, { currentPhase: 'paused' });
    await sleep(500);
  }
}

async function sleepInterruptible(ms, job) {
  const step = 500;
  let left = ms;
  while (left > 0) {
    assertNotStopped(job);
    if (job?.control?.skipWait || job?.control?.skipCurrent) {
      job.control.skipWait = false;
      return;
    }
    await waitWhilePaused(job);
    const chunk = Math.min(step, left);
    await sleep(chunk);
    left -= chunk;
  }
}

function clearSkipFlag(job) {
  if (job?.control) job.control.skipCurrent = false;
}

function parseIdeas(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•]\s*/, '').trim())
    .filter((line) => line.length >= 3);
}

function ideaToRaw(idea, category) {
  const title = idea.trim();
  return {
    title,
    description: title,
    content: `${title}\n\nWrite a polished numbered listicle article with clear sections for each pick.`,
    url: `idea://${slugify(title)}-${Date.now()}`,
    sourceName: 'Content ideas',
    sourceUrl: '',
    suggestedCategory: category,
  };
}

async function saveDraftFromIdea(idea, category, batchId) {
  const raw = ideaToRaw(idea, category);
  const draft = isListicleRoughText(idea)
    ? await buildListicleDraftResponse(raw, category)
    : await buildAiDraftResponse(raw, category);

  const input = {
    title: draft.title,
    summary: draft.summary,
    body: draft.body,
    category: draft.category || category,
    tags: draft.tags || [],
    author: 'The Daily Lens Desk',
    featuredImage: draft.featuredImage || '',
    heroImage: draft.heroImageUrl
      ? {
          url: draft.heroImageUrl,
          alt: draft.heroImageAlt || draft.title,
          credit: draft.heroImageCredit || '',
          creditUrl: draft.heroImageCreditUrl || '',
          source: draft.heroImageSource || 'original',
        }
      : undefined,
    isPublished: false,
    isFeatured: false,
    seoScore: draft.seoScore ?? 7,
    readTime: draft.readTime,
    isBreaking: false,
    originalUrl: raw.url,
    originalTitle: raw.title,
    source: { name: 'Content ideas', url: '' },
    publishedAt: new Date(),
  };

  let payload = buildArticlePayload(input);
  payload.sourceType = 'idea-batch';
  payload.ideaBatchId = batchId;
  payload.slug = await ensureUniqueSlug(payload.slug || slugify(payload.title));
  await ensureFeaturedImage(payload, payload.slug);
  return Article.create(payload);
}

async function generateDraftWithRetry(idea, category, batchId, { job, onWaiting } = {}, maxAttempts = 4) {
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    assertNotStopped(job);
    if (job?.control?.skipCurrent) {
      clearSkipFlag(job);
      throw new SkipArticleError();
    }
    await waitWhilePaused(job);
    try {
      if (job) job.currentIdea = idea;
      return await saveDraftFromIdea(idea, category, batchId);
    } catch (err) {
      lastErr = err;
      if (job?.control?.skipCurrent) {
        clearSkipFlag(job);
        throw new SkipArticleError();
      }
      const retryable = isAiRateLimitError(err) || isAiContentError(err);
      if (attempt < maxAttempts - 1 && retryable) {
        const waitMs = isAiRateLimitError(err) ? parseRetryAfterMs(err) : 3000 + attempt * 2000;
        onWaiting?.({ waitMs, idea });
        await sleepInterruptible(waitMs, job);
        continue;
      }
      throw err;
    } finally {
      if (job) job.currentIdea = null;
    }
  }
  throw lastErr;
}

function createRunJob(ideas, category) {
  return {
    id: randomUUID(),
    batchId: randomUUID(),
    status: 'running',
    category,
    total: ideas.length,
    done: 0,
    drafted: 0,
    failed: 0,
    skippedCount: 0,
    ideaIndex: 0,
    currentPhase: 'starting',
    currentTitle: null,
    waitingSeconds: 0,
    rateLimited: false,
    errorMessages: [],
    summary: null,
    reportId: null,
    startedAt: Date.now(),
    finishedAt: null,
    control: {
      paused: false,
      stopped: false,
      skipCurrent: false,
      skipWait: false,
    },
    currentIdea: null,
  };
}

async function runIdeaBatchJob(ideas, category, job) {
  const started = Date.now();
  const report = {
    batchId: job.batchId,
    category,
    requestedCount: ideas.length,
    draftCount: 0,
    failedCount: 0,
    skippedCount: 0,
    items: [],
    errorMessages: [],
    triggeredBy: 'manual',
  };

  let stoppedByUser = false;
  let aiIndex = 0;

  try {
    for (let i = 0; i < ideas.length; i++) {
      assertNotStopped(job);
      await waitWhilePaused(job);

      const idea = ideas[i];
      if (job) {
        touchJob(job, {
          ideaIndex: i + 1,
          currentPhase: 'generating',
          currentTitle: idea,
          waitingSeconds: 0,
          rateLimited: false,
        });
      }

      if (job?.control?.skipCurrent) {
        clearSkipFlag(job);
        report.failedCount += 1;
        report.skippedCount += 1;
        report.errorMessages.push(`Skipped: ${idea.slice(0, 60)}`);
        report.items.push({ idea, action: 'skipped' });
        if (job) {
          touchJob(job, {
            failed: report.failedCount,
            skippedCount: report.skippedCount,
            errorMessages: [...report.errorMessages],
          });
        }
        continue;
      }

      if (aiIndex > 0) {
        if (job) {
          touchJob(job, {
            currentPhase: 'waiting_gap',
            waitingSeconds: Math.round(GAP_MS / 1000),
            currentTitle: idea,
          });
        }
        await sleepInterruptible(GAP_MS, job);
      }
      aiIndex += 1;

      try {
        const doc = await generateDraftWithRetry(idea, category, job.batchId, {
          job,
          onWaiting: ({ waitMs }) => {
            if (job) {
              touchJob(job, {
                currentPhase: 'waiting_rate_limit',
                rateLimited: true,
                waitingSeconds: Math.round(waitMs / 1000),
              });
            }
          },
        });

        report.draftCount += 1;
        report.items.push({
          articleId: doc._id,
          idea,
          title: doc.title,
          slug: doc.slug,
          category: doc.category,
          action: 'draft',
        });
        if (job) {
          touchJob(job, {
            drafted: report.draftCount,
            rateLimited: false,
            waitingSeconds: 0,
          });
        }
      } catch (err) {
        if (err instanceof SkipArticleError) {
          report.failedCount += 1;
          report.skippedCount += 1;
          report.errorMessages.push(`Skipped: ${idea.slice(0, 60)}`);
          report.items.push({ idea, action: 'skipped' });
        } else {
          report.failedCount += 1;
          report.errorMessages.push(`${idea.slice(0, 50)}: ${err.message}`);
          report.items.push({ idea, action: 'failed' });
        }
        if (job) {
          touchJob(job, {
            failed: report.failedCount,
            skippedCount: report.skippedCount,
            errorMessages: [...report.errorMessages],
          });
        }
      }
    }

    await invalidateArticleCaches();

    if (stoppedByUser) {
      report.status = 'partial';
      report.summary = `Stopped — ${report.draftCount} drafts saved`;
    } else if (report.draftCount === 0) {
      report.status = 'failed';
      report.summary = 'No drafts created';
    } else if (report.failedCount > 0) {
      report.status = 'partial';
      report.summary = `${report.draftCount}/${ideas.length} drafts saved, ${report.failedCount} failed/skipped`;
    } else {
      report.status = 'success';
      report.summary = `${report.draftCount} drafts saved`;
    }
  } catch (err) {
    if (err instanceof StopRunError) {
      stoppedByUser = true;
      report.status = 'partial';
      report.summary = `Stopped — ${report.draftCount} drafts saved`;
    } else {
      report.status = 'failed';
      report.errorMessages.push(err.message);
      report.summary = `Run failed: ${err.message}`;
      logger.error('Idea batch failed', err);
    }
  }

  report.durationMs = Date.now() - started;
  const doc = await IdeaBatchReport.create(report);

  if (job) {
    const finalStatus = stoppedByUser ? 'stopped' : report.status === 'failed' ? 'error' : 'complete';
    touchJob(job, {
      status: finalStatus,
      currentPhase: stoppedByUser ? 'stopped' : report.status === 'failed' ? 'error' : 'complete',
      summary: report.summary,
      drafted: report.draftCount,
      failed: report.failedCount,
      skippedCount: report.skippedCount,
      errorMessages: report.errorMessages,
      reportId: doc._id.toString(),
      finishedAt: Date.now(),
      currentTitle: null,
      waitingSeconds: 0,
    });
  }

  return doc.toObject();
}

export function getIdeaBatchRunJob(jobId) {
  cleanupOldRunJobs();
  return runJobs.get(jobId) || null;
}

export function getActiveIdeaBatchRunJob() {
  cleanupOldRunJobs();
  for (const job of runJobs.values()) {
    if (job.status === 'running') return job;
  }
  return null;
}

export function controlIdeaBatchRun(jobId, action) {
  const job = runJobs.get(jobId);
  if (!job) return null;
  if (!job.control) {
    job.control = { paused: false, stopped: false, skipCurrent: false, skipWait: false };
  }

  switch (action) {
    case 'pause':
      job.control.paused = true;
      touchJob(job, { currentPhase: 'paused' });
      break;
    case 'continue':
      job.control.paused = false;
      job.control.skipWait = true;
      if (job.currentPhase === 'paused') touchJob(job, { currentPhase: 'generating' });
      break;
    case 'stop':
      job.control.stopped = true;
      job.control.paused = false;
      job.control.skipWait = true;
      job.control.skipCurrent = true;
      touchJob(job, { currentPhase: 'stopping' });
      break;
    case 'skip':
      job.control.skipCurrent = true;
      job.control.skipWait = true;
      break;
    case 'publish':
      job.control.paused = false;
      job.control.skipWait = true;
      break;
    default:
      return null;
  }

  return job;
}

export async function startIdeaBatchJob({ ideasText, category = 'Entertainment' }) {
  cleanupOldRunJobs();
  const active = getActiveIdeaBatchRunJob();
  if (active) {
    const err = new Error('An idea batch run is already in progress');
    err.status = 409;
    err.jobId = active.id;
    throw err;
  }

  const ideas = parseIdeas(ideasText);
  if (!ideas.length) {
    const err = new Error('Add at least one idea (one per line)');
    err.status = 400;
    throw err;
  }
  if (ideas.length > MAX_IDEA_BATCH) {
    const err = new Error(`Maximum ${MAX_IDEA_BATCH} ideas per batch`);
    err.status = 400;
    throw err;
  }

  const job = createRunJob(ideas, category);
  runJobs.set(job.id, job);

  runIdeaBatchJob(ideas, category, job).catch((err) => {
    const j = runJobs.get(job.id);
    if (j && j.status === 'running') {
      touchJob(j, {
        status: 'error',
        currentPhase: 'error',
        summary: err.message || 'Run failed',
        errorMessages: [err.message],
        finishedAt: Date.now(),
      });
    }
    logger.error('Idea batch job failed', err);
  });

  return {
    jobId: job.id,
    batchId: job.batchId,
    total: ideas.length,
    category,
  };
}

export async function getIdeaBatchConfig() {
  const reports = await IdeaBatchReport.find().sort({ createdAt: -1 }).limit(50).lean();
  const activeJob = getActiveIdeaBatchRunJob();
  return { reports, activeJob, maxBatch: MAX_IDEA_BATCH };
}

export async function listIdeaDrafts({ page = 1, limit = 50, batchId } = {}) {
  const filter = { isPublished: false, sourceType: 'idea-batch' };
  if (batchId) filter.ideaBatchId = batchId;
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Article.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('title slug category summary heroImage featuredImage readTime seoScore createdAt ideaBatchId')
      .lean(),
    Article.countDocuments(filter),
  ]);
  return { items, page, limit, total };
}

export async function bulkPublishDrafts(ids) {
  const objectIds = ids.filter(Boolean);
  if (!objectIds.length) {
    const err = new Error('No article IDs provided');
    err.status = 400;
    throw err;
  }

  const articles = await Article.find({
    _id: { $in: objectIds },
    isPublished: false,
  });

  let published = 0;
  for (const doc of articles) {
    doc.isPublished = true;
    doc.publishedAt = new Date();
    await doc.save();
    await Category.updateOne({ name: doc.category }, { $inc: { articleCount: 1 } });
    published += 1;
  }

  await invalidateArticleCaches();
  return { published, requested: objectIds.length };
}

export async function bulkDeleteDrafts(ids) {
  const objectIds = ids.filter(Boolean);
  if (!objectIds.length) {
    const err = new Error('No article IDs provided');
    err.status = 400;
    throw err;
  }

  const result = await Article.deleteMany({
    _id: { $in: objectIds },
    isPublished: false,
    sourceType: 'idea-batch',
  });
  await invalidateArticleCaches();
  return { deleted: result.deletedCount };
}
