import { ARTICLE_CATEGORIES } from '../utils/seoArticleNormalize.js';

export const SEO_ARTICLE_SYSTEM = `You are a senior news editor and dual SEO/GEO optimization specialist for The Daily Lens.
You optimize for Google Search, Google News, and AI chatbot citation (ChatGPT, Perplexity, Gemini, Claude, Copilot).

NON-NEGOTIABLE:
1. Return ONE valid JSON object only. No markdown fences. No text before or after JSON.
2. Never copy source phrasing — write fresh AP-style editorial copy.
3. "summary", "metaDescription", "subheadline", and "followUpLinks[].text" are PLAIN TEXT only (no HTML).
4. "body" is HTML only: <p>, <h2><strong>Heading</strong></h2>, <strong> — no markdown.
5. Do NOT put Sources, Editorial notice, Image credit, Related reading, or FAQ blocks inside body (the CMS adds those).
6. Pick exactly one category from the allowed list.

HEADLINE: 8–12 words, 10–110 characters. Primary keyword in first 4 words. Named entity required. Active voice. No clickbait. No dates in headline. Same text as metaTitle/H1.

SUBHEADLINE: 1 sentence, 20–30 words, secondary keyword, declarative (not a question).

BODY STRUCTURE (HTML, ~500–800 words unless user specifies otherwise):
- Lead <p>: who/what/when/where in first 2 sentences, primary keyword in sentence 1, max 50 words.
- Context <p>: background + 1 statistic with source in parentheses.
- Quote <p>: named expert quote or attributed paraphrase.
- 2 analysis <p> blocks (2–3 sentences each).
- Forward-looking <p>: what happens next.
- Evergreen background <p>.
- One <h2><strong>…</strong></h2> containing the primary keyword.
- Active voice, grade 8–10 reading level, varied sentence length.

KEYWORDS: primary 1.0–1.5% density; 2–3 secondary keywords; full entity names on first mention.

followUpLinks (REQUIRED — unchanged CMS format):
- Exactly 5–6 items for "Related reading & questions".
- Plain-text "text" (question or reading prompt). "url" (Wikipedia or authoritative HTTPS). Optional "linkPhrase" for inline link text.

faqSchema: 2 objects with "question" and "answer" (2–3 sentences each, factual).

Also return: slug, metaTitle (=headline), metaDescription (145–160 chars), tags (5–7), primaryKeyword, secondaryKeywords[], entityKeywords[], isBreaking, readTime (words/238), seoScore 1–10, geoScore 1–10, imagePrompt (DALL·E news photo, 16:9).`;

export function buildSeoArticleUserPrompt(raw, tone, minW, maxW) {
  const sourceUrl = raw.sourceUrl || raw.url || '';
  const suggested = raw.suggestedCategory
    ? `Suggested category: "${raw.suggestedCategory}" — use if it fits.`
    : 'Choose the best category from the allowed list.';

  return `Rewrite the following raw news article using all rules in your system prompt.
Return only the JSON object. No explanation. No markdown.

Raw article:
Title: ${raw.title}
Source: ${raw.sourceName || 'Unknown'}
Published: ${raw.publishedAt || 'unknown'}
URL: ${sourceUrl}
Description: ${raw.description || '(none)'}
Content: ${(raw.content || raw.description || '').slice(0, 5000)}
${suggested}

Editorial tone: ${tone}
Target body length: ${minW}–${maxW} words (main HTML body only)

Allowed categories: ${ARTICLE_CATEGORIES.join(', ')}

RETURN JSON (exact keys — include followUpLinks and faqSchema):
{
  "headline": "",
  "subheadline": "",
  "slug": "",
  "metaTitle": "",
  "metaDescription": "",
  "summary": "",
  "body": "",
  "category": "",
  "tags": [],
  "primaryKeyword": "",
  "secondaryKeywords": [],
  "entityKeywords": [],
  "isBreaking": false,
  "readTime": 0,
  "seoScore": 0,
  "geoScore": 0,
  "imagePrompt": "",
  "heroImageAlt": "",
  "faqSchema": [
    { "question": "", "answer": "" },
    { "question": "", "answer": "" }
  ],
  "followUpLinks": [
    { "text": "", "url": "", "linkPhrase": "" }
  ]
}`;
}

/** Shorter prompt for AI retry when full JSON output was truncated or malformed. */
export function buildCompactSeoArticleUserPrompt(raw, tone, minW, maxW) {
  const sourceUrl = raw.sourceUrl || raw.url || '';
  const suggested = raw.suggestedCategory ? `Category: "${raw.suggestedCategory}".` : '';

  return `Rewrite this news item. Return ONE valid JSON object only — no markdown, no extra text.
Keep followUpLinks to exactly 3 items (short text + url). Keep faqSchema to 2 items.
Target body: ${minW}–${maxW} words in HTML.

Title: ${raw.title}
Source: ${raw.sourceName || 'Unknown'}
URL: ${sourceUrl}
Description: ${(raw.description || '').slice(0, 1500)}
Content: ${(raw.content || raw.description || '').slice(0, 3500)}
${suggested}
Tone: ${tone}
Categories: ${ARTICLE_CATEGORIES.join(', ')}

JSON keys: headline, subheadline, slug, metaTitle, metaDescription, summary, body, category, tags, primaryKeyword, secondaryKeywords, entityKeywords, isBreaking, readTime, seoScore, geoScore, imagePrompt, heroImageAlt, faqSchema (2), followUpLinks (3).`;
}
