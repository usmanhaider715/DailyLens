import axios from 'axios';
import { logger } from '../utils/logger.js';
import { parseJsonFromModelText, getOpenRouterConfig } from '../lib/openrouter.js';
import {
  getDeepSeekConfig,
  isDeepSeekConfigured,
  resolveEvergreenAiModel,
  estimateDeepSeekCostUsd,
} from '../lib/deepseek.js';

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';
const CLOD_BASE = 'https://api.clod.io/v1';
const BLUESMINDS_BASE = 'https://api.bluesminds.com/v1';
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const DEFAULT_OPENROUTER_MODEL = 'nvidia/nemotron-3-super-120b-a12b:free';
const DEFAULT_CLOD_MODEL = 'Llama 3.1 8B';
const DEFAULT_BLUESMINDS_MODEL = 'gpt-5.5';
const GROQ_MODEL = process.env.GROQ_MODEL?.trim() || 'llama-3.3-70b-versatile';

function resolvePrimaryModel() {
  return resolveEvergreenAiModel();
}

function buildProfiles() {
  const profiles = [];
  const primaryModel = resolvePrimaryModel();

  const { apiKey: dsKey, baseUrl: dsBase, model: dsModel } = getDeepSeekConfig();
  if (dsKey) {
    profiles.push({
      apiKey: dsKey,
      baseUrl: dsBase,
      model: process.env.EVERGREEN_MODEL?.trim() || dsModel,
      label: `deepseek/${process.env.EVERGREEN_MODEL?.trim() || dsModel}`,
      estimateCost: estimateDeepSeekCostUsd,
      jsonModeFallback: true,
    });
  }

  const { apiKey: orKey, siteUrl, appName } = getOpenRouterConfig();

  if (orKey) {
    profiles.push({
      apiKey: orKey,
      baseUrl: OPENROUTER_BASE,
      model: primaryModel,
      label: `openrouter/${primaryModel}`,
      extraHeaders: {
        'HTTP-Referer': siteUrl,
        'X-Title': appName,
      },
    });
  }

  const clodKey = process.env.CLOD_API_KEY?.trim();
  if (clodKey) {
    const clodModel = process.env.CLOD_MODEL?.trim() || DEFAULT_CLOD_MODEL;
    profiles.push({
      apiKey: clodKey,
      baseUrl: (process.env.CLOD_BASE_URL?.trim() || CLOD_BASE).replace(/\/$/, ''),
      model: clodModel,
      label: `clod/${clodModel}`,
    });
  }

  const bluesKey = process.env.BLUESMINDS_API_KEY?.trim();
  if (bluesKey) {
    profiles.push({
      apiKey: bluesKey,
      baseUrl: (process.env.BLUESMINDS_BASE_URL?.trim() || BLUESMINDS_BASE).replace(/\/$/, ''),
      model: process.env.BLUESMINDS_MODEL?.trim() || DEFAULT_BLUESMINDS_MODEL,
      label: process.env.BLUESMINDS_MODEL?.trim() || DEFAULT_BLUESMINDS_MODEL,
    });
  }

  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    profiles.push({
      apiKey: groqKey,
      baseUrl: GROQ_BASE,
      model: GROQ_MODEL,
      label: `groq/${GROQ_MODEL}`,
    });
  }

  return profiles;
}

export function getEvergreenClaudeConfig() {
  const timeoutMs = Number(process.env.EVERGREEN_TIMEOUT_MS || process.env.EVERGREEN_CLAUDE_TIMEOUT_MS) || 180000;
  const model = resolvePrimaryModel();
  const configured = buildProfiles().length > 0;

  return {
    ideaModel: model,
    writeModel: model,
    ideaConfigured: configured,
    writeConfigured: configured,
    timeoutMs,
  };
}

export function isEvergreenClaudeConfigured() {
  return buildProfiles().length > 0;
}

const INPUT_COST_PER_M = 3;
const OUTPUT_COST_PER_M = 15;

export function estimateTokenCostUsd(usage = {}) {
  const input = usage.prompt_tokens || usage.input_tokens || 0;
  const output = usage.completion_tokens || usage.output_tokens || 0;
  return Number(((input / 1_000_000) * INPUT_COST_PER_M + (output / 1_000_000) * OUTPUT_COST_PER_M).toFixed(6));
}

function shouldTryFallbackProfile(err) {
  const status = err?.response?.status;
  const msg = err?.response?.data?.error?.message || err?.message || '';
  const code = err?.response?.data?.error?.code || '';
  return (
    status === 403 ||
    status === 503 ||
    status === 429 ||
    status === 504 ||
    status === 502 ||
    status === 404 ||
    code === 'model_price_error' ||
    code === 'model_not_found' ||
    /no access to model/i.test(msg) ||
    /has not been priced/i.test(msg) ||
    /no available channel/i.test(msg) ||
    /empty model response/i.test(msg) ||
    /empty response from clod/i.test(msg) ||
    /insufficient balance/i.test(msg) ||
    status === 402
  );
}

async function postChat({ apiKey, baseUrl, model, messages, maxTokens, temperature, jsonMode, timeoutMs, extraHeaders }) {
  const body = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const { data } = await axios.post(`${baseUrl}/chat/completions`, body, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...(extraHeaders || {}),
    },
    timeout: timeoutMs,
  });

  return data;
}

async function chatOnce({
  apiKey,
  baseUrl,
  model,
  messages,
  maxTokens,
  temperature,
  jsonMode,
  timeoutMs,
  extraHeaders,
  estimateCost,
  jsonModeFallback,
}) {
  const started = Date.now();
  let data;

  try {
    data = await postChat({
      apiKey,
      baseUrl,
      model,
      messages,
      maxTokens,
      temperature,
      jsonMode,
      timeoutMs,
      extraHeaders,
    });
  } catch (err) {
    if (jsonMode && jsonModeFallback) {
      logger.warn('Evergreen JSON mode unavailable — retrying without response_format', {
        model,
        message: err.response?.data?.error?.message || err.message,
      });
      data = await postChat({
        apiKey,
        baseUrl,
        model,
        messages,
        maxTokens,
        temperature,
        jsonMode: false,
        timeoutMs,
        extraHeaders,
      });
    } else {
      throw err;
    }
  }

  const message = data?.choices?.[0]?.message;
  const content =
    message?.content?.trim() ||
    message?.reasoning?.trim() ||
    message?.reasoning_content?.trim();
  if (!content) {
    throw new Error(data?.error?.message || 'Empty model response');
  }

  const usage = data?.usage || {};
  const costFn = estimateCost || estimateTokenCostUsd;
  return {
    content,
    model: data?.model || model,
    usage,
    costUsd: costFn(usage),
    ms: Date.now() - started,
  };
}

export async function evergreenClaudeChat({
  messages,
  model,
  purpose = 'write',
  maxTokens = 4096,
  temperature = 0.4,
  jsonMode = true,
  onModelAttempt,
}) {
  const profiles = buildProfiles();
  if (!profiles.length) {
    throw new Error(
      'DEEPSEEK_API_KEY, OPENROUTER_API_KEY, CLOD_API_KEY, BLUESMINDS_API_KEY, or GROQ_API_KEY is not configured',
    );
  }

  const timeoutMs = Number(process.env.EVERGREEN_TIMEOUT_MS || process.env.EVERGREEN_CLAUDE_TIMEOUT_MS) || 180000;
  let lastErr;

  for (let i = 0; i < profiles.length; i += 1) {
    const profile = profiles[i];
    const resolvedModel = i === 0 && model ? model : profile.model;
    onModelAttempt?.(profile.label || resolvedModel);

    try {
      const result = await chatOnce({
        apiKey: profile.apiKey,
        baseUrl: profile.baseUrl,
        model: resolvedModel,
        messages,
        maxTokens,
        temperature,
        jsonMode,
        timeoutMs,
        extraHeaders: profile.extraHeaders,
        estimateCost: profile.estimateCost,
        jsonModeFallback: profile.jsonModeFallback,
      });
      logger.info('Evergreen AI ok', {
        purpose,
        model: result.model,
        ms: result.ms,
        profile: i + 1,
      });
      return {
        ...result,
        model: profile.label || result.model,
      };
    } catch (err) {
      lastErr = err;
      if (shouldTryFallbackProfile(err) && i < profiles.length - 1) {
        logger.warn('Evergreen AI fallback', err.response?.data?.error?.message || err.message);
        continue;
      }
      throw err;
    }
  }

  throw lastErr || new Error('Evergreen AI request failed');
}

export function parseClaudeJson(content) {
  const parsed = parseJsonFromModelText(content);
  if (Array.isArray(parsed)) return parsed;
  if (parsed?.topics && Array.isArray(parsed.topics)) return parsed.topics;
  if (parsed?.ideas && Array.isArray(parsed.ideas)) return parsed.ideas;
  return parsed;
}
