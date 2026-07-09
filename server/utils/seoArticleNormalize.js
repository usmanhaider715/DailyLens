import { stripHtml } from './stripHtml.js';

export const ARTICLE_CATEGORIES = [
  'World',
  'Technology',
  'Business',
  'Sports',
  'Health',
  'Science',
  'Entertainment',
  'Gaming',
  'Politics',
  'Crypto',
  'Weather',
];

const GENERIC_TAGS = new Set([
  'news',
  'today',
  'update',
  'breaking',
  'latest',
  'world',
  'story',
  'article',
  'report',
]);

const HEADLINE_MIN = 10;
const HEADLINE_MAX = 110;

/** Truncate at last space before maxLen; append ellipsis if truncated. */
export function truncateAtWord(text, maxLen = 160) {
  const t = String(text || '').trim();
  if (t.length <= maxLen) return t;
  const cut = t.slice(0, maxLen - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const base = lastSpace > maxLen * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${base}…`;
}

export function normalizeCategory(category, fallback = 'World') {
  const raw = String(category || fallback).trim();
  const match = ARTICLE_CATEGORIES.find((c) => c.toLowerCase() === raw.toLowerCase());
  return match || fallback;
}

function titleCaseTag(str) {
  return String(str || '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function buildFallbackTags(headline, category, primaryKeyword) {
  const out = [titleCaseTag(primaryKeyword), category];
  const words = headline.replace(/…$/, '').split(/\s+/).filter((w) => w.length > 3);
  if (words.length >= 2) out.push(words.slice(0, 2).join(' '));
  if (words.length >= 4) out.push(words.slice(2, 4).join(' '));
  return out.map((t) => titleCaseTag(t)).filter((t) => t.length >= 2 && !GENERIC_TAGS.has(t.toLowerCase()));
}

function inferPrimaryKeyword(headline, category) {
  const words = headline.replace(/…$/, '').split(/\s+/).filter((w) => w.length > 3);
  if (words.length >= 2) return words.slice(0, 3).join(' ');
  return category;
}

function clampSeoScore(score) {
  const n = Number(score);
  if (Number.isNaN(n)) return 8;
  return Math.min(10, Math.max(1, Math.round(n)));
}

function estimateReadMinutes(body) {
  const words = stripHtml(body || '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 238));
}

function ensureHtmlBody(body) {
  const text = String(body || '').trim();
  if (!text) return '';
  if (/<(p|h2|ul|ol|div)\b/i.test(text)) return text;
  return text
    .split(/\n\n+/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => {
      if (/^<p/i.test(block)) return block;
      if (/^<h2/i.test(block)) return block;
      return `<p>${block.replace(/\n/g, ' ')}</p>`;
    })
    .join('\n');
}

function buildFollowUpFromFaq(faqSchema) {
  if (!Array.isArray(faqSchema)) return [];
  return faqSchema
    .map((item) => {
      const text = stripHtml(item.question || '').trim();
      if (!text) return null;
      const topic = text.replace(/\?$/, '').trim();
      return {
        text,
        url: `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(topic)}`,
        linkPhrase: topic.split(' ').slice(-3).join(' ') || topic,
      };
    })
    .filter(Boolean);
}

function normalizeFollowUpLinks(parsed) {
  let links = Array.isArray(parsed.followUpLinks) ? parsed.followUpLinks : [];
  links = links
    .map((item) => ({
      text: stripHtml(item.text || item.question || item.label || '').trim(),
      url: String(item.url || item.href || '').trim(),
      linkPhrase: stripHtml(item.linkPhrase || '').trim(),
    }))
    .filter((item) => item.text && item.url);

  if (links.length < 5) {
    for (const extra of buildFollowUpFromFaq(parsed.faqSchema)) {
      if (links.length >= 6) break;
      if (!links.some((l) => l.text === extra.text)) links.push(extra);
    }
  }

  return links.slice(0, 6);
}

/** Prefer a full catchy headline; expand if the model returned a stub. */
function polishHeadline(parsed, raw = {}) {
  const candidates = [
    stripHtml(parsed.headline || ''),
    stripHtml(parsed.metaTitle || ''),
    stripHtml(parsed.title || ''),
    stripHtml(raw.title || ''),
  ]
    .map((t) => t.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  let headline = candidates[0] || 'Untitled';

  if (headline.length < HEADLINE_MIN) {
    const longer = candidates.find((c) => c.length >= HEADLINE_MIN);
    if (longer) headline = longer;
  }

  if (headline.length < HEADLINE_MIN && candidates[1] && candidates[1].length > headline.length) {
    headline = candidates[1];
  }

  if (headline.length < HEADLINE_MIN) {
    const summaryBit = stripHtml(parsed.summary || raw.description || '')
      .replace(/\s+/g, ' ')
      .trim();
    if (summaryBit.length > 20) {
      const merged = `${headline}: ${summaryBit}`.trim();
      headline = merged.length >= HEADLINE_MIN ? merged : headline;
    }
  }

  if (headline.length < HEADLINE_MIN) {
    const kw = stripHtml(parsed.primaryKeyword || parsed.focusKeyword || '').trim();
    if (kw.length >= 4) {
      const merged = `${kw}: ${headline}`.replace(/\s+/g, ' ').trim();
      if (merged.length >= HEADLINE_MIN) headline = merged;
    }
  }

  if (headline.length < HEADLINE_MIN && raw.title && raw.title.length > headline.length) {
    headline = raw.title.replace(/\s+/g, ' ').trim();
  }

  if (headline.length > HEADLINE_MAX) {
    headline = truncateAtWord(headline, HEADLINE_MAX);
  }

  return headline;
}

/** Enforce on-page SEO field rules after Groq returns JSON. */
export function normalizeSeoArticleOutput(parsed, raw = {}) {
  const fallbackCategory = normalizeCategory(raw.suggestedCategory, 'World');

  const headline = polishHeadline(parsed, raw);

  let summary = stripHtml(
    parsed.metaDescription || parsed.summary || parsed.subheadline || parsed.excerpt || ''
  )
    .replace(/\s+/g, ' ')
    .trim();

  if (!summary && parsed.subheadline) {
    summary = stripHtml(parsed.subheadline).replace(/\s+/g, ' ').trim();
  }
  if (!summary && parsed.body) {
    summary = stripHtml(parsed.body).replace(/\s+/g, ' ').slice(0, 200);
  }
  if (summary.length > 160) {
    summary = truncateAtWord(summary, 160);
  } else if (summary.length < 140 && parsed.body) {
    const extra = stripHtml(parsed.body).replace(/\s+/g, ' ').trim();
    if (extra.length > 20) {
      summary = truncateAtWord(`${summary} ${extra}`.trim(), 160);
    }
  }

  const category = normalizeCategory(parsed.category, fallbackCategory);

  const primaryKeyword =
    stripHtml(parsed.primaryKeyword || parsed.focusKeyword || '').slice(0, 60) ||
    inferPrimaryKeyword(headline, category);

  let tags = [];
  if (Array.isArray(parsed.tags)) {
    tags = parsed.tags
      .map((t) => stripHtml(String(t)).trim().replace(/\s+/g, ' '))
      .filter((t) => t.length >= 2 && t.length <= 40 && !GENERIC_TAGS.has(t.toLowerCase()));
  }
  tags = [...new Set(tags.map((t) => titleCaseTag(t.toLowerCase())))].filter(Boolean);
  if (tags.length < 5) {
    for (const f of buildFallbackTags(headline, category, primaryKeyword)) {
      if (tags.length >= 5) break;
      if (!tags.includes(f)) tags.push(f);
    }
  }
  tags = tags.slice(0, 7);

  const followUpLinks = normalizeFollowUpLinks(parsed);
  const body = ensureHtmlBody(parsed.body);
  const faqSchema = Array.isArray(parsed.faqSchema)
    ? parsed.faqSchema
        .map((f) => ({
          question: stripHtml(f.question || '').trim(),
          answer: stripHtml(f.answer || '').trim(),
        }))
        .filter((f) => f.question && f.answer)
        .slice(0, 4)
    : [];

  let heroImageAlt = stripHtml(parsed.heroImageAlt || parsed.imageAlt || '').trim();
  if (heroImageAlt.length < 40) {
    heroImageAlt = `News photo illustrating: ${headline}`.slice(0, 120);
  }
  heroImageAlt = heroImageAlt.slice(0, 120);

  const geoScore = clampSeoScore(parsed.geoScore);

  return {
    ...parsed,
    headline,
    summary,
    category,
    tags,
    body,
    heroImageAlt,
    primaryKeyword,
    followUpLinks,
    faqSchema,
    seoScore: clampSeoScore(parsed.seoScore),
    geoScore,
    readTime: parsed.readTime || estimateReadMinutes(body),
    imagePrompt: stripHtml(parsed.imagePrompt || '').trim() || parsed.imagePrompt,
  };
}
