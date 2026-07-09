import { ARTICLE_CATEGORIES } from '../utils/seoArticleNormalize.js';

export const LISTICLE_SYSTEM = `You are a senior editor for The Daily Lens writing SEO listicle articles.

NON-NEGOTIABLE:
1. Return ONE valid JSON object only. No markdown fences.
2. Write 100% original copy — never copy source phrasing.
3. Each list item MUST be its own section — NEVER one long paragraph for the whole list.
4. "summary", "metaDescription" are PLAIN TEXT only.
5. Pick exactly one category from the allowed list.

LISTICLE BODY RULES:
- Short intro (1-2 sentences) in "intro" field (plain text).
- Return "listItems" array — each item: rank (number), title, description (2-4 sentences, plain text).
- Optional "outro" (1-2 sentences plain text).
- Do NOT put HTML in listItems — the server builds HTML text sections only.
- Do NOT reference inline images — only one hero image is added by the server.

Also return: headline, slug, metaTitle, metaDescription, summary, category, tags, primaryKeyword, readTime, seoScore, geoScore, faqSchema (2 items), followUpLinks (5 items).`;

export function isListicleRoughText(text) {
  const t = String(text || '');
  return (
    /\btop\s+\d+\b/i.test(t) ||
    /\bbest\s+\d+\b/i.test(t) ||
    /\b\d+\s+best\b/i.test(t) ||
    /\bbest\s+[a-z]/i.test(t) ||
    /\btop\s+[a-z]/i.test(t) ||
    /\b\d+\s+(movies|films|songs|albums|shows|series|games|apps|tips|ways|reasons|places|actors|actresses|celebrities)\b/i.test(t) ||
    /^\s*\d+[\.)]\s/m.test(t)
  );
}

export function buildListicleUserPrompt(raw, tone, category) {
  return `Turn the following rough notes into a polished numbered listicle article.
Return only JSON. Use clear separate entries for each list item — NOT a single paragraph.

Rough notes:
${(raw.content || raw.description || '').slice(0, 12000)}

Suggested title line: ${raw.title || 'Listicle'}
Editorial tone: ${tone || 'Engaging'}
Category hint: ${category || raw.suggestedCategory || 'Entertainment'}
Allowed categories: ${ARTICLE_CATEGORIES.join(', ')}

RETURN JSON:
{
  "headline": "",
  "slug": "",
  "metaTitle": "",
  "metaDescription": "",
  "summary": "",
  "intro": "",
  "outro": "",
  "listItems": [
    { "rank": 1, "title": "", "description": "" }
  ],
  "category": "",
  "tags": [],
  "primaryKeyword": "",
  "readTime": 0,
  "seoScore": 0,
  "geoScore": 0,
  "faqSchema": [{ "question": "", "answer": "" }],
  "followUpLinks": [{ "text": "", "url": "", "linkPhrase": "" }]
}`;
}
