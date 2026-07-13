'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Compass } from 'lucide-react';
import { api } from '@/services/api';

/** Horizontal rail linking to curated topic hubs (Phase 3). Additive. */
export function TopicHubsRail() {
  const [topics, setTopics] = useState([]);

  useEffect(() => {
    api
      .get('/topics')
      .then(({ data }) => setTopics(data?.topics || []))
      .catch(() => {});
  }, []);

  if (!topics.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-gray-900 dark:text-white">
          <Compass className="h-5 w-5 text-primary-600" aria-hidden="true" /> Explore topics
        </h2>
        <Link href="/topics" className="text-sm font-medium text-primary-700 hover:underline dark:text-primary-400">
          All topics →
        </Link>
      </div>
      <div className="mt-4 flex flex-wrap gap-2.5">
        {topics.map((t) => (
          <Link
            key={t.slug}
            href={`/topic/${t.slug}`}
            className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-primary-900/50 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
          >
            {t.title}
          </Link>
        ))}
      </div>
    </section>
  );
}
