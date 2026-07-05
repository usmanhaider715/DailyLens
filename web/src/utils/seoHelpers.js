import { SITE_NAME, SITE_TAGLINE, absoluteUrl, canonicalUrl, SOCIAL_LINKS } from '../config/site.js';
import { stripHtml } from './stripHtml.js';

export function buildNewsArticleJsonLd({ article, canonical }) {
  const pageUrl = canonical?.startsWith('http') ? canonical : canonicalUrl(canonical || `/article/${article.slug}`);
  const summary = stripHtml(article.summary);
  const imageUrl = article.heroImage?.url || absoluteUrl('/logo.png');

  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: summary,
    image: [imageUrl],
    datePublished: new Date(article.publishedAt).toISOString(),
    dateModified: new Date(article.updatedAt || article.publishedAt).toISOString(),
    author: {
      '@type': 'Person',
      name: article.author || 'The Daily Lens Desk',
      url: absoluteUrl(`/author/${authorSlug(article.author)}`),
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: absoluteUrl('/'),
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
    sameAs: SOCIAL_LINKS.filter(Boolean),
  };
}

export function buildSportsEventJsonLd(game) {
  if (!game?.home?.name || !game?.away?.name) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: `${game.home.name} vs ${game.away.name}`,
    sport: game.leagueId === 'soccer' ? 'Soccer' : game.leagueId === 'cricket' ? 'Cricket' : game.league || 'Sports',
    homeTeam: { '@type': 'SportsTeam', name: game.home.name },
    awayTeam: { '@type': 'SportsTeam', name: game.away.name },
    eventStatus: game.isLive
      ? 'https://schema.org/EventScheduled'
      : game.isFinal
        ? 'https://schema.org/EventCancelled'
        : 'https://schema.org/EventScheduled',
  };

  if (game.eventDate || game.startsAt) {
    schema.startDate = new Date(game.eventDate || game.startsAt).toISOString();
  }
  if (game.competition) {
    schema.location = { '@type': 'Place', name: game.competition };
  }
  if (game.home?.score != null && game.away?.score != null) {
    schema.description = `Live score: ${game.home.name} ${game.home.score} - ${game.away.score} ${game.away.name}`;
  }

  return schema;
}

export function buildSportsEventsFromGames(games = [], limit = 10) {
  return games
    .filter((g) => g?.home?.name && g?.away?.name)
    .slice(0, limit)
    .map(buildSportsEventJsonLd)
    .filter(Boolean);
}

export function authorSlug(name) {
  return String(name || 'the-daily-lens-desk')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'the-daily-lens-desk';
}
