import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { ArticleCard } from '@/components/home/ArticleCardNext';
import { fetchServerApi } from '@/lib/serverApi';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await fetchServerApi(`/authors/${slug}`);
  if (!data?.author) return { title: 'Author | The Daily Lens' };
  return {
    title: `${data.author.name} — Author`,
    description: data.author.bio || `Articles by ${data.author.name} on The Daily Lens.`,
    alternates: { canonical: `/author/${slug}` },
  };
}

export default async function AuthorPage({ params }) {
  const { slug } = await params;
  const data = await fetchServerApi(`/authors/${slug}`);
  if (!data?.author) notFound();

  const { author, articles } = data;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <nav className="text-xs font-medium text-gray-500">
          <Link href="/" className="hover:text-primary-700">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-gray-800 dark:text-gray-200">{author.name}</span>
        </nav>
        <header className="mt-4 max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-widest text-primary-700">{author.role || 'Author'}</p>
          <h1 className="mt-2 font-display text-4xl font-bold text-gray-900 dark:text-white">{author.name}</h1>
          {author.bio && (
            <p className="mt-4 leading-relaxed text-gray-600 dark:text-gray-300">{author.bio}</p>
          )}
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
