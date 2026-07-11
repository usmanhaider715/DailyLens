import axios from 'axios';
import { getSiteSettings } from '../models/SiteSettings.js';
import { normalizeSeoArticleOutput } from '../utils/seoArticleNormalize.js';
import { finalizeSeoArticleBody } from '../utils/finalizeSeoArticle.js';
import {
  SEO_ARTICLE_SYSTEM,
  SEO_ARTICLE_SYSTEM_FAST,
  buildSeoArticleUserPrompt,
  buildCompactSeoArticleUserPrompt,
  buildBluesmindsSeoArticleUserPrompt,
} from './seoArticlePrompt.js';
import {
  bluesmindsChatCompletion,
  bluesmindsErrorMessage,
  isBluesmindsConfigured,
  isBluesmindsRateLimitError,
  shouldFallbackFromBluesminds,
} from '../lib/bluesminds.js';
import {
  getOpenRouterConfig,
  isOpenRouterConfigured,
  isOpenRouterContentError,
  isOpenRouterRateLimitError,
  isOpenRouterRetryableError,
  openRouterChatCompletion,
  openRouterErrorMessage,
  parseJsonFromModelText,
} from '../lib/openrouter.js';
import { logger } from '../utils/logger.js';
import { verifyArticleQuotes, mapModelToRewriteLabel } from '../utils/quoteVerification.js';
import { logAiFallback } from '../models/AiFallbackLog.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_FALLBACK_MODEL = 'llama-3.1-8b-instant';
const ARTICLE_MAX_TOKENS =
  Number(process.env.OPENROUTER_MAX_TOKENS) ||
  Number(process.env.GROQ_MAX_TOKENS) ||
  6000;

function parseJsonFromText(text) {
  return parseJsonFromModelText(text);
}

export function groqErrorMessage(err) {
  return bluesmindsErrorMessage(err) || openRouterErrorMessage(err) || groqOnlyErrorMessage(err);
}

function groqOnlyErrorMessage(err) {
  const apiMsg = err?.response?.data?.error?.message;
  if (apiMsg) return apiMsg;
  return err?.message || 'AI generation failed';
}

export function isGroqRateLimitError(err) {
  return err?.response?.status === 429 || /rate limit/i.test(groqErrorMessage(err));
}

export function isAiRateLimitError(err) {
  return isBluesmindsRateLimitError(err) || isOpenRouterRateLimitError(err) || isGroqRateLimitError(err);
}

export function isAiContentError(err) {
  return isOpenRouterContentError(err);
}

/** Parse "try again in 37.32s" from Groq/OpenRouter 429 messages */
export function parseRetryAfterMs(err, fallbackMs = 40000) {
  const msg = groqErrorMessage(err);
  const match = msg.match(/try again in ([\d.]+)\s*s/i);
  if (match) {
    return Math.ceil(Number(match[1]) * 1000) + 500;
  }
  const header = err?.response?.headers?.['retry-after'];
  if (header) {
    const sec = Number(header);
    if (!Number.isNaN(sec)) return sec * 1000;
  }
  return fallbackMs;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function modelChain() {
  const primary = process.env.GROQ_MODEL || DEFAULT_MODEL;
  const fallback = process.env.GROQ_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL;
  return [...new Set([primary, fallback].filter(Boolean))];
}

function shouldFallbackFromOpenRouterToGroq(err) {
  if (!process.env.GROQ_API_KEY) return false;
  if (isOpenRouterRetryableError(err) || isOpenRouterContentError(err)) return true;
  const status = err?.response?.status;
  return status === 402 || status === 403;
}

async function requestGroq(apiKey, model, userPrompt, { jsonMode = true } = {}) {
  const body = {
    model,
    messages: [
      { role: 'system', content: SEO_ARTICLE_SYSTEM },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: ARTICLE_MAX_TOKENS,
    temperature: 0.3,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  try {
    const { data } = await axios.post(GROQ_URL, body, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
    });

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error(data?.error?.message || 'Empty response from Groq');
    }
    return content;
  } catch (err) {
    if (err.response) {
      const wrapped = new Error(groqErrorMessage(err));
      wrapped.response = err.response;
      throw wrapped;
    }
    throw err;
  }
}

async function finalizeFromParsed(parsed, rawArticle, modelLabel) {
  const normalized = normalizeSeoArticleOutput(parsed, rawArticle);
  const sourceText = rawArticle.content || rawArticle.description || rawArticle.title || '';
  const quoteCheck = verifyArticleQuotes(normalized.body, sourceText);
  if (quoteCheck.rejected) {
    const err = new Error('Article rejected: unverified quotes in rewrite');
    err.code = 'UNVERIFIED_QUOTES';
    throw err;
  }
  normalized.body = quoteCheck.body;
  normalized.verifiedQuotes = quoteCheck.verified;
  normalized.rewriteModel = mapModelToRewriteLabel(modelLabel);
  const finalized = finalizeSeoArticleBody(normalized, rawArticle);
  finalized.sourceAttribution = {
    sourceName: rawArticle.sourceName,
    sourceUrl: rawArticle.url || rawArticle.sourceUrl,
  };
  finalized.aiModelUsed = modelLabel;
  finalized.verifiedQuotes = quoteCheck.verified;
  finalized.rewriteModel = normalized.rewriteModel;
  return finalized;
}

async function parseAndFinalize(content, rawArticle, modelLabel) {
  const parsed = parseJsonFromText(content);
  return finalizeFromParsed(parsed, rawArticle, modelLabel);
}

async function generateWithBluesminds(rawArticle, bluesmindsPrompt, compactPrompt) {
  const attempts = [
    {
      system: SEO_ARTICLE_SYSTEM_FAST,
      prompt: bluesmindsPrompt,
      label: 'fast',
      maxTokens: Number(process.env.BLUESMINDS_MAX_TOKENS) || 3600,
    },
    {
      system: SEO_ARTICLE_SYSTEM,
      prompt: compactPrompt,
      label: 'compact',
      maxTokens: Number(process.env.BLUESMINDS_MAX_TOKENS) || 4200,
    },
  ];

  let lastErr;
  for (const attempt of attempts) {
    try {
      const { content, model } = await bluesmindsChatCompletion({
        messages: [
          { role: 'system', content: attempt.system },
          { role: 'user', content: attempt.prompt },
        ],
        jsonMode: true,
        temperature: 0.2,
        maxTokens: attempt.maxTokens,
      });
      return parseAndFinalize(content, rawArticle, `bluesminds/${model}`);
    } catch (err) {
      lastErr = err;
      logger.warn(`Bluesminds SEO attempt failed (${attempt.label})`, err.message);
      if (!shouldFallbackFromBluesminds(err) && !isOpenRouterContentError(err)) {
        throw err;
      }
    }
  }

  throw lastErr || new Error('Bluesminds SEO article generation failed');
}

async function generateWithOpenRouterAttempt(userPrompt, rawArticle, { jsonMode = true, temperature = 0.3 } = {}) {
  const { model } = getOpenRouterConfig();
  const { content, model: usedModel } = await openRouterChatCompletion({
    messages: [
      { role: 'system', content: SEO_ARTICLE_SYSTEM },
      { role: 'user', content: userPrompt },
    ],
    jsonMode,
    temperature,
    maxTokens: ARTICLE_MAX_TOKENS,
  });
  return parseAndFinalize(content, rawArticle, usedModel || model);
}

async function generateWithOpenRouter(rawArticle, userPrompt, compactPrompt) {
  const attempts = [
    { prompt: compactPrompt, jsonMode: true, temperature: 0.2, label: 'compact+json' },
    { prompt: userPrompt, jsonMode: false, temperature: 0.2, label: 'full+plain' },
  ];

  let lastErr;
  for (const attempt of attempts) {
    try {
      return await generateWithOpenRouterAttempt(attempt.prompt, rawArticle, {
        jsonMode: attempt.jsonMode,
        temperature: attempt.temperature,
      });
    } catch (err) {
      lastErr = err;
      logger.warn(`OpenRouter SEO attempt failed (${attempt.label})`, err.message);
      if (!isOpenRouterContentError(err) && !isOpenRouterRetryableError(err)) {
        throw err;
      }
    }
  }

  throw lastErr || new Error('OpenRouter SEO article generation failed');
}

async function generateWithGroqModel(apiKey, model, userPrompt, rawArticle, compactPrompt) {
  const prompts = [compactPrompt, userPrompt];
  let lastErr;

  for (const prompt of prompts) {
    for (const jsonMode of [true, false]) {
      try {
        const content = await requestGroq(apiKey, model, prompt, { jsonMode });
        return await parseAndFinalize(content, rawArticle, model);
      } catch (err) {
        lastErr = err;
        if (isGroqRateLimitError(err)) throw err;
        if (isOpenRouterContentError(err) && jsonMode) {
          logger.warn(`Groq ${model} JSON mode failed — retrying without response_format`);
          continue;
        }
        logger.warn(`Groq ${model} attempt failed`, err.message);
      }
    }
  }

  throw lastErr || new Error(`Groq ${model} generation failed`);
}

async function generateSeoArticleViaGroq(rawArticle, userPrompt, compactPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured on the server');
  }

  const models = modelChain();
  let lastErr;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      return await generateWithGroqModel(apiKey, model, userPrompt, rawArticle, compactPrompt);
    } catch (err) {
      lastErr = err;
      const hasFallback = i < models.length - 1;
      if (hasFallback && (isGroqRateLimitError(err) || isOpenRouterContentError(err))) {
        const waitMs = isGroqRateLimitError(err) ? parseRetryAfterMs(err, 5000) : 2000;
        logger.warn(`Groq ${model} failed — trying ${models[i + 1]} after ${Math.round(waitMs / 1000)}s`);
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }

  throw lastErr || new Error('Groq generation failed');
}

async function generateSeoArticleWithFallbacks(rawArticle, userPrompt, compactPrompt, bluesmindsPrompt) {
  if (isBluesmindsConfigured()) {
    try {
      return await generateWithBluesminds(rawArticle, bluesmindsPrompt, compactPrompt);
    } catch (err) {
      if (shouldFallbackFromBluesminds(err)) {
        logger.warn('Bluesminds failed — falling back to OpenRouter/Groq', bluesmindsErrorMessage(err));
        await logAiFallback({
          primaryProvider: 'bluesminds',
          fallbackProvider: isOpenRouterConfigured() ? 'openrouter' : 'groq',
          reason: 'bluesminds_failure',
          errorMessage: bluesmindsErrorMessage(err),
          articleTitle: rawArticle.title,
          sourceUrl: rawArticle.url || rawArticle.sourceUrl,
        });
      } else {
        throw err;
      }
    }
  }

  if (isOpenRouterConfigured()) {
    try {
      return await generateWithOpenRouter(rawArticle, userPrompt, compactPrompt);
    } catch (err) {
      if (shouldFallbackFromOpenRouterToGroq(err)) {
        logger.warn('OpenRouter failed — falling back to Groq', openRouterErrorMessage(err));
        await logAiFallback({
          primaryProvider: 'openrouter',
          fallbackProvider: 'groq',
          reason: 'openrouter_failure',
          errorMessage: openRouterErrorMessage(err),
          articleTitle: rawArticle.title,
          sourceUrl: rawArticle.url || rawArticle.sourceUrl,
        });
        try {
          return await generateSeoArticleViaGroq(rawArticle, userPrompt, compactPrompt);
        } catch (groqErr) {
          if (isGroqRateLimitError(groqErr) && isOpenRouterConfigured()) {
            logger.warn('Groq also rate limited — retrying OpenRouter compact prompt');
            await sleep(parseRetryAfterMs(groqErr));
            return generateWithOpenRouter(rawArticle, compactPrompt, compactPrompt);
          }
          throw groqErr;
        }
      }
      throw err;
    }
  }

  try {
    return await generateSeoArticleViaGroq(rawArticle, userPrompt, compactPrompt);
  } catch (groqErr) {
    if (isOpenRouterConfigured() && (isGroqRateLimitError(groqErr) || isOpenRouterContentError(groqErr))) {
      logger.warn('Groq failed — falling back to OpenRouter', groqErrorMessage(groqErr));
      await logAiFallback({
        primaryProvider: 'groq',
        fallbackProvider: 'openrouter',
        reason: 'groq_failure',
        errorMessage: groqErrorMessage(groqErr),
        articleTitle: rawArticle.title,
        sourceUrl: rawArticle.url || rawArticle.sourceUrl,
      });
      return generateWithOpenRouter(rawArticle, compactPrompt, compactPrompt);
    }
    throw groqErr;
  }
}

export async function generateSeoArticle(rawArticle) {
  const settings = await getSiteSettings();
  const tone = settings.articleTone || 'Neutral';
  const minW = settings.minWordCount ?? 500;
  const maxW = settings.maxWordCount ?? 800;
  const userPrompt = buildSeoArticleUserPrompt(rawArticle, tone, minW, maxW);
  const compactPrompt = buildCompactSeoArticleUserPrompt(rawArticle, tone, minW, maxW);
  const bluesmindsPrompt = buildBluesmindsSeoArticleUserPrompt(rawArticle, tone, minW, maxW);

  return generateSeoArticleWithFallbacks(rawArticle, userPrompt, compactPrompt, bluesmindsPrompt);
}

export { rewriteArticle } from '../lib/openrouter.js';
