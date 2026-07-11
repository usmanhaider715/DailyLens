'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { ArticleCard } from '@/components/home/ArticleCardNext';
import { Spinner } from '@/components/common/Spinner';

const CATEGORIES = [
  'Finance',
  'Insurance',
  'Legal',
  'Technology',
  'Health',
  'Business',
  'Entertainment',
];

export function EvergreenIndexClient({ initialCategory = null }) {
  const [category, setCategory] = useState(initialCategory);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    setLoading(true);
    api
      .get('/articles/evergreen', {
        params: { limit: 24, category: category || undefined },
      })
      .then(({ data }) => setItems(data.items || []))
      .finally(() => setLoading(false));
  }, [category]);

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setCategory(null)}
          className={`rounded-full px-4 py-1.5 text-sm font-medium ${
            !category ? 'bg-primary-700 text-white' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
          }`}
        >
          All
        </button>
        {CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/evergreen/category/${encodeURIComponent(cat)}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              category === cat
                ? 'bg-primary-700 text-white'
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
            }`}
          >
            {cat}
          </Link>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : items.length === 0 ? (
        <p className="py-16 text-center text-gray-500">No guides published yet.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((article) => (
            <ArticleCard key={article.slug} article={article} />
          ))}
        </div>
      )}
    </>
  );
}
