import { SITE_NAME, SITE_TAGLINE, absoluteUrl } from '../config/site.js';
import { stripHtml } from './stripHtml.js';

export function buildNewsArticleJsonLd({ article, canonical }) {
  const siteOrigin = absoluteUrl('/');
  const pageUrl = canonical.startsWith('http') ? canonical : absoluteUrl(canonical);
  const summary = stripHtml(article.summary);

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: summary,
    image: article.heroImage?.url ? [article.heroImage.url] : [absoluteUrl('/logo.png')],
    datePublished: new Date(article.publishedAt).toISOString(),
    dateModified: new Date(article.updatedAt || article.publishedAt).toISOString(),
    author: {
      '@type': 'Person',
      name: article.author || 'The Daily Lens Desk',
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: siteOrigin,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/logo.png'),
      },
    },
    articleSection: article.category,
    keywords: (article.tags || []).join(', '),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': pageUrl,
    },
    isAccessibleForFree: true,
    inLanguage: article.language || 'en',
  };
}

export function buildWebSiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    description: SITE_TAGLINE,
    url: absoluteUrl('/'),
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${absoluteUrl('/search')}?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function buildBreadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url ? absoluteUrl(item.url) : undefined,
    })),
  };
}

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsMediaOrganization',
    name: SITE_NAME,
    url: absoluteUrl('/'),
    logo: absoluteUrl('/logo.png'),
    sameAs: [],
  };
}
