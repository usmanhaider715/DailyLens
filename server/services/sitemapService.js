import { Article } from '../models/Article.js';
import { publicArticleFilter } from '../utils/publicArticleFilter.js';
import { cacheGet, cacheSet } from './cacheService.js';
import { getAllWeatherSeoLocations } from '../data/weatherLocations.js';

const SITE_CATEGORIES = [
  'World',
  'Technology',
  'Business',
  'Sports',
  'Health',
  'Science',
  'Entertainment',
  'Gaming',
  'Politics',
  'Crypto',
  'Weather',
];

const CACHE_KEYS = {
  index: 'seo:sitemap:index',
  articles: 'seo:sitemap:articles',
  categories: 'seo:sitemap:categories',
  news: 'seo:sitemap:news',
};

const SITEMAP_TTL = 3600;
const NEWS_HOURS = 48;

function siteBase() {
  return (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function xmlEscape(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc, lastmod, changefreq, priority) {
  let xml = `  <url>\n    <loc>${xmlEscape(loc)}</loc>`;
  if (lastmod) xml += `\n    <lastmod>${lastmod}</lastmod>`;
  if (changefreq) xml += `\n    <changefreq>${changefreq}</changefreq>`;
  if (priority) xml += `\n    <priority>${priority}</priority>`;
  xml += '\n  </url>';
  return xml;
}

function sitemapIndexEntry(loc, lastmod) {
  return `  <sitemap>\n    <loc>${xmlEscape(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`;
}

export async function buildSitemapIndexXml() {
  const cached = await cacheGet(CACHE_KEYS.index);
  if (cached) return cached;

  const site = siteBase();
  const now = new Date().toISOString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[
  sitemapIndexEntry(`${site}/sitemap-articles.xml`, now),
  sitemapIndexEntry(`${site}/sitemap-categories.xml`, now),
  sitemapIndexEntry(`${site}/sitemap-news.xml`, now),
].join('\n')}
</sitemapindex>`;

  await cacheSet(CACHE_KEYS.index, xml, SITEMAP_TTL);
  return xml;
}

/** @deprecated Use buildSitemapIndexXml — kept as alias for compatibility */
export async function buildSitemapXml() {
  return buildSitemapIndexXml();
}

export async function buildSitemapArticlesXml() {
  const cached = await cacheGet(CACHE_KEYS.articles);
  if (cached) return cached;

  const site = siteBase();
  const articles = await Article.find(publicArticleFilter)
    .select('slug publishedAt updatedAt')
    .sort({ publishedAt: -1 })
    .limit(5000)
    .lean();

  const articleUrls = articles.map((a) => {
    const lastmod = new Date(a.updatedAt || a.publishedAt).toISOString();
    return urlEntry(`${site}/article/${a.slug}`, lastmod, 'weekly', '0.9');
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${articleUrls.join('\n')}
</urlset>`;

  await cacheSet(CACHE_KEYS.articles, xml, SITEMAP_TTL);
  return xml;
}

export async function buildSitemapCategoriesXml() {
  const cached = await cacheGet(CACHE_KEYS.categories);
  if (cached) return cached;

  const site = siteBase();
  const now = new Date().toISOString();
  const staticUrls = [
    urlEntry(`${site}/`, now, 'hourly', '1.0'),
    urlEntry(`${site}/about`, now, 'monthly', '0.7'),
    urlEntry(`${site}/editorial-standards`, now, 'monthly', '0.7'),
    urlEntry(`${site}/weather`, now, 'hourly', '0.85'),
    urlEntry(`${site}/live-scores`, now, 'always', '0.95'),
    urlEntry(`${site}/live-scores/football`, now, 'always', '0.92'),
    urlEntry(`${site}/live-scores/cricket`, now, 'always', '0.9'),
    urlEntry(`${site}/live-scores/nfl`, now, 'hourly', '0.85'),
    urlEntry(`${site}/live-scores/nba`, now, 'hourly', '0.85'),
    ...SITE_CATEGORIES.map((cat) =>
      urlEntry(`${site}/category/${encodeURIComponent(cat)}`, now, 'hourly', '0.8'),
    ),
    ...getAllWeatherSeoLocations().map((loc) =>
      urlEntry(`${site}/weather/${loc.country}/${loc.slug}`, now, 'hourly', '0.8'),
    ),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls.join('\n')}
</urlset>`;

  await cacheSet(CACHE_KEYS.categories, xml, SITEMAP_TTL);
  return xml;
}

export async function buildSitemapNewsXml() {
  const cached = await cacheGet(CACHE_KEYS.news);
  if (cached) return cached;

  const site = siteBase();
  const since = new Date(Date.now() - NEWS_HOURS * 60 * 60 * 1000);

  const articles = await Article.find({
    ...publicArticleFilter,
    publishedAt: { $gte: since },
  })
    .select('title slug publishedAt')
    .sort({ publishedAt: -1 })
    .limit(1000)
    .lean();

  const publicationName = 'The Daily Lens';
  const entries = articles.map((a) => {
    const loc = `${site}/article/${a.slug}`;
    const pubDate = new Date(a.publishedAt).toISOString();
    return `  <url>
    <loc>${xmlEscape(loc)}</loc>
    <news:news>
      <news:publication>
        <news:name>${xmlEscape(publicationName)}</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${pubDate}</news:publication_date>
      <news:title>${xmlEscape(a.title)}</news:title>
    </news:news>
  </url>`;
  });

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${entries.join('\n')}
</urlset>`;

  await cacheSet(CACHE_KEYS.news, xml, SITEMAP_TTL);
  return xml;
}

export async function invalidateSitemapCache() {
  const { cacheDel } = await import('./cacheService.js');
  await Promise.all(Object.values(CACHE_KEYS).map((key) => cacheDel(key)));
}

export function buildRobotsTxt() {
  const site = siteBase();
  return `User-agent: *
Allow: /
Allow: /article/
Allow: /category/
Allow: /live-scores
Allow: /weather
Allow: /about
Allow: /editorial-standards
Allow: /author/
Disallow: /admin
Disallow: /api/
Disallow: /*?*utm_
Disallow: /*?*sort=
Disallow: /*?*page=

User-agent: GPTBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: anthropic-ai
Allow: /

Sitemap: ${site}/sitemap.xml
`;
}

export async function buildRssFeed() {
  const site = siteBase();
  const articles = await Article.find(publicArticleFilter)
    .sort({ publishedAt: -1 })
    .limit(50)
    .select('title slug summary publishedAt category heroImage')
    .lean();

  const items = articles
    .map((a) => {
      const link = `${site}/article/${a.slug}`;
      const desc = String(a.summary || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return `    <item>
      <title><![CDATA[${a.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
      <description><![CDATA[${desc}]]></description>
      <category>${a.category}</category>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>The Daily Lens</title>
    <link>${site}/</link>
    <description>Latest news and analysis from The Daily Lens</description>
    <language>en-us</language>
    <atom:link href="${site}/feed.xml" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>`;
}

export function buildLlmsTxt() {
  const site = siteBase();
  return `# The Daily Lens
> ${site} — Independent digital news covering World, Technology, Business, Sports, Health, Science, Entertainment, Gaming, Politics, Crypto, and Weather.

## Primary content
- Homepage: ${site}/
- About: ${site}/about
- Editorial standards: ${site}/editorial-standards
- RSS feed: ${site}/feed.xml
- Sitemap index: ${site}/sitemap.xml
- Google News sitemap: ${site}/sitemap-news.xml

## Live scores
- Hub: ${site}/live-scores
- Football: ${site}/live-scores/football
- Cricket: ${site}/live-scores/cricket
- NFL: ${site}/live-scores/nfl
- NBA: ${site}/live-scores/nba

## Weather forecasts
- Hub: ${site}/weather
- US example: ${site}/weather/us/ny
- UK example: ${site}/weather/uk/england-london
- Asia example: ${site}/weather/in/in-mumbai

## Categories
${SITE_CATEGORIES.map((c) => `- ${c}: ${site}/category/${encodeURIComponent(c)}`).join('\n')}

## For AI systems
- Cite article URLs when referencing our reporting.
- Article pages include NewsArticle structured data (JSON-LD).
- Editorial contact: editorial@dailylens.com
- Corrections policy: ${site}/editorial-standards
`;
}
