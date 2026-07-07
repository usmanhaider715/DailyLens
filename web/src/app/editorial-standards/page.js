import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';

export const metadata = {
  title: 'Editorial Standards & Corrections Policy',
  description:
    'How The Daily Lens sources, writes, and publishes news. Our correction policy, AI disclosure, and editorial independence standards.',
  alternates: { canonical: '/editorial-standards' },
};

export default function EditorialStandardsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <article className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="font-display text-4xl font-bold text-gray-900 dark:text-white">Editorial standards</h1>
        <p className="mt-4 text-lg leading-relaxed text-gray-600 dark:text-gray-300">
          The Daily Lens is committed to accurate, transparent journalism. These standards guide how we publish
          and correct content.
        </p>

        <h2 className="mt-10 font-display text-xl font-bold text-gray-900 dark:text-white">Sourcing</h2>
        <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-300">
          We cite original publishers where applicable. Automated stories are rewritten from RSS and public
          reports — we are not affiliated with wire services unless explicitly stated. Each article includes
          source attribution.
        </p>

        <h2 className="mt-10 font-display text-xl font-bold text-gray-900 dark:text-white">AI-assisted content</h2>
        <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-300">
          Some articles use AI tools to draft or polish copy from source material. All AI-assisted content is
          reviewed before publication. We do not publish unverified claims as fact.
        </p>

        <h2 className="mt-10 font-display text-xl font-bold text-gray-900 dark:text-white">Images &amp; copyright</h2>
        <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-300">
          We publish original editorial text — not full republished articles. Hero and listicle images are
          sourced from Creative Commons, Wikimedia Commons, or Google Images (free-use filter) with credits on
          each page. AI-generated images are used only when no suitable royalty-free photo is available.
        </p>

        <h2 className="mt-10 font-display text-xl font-bold text-gray-900 dark:text-white">Corrections</h2>
        <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-300">
          If you spot an error, email{' '}
          <a href="mailto:editorial@dailylens.com" className="font-semibold text-primary-700 hover:underline">
            editorial@dailylens.com
          </a>
          . We correct factual errors promptly and note significant updates at the bottom of affected articles.
        </p>

        <h2 className="mt-10 font-display text-xl font-bold text-gray-900 dark:text-white">Independence</h2>
        <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-300">
          Editorial decisions are independent of advertisers. Sponsored content, if any, is clearly labelled.
          Live scores and weather data are provided for information only — not for betting or safety-critical decisions.
        </p>
      </article>
      <Footer />
    </div>
  );
}
