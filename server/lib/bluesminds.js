import axios from 'axios';
import { logger } from '../utils/logger.js';

const DEFAULT_BASE = 'https://api.bluesminds.com/v1';
const DEFAULT_MODEL = 'gpt-5.5';
const DEFAULT_TIMEOUT_MS = 90000;

export function getBluesmindsConfig() {
  const apiKey = process.env.BLUESMINDS_API_KEY?.trim();
  const baseUrl = (process.env.BLUESMINDS_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, '');
  const model = process.env.BLUESMINDS_MODEL?.trim() || DEFAULT_MODEL;
  const maxTokens = Number(process.env.BLUESMINDS_MAX_TOKENS) || 3600;
  const timeoutMs = Number(process.env.BLUESMINDS_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  return { apiKey, baseUrl, model, maxTokens, timeoutMs };
}

export function isBluesmindsConfigured() {
  return Boolean(getBluesmindsConfig().apiKey);
}

export function bluesmindsErrorMessage(err) {
  const apiMsg = err?.response?.data?.error?.message;
  if (apiMsg) return apiMsg;
  return err?.message || 'Bluesminds request failed';
}

export function isBluesmindsRateLimitError(err) {
  const status = err?.response?.status;
  return status === 429 || /rate limit|too many/i.test(bluesmindsErrorMessage(err));
}

const NETWORK_ERROR_CODES = new Set([
  'ECONNRESET',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'EPIPE',
  'ERR_NETWORK',
]);

export function isBluesmindsNetworkError(err) {
  if (err?.code && NETWORK_ERROR_CODES.has(err.code)) return true;
  return /ECONNRESET|socket hang up|network error/i.test(err?.message || '');
}

export function isBluesmindsRetryableError(err) {
  const status = err?.response?.status;
  return (
    isBluesmindsRateLimitError(err) ||
    isBluesmindsNetworkError(err) ||
    /timeout/i.test(err?.message || '') ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

export function shouldFallbackFromBluesminds(err) {
  const status = err?.response?.status;
  if (isBluesmindsRetryableError(err)) return true;
  if (isBluesmindsNetworkError(err)) return true;
  if (status === 401 || status === 403 || status === 402) return true;
  if (/invalid token|no access to model/i.test(bluesmindsErrorMessage(err))) return true;
  return false;
}

/**
 * OpenAI-compatible chat completion via Bluesminds (New API gateway).
 */
export async function bluesmindsChatCompletion({
  messages,
  model,
  maxTokens,
  temperature = 0.2,
  jsonMode = true,
  timeoutMs,
}) {
  const config = getBluesmindsConfig();
  if (!config.apiKey) {
    throw new Error('BLUESMINDS_API_KEY is not configured on the server');
  }

  const resolvedModel = model || config.model;
  const url = `${config.baseUrl}/chat/completions`;
  const body = {
    model: resolvedModel,
    messages,
    max_tokens: maxTokens ?? config.maxTokens,
    temperature,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const started = Date.now();
  try {
    const { data } = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: timeoutMs ?? config.timeoutMs,
    });

    const content = data?.choices?.[0]?.message?.content;
    if (!content?.trim()) {
      throw new Error(data?.error?.message || 'Empty response from Bluesminds');
    }

    logger.info('Bluesminds chat completion ok', {
      model: data?.model || resolvedModel,
      ms: Date.now() - started,
    });

    return {
      content,
      model: data?.model || resolvedModel,
      ms: Date.now() - started,
    };
  } catch (err) {
    if (err.response) {
      const wrapped = new Error(bluesmindsErrorMessage(err));
      wrapped.response = err.response;
      throw wrapped;
    }
    throw err;
  }
}
