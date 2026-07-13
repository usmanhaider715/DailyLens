import { bodyHasEditorPlaceholder } from '../utils/stripEditorPlaceholders.js';

/**
 * Composite content-quality score (0-100) with human-readable flags.
 * Pure function — no DB access — so it can run in a pre-save hook, in the
 * admin UI, or in scripts. Higher is better; flags explain deductions.
 */

function textFromHtml(html) {
  return String(html || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordCount(text) {
  if (!text) return 0;
  return text.split(/\s+/).filter(Boolean).length;
}

export function scoreArticleQuality(article = {}) {
  const flags = [];
  let score = 100;

  const isGuide = article.contentType === 'evergreen' || article.isEvergreen;
  const bodyHtml = article.body || '';
  const text = textFromHtml(bodyHtml);
  const words = wordCount(text);
  const minWords = isGuide ? 700 : 200;

  const deduct = (points, level, message) => {
    score -= points;
    flags.push(`${level}:${message}`);
  };

  // Placeholder / editor-note text is a hard failure — AI copy must be final.
  if (bodyHasEditorPlaceholder(bodyHtml) || bodyHasEditorPlaceholder(article.summary)) {
    deduct(40, 'error', 'Contains placeholder / editor-note text');
  }

  if (words < minWords) {
    deduct(isGuide ? 25 : 15, 'warn', `Thin content (${words} words, target ≥ ${minWords})`);
  }

  // Structure: long pieces need subheadings.
  const headingCount = (bodyHtml.match(/<h[23][\s>]/gi) || []).length;
  if (words > 500 && headingCount < 2) {
    deduct(10, 'warn', 'Few subheadings for a long article');
  }

  // Meta description quality.
  const meta = String(article.metaDescription || '').trim();
  if (!meta) deduct(10, 'warn', 'Missing meta description');
  else if (meta.length < 50 || meta.length > 165)
    deduct(5, 'info', `Meta description length ${meta.length} (aim 50-160)`);

  // Summary.
  if (!String(article.summary || '').trim()) deduct(6, 'warn', 'Missing summary');

  // Title length.
  const titleLen = String(article.title || '').trim().length;
  if (titleLen < 20) deduct(6, 'info', 'Title is very short');
  else if (titleLen > 75) deduct(4, 'info', 'Title is very long');

  // Hero image.
  const hasImage = !!(article.featuredImage || article.heroImage?.url);
  if (!hasImage) deduct(8, 'warn', 'No hero image');

  // Tags for discoverability.
  if (!Array.isArray(article.tags) || article.tags.length < 2)
    deduct(4, 'info', 'Fewer than 2 tags');

  // Small bonus for verified quotes.
  if (article.verifiedQuotes) score = Math.min(100, score + 3);

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, flags };
}

/** Highest-severity flag level present, or null. */
export function worstFlagLevel(flags = []) {
  if (flags.some((f) => f.startsWith('error:'))) return 'error';
  if (flags.some((f) => f.startsWith('warn:'))) return 'warn';
  if (flags.some((f) => f.startsWith('info:'))) return 'info';
  return null;
}
