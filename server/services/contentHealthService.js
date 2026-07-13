import { Article } from '../models/Article.js';
import { evergreenPublicFilter } from '../utils/publicArticleFilter.js';
import { scoreArticleQuality } from './contentQualityService.js';

/**
 * Evergreen "content health" = how fresh, well-made, and engaging a guide is,
 * and whether it should be queued for a refresh. Evergreen content decays as
 * facts, prices, and best practices change, so age is a first-class signal.
 */

const REFRESH_AGE_DAYS = Number(process.env.EVERGREEN_REFRESH_DAYS) || 180;

function ageInDays(date) {
  const ts = new Date(date || 0).getTime();
  if (!ts) return 9999;
  return (Date.now() - ts) / 86400000;
}

export function computeContentHealth(article = {}) {
  const reasons = [];
  const quality = Number.isFinite(article.qualityScore)
    ? article.qualityScore
    : scoreArticleQuality(article).score;

  const updatedAge = ageInDays(article.updatedAt || article.publishedAt);
  const publishedAge = ageInDays(article.publishedAt);

  // Freshness: full marks under 90 days, decaying to 0 by 2x the refresh age.
  const maxAge = REFRESH_AGE_DAYS * 2;
  let freshness = 100;
  if (updatedAge > 90) {
    freshness = Math.max(0, Math.round(100 * (1 - (updatedAge - 90) / (maxAge - 90))));
  }
  if (updatedAge > REFRESH_AGE_DAYS) {
    reasons.push(`Not updated in ${Math.round(updatedAge)} days`);
  }

  // Engagement: log-scaled views, normalised by age so new pieces aren't punished.
  const views = Number(article.views) || 0;
  const perMonth = views / Math.max(1, publishedAge / 30);
  const engagement = Math.min(100, Math.round(Math.log10(perMonth + 1) * 45));
  if (publishedAge > 60 && perMonth < 5) {
    reasons.push('Low traffic — consider refresh or re-promotion');
  }

  if (quality < 70) reasons.push('Quality score below 70');
  if ((article.qualityFlags || []).some((f) => f.startsWith('error:'))) {
    reasons.push('Has a blocking quality flag');
  }

  // Reader engagement (from beacons): completion rate + avg scroll depth.
  const eng = article.engagement || {};
  const completions = Number(eng.readCompletions) || 0;
  const completionRate = views > 0 ? Math.min(1, completions / views) : 0;
  const avgScroll = eng.scrollDepthCount > 0 ? Math.round(eng.scrollDepthSum / eng.scrollDepthCount) : null;
  if (views > 50 && completionRate < 0.12) {
    reasons.push('Low read-completion — intro or structure may need work');
  }

  const health = Math.round(quality * 0.4 + freshness * 0.35 + engagement * 0.25);
  const needsRefresh =
    updatedAge > REFRESH_AGE_DAYS ||
    quality < 60 ||
    (article.qualityFlags || []).some((f) => f.startsWith('error:'));

  return {
    health,
    quality,
    freshness,
    engagement,
    completionRate: Math.round(completionRate * 100),
    avgScroll,
    needsRefresh,
    reasons,
  };
}

const HEALTH_PROJECTION = {
  title: 1,
  slug: 1,
  category: 1,
  views: 1,
  publishedAt: 1,
  updatedAt: 1,
  qualityScore: 1,
  qualityFlags: 1,
  contentType: 1,
  isEvergreen: 1,
  engagement: 1,
};

/** List evergreen guides with health scores, worst (most in need) first. */
export async function getEvergreenHealth({ limit = 100 } = {}) {
  const docs = await Article.find(evergreenPublicFilter, HEALTH_PROJECTION)
    .sort({ updatedAt: 1 })
    .limit(limit)
    .lean();

  const scored = docs.map((d) => ({
    _id: d._id,
    title: d.title,
    slug: d.slug,
    category: d.category,
    views: d.views || 0,
    publishedAt: d.publishedAt,
    updatedAt: d.updatedAt,
    ...computeContentHealth(d),
  }));

  scored.sort((a, b) => a.health - b.health);

  const needingRefresh = scored.filter((s) => s.needsRefresh).length;
  const avgHealth = scored.length
    ? Math.round(scored.reduce((sum, s) => sum + s.health, 0) / scored.length)
    : 0;

  return { total: scored.length, needingRefresh, avgHealth, items: scored };
}
