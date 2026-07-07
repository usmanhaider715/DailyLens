import axios from 'axios';
import { getSiteSettings } from '../models/SiteSettings.js';
import { normalizeSeoArticleOutput } from '../utils/seoArticleNormalize.js';
import { finalizeSeoArticleBody } from '../utils/finalizeSeoArticle.js';
import { SEO_ARTICLE_SYSTEM, buildSeoArticleUserPrompt } from './seoArticlePrompt.js';
import {
  getOpenRouterConfig,
  isOpenRouterConfigured,
  isOpenRouterRateLimitError,
  isOpenRouterRetryableError,
  openRouterChatCompletion,
  openRouterErrorMessage,
  parseJsonFromModelText,
} from '../lib/openrouter.js';
import { logger } from '../utils/logger.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const DEFAULT_FALLBACK_MODEL = 'llama-3.1-8b-instant';

function parseJsonFromText(text) {
  return parseJsonFromModelText(text);
}

export function groqErrorMessage(err) {
  return openRouterErrorMessage(err) || groqOnlyErrorMessage(err);
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
  return isOpenRouterRateLimitError(err) || isGroqRateLimitError(err);
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

async function requestGroq(apiKey, model, userPrompt) {
  try {
    const { data } = await axios.post(
      GROQ_URL,
      {
        model,
        messages: [
          { role: 'system', content: SEO_ARTICLE_SYSTEM },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: Number(process.env.GROQ_MAX_TOKENS) || 4000,
        temperature: 0.3,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 120000,
      }
    );

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
  const finalized = finalizeSeoArticleBody(normalized, rawArticle);
  finalized.sourceAttribution = {
    sourceName: rawArticle.sourceName,
    sourceUrl: rawArticle.url || rawArticle.sourceUrl,
  };
  finalized.aiModelUsed = modelLabel;
  return finalized;
}

async function generateWithOpenRouter(userPrompt, rawArticle) {
  const { model } = getOpenRouterConfig();
  const { content, model: usedModel } = await openRouterChatCompletion({
    messages: [
      { role: 'system', content: SEO_ARTICLE_SYSTEM },
      { role: 'user', content: userPrompt },
    ],
    jsonMode: true,
    maxTokens: Number(process.env.OPENROUTER_MAX_TOKENS) || Number(process.env.GROQ_MAX_TOKENS) || 4000,
  });

  let parsed;
  try {
    parsed = parseJsonFromText(content);
  } catch (err) {
    logger.error('OpenRouter SEO article invalid JSON', err.message);
    throw err;
  }

  return finalizeFromParsed(parsed, rawArticle, usedModel || model);
}

async function generateWithGroqModel(apiKey, model, userPrompt, rawArticle) {
  let lastErr;
  const maxAttempts = 3;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const content = await requestGroq(apiKey, model, userPrompt);
      const parsed = parseJsonFromText(content);
      return finalizeFromParsed(parsed, rawArticle, model);
    } catch (err) {
      lastErr = err;
      if (attempt < maxAttempts - 1 && isGroqRateLimitError(err)) {
        const waitMs = parseRetryAfterMs(err);
        logger.warn(`Groq ${model} rate limited — waiting ${Math.round(waitMs / 1000)}s before retry`);
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

async function generateSeoArticleViaGroq(rawArticle, userPrompt) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured on the server');
  }

  const models = modelChain();
  let lastErr;

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    try {
      return await generateWithGroqModel(apiKey, model, userPrompt, rawArticle);
    } catch (err) {
      lastErr = err;
      const hasFallback = i < models.length - 1;
      if (hasFallback && isGroqRateLimitError(err)) {
        const waitMs = parseRetryAfterMs(err, 5000);
        logger.warn(`Groq ${model} exhausted — trying ${models[i + 1]} after ${Math.round(waitMs / 1000)}s`);
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }

  throw lastErr || new Error('Groq generation failed');
}

async function generateSeoArticleWithFallbacks(rawArticle, userPrompt) {
  if (isOpenRouterConfigured()) {
    try {
      return await generateWithOpenRouter(userPrompt, rawArticle);
    } catch (err) {
      const msg = openRouterErrorMessage(err);
      if (process.env.GROQ_API_KEY && isOpenRouterRetryableError(err)) {
        logger.warn('OpenRouter failed — falling back to Groq', msg);
        try {
          return await generateSeoArticleViaGroq(rawArticle, userPrompt);
        } catch (groqErr) {
          if (isGroqRateLimitError(groqErr)) {
            logger.warn('Groq also rate limited after OpenRouter — retrying OpenRouter once');
            await sleep(parseRetryAfterMs(groqErr));
            return generateWithOpenRouter(userPrompt, rawArticle);
          }
          throw groqErr;
        }
      }
      throw err;
    }
  }

  try {
    return await generateSeoArticleViaGroq(rawArticle, userPrompt);
  } catch (groqErr) {
    if (isOpenRouterConfigured() && isGroqRateLimitError(groqErr)) {
      logger.warn('All Groq models rate limited — falling back to OpenRouter', groqErrorMessage(groqErr));
      return generateWithOpenRouter(userPrompt, rawArticle);
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

  return generateSeoArticleWithFallbacks(rawArticle, userPrompt);
}

export { rewriteArticle } from '../lib/openrouter.js';
