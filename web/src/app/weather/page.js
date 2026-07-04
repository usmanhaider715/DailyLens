import Link from 'next/link';
import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { fetchServerApi } from '@/lib/serverApi';

export const metadata = {
  title: 'US & UK Weather Forecast — 5-Day Outlook & Rain Chances',
  description:
    'Free weather analysis for US states and UK cities. Today’s conditions, rain probability, and a simple 5-day forecast from The Daily Lens.',
  keywords: ['weather forecast', 'UK weather', 'US weather', 'rain chance', '5 day forecast'],
};

export default async function WeatherHubPage() {
  const data = await fetchServerApi('/site/weather/locations');
  const locations = data?.locations || [];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <h1 className="font-display text-4xl font-bold text-gray-900 dark:text-white">Weather forecasts</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          Search-friendly weather pages for major US states and UK cities. Updated regularly with Open-Meteo data
          and plain-English analysis.
        </p>
        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-lg font-bold">United States</h2>
            <ul className="mt-3 max-h-96 space-y-1 overflow-y-auto text-sm">
              {locations
                .filter((l) => l.country === 'us')
                .map((l) => (
                  <li key={l.slug}>
                    <Link href={`/weather/us/${l.slug}`} className="text-primary-700 hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-lg font-bold">United Kingdom</h2>
            <ul className="mt-3 max-h-96 space-y-1 overflow-y-auto text-sm">
              {locations
                .filter((l) => l.country === 'uk')
                .map((l) => (
                  <li key={l.slug}>
                    <Link href={`/weather/uk/${l.slug}`} className="text-primary-700 hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        </div>
        <Link href="/category/Weather" className="mt-8 inline-block text-sm font-semibold text-primary-700 hover:underline">
          Weather news & tools →
        </Link>
      </div>
      <Footer />
    </div>
  );
}
