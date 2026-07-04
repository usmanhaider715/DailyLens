import axios from 'axios';
import { retry } from '../utils/retry.js';
import { getSiteSettings } from '../models/SiteSettings.js';
import { normalizeSeoArticleOutput } from '../utils/seoArticleNormalize.js';
import { finalizeSeoArticleBody } from '../utils/finalizeSeoArticle.js';
import { SEO_ARTICLE_SYSTEM, buildSeoArticleUserPrompt } from './seoArticlePrompt.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

function parseJsonFromText(text) {
  const trimmed = String(text || '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Invalid AI response from Groq');
  return JSON.parse(trimmed.slice(start, end + 1));
}

async function requestGroq(apiKey, model, userPrompt) {
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
}

export async function generateSeoArticle(rawArticle) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured on the server');
  }

  const settings = await getSiteSettings();
  const tone = settings.articleTone || 'Neutral';
  const minW = settings.minWordCount ?? 500;
  const maxW = settings.maxWordCount ?? 800;
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const userPrompt = buildSeoArticleUserPrompt(rawArticle, tone, minW, maxW);

  return retry(async () => {
    const content = await requestGroq(apiKey, model, userPrompt);
    const parsed = parseJsonFromText(content);
    const normalized = normalizeSeoArticleOutput(parsed, rawArticle);
    const finalized = finalizeSeoArticleBody(normalized, rawArticle);
    finalized.sourceAttribution = {
      sourceName: rawArticle.sourceName,
      sourceUrl: rawArticle.url || rawArticle.sourceUrl,
    };
    return finalized;
  }, 2);
}
