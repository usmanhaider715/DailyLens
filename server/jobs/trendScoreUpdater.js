import cron from 'node-cron';
import { Article } from '../models/Article.js';
import { newsArticleFilter } from '../utils/publicArticleFilter.js';
import { listGoogleTrends } from '../services/googleTrendsService.js';
import { invalidateArticleCaches } from '../controllers/articleController.js';
import { logger } from '../utils/logger.js';

/**
 * Source-popularity ("hotness") scoring for the homepage hero.
 *
 * Google Trends is the source signal: we fetch the current trending searches
 * (US + UK), parse their approximate search traffic, then match recent news
 * articles by title / tags / target keyword. Each article's `trendScore` is set
 * to the traffic of the hottest trend it matches, so the homepage hero can be
 * the article riding the biggest live search wave. Articles that match nothing
 * decay to 0 and fall back to recency ordering.
 */

const RECENT_WINDOW_DAYS = 3;
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'in', 'on', 'for', 'with', 'at',
  'by', 'from', 'is', 'are', 'was', 'were', 'be', 'vs', 'his', 'her', 'their',
]);

/** "200K+ searches" → 200000, "2M+" → 2000000, "1,000+" → 1000. */
export function parseTraffic(str) {
  if (!str) return 0;
  const m = String(str).replace(/,/g, '').match(/([\d.]+)\s*([KM]?)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]) || 0;
  const unit = (m[2] || '').toUpperCase();
  if (unit === 'M') return Math.round(n * 1_000_000);
  if (unit === 'K') return Math.round(n * 1_000);
  return Math.round(n);
}

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function significantTokens(query) {
  return norm(query)
    .split(' ')
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

/**
 * Does this article match the trend? Full-phrase match, or (for multi-word
 * trends) at least two significant shared tokens, or a strong single-token
 * match (length >= 4). Keeps false positives low.
 */
function matchesTrend(haystack, tokens, phrase) {
  if (!tokens.length) return false;
  if (phrase.length >= 4 && haystack.includes(phrase)) return true;
  const hits = tokens.filter((t) => new RegExp(`\\b${t}\\b`).test(haystack));
  if (tokens.length === 1) return tokens[0].length >= 4 && hits.length === 1;
  return hits.length >= 2;
}

export async function updateArticleTrendScores() {
  let trends = [];
  try {
    const { uk = [], us = [] } = await listGoogleTrends('both');
    trends = [...us, ...uk];
  } catch (err) {
    logger.warn('Trend score update skipped — Google Trends fetch failed', err.message);
    return { scored: 0, trends: 0 };
  }
  if (!trends.length) return { scored: 0, trends: 0 };

  // Precompute each trend's tokens + numeric traffic (rank-based floor when the
  // feed omits approx_traffic, so higher-ranked trends still outweigh lower).
  const prepared = trends.map((t, idx) => ({
    query: t.query,
    phrase: norm(t.query),
    tokens: significantTokens(t.query),
    traffic: parseTraffic(t.traffic) || Math.max(1000, (trends.length - idx) * 1000),
    headlines: [t.topHeadline, ...(t.newsItems || []).map((n) => n.title)].filter(Boolean).map(norm),
  }));

  const since = new Date(Date.now() - RECENT_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const articles = await Article.find(
    { ...newsArticleFilter, publishedAt: { $gte: since } },
    { title: 1, tags: 1, targetKeyword: 1, trendScore: 1 },
  ).lean();

  const ops = [];
  let scored = 0;
  const now = new Date();

  for (const a of articles) {
    const haystack = norm(`${a.title} ${(a.tags || []).join(' ')} ${a.targetKeyword || ''}`);
    let best = { traffic: 0, query: '' };

    for (const tr of prepared) {
      const titleMatch = matchesTrend(haystack, tr.tokens, tr.phrase);
      // Also credit a match if the trend's own top headline closely mirrors ours.
      const headlineMatch =
        !titleMatch &&
        tr.headlines.some((h) => matchesTrend(h, significantTokens(a.title), norm(a.title)));
      if ((titleMatch || headlineMatch) && tr.traffic > best.traffic) {
        best = { traffic: tr.traffic, query: tr.query };
      }
    }

    if (best.traffic > 0) scored += 1;
    if (best.traffic !== (a.trendScore || 0)) {
      ops.push({
        updateOne: {
          filter: { _id: a._id },
          update: {
            $set: {
              trendScore: best.traffic,
              trendMatchedQuery: best.query,
              trendUpdatedAt: now,
            },
          },
        },
      });
    }
  }

  if (ops.length) {
    await Article.bulkWrite(ops, { ordered: false });
    await invalidateArticleCaches();
  }

  logger.info('Trend scores updated', { articles: articles.length, scored, trends: trends.length, updated: ops.length });
  return { scored, trends: trends.length, updated: ops.length };
}

let scheduled = false;

export function scheduleTrendScoreUpdater() {
  if (scheduled) return;
  scheduled = true;
  // Every 15 minutes, aligned with the news fetch cadence.
  cron.schedule('*/15 * * * *', () => {
    updateArticleTrendScores().catch((err) => logger.error('Trend score cron error', err.message));
  });
  logger.info('Trend score updater scheduled (every 15m)');
}
