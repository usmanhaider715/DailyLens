'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { ArticleCard } from '@/components/home/ArticleCardNext';
import { Spinner } from '@/components/common/Spinner';

export function EvergreenHomeSection() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/articles/evergreen', { params: { limit: 4 } })
      .then(({ data }) => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (!items.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-10">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Evergreen guides</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Practical how-to guides — always useful, not tied to the news cycle.
          </p>
        </div>
        <Link href="/evergreen" className="text-sm font-semibold text-primary-700 hover:underline dark:text-primary-400">
          View all →
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((article) => (
          <ArticleCard key={article.slug} article={article} />
        ))}
      </div>
    </section>
  );
}
