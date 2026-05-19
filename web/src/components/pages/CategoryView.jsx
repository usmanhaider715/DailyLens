'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { ArticleCard } from '@/components/home/ArticleCardNext';
import { LiveScoreboard } from '@/components/home/LiveScoreboard';
import { WeatherLocator } from '@/components/home/WeatherLocator';
import { Spinner } from '@/components/common/Spinner';

export function CategoryView({ category }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/articles', { params: { page: 1, limit: 30, category } });
        setItems(data.items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [category]);

  return (
    <div>
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">{category}</h1>
        {category === 'Sports' && (
          <div className="mt-6">
            <LiveScoreboard />
          </div>
        )}
        {category === 'Weather' && (
          <div className="mt-6">
            <WeatherLocator />
          </div>
        )}
        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
