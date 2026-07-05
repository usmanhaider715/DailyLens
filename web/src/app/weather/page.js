import Link from 'next/link';
import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { WeatherWorldHub } from '@/components/weather/WeatherWorldHub';
import { fetchServerApi } from '@/lib/serverApi';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Weather Forecasts — Worldwide Cities & Regions',
  description:
    'Free weather forecasts for cities and regions in 240+ countries. US states, UK cities, and major towns worldwide with 5-day outlook and rain chances.',
  keywords: [
    'weather forecast',
    'world weather',
    'city weather',
    '5 day forecast',
    'rain chance',
    'global weather',
  ],
  alternates: {
    canonical: '/weather',
  },
};

export default async function WeatherHubPage() {
  const data = await fetchServerApi('/site/weather/locations?summary=1');
  const countries = data?.countries || [];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <h1 className="font-display text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white">
          Worldwide weather forecasts
        </h1>
        <p className="mt-2 max-w-3xl text-gray-600 dark:text-gray-300">
          Search-friendly weather pages for {countries.length} countries and thousands of cities. Open-Meteo data
          with plain-English analysis. Your browser location is used on the homepage when enabled.
        </p>
        <WeatherWorldHub initialCountries={countries} />
        <Link
          href="/category/Weather"
          className="mt-8 inline-block text-sm font-semibold text-primary-700 hover:underline dark:text-primary-400"
        >
          Weather news & tools →
        </Link>
      </div>
      <Footer />
    </div>
  );
}
