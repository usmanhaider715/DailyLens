import { Article } from '../models/Article.js';
import { publicArticleFilter } from '../utils/publicArticleFilter.js';
import { TOPIC_HUBS } from './topicHubService.js';
import { getSeoIntelligenceConfig, targetForCategory } from '../models/SeoIntelligenceConfig.js';

/**
 * Cluster dashboard (Section 4). Treats the curated TOPIC_HUBS as content
 * clusters and measures completeness of each against the standard content
 * types a mature cluster should contain (pillar + supporting + comparison +
 * FAQ + review + buying guide + how-to + ultimate guide).
 */

const CLUSTER_PROJECTION = {
  title: 1,
  slug: 1,
  category: 1,
  tags: 1,
  targetKeyword: 1,
  faq: 1,
  qualityScore: 1,
  seoScore: 1,
  contentType: 1,
  isEvergreen: 1,
};

const CONTENT_TYPE_MATCHERS = {
  comparison: /\bvs\.?\b|versus|compared|comparison/i,
  review: /\breview(s)?\b|hands[- ]on|tested/i,
  buyingGuide: /buying guide|best .*(to buy|for|of \d{4})|top \d+/i,
  howTo: /how to|how do|step[- ]by[- ]step|tutorial/i,
  ultimateGuide: /ultimate guide|complete guide|everything you need|the definitive/i,
};

function detectTypes(article) {
  const text = `${article.title || ''} ${article.targetKeyword || ''}`;
  const types = new Set();
  for (const [type, re] of Object.entries(CONTENT_TYPE_MATCHERS)) {
    if (re.test(text)) types.add(type);
  }
  if (Array.isArray(article.faq) && article.faq.length > 0) types.add('faq');
  return types;
}

function matchesHub(hub, article) {
  if (hub.categories?.includes(article.category)) return true;
  const hay = `${article.title || ''} ${(article.tags || []).join(' ')} ${article.targetKeyword || ''}`.toLowerCase();
  return (hub.keywords || []).some((k) => hay.includes(k.toLowerCase()));
}

const avg = (nums) => (nums.length ? Math.round(nums.reduce((a, b) => a + b, 0) / nums.length) : 0);

/** Connectivity proxy: share of articles that share ≥1 tag with another. */
function internalLinkScore(articles) {
  if (articles.length < 2) return articles.length ? 40 : 0;
  const tagOwners = new Map();
  for (const a of articles) {
    for (const t of a.tags || []) {
      const key = t.toLowerCase();
      tagOwners.set(key, (tagOwners.get(key) || 0) + 1);
    }
  }
  let linked = 0;
  for (const a of articles) {
    const connected = (a.tags || []).some((t) => (tagOwners.get(t.toLowerCase()) || 0) > 1);
    if (connected) linked += 1;
  }
  return Math.round((linked / articles.length) * 100);
}

export async function getClusterDashboard() {
  const [config, articles] = await Promise.all([
    getSeoIntelligenceConfig(),
    Article.find(publicArticleFilter, CLUSTER_PROJECTION).lean(),
  ]);

  const EXPECTED = ['supporting', 'comparison', 'faq', 'review', 'buyingGuide', 'howTo', 'ultimateGuide'];

  const clusters = TOPIC_HUBS.map((hub) => {
    const members = articles.filter((a) => matchesHub(hub, a));
    const present = new Set();
    for (const m of members) for (const t of detectTypes(m)) present.add(t);
    // "supporting" = any non-typed article beyond the first pillar.
    const typedCount = members.filter((m) => detectTypes(m).size > 0).length;
    if (members.length - typedCount >= 1) present.add('supporting');

    const missing = EXPECTED.filter((t) => !present.has(t));
    const completion = Math.round(((EXPECTED.length - missing.length) / EXPECTED.length) * 100);

    const primaryCategory = hub.categories?.[0] || 'Uncategorized';
    const target = targetForCategory(config, primaryCategory);

    return {
      slug: hub.slug,
      title: hub.title,
      primaryCategory,
      articleCount: members.length,
      completion,
      completed: missing.length === 0 && members.length >= 3,
      missing: {
        supportingArticles: missing.includes('supporting'),
        comparisons: missing.includes('comparison'),
        faqs: missing.includes('faq'),
        reviews: missing.includes('review'),
        buyingGuides: missing.includes('buyingGuide'),
        howTo: missing.includes('howTo'),
        ultimateGuides: missing.includes('ultimateGuide'),
      },
      internalLinkScore: internalLinkScore(members),
      authorityScore: avg(members.map((m) => (Number.isFinite(m.qualityScore) ? m.qualityScore : 0)).filter(Boolean)),
      seoScore: avg(members.map((m) => (Number.isFinite(m.seoScore) ? m.seoScore * 10 : 0)).filter(Boolean)),
      priority: target.priorityLevel,
    };
  });

  const completedClusters = clusters.filter((c) => c.completed).length;
  return {
    total: clusters.length,
    completedClusters,
    incompleteClusters: clusters.length - completedClusters,
    clusters: clusters.sort((a, b) => a.completion - b.completion),
  };
}

/** Members + missing-type detail for a single cluster (Expand action). */
export async function getClusterDetail(slug) {
  const hub = TOPIC_HUBS.find((h) => h.slug === slug);
  if (!hub) return null;
  const articles = await Article.find(publicArticleFilter, CLUSTER_PROJECTION).lean();
  const members = articles
    .filter((a) => matchesHub(hub, a))
    .map((a) => ({
      title: a.title,
      slug: a.slug,
      category: a.category,
      types: [...detectTypes(a)],
      qualityScore: a.qualityScore ?? null,
    }));
  return { slug: hub.slug, title: hub.title, keywords: hub.keywords, members };
}
