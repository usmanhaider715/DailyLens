import Anthropic from '@anthropic-ai/sdk';
import { retry } from '../utils/retry.js';
import { getSiteSettings } from '../models/SiteSettings.js';

const client = () =>
  new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY || '' });

const SYSTEM = `You are a senior editor at a world-class digital news publication.
Your job is to transform raw news article data into polished, professional, 
engaging editorial content. Write in a clear, authoritative journalistic style.
Always return valid JSON only — no markdown, no explanation, just the JSON object.`;

function buildUserPrompt(raw, tone, minW, maxW) {
  return `Transform this raw news article into a professional editorial piece.

Raw data:
Title: ${raw.title}
Description: ${raw.description || ''}
Content: ${raw.content || ''}
Source: ${raw.sourceName || ''}
Published: ${raw.publishedAt || ''}

Editorial tone: ${tone}.
Target article length between ${minW} and ${maxW} words for the body field.

Return a JSON object with exactly these fields:
{
  "headline": "Catchy SEO headline, 48-60 characters, keyword in first 40 chars, never under 42 chars",
  "summary": "Two-sentence engaging summary for homepage article cards. Hook readers immediately.",
  "body": "Full article rewritten in professional journalistic style. Minimum ${minW} words. 
           Use short paragraphs (2-3 sentences max). Include context, analysis, and quotes 
           where appropriate. Structure: lead paragraph with the news hook, background context, 
           key details, expert perspective or analysis, implications, conclusion.",
  "category": "Exactly one of: World, Technology, Business, Sports, Health, Science, Entertainment, Gaming, Politics, Crypto, Weather",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "seoScore": 8,
  "readTime": 4,
  "isBreaking": false,
  "imagePrompt": "A photorealistic image prompt for DALL-E to generate a relevant hero image"
}`;
}

function parseJsonFromText(text) {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Invalid AI response');
  return JSON.parse(trimmed.slice(start, end + 1));
}

export async function processArticle(rawArticle) {
  const settings = await getSiteSettings();
  const tone = settings.articleTone || 'Neutral';
  const minW = settings.minWordCount ?? 500;
  const maxW = settings.maxWordCount ?? 800;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  return retry(async () => {
    const msg = await client().messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: SYSTEM,
      messages: [{ role: 'user', content: buildUserPrompt(rawArticle, tone, minW, maxW) }],
    });
    const block = msg.content.find((b) => b.type === 'text');
    const text = block?.text || '';
    return parseJsonFromText(text);
  }, 3);
}

export async function processBatch(articles, concurrency = 3, processFn = processArticle) {
  const results = [];
  let idx = 0;

  async function worker() {
    while (idx < articles.length) {
      const i = idx++;
      const raw = articles[i];
      try {
        const parsed = await processFn(raw);
        results[i] = { ok: true, raw, parsed };
      } catch (err) {
        results[i] = { ok: false, raw, error: err };
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, articles.length) }, () =>
    worker()
  );
  await Promise.all(workers);
  return results;
}
