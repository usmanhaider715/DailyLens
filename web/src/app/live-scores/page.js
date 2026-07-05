import Link from 'next/link';
import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { LiveScoreboard } from '@/components/home/LiveScoreboard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Live Scores — Football, Cricket, NBA, NFL & More',
  description:
    'Free live scores and results for football (soccer), FIFA World Cup, cricket, NFL, NBA, MLB, and NHL. Real-time scoreboard with live, upcoming, and recent matches.',
  keywords: [
    'live scores',
    'live score',
    'football live score',
    'soccer live score',
    'cricket live score',
    'FIFA World Cup live score',
    'Premier League live scores',
    'NBA live scores',
    'NFL live scores',
    'sports scoreboard',
    'live match results',
  ],
  openGraph: {
    title: 'Live Scores — Football, Cricket & Sports | The Daily Lens',
    description: 'Real-time football, cricket, and sports live scores updated every 20 seconds.',
    type: 'website',
  },
  alternates: {
    canonical: '/live-scores',
  },
};

const SPORT_LINKS = [
  { href: '/live-scores/football', label: 'Football / Soccer live scores' },
  { href: '/live-scores/cricket', label: 'Cricket live scores' },
  { href: '/live-scores/nfl', label: 'NFL live scores' },
  { href: '/live-scores/nba', label: 'NBA live scores' },
];

export default async function LiveScoresPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: 'Live Sports Scores — The Daily Lens',
    description: metadata.description,
    url: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/live-scores`,
    about: [
      { '@type': 'SportsEvent', name: 'Football live scores' },
      { '@type': 'SportsEvent', name: 'Cricket live scores' },
      { '@type': 'SportsEvent', name: 'FIFA World Cup live scores' },
    ],
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        <header className="mb-8 max-w-3xl">
          <h1 className="font-display text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white">
            Live scores &amp; results
          </h1>
          <p className="mt-3 text-base leading-relaxed text-gray-600 dark:text-gray-400">
            Follow football (soccer), FIFA World Cup, cricket, NFL, NBA, MLB, and NHL with our free live scoreboard.
            Scores refresh automatically — live matches, upcoming fixtures, and recent results in one place.
          </p>
        </header>

        <LiveScoreboard defaultLeague="soccer" />

        <section className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {SPORT_LINKS.map((s) => (
            <Link
              key={s.href}
              href={s.href}
              className="rounded-xl border border-gray-200 bg-white p-4 text-sm font-semibold text-primary-800 shadow-sm hover:border-primary-300 dark:border-gray-800 dark:bg-gray-900 dark:text-primary-300"
            >
              {s.label} →
            </Link>
          ))}
        </section>

        <section className="prose prose-sm mt-10 max-w-none dark:prose-invert">
          <h2 className="font-display text-xl font-bold">Live score search coverage</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Whether you search for football live score, cricket live score, soccer results, Premier League scores,
            La Liga, Bundesliga, IPL cricket, FIFA World Cup matches, or American sports like NFL and NBA — this
            page keeps you updated with real-time data from trusted sports APIs.
          </p>
        </section>
      </div>
      <Footer />
    </div>
  );
}
