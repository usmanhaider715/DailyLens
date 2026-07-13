import { Article } from '../models/Article.js';
import { publicArticleFilter } from '../utils/publicArticleFilter.js';

/**
 * Curated topic hubs (hub-and-spoke SEO silos). Each hub aggregates news,
 * guides, trending, FAQs, and popular searches for a subject, matching by
 * category and/or keyword tags.
 */
export const TOPIC_HUBS = [
  {
    slug: 'artificial-intelligence',
    title: 'Artificial Intelligence',
    description:
      'The latest AI news, tools, and explainers — models, chatbots, and how artificial intelligence is changing work and life.',
    categories: ['Technology'],
    keywords: ['ai', 'artificial intelligence', 'machine learning', 'chatgpt', 'openai', 'llm', 'gemini', 'anthropic'],
  },
  {
    slug: 'technology',
    title: 'Technology',
    description: 'Technology news, gadgets, software, and the companies shaping the future.',
    categories: ['Technology'],
    keywords: ['technology', 'software', 'gadgets', 'apps', 'startups'],
  },
  {
    slug: 'finance',
    title: 'Finance & Money',
    description: 'Personal finance news and guides — saving, investing, budgeting, and managing money.',
    categories: ['Finance', 'Business'],
    keywords: ['finance', 'money', 'investing', 'savings', 'budget', 'stocks', 'retirement'],
  },
  {
    slug: 'insurance',
    title: 'Insurance',
    description: 'Insurance explainers and guides — health, auto, home, and life cover made simple.',
    categories: ['Insurance'],
    keywords: ['insurance', 'coverage', 'premium', 'policy', 'claim'],
  },
  {
    slug: 'movies',
    title: 'Movies & Streaming',
    description: 'Movie news, reviews, and streaming guides across film and television.',
    categories: ['Entertainment'],
    keywords: ['movie', 'movies', 'film', 'cinema', 'streaming', 'netflix', 'box office'],
  },
  {
    slug: 'politics',
    title: 'Politics',
    description: 'Political news, elections, and policy analysis.',
    categories: ['Politics'],
    keywords: ['politics', 'election', 'government', 'policy', 'senate', 'congress'],
  },
  {
    slug: 'sports',
    title: 'Sports',
    description: 'Sports news, live scores, and analysis across football, cricket, and more.',
    categories: ['Sports'],
    keywords: ['sports', 'football', 'soccer', 'cricket', 'nba', 'nfl', 'mlb'],
  },
  {
    slug: 'health',
    title: 'Health & Wellness',
    description: 'Health news and evidence-informed wellness guides.',
    categories: ['Health'],
    keywords: ['health', 'wellness', 'fitness', 'nutrition', 'mental health'],
  },
  {
    slug: 'business',
    title: 'Business',
    description: 'Business news, markets, and company coverage.',
    categories: ['Business'],
    keywords: ['business', 'markets', 'economy', 'company', 'earnings'],
  },
  {
    slug: 'crypto',
    title: 'Crypto',
    description: 'Cryptocurrency news and explainers — Bitcoin, Ethereum, and digital assets.',
    categories: ['Crypto'],
    keywords: ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'web3'],
  },
];

const HUB_BY_SLUG = new Map(TOPIC_HUBS.map((h) => [h.slug, h]));

const HUB_PROJECTION = {
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
  faq: 1,
};

export function listTopicHubs() {
  return TOPIC_HUBS.map(({ slug, title, description }) => ({ slug, title, description }));
}

const isGuide = (a) => a.contentType === 'evergreen' || a.isEvergreen;

export async function getTopicHub(slug) {
  const hub = HUB_BY_SLUG.get(String(slug || '').toLowerCase());
  if (!hub) return null;

  const or = [];
  if (hub.categories?.length) or.push({ category: { $in: hub.categories } });
  if (hub.keywords?.length) {
    or.push({ tags: { $in: hub.keywords.map((k) => new RegExp(`^${escapeRegex(k)}$`, 'i')) } });
    const kw = hub.keywords.map(escapeRegex).join('|');
    or.push({ title: new RegExp(kw, 'i') });
  }

  const pool = await Article.find(
    { ...publicArticleFilter, ...(or.length ? { $or: or } : {}) },
    HUB_PROJECTION,
  )
    .sort({ publishedAt: -1 })
    .limit(80)
    .lean();

  const news = pool.filter((a) => !isGuide(a));
  const guides = pool.filter(isGuide);
  const latest = pool.slice(0, 12);
  const trending = [...pool].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6);

  // FAQs aggregated from the hub's articles.
  const faqs = [];
  const seenQ = new Set();
  for (const a of pool) {
    for (const f of a.faq || []) {
      const q = (f.question || '').trim();
      if (q && !seenQ.has(q.toLowerCase())) {
        seenQ.add(q.toLowerCase());
        faqs.push({ question: q, answer: f.answer, slug: a.slug });
        if (faqs.length >= 8) break;
      }
    }
    if (faqs.length >= 8) break;
  }

  // Popular searches = most common tags across the hub.
  const tagCounts = new Map();
  for (const a of pool) {
    for (const t of a.tags || []) {
      const key = t.trim();
      if (key) tagCounts.set(key, (tagCounts.get(key) || 0) + 1);
    }
  }
  const popularSearches = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tag]) => tag);

  const relatedTopics = TOPIC_HUBS.filter(
    (h) => h.slug !== hub.slug && h.categories?.some((c) => hub.categories?.includes(c)),
  )
    .slice(0, 6)
    .map(({ slug: s, title }) => ({ slug: s, title }));

  return {
    hub: { slug: hub.slug, title: hub.title, description: hub.description },
    counts: { total: pool.length, news: news.length, guides: guides.length },
    latest,
    trending,
    news: news.slice(0, 12),
    guides: guides.slice(0, 8),
    faqs,
    popularSearches,
    relatedTopics,
  };
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
