import { EvergreenPipelineLog } from '../models/EvergreenPipelineLog.js';
import { AiFallbackLog } from '../models/AiFallbackLog.js';
import { Article } from '../models/Article.js';

/**
 * Enriched pipeline logs (Section 14). Purely additive — reads the existing
 * EvergreenPipelineLog + AiFallbackLog + Article SEO fields and derives the
 * richer view (provider, generation time, ideas considered, rejects, SEO /
 * authority / quality / cluster / intent, token usage, API cost). The pipeline
 * itself is not modified.
 */

export async function getEnrichedPipelineLogs({ limit = 20 } = {}) {
  const logs = await EvergreenPipelineLog.find().sort({ createdAt: -1 }).limit(limit).lean();
  if (!logs.length) return { logs: [] };

  // Gather every slug the runs produced so we can join real SEO signals.
  const slugs = [...new Set(logs.flatMap((l) => (l.details || []).map((d) => d.slug).filter(Boolean)))];
  const articles = slugs.length
    ? await Article.find(
        { slug: { $in: slugs } },
        { slug: 1, category: 1, targetKeyword: 1, searchIntent: 1, qualityScore: 1, seoScore: 1 },
      ).lean()
    : [];
  const bySlug = new Map(articles.map((a) => [a.slug, a]));

  // Provider fallback events within the whole window (for provider attribution).
  const oldest = logs[logs.length - 1].startedAt || logs[logs.length - 1].createdAt;
  const fallbacks = await AiFallbackLog.find({ createdAt: { $gte: oldest } })
    .sort({ createdAt: -1 })
    .lean();

  const enriched = logs.map((log) => {
    const start = new Date(log.startedAt || log.createdAt).getTime();
    const end = new Date(log.finishedAt || log.updatedAt || Date.now()).getTime();
    const runFallbacks = fallbacks.filter((f) => {
      const t = new Date(f.createdAt).getTime();
      return t >= start && t <= end + 5000;
    });

    const details = (log.details || []).map((d) => {
      const a = bySlug.get(d.slug) || {};
      return {
        title: d.title,
        slug: d.slug,
        category: d.category || a.category || null,
        action: d.action,
        reviewStatus: d.reviewStatus,
        cluster: a.category || d.category || null,
        searchIntent: a.searchIntent || null,
        targetKeyword: a.targetKeyword || null,
        seoScore: Number.isFinite(a.seoScore) ? a.seoScore : null,
        authorityScore: Number.isFinite(a.qualityScore) ? a.qualityScore : null,
        qualityScore: Number.isFinite(a.qualityScore) ? a.qualityScore : null,
      };
    });

    const qualities = details.map((d) => d.qualityScore).filter((n) => Number.isFinite(n));
    const seos = details.map((d) => d.seoScore).filter((n) => Number.isFinite(n));
    const avg = (arr) => (arr.length ? Math.round(arr.reduce((x, y) => x + y, 0) / arr.length) : null);

    const ideasConsidered = (log.articlesGenerated || 0) + (log.duplicatesRejected || 0);

    return {
      _id: log._id,
      runId: log.runId,
      status: log.status,
      triggeredBy: log.triggeredBy,
      startedAt: log.startedAt,
      finishedAt: log.finishedAt,
      categoriesRun: log.categoriesRun || [],
      // Section 14 enriched fields:
      providerUsed: runFallbacks.length
        ? runFallbacks[runFallbacks.length - 1].fallbackProvider
        : runFallbacks[0]?.primaryProvider || 'primary',
      providerFallbacks: runFallbacks.map((f) => ({
        from: f.primaryProvider,
        to: f.fallbackProvider,
        reason: f.reason || f.errorMessage,
      })),
      generationTimeMs: end && start ? end - start : null,
      ideasConsidered,
      topicsRejected: log.duplicatesRejected || 0,
      rejectionReason: (log.duplicatesRejected || 0) > 0 ? 'duplicate / too similar' : null,
      duplicateDetection: log.duplicatesRejected || 0,
      articlesGenerated: log.articlesGenerated || 0,
      articlesPublished: log.articlesPublished || 0,
      articlesPending: log.articlesPending || 0,
      avgSeoScore: avg(seos),
      avgAuthorityScore: avg(qualities),
      avgQualityScore: avg(qualities),
      tokenUsage: log.tokenUsage || { inputTokens: 0, outputTokens: 0 },
      apiCostUsd: log.tokenCostUsd || 0,
      failureMessages: log.failureMessages || [],
      details,
    };
  });

  return { logs: enriched };
}
