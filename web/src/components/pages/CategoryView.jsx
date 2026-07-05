'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { ArticleCard } from '@/components/home/ArticleCardNext';
import { LiveScoreboard } from '@/components/home/LiveScoreboard';
import { WeatherLocator } from '@/components/home/WeatherLocator';
import { WeatherAnalysisPanel } from '@/components/weather/WeatherAnalysisPanel';
import { CryptoMarketChart } from '@/components/crypto/CryptoMarketChart';
import { Spinner } from '@/components/common/Spinner';

export function CategoryView({ category, initialItems = null }) {
  const [items, setItems] = useState(initialItems || []);
  const [loading, setLoading] = useState(initialItems == null);

  useEffect(() => {
    if (initialItems != null) return;
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/articles', { params: { page: 1, limit: 30, category } });
        setItems(data.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [category, initialItems]);

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
            <span className="text-gray-800 dark:text-gray-200">{category}</span>
          </nav>
          <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            {category}
          </h1>
          <p className="mt-2 max-w-2xl text-gray-600 dark:text-gray-300">
            Latest stories, analysis, and updates from The Daily Lens.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
        {category === 'Sports' && (
          <div className="mb-10">
            <LiveScoreboard />
          </div>
        )}
        {category === 'Weather' && (
          <div className="mb-10 space-y-8">
            <WeatherAnalysisPanel />
            <WeatherLocator compact />
          </div>
        )}
        {category === 'Crypto' && (
          <div className="mb-10">
            <CryptoMarketChart />
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <p className="py-16 text-center text-gray-500">No articles in this category yet.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <ArticleCard key={a._id || a.slug} article={a} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
