import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';

export const metadata = {
  title: 'About The Daily Lens',
  description:
    'The Daily Lens is an independent digital news site covering world news, sports live scores, weather forecasts, and analysis for US, UK, and global audiences.',
  alternates: { canonical: '/about' },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <article className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-bold text-gray-900 dark:text-white">About The Daily Lens</h1>
        <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-300">
          The Daily Lens is an independent digital news platform delivering breaking news, live sports scores,
          weather forecasts, and clear analysis for readers in the United States, United Kingdom, and worldwide.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold text-gray-900 dark:text-white">Our mission</h2>
        <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-300">
          We make complex news easy to understand. Every story is written for clarity, with transparent sourcing
          and editorial standards designed for trust in search and on social platforms.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold text-gray-900 dark:text-white">What we cover</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-gray-600 dark:text-gray-300">
          <li>World, politics, business, technology, health, science, and entertainment news</li>
          <li>Live football, cricket, NFL, and NBA scores</li>
          <li>Weather forecasts for US states, UK cities, and major Asian metros</li>
          <li>Crypto market news and charts</li>
        </ul>

        <h2 className="mt-10 font-display text-2xl font-bold text-gray-900 dark:text-white">How content is produced</h2>
        <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-300">
          Stories are sourced from publicly reported information including RSS feeds and editorial research.
          Our team rewrites and fact-checks content for readability. AI-assisted drafting may be used with human
          editorial review. See our{' '}
          <a href="/editorial-standards" className="font-semibold text-primary-700 hover:underline">
            editorial standards
          </a>{' '}
          for full details.
        </p>

        <h2 className="mt-10 font-display text-2xl font-bold text-gray-900 dark:text-white">Contact</h2>
        <p className="mt-3 text-gray-600 dark:text-gray-300">
          Editorial:{' '}
          <a href="mailto:editorial@dailylens.com" className="font-semibold text-primary-700 hover:underline">
            editorial@dailylens.com
          </a>
        </p>
      </article>
      <Footer />
    </div>
  );
}
