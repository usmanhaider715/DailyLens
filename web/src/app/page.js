import { fetchApi } from '@/lib/api';
import { HomeClient } from '@/components/pages/HomeClient';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildOrganizationJsonLd, buildWebSiteJsonLd } from '@/utils/seoHelpers';

export const revalidate = 60;

export const metadata = {
  title: 'The Daily Lens — Breaking News, Live Scores & Weather',
  description:
    'Breaking news, live football & cricket scores, FIFA World Cup results, weather forecasts for US, UK & Asia, and in-depth analysis from The Daily Lens.',
  keywords: [
    'breaking news',
    'live scores',
    'football live score',
    'cricket live score',
    'weather forecast',
    'daily news',
  ],
  openGraph: {
    title: 'The Daily Lens — News, Live Scores & Weather',
    description: 'Your daily lens on world news, sports live scores, and weather forecasts.',
  },
  alternates: {
    canonical: '/',
  },
};

export default async function HomePage() {
  const [featured, articles, homepage, breaking] = await Promise.all([
    fetchApi('/articles/featured', { revalidate: 60 }).catch(() => []),
    fetchApi('/articles?limit=9&page=1', { revalidate: 60 }).catch(() => ({ items: [] })),
    fetchApi('/site/homepage', { revalidate: 60 }).catch(() => null),
    fetchApi('/articles/breaking', { revalidate: 60 }).catch(() => []),
  ]);

  const stripArticles = (articles?.items || []).slice(0, 8);

  return (
    <>
      <JsonLd data={[buildOrganizationJsonLd(), buildWebSiteJsonLd()]} />
      <HomeClient
        initialFeatured={featured || []}
        initialArticles={articles?.items || []}
        initialArticlesMeta={{ page: articles?.page || 1, pages: articles?.pages || 1 }}
        initialHomepage={homepage}
        initialBreaking={breaking || []}
        initialStrip={stripArticles}
      />
    </>
  );
}
