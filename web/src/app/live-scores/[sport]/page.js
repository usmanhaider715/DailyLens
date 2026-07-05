import Link from 'next/link';
import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { LiveScoreboard } from '@/components/home/LiveScoreboard';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd, buildSportsEventsFromGames } from '@/utils/seoHelpers';
import { fetchApi } from '@/lib/api';

export const dynamic = 'force-dynamic';

const SPORT_META = {
  football: {
    league: 'soccer',
    title: 'Football Live Scores — Soccer Results & Fixtures',
    description:
      'Live football (soccer) scores including FIFA World Cup, Premier League, La Liga, Bundesliga, Serie A, Ligue 1, and MLS. Real-time results updated every 20 seconds.',
    keywords: [
      'football live score',
      'soccer live score',
      'live football scores',
      'FIFA World Cup live score',
      'Premier League live scores',
      'soccer results today',
    ],
    h1: 'Football live scores',
  },
  cricket: {
    league: 'cricket',
    title: 'Cricket Live Scores — IPL, Tests & T20 Results',
    description:
      'Live cricket scores and match results. Follow international tests, ODIs, T20s, and league cricket with live, upcoming, and recent results.',
    keywords: ['cricket live score', 'live cricket scores', 'IPL live score', 'cricket results today'],
    h1: 'Cricket live scores',
  },
  nfl: {
    league: 'nfl',
    title: 'NFL Live Scores — American Football Results',
    description: 'Live NFL scores, schedules, and results. Real-time American football scoreboard.',
    keywords: ['NFL live scores', 'NFL results', 'American football live score'],
    h1: 'NFL live scores',
  },
  nba: {
    league: 'nba',
    title: 'NBA Live Scores — Basketball Results Today',
    description: 'Live NBA basketball scores and results updated in real time.',
    keywords: ['NBA live scores', 'basketball live score', 'NBA results today'],
    h1: 'NBA live scores',
  },
};

export async function generateStaticParams() {
  return Object.keys(SPORT_META).map((sport) => ({ sport }));
}

export async function generateMetadata({ params }) {
  const { sport } = await params;
  const meta = SPORT_META[sport];
  if (!meta) return { title: 'Live Scores' };
  return {
    title: meta.title,
    description: meta.description,
    keywords: meta.keywords,
    alternates: { canonical: `/live-scores/${sport}` },
    openGraph: { title: meta.title, description: meta.description },
  };
}

export default async function LiveScoresSportPage({ params }) {
  const { sport } = await params;
  const meta = SPORT_META[sport];
  if (!meta) {
    return (
      <div className="min-h-screen p-10 text-center">
        <p>Sport not found.</p>
        <Link href="/live-scores" className="text-primary-700 underline">
          Back to live scores
        </Link>
      </div>
    );
  }

  let games = [];
  try {
    const data = await fetchApi(`/live/scores?league=${meta.league}`, { revalidate: 60, cache: 'no-store' });
    games = data?.games || [];
  } catch {
    /* widget loads client-side */
  }

  const jsonLd = [
    buildBreadcrumbJsonLd([
      { name: 'Home', url: '/' },
      { name: 'Live Scores', url: '/live-scores' },
      { name: meta.h1, url: `/live-scores/${sport}` },
    ]),
    ...buildSportsEventsFromGames(games, 8),
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <JsonLd data={jsonLd} />
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <Link href="/live-scores" className="text-sm font-semibold text-primary-700 hover:underline">
          ← All live scores
        </Link>
        <h1 className="mt-4 font-display text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white">{meta.h1}</h1>
        <p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-400">{meta.description}</p>
        <div className="mt-8">
          <LiveScoreboard defaultLeague={meta.league} />
        </div>
      </div>
      <Footer />
    </div>
  );
}
