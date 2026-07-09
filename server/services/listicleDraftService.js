import { getSiteSettings } from '../models/SiteSettings.js';
import { normalizeSeoArticleOutput } from '../utils/seoArticleNormalize.js';
import { finalizeSeoArticleBody } from '../utils/finalizeSeoArticle.js';
import { LISTICLE_SYSTEM, buildListicleUserPrompt } from './seoListiclePrompt.js';
import {
  bluesmindsChatCompletion,
  bluesmindsErrorMessage,
  isBluesmindsConfigured,
  shouldFallbackFromBluesminds,
} from '../lib/bluesminds.js';
import {
  isOpenRouterConfigured,
  isOpenRouterRetryableError,
  openRouterChatCompletion,
  openRouterErrorMessage,
  parseJsonFromModelText,
} from '../lib/openrouter.js';
import { searchFreeImagesForQuery } from './imageDiscoveryService.js';
import { resolveFeaturedImageUrl } from '../utils/imageGenerator.js';
import { slugify } from '../utils/slugify.js';
import { logger } from '../utils/logger.js';

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** e.g. "Top 5 John Wick Movies" → "John Wick" */
export function extractListicleTopic(title) {
  let t = String(title || '').trim();
  t = t.replace(/^(top\s+\d+|best\s+\d+|top|best)\s+/i, '');
  t = t.replace(/\s+(movies|films|shows|songs|games|albums|series|actors|actresses)$/i, '');
  return t.trim() || String(title || '').trim();
}

function heroSearchQueries(label) {
  const base = String(label || '').trim();
  if (!base) return [];
  return [
    `${base} movie poster official`,
    `${base} film poster`,
    `${base} movie promotional poster`,
    `${base} movie still`,
    base,
  ];
}

/** Hero only: Google/CC poster first, AI-generated fallback. */
async function resolveListicleHero(label, category) {
  for (const query of heroSearchQueries(label)) {
    try {
      const found = await searchFreeImagesForQuery(query, { limit: 1 });
      if (found[0]?.url) return found[0];
    } catch {
      /* try next query */
    }
  }

  try {
    const aiUrl = await resolveFeaturedImageUrl(label, category, slugify(label));
    if (aiUrl) {
      return {
        url: aiUrl,
        credit: 'AI generated illustration',
        creditUrl: '',
        source: 'ai',
        viaGoogle: false,
        license: 'generated',
      };
    }
  } catch (err) {
    logger.warn('Listicle AI hero fallback failed', err.message);
  }

  return null;
}

async function requestListicleJson(userPrompt) {
  if (isBluesmindsConfigured()) {
    try {
      const { content } = await bluesmindsChatCompletion({
        messages: [
          { role: 'system', content: LISTICLE_SYSTEM },
          { role: 'user', content: userPrompt },
        ],
        jsonMode: true,
        maxTokens: 3600,
        temperature: 0.25,
      });
      return parseJsonFromModelText(content);
    } catch (err) {
      if (!shouldFallbackFromBluesminds(err)) throw err;
      logger.warn('Bluesminds listicle failed — trying fallback', bluesmindsErrorMessage(err));
    }
  }

  if (isOpenRouterConfigured()) {
    try {
      const { content } = await openRouterChatCompletion({
        messages: [
          { role: 'system', content: LISTICLE_SYSTEM },
          { role: 'user', content: userPrompt },
        ],
        jsonMode: true,
      });
      return parseJsonFromModelText(content);
    } catch (err) {
      if (!process.env.GROQ_API_KEY || !isOpenRouterRetryableError(err)) throw err;
      logger.warn('OpenRouter listicle failed — trying Groq', openRouterErrorMessage(err));
    }
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('No AI provider configured for listicle generation');

  const axios = (await import('axios')).default;
  const model = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
  const { data } = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model,
      messages: [
        { role: 'system', content: LISTICLE_SYSTEM },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.35,
      response_format: { type: 'json_object' },
    },
    {
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      timeout: 120000,
    }
  );
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty listicle response from Groq');
  return parseJsonFromModelText(content);
}

/** Text-only list sections — hero image is set separately, not inline. */
function buildListicleHtml(listItems) {
  const parts = listItems.map((item, index) => {
    const rank = item.rank ?? index + 1;
    const title = String(item.title || '').trim();
    const desc = String(item.description || '').trim();
    return `<h2><strong>${rank}. ${escapeHtml(title)}</strong></h2><p>${escapeHtml(desc)}</p>`;
  });
  return parts.join('\n');
}

async function resolveHeroFromRaw(raw, article, category) {
  const topic = extractListicleTopic(raw.title || article.headline);
  let hero = topic ? await resolveListicleHero(topic, category) : null;
  if (!hero) {
    const found = await searchFreeImagesForQuery(article.primaryKeyword || article.headline, {
      limit: 1,
    });
    hero = found[0] || null;
  }
  return hero;
}

export async function generateListicleArticle(raw, suggestedCategory) {
  const settings = await getSiteSettings();
  const tone = settings.articleTone || 'Engaging';
  const userPrompt = buildListicleUserPrompt(raw, tone, suggestedCategory);
  const parsed = await requestListicleJson(userPrompt);

  const listItems = Array.isArray(parsed.listItems) ? parsed.listItems : [];
  if (listItems.length === 0) {
    throw new Error('AI did not return list items — add numbered entries (e.g. Top 5…) in your rough text');
  }

  const intro = String(parsed.intro || '').trim();
  const outro = String(parsed.outro || '').trim();
  const articleCategory = parsed.category || suggestedCategory || 'Entertainment';
  const listHtml = buildListicleHtml(listItems);

  let body = '';
  if (intro) body += `<p>${escapeHtml(intro)}</p>\n`;
  body += listHtml;
  if (outro) body += `\n<p>${escapeHtml(outro)}</p>`;

  const normalized = normalizeSeoArticleOutput(
    {
      ...parsed,
      headline: parsed.headline || raw.title,
      body,
      summary: parsed.summary || intro,
    },
    raw
  );

  const hero = await resolveHeroFromRaw(raw, normalized, articleCategory);
  const finalized = finalizeSeoArticleBody(normalized, raw, hero);
  return { ...finalized, listicleHero: hero };
}

export async function buildListicleDraftResponse(raw, suggestedCategory) {
  const article = await generateListicleArticle(raw, suggestedCategory);
  const category = article.category || suggestedCategory || 'Entertainment';
  const hero = article.listicleHero || null;

  return {
    title: article.headline,
    summary: article.summary,
    body: article.body,
    category,
    tags: article.tags || [],
    featuredImage: hero?.url || '',
    primaryKeyword: article.primaryKeyword || '',
    seoScore: article.seoScore,
    geoScore: article.geoScore,
    readTime: article.readTime,
    isBreaking: false,
    heroImageUrl: hero?.url || '',
    heroImageAlt: article.heroImageAlt || article.headline,
    heroImageCredit: hero?.credit || 'Creative Commons / free use',
    heroImageCreditUrl: hero?.creditUrl || '',
    heroImageSource: hero?.source || 'google_images',
    heroImageLicense: hero?.license || 'creative_commons',
    sourceAttribution: {
      sourceName: raw.sourceName || 'Original editorial notes',
      sourceUrl: raw.sourceUrl || raw.url,
    },
    originalUrl: raw.url,
    originalTitle: raw.title,
    isListicle: true,
  };
}
