import axios from 'axios';
import Parser from 'rss-parser';
import { cacheGet, cacheSet } from './cacheService.js';
import { logger } from '../utils/logger.js';
import { isUsableImageUrl } from '../utils/heroImageUtils.js';

const parser = new Parser({
  timeout: 20000,
  headers: { 'User-Agent': 'DailyLensBot/1.0' },
});

const TRENDS_FEEDS = {
  uk: 'https://trends.google.com/trending/rss?geo=GB',
  us: 'https://trends.google.com/trending/rss?geo=US',
};

function parseNewsItemsFromItemXml(itemXml) {
  const items = [];
  const blockRegex = /<ht:news_item>([\s\S]*?)<\/ht:news_item>/gi;
  let m;
  while ((m = blockRegex.exec(itemXml))) {
    const block = m[1];
    const title = block.match(/<ht:news_item_title>([\s\S]*?)<\/ht:news_item_title>/i)?.[1];
    const url = block.match(/<ht:news_item_url>([\s\S]*?)<\/ht:news_item_url>/i)?.[1];
    const source = block.match(/<ht:news_item_source>([\s\S]*?)<\/ht:news_item_source>/i)?.[1];
    const snippet = block.match(/<ht:news_item_snippet>([\s\S]*?)<\/ht:news_item_snippet>/i)?.[1];
    if (title && url) {
      items.push({
        title: decodeXml(title.trim()),
        url: url.trim(),
        source: source ? decodeXml(source.trim()) : '',
        snippet: snippet ? decodeXml(snippet.trim()) : '',
      });
    }
  }
  return items;
}

function decodeXml(str) {
  return String(str || '')
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function parseTrendItems(xml, region) {
  const chunks = xml.split(/<item>/i).slice(1);
  const trends = [];

  for (const chunk of chunks) {
    const itemXml = chunk.split(/<\/item>/i)[0] || '';
    const title = itemXml.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
    if (!title) continue;

    const query = decodeXml(title.trim());
    const traffic = decodeXml(
      itemXml.match(/<ht:approx_traffic>([\s\S]*?)<\/ht:approx_traffic>/i)?.[1] || ''
    );
    const picture = itemXml.match(/<ht:picture>([\s\S]*?)<\/ht:picture>/i)?.[1]?.trim() || '';
    const pubDate = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim() || '';
    const newsItems = parseNewsItemsFromItemXml(itemXml);
    const top = newsItems[0];

    trends.push({
      id: `${region}-${query.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)}`,
      query,
      region,
      traffic: traffic || null,
      picture: picture || top?.url || null,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : null,
      newsItems,
      topHeadline: top?.title || null,
      topUrl: top?.url || null,
      topSource: top?.source || null,
    });
  }

  return trends;
}

async function fetchTrendsForRegion(region) {
  const cacheKey = `google-trends:${region}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const feedUrl = TRENDS_FEEDS[region];
  const { data: xml } = await axios.get(feedUrl, {
    timeout: 20000,
    headers: { 'User-Agent': 'DailyLensBot/1.0', Accept: 'application/rss+xml' },
  });

  const trends = parseTrendItems(xml, region).slice(0, 25);
  await cacheSet(cacheKey, trends, 300);
  return trends;
}

export async function listGoogleTrends(region = 'both') {
  try {
    if (region === 'uk') {
      return { uk: await fetchTrendsForRegion('uk'), us: [] };
    }
    if (region === 'us') {
      return { uk: [], us: await fetchTrendsForRegion('us') };
    }
    const [uk, us] = await Promise.all([
      fetchTrendsForRegion('uk'),
      fetchTrendsForRegion('us'),
    ]);
    return { uk, us };
  } catch (err) {
    logger.warn('Google Trends fetch failed:', err.message);
    throw err;
  }
}

export async function fetchGoogleNewsStoryForTrend(query, region = 'uk') {
  const hl = region === 'us' ? 'en-US' : 'en-GB';
  const gl = region === 'us' ? 'US' : 'GB';
  const ceid = region === 'us' ? 'US:en' : 'GB:en';
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

  const feed = await parser.parseURL(url);
  const item = feed.items?.[0];
  if (!item) {
    throw new Error('No news stories found for this trend');
  }

  const link = item.link || item.guid || '';
  const content = item.contentSnippet || item.content || item.summary || item.title || '';

  return {
    title: item.title || query,
    description: content,
    content,
    url: link,
    imageUrl: '',
    sourceName: item.creator || item.author || 'Google News',
    sourceUrl: link,
    publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
    suggestedCategory: inferCategoryFromQuery(query),
  };
}

function inferCategoryFromQuery(query) {
  const q = query.toLowerCase();
  if (/bitcoin|crypto|ethereum|coin/i.test(q)) return 'Crypto';
  if (/tech|ai |apple|google|microsoft|iphone/i.test(q)) return 'Technology';
  if (/sport|football|nba|cricket|tennis/i.test(q)) return 'Sports';
  if (/weather|storm|hurricane/i.test(q)) return 'Weather';
  if (/health|covid|hospital|disease/i.test(q)) return 'Health';
  if (/election|trump|biden|parliament|politic/i.test(q)) return 'Politics';
  if (/stock|market|economy|bank/i.test(q)) return 'Business';
  return 'World';
}

export function buildRawArticleFromTrend(trend, region) {
  const lines = (trend.newsItems || [])
    .slice(0, 5)
    .map((n) => `• ${n.title}${n.source ? ` (${n.source})` : ''}`)
    .join('\n');

  return {
    title: trend.topHeadline || trend.query,
    description: `Trending search (${region.toUpperCase()}): ${trend.query}. ${trend.traffic ? `Search interest: ${trend.traffic}.` : ''}`,
    content: `Google Trends query: ${trend.query}\n\nRelated headlines:\n${lines || trend.query}`,
    url: trend.topUrl || `https://trends.google.com/trending/rss?geo=${region === 'us' ? 'US' : 'GB'}`,
    imageUrl: isUsableImageUrl(trend.picture) ? trend.picture : '',
    sourceName: trend.topSource || 'Google Trends',
    sourceUrl: trend.topUrl || '',
    publishedAt: trend.publishedAt || new Date().toISOString(),
    suggestedCategory: inferCategoryFromQuery(trend.query),
  };
}
