import { Article } from '../models/Article.js';
import { publicArticleFilter } from '../utils/publicArticleFilter.js';
import { TOPIC_HUBS } from './topicHubService.js';
import { getSeoIntelligenceConfig } from '../models/SeoIntelligenceConfig.js';

/**
 * Keyword intelligence (Section 5). Everything here is derived from the words
 * we actually own — target keywords, tags, and search intent on published
 * articles — plus the curated hub keyword list for gap analysis.
 *
 * Fields that genuinely need a keyword database (absolute search volume,
 * keyword difficulty, CPC) are returned as null with `sources` flags so the
 * UI can prompt to connect a provider instead of showing invented numbers.
 */

const KW_PROJECTION = {
  title: 1,
  slug: 1,
  category: 1,
  tags: 1,
  targetKeyword: 1,
  searchIntent: 1,
  views: 1,
};

const COMMERCIAL_INTENTS = new Set(['commercial', 'transactional']);

function norm(s) {
  return String(s || '').trim().toLowerCase();
}

export async function getKeywordIntelligence() {
  const [config, articles] = await Promise.all([
    getSeoIntelligenceConfig(),
    Article.find(publicArticleFilter, KW_PROJECTION).lean(),
  ]);

  // Aggregate keyword usage (target keyword weighted higher than tags).
  const keywords = new Map(); // key -> { keyword, articles:[], views, intent }
  const add = (raw, article, isPrimary) => {
    const key = norm(raw);
    if (!key || key.length < 3) return;
    if (!keywords.has(key)) {
      keywords.set(key, { keyword: raw, count: 0, primaryCount: 0, views: 0, intents: {}, articles: [] });
    }
    const e = keywords.get(key);
    e.count += 1;
    if (isPrimary) e.primaryCount += 1;
    e.views += article.views || 0;
    const intent = norm(article.searchIntent) || 'informational';
    e.intents[intent] = (e.intents[intent] || 0) + 1;
    if (e.articles.length < 8) e.articles.push({ title: article.title, slug: article.slug });
  };

  for (const a of articles) {
    if (a.targetKeyword) add(a.targetKeyword, a, true);
    for (const t of a.tags || []) add(t, a, false);
  }

  const all = [...keywords.values()];
  const dominantIntent = (e) =>
    Object.entries(e.intents).sort((x, y) => y[1] - x[1])[0]?.[0] || 'informational';

  const topKeywords = [...all]
    .sort((a, b) => b.views - a.views || b.count - a.count)
    .slice(0, 25)
    .map((e) => ({ keyword: e.keyword, articles: e.count, views: e.views, intent: dominantIntent(e) }));

  // Cannibalization: one primary keyword targeted by 2+ published articles.
  const cannibalization = all
    .filter((e) => e.primaryCount > 1)
    .map((e) => ({ keyword: e.keyword, count: e.primaryCount, articles: e.articles }))
    .sort((a, b) => b.count - a.count);

  const commercialKeywords = all
    .filter((e) => COMMERCIAL_INTENTS.has(dominantIntent(e)))
    .sort((a, b) => b.views - a.views)
    .slice(0, 20)
    .map((e) => ({ keyword: e.keyword, articles: e.count, views: e.views }));

  // Missing keywords: hub keywords with zero article coverage → gap.
  const covered = new Set(all.map((e) => norm(e.keyword)));
  const missingKeywords = [];
  const suggestedHubPages = [];
  for (const hub of TOPIC_HUBS) {
    const missing = (hub.keywords || []).filter((k) => {
      const nk = norm(k);
      // Uncovered if no keyword contains it.
      return ![...covered].some((c) => c.includes(nk));
    });
    if (missing.length) {
      missingKeywords.push({ hub: hub.title, slug: hub.slug, keywords: missing });
      if (missing.length >= 3) {
        suggestedHubPages.push({ hub: hub.title, slug: hub.slug, uncovered: missing.length });
      }
    }
  }

  // SERP intent distribution across the corpus.
  const intentDist = {};
  for (const a of articles) {
    const i = norm(a.searchIntent) || 'informational';
    intentDist[i] = (intentDist[i] || 0) + 1;
  }

  // Suggested internal links: high-traffic keywords whose articles could link
  // to related lower-traffic articles sharing the keyword.
  const suggestedInternalLinks = topKeywords
    .filter((k) => k.articles > 1)
    .slice(0, 12)
    .map((k) => ({ keyword: k.keyword, articles: k.articles }));

  return {
    totalKeywords: all.length,
    topKeywords,
    commercialKeywords,
    cannibalization,
    missingKeywords,
    suggestedHubPages,
    suggestedInternalLinks,
    intentDistribution: intentDist,
    // Provider-gated fields — honest nulls until a keyword DB is connected.
    external: {
      opportunityKeywords: config.dataSources?.keywordDatabase ? [] : null,
      lowCompetitionKeywords: config.dataSources?.keywordDatabase ? [] : null,
      rankingKeywords: config.dataSources?.searchConsole ? [] : null,
      avgDifficulty: null,
      searchVolume: null,
      trendDirection: config.dataSources?.googleTrends ? 'available via Google Trends panel' : null,
      note: 'Search volume, keyword difficulty and live rankings require a connected keyword database (Ahrefs/SEMrush/DataForSEO) or Google Search Console.',
    },
  };
}
