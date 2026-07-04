import axios from 'axios';
import Parser from 'rss-parser';
import { Article } from '../models/Article.js';
import { hashUrl } from '../utils/hashUrl.js';
import { NewsSource } from '../models/NewsSource.js';
import { getSiteSettings } from '../models/SiteSettings.js';

const parser = new Parser({
  timeout: 20000,
  headers: {
    'User-Agent': 'DailyLensBot/1.0',
  },
});

/** Per-category RSS — works without NewsAPI/GNews keys. */
const RSS_FEEDS = [
  { name: 'BBC Top', url: 'http://feeds.bbci.co.uk/news/rss.xml', category: 'World' },
  { name: 'BBC World', url: 'http://feeds.bbci.co.uk/news/world/rss.xml', category: 'World' },
  { name: 'NPR News', url: 'https://feeds.npr.org/1001/rss.xml', category: 'World' },
  { name: 'Guardian World', url: 'https://www.theguardian.com/world/rss', category: 'World' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'World' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'Technology' },
  { name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', category: 'Technology' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', category: 'Technology' },
  { name: 'Wired', url: 'https://www.wired.com/feed/rss', category: 'Technology' },
  {
    name: 'CNBC Top',
    url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114',
    category: 'Business',
  },
  { name: 'MarketWatch', url: 'https://feeds.marketwatch.com/marketwatch/topstories/', category: 'Business' },
  { name: 'BBC Business', url: 'http://feeds.bbci.co.uk/news/business/rss.xml', category: 'Business' },
  { name: 'ESPN', url: 'https://www.espn.com/espn/rss/news', category: 'Sports' },
  { name: 'BBC Sport', url: 'http://feeds.bbci.co.uk/sport/rss.xml', category: 'Sports' },
  { name: 'BBC Health', url: 'http://feeds.bbci.co.uk/news/health/rss.xml', category: 'Health' },
  { name: 'Medical News Today', url: 'https://www.medicalnewstoday.com/rss', category: 'Health' },
  {
    name: 'BBC Science',
    url: 'http://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    category: 'Science',
  },
  { name: 'Science Daily', url: 'https://www.sciencedaily.com/rss/all.xml', category: 'Science' },
  {
    name: 'BBC Entertainment',
    url: 'http://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
    category: 'Entertainment',
  },
  { name: 'Variety', url: 'https://variety.com/feed/', category: 'Entertainment' },
  { name: 'BBC Politics', url: 'http://feeds.bbci.co.uk/news/politics/rss.xml', category: 'Politics' },
  { name: 'Politico', url: 'https://rss.politico.com/politics-news.xml', category: 'Politics' },
  { name: 'The Hill', url: 'https://thehill.com/news/feed/', category: 'Politics' },
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'Crypto' },
  { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss', category: 'Crypto' },
  { name: 'Decrypt', url: 'https://decrypt.co/feed', category: 'Crypto' },
  { name: 'NOAA Climate', url: 'https://www.climate.gov/news-features/feed/rss', category: 'Weather' },
  { name: 'Weather Channel', url: 'https://weather.com/news/rss', category: 'Weather' },
  {
    name: 'Google News Weather',
    url: 'https://news.google.com/rss/search?q=weather+OR+hurricane+OR+forecast&hl=en-US&gl=US&ceid=US:en',
    category: 'Weather',
  },
  {
    name: 'Google News Politics',
    url: 'https://news.google.com/rss/search?q=politics+OR+election+OR+congress&hl=en-US&gl=US&ceid=US:en',
    category: 'Politics',
  },
  {
    name: 'Google News Crypto',
    url: 'https://news.google.com/rss/search?q=cryptocurrency+OR+bitcoin+OR+ethereum&hl=en-US&gl=US&ceid=US:en',
    category: 'Crypto',
  },
  {
    name: 'Google News World',
    url: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-US&gl=US&ceid=US:en',
    category: 'World',
  },
  {
    name: 'Google News Tech',
    url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-US&gl=US&ceid=US:en',
    category: 'Technology',
  },
  {
    name: 'Google News Business',
    url: 'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en',
    category: 'Business',
  },
  {
    name: 'Google News Sports',
    url: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=en-US&gl=US&ceid=US:en',
    category: 'Sports',
  },
  {
    name: 'Google News Health',
    url: 'https://news.google.com/rss/headlines/section/topic/HEALTH?hl=en-US&gl=US&ceid=US:en',
    category: 'Health',
  },
  {
    name: 'Google News Science',
    url: 'https://news.google.com/rss/headlines/section/topic/SCIENCE?hl=en-US&gl=US&ceid=US:en',
    category: 'Science',
  },
  {
    name: 'Google News Entertainment',
    url: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=en-US&gl=US&ceid=US:en',
    category: 'Entertainment',
  },
];

const RSS_ITEMS_PER_FEED = 12;

const NEWSAPI_CATS = [
  'technology',
  'business',
  'sports',
  'health',
  'science',
  'entertainment',
  'general',
];

const GNEWS_TOPICS = [
  'world',
  'nation',
  'business',
  'technology',
  'sports',
  'entertainment',
  'health',
  'science',
];

/** Site categories used across NewsAPI, GNews, and RSS sources. */
export const NEWS_FEED_CATEGORIES = [
  'World',
  'Technology',
  'Business',
  'Sports',
  'Health',
  'Science',
  'Entertainment',
  'Politics',
  'Crypto',
  'Weather',
];

function mapNewsApiCategory(cat) {
  const m = {
    technology: 'Technology',
    business: 'Business',
    sports: 'Sports',
    health: 'Health',
    science: 'Science',
    entertainment: 'Entertainment',
    general: 'World',
  };
  return m[cat] || 'World';
}

function mapGnewsTopic(topic) {
  const m = {
    world: 'World',
    nation: 'Politics',
    business: 'Business',
    technology: 'Technology',
    sports: 'Sports',
    entertainment: 'Entertainment',
    health: 'Health',
    science: 'Science',
  };
  return m[topic] || 'World';
}

function normalizeFeedCategory(category) {
  const raw = String(category || '').trim();
  if (!raw) return 'World';
  const match = NEWS_FEED_CATEGORIES.find((c) => c.toLowerCase() === raw.toLowerCase());
  return match || 'World';
}

function countByCategory(articles) {
  const counts = Object.fromEntries(NEWS_FEED_CATEGORIES.map((c) => [c, 0]));
  for (const a of articles) {
    const cat = normalizeFeedCategory(a.suggestedCategory);
    counts[cat] = (counts[cat] || 0) + 1;
  }
  return counts;
}

/** Ensure every category is represented in the admin "All" feed. */
function balancedFeedByCategory(articles, limit) {
  const buckets = new Map();
  for (const cat of NEWS_FEED_CATEGORIES) {
    buckets.set(cat, []);
  }
  for (const a of articles) {
    const cat = normalizeFeedCategory(a.suggestedCategory);
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat).push(a);
  }
  for (const list of buckets.values()) {
    list.sort((x, y) => new Date(y.publishedAt) - new Date(x.publishedAt));
  }

  const out = [];
  const seen = new Set();
  const minPerCat = Math.max(3, Math.floor(limit / NEWS_FEED_CATEGORIES.length));

  for (const cat of NEWS_FEED_CATEGORIES) {
    const list = buckets.get(cat) || [];
    for (let i = 0; i < minPerCat && i < list.length; i++) {
      const item = list[i];
      if (item?.url && !seen.has(item.url)) {
        seen.add(item.url);
        out.push(item);
      }
    }
  }

  let round = minPerCat;
  while (out.length < limit) {
    let added = false;
    for (const cat of NEWS_FEED_CATEGORIES) {
      const item = buckets.get(cat)?.[round];
      if (item?.url && !seen.has(item.url)) {
        seen.add(item.url);
        out.push(item);
        added = true;
        if (out.length >= limit) break;
      }
    }
    round += 1;
    if (!added) break;
  }

  return out;
}

async function existingHashes(urls) {
  const hashes = urls.map((u) => hashUrl(u));
  const found = await Article.find({ urlHash: { $in: hashes } }).select('urlHash').lean();
  const set = new Set(found.map((f) => f.urlHash));
  return set;
}

function toRawArticle({
  title,
  description,
  content,
  url,
  imageUrl,
  sourceName,
  sourceUrl,
  publishedAt,
  suggestedCategory,
}) {
  const urlHash = hashUrl(url);
  return {
    title: title || 'Untitled',
    description: description || '',
    content: content || description || '',
    url,
    urlHash,
    imageUrl: imageUrl || '',
    sourceName,
    sourceUrl,
    publishedAt: publishedAt ? new Date(publishedAt) : new Date(),
    suggestedCategory,
  };
}

async function fetchNewsApi() {
  const key = process.env.NEWSAPI_KEY;
  if (!key) return [];
  const out = [];
  for (const cat of NEWSAPI_CATS) {
    try {
      const { data } = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: { category: cat, pageSize: 20, language: 'en', apiKey: key },
        timeout: 15000,
      });
      for (const a of data.articles || []) {
        if (!a.url || !a.title) continue;
        out.push(
          toRawArticle({
            title: a.title,
            description: a.description,
            content: a.content,
            url: a.url,
            imageUrl: a.urlToImage,
            sourceName: a.source?.name || 'NewsAPI',
            sourceUrl: a.url,
            publishedAt: a.publishedAt,
            suggestedCategory: normalizeFeedCategory(mapNewsApiCategory(cat)),
          })
        );
      }
    } catch {
      /* skip category */
    }
  }

  const extraQueries = [
    { q: 'politics OR election OR government OR parliament', category: 'Politics' },
    { q: 'weather OR storm OR hurricane OR forecast OR climate', category: 'Weather' },
    { q: 'cryptocurrency OR bitcoin OR ethereum', category: 'Crypto' },
  ];
  for (const { q, category } of extraQueries) {
    try {
      const { data } = await axios.get('https://newsapi.org/v2/everything', {
        params: {
          q,
          language: 'en',
          sortBy: 'publishedAt',
          pageSize: 15,
          apiKey: key,
        },
        timeout: 15000,
      });
      for (const a of data.articles || []) {
        if (!a.url || !a.title) continue;
        out.push(
          toRawArticle({
            title: a.title,
            description: a.description,
            content: a.content,
            url: a.url,
            imageUrl: a.urlToImage,
            sourceName: a.source?.name || 'NewsAPI',
            sourceUrl: a.url,
            publishedAt: a.publishedAt,
            suggestedCategory: normalizeFeedCategory(category),
          })
        );
      }
    } catch {
      /* skip query */
    }
  }
  return out;
}

async function fetchGNews() {
  const key = process.env.GNEWS_KEY;
  if (!key) return [];
  const out = [];
  for (const topic of GNEWS_TOPICS) {
    try {
      const { data } = await axios.get('https://gnews.io/api/v4/top-headlines', {
        params: { topic, token: key, lang: 'en', max: 20 },
        timeout: 15000,
      });
      for (const a of data.articles || []) {
        if (!a.url) continue;
        out.push(
          toRawArticle({
            title: a.title,
            description: a.description,
            content: a.content,
            url: a.url,
            imageUrl: a.image,
            sourceName: a.source?.name || 'GNews',
            sourceUrl: a.url,
            publishedAt: a.publishedAt,
            suggestedCategory: normalizeFeedCategory(mapGnewsTopic(topic)),
          })
        );
      }
    } catch {
      /* skip topic */
    }
  }
  const searchQueries = [
    { q: 'politics OR election OR government', category: 'Politics' },
    { q: 'bitcoin OR cryptocurrency OR blockchain', category: 'Crypto' },
    { q: 'weather OR storm OR hurricane OR forecast', category: 'Weather' },
  ];
  for (const { q, category } of searchQueries) {
    try {
      const { data } = await axios.get('https://gnews.io/api/v4/search', {
        params: { q, token: key, lang: 'en', max: 15 },
        timeout: 15000,
      });
      for (const a of data.articles || []) {
        if (!a.url) continue;
        out.push(
          toRawArticle({
            title: a.title,
            description: a.description,
            content: a.content,
            url: a.url,
            imageUrl: a.image,
            sourceName: a.source?.name || 'GNews',
            sourceUrl: a.url,
            publishedAt: a.publishedAt,
            suggestedCategory: normalizeFeedCategory(category),
          })
        );
      }
    } catch {
      /* skip query */
    }
  }
  return out;
}

async function getRssFeedList() {
  const dbFeeds = await NewsSource.find({ type: 'rss', url: { $exists: true, $ne: '' } })
    .select('name url category')
    .lean();
  const seen = new Set();
  const list = [];
  for (const feed of RSS_FEEDS) {
    if (!seen.has(feed.url)) {
      seen.add(feed.url);
      list.push(feed);
    }
  }
  for (const src of dbFeeds) {
    if (!seen.has(src.url)) {
      seen.add(src.url);
      list.push({
        name: src.name || 'RSS',
        url: src.url,
        category: normalizeFeedCategory(src.category),
      });
    }
  }
  return list;
}

async function fetchOneRssFeed(feed, disabled) {
  const src = await NewsSource.findOne({ url: feed.url });
  if (src && disabled.has(String(src._id))) return [];
  const articles = [];
  try {
    const parsed = await parser.parseURL(feed.url);
    for (const item of (parsed.items || []).slice(0, RSS_ITEMS_PER_FEED)) {
      if (!item.link || !item.title) continue;
      articles.push(
        toRawArticle({
          title: item.title,
          description: item.contentSnippet || '',
          content: item['content:encoded'] || item.content || item.contentSnippet || '',
          url: item.link,
          imageUrl: item.enclosure?.url || '',
          sourceName: feed.name,
          sourceUrl: feed.url,
          publishedAt: item.pubDate,
          suggestedCategory: normalizeFeedCategory(feed.category),
        })
      );
    }
    if (src) {
      src.lastFetched = new Date();
      src.articlesCount = (src.articlesCount || 0) + (parsed.items?.length || 0);
      await src.save();
    }
  } catch {
    /* skip feed */
  }
  return articles;
}

async function fetchRssFeeds() {
  const settings = await getSiteSettings();
  const disabled = new Set((settings.disabledSourceIds || []).map(String));
  const feedList = await getRssFeedList();
  const results = await Promise.allSettled(
    feedList.map((feed) => fetchOneRssFeed(feed, disabled))
  );
  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
}

function dedupeByUrl(articles) {
  const seen = new Set();
  const out = [];
  for (const a of articles) {
    if (!a.url || seen.has(a.url)) continue;
    seen.add(a.url);
    out.push(a);
  }
  return out;
}

export async function fetchAllNews() {
  const [a, b, c] = await Promise.allSettled([fetchNewsApi(), fetchGNews(), fetchRssFeeds()]);
  const articles = [
    ...(a.status === 'fulfilled' ? a.value : []),
    ...(b.status === 'fulfilled' ? b.value : []),
    ...(c.status === 'fulfilled' ? c.value : []),
  ];
  const merged = dedupeByUrl(articles);
  const urls = merged.map((m) => m.url);
  const existing = await existingHashes(urls);
  const fresh = merged.filter((m) => !existing.has(m.urlHash));
  return fresh;
}

/** Latest headlines for admin AI picker (includes already-imported stories). */
export async function fetchLatestNewsFeedForAdmin(limit = 120, options = {}) {
  const { category: categoryFilter } = options;
  const [a, b, c] = await Promise.allSettled([fetchNewsApi(), fetchGNews(), fetchRssFeeds()]);
  let merged = dedupeByUrl([
    ...(a.status === 'fulfilled' ? a.value : []),
    ...(b.status === 'fulfilled' ? b.value : []),
    ...(c.status === 'fulfilled' ? c.value : []),
  ]).map((item) => ({
    ...item,
    suggestedCategory: normalizeFeedCategory(item.suggestedCategory),
  }));

  const counts = countByCategory(merged);
  const categories = NEWS_FEED_CATEGORIES.map((name) => ({ name, count: counts[name] || 0 }));

  const activeCategory = categoryFilter ? normalizeFeedCategory(categoryFilter) : null;
  let pool = merged;
  if (activeCategory) {
    pool = merged.filter((item) => item.suggestedCategory === activeCategory);
  }

  pool.sort((x, y) => new Date(y.publishedAt) - new Date(x.publishedAt));

  const picked = activeCategory
    ? pool.slice(0, limit)
    : balancedFeedByCategory(pool, limit);

  const existing = await existingHashes(picked.map((m) => m.url));

  const items = picked.map((item) => ({
    title: item.title,
    description: item.description,
    url: item.url,
    imageUrl: item.imageUrl,
    sourceName: item.sourceName,
    sourceUrl: item.sourceUrl,
    publishedAt: item.publishedAt,
    suggestedCategory: item.suggestedCategory,
    alreadyImported: existing.has(item.urlHash),
  }));

  return {
    items,
    categories,
    activeCategory: activeCategory || 'All',
    totalInCategory: activeCategory ? pool.length : merged.length,
  };
}

export async function fetchByCategory(category) {
  const all = await fetchAllNews();
  const target = (category || '').toLowerCase();
  return all.filter((r) => {
    const sc = (r.suggestedCategory || '').toLowerCase();
    return sc === target || sc.includes(target);
  });
}

export async function extractArticleFromUrl(pageUrl) {
  const trimmed = pageUrl.trim();
  const isLikelyRss =
    trimmed.endsWith('.xml') ||
    trimmed.includes('/rss') ||
    trimmed.includes('/feed');

  if (isLikelyRss) {
    const parsed = await parser.parseURL(trimmed);
    const item = parsed.items?.[0];
    if (!item?.link) throw new Error('No items in RSS feed');
    return toRawArticle({
      title: item.title,
      description: item.contentSnippet || '',
      content: item['content:encoded'] || item.content || '',
      url: item.link,
      imageUrl: item.enclosure?.url || '',
      sourceName: parsed.title || 'RSS',
      sourceUrl: trimmed,
      publishedAt: item.pubDate,
      suggestedCategory: 'World',
    });
  }

  const { default: JSDOM } = await import('jsdom');
  const { Readability } = await import('@mozilla/readability');

  const { data: html } = await axios.get(trimmed, {
    timeout: 20000,
    headers: { 'User-Agent': 'DailyLensBot/1.0' },
    maxRedirects: 5,
    validateStatus: (s) => s < 500,
  });

  const dom = new JSDOM(html, { url: trimmed });
  const reader = new Readability(dom.window.document);
  const art = reader.parse();
  if (!art?.title) throw new Error('Could not extract article from URL');

  return toRawArticle({
    title: art.title,
    description: art.excerpt || '',
    content: art.textContent || art.content || '',
    url: trimmed,
    imageUrl: '',
    sourceName: new URL(trimmed).hostname,
    sourceUrl: trimmed,
    publishedAt: new Date(),
    suggestedCategory: 'World',
  });
}
