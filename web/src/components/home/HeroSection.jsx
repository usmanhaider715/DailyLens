'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { CategoryBadge } from '../common/CategoryBadge.jsx';
import { formatArticleDate } from '../../utils/formatDate.js';
import { LiveMatchHero } from './LiveMatchHero.jsx';
import { WeatherLocator } from './WeatherLocator.jsx';
import { FeaturedSidebar, FeaturedBottomStrip } from './FeaturedArticlesRail.jsx';
import { stripHtml } from '../../utils/stripHtml.js';

function useFeaturedArticles() {
  const [featured, setFeatured] = useState([]);
  const [strip, setStrip] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data: feat }, { data: list }] = await Promise.all([
          api.get('/articles/featured'),
          api.get('/articles', { params: { limit: 12, page: 1, sort: 'latest' } }),
        ]);
        if (cancelled) return;
        setFeatured(feat || []);
        setStrip((list?.items || []).slice(0, 8));
      } catch {
        if (!cancelled) {
          setFeatured([]);
          setStrip([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const main = featured[0];
  const secondary = featured.slice(1, 4);
  const bottom = strip.filter((a) => a.slug !== main?.slug).slice(0, 4);

  return { featured, main, secondary, bottom, loading };
}

function FeaturedMainArticle({ article }) {
  if (!article) {
    return (
      <div className="flex min-h-[380px] items-center justify-center rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500 dark:border-gray-700">
        No featured articles yet. Run the seed script or wait for the news fetcher.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
      <Link href={`/article/${article.slug}`}>
        <img
          src={article.heroImage?.url || '/favicon.svg'}
          alt={article.title || 'Featured story'}
          className="h-56 w-full object-cover sm:h-72 lg:h-[380px]"
          fetchPriority="high"
          loading="eager"
          decoding="async"
        />
      </Link>
      <div className="p-6">
        <CategoryBadge category={article.category} />
        <Link href={`/article/${article.slug}`}>
          <h1 className="mt-3 font-display text-4xl font-bold leading-tight text-gray-900 dark:text-white">
            {article.title}
          </h1>
        </Link>
        <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">{stripHtml(article.summary)}</p>
        <div className="mt-4 text-sm text-gray-500">
          {article.author} · {formatArticleDate(article.publishedAt)} · {article.readTime || 3} min read
        </div>
      </div>
    </div>
  );
}

export function HeroSection() {
  const [heroMode, setHeroMode] = useState('featured');
  const [checking, setChecking] = useState(true);
  const { main, secondary, bottom, loading: articlesLoading } = useFeaturedArticles();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/site/homepage');
        if (!cancelled) setHeroMode(data.heroMode || 'featured');
      } catch {
        if (!cancelled) setHeroMode('featured');
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const showLiveMatch = heroMode === 'live_match';
  const showWeather = heroMode === 'weather';
  const gridLoading = checking || articlesLoading;

  if (gridLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="h-[380px] animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800 lg:col-span-2" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {showLiveMatch ? (
            <LiveMatchHero embedded />
          ) : showWeather ? (
            <WeatherLocator compact />
          ) : (
            <FeaturedMainArticle article={main} />
          )}
        </div>
        <FeaturedSidebar articles={secondary} />
      </div>
      <FeaturedBottomStrip articles={bottom} />
    </section>
  );
}
