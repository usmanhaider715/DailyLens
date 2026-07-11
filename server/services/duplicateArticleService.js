import { Article } from '../models/Article.js';
import { normalizeSourceUrl } from '../utils/normalizeSourceUrl.js';
import { logger } from '../utils/logger.js';

const SOURCE_URL_WINDOW_MS = 72 * 60 * 60 * 1000;
const HEADLINE_WINDOW_MS = 24 * 60 * 60 * 1000;
const HEADLINE_SIMILARITY_THRESHOLD = 0.85;

export function headlineTokens(headline) {
  return new Set(
    String(headline || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2),
  );
}

export function jaccardSimilarity(a, b) {
  const setA = headlineTokens(a);
  const setB = headlineTokens(b);
  if (!setA.size || !setB.size) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union ? intersection / union : 0;
}

/**
 * Check for duplicate articles before insert.
 * @returns {null | { reason: string, article: object }}
 */
export async function findDuplicateArticle({ sourceUrl, headline, category }) {
  const normalized = normalizeSourceUrl(sourceUrl);
  if (normalized && /^https?:\/\//i.test(normalized)) {
    const since72h = new Date(Date.now() - SOURCE_URL_WINDOW_MS);
    const byNormalized = await Article.findOne({
      normalizedSourceUrl: normalized,
      publishedAt: { $gte: since72h },
    })
      .select('_id slug title publishedAt')
      .lean();
    if (byNormalized) return { reason: 'source_url', article: byNormalized };

    const byOriginal = await Article.findOne({
      $or: [{ originalUrl: normalized }, { 'source.url': normalized }],
      publishedAt: { $gte: since72h },
    })
      .select('_id slug title publishedAt')
      .lean();
    if (byOriginal) return { reason: 'source_url', article: byOriginal };
  }

  if (headline && category) {
    const since24h = new Date(Date.now() - HEADLINE_WINDOW_MS);
    const recent = await Article.find({
      category,
      publishedAt: { $gte: since24h },
    })
      .select('title slug')
      .lean();

    for (const candidate of recent) {
      const score = jaccardSimilarity(headline, candidate.title);
      if (score > HEADLINE_SIMILARITY_THRESHOLD) {
        return { reason: 'headline_similarity', article: candidate, score };
      }
    }
  }

  return null;
}

/** Returns duplicate info or null. Logs and skips instead of throwing by default. */
export async function checkDuplicateBeforeInsert({ sourceUrl, headline, category }, { log = true } = {}) {
  const dup = await findDuplicateArticle({ sourceUrl, headline, category });
  if (dup && log) {
    logger.info('Skipping duplicate article', {
      reason: dup.reason,
      existingSlug: dup.article?.slug,
      headline: String(headline || '').slice(0, 80),
    });
  }
  return dup;
}

export function attachNormalizedSourceUrl(payload, sourceUrl) {
  const normalized = normalizeSourceUrl(sourceUrl || payload.originalUrl || payload.source?.url || '');
  if (normalized) payload.normalizedSourceUrl = normalized;
  return payload;
}
