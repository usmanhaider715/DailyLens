'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { HeroImageFrame } from '@/components/common/HeroImageFrame';
import { ArticleCard } from '@/components/home/ArticleCardNext';
import { getRecentlyViewed } from '@/utils/readingList';

/** Most common category among recently viewed articles. */
function topCategory(items) {
  const counts = new Map();
  for (const a of items) {
    if (a.category) counts.set(a.category, (counts.get(a.category) || 0) + 1);
  }
  let best = null;
  let max = 0;
  for (const [cat, n] of counts) {
    if (n > max) {
      max = n;
      best = cat;
    }
  }
  return best;
}

/**
 * Personalized homepage rail based on device-local reading history (Phase 8).
 * Renders nothing for first-time visitors, so it's purely additive.
 */
export function ForYouRail() {
  const [recent, setRecent] = useState([]);
  const [recommended, setRecommended] = useState([]);

  useEffect(() => {
    const items = getRecentlyViewed();
    if (!items.length) return;
    setRecent(items.slice(0, 4));

    const cat = topCategory(items);
    if (!cat) return;
    const seen = new Set(items.map((a) => a.slug));
    api
      .get('/articles', { params: { category: cat, limit: 8 } })
      .then(({ data }) => {
        const picks = (data?.items || []).filter((a) => !seen.has(a.slug)).slice(0, 4);
        setRecommended(picks);
      })
      .catch(() => {});
  }, []);

  if (!recent.length) return null;

  return (
    <section className="border-t border-gray-100 bg-gray-50/50 py-10 dark:border-gray-800 dark:bg-gray-900/20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Continue reading</h2>
          <Link href="/reading-list" className="text-sm font-medium text-primary-700 hover:underline dark:text-primary-400">
            Your reading list →
          </Link>
        </div>
        <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {recent.map((a) => (
            <Link key={a.slug} href={`/article/${a.slug}`} className="group block">
              <HeroImageFrame url={a.image} alt={a.title} category={a.category} aspect="16/9" rounded="lg" />
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-400">
                {a.category}
              </p>
              <h3 className="mt-1 line-clamp-2 font-medium text-gray-900 group-hover:text-primary-700 dark:text-gray-100">
                {a.title}
              </h3>
            </Link>
          ))}
        </div>

        {recommended.length > 0 && (
          <>
            <h2 className="mt-10 font-display text-2xl font-bold text-gray-900 dark:text-white">
              Recommended for you
            </h2>
            <div className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {recommended.map((a) => (
                <ArticleCard key={a._id || a.slug} article={a} />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
