import crypto, { randomUUID } from 'crypto';
import { Article } from '../models/Article.js';
import { Category } from '../models/Category.js';
import { EvergreenPipelineLog } from '../models/EvergreenPipelineLog.js';
import {
  getEvergreenConfig,
  updateEvergreenConfig,
  DEFAULT_RPM_TIERS,
} from '../models/EvergreenConfig.js';
import {
  evergreenClaudeChat,
  getEvergreenClaudeConfig,
  parseClaudeJson,
  isEvergreenClaudeConfigured,
} from '../lib/evergreenClaude.js';
import { computeTopicHash, isDuplicateTopic } from '../utils/evergreenDedup.js';
import { resolveLicensedHeroImage, buildImageAttribution } from '../services/licensedImageService.js';
import { persistFeaturedImageIfRemote } from '../utils/persistHeroImage.js';
import { ensureUniqueSlug, estimateReadTime } from '../utils/articleHelpers.js';
import { hashUrl } from '../utils/hashUrl.js';
import { slugify } from '../utils/slugify.js';
import { invalidateSitemapCache } from '../services/sitemapService.js';
import { isAiRateLimitError, parseRetryAfterMs } from './groqService.js';
import { logger } from '../utils/logger.js';
import { stripEditorPlaceholders } from '../utils/stripEditorPlaceholders.js';

const YMYL = new Set(['Finance', 'Insurance', 'Legal', 'Health']);
const JOB_TTL_MS = 2 * 60 * 60 * 1000;
const ARTICLE_GAP_MS = Number(process.env.EVERGREEN_ARTICLE_GAP_MS) || 8000;

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
let pipelineRunning = false;

function cleanupOldRunJobs() {
  const cutoff = Date.now() - JOB_TTL_MS;
  for (const [id, job] of runJobs.entries()) {
    if (job.finishedAt && job.finishedAt < cutoff) runJobs.delete(id);
  }
}

function syncJobCounts(job) {
  job.done = (job.generated || 0) + (job.failed || 0) + (job.skippedCount || 0);
}

function touchJob(job, patch) {
  if (!job) return;
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

function localTimeKey(timezone) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hm: `${parts.hour}:${parts.minute}`,
  };
}

function createRunJob({ triggeredBy, categoryFilter, categories, total }) {
  const aiConfig = getEvergreenClaudeConfig();
  return {
    id: randomUUID(),
    runId: randomUUID(),
    status: 'running',
    triggeredBy,
    categoryFilter,
    total,
    done: 0,
    generated: 0,
    pending: 0,
    published: 0,
    failed: 0,
    skippedCount: 0,
    duplicatesRejected: 0,
    currentPhase: 'starting',
    currentCategory: null,
    currentTitle: null,
    currentModel: aiConfig.ideaModel || null,
    configuredModel: aiConfig.ideaModel || null,
    waitingSeconds: 0,
    rateLimited: false,
    categoryBreakdown: categories.map((c) => ({
      category: c.name,
      requested: Math.max(0, Number(c.articlesPerDay) || 0),
      done: 0,
      failed: 0,
    })),
    errors: [],
    details: [],
    summary: null,
    logId: null,
    startedAt: Date.now(),
    finishedAt: null,
    control: {
      paused: false,
      stopped: false,
      skipCurrent: false,
      skipWait: false,
    },
  };
}

async function loadExistingTopics(category) {
  return Article.find({
    contentType: 'evergreen',
    category,
    reviewStatus: { $in: ['pending', 'published', 'approved'] },
  })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(300)
    .select('title targetKeyword topicHash')
    .lean();
}

async function generateTopicIdeas(category, count, existingRows, job) {
  const existingList = existingRows
    .map((r) => `- ${r.title}${r.targetKeyword ? ` (${r.targetKeyword})` : ''}`)
    .join('\n');

  const prompt = `You are an SEO content strategist for a website monetized through display advertising. Category: ${category}.

Generate ${count} article topic ideas that are:
- Evergreen: not tied to any current event, date, or news cycle
- Self-help / how-to / practical guide format: the kind of specific question people type into Google when trying to solve a real problem
- High realistic search intent: specific and long-tail enough to plausibly rank (avoid overly broad topics like 'how to save money')
- NOT duplicates or close variants of any of these existing titles:
${existingList || '(none yet)'}

Return ONLY a JSON object with key "ideas" containing an array, no preamble:
{"ideas":[{"title":"","target_keyword":"","search_intent":"informational|commercial|transactional","one_line_angle":"","slug":""}]}`;

  touchJob(job, { currentPhase: 'ideating', currentCategory: category, currentTitle: null });

  const { content, usage, costUsd, model } = await evergreenClaudeChat({
    purpose: 'idea',
    maxTokens: 2000,
    temperature: 0.5,
    messages: [{ role: 'user', content: prompt }],
    onModelAttempt: (m) => touchJob(job, { currentModel: m }),
  });

  touchJob(job, { currentModel: model });

  let ideas = parseClaudeJson(content);
  if (!Array.isArray(ideas)) ideas = ideas?.ideas || [];
  return { ideas, usage, costUsd, model };
}

async function requestReplacementIdea(category, existingRows, rejectedTitle, job) {
  const existingList = existingRows.map((r) => r.title).join('; ');
  const prompt = `Category: ${category}. The topic "${rejectedTitle}" was too similar to existing content: ${existingList}.
Propose ONE replacement evergreen self-help/how-to topic. Return JSON: {"ideas":[{"title":"","target_keyword":"","search_intent":"informational|commercial|transactional","one_line_angle":"","slug":""}]}`;

  const { content, usage, costUsd, model } = await evergreenClaudeChat({
    purpose: 'idea',
    maxTokens: 800,
    messages: [{ role: 'user', content: prompt }],
    onModelAttempt: (m) => touchJob(job, { currentModel: m }),
  });
  touchJob(job, { currentModel: model });
  let ideas = parseClaudeJson(content);
  if (!Array.isArray(ideas)) ideas = ideas?.ideas || [];
  return { idea: ideas[0], usage, costUsd, model };
}

async function dedupeIdeas(ideas, existingRows, category, stats, job) {
  touchJob(job, { currentPhase: 'deduping' });
  const accepted = [];
  for (const idea of ideas) {
    if (!idea?.title) continue;
    let current = idea;
    let attempts = 0;
    while (attempts < 3) {
      assertNotStopped(job);
      await waitWhilePaused(job);
      const check = isDuplicateTopic(current, [...existingRows, ...accepted.map((a) => ({
        title: a.title,
        targetKeyword: a.target_keyword || a.targetKeyword,
        topicHash: computeTopicHash(a.title, a.target_keyword || a.targetKeyword),
      }))]);
      if (!check.duplicate) {
        accepted.push({ ...current, topicHash: check.hash });
        break;
      }
      stats.duplicatesRejected += 1;
      if (job) job.duplicatesRejected = stats.duplicatesRejected;
      attempts += 1;
      const repl = await requestReplacementIdea(category, existingRows, current.title, job);
      stats.usage.input += repl.usage?.prompt_tokens || repl.usage?.input_tokens || 0;
      stats.usage.output += repl.usage?.completion_tokens || repl.usage?.output_tokens || 0;
      stats.costUsd += repl.costUsd || 0;
      if (!repl.idea?.title) break;
      current = repl.idea;
    }
  }
  return accepted;
}

async function writeEvergreenArticle(topic, category, job) {
  const ymylNote = YMYL.has(category)
    ? `- Include a clear, natural disclaimer near the end stating this is general educational information, not personalized financial/legal/medical advice, and that readers should consult a licensed professional for their specific situation`
    : '';

  const prompt = `Write a complete, engaging article for a general-audience website.

Title: ${topic.title}
Target keyword: ${topic.target_keyword || topic.targetKeyword}
Category: ${category}
Search intent: ${topic.search_intent || topic.searchIntent || 'informational'}

Requirements:
- Sharpen the headline to be catchy and benefit-driven if you can improve it, but keep it accurate
- Opening hook: 2-3 sentences that name the reader's problem or create curiosity
- 1,200-1,800 words, scannable with H2/H3 subheadings, short paragraphs
- Practical, actionable, self-help tone with concrete steps and numbered/bulleted lists
- Include a 3-4 question FAQ section at the end
- End with a short 'Key takeaways' bullet summary
- Do NOT invent statistics, studies, named experts, or quotes
- Avoid AI filler phrases ('in today's fast-paced world', 'in conclusion', 'delve into')
- This article is published as-is with NO human editing. NEVER include placeholder text, editor notes, or instructions such as '(Note: insert a download link here)', '[insert link]', 'in a real article…', 'replace this with…', 'TODO', or 'download your free template here'. Do not reference downloads, links, images, or resources that you cannot actually provide. Every sentence must be final, publish-ready copy.
${ymylNote}

Return ONLY JSON:
{"headline":"","meta_description":"","body_html":"","faq":[{"question":"","answer":""}],"suggested_image_keywords":["","",""],"tags":["","","","",""]}`;

  touchJob(job, {
    currentPhase: 'writing',
    currentTitle: topic.title,
    currentCategory: category,
  });

  const { content, usage, costUsd, model } = await evergreenClaudeChat({
    purpose: 'write',
    maxTokens: 8000,
    temperature: 0.45,
    messages: [{ role: 'user', content: prompt }],
    onModelAttempt: (m) => touchJob(job, { currentModel: m }),
  });

  touchJob(job, { currentModel: model });
  const article = parseClaudeJson(content);
  return { article, usage, costUsd, model };
}

async function attachHeroImage(articleJson, slugHint, job) {
  touchJob(job, { currentPhase: 'imaging' });
  const keywords = articleJson.suggested_image_keywords || articleJson.suggestedImageKeywords || [];
  const licensed = await resolveLicensedHeroImage({
    title: articleJson.headline,
    category: 'guide',
    keywords,
  });

  let url = licensed?.url;
  let imageSourceType = licensed?.source || 'ai_generated';
  if (url) {
    try {
      url = await persistFeaturedImageIfRemote(url, slugHint);
    } catch (err) {
      logger.warn('Evergreen hero persist failed', err.message);
    }
  }

  return {
    url,
    credit: licensed?.credit || '',
    creditUrl: licensed?.creditUrl || '',
    source: imageSourceType,
    attribution: buildImageAttribution(licensed),
  };
}

async function saveEvergreenArticle({
  topic,
  articleJson,
  category,
  requireApproval,
  aiModelUsed,
  tokenCost,
  hero,
}) {
  const title = articleJson.headline || topic.title;
  const slugBase = slugify(topic.slug || title);
  const slug = await ensureUniqueSlug(slugBase);
  const body = stripEditorPlaceholders(articleJson.body_html || articleJson.bodyHtml || '');
  const summary = (articleJson.meta_description || articleJson.metaDescription || '').slice(0, 320);
  const now = new Date();
  const published = !requireApproval;
  const originalUrl = `evergreen://${slug}-${Date.now()}`;

  const doc = await Article.create({
    title,
    slug,
    summary: summary || body.replace(/<[^>]+>/g, ' ').slice(0, 280),
    body,
    category,
    tags: Array.isArray(articleJson.tags) ? articleJson.tags.slice(0, 8) : [],
    author: 'The Daily Lens Guides',
    contentType: 'evergreen',
    isEvergreen: true,
    sourceType: 'evergreen-pipeline',
    targetKeyword: topic.target_keyword || topic.targetKeyword || '',
    searchIntent: topic.search_intent || topic.searchIntent || 'informational',
    rpmTier: DEFAULT_RPM_TIERS[category] || '',
    topicHash: topic.topicHash || computeTopicHash(title, topic.target_keyword),
    faq: Array.isArray(articleJson.faq) ? articleJson.faq.slice(0, 6) : [],
    reviewStatus: published ? 'published' : 'pending',
    isPublished: published,
    publishedAt: published ? now : null,
    generatedAt: now,
    aiModelUsed,
    tokenCost,
    imageSourceType: hero.source || '',
    imageAttribution: hero.attribution || '',
    featuredImage: hero.url || '',
    heroImage: hero.url
      ? {
          url: hero.url,
          alt: title,
          credit: hero.credit,
          creditUrl: hero.creditUrl,
          source: hero.source,
        }
      : undefined,
    originalUrl,
    urlHash: hashUrl(originalUrl),
  });

  if (published) {
    await Category.updateOne({ name: category }, { $inc: { articleCount: 1 } }).catch(() => {});
    invalidateSitemapCache();
  }

  return doc;
}

async function processArticleWithRetry(topic, cat, stats, job, articleIndex) {
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    assertNotStopped(job);
    if (job?.control?.skipCurrent) {
      clearSkipFlag(job);
      throw new SkipArticleError();
    }
    await waitWhilePaused(job);
    try {
      const written = await writeEvergreenArticle(topic, cat.name, job);
      stats.usage.input += written.usage?.prompt_tokens || written.usage?.input_tokens || 0;
      stats.usage.output += written.usage?.completion_tokens || written.usage?.output_tokens || 0;
      stats.costUsd += written.costUsd || 0;

      const hero = await attachHeroImage(written.article, slugify(topic.slug || topic.title), job);
      touchJob(job, { currentPhase: 'saving' });

      const saved = await saveEvergreenArticle({
        topic,
        articleJson: written.article,
        category: cat.name,
        requireApproval: !!cat.requireApproval,
        aiModelUsed: written.model,
        tokenCost: written.costUsd,
        hero,
      });

      stats.generated += 1;
      if (saved.reviewStatus === 'pending') stats.pending += 1;
      if (saved.reviewStatus === 'published') stats.published += 1;
      stats.details.push({
        category: cat.name,
        title: saved.title,
        slug: saved.slug,
        action: 'created',
        reviewStatus: saved.reviewStatus,
        aiModelUsed: written.model,
      });

      const breakdown = job?.categoryBreakdown?.find((b) => b.category === cat.name);
      if (breakdown) breakdown.done += 1;

      touchJob(job, {
        generated: stats.generated,
        pending: stats.pending,
        published: stats.published,
        details: [...stats.details],
        categoryBreakdown: job?.categoryBreakdown ? [...job.categoryBreakdown] : [],
        rateLimited: false,
        waitingSeconds: 0,
      });

      if (articleIndex > 0) {
        touchJob(job, {
          currentPhase: 'waiting_gap',
          waitingSeconds: Math.round(ARTICLE_GAP_MS / 1000),
        });
        await sleepInterruptible(ARTICLE_GAP_MS, job);
      }

      return saved;
    } catch (err) {
      lastErr = err;
      if (err instanceof SkipArticleError || err instanceof StopRunError) throw err;
      if (job?.control?.skipCurrent) {
        clearSkipFlag(job);
        throw new SkipArticleError();
      }
      if (isAiRateLimitError(err) && attempt < 2) {
        const waitMs = parseRetryAfterMs(err);
        touchJob(job, {
          currentPhase: 'waiting_rate_limit',
          rateLimited: true,
          waitingSeconds: Math.round(waitMs / 1000),
        });
        await sleepInterruptible(waitMs, job);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

export async function runEvergreenPipeline({
  triggeredBy = 'manual',
  categoryFilter = null,
  job = null,
} = {}) {
  if (!job && pipelineRunning) {
    const err = new Error('Evergreen pipeline is already running');
    err.status = 409;
    throw err;
  }
  if (!isEvergreenClaudeConfigured()) {
    const err = new Error('OPENROUTER_API_KEY, BLUESMINDS_API_KEY, or GROQ_API_KEY is not configured');
    err.status = 503;
    throw err;
  }

  if (!job) pipelineRunning = true;

  const config = await getEvergreenConfig();
  const categories = (config.categories || []).filter(
    (c) => c.enabled && (!categoryFilter || c.name === categoryFilter),
  );
  const total = categories.reduce((sum, c) => sum + Math.max(0, Number(c.articlesPerDay) || 0), 0);

  if (job) {
    touchJob(job, { total, categoryBreakdown: job.categoryBreakdown, currentPhase: 'starting' });
  }

  const runId = job?.runId || crypto.randomUUID();
  const log = await EvergreenPipelineLog.create({
    runId,
    triggeredBy,
    status: 'running',
    categoriesRun: [],
  });

  if (job) job.logId = log._id.toString();

  const stats = {
    generated: 0,
    pending: 0,
    published: 0,
    duplicatesRejected: 0,
    usage: { input: 0, output: 0 },
    costUsd: 0,
    errors: [],
    details: [],
  };

  let stoppedByUser = false;

  try {
    let articleIndex = 0;

    for (const cat of categories) {
      assertNotStopped(job);
      await waitWhilePaused(job);

      const count = Math.max(0, Number(cat.articlesPerDay) || 0);
      if (!count) continue;

      log.categoriesRun.push(cat.name);
      const existingRows = await loadExistingTopics(cat.name);

      try {
        const ideaResult = await generateTopicIdeas(cat.name, count, existingRows, job);
        stats.usage.input += ideaResult.usage?.prompt_tokens || ideaResult.usage?.input_tokens || 0;
        stats.usage.output += ideaResult.usage?.completion_tokens || ideaResult.usage?.output_tokens || 0;
        stats.costUsd += ideaResult.costUsd || 0;

        const topics = await dedupeIdeas(ideaResult.ideas || [], existingRows, cat.name, stats, job);

        for (const topic of topics.slice(0, count)) {
          assertNotStopped(job);
          await waitWhilePaused(job);

          if (job?.control?.skipCurrent) {
            clearSkipFlag(job);
            stats.errors.push(`${cat.name}: skipped ${topic.title}`);
            stats.details.push({ category: cat.name, title: topic.title, action: 'skipped' });
            job.skippedCount = (job.skippedCount || 0) + 1;
            const breakdown = job.categoryBreakdown?.find((b) => b.category === cat.name);
            if (breakdown) breakdown.failed += 1;
            touchJob(job, {
              failed: (job.failed || 0) + 1,
              skippedCount: job.skippedCount,
              errors: [...stats.errors],
              details: [...stats.details],
            });
            continue;
          }

          try {
            await processArticleWithRetry(topic, cat, stats, job, articleIndex);
            articleIndex += 1;
          } catch (err) {
            if (err instanceof StopRunError) {
              stoppedByUser = true;
              throw err;
            }
            if (err instanceof SkipArticleError) {
              stats.errors.push(`${cat.name}: skipped ${topic.title}`);
              stats.details.push({ category: cat.name, title: topic.title, action: 'skipped' });
              job.skippedCount = (job.skippedCount || 0) + 1;
              job.failed = (job.failed || 0) + 1;
              const breakdown = job.categoryBreakdown?.find((b) => b.category === cat.name);
              if (breakdown) breakdown.failed += 1;
              touchJob(job, {
                failed: job.failed,
                skippedCount: job.skippedCount,
                errors: [...stats.errors],
                details: [...stats.details],
              });
              continue;
            }
            stats.errors.push(`${cat.name}: ${err.message}`);
            job.failed = (job.failed || 0) + 1;
            const breakdown = job.categoryBreakdown?.find((b) => b.category === cat.name);
            if (breakdown) breakdown.failed += 1;
            touchJob(job, {
              failed: job.failed,
              errors: [...stats.errors],
              categoryBreakdown: job?.categoryBreakdown ? [...job.categoryBreakdown] : [],
            });
            logger.error('Evergreen article failed', cat.name, err.message);
          }
        }
      } catch (err) {
        if (err instanceof StopRunError) {
          stoppedByUser = true;
          throw err;
        }
        stats.errors.push(`${cat.name} ideation: ${err.message}`);
        touchJob(job, { errors: [...stats.errors] });
      }
    }

    const finalStatus = stats.errors.length ? (stats.generated ? 'partial' : 'failed') : 'success';
    const summary = stoppedByUser
      ? `Stopped — ${stats.generated} generated (${stats.published} live, ${stats.pending} pending)`
      : stats.errors.length
        ? `${stats.generated} generated (${stats.published} live, ${stats.pending} pending), ${stats.errors.length} issues`
        : `${stats.generated} generated (${stats.published} live, ${stats.pending} pending)`;

    await EvergreenPipelineLog.findByIdAndUpdate(log._id, {
      finishedAt: new Date(),
      status: stoppedByUser ? 'partial' : finalStatus,
      categoriesRun: log.categoriesRun,
      articlesGenerated: stats.generated,
      articlesPending: stats.pending,
      articlesPublished: stats.published,
      duplicatesRejected: stats.duplicatesRejected,
      failureMessages: stats.errors,
      tokenUsage: stats.usage,
      tokenCostUsd: stats.costUsd,
      details: stats.details,
    });

    if (job) {
      touchJob(job, {
        status: stoppedByUser ? 'stopped' : finalStatus === 'failed' ? 'error' : finalStatus === 'partial' ? 'partial' : 'complete',
        currentPhase: stoppedByUser ? 'stopped' : finalStatus === 'failed' ? 'error' : 'complete',
        summary,
        generated: stats.generated,
        pending: stats.pending,
        published: stats.published,
        duplicatesRejected: stats.duplicatesRejected,
        errors: stats.errors,
        details: stats.details,
        finishedAt: Date.now(),
        currentTitle: null,
        waitingSeconds: 0,
      });
    }

    return { runId, ...stats, summary, status: job?.status || finalStatus };
  } catch (err) {
    if (err instanceof StopRunError) {
      stoppedByUser = true;
      const summary = `Stopped — ${stats.generated} generated (${stats.published} live, ${stats.pending} pending)`;
      await EvergreenPipelineLog.findByIdAndUpdate(log._id, {
        finishedAt: new Date(),
        status: 'partial',
        categoriesRun: log.categoriesRun,
        articlesGenerated: stats.generated,
        articlesPending: stats.pending,
        articlesPublished: stats.published,
        duplicatesRejected: stats.duplicatesRejected,
        failureMessages: stats.errors,
        tokenUsage: stats.usage,
        tokenCostUsd: stats.costUsd,
        details: stats.details,
      });
      if (job) {
        touchJob(job, {
          status: 'stopped',
          currentPhase: 'stopped',
          summary,
          generated: stats.generated,
          pending: stats.pending,
          published: stats.published,
          finishedAt: Date.now(),
        });
      }
      return { runId, ...stats, summary, status: 'stopped' };
    }

    if (job) {
      touchJob(job, {
        status: 'error',
        currentPhase: 'error',
        summary: err.message,
        finishedAt: Date.now(),
      });
    }
    throw err;
  } finally {
    if (!job) pipelineRunning = false;
  }
}

export async function startEvergreenRunJob({ triggeredBy = 'manual', categoryFilter = null } = {}) {
  cleanupOldRunJobs();
  const active = getActiveEvergreenRunJob();
  if (active) {
    const err = new Error('Evergreen pipeline is already running');
    err.status = 409;
    err.jobId = active.id;
    throw err;
  }

  const config = await getEvergreenConfig();
  const categories = (config.categories || []).filter(
    (c) => c.enabled && (!categoryFilter || c.name === categoryFilter),
  );
  const total = categories.reduce((sum, c) => sum + Math.max(0, Number(c.articlesPerDay) || 0), 0);

  if (!total) {
    const err = new Error('No enabled categories with articles to generate');
    err.status = 400;
    throw err;
  }

  const job = createRunJob({ triggeredBy, categoryFilter, categories, total });
  runJobs.set(job.id, job);
  pipelineRunning = true;

  runEvergreenPipeline({ triggeredBy, categoryFilter, job })
    .catch((err) => {
      const j = runJobs.get(job.id);
      if (j && j.status === 'running') {
        touchJob(j, {
          status: 'error',
          currentPhase: 'error',
          summary: err.message || 'Run failed',
          finishedAt: Date.now(),
        });
      }
      logger.error('Evergreen job failed', err);
    })
    .finally(() => {
      pipelineRunning = false;
    });

  return {
    jobId: job.id,
    total,
    categoryFilter,
    configuredModel: job.configuredModel,
  };
}

export function getEvergreenRunJob(jobId) {
  cleanupOldRunJobs();
  return runJobs.get(jobId) || null;
}

export function getActiveEvergreenRunJob() {
  cleanupOldRunJobs();
  for (const job of runJobs.values()) {
    if (job.status === 'running') return job;
  }
  return null;
}

/** pause | continue | stop | skip */
export function controlEvergreenRun(jobId, action) {
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
        touchJob(job, { currentPhase: 'writing' });
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
    default:
      return null;
  }

  return job;
}

export async function tickEvergreenScheduler() {
  const config = await getEvergreenConfig();
  if (!config.enabled) return;

  const { date, hm } = localTimeKey(config.timezone || 'Asia/Karachi');
  const runTime = config.runTime || '06:00';
  if (hm !== runTime || config.lastRunDate === date) return;

  logger.info('Evergreen scheduled run starting', { date, hm });
  await updateEvergreenConfig({ lastRunDate: date });
  try {
    await startEvergreenRunJob({ triggeredBy: 'schedule' });
  } catch (err) {
    logger.error('Evergreen scheduled run failed', err.message);
  }
}

export async function listPendingEvergreen({ page = 1, limit = 20 } = {}) {
  const skip = (page - 1) * limit;
  const filter = { contentType: 'evergreen', reviewStatus: 'pending' };
  const [items, total] = await Promise.all([
    Article.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Article.countDocuments(filter),
  ]);
  return {
    items: items.map((a) => ({
      ...a,
      wordCount: String(a.body || '').replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length,
    })),
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
}

export async function approveEvergreenArticle(id, { body } = {}) {
  const article = await Article.findOne({
    _id: id,
    contentType: 'evergreen',
    reviewStatus: 'pending',
  });
  if (!article) {
    const err = new Error('Pending article not found');
    err.status = 404;
    throw err;
  }
  if (body?.trim()) {
    article.body = body.trim();
    article.readTime = estimateReadTime(article.body);
  }
  article.reviewStatus = 'published';
  article.isPublished = true;
  article.publishedAt = new Date();
  await article.save();
  await Category.updateOne({ name: article.category }, { $inc: { articleCount: 1 } }).catch(() => {});
  invalidateSitemapCache();
  return article.toObject();
}

export async function rejectEvergreenArticle(id) {
  const article = await Article.findOneAndUpdate(
    { _id: id, contentType: 'evergreen', reviewStatus: 'pending' },
    { reviewStatus: 'rejected', isPublished: false },
    { new: true },
  );
  if (!article) {
    const err = new Error('Pending article not found');
    err.status = 404;
    throw err;
  }
  return article.toObject();
}

export async function listEvergreenPipelineLogs(limit = 20) {
  return EvergreenPipelineLog.find().sort({ createdAt: -1 }).limit(limit).lean();
}

export function isEvergreenPipelineRunning() {
  return pipelineRunning || !!getActiveEvergreenRunJob();
}
