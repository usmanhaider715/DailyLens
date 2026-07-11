'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';

export function TrendingWidget() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/articles/trending');
        if (!cancelled) setItems(data || []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items.length) return null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Trending Now</h3>
      <ol className="mt-4 space-y-4">
        {items.slice(0, 10).map((a, i) => (
          <li key={a._id || a.slug} className="flex gap-3">
            <span className="font-display text-2xl font-bold text-primary-600">{i + 1}</span>
            <div className="min-w-0">
              <Link
                href={`/article/${a.slug}`}
                className="line-clamp-2 text-sm font-semibold text-gray-900 hover:text-primary-700 dark:text-gray-100"
              >
                {a.title}
              </Link>
              <div className="mt-1 text-xs text-gray-500">{a.views || 0} views</div>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
