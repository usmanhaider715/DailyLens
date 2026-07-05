'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { api } from '@/services/api';
import { useBreakingNews } from '../../hooks/useBreakingNews.js';

export function BreakingNewsTicker() {
  const { items, liveCount, setItems } = useBreakingNews([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/articles/breaking');
        if (cancelled) return;
        const mapped = (data || []).map((a) => ({
          headline: a.title,
          slug: a.slug,
          category: a.category,
          publishedAt: a.publishedAt,
          key: a.slug,
        }));
        setItems(mapped);
      } catch {
        /* noop */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setItems]);

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
