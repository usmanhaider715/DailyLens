import axios from 'axios';
import { logger } from '../utils/logger.js';
import { parseJsonFromModelText } from '../lib/openrouter.js';

const DEFAULT_BASE = 'https://api.bluesminds.com/v1';
const DEFAULT_IDEA_MODEL = 'claude-sonnet';
const DEFAULT_WRITE_MODEL = 'claude-sonnet';
const FALLBACK_MODEL = process.env.BLUESMINDS_MODEL?.trim() || 'gpt-5.5';

function authProfiles() {
  const profiles = [];
  const evergreenKey = process.env.EVERGREEN_CLAUDE_API_KEY?.trim();
  const mainKey = process.env.BLUESMINDS_API_KEY?.trim();
  const baseUrl = (
    process.env.EVERGREEN_CLAUDE_BASE_URL?.trim() ||
    process.env.BLUESMINDS_BASE_URL?.trim() ||
    DEFAULT_BASE
  ).replace(/\/$/, '');

  if (evergreenKey) {
    profiles.push({
      apiKey: evergreenKey,
      baseUrl,
      ideaModel: process.env.EVERGREEN_MODEL_IDEA?.trim() || DEFAULT_IDEA_MODEL,
      writeModel: process.env.EVERGREEN_MODEL_WRITE?.trim() || DEFAULT_WRITE_MODEL,
    });
  }
  if (mainKey && mainKey !== evergreenKey) {
    profiles.push({
      apiKey: mainKey,
      baseUrl: (process.env.BLUESMINDS_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, ''),
      ideaModel: FALLBACK_MODEL,
      writeModel: FALLBACK_MODEL,
    });
  }
  if (!profiles.length && mainKey) {
    profiles.push({
      apiKey: mainKey,
      baseUrl: (process.env.BLUESMINDS_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, ''),
      ideaModel: FALLBACK_MODEL,
      writeModel: FALLBACK_MODEL,
    });
  }
  return profiles;
}

export function getEvergreenClaudeConfig() {
  const profile = authProfiles()[0];
  const timeoutMs = Number(process.env.EVERGREEN_CLAUDE_TIMEOUT_MS) || 120000;
  if (!profile) return { apiKey: null, baseUrl: DEFAULT_BASE, ideaModel: DEFAULT_IDEA_MODEL, writeModel: DEFAULT_WRITE_MODEL, timeoutMs };
  return { ...profile, timeoutMs };
}

export function isEvergreenClaudeConfigured() {
  return authProfiles().length > 0;
}

const INPUT_COST_PER_M = 3;
const OUTPUT_COST_PER_M = 15;

export function estimateTokenCostUsd(usage = {}) {
  const input = usage.prompt_tokens || usage.input_tokens || 0;
  const output = usage.completion_tokens || usage.output_tokens || 0;
  return Number(((input / 1_000_000) * INPUT_COST_PER_M + (output / 1_000_000) * OUTPUT_COST_PER_M).toFixed(6));
}

function isModelAccessError(err) {
  const status = err?.response?.status;
  const msg = err?.response?.data?.error?.message || err?.message || '';
  return status === 403 || /no access to model/i.test(msg);
}

async function chatOnce({ apiKey, baseUrl, model, messages, maxTokens, temperature, jsonMode, timeoutMs }) {
  const body = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const started = Date.now();
  const { data } = await axios.post(`${baseUrl}/chat/completions`, body, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: timeoutMs,
  });

  const content = data?.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error(data?.error?.message || 'Empty model response');
  }

  const usage = data?.usage || {};
  return {
    content,
    model: data?.model || model,
    usage,
    costUsd: estimateTokenCostUsd(usage),
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
}) {
  const profiles = authProfiles();
  if (!profiles.length) throw new Error('EVERGREEN_CLAUDE_API_KEY or BLUESMINDS_API_KEY is not configured');

  const timeoutMs = Number(process.env.EVERGREEN_CLAUDE_TIMEOUT_MS) || 120000;
  let lastErr;

  for (let i = 0; i < profiles.length; i += 1) {
    const profile = profiles[i];
    const profileModel = purpose === 'idea' ? profile.ideaModel : profile.writeModel;
    const resolvedModel = i === 0 && model ? model : profileModel;

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
      });
      logger.info('Evergreen AI ok', {
        model: result.model,
        ms: result.ms,
        profile: i + 1,
      });
      return result;
    } catch (err) {
      lastErr = err;
      if (isModelAccessError(err) && i < profiles.length - 1) {
        logger.warn('Evergreen model access denied, trying fallback profile', err.response?.data?.error?.message || err.message);
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
