import { fetchApi } from '@/lib/api';
import { CategoryView } from '@/components/pages/CategoryView';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd } from '@/utils/seoHelpers';

const CATEGORY_SEO = {
  Weather: {
    title: 'Weather Forecast & Analysis — US, UK & Asia 5-Day Outlook',
    description:
      'Today’s weather, rain chances, and 5-day forecasts for US states, UK cities, and major Asian cities. Simple tables and expert summaries from The Daily Lens.',
    keywords: ['weather forecast', 'UK weather', 'US weather', 'Asia weather', 'rain today', '5 day forecast'],
  },
  Crypto: {
    title: 'Crypto News & Live Bitcoin Charts',
    description: 'Latest cryptocurrency news, market moves, and live price charts. Bitcoin, Ethereum, and top coins.',
    keywords: ['crypto news', 'bitcoin price', 'cryptocurrency', 'crypto market'],
  },
  Technology: {
    title: 'Technology News & AI Updates',
    description: 'Breaking tech news, AI, gadgets, and digital policy from The Daily Lens.',
    keywords: ['tech news', 'technology', 'AI news'],
  },
  Sports: {
    title: 'Sports News & Live Scores',
    description: 'Latest sports news, live football and cricket scores, NFL, NBA, and match results from The Daily Lens.',
    keywords: ['sports news', 'live scores', 'football scores', 'cricket scores'],
  },
};

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const category = decodeURIComponent(slug);
  const seo = CATEGORY_SEO[category];
  const path = `/category/${encodeURIComponent(category)}`;
  return {
    title: seo?.title || `${category} News — The Daily Lens`,
    description:
      seo?.description || `Latest ${category} news, analysis, and updates from The Daily Lens.`,
    keywords: seo?.keywords || [`${category} news`, 'breaking news', 'The Daily Lens'],
    openGraph: {
      title: seo?.title || `${category} News`,
      description: seo?.description,
    },
    alternates: { canonical: path },
  };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  const category = decodeURIComponent(slug);
  const data = await fetchApi(
    `/articles?limit=30&page=1&category=${encodeURIComponent(category)}`,
    { revalidate: 120 },
  ).catch(() => ({ items: [] }));

  const breadcrumb = buildBreadcrumbJsonLd([
    { name: 'Home', url: '/' },
    { name: category, url: `/category/${encodeURIComponent(category)}` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumb} />
      <CategoryView category={category} initialItems={data?.items || []} />
    </>
  );
}
