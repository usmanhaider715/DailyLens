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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

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

function posterSearchQueries(label, kind = 'item') {
  const base = String(label || '').trim();
  if (!base) return [];
  if (kind === 'hero') {
    return [
      `${base} movie poster official`,
      `${base} film poster`,
      `${base} movie promotional poster`,
      `${base} movie still`,
      base,
    ];
  }
  return [
    `${base} movie poster`,
    `${base} film poster official`,
    `${base} movie still`,
    `${base} film scene`,
    base,
  ];
}

/** Google/CC image first; AI-generated hero as fallback. */
async function resolveListicleImage(label, category, { kind = 'item' } = {}) {
  for (const query of posterSearchQueries(label, kind)) {
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
    logger.warn('Listicle AI image fallback failed', err.message);
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

async function buildListicleHtml(listItems, category) {
  const parts = [];
  const imageCredits = [];

  for (const item of listItems) {
    const rank = item.rank ?? parts.length + 1;
    const title = String(item.title || '').trim();
    const desc = String(item.description || '').trim();
    const searchLabel = title || String(item.imageSearchQuery || '').trim();

    let figureHtml = '';
    try {
      const img = await resolveListicleImage(searchLabel, category, { kind: 'item' });
      if (img?.url) {
        item._resolvedImageUrl = img.url;
        const alt = escapeHtml(title || searchLabel);
        const credit = escapeHtml(img.credit || 'Creative Commons / free use');
        const creditUrl = escapeHtml(img.creditUrl || img.url);
        const sourceNote = img.source === 'ai' ? 'AI generated' : 'royalty-free / Creative Commons';
        figureHtml = `<figure class="listicle-figure"><img src="${escapeHtml(img.url)}" alt="${alt}" loading="lazy" /><figcaption>Image: <a href="${creditUrl}" rel="noopener noreferrer">${credit}</a> (${sourceNote})</figcaption></figure>`;
        imageCredits.push({ title, credit: img.credit, url: img.creditUrl || img.url, imageUrl: img.url });
      }
    } catch {
      /* skip image */
    }

    parts.push(
      `<h2><strong>${rank}. ${escapeHtml(title)}</strong></h2>${figureHtml}<p>${escapeHtml(desc)}</p>`
    );
    await sleep(400);
  }

  return { html: parts.join('\n'), imageCredits };
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
  const { html: listHtml, imageCredits } = await buildListicleHtml(listItems, articleCategory);

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

  const firstImg = imageCredits[0];
  const hero = firstImg
    ? {
        url: firstImg.imageUrl,
        credit: firstImg.credit,
        creditUrl: firstImg.url,
        source: 'google_images',
        viaGoogle: true,
        license: 'creative_commons',
      }
    : null;

  return finalizeSeoArticleBody(normalized, raw, hero);
}

export async function buildListicleDraftResponse(raw, suggestedCategory) {
  const article = await generateListicleArticle(raw, suggestedCategory);
  const category = article.category || suggestedCategory || 'Entertainment';
  const topic = extractListicleTopic(raw.title || article.headline);

  let hero = null;
  if (article.body?.includes('listicle-figure')) {
    const m = article.body.match(/<img src="([^"]+)"/);
    if (m) {
      hero = {
        url: m[1],
        credit: 'Creative Commons / free use',
        creditUrl: '',
        source: 'google_images',
        viaGoogle: true,
        license: 'creative_commons',
      };
    }
  }
  if (!hero && topic) {
    hero = await resolveListicleImage(topic, category, { kind: 'hero' });
  }
  if (!hero) {
    const found = await searchFreeImagesForQuery(article.primaryKeyword || article.headline, { limit: 1 });
    hero = found[0] || null;
  }
  if (!hero && topic) {
    const aiUrl = await resolveFeaturedImageUrl(topic, category, slugify(topic));
    if (aiUrl) {
      hero = {
        url: aiUrl,
        credit: 'AI generated illustration',
        creditUrl: '',
        source: 'ai',
        viaGoogle: false,
        license: 'generated',
      };
    }
  }

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
