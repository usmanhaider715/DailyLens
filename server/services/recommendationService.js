import { Article } from '../models/Article.js';
import { publicArticleFilter } from '../utils/publicArticleFilter.js';

const CANDIDATE_PROJECTION = {
  title: 1,
  slug: 1,
  summary: 1,
  category: 1,
  tags: 1,
  heroImage: 1,
  featuredImage: 1,
  author: 1,
  readTime: 1,
  views: 1,
  publishedAt: 1,
  contentType: 1,
  isEvergreen: 1,
  targetKeyword: 1,
};

function tokenize(value) {
  return String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

/** Freshness multiplier: ~2 for today, decaying toward 0 over ~120 days. */
function recencyBoost(publishedAt) {
  const ts = new Date(publishedAt || 0).getTime();
  if (!ts) return 0;
  const days = (Date.now() - ts) / 86400000;
  if (days <= 1) return 2;
  if (days >= 120) return 0;
  return 2 * (1 - days / 120);
}

function popularityBoost(views) {
  const v = Number(views) || 0;
  return Math.min(1.5, Math.log10(v + 1)); // caps around ~1.5 for 30+ views
}

/**
 * Score a candidate against the source article using entity/tag overlap,
 * category, keyword match, freshness, and popularity.
 */
function scoreCandidate(source, cand) {
  const srcTags = new Set((source.tags || []).map((t) => t.toLowerCase()));
  const candTags = (cand.tags || []).map((t) => t.toLowerCase());
  const tagOverlap = candTags.filter((t) => srcTags.has(t)).length;

  const srcTokens = new Set([
    ...tokenize(source.title),
    ...tokenize(source.targetKeyword),
    ...(source.tags || []).flatMap(tokenize),
  ]);
  const candTokens = new Set([...tokenize(cand.title), ...(cand.tags || []).flatMap(tokenize)]);
  let tokenOverlap = 0;
  for (const t of candTokens) if (srcTokens.has(t)) tokenOverlap += 1;

  const sameCategory = cand.category === source.category ? 2 : 0;

  return (
    tagOverlap * 3 +
    Math.min(tokenOverlap, 6) * 0.6 +
    sameCategory +
    recencyBoost(cand.publishedAt) +
    popularityBoost(cand.views)
  );
}

const isGuide = (a) => a.contentType === 'evergreen' || a.isEvergreen;

/**
 * Build a rich, deduped set of internal-linking recommendations so readers
 * never hit a dead end: related news, related guides, popular reads, and a
 * best-overall "recommended for you" set.
 */
export async function getArticleRecommendations(article, { perSection = 4 } = {}) {
  if (!article?._id) {
    return { relatedNews: [], relatedGuides: [], popular: [], recommended: [] };
  }

  const tags = Array.isArray(article.tags) ? article.tags : [];
  const orMatch = [{ category: article.category }];
  if (tags.length) orMatch.push({ tags: { $in: tags } });

  const candidates = await Article.find(
    { ...publicArticleFilter, _id: { $ne: article._id }, $or: orMatch },
    CANDIDATE_PROJECTION,
  )
    .sort({ publishedAt: -1 })
    .limit(80)
    .lean();

  const scored = candidates
    .map((c) => ({ article: c, score: scoreCandidate(article, c) }))
    .sort((a, b) => b.score - a.score);

  const used = new Set();
  const take = (pool, n) => {
    const out = [];
    for (const entry of pool) {
      const a = entry.article || entry;
      const key = String(a._id);
      if (used.has(key)) continue;
      out.push(a);
      used.add(key);
      if (out.length >= n) break;
    }
    return out;
  };

  const relatedNews = take(scored.filter((s) => !isGuide(s.article)), perSection);
  const relatedGuides = take(scored.filter((s) => isGuide(s.article)), perSection);

  // Popular reads: highest views among candidates not already shown.
  const byViews = [...candidates].sort((a, b) => (b.views || 0) - (a.views || 0));
  const popular = take(byViews, perSection);

  // Recommended: best remaining by score, else fill from top scored.
  let recommended = take(scored, perSection);
  if (recommended.length < perSection) {
    recommended = recommended.concat(take(scored, perSection - recommended.length));
  }

  return { relatedNews, relatedGuides, popular, recommended };
}
