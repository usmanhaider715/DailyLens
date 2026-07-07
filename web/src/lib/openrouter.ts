/**
 * OpenRouter client for server-side AI features (article rewrite, summaries, etc.).
 * Never import this from client components — use API routes or the Express server instead.
 */

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_MODEL = 'openrouter/free';
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;
const DEFAULT_TIMEOUT_MS = 120_000;

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  siteUrl: string;
  appName: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterChatOptions {
  messages: ChatMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
  jsonMode?: boolean;
  timeoutMs?: number;
}

export interface OpenRouterChatResult {
  content: string;
  model: string;
  ms: number;
}

export interface RewrittenArticle {
  title: string;
  metaDescription: string;
  slug: string;
  excerpt: string;
  html: string;
  tags: string[];
}

export function getOpenRouterConfig(): OpenRouterConfig | null {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;
  return {
    apiKey,
    model: process.env.OPENROUTER_MODEL?.trim() || DEFAULT_MODEL,
    siteUrl: process.env.OPENROUTER_SITE_URL?.trim() || process.env.SITE_URL || 'https://thedailylens.space',
    appName: process.env.OPENROUTER_APP_NAME?.trim() || 'The Daily Lens',
  };
}

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseJsonFromModelText(text: string): unknown {
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new Error('Empty response from OpenRouter');
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

function isRetryableStatus(status: number) {
  return status === 429 || status === 502 || status === 503 || status === 504;
}

function log(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) {
  const prefix = `[OpenRouter] ${new Date().toISOString()}`;
  const payload = meta ? `${message} ${JSON.stringify(meta)}` : message;
  if (level === 'info') console.log(prefix, payload);
  else if (level === 'warn') console.warn(prefix, payload);
  else console.error(prefix, payload);
}

/** Reusable chat completion — summaries, translations, titles, etc. */
export async function openRouterChatCompletion(
  options: OpenRouterChatOptions,
): Promise<OpenRouterChatResult> {
  const config = getOpenRouterConfig();
  if (!config) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const {
    messages,
    model = config.model,
    maxTokens = 4000,
    temperature = 0.3,
    jsonMode = false,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const started = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let response: Response;
      let data: Record<string, unknown>;

      const baseBody: Record<string, unknown> = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
      };

      const send = async (body: Record<string, unknown>) => {
        const res = await fetch(OPENROUTER_URL, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': config.siteUrl,
            'X-Title': config.appName,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        return { res, data: (await res.json()) as Record<string, unknown> };
      };

      try {
        if (jsonMode) {
          const attempt = await send({ ...baseBody, response_format: { type: 'json_object' } });
          response = attempt.res;
          data = attempt.data;
          const empty = !(attempt.data?.choices as Array<{ message?: { content?: string } }>)?.[0]
            ?.message?.content;
          if (response.ok && empty) {
            throw new Error('Empty JSON-mode response from OpenRouter');
          }
        } else {
          const attempt = await send(baseBody);
          response = attempt.res;
          data = attempt.data;
        }
      } catch (jsonErr) {
        if (!jsonMode) throw jsonErr;
        log('warn', 'JSON mode unavailable — retrying without response_format', {
          model,
          message: jsonErr instanceof Error ? jsonErr.message : String(jsonErr),
        });
        const attempt = await send(baseBody);
        response = attempt.res;
        data = attempt.data;
      }

      clearTimeout(timer);
      const ms = Date.now() - started;

      if (!response.ok) {
        const message = (data?.error as { message?: string })?.message || `OpenRouter HTTP ${response.status}`;
        const err = new Error(message) as Error & { status?: number };
        err.status = response.status;
        throw err;
      }

      const content = (data?.choices as Array<{ message?: { content?: string } }>)?.[0]?.message?.content;
      if (!content) {
        throw new Error((data?.error as { message?: string })?.message || 'Empty response from OpenRouter');
      }

      log('info', 'chat completion ok', { model, ms, attempt });
      return { content, model, ms };
    } catch (err) {
      clearTimeout(timer);
      const ms = Date.now() - started;
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;

      const status = (error as Error & { status?: number }).status;
      const retryable =
        error.name === 'AbortError' ||
        isRetryableStatus(status || 0) ||
        /rate limit/i.test(error.message);

      log('warn', 'chat completion failed', {
        model,
        attempt,
        ms,
        retryable,
        message: error.message,
      });

      if (attempt >= MAX_RETRIES || !retryable) break;

      const delay = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
      log('info', 'retry scheduled', { attempt: attempt + 1, delayMs: delay });
      await sleep(delay);
    }
  }

  log('error', 'chat completion exhausted retries', { message: lastError?.message });
  throw lastError || new Error('OpenRouter request failed');
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

export async function rewriteArticle(article: string): Promise<RewrittenArticle> {
  const input = String(article || '').trim();
  if (!input) throw new Error('Article text is required');

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

  let parsed: Record<string, unknown>;
  try {
    parsed = parseJsonFromModelText(content) as Record<string, unknown>;
  } catch (err) {
    log('error', 'rewriteArticle invalid JSON', {
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  const result: RewrittenArticle = {
    title: String(parsed.title || parsed.headline || '').trim(),
    metaDescription: String(parsed.metaDescription || parsed.meta_description || '').trim(),
    slug: String(parsed.slug || '').trim(),
    excerpt: String(parsed.excerpt || parsed.summary || '').trim(),
    html: String(parsed.html || parsed.body || '').trim(),
    tags: Array.isArray(parsed.tags)
      ? parsed.tags.map((t) => String(t).trim()).filter(Boolean)
      : [],
  };

  if (!result.title || !result.html) {
    throw new Error('OpenRouter rewrite response missing required fields (title, html)');
  }

  return result;
}
