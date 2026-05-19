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

const RSS_FEEDS = [
  { name: 'BBC', url: 'http://feeds.bbci.co.uk/news/rss.xml', category: 'World' },
  { name: 'Reuters', url: 'https://feeds.reuters.com/reuters/topNews', category: 'World' },
  { name: 'TechCrunch', url: 'https://techcrunch.com/feed/', category: 'Technology' },
  { name: 'ESPN', url: 'https://www.espn.com/espn/rss/news', category: 'Sports' },
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'Crypto' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'World' },
];

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

/** Round-robin pick so "All" shows every source category, not only latest World headlines. */
function balancedFeedByCategory(articles, limit) {
  const buckets = new Map();
  for (const a of articles) {
    const cat = normalizeFeedCategory(a.suggestedCategory);
    if (!buckets.has(cat)) buckets.set(cat, []);
    buckets.get(cat).push(a);
  }
  for (const list of buckets.values()) {
    list.sort((x, y) => new Date(y.publishedAt) - new Date(x.publishedAt));
  }

  const cats = [...buckets.keys()].sort((a, b) => a.localeCompare(b));
  const out = [];
  const seen = new Set();
  let round = 0;

  while (out.length < limit && cats.length) {
    let added = false;
    for (const cat of cats) {
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
        params: { category: cat, pageSize: 20, apiKey: key },
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

async function fetchRssFeeds() {
  const settings = await getSiteSettings();
  const disabled = new Set((settings.disabledSourceIds || []).map(String));
  const out = [];
  const feedList = await getRssFeedList();
  for (const feed of feedList) {
    const src = await NewsSource.findOne({ url: feed.url });
    if (src && disabled.has(String(src._id))) continue;
    try {
      const parsed = await parser.parseURL(feed.url);
      for (const item of parsed.items || []) {
        if (!item.link) continue;
        out.push(
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
  }
  return out;
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
  const [a, b, c] = await Promise.all([fetchNewsApi(), fetchGNews(), fetchRssFeeds()]);
  const merged = dedupeByUrl([...a, ...b, ...c]);
  const urls = merged.map((m) => m.url);
  const existing = await existingHashes(urls);
  const fresh = merged.filter((m) => !existing.has(m.urlHash));
  return fresh;
}

/** Latest headlines for admin AI picker (includes already-imported stories). */
export async function fetchLatestNewsFeedForAdmin(limit = 80, options = {}) {
  const { category: categoryFilter } = options;
  const [a, b, c] = await Promise.all([fetchNewsApi(), fetchGNews(), fetchRssFeeds()]);
  let merged = dedupeByUrl([...a, ...b, ...c]).map((item) => ({
    ...item,
    suggestedCategory: normalizeFeedCategory(item.suggestedCategory),
  }));

  const counts = countByCategory(merged);
  const categories = NEWS_FEED_CATEGORIES.map((name) => ({ name, count: counts[name] || 0 })).filter(
    (c) => c.count > 0
  );

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
