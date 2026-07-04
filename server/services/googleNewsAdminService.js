import axios from 'axios';
import Parser from 'rss-parser';
import { cacheGet, cacheSet } from './cacheService.js';
import { ARTICLE_CATEGORIES } from '../utils/seoArticleNormalize.js';
import { isUsableImageUrl } from '../utils/heroImageUtils.js';

const parser = new Parser({
  timeout: 20000,
  headers: { 'User-Agent': 'DailyLensBot/1.0' },
});

const HOURS_24_MS = 24 * 60 * 60 * 1000;

/** Google News topic headlines (US feed; 24h filter applied after parse). */
const TOPIC_BY_CATEGORY = {
  World: 'WORLD',
  Technology: 'TECHNOLOGY',
  Business: 'BUSINESS',
  Sports: 'SPORTS',
  Health: 'HEALTH',
  Science: 'SCIENCE',
  Entertainment: 'ENTERTAINMENT',
};

const SEARCH_BY_CATEGORY = {
  Politics: 'politics OR election OR parliament OR government',
  Crypto: 'cryptocurrency OR bitcoin OR ethereum OR crypto',
  Weather: 'weather OR storm OR hurricane OR forecast OR climate',
};

function feedUrlForCategory(category, region = 'us') {
  const hl = region === 'uk' ? 'en-GB' : 'en-US';
  const gl = region === 'uk' ? 'GB' : 'US';
  const ceid = region === 'uk' ? 'GB:en' : 'US:en';
  const topic = TOPIC_BY_CATEGORY[category];
  if (topic) {
    return `https://news.google.com/rss/headlines/section/topic/${topic}?hl=${hl}&gl=${gl}&ceid=${ceid}`;
  }
  const q = SEARCH_BY_CATEGORY[category];
  if (q) {
    return `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
  }
  return null;
}

function isWithin24h(pubDate) {
  if (!pubDate) return true;
  const t = new Date(pubDate).getTime();
  if (Number.isNaN(t)) return true;
  return Date.now() - t <= HOURS_24_MS;
}

function mapRssItem(item, category, region) {
  const url = item.link || item.guid || '';
  if (!url || !item.title) return null;
  const pub = item.pubDate ? new Date(item.pubDate) : new Date();
  if (!isWithin24h(pub)) return null;

  return {
    id: `${region}-${category}-${hashId(url)}`,
    title: item.title,
    description: item.contentSnippet || item.summary || '',
    content: item.contentSnippet || item.content || item.summary || '',
    url,
    imageUrl: extractImageFromItem(item),
    sourceName: item.creator || item.author || item.source || 'Google News',
    sourceUrl: url,
    publishedAt: pub.toISOString(),
    suggestedCategory: category,
    category,
    region,
  };
}

function hashId(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h).toString(36);
}

function extractImageFromItem(item) {
  const content = item.content || '';
  const m = content.match(/src=["']([^"']+)["']/i);
  const url = m?.[1] || '';
  return isUsableImageUrl(url) ? url : '';
}

async function fetchCategoryFeed(category, region) {
  const feedUrl = feedUrlForCategory(category, region);
  if (!feedUrl) return [];

  try {
    const feed = await parser.parseURL(feedUrl);
    return (feed.items || [])
      .map((item) => mapRssItem(item, category, region))
      .filter(Boolean)
      .slice(0, 25);
  } catch {
    return [];
  }
}

export async function listGoogleNews24hByCategory(region = 'us') {
  const cacheKey = `google-news-24h:${region}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const reg = region === 'uk' ? 'uk' : 'us';
  const categories = {};

  await Promise.all(
    ARTICLE_CATEGORIES.map(async (cat) => {
      categories[cat] = await fetchCategoryFeed(cat, reg);
    })
  );

  const total = Object.values(categories).reduce((n, arr) => n + arr.length, 0);
  const payload = {
    region: reg,
    categories,
    categoryList: ARTICLE_CATEGORIES,
    total,
    windowHours: 24,
    updatedAt: new Date().toISOString(),
  };

  await cacheSet(cacheKey, payload, 180);
  return payload;
}

export async function searchGoogleNews(query, region = 'us', limit = 30) {
  const q = String(query || '').trim();
  if (!q) return { items: [], query: q };

  const hl = region === 'uk' ? 'en-GB' : 'en-US';
  const gl = region === 'uk' ? 'GB' : 'US';
  const ceid = region === 'uk' ? 'GB:en' : 'US:en';
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

  const feed = await parser.parseURL(url);
  const items = (feed.items || [])
    .map((item) => {
      const mapped = mapRssItem(item, 'World', region);
      if (!mapped) return null;
      return { ...mapped, searchQuery: q };
    })
    .filter(Boolean)
    .slice(0, limit);

  return {
    items,
    query: q,
    region: region === 'uk' ? 'uk' : 'us',
    count: items.length,
    windowHours: 24,
    updatedAt: new Date().toISOString(),
  };
}

/** Build raw story payload for AI from a feed row. */
export function storyToRawArticle(story) {
  return {
    title: story.title,
    description: story.description || '',
    content: story.content || story.description || '',
    url: story.url,
    imageUrl: story.imageUrl || '',
    sourceName: story.sourceName || 'Google News',
    sourceUrl: story.sourceUrl || story.url,
    publishedAt: story.publishedAt || new Date().toISOString(),
    suggestedCategory: story.suggestedCategory || story.category || 'World',
  };
}
