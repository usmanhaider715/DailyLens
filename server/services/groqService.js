import axios from 'axios';
import { getSiteSettings } from '../models/SiteSettings.js';
import { normalizeSeoArticleOutput } from '../utils/seoArticleNormalize.js';
import { finalizeSeoArticleBody } from '../utils/finalizeSeoArticle.js';
import {
  SEO_ARTICLE_SYSTEM,
  buildSeoArticleUserPrompt,
  buildCompactSeoArticleUserPrompt,
} from './seoArticlePrompt.js';
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
  const finalized = finalizeSeoArticleBody(normalized, rawArticle);
  finalized.sourceAttribution = {
    sourceName: rawArticle.sourceName,
    sourceUrl: rawArticle.url || rawArticle.sourceUrl,
  };
  finalized.aiModelUsed = modelLabel;
  return finalized;
}

async function parseAndFinalize(content, rawArticle, modelLabel) {
  const parsed = parseJsonFromText(content);
  return finalizeFromParsed(parsed, rawArticle, modelLabel);
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
    { prompt: userPrompt, jsonMode: true, temperature: 0.3, label: 'full+json' },
    { prompt: userPrompt, jsonMode: false, temperature: 0.2, label: 'full+plain' },
    { prompt: compactPrompt, jsonMode: false, temperature: 0.2, label: 'compact+plain' },
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
  const prompts = [userPrompt, compactPrompt];
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

async function generateSeoArticleWithFallbacks(rawArticle, userPrompt, compactPrompt) {
  if (isOpenRouterConfigured()) {
    try {
      return await generateWithOpenRouter(rawArticle, userPrompt, compactPrompt);
    } catch (err) {
      if (shouldFallbackFromOpenRouterToGroq(err)) {
        logger.warn('OpenRouter failed — falling back to Groq', openRouterErrorMessage(err));
        try {
          return await generateSeoArticleViaGroq(rawArticle, userPrompt, compactPrompt);
        } catch (groqErr) {
          if (isGroqRateLimitError(groqErr) && isOpenRouterConfigured()) {
            logger.warn('Groq also rate limited after OpenRouter — retrying OpenRouter compact prompt');
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

  return generateSeoArticleWithFallbacks(rawArticle, userPrompt, compactPrompt);
}

export { rewriteArticle } from '../lib/openrouter.js';
