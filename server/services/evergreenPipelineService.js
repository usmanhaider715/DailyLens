import crypto from 'crypto';
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
import { slugify } from '../utils/slugify.js';
import { invalidateSitemapCache } from '../services/sitemapService.js';
import { logger } from '../utils/logger.js';

const YMYL = new Set(['Finance', 'Insurance', 'Legal', 'Health']);
let pipelineRunning = false;

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

async function generateTopicIdeas(category, count, existingRows) {
  const config = getEvergreenClaudeConfig();
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

  const { content, usage, costUsd, model } = await evergreenClaudeChat({
    purpose: 'idea',
    maxTokens: 2000,
    temperature: 0.5,
    messages: [{ role: 'user', content: prompt }],
  });

  let ideas = parseClaudeJson(content);
  if (!Array.isArray(ideas)) ideas = ideas?.ideas || [];
  return { ideas, usage, costUsd, model };
}

async function requestReplacementIdea(category, existingRows, rejectedTitle) {
  const config = getEvergreenClaudeConfig();
  const existingList = existingRows.map((r) => r.title).join('; ');
  const prompt = `Category: ${category}. The topic "${rejectedTitle}" was too similar to existing content: ${existingList}.
Propose ONE replacement evergreen self-help/how-to topic. Return JSON: {"ideas":[{"title":"","target_keyword":"","search_intent":"informational|commercial|transactional","one_line_angle":"","slug":""}]}`;

  const { content, usage, costUsd, model } = await evergreenClaudeChat({
    purpose: 'idea',
    maxTokens: 800,
    messages: [{ role: 'user', content: prompt }],
  });
  let ideas = parseClaudeJson(content);
  if (!Array.isArray(ideas)) ideas = ideas?.ideas || [];
  return { idea: ideas[0], usage, costUsd, model };
}

async function dedupeIdeas(ideas, existingRows, category, stats) {
  const accepted = [];
  for (const idea of ideas) {
    if (!idea?.title) continue;
    let current = idea;
    let attempts = 0;
    while (attempts < 3) {
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
      attempts += 1;
      const repl = await requestReplacementIdea(category, existingRows, current.title);
      stats.usage.input += repl.usage?.prompt_tokens || repl.usage?.input_tokens || 0;
      stats.usage.output += repl.usage?.completion_tokens || repl.usage?.output_tokens || 0;
      stats.costUsd += repl.costUsd || 0;
      if (!repl.idea?.title) break;
      current = repl.idea;
    }
  }
  return accepted;
}

async function writeEvergreenArticle(topic, category) {
  const config = getEvergreenClaudeConfig();
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
${ymylNote}

Return ONLY JSON:
{"headline":"","meta_description":"","body_html":"","faq":[{"question":"","answer":""}],"suggested_image_keywords":["","",""],"tags":["","","","",""]}`;

  const { content, usage, costUsd, model } = await evergreenClaudeChat({
    purpose: 'write',
    maxTokens: 8000,
    temperature: 0.45,
    messages: [{ role: 'user', content: prompt }],
  });

  const article = parseClaudeJson(content);
  return { article, usage, costUsd, model };
}

async function attachHeroImage(articleJson, slugHint) {
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
  const body = articleJson.body_html || articleJson.bodyHtml || '';
  const summary = (articleJson.meta_description || articleJson.metaDescription || '').slice(0, 320);
  const now = new Date();
  const published = !requireApproval;

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
    originalUrl: `evergreen://${slug}-${Date.now()}`,
  });

  if (published) {
    await Category.updateOne({ name: category }, { $inc: { articleCount: 1 } }).catch(() => {});
    invalidateSitemapCache();
  }

  return doc;
}

export async function runEvergreenPipeline({ triggeredBy = 'manual', categoryFilter = null } = {}) {
  if (pipelineRunning) {
    const err = new Error('Evergreen pipeline is already running');
    err.status = 409;
    throw err;
  }
  if (!isEvergreenClaudeConfigured()) {
    const err = new Error('EVERGREEN_CLAUDE_API_KEY is not configured');
    err.status = 503;
    throw err;
  }

  pipelineRunning = true;
  const runId = crypto.randomUUID();
  const config = await getEvergreenConfig();
  const log = await EvergreenPipelineLog.create({
    runId,
    triggeredBy,
    status: 'running',
    categoriesRun: [],
  });

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

  try {
    const categories = (config.categories || []).filter(
      (c) => c.enabled && (!categoryFilter || c.name === categoryFilter),
    );

    for (const cat of categories) {
      const count = Math.max(0, Number(cat.articlesPerDay) || 0);
      if (!count) continue;

      log.categoriesRun.push(cat.name);
      const existingRows = await loadExistingTopics(cat.name);

      try {
        const ideaResult = await generateTopicIdeas(cat.name, count, existingRows);
        stats.usage.input += ideaResult.usage?.prompt_tokens || ideaResult.usage?.input_tokens || 0;
        stats.usage.output += ideaResult.usage?.completion_tokens || ideaResult.usage?.output_tokens || 0;
        stats.costUsd += ideaResult.costUsd || 0;

        const topics = await dedupeIdeas(ideaResult.ideas || [], existingRows, cat.name, stats);

        for (const topic of topics.slice(0, count)) {
          try {
            const written = await writeEvergreenArticle(topic, cat.name);
            stats.usage.input += written.usage?.prompt_tokens || written.usage?.input_tokens || 0;
            stats.usage.output += written.usage?.completion_tokens || written.usage?.output_tokens || 0;
            stats.costUsd += written.costUsd || 0;

            const hero = await attachHeroImage(written.article, slugify(topic.slug || topic.title));
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
            });
          } catch (err) {
            stats.errors.push(`${cat.name}: ${err.message}`);
            logger.error('Evergreen article failed', cat.name, err.message);
          }
        }
      } catch (err) {
        stats.errors.push(`${cat.name} ideation: ${err.message}`);
      }
    }

    await EvergreenPipelineLog.findByIdAndUpdate(log._id, {
      finishedAt: new Date(),
      status: stats.errors.length ? (stats.generated ? 'partial' : 'failed') : 'success',
      articlesGenerated: stats.generated,
      articlesPending: stats.pending,
      articlesPublished: stats.published,
      duplicatesRejected: stats.duplicatesRejected,
      failureMessages: stats.errors,
      tokenUsage: stats.usage,
      tokenCostUsd: stats.costUsd,
      details: stats.details,
    });

    return { runId, ...stats };
  } finally {
    pipelineRunning = false;
  }
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
    await runEvergreenPipeline({ triggeredBy: 'schedule' });
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
  return pipelineRunning;
}
