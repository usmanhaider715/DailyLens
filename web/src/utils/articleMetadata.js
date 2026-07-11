import { SITE_NAME, absoluteUrl, canonicalUrl } from '@/config/site';
import { stripHtml } from '@/utils/stripHtml';
import { getArticleFeaturedImage } from '@/utils/articleImage';

const DEFAULT_DESCRIPTION =
  'Breaking news, analysis, and forecasts — clear reporting from The Daily Lens.';

/** Meta description with fallbacks so no article ships blank. */
export function buildArticleMetaDescription(article) {
  const fromSummary = stripHtml(article?.summary || '');
  if (fromSummary.length >= 20) return fromSummary.slice(0, 160);

  const fromBody = stripHtml(article?.body || '');
  if (fromBody.length >= 20) return fromBody.slice(0, 160);

  if (article?.title) {
    return `${article.title} — read the latest on ${SITE_NAME}.`.slice(0, 160);
  }

  return DEFAULT_DESCRIPTION;
}

export function buildArticleOgImage(article) {
  const raw = getArticleFeaturedImage(article) || article?.heroImage?.url || article?.featuredImage || '';
  if (!raw) return absoluteUrl('/logo.png');
  if (/^https?:\/\//i.test(raw)) return raw;
  return absoluteUrl(raw);
}

export function buildArticleMetadata(article, slug) {
  const title = article?.title || 'Article';
  const description = buildArticleMetaDescription(article);
  const canonical = canonicalUrl(`/article/${slug}`);
  const imageUrl = buildArticleOgImage(article);
  const publishedTime = article?.publishedAt
    ? new Date(article.publishedAt).toISOString()
    : undefined;
  const modifiedTime = new Date(article?.updatedAt || article?.publishedAt || Date.now()).toISOString();

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      type: 'article',
      url: canonical,
      siteName: SITE_NAME,
      publishedTime,
      modifiedTime,
      images: [{ url: imageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
    other: {
      ...(publishedTime ? { 'article:published_time': publishedTime } : {}),
      'article:modified_time': modifiedTime,
    },
  };
}
