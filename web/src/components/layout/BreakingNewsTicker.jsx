'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useBreakingNews } from '../../hooks/useBreakingNews.js';

function mapBreakingItems(list) {
  return (list || []).map((a) => ({
    headline: a.title || a.headline,
    slug: a.slug,
    category: a.category,
    publishedAt: a.publishedAt,
    key: a.slug || a._id,
  }));
}

export function BreakingNewsTicker({ initialItems = [] }) {
  const seed = useMemo(() => mapBreakingItems(initialItems), [initialItems]);
  const { items, liveCount } = useBreakingNews(seed);

  const display = items.length
    ? items
    : [{ headline: 'Welcome to The Daily Lens — live headlines loading…', slug: '/', key: 'placeholder' }];

  const doubled = [...display, ...display];

  return (
    <div className="relative z-40 flex h-11 w-full items-center bg-breaking text-white">
      <div className="flex shrink-0 items-center gap-2 px-3">
        <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold uppercase tracking-wide animate-pulse-flash">
          Breaking
        </span>
      </div>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="flex w-max animate-scroll-left will-change-transform hover:[animation-play-state:paused]">
          {doubled.map((it, idx) => (
            <div key={`${it.key}-${idx}`} className="flex items-center whitespace-nowrap pr-16 text-sm font-medium">
              <Link href={it.slug?.startsWith('http') ? '#' : `/article/${it.slug}`} className="hover:underline">
                {it.headline || it.title}
              </Link>
              <span className="mx-6 opacity-40">|</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1 px-2 text-[10px] text-white/90 sm:px-4 sm:text-xs">
        <span className="h-2 w-2 shrink-0 rounded-full bg-white animate-pulse" />
        <span className="whitespace-nowrap">{liveCount} online</span>
      </div>
    </div>
  );
}
