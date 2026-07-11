import { stripHtml } from './stripHtml.js';
import { logger } from './logger.js';

const QUOTE_PATTERNS = [
  /"([^"]{4,})"/g,
  /"([^"]{4,})"/g,
  /'([^']{4,})'/g,
  /'([^']{4,})'/g,
];

export function normalizeForQuoteMatch(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[\u2018\u2019\u201C\u201D]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract quoted strings from HTML or plain text. */
export function extractQuotedStrings(text) {
  const plain = stripHtml(text || '');
  const found = new Set();
  for (const re of QUOTE_PATTERNS) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(plain)) !== null) {
      const quote = (match[1] || match[2] || '').trim();
      if (quote.length >= 4) found.add(quote);
    }
  }
  return [...found];
}

export function quoteExistsInSource(quote, sourceText) {
  const normalizedQuote = normalizeForQuoteMatch(quote);
  if (!normalizedQuote) return true;
  const normalizedSource = normalizeForQuoteMatch(stripHtml(sourceText || ''));
  return normalizedSource.includes(normalizedQuote);
}

/**
 * Verify quotes against source text.
 * @returns {{ verified: boolean, failedQuotes: string[], body: string }}
 */
export function verifyArticleQuotes(body, sourceText, { rejectOnFailure = false } = {}) {
  const quotes = extractQuotedStrings(body);
  if (!quotes.length) {
    return { verified: true, failedQuotes: [], body: body || '' };
  }

  const failedQuotes = quotes.filter((q) => !quoteExistsInSource(q, sourceText));
  if (!failedQuotes.length) {
    return { verified: true, failedQuotes: [], body: body || '' };
  }

  if (rejectOnFailure) {
    logger.warn('Article rejected — unverified quotes', { failedQuotes: failedQuotes.slice(0, 3) });
    return { verified: false, failedQuotes, body: body || '', rejected: true };
  }

  let sanitized = body || '';
  for (const quote of failedQuotes) {
    const escaped = quote.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    sanitized = sanitized.replace(new RegExp(`["'\u201C]${escaped}["'\u201D]`, 'gi'), quote);
  }

  logger.warn('Stripped unverified quote marks from article', { count: failedQuotes.length });
  return { verified: false, failedQuotes, body: sanitized };
}

export function mapModelToRewriteLabel(modelLabel = '') {
  const label = String(modelLabel || '').toLowerCase();
  if (label.includes('groq') || label.includes('llama')) return 'groq';
  if (label.includes('openrouter') || label.includes('gpt') || label.includes('claude')) return 'gpt';
  if (label.includes('bluesminds')) return 'gpt';
  return 'gpt';
}
