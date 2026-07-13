import axios from 'axios';
import { logger } from '../utils/logger.js';

const DEFAULT_BASE = 'https://api.clod.io/v1';
const DEFAULT_MODEL = 'Llama 3.1 8B';
const DEFAULT_TIMEOUT_MS = 120000;

export function getClodConfig() {
  const apiKey = process.env.CLOD_API_KEY?.trim();
  const baseUrl = (process.env.CLOD_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, '');
  const model = process.env.CLOD_MODEL?.trim() || DEFAULT_MODEL;
  const maxTokens = Number(process.env.CLOD_MAX_TOKENS) || 4096;
  const timeoutMs = Number(process.env.CLOD_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  return { apiKey, baseUrl, model, maxTokens, timeoutMs };
}

export function isClodConfigured() {
  return Boolean(getClodConfig().apiKey);
}

export function clodErrorMessage(err) {
  const apiMsg = err?.response?.data?.error?.message;
  if (apiMsg) return apiMsg;
  return err?.message || 'Clod.io request failed';
}

export function isClodRateLimitError(err) {
  const status = err?.response?.status;
  return status === 429 || /rate limit|too many/i.test(clodErrorMessage(err));
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

export function isClodNetworkError(err) {
  if (err?.code && NETWORK_ERROR_CODES.has(err.code)) return true;
  return /ECONNRESET|socket hang up|network error/i.test(err?.message || '');
}

export function isClodRetryableError(err) {
  const status = err?.response?.status;
  return (
    isClodRateLimitError(err) ||
    isClodNetworkError(err) ||
    /timeout/i.test(err?.message || '') ||
    status === 502 ||
    status === 503 ||
    status === 504
  );
}

export function shouldFallbackFromClod(err) {
  const status = err?.response?.status;
  if (isClodRetryableError(err)) return true;
  if (isClodNetworkError(err)) return true;
  if (status === 401 || status === 403 || status === 402) return true;
  if (/invalid api key|unauthorized|forbidden/i.test(clodErrorMessage(err))) return true;
  if (/empty response|empty model response/i.test(clodErrorMessage(err))) return true;
  return false;
}

function extractMessageContent(message = {}) {
  const content = String(message.content || '').trim();
  if (content) return content;
  return String(message.reasoning || message.reasoning_content || '').trim();
}

/**
 * OpenAI-compatible chat completion via Clod.io.
 */
export async function clodChatCompletion({
  messages,
  model,
  maxTokens,
  temperature = 0.2,
  jsonMode = true,
  timeoutMs,
}) {
  const config = getClodConfig();
  if (!config.apiKey) {
    throw new Error('CLOD_API_KEY is not configured on the server');
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

    const message = data?.choices?.[0]?.message || {};
    const content = extractMessageContent(message);
    if (!content) {
      throw new Error(data?.error?.message || 'Empty response from Clod.io');
    }

    logger.info('Clod.io chat completion ok', {
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
      const wrapped = new Error(clodErrorMessage(err));
      wrapped.response = err.response;
      throw wrapped;
    }
    throw err;
  }
}
