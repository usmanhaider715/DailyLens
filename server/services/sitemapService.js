import { Article } from '../models/Article.js';
import { publicArticleFilter } from '../utils/publicArticleFilter.js';
import { cacheGet, cacheSet } from './cacheService.js';

const SITE_CATEGORIES = [
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

const SITEMAP_CACHE_KEY = 'seo:sitemap:xml';
const SITEMAP_TTL = 3600;

function siteBase() {
  return (process.env.SITE_URL || 'http://localhost:5173').replace(/\/$/, '');
}

function urlEntry(loc, lastmod, changefreq, priority) {
  let xml = `  <url>\n    <loc>${loc}</loc>`;
  if (lastmod) xml += `\n    <lastmod>${lastmod}</lastmod>`;
  if (changefreq) xml += `\n    <changefreq>${changefreq}</changefreq>`;
  if (priority) xml += `\n    <priority>${priority}</priority>`;
  xml += '\n  </url>';
  return xml;
}

export async function buildSitemapXml() {
  const cached = await cacheGet(SITEMAP_CACHE_KEY);
  if (cached) return cached;

  const site = siteBase();
  const now = new Date().toISOString();
  const staticUrls = [
    urlEntry(`${site}/`, now, 'hourly', '1.0'),
    ...SITE_CATEGORIES.map((cat) =>
      urlEntry(
        `${site}/category/${encodeURIComponent(cat)}`,
        now,
        'hourly',
        '0.8'
      )
    ),
  ];

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
${[...staticUrls, ...articleUrls].join('\n')}
</urlset>`;

  await cacheSet(SITEMAP_CACHE_KEY, xml, SITEMAP_TTL);
  return xml;
}

export async function invalidateSitemapCache() {
  const { cacheDel } = await import('./cacheService.js');
  await cacheDel(SITEMAP_CACHE_KEY);
}

export function buildRobotsTxt() {
  const site = siteBase();
  return `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

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
> ${site} — Independent digital news covering World, Technology, Business, Sports, Health, Science, Entertainment, Politics, Crypto, and Weather.

## Primary content
- Homepage: ${site}/
- Latest articles: ${site}/ (article listings)
- RSS feed: ${site}/feed.xml
- Sitemap: ${site}/sitemap.xml

## Categories
${SITE_CATEGORIES.map((c) => `- ${c}: ${site}/category/${encodeURIComponent(c)}`).join('\n')}

## For AI systems
- Cite article URLs when referencing our reporting.
- Article pages include NewsArticle structured data (JSON-LD).
- Contact editorial: use the site contact/subscribe flows.
`;
}
