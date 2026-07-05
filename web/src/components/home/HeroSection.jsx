'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/services/api';
import { CategoryBadge } from '../common/CategoryBadge.jsx';
import { formatArticleDate } from '../../utils/formatDate.js';
import { LiveMatchHero } from './LiveMatchHero.jsx';
import { WeatherLocator } from './WeatherLocator.jsx';
import { FeaturedSidebar, FeaturedBottomStrip } from './FeaturedArticlesRail.jsx';
import { stripHtml } from '../../utils/stripHtml.js';
import { HeroImage } from '../common/HeroImage.jsx';
import { getArticleFeaturedImage, getArticleImageAlt } from '@/utils/articleImage';
import { CryptoMarketChart } from '../crypto/CryptoMarketChart.jsx';

function FeaturedMainArticle({ article, compact = false }) {
  if (!article) {
    return (
      <div className="flex min-h-[200px] items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/30">
        No featured story selected yet.
      </div>
    );
  }

  if (compact) {
    return (
      <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-col sm:flex-row">
          <Link href={`/article/${article.slug}`} className="sm:w-[42%] shrink-0">
            <HeroImage
              url={getArticleFeaturedImage(article)}
              alt={getArticleImageAlt(article)}
              category={article.category}
              className="h-48 w-full object-cover sm:h-full sm:min-h-[220px]"
              fetchPriority="high"
              loading="eager"
            />
          </Link>
          <div className="flex flex-1 flex-col justify-center p-5 sm:p-6">
            <CategoryBadge category={article.category} />
            <Link href={`/article/${article.slug}`}>
              <h2 className="mt-2 font-display text-2xl font-bold leading-tight text-gray-900 transition hover:text-primary-800 dark:text-white sm:text-3xl">
                {article.title}
              </h2>
            </Link>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
              {stripHtml(article.summary)}
            </p>
            <p className="mt-3 text-xs font-medium text-gray-500">
              {article.author} · {formatArticleDate(article.publishedAt)} · {article.readTime || 3} min read
            </p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-md dark:border-gray-800 dark:bg-gray-900">
      <Link href={`/article/${article.slug}`}>
        <HeroImage
          url={getArticleFeaturedImage(article)}
          alt={getArticleImageAlt(article)}
          category={article.category}
          className="h-56 w-full object-cover sm:h-72 lg:h-[380px]"
          fetchPriority="high"
          loading="eager"
        />
      </Link>
      <div className="p-6 sm:p-8">
        <CategoryBadge category={article.category} />
        <Link href={`/article/${article.slug}`}>
          <h1 className="mt-3 font-display text-3xl font-bold leading-tight text-gray-900 transition hover:text-primary-800 dark:text-white sm:text-4xl">
            {article.title}
          </h1>
        </Link>
        <p className="mt-3 text-base leading-relaxed text-gray-600 dark:text-gray-300 sm:text-lg">
          {stripHtml(article.summary)}
        </p>
        <div className="mt-4 text-sm text-gray-500">
          {article.author} · {formatArticleDate(article.publishedAt)} · {article.readTime || 3} min read
        </div>
      </div>
    </article>
  );
}

export function HeroSection({
  initialFeatured = [],
  initialStrip = [],
  initialHomepage = null,
}) {
  const [heroMode, setHeroMode] = useState(initialHomepage?.heroMode || 'featured');
  const [showCryptoChart, setShowCryptoChart] = useState(initialHomepage?.showCryptoChart !== false);
  const [defaultCryptoCoinId, setDefaultCryptoCoinId] = useState(
    initialHomepage?.defaultCryptoCoinId || 'bitcoin',
  );
  const [featured, setFeatured] = useState(initialFeatured);
  const [strip, setStrip] = useState(initialStrip);

  useEffect(() => {
    if (initialFeatured.length && initialStrip.length) return;
    let cancelled = false;
    (async () => {
      try {
        const [{ data: feat }, { data: list }] = await Promise.all([
          api.get('/articles/featured'),
          api.get('/articles', { params: { limit: 12, page: 1, sort: 'latest' } }),
        ]);
        if (cancelled) return;
        if (!initialFeatured.length) setFeatured(feat || []);
        if (!initialStrip.length) setStrip((list?.items || []).slice(0, 8));
      } catch {
        /* keep SSR data */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialFeatured.length, initialStrip.length]);

  useEffect(() => {
    if (initialHomepage) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/site/homepage');
        if (!cancelled) {
          setHeroMode(data.heroMode || 'featured');
          setShowCryptoChart(data.showCryptoChart !== false);
          setDefaultCryptoCoinId(data.defaultCryptoCoinId || 'bitcoin');
        }
      } catch {
        /* keep defaults */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initialHomepage]);

  const { main, secondary, bottom } = useMemo(() => {
    const m = featured[0];
    return {
      main: m,
      secondary: featured.slice(1, 4),
      bottom: strip.filter((a) => a.slug !== m?.slug).slice(0, 4),
    };
  }, [featured, strip]);

  const showLiveMatch = heroMode === 'live_match';
  const showWeather = heroMode === 'weather';
  const showWidget = showLiveMatch || showWeather;

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:py-10">
      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <div className="space-y-5 lg:col-span-8">
          {showWidget && (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
              {showLiveMatch && <LiveMatchHero embedded />}
              {showWeather && <WeatherLocator compact />}
            </div>
          )}
          <FeaturedMainArticle article={main} compact={showWidget} />
          {showCryptoChart && (
            <CryptoMarketChart defaultCoinId={defaultCryptoCoinId} compact />
          )}
        </div>
        <div className="lg:col-span-4 lg:sticky lg:top-24">
          <FeaturedSidebar articles={secondary} />
        </div>
      </div>
      <FeaturedBottomStrip articles={bottom} />
    </section>
  );
}
