'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { api } from '@/services/api';
import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { ArticleCard } from '@/components/home/ArticleCardNext';
import { Spinner } from '@/components/common/Spinner';

export function SearchView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const query = (searchParams.get('q') || '').trim();
  const [input, setInput] = useState(query);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setInput(query);
  }, [query]);

  useEffect(() => {
    if (!query) {
      setItems([]);
      setError('');
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/search', { params: { q: query } });
        if (!cancelled) setItems(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) {
          setItems([]);
          setError('Search failed. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [query]);

  const submit = (e) => {
    e.preventDefault();
    const next = input.trim();
    if (!next) return;
    router.push(`/search?q=${encodeURIComponent(next)}`);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <Navbar />
      <div className="border-b border-gray-100 bg-gradient-to-b from-primary-50/40 to-white dark:border-gray-800 dark:from-primary-950/20 dark:to-gray-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
          <nav className="text-xs font-medium text-gray-500">
            <Link href="/" className="hover:text-primary-700 dark:hover:text-primary-400">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-gray-700 dark:text-gray-300">Search</span>
          </nav>
          <h1 className="mt-3 font-display text-3xl font-bold text-gray-900 dark:text-white">Search</h1>
          <form onSubmit={submit} className="relative mt-6 max-w-xl">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search news and articles..."
              className="w-full rounded-full border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none ring-primary-500 focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
              aria-label="Search query"
            />
            <Search className="pointer-events-none absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
          </form>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-8">
        {!query ? (
          <p className="text-gray-600 dark:text-gray-400">Enter a keyword to search published articles.</p>
        ) : loading ? (
          <Spinner />
        ) : error ? (
          <p className="text-red-600 dark:text-red-400">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">
            No results for &ldquo;{query}&rdquo;. Try different keywords.
          </p>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
              {items.length} result{items.length === 1 ? '' : 's'} for &ldquo;{query}&rdquo;
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((article) => (
                <ArticleCard key={article.slug || article._id} article={article} />
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
