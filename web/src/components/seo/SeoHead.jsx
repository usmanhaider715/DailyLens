import { Helmet } from 'react-helmet-async';
import { SITE_NAME, SITE_TAGLINE, absoluteUrl, DEFAULT_OG_IMAGE } from '../../config/site.js';

export function SeoHead({
  title,
  description = SITE_TAGLINE,
  path = '/',
  image,
  type = 'website',
  noindex = false,
  jsonLd,
}) {
  const pageTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const canonical = absoluteUrl(path);
  const ogImage = image || absoluteUrl(DEFAULT_OG_IMAGE);
  const desc = description?.slice(0, 160) || SITE_TAGLINE;

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={canonical} />
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : <meta name="robots" content="index, follow, max-image-preview:large" />}

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title || SITE_NAME} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={canonical} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title || SITE_NAME} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd
        ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]).map((block, i) => (
            <script key={i} type="application/ld+json">
              {JSON.stringify(block)}
            </script>
          ))
        : null}
    </Helmet>
  );
}
