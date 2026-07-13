import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { ArticleCard } from '@/components/home/ArticleCardNext';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildPersonJsonLd } from '@/utils/seoHelpers';
import { fetchServerApi } from '@/lib/serverApi';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await fetchServerApi(`/authors/${slug}`);
  if (!data?.author) return { title: 'Author | The Daily Lens' };
  const a = data.author;
  const desc =
    a.bio ||
    (a.expertise?.length
      ? `${a.name} covers ${a.expertise.slice(0, 3).join(', ')} for The Daily Lens.`
      : `Articles by ${a.name} on The Daily Lens.`);
  return {
    title: `${a.name} — ${a.title || a.role || 'Author'}`,
    description: desc,
    alternates: { canonical: `/author/${slug}` },
    openGraph: { type: 'profile', title: a.name, description: desc },
  };
}

export default async function AuthorPage({ params }) {
  const { slug } = await params;
  const data = await fetchServerApi(`/authors/${slug}`);
  if (!data?.author) notFound();

  const { author, articles } = data;
  const social = [
    author.socialLinks?.twitter && { label: 'X / Twitter', url: author.socialLinks.twitter },
    author.socialLinks?.linkedin && { label: 'LinkedIn', url: author.socialLinks.linkedin },
    author.socialLinks?.website && { label: 'Website', url: author.socialLinks.website },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <JsonLd data={buildPersonJsonLd(author, { canonical: undefined })} />
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <nav className="text-xs font-medium text-gray-500">
          <Link href="/" className="hover:text-primary-700">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-800 dark:text-gray-200">{author.name}</span>
        </nav>

        <header className="mt-4 rounded-2xl border border-gray-100 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900/50 md:p-8">
          <div className="flex flex-wrap items-start gap-5">
            {author.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={author.avatar}
                alt={author.name}
                className="h-20 w-20 flex-shrink-0 rounded-full object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 font-display text-2xl font-bold text-primary-700 dark:bg-primary-900/40 dark:text-primary-300"
              >
                {author.name?.charAt(0) || 'D'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-widest text-primary-700 dark:text-primary-400">
                {author.title || author.role || 'Author'}
              </p>
              <h1 className="mt-1 font-display text-3xl font-bold text-gray-900 dark:text-white md:text-4xl">
                {author.name}
              </h1>
              {author.bio && (
                <p className="mt-3 max-w-2xl leading-relaxed text-gray-600 dark:text-gray-300">
                  {author.bio}
                </p>
              )}
              {author.credentials && (
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {author.credentials}
                </p>
              )}

              {author.expertise?.length ? (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Writes about
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {author.expertise.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500 dark:text-gray-400">
                {author.startedYear && <span>Covering topics since {author.startedYear}</span>}
                {author.location && <span>· {author.location}</span>}
                {social.map((s) => (
                  <a
                    key={s.url}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="font-medium text-primary-700 hover:underline dark:text-primary-400"
                  >
                    {s.label}
                  </a>
                ))}
                <Link
                  href="/editorial-standards"
                  className="font-medium text-primary-700 hover:underline dark:text-primary-400"
                >
                  Editorial standards
                </Link>
              </div>
            </div>
          </div>
        </header>

        <section className="mt-10">
          <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">Published articles</h2>
          {articles?.length ? (
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {articles.map((a) => (
                <ArticleCard key={a._id || a.slug} article={a} />
              ))}
            </div>
          ) : (
            <p className="mt-4 text-gray-500">No published articles yet.</p>
          )}
        </section>
      </div>
      <Footer />
    </div>
  );
}
