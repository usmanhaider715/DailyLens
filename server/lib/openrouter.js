import axios from 'axios';
import { logger } from '../utils/logger.js';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openrouter/free';
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;
const DEFAULT_TIMEOUT_MS = 120000;

export function getOpenRouterConfig() {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  const model = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL;
  const siteUrl = process.env.OPENROUTER_SITE_URL?.trim() || process.env.SITE_URL || 'https://thedailylens.space';
  const appName = process.env.OPENROUTER_APP_NAME?.trim() || 'The Daily Lens';
  return { apiKey, model, siteUrl, appName };
}

export function isOpenRouterConfigured() {
  return Boolean(getOpenRouterConfig().apiKey);
}

export function isOpenRouterRateLimitError(err) {
  const status = err?.response?.status;
  const msg = openRouterErrorMessage(err);
  return status === 429 || /rate limit/i.test(msg);
}

export function isOpenRouterTimeoutError(err) {
  return err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '');
}

export function isOpenRouterRetryableError(err) {
  const status = err?.response?.status;
  return (
    isOpenRouterRateLimitError(err) ||
    isOpenRouterTimeoutError(err) ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

export function openRouterErrorMessage(err) {
  const apiMsg = err?.response?.data?.error?.message;
  if (apiMsg) return apiMsg;
  return err?.message || 'OpenRouter request failed';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Safely extract JSON object from model text output. */
export function parseJsonFromModelText(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) {
    throw new Error('Empty response from OpenRouter');
  }
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error('Invalid JSON in OpenRouter response');
    }
    return JSON.parse(trimmed.slice(start, end + 1));
  }
}

function buildHeaders({ apiKey, siteUrl, appName }) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': siteUrl,
    'X-Title': appName,
  };
}

async function postChatCompletion(config, body, timeoutMs) {
  const { data } = await axios.post(OPENROUTER_URL, body, {
    headers: buildHeaders(config),
    timeout: timeoutMs,
  });

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(data?.error?.message || 'Empty response from OpenRouter');
  }
  return { content, model: data?.model || body.model, raw: data };
}

/**
 * Reusable OpenRouter chat completion with retries and logging.
 * @param {object} options
 * @param {Array<{role:string,content:string}>} options.messages
 * @param {string} [options.model]
 * @param {number} [options.maxTokens]
 * @param {number} [options.temperature]
 * @param {boolean} [options.jsonMode]
 */
export async function openRouterChatCompletion({
  messages,
  model,
  maxTokens = 4000,
  temperature = 0.3,
  jsonMode = true,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  const config = getOpenRouterConfig();
  if (!config.apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured on the server');
  }

  const resolvedModel = model || config.model;
  let lastErr;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const started = Date.now();
    try {
      const baseBody = {
        model: resolvedModel,
        messages,
        max_tokens: maxTokens,
        temperature,
      };

      let result;
      try {
        const body = jsonMode ? { ...baseBody, response_format: { type: 'json_object' } } : baseBody;
        result = await postChatCompletion(config, body, timeoutMs);
        if (jsonMode && !String(result.content || '').trim()) {
          throw new Error('Empty JSON-mode response from OpenRouter');
        }
      } catch (jsonErr) {
        if (!jsonMode) throw jsonErr;
        logger.warn('OpenRouter JSON mode unavailable — retrying without response_format', {
          model: resolvedModel,
          message: jsonErr.message,
        });
        result = await postChatCompletion(config, baseBody, timeoutMs);
      }

      const ms = Date.now() - started;
      logger.info('OpenRouter chat completion ok', {
        model: result.model || resolvedModel,
        ms,
        attempt,
      });
      return { content: result.content, model: result.model || resolvedModel, ms, raw: result.raw };
    } catch (err) {
      lastErr = err;
      const ms = Date.now() - started;
      const retryable = isOpenRouterRetryableError(err);
      logger.warn('OpenRouter chat completion failed', {
        model: resolvedModel,
        attempt,
        ms,
        retryable,
        message: openRouterErrorMessage(err),
      });

      if (attempt >= MAX_RETRIES || !retryable) {
        break;
      }

      const delay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
      logger.info('OpenRouter retry scheduled', { attempt: attempt + 1, delayMs: delay });
      await sleep(delay);
    }
  }

  logger.error('OpenRouter chat completion exhausted retries', openRouterErrorMessage(lastErr));
  if (lastErr?.response) {
    const wrapped = new Error(openRouterErrorMessage(lastErr));
    wrapped.response = lastErr.response;
    throw wrapped;
  }
  throw lastErr;
}

const REWRITE_ARTICLE_PROMPT = `Rewrite the following news article.

Requirements:
* Produce 100% unique wording.
* Preserve every factual detail.
* Never invent facts.
* Professional journalistic tone.
* SEO optimized.
* Generate an engaging SEO title.
* Generate a meta description (150–160 characters).
* Generate an SEO-friendly URL slug.
* Generate a short excerpt.
* Generate 5–10 relevant tags.
* Format the article using semantic HTML only.
* Use \`<h2>\`, \`<h3>\`, \`<p>\`, \`<ul>\`, and \`<strong>\` where appropriate.
* Do not wrap the output in Markdown.
* Return only valid JSON.

Return JSON with exactly these keys:
{
  "title": "",
  "metaDescription": "",
  "slug": "",
  "excerpt": "",
  "html": "",
  "tags": []
}

Article:
`;

/** @typedef {{ title: string; metaDescription: string; slug: string; excerpt: string; html: string; tags: string[] }} RewrittenArticle */

/**
 * Rewrite plain-text article content via OpenRouter.
 * @param {string} article
 * @returns {Promise<RewrittenArticle>}
 */
export async function rewriteArticle(article) {
  const input = String(article || '').trim();
  if (!input) {
    throw new Error('Article text is required');
  }

  const { content } = await openRouterChatCompletion({
    messages: [
      {
        role: 'system',
        content:
          'You are a professional news editor. Respond with a single valid JSON object only. No markdown fences.',
      },
      { role: 'user', content: `${REWRITE_ARTICLE_PROMPT}${input}` },
    ],
    jsonMode: true,
  });

  let parsed;
  try {
    parsed = parseJsonFromModelText(content);
  } catch (err) {
    logger.error('OpenRouter rewriteArticle invalid JSON', err.message);
    const { content: retryContent } = await openRouterChatCompletion({
      messages: [
        {
          role: 'system',
          content:
            'You are a professional news editor. Output ONLY a raw JSON object. No markdown, no explanation, no reasoning.',
        },
        { role: 'user', content: `${REWRITE_ARTICLE_PROMPT}${input}` },
      ],
      jsonMode: false,
      temperature: 0.2,
    });
    try {
      parsed = parseJsonFromModelText(retryContent);
    } catch (retryErr) {
      logger.error('OpenRouter rewriteArticle retry invalid JSON', retryErr.message);
      throw retryErr;
    }
  }

  const result = {
    title: String(parsed.title || parsed.headline || '').trim(),
    metaDescription: String(parsed.metaDescription || parsed.meta_description || '').trim(),
    slug: String(parsed.slug || '').trim(),
    excerpt: String(parsed.excerpt || parsed.summary || '').trim(),
    html: String(parsed.html || parsed.body || '').trim(),
    tags: Array.isArray(parsed.tags) ? parsed.tags.map((t) => String(t).trim()).filter(Boolean) : [],
  };

  if (!result.title || !result.html) {
    throw new Error('OpenRouter rewrite response missing required fields (title, html)');
  }

  return result;
}
