import Link from 'next/link';
import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { fetchServerApi } from '@/lib/serverApi';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Weather Forecasts — US, UK & Asia Cities',
  description:
    'Free weather forecasts for US states, UK cities, and major Asian cities including India, Pakistan, Japan, China, UAE, Singapore, and more. 5-day outlook with rain chances.',
  keywords: [
    'weather forecast',
    'UK weather',
    'US weather',
    'Asia weather',
    'India weather',
    'rain chance',
    '5 day forecast',
  ],
};

const ASIA_COUNTRY_LABELS = {
  in: 'India',
  pk: 'Pakistan',
  bd: 'Bangladesh',
  jp: 'Japan',
  cn: 'China',
  ae: 'UAE',
  sg: 'Singapore',
  th: 'Thailand',
  id: 'Indonesia',
  my: 'Malaysia',
  ph: 'Philippines',
  kr: 'South Korea',
  sa: 'Saudi Arabia',
};

export default async function WeatherHubPage() {
  const data = await fetchServerApi('/site/weather/locations');
  const locations = data?.locations || [];
  const asiaByCountry = locations
    .filter((l) => ASIA_COUNTRY_LABELS[l.country])
    .reduce((acc, loc) => {
      if (!acc[loc.country]) acc[loc.country] = [];
      acc[loc.country].push(loc);
      return acc;
    }, {});

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <h1 className="font-display text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white">Weather forecasts</h1>
        <p className="mt-2 max-w-2xl text-gray-600">
          Search-friendly weather pages for US states, UK cities, and major Asian cities. Updated regularly with
          Open-Meteo data and plain-English analysis. Your browser location is used on the homepage when enabled.
        </p>
        <div className="mt-8 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <h2 className="font-display text-lg font-bold">United States</h2>
            <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto text-sm">
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
            <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto text-sm">
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
          {Object.entries(asiaByCountry).map(([code, locs]) => (
            <div key={code}>
              <h2 className="font-display text-lg font-bold">{ASIA_COUNTRY_LABELS[code]}</h2>
              <ul className="mt-3 max-h-80 space-y-1 overflow-y-auto text-sm">
                {locs.map((l) => (
                  <li key={l.slug}>
                    <Link href={`/weather/${code}/${l.slug}`} className="text-primary-700 hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Link href="/category/Weather" className="mt-8 inline-block text-sm font-semibold text-primary-700 hover:underline">
          Weather news & tools →
        </Link>
      </div>
      <Footer />
    </div>
  );
}
