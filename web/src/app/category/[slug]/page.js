import { CategoryView } from '@/components/pages/CategoryView';

const CATEGORY_SEO = {
  Weather: {
    title: 'Weather Forecast & Analysis — US & UK 5-Day Outlook',
    description:
      'Today’s weather, rain chances, and 5-day forecasts for US states and UK cities. Simple tables and expert summaries from The Daily Lens.',
    keywords: ['weather forecast', 'UK weather', 'US weather', 'rain today', '5 day forecast'],
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
};

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const category = decodeURIComponent(slug);
  const seo = CATEGORY_SEO[category];
  return {
    title: seo?.title || `${category} News — The Daily Lens`,
    description:
      seo?.description || `Latest ${category} news, analysis, and updates from The Daily Lens.`,
    keywords: seo?.keywords || [`${category} news`, 'breaking news', 'The Daily Lens'],
    openGraph: {
      title: seo?.title || `${category} News`,
      description: seo?.description,
    },
  };
}

export default async function CategoryPage({ params }) {
  const { slug } = await params;
  return <CategoryView category={decodeURIComponent(slug)} />;
}
