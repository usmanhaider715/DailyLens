import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { ArticleCard } from '@/components/home/ArticleCardNext';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd, buildFaqPageJsonLd } from '@/utils/seoHelpers';
import { fetchServerApi } from '@/lib/serverApi';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await fetchServerApi(`/topics/${slug}`);
  if (!data?.hub) return { title: 'Topic | The Daily Lens' };
  return {
    title: `${data.hub.title} — News & Guides`,
    description: data.hub.description,
    alternates: { canonical: `/topic/${slug}` },
  };
}

function Grid({ articles }) {
  return (
    <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {articles.map((a) => (
        <ArticleCard key={a._id || a.slug} article={a} />
      ))}
    </div>
  );
}

export default async function TopicHubPage({ params }) {
  const { slug } = await params;
  const data = await fetchServerApi(`/topics/${slug}`);
  if (!data?.hub) notFound();

  const { hub, latest = [], trending = [], news = [], guides = [], faqs = [], popularSearches = [], relatedTopics = [] } = data;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: `${hub.title} — News & Guides`,
      description: hub.description,
    },
    buildBreadcrumbJsonLd([
      { name: 'Home', url: '/' },
      { name: 'Topics', url: '/topics' },
      { name: hub.title, url: `/topic/${slug}` },
    ]),
  ];
  const faqLd = buildFaqPageJsonLd({
    faq: faqs.map((f) => ({ question: f.question, answer: f.answer })),
    canonical: `/topic/${slug}`,
  });
  if (faqLd) jsonLd.push(faqLd);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <JsonLd data={jsonLd} />
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <nav className="text-xs font-medium text-gray-500">
          <Link href="/" className="hover:text-primary-700">Home</Link>
          <span className="mx-2">/</span>
          <Link href="/topics" className="hover:text-primary-700">Topics</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-800 dark:text-gray-200">{hub.title}</span>
        </nav>

        <header className="mt-4 max-w-3xl">
          <h1 className="font-display text-4xl font-bold text-gray-900 dark:text-white md:text-5xl">
            {hub.title}
          </h1>
          <p className="mt-3 text-lg leading-relaxed text-gray-600 dark:text-gray-300">
            {hub.description}
          </p>
        </header>

        {popularSearches.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Popular searches
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {popularSearches.map((q) => (
                <Link
                  key={q}
                  href={`/search?q=${encodeURIComponent(q)}`}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  {q}
                </Link>
              ))}
            </div>
          </div>
        )}

        {latest.length === 0 ? (
          <p className="mt-10 text-gray-500">No articles in this topic yet — check back soon.</p>
        ) : (
          <>
            <Section title="Latest">
              <Grid articles={latest} />
            </Section>

            {trending.length > 0 && (
              <Section title="Trending">
                <ul className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
                  {trending.map((a, i) => (
                    <li key={a._id || a.slug} className="flex items-baseline gap-3 py-3">
                      <span className="font-display text-lg font-bold text-primary-500">{i + 1}</span>
                      <Link
                        href={`/article/${a.slug}`}
                        className="text-sm font-medium text-gray-800 hover:text-primary-700 dark:text-gray-100 dark:hover:text-primary-400"
                      >
                        {a.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {guides.length > 0 && (
              <Section title="Guides & explainers">
                <Grid articles={guides} />
              </Section>
            )}

            {news.length > 0 && (
              <Section title="More news">
                <Grid articles={news} />
              </Section>
            )}
          </>
        )}

        {faqs.length > 0 && (
          <Section title="Frequently asked">
            <div className="mt-4 space-y-4">
              {faqs.map((f) => (
                <details
                  key={f.question}
                  className="rounded-lg border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50"
                >
                  <summary className="cursor-pointer font-semibold text-gray-900 dark:text-white">
                    {f.question}
                  </summary>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                    {f.answer}{' '}
                    {f.slug && (
                      <Link href={`/article/${f.slug}`} className="text-primary-700 hover:underline dark:text-primary-400">
                        Read more
                      </Link>
                    )}
                  </p>
                </details>
              ))}
            </div>
          </Section>
        )}

        {relatedTopics.length > 0 && (
          <Section title="Related topics">
            <div className="mt-4 flex flex-wrap gap-2">
              {relatedTopics.map((t) => (
                <Link
                  key={t.slug}
                  href={`/topic/${t.slug}`}
                  className="rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700 hover:bg-primary-100 dark:border-primary-900/50 dark:bg-primary-900/20 dark:text-primary-300"
                >
                  {t.title}
                </Link>
              ))}
            </div>
          </Section>
        )}
      </div>
      <Footer />
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
      {children}
    </section>
  );
}
