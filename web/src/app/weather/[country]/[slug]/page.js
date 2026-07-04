import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { WeatherAnalysisDisplay } from '@/components/weather/WeatherAnalysisDisplay';
import { fetchServerApi } from '@/lib/serverApi';

export async function generateMetadata({ params }) {
  const { country, slug } = await params;
  const data = await fetchServerApi(`/site/weather/${country}/${slug}`, { revalidate: 1800 });
  const analysis = data?.analysis;
  if (!analysis?.seo) {
    return { title: 'Weather forecast | The Daily Lens' };
  }
  return {
    title: analysis.seo.title,
    description: analysis.seo.description,
    keywords: analysis.seo.keywords,
    openGraph: {
      title: analysis.seo.title,
      description: analysis.seo.description,
      type: 'article',
    },
    alternates: {
      canonical: `/weather/${country}/${slug}`,
    },
  };
}

export default async function WeatherCityPage({ params }) {
  const { country, slug } = await params;
  const data = await fetchServerApi(`/site/weather/${country}/${slug}`, { revalidate: 900 });
  const analysis = data?.analysis;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <WeatherAnalysisDisplay analysis={analysis} country={country} slug={slug} />
      </div>
      <Footer />
    </div>
  );
}
