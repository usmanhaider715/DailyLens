import { randomUUID } from 'crypto';
import { Article } from '../models/Article.js';
import { NewsSource } from '../models/NewsSource.js';
import { AutoShareReport } from '../models/AutoShareReport.js';
import { getSiteSettings } from '../models/SiteSettings.js';
import { buildAiDraftResponse } from '../services/aiDraftService.js';
import { buildArticlePayload, ensureUniqueSlug } from '../utils/articleHelpers.js';
import { slugify } from '../utils/slugify.js';
import { checkDuplicateBeforeInsert, attachNormalizedSourceUrl } from '../services/duplicateArticleService.js';
import { fetchLatestNewsFeedForAdmin, RSS_FEEDS } from '../services/newsService.js';
import {
  fetchGoogleTrendsFeedItems,
  GOOGLE_TRENDS_US_SOURCE_NAME,
  GOOGLE_TRENDS_US_SOURCE_KEY,
} from '../services/googleTrendsService.js';
import { invalidateArticleCaches } from '../controllers/articleController.js';
import { getEasternDateParts, formatEasternTime } from '../utils/usEasternTime.js';
import { logger } from '../utils/logger.js';
import { isAiRateLimitError, isAiContentError, parseRetryAfterMs } from './groqService.js';

/** Categories included in each auto-share run (articlesPerCategory each). */
export const AUTO_SHARE_CATEGORIES = [
  'World',
  'Technology',
  'Business',
  'Sports',
  'Health',
  'Entertainment',
  'Gaming',
  'Politics',
  'Crypto',
  'Weather',
];

const LOOKBACK_DAYS = 14;
const PUBLISH_GAP_MS =
  Number(process.env.AUTO_SHARE_PUBLISH_GAP_MS) ||
  (process.env.BLUESMINDS_API_KEY?.trim() ? 12000 : 45000);
const JOB_TTL_MS = 2 * 60 * 60 * 1000;

export function resolveAutoShareCategories(settings) {
  const selected = settings?.autoShareCategories?.filter(Boolean) || [];
  if (!selected.length) return AUTO_SHARE_CATEGORIES;
  return AUTO_SHARE_CATEGORIES.filter((c) => selected.includes(c));
}

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

/** In-memory progress for manual Run now jobs */
const runJobs = new Map();

function cleanupOldRunJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of runJobs.entries()) {
    if (job.finishedAt && job.finishedAt < cutoff) runJobs.delete(id);
  }
}

function syncJobCounts(job) {
  job.done = job.featured + job.published + job.failed;
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

/** Sleep that respects pause, stop, skip-wait, and skip-current signals */
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

function sourceNamesFromDocs(sources) {
  return sources.map((s) => s.name).filter(Boolean);
}

/** Match "BBC" to feed names like "BBC Top", "BBC World", etc. */
function namesMatch(selected, feedName) {
  const s = String(selected || '').toLowerCase().trim();
  const f = String(feedName || '').toLowerCase().trim();
  if (!s || !f) return false;
  if (s === f) return true;
  if (f.startsWith(s) || s.startsWith(f)) return true;
  const sWord = s.split(/\s+/)[0];
  const fWord = f.split(/\s+/)[0];
  return sWord.length >= 3 && sWord === fWord;
}

function expandSourceNames(selectedNames) {
  const out = new Set(selectedNames.filter(Boolean));
  for (const name of selectedNames) {
    out.add(name);
    for (const feed of RSS_FEEDS) {
      if (namesMatch(name, feed.name)) out.add(feed.name);
    }
  }
  return [...out];
}

function feedSourceMatches(selectedNames, feedSourceName) {
  return expandSourceNames(selectedNames).some((n) => namesMatch(n, feedSourceName));
}

/** Is the Google Trends USA pseudo-source selected? Detected by its stable
 * routing key (`url`) or its canonical name. */
function hasGoogleTrendsUs(sources) {
  return (sources || []).some(
    (s) =>
      s?.url === GOOGLE_TRENDS_US_SOURCE_KEY ||
      String(s?.name || '').toLowerCase().trim() === GOOGLE_TRENDS_US_SOURCE_NAME.toLowerCase(),
  );
}

async function resolveSources(sourceIds) {
  let ids = sourceIds || [];
  if (!ids.length) {
    const all = await NewsSource.find().select('_id').lean();
    ids = all.map((s) => s._id);
  }
  if (!ids.length) return [];
  return NewsSource.find({ _id: { $in: ids } }).lean();
}

async function findTopExistingArticles(sourceNames, category, limit, excludeIds = []) {
  if (!sourceNames.length || limit <= 0) return [];
  const since = new Date(Date.now() - LOOKBACK_DAYS * 86400000);
  const expandedNames = expandSourceNames(sourceNames);

  return Article.find({
    isPublished: true,
    isPaused: { $ne: true },
    publishedAt: { $gte: since },
    category,
    'source.name': { $in: expandedNames },
    _id: { $nin: excludeIds },
    lastAutoSharedAt: { $exists: false },
  })
    .sort({ views: -1, readTime: -1, publishedAt: -1 })
    .limit(limit)
    .select('_id title slug views readTime source.name category')
    .lean();
}

async function fetchHotFeedItems(sourceNames, category, limit, sources = []) {
  const candidates = [];

  // Google Trends USA — write articles on whatever is trending in the US right
  // now (hottest first). These are added ahead of RSS items so trending topics
  // take priority when this source is selected.
  if (hasGoogleTrendsUs(sources)) {
    try {
      const trendItems = await fetchGoogleTrendsFeedItems({
        region: 'us',
        category,
        limit: Math.max(limit * 2, 8),
      });
      candidates.push(...trendItems);
    } catch (err) {
      logger.warn(`Auto-share Google Trends USA fetch failed (${category}): ${err.message}`);
    }
  }

  // RSS / aggregator feed items for the other selected sources. Exclude the
  // trends pseudo-source name here so its first-word ("google") match doesn't
  // accidentally pull in every "Google *" RSS feed.
  const rssNames = sourceNames.filter(
    (n) => String(n).toLowerCase().trim() !== GOOGLE_TRENDS_US_SOURCE_NAME.toLowerCase(),
  );
  if (rssNames.length) {
    const feed = await fetchLatestNewsFeedForAdmin(Math.max(limit * 4, 24), { category });
    for (const item of feed.items || []) {
      const sourceMatch = feedSourceMatches(rssNames, item.sourceName);
      const catMatch = !item.suggestedCategory || item.suggestedCategory === category;
      if (sourceMatch && catMatch) candidates.push(item);
    }
  }

  const seen = new Set();
  const out = [];
  for (const item of candidates) {
    const key = item.url || item.title;
    if (!key || seen.has(key)) continue;
    const dup = await checkDuplicateBeforeInsert({
      sourceUrl: item.url,
      headline: item.title,
      category,
    });
    if (dup) continue;
    seen.add(key);
    out.push({ ...item, suggestedCategory: category });
    if (out.length >= limit) break;
  }
  return out;
}

async function publishFromFeedItem(item, category, job = null) {
  const dup = await checkDuplicateBeforeInsert({
    sourceUrl: item.url,
    headline: item.title,
    category,
  });
  if (dup) {
    const err = new Error(`Duplicate: ${dup.article.slug}`);
    err.code = 'DUPLICATE_ARTICLE';
    throw err;
  }

  const raw = {
    title: item.title,
    description: item.description || '',
    content: item.content || item.description || '',
    url: item.url,
    imageUrl: item.imageUrl || '',
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl || item.url,
    publishedAt: item.publishedAt || new Date().toISOString(),
    suggestedCategory: category,
  };
  if (job) {
    touchJob(job, { currentPhase: 'rewriting', currentTitle: item.title, currentCategory: category });
  }
  const draft = await buildAiDraftResponse(raw, category);
  if (job) {
    touchJob(job, {
      currentModel: draft.aiModelUsed || draft.rewriteModel || null,
      currentPhase: 'publishing',
    });
  }
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
          source: draft.heroImageSource || 'ai_generated',
        }
      : undefined,
    imageSourceType: draft.imageSourceType || draft.heroImageSource || '',
    imageAttribution: draft.imageAttribution || '',
    verifiedQuotes: !!draft.verifiedQuotes,
    rewriteModel: draft.rewriteModel || '',
    isPublished: true,
    isFeatured: true,
    seoScore: draft.seoScore ?? 7,
    readTime: draft.readTime,
    isBreaking: !!draft.isBreaking,
    originalUrl: raw.url,
    originalTitle: raw.title,
    source: { name: raw.sourceName, url: raw.sourceUrl },
    publishedAt: raw.publishedAt,
  };
  const payload = buildArticlePayload(input);
  attachNormalizedSourceUrl(payload, raw.url);
  payload.slug = await ensureUniqueSlug(payload.slug || slugify(payload.title));
  payload.lastAutoSharedAt = new Date();
  return Article.create(payload);
}

async function publishFromFeedItemWithRetry(item, category, { job, onWaiting } = {}, maxAttempts = 4) {
  let lastErr;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    assertNotStopped(job);
    if (job?.control?.skipCurrent) {
      clearSkipFlag(job);
      throw new SkipArticleError();
    }
    await waitWhilePaused(job);
    try {
      if (job) {
        job.currentFeedItem = item;
        job.currentFeedCategory = category;
      }
      return await publishFromFeedItem(item, category, job);
    } catch (err) {
      lastErr = err;
      if (job?.control?.skipCurrent) {
        clearSkipFlag(job);
        throw new SkipArticleError();
      }
      const retryable = isAiRateLimitError(err) || isAiContentError(err);
      if (attempt < maxAttempts - 1 && retryable) {
        const waitMs = isAiRateLimitError(err) ? parseRetryAfterMs(err) : 3000 + attempt * 2000;
        onWaiting?.({ waitMs, title: item.title, category });
        logger.warn(
          `Auto-share AI ${isAiRateLimitError(err) ? 'rate limited' : 'content error'} — waiting ${Math.round(waitMs / 1000)}s before retry (${attempt + 1}/${maxAttempts})`,
        );
        await sleepInterruptible(waitMs, job);
        continue;
      }
      throw err;
    } finally {
      if (job) {
        job.currentFeedItem = null;
        job.currentFeedCategory = null;
      }
    }
  }
  throw lastErr;
}

function createRunJob(period, meta) {
  return {
    id: randomUUID(),
    status: 'running',
    periodId: period.id,
    periodLabel: period.label || meta.scheduledTimeET,
    scheduledTimeET: meta.scheduledTimeET,
    total: meta.requestedTotal,
    done: 0,
    featured: 0,
    published: 0,
    failed: 0,
    articlesPerCategory: meta.articlesPerCategory,
    categoryCount: meta.categoryCount,
    categoryIndex: 0,
    currentCategory: null,
    currentPhase: 'starting',
    currentTitle: null,
    currentModel: null,
    configuredModel: process.env.OPENROUTER_MODEL?.trim() || process.env.BLUESMINDS_MODEL?.trim() || 'gpt-5.5',
    waitingSeconds: 0,
    rateLimited: false,
    categoryBreakdown: [],
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
    currentFeedItem: null,
    currentFeedCategory: null,
    skippedCount: 0,
  };
}

export async function runAutoSharePeriod(period, { triggeredBy = 'schedule', job = null } = {}) {
  const started = Date.now();
  const settings = await getSiteSettings();
  if (!settings.autoShareEnabled && triggeredBy === 'schedule') {
    if (job) {
      touchJob(job, {
        status: 'skipped',
        currentPhase: 'skipped',
        summary: 'Auto-share disabled',
        finishedAt: Date.now(),
      });
    }
    return { skipped: true, reason: 'Auto-share disabled' };
  }

  const sourceIds = settings.autoShareSourceIds || [];
  const articlesPerCategory = Math.min(Math.max(Number(settings.autoShareArticleCount) || 5, 1), 20);
  const categories = resolveAutoShareCategories(settings);
  const requestedTotal = articlesPerCategory * categories.length;
  const sources = await resolveSources(sourceIds);
  const sourceNames = sourceNamesFromDocs(sources);

  const et = getEasternDateParts();
  const runDateET = et.dateKey;
  const scheduledTimeET = formatEasternTime(period.hourET, period.minuteET);

  if (job) {
    touchJob(job, {
      total: requestedTotal,
      articlesPerCategory,
      categoryCount: categories.length,
      periodLabel: period.label || scheduledTimeET,
      scheduledTimeET,
      currentPhase: 'starting',
    });
  }

  const already = await AutoShareReport.findOne({
    periodId: period.id,
    runDateET,
    status: { $in: ['success', 'partial'] },
    triggeredBy: 'schedule',
  }).lean();
  if (triggeredBy === 'schedule' && already) {
    if (job) {
      touchJob(job, {
        status: 'skipped',
        currentPhase: 'skipped',
        summary: 'Already ran today for this period',
        finishedAt: Date.now(),
      });
    }
    return { skipped: true, reason: 'Already ran today for this period' };
  }

  const report = {
    periodId: period.id,
    periodLabel: period.label || scheduledTimeET,
    scheduledTimeET,
    runDateET,
    sourceNames,
    articlesPerCategory,
    categoryCount: categories.length,
    requestedCount: requestedTotal,
    featuredCount: 0,
    publishedCount: 0,
    failedCount: 0,
    categoryBreakdown: [],
    items: [],
    errorMessages: [],
    triggeredBy,
  };

  if (!sourceNames.length) {
    report.status = 'failed';
    report.errorMessages.push('No active news sources selected');
    report.summary = 'Failed — no sources configured';
    report.durationMs = Date.now() - started;
    const doc = await AutoShareReport.create(report);
    if (job) {
      touchJob(job, {
        status: 'error',
        currentPhase: 'error',
        summary: report.summary,
        errorMessages: report.errorMessages,
        reportId: doc._id.toString(),
        finishedAt: Date.now(),
      });
    }
    return doc.toObject();
  }

  const usedArticleIds = new Set();
  let aiPublishIndex = 0;
  let stoppedByUser = false;

  try {
    for (let catIdx = 0; catIdx < categories.length; catIdx++) {
      assertNotStopped(job);
      await waitWhilePaused(job);

      const category = categories[catIdx];
      if (job) {
        touchJob(job, {
          categoryIndex: catIdx + 1,
          currentCategory: category,
          currentPhase: 'featuring',
          currentTitle: null,
          waitingSeconds: 0,
          rateLimited: false,
        });
      }

      const breakdown = {
        category,
        requested: articlesPerCategory,
        featured: 0,
        published: 0,
        failed: 0,
      };
      let remaining = articlesPerCategory;
      const excludeIds = [...usedArticleIds];

      const existing = await findTopExistingArticles(sourceNames, category, remaining, excludeIds);
      for (const article of existing) {
        assertNotStopped(job);
        await waitWhilePaused(job);
        const id = String(article._id);
        if (usedArticleIds.has(id)) continue;
        if (job) {
          touchJob(job, {
            currentPhase: 'featuring',
            currentCategory: category,
            currentTitle: article.title,
          });
        }
        await Article.updateOne(
          { _id: article._id },
          { $set: { isFeatured: true, lastAutoSharedAt: new Date() } },
        );
        usedArticleIds.add(id);
        report.items.push({
          articleId: article._id,
          title: article.title,
          slug: article.slug,
          sourceName: article.source?.name,
          category,
          views: article.views || 0,
          action: 'featured',
        });
        report.featuredCount += 1;
        breakdown.featured += 1;
        remaining -= 1;
        if (job) {
          touchJob(job, {
            featured: report.featuredCount,
            categoryBreakdown: [...report.categoryBreakdown, { ...breakdown }],
          });
        }
        if (remaining <= 0) break;
      }

      if (remaining > 0) {
        const feedItems = await fetchHotFeedItems(sourceNames, category, remaining, sources);
        for (const item of feedItems) {
          assertNotStopped(job);
          await waitWhilePaused(job);
          if (job?.control?.skipCurrent) {
            clearSkipFlag(job);
            report.failedCount += 1;
            breakdown.failed += 1;
            if (job) job.skippedCount = (job.skippedCount || 0) + 1;
            report.errorMessages.push(`[${category}] Skipped: ${item.title?.slice(0, 50)}`);
            continue;
          }

          if (aiPublishIndex > 0) {
            if (job) {
              touchJob(job, {
                currentPhase: 'waiting_gap',
                waitingSeconds: Math.round(PUBLISH_GAP_MS / 1000),
                currentTitle: item.title,
              });
            }
            await sleepInterruptible(PUBLISH_GAP_MS, job);
          }
          aiPublishIndex += 1;
          if (job) {
            touchJob(job, {
              currentPhase: 'publishing',
              currentCategory: category,
              currentTitle: item.title,
              waitingSeconds: 0,
            });
          }
          try {
            const doc = await publishFromFeedItemWithRetry(item, category, {
              job,
              onWaiting: ({ waitMs, title }) => {
                if (job) {
                  touchJob(job, {
                    currentPhase: 'waiting_rate_limit',
                    rateLimited: true,
                    waitingSeconds: Math.round(waitMs / 1000),
                    currentTitle: title,
                  });
                }
              },
            });
            usedArticleIds.add(String(doc._id));
            report.items.push({
              articleId: doc._id,
              title: doc.title,
              slug: doc.slug,
              sourceName: item.sourceName,
              category,
              views: 0,
              action: 'published',
            });
            report.publishedCount += 1;
            breakdown.published += 1;
            remaining -= 1;
            if (job) {
              touchJob(job, {
                published: report.publishedCount,
                rateLimited: false,
                waitingSeconds: 0,
                categoryBreakdown: [...report.categoryBreakdown, { ...breakdown }],
              });
            }
          } catch (err) {
            if (err instanceof SkipArticleError) {
              report.failedCount += 1;
              breakdown.failed += 1;
              if (job) job.skippedCount = (job.skippedCount || 0) + 1;
              report.errorMessages.push(`[${category}] Skipped: ${item.title?.slice(0, 50)}`);
            } else {
              report.failedCount += 1;
              breakdown.failed += 1;
              report.errorMessages.push(`[${category}] ${item.title?.slice(0, 50)}: ${err.message}`);
            }
            if (job) {
              touchJob(job, {
                failed: report.failedCount,
                errorMessages: [...report.errorMessages],
                categoryBreakdown: [...report.categoryBreakdown, { ...breakdown }],
              });
            }
          }
          if (remaining <= 0) break;
        }
      }

      report.categoryBreakdown.push(breakdown);
      if (job) {
        touchJob(job, { categoryBreakdown: [...report.categoryBreakdown] });
      }
    }

    await invalidateArticleCaches();

    const total = report.featuredCount + report.publishedCount;
    const fullCategories = report.categoryBreakdown.filter(
      (b) => b.featured + b.published >= b.requested,
    ).length;

    if (stoppedByUser) {
      report.status = 'partial';
      report.summary = `Stopped — featured ${report.featuredCount}, published ${report.publishedCount}`;
    } else if (total === 0) {
      report.status = 'failed';
      report.summary = 'No articles featured or published';
    } else if (report.failedCount > 0 || total < requestedTotal) {
      report.status = 'partial';
      report.summary = `${articlesPerCategory}/category × ${categories.length} — featured ${report.featuredCount}, published ${report.publishedCount}, ${report.failedCount} failed (${fullCategories}/${categories.length} categories full)`;
    } else {
      report.status = 'success';
      report.summary = `${articlesPerCategory} per category × ${categories.length} — featured ${report.featuredCount}, published ${report.publishedCount}`;
    }
  } catch (err) {
    if (err instanceof StopRunError) {
      stoppedByUser = true;
      report.status = 'partial';
      report.summary = `Stopped — featured ${report.featuredCount}, published ${report.publishedCount}`;
    } else {
      report.status = 'failed';
      report.errorMessages.push(err.message);
      report.summary = `Run failed: ${err.message}`;
      logger.error('Auto-share period failed', err);
      if (job) {
        touchJob(job, {
          status: 'error',
          currentPhase: 'error',
          summary: report.summary,
          errorMessages: report.errorMessages,
        });
      }
    }
  }

  report.durationMs = Date.now() - started;
  const doc = await AutoShareReport.create(report);
  const result = doc.toObject();
  if (job) {
    const finalStatus = stoppedByUser ? 'stopped' : report.status === 'failed' ? 'error' : 'complete';
    touchJob(job, {
      status: finalStatus,
      currentPhase: stoppedByUser ? 'stopped' : report.status === 'failed' ? 'error' : 'complete',
      summary: report.summary,
      featured: report.featuredCount,
      published: report.publishedCount,
      failed: report.failedCount,
      categoryBreakdown: report.categoryBreakdown,
      errorMessages: report.errorMessages,
      reportId: doc._id.toString(),
      finishedAt: Date.now(),
      currentTitle: null,
      waitingSeconds: 0,
    });
  }
  return result;
}

export function getAutoShareRunJob(jobId) {
  cleanupOldRunJobs();
  return runJobs.get(jobId) || null;
}

/** pause | continue | stop | skip | publish */
export function controlAutoShareRun(jobId, action) {
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
      if (job.currentPhase === 'paused') {
        touchJob(job, { currentPhase: 'publishing' });
      }
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

export function getActiveAutoShareRunJob() {
  cleanupOldRunJobs();
  for (const job of runJobs.values()) {
    if (job.status === 'running') return job;
  }
  return null;
}

export async function startAutoShareRunJob(periodId) {
  cleanupOldRunJobs();
  const active = getActiveAutoShareRunJob();
  if (active) {
    const err = new Error('An auto-share run is already in progress');
    err.status = 409;
    err.jobId = active.id;
    throw err;
  }

  const settings = await getSiteSettings();
  const periods = settings.autoSharePeriods?.length ? settings.autoSharePeriods : defaultPeriods();
  const period = periods.find((p) => p.id === periodId);
  if (!period) {
    const err = new Error('Period not found');
    err.status = 404;
    throw err;
  }

  const articlesPerCategory = Math.min(Math.max(Number(settings.autoShareArticleCount) || 5, 1), 20);
  const categories = resolveAutoShareCategories(settings);
  const requestedTotal = articlesPerCategory * categories.length;
  const scheduledTimeET = formatEasternTime(period.hourET, period.minuteET);

  const resolved = await resolveSources(settings.autoShareSourceIds || []);
  if (!resolved.length) {
    const err = new Error('No news sources found — open this page to auto-select sources, or run npm run seed in server/');
    err.status = 400;
    throw err;
  }

  const job = createRunJob(period, {
    articlesPerCategory,
    categoryCount: categories.length,
    requestedTotal,
    scheduledTimeET,
  });
  runJobs.set(job.id, job);

  runAutoSharePeriod(period, { triggeredBy: 'manual', job }).catch((err) => {
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
    logger.error('Auto-share job failed', err);
  });

  return {
    jobId: job.id,
    total: requestedTotal,
    periodLabel: job.periodLabel,
    articlesPerCategory,
    categoryCount: categories.length,
  };
}

export async function getAutoShareConfig() {
  const settings = await getSiteSettings();
  const sources = await NewsSource.find().sort({ name: 1 }).lean();
  const reports = await AutoShareReport.find().sort({ createdAt: -1 }).limit(50).lean();
  const articlesPerCategory = settings.autoShareArticleCount ?? 5;
  const selectedCategories = resolveAutoShareCategories(settings);
  let sourceIds = (settings.autoShareSourceIds || []).map(String);
  if (!sourceIds.length && sources.length) {
    settings.autoShareSourceIds = sources.map((s) => s._id);
    await settings.save();
    sourceIds = sources.map((s) => String(s._id));
  }
  return {
    enabled: !!settings.autoShareEnabled,
    articleCount: articlesPerCategory,
    articlesPerCategory,
    categories: AUTO_SHARE_CATEGORIES,
    selectedCategories,
    totalPerRun: articlesPerCategory * selectedCategories.length,
    sourceIds,
    periods: settings.autoSharePeriods?.length
      ? settings.autoSharePeriods
      : defaultPeriods(),
    sources,
    reports,
    easternNow: getEasternDateParts(),
  };
}

export function defaultPeriods() {
  return [
    { id: randomUUID(), label: 'Morning briefing', hourET: 8, minuteET: 0, enabled: true },
    { id: randomUUID(), label: 'Midday update', hourET: 12, minuteET: 0, enabled: true },
    { id: randomUUID(), label: 'Evening roundup', hourET: 18, minuteET: 0, enabled: true },
  ];
}

export async function updateAutoShareConfig(body) {
  const settings = await getSiteSettings();
  if (typeof body.enabled === 'boolean') settings.autoShareEnabled = body.enabled;
  if (body.articleCount !== undefined) {
    settings.autoShareArticleCount = Math.min(Math.max(Number(body.articleCount) || 5, 1), 20);
  }
  if (Array.isArray(body.sourceIds)) {
    settings.autoShareSourceIds = body.sourceIds.filter(Boolean);
  }
  if (Array.isArray(body.periods)) {
    settings.autoSharePeriods = body.periods.map((p) => ({
      id: p.id || randomUUID(),
      label: String(p.label || formatEasternTime(p.hourET, p.minuteET)).slice(0, 80),
      hourET: Math.min(23, Math.max(0, Number(p.hourET) || 0)),
      minuteET: Math.min(59, Math.max(0, Number(p.minuteET) || 0)),
      enabled: p.enabled !== false,
    }));
  }
  if (Array.isArray(body.selectedCategories)) {
    settings.autoShareCategories = body.selectedCategories.filter((c) =>
      AUTO_SHARE_CATEGORIES.includes(c)
    );
  }
  await settings.save();
  return getAutoShareConfig();
}

export async function runAutoShareNow(periodId) {
  return startAutoShareRunJob(periodId);
}
