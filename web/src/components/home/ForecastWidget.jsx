'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { ForecastBadge } from '../common/ForecastBadge.jsx';

export function ForecastWidget() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/articles/forecasts', { params: { limit: 6 } });
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
    <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-4 dark:border-primary-900 dark:bg-primary-950/40">
      <h3 className="font-display text-lg font-bold text-primary-950 dark:text-white">Forecasts</h3>
      <p className="mt-1 text-xs text-gray-600 dark:text-gray-300">Editorial outlook from The Daily Lens desk</p>
      <ul className="mt-4 space-y-4">
        {items.map((a) => (
          <li key={a._id || a.slug} className="border-t border-primary-100 pt-3 first:border-0 first:pt-0 dark:border-primary-900">
            <div className="flex items-center gap-2">
              <ForecastBadge confidence={a.forecast?.confidence} compact />
              <span className="text-xs text-gray-500">{a.category}</span>
            </div>
            <Link
              href={`/article/${a.slug}`}
              className="mt-1 block text-sm font-semibold text-gray-900 hover:text-primary-700 dark:text-gray-100"
            >
              {a.forecast?.headline || a.title}
            </Link>
            {a.forecast?.body && (
              <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-300">{a.forecast.body}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
