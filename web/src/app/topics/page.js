import Link from 'next/link';
import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { fetchServerApi } from '@/lib/serverApi';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Topics — News Hubs & Guides',
  description:
    'Explore The Daily Lens topic hubs: AI, technology, finance, insurance, movies, politics, sports, health, and more — news, guides, and FAQs in one place.',
  alternates: { canonical: '/topics' },
};

export default async function TopicsIndexPage() {
  const data = await fetchServerApi('/topics');
  const topics = data?.topics || [];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <header className="max-w-3xl">
          <h1 className="font-display text-4xl font-bold text-gray-900 dark:text-white md:text-5xl">
            Topics
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-gray-600 dark:text-gray-300">
            Deep-dive hubs bringing together the latest news, trending stories, guides, and answers for each
            subject we cover.
          </p>
        </header>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => (
            <Link
              key={t.slug}
              href={`/topic/${t.slug}`}
              className="group rounded-2xl border border-gray-100 bg-gray-50 p-6 transition-colors hover:border-primary-200 hover:bg-primary-50 dark:border-gray-800 dark:bg-gray-900/50 dark:hover:border-primary-900/50 dark:hover:bg-primary-900/20"
            >
              <h2 className="font-display text-xl font-bold text-gray-900 group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-300">
                {t.title}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                {t.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  );
}
