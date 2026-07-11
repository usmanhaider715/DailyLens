import axios from 'axios';
import { logger } from '../utils/logger.js';
import { parseJsonFromModelText } from '../lib/openrouter.js';

const DEFAULT_BASE = 'https://api.bluesminds.com/v1';
const DEFAULT_IDEA_MODEL = 'claude-haiku-4-5-20251001';
const DEFAULT_WRITE_MODEL = 'claude-sonnet-4-20250514';

export function getEvergreenClaudeConfig() {
  const apiKey =
    process.env.EVERGREEN_CLAUDE_API_KEY?.trim() ||
    process.env.ANTHROPIC_API_KEY?.trim() ||
    process.env.BLUESMINDS_API_KEY?.trim();
  const baseUrl = (
    process.env.EVERGREEN_CLAUDE_BASE_URL?.trim() ||
    process.env.BLUESMINDS_BASE_URL?.trim() ||
    DEFAULT_BASE
  ).replace(/\/$/, '');
  const ideaModel = process.env.EVERGREEN_MODEL_IDEA?.trim() || DEFAULT_IDEA_MODEL;
  const writeModel = process.env.EVERGREEN_MODEL_WRITE?.trim() || DEFAULT_WRITE_MODEL;
  const timeoutMs = Number(process.env.EVERGREEN_CLAUDE_TIMEOUT_MS) || 120000;
  return { apiKey, baseUrl, ideaModel, writeModel, timeoutMs };
}

export function isEvergreenClaudeConfigured() {
  return Boolean(getEvergreenClaudeConfig().apiKey);
}

const INPUT_COST_PER_M = 3;
const OUTPUT_COST_PER_M = 15;

export function estimateTokenCostUsd(usage = {}) {
  const input = usage.prompt_tokens || usage.input_tokens || 0;
  const output = usage.completion_tokens || usage.output_tokens || 0;
  return Number(((input / 1_000_000) * INPUT_COST_PER_M + (output / 1_000_000) * OUTPUT_COST_PER_M).toFixed(6));
}

export async function evergreenClaudeChat({
  messages,
  model,
  maxTokens = 4096,
  temperature = 0.4,
  jsonMode = true,
}) {
  const config = getEvergreenClaudeConfig();
  if (!config.apiKey) {
    throw new Error('EVERGREEN_CLAUDE_API_KEY is not configured');
  }

  const resolvedModel = model || config.writeModel;
  const body = {
    model: resolvedModel,
    messages,
    max_tokens: maxTokens,
    temperature,
  };
  if (jsonMode) {
    body.response_format = { type: 'json_object' };
  }

  const started = Date.now();
  const { data } = await axios.post(`${config.baseUrl}/chat/completions`, body, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout: config.timeoutMs,
  });

  const content = data?.choices?.[0]?.message?.content;
  if (!content?.trim()) {
    throw new Error(data?.error?.message || 'Empty Claude response');
  }

  const usage = data?.usage || {};
  logger.info('Evergreen Claude ok', {
    model: data?.model || resolvedModel,
    ms: Date.now() - started,
    input: usage.prompt_tokens || usage.input_tokens,
    output: usage.completion_tokens || usage.output_tokens,
  });

  return {
    content,
    model: data?.model || resolvedModel,
    usage,
    costUsd: estimateTokenCostUsd(usage),
    ms: Date.now() - started,
  };
}

export function parseClaudeJson(content) {
  const parsed = parseJsonFromModelText(content);
  if (Array.isArray(parsed)) return parsed;
  if (parsed?.topics && Array.isArray(parsed.topics)) return parsed.topics;
  if (parsed?.ideas && Array.isArray(parsed.ideas)) return parsed.ideas;
  return parsed;
}
