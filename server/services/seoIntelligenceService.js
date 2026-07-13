import { Article } from '../models/Article.js';
import { getSeoIntelligenceConfig, targetForCategory } from '../models/SeoIntelligenceConfig.js';
import { computeContentHealth } from './contentHealthService.js';

/**
 * SEO Intelligence — category-level intelligence computed entirely from real
 * article data. Metrics that require external sources (CTR, ranking position)
 * are returned as null with a `source` flag rather than fabricated.
 */

export const INTEL_PROJECTION = {
  title: 1,
  slug: 1,
  category: 1,
  tags: 1,
  targetKeyword: 1,
  searchIntent: 1,
  contentType: 1,
  isEvergreen: 1,
  reviewStatus: 1,
  qualityScore: 1,
  qualityFlags: 1,
  seoScore: 1,
  readTime: 1,
  views: 1,
  engagement: 1,
  faq: 1,
  body: 1,
  summary: 1,
  heroImage: 1,
  featuredImage: 1,
  publishedAt: 1,
  updatedAt: 1,
  createdAt: 1,
  generatedAt: 1,
};

const EVERGREEN_MATCH = {
  $or: [{ contentType: 'evergreen' }, { isEvergreen: true }],
};

const avg = (nums) => (nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0);
const round = (n, d = 0) => {
  const f = 10 ** d;
  return Math.round((Number(n) || 0) * f) / f;
};

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Load the evergreen corpus once; callers slice by category. */
export async function loadEvergreenCorpus({ includeBody = false } = {}) {
  const projection = { ...INTEL_PROJECTION };
  if (!includeBody) delete projection.body;
  return Article.find(EVERGREEN_MATCH, projection).sort({ updatedAt: -1 }).lean();
}

/** Authority proxy (0-100): quality is the strongest signal we own today. */
function authorityScore(article) {
  if (Number.isFinite(article.qualityScore)) return article.qualityScore;
  if (Number.isFinite(article.seoScore)) return article.seoScore * 10;
  return 0;
}

function statusFor({ publishedThisMonth, target, avgAuthority, avgHealth }) {
  const monthlyPace = target.targetMonthlyArticles
    ? publishedThisMonth / target.targetMonthlyArticles
    : 1;
  if (avgHealth >= 75 && monthlyPace >= 0.8 && avgAuthority >= target.targetAuthorityScore) {
    return 'healthy';
  }
  if (avgHealth < 45 || monthlyPace < 0.4) return 'at-risk';
  return 'growing';
}

export async function getCategoryIntelligence() {
  const [config, corpus] = await Promise.all([
    getSeoIntelligenceConfig(),
    loadEvergreenCorpus(),
  ]);

  const monthStart = startOfMonth();
  const byCategory = new Map();
  for (const a of corpus) {
    const key = a.category || 'Uncategorized';
    if (!byCategory.has(key)) byCategory.set(key, []);
    byCategory.get(key).push(a);
  }

  const categories = [];
  for (const target of config.categoryTargets) {
    const list = byCategory.get(target.name) || [];
    const published = list.filter((a) => a.reviewStatus === 'published' || a.isEvergreen);
    const publishedThisMonth = published.filter(
      (a) => new Date(a.publishedAt || a.createdAt || 0) >= monthStart,
    ).length;

    const authorities = list.map(authorityScore).filter((n) => n > 0);
    const healths = list.map((a) => computeContentHealth(a).health);
    const avgAuthority = round(avg(authorities));
    const avgHealth = round(avg(healths));

    const seoScores = list.map((a) => a.seoScore).filter((n) => Number.isFinite(n));
    const readTimes = list.map((a) => a.readTime).filter((n) => Number.isFinite(n));
    const views = list.map((a) => a.views || 0);
    const top = [...list].sort((x, y) => (y.views || 0) - (x.views || 0))[0];

    const lastGenerated = list
      .map((a) => a.generatedAt || a.createdAt)
      .filter(Boolean)
      .sort((x, y) => new Date(y) - new Date(x))[0] || null;
    const lastUpdated = list
      .map((a) => a.updatedAt)
      .filter(Boolean)
      .sort((x, y) => new Date(y) - new Date(x))[0] || null;

    categories.push({
      name: target.name,
      target: targetForCategory(config, target.name),
      articlesPublished: published.length,
      publishedThisMonth,
      avgSeoScore: round(avg(seoScores), 1),
      avgAuthorityScore: avgAuthority,
      avgTraffic: round(avg(views)),
      totalTraffic: views.reduce((a, b) => a + b, 0),
      avgReadTime: round(avg(readTimes), 1),
      // External-only metrics — surfaced honestly as unavailable until connected.
      avgCtr: null,
      avgRankingPosition: null,
      contentHealth: avgHealth,
      status: statusFor({ publishedThisMonth, target: targetForCategory(config, target.name), avgAuthority, avgHealth }),
      topArticle: top ? { title: top.title, slug: top.slug, views: top.views || 0 } : null,
      lastGenerated,
      lastUpdated,
    });
  }

  return {
    categories,
    externalMetrics: {
      ctr: 'requires Google Search Console',
      rankingPosition: 'requires Google Search Console',
    },
  };
}

/** Evergreen analytics dashboard (Section 13) — real internal metrics only. */
export async function getEvergreenAnalytics() {
  const corpus = await loadEvergreenCorpus();
  const published = corpus.filter((a) => a.reviewStatus === 'published' || a.isEvergreen);

  // Published-per-month for the last 6 months.
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('en', { month: 'short' }), published: 0, traffic: 0 });
  }
  const monthIndex = new Map(months.map((m, i) => [m.key, i]));
  for (const a of published) {
    const d = new Date(a.publishedAt || a.createdAt || 0);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const idx = monthIndex.get(key);
    if (idx != null) {
      months[idx].published += 1;
      months[idx].traffic += a.views || 0;
    }
  }

  const byCategory = new Map();
  for (const a of published) {
    const k = a.category || 'Uncategorized';
    byCategory.set(k, (byCategory.get(k) || 0) + (a.views || 0));
  }

  const topArticles = [...published]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10)
    .map((a) => ({ title: a.title, slug: a.slug, category: a.category, views: a.views || 0, health: computeContentHealth(a).health }));

  const prev = months[months.length - 2]?.published || 0;
  const curr = months[months.length - 1]?.published || 0;
  const growthPct = prev ? round(((curr - prev) / prev) * 100, 1) : null;

  return {
    totals: {
      published: published.length,
      totalTraffic: published.reduce((a, b) => a + (b.views || 0), 0),
      avgHealth: round(avg(published.map((a) => computeContentHealth(a).health))),
    },
    monthly: months,
    trafficByCategory: [...byCategory.entries()]
      .map(([category, traffic]) => ({ category, traffic }))
      .sort((a, b) => b.traffic - a.traffic),
    topArticles,
    growthPct,
    unavailable: {
      ctr: 'requires Google Search Console',
      rankingPosition: 'requires Google Search Console',
      conversions: 'requires analytics/goal tracking',
      revenue: 'requires ad revenue / affiliate integration',
    },
  };
}
