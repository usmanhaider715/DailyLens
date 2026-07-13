const DEFAULT_BASE = 'https://api.deepseek.com';
const DEFAULT_MODEL = 'deepseek-v4-flash';

/** DeepSeek list price (USD per 1M tokens) — override via env if needed. */
const DEFAULT_INPUT_COST_PER_M = Number(process.env.DEEPSEEK_INPUT_COST_PER_M) || 0.27;
const DEFAULT_OUTPUT_COST_PER_M = Number(process.env.DEEPSEEK_OUTPUT_COST_PER_M) || 1.1;

export function getDeepSeekConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  const baseUrl = (process.env.DEEPSEEK_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, '');
  const model = process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_MODEL;
  return { apiKey, baseUrl, model };
}

export function isDeepSeekConfigured() {
  return Boolean(getDeepSeekConfig().apiKey);
}

export function resolveEvergreenAiModel() {
  if (isDeepSeekConfigured()) {
    return (
      process.env.EVERGREEN_MODEL?.trim() ||
      process.env.DEEPSEEK_MODEL?.trim() ||
      DEFAULT_MODEL
    );
  }
  return (
    process.env.EVERGREEN_MODEL?.trim() ||
    process.env.OPENROUTER_MODEL?.trim() ||
    'nvidia/nemotron-3-super-120b-a12b:free'
  );
}

export function estimateDeepSeekCostUsd(usage = {}) {
  const input = usage.prompt_tokens || usage.input_tokens || 0;
  const output = usage.completion_tokens || usage.output_tokens || 0;
  return Number(
    (
      (input / 1_000_000) * DEFAULT_INPUT_COST_PER_M +
      (output / 1_000_000) * DEFAULT_OUTPUT_COST_PER_M
    ).toFixed(6),
  );
}
