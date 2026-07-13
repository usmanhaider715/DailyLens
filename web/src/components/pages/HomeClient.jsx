'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { BreakingNewsTicker } from '@/components/layout/BreakingNewsTicker';
import { Navbar } from '@/components/layout/NavbarNext';
import { Footer } from '@/components/layout/FooterNext';
import { HeroSection } from '@/components/home/HeroSection';
import { LiveScoreboard } from '@/components/home/LiveScoreboard';
import { CategoryTabs } from '@/components/home/CategoryTabs';
import { ArticleCard } from '@/components/home/ArticleCardNext';
import { Sidebar } from '@/components/layout/Sidebar';
import { FooterLegal } from '@/components/legal/SiteDisclaimers';
import { Spinner } from '@/components/common/Spinner';
import { EvergreenHomeSection } from '@/components/evergreen/EvergreenHomeSection';
import { ForYouRail } from '@/components/home/ForYouRail';
import { TopicHubsRail } from '@/components/home/TopicHubsRail';

export function HomeClient({
  initialFeatured = [],
  initialArticles = [],
  initialArticlesMeta = { page: 1, pages: 1 },
  initialHomepage = null,
  initialBreaking = [],
  initialStrip = [],
}) {
  const [tab, setTab] = useState('All');
  const [items, setItems] = useState(initialArticles);
  const [page, setPage] = useState(initialArticlesMeta.page || 1);
  const [pages, setPages] = useState(initialArticlesMeta.pages || 1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const categoryParam = tab === 'All' ? undefined : tab;

  const load = async (nextPage = 1, append = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);
    try {
      const { data } = await api.get('/articles', {
        params: { page: nextPage, limit: 9, category: categoryParam },
      });
      setPages(data.pages || 1);
      setPage(data.page || nextPage);
      setItems((prev) => (append ? [...prev, ...(data.items || [])] : data.items || []));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (tab === 'All') {
      setItems(initialArticles);
      setPage(initialArticlesMeta.page || 1);
      setPages(initialArticlesMeta.pages || 1);
      return;
    }
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <BreakingNewsTicker initialItems={initialBreaking} />
      <Navbar />
      <HeroSection
        initialFeatured={initialFeatured}
        initialStrip={initialStrip}
        initialHomepage={initialHomepage}
      />
      <div className="mx-auto max-w-7xl border-t border-gray-100 px-4 py-8 dark:border-gray-800">
        <LiveScoreboard />
      </div>
      <ForYouRail />
      <TopicHubsRail />
      <EvergreenHomeSection />
      <div className="border-t border-gray-100 bg-gray-50/50 py-8 dark:border-gray-800 dark:bg-gray-900/20">
        <CategoryTabs active={tab} onChange={setTab} />
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 pb-16 pt-4 lg:flex-row lg:gap-10">
        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((a) => (
                <ArticleCard key={a._id || a.slug} article={a} />
              ))}
            </div>
          )}
          <div className="mt-8 flex justify-center md:hidden">
            <button
              type="button"
              disabled={page >= pages || loadingMore}
              onClick={() => load(page + 1, true)}
              className="rounded-full bg-primary-700 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-primary-800 disabled:opacity-40"
            >
              {loadingMore ? 'Loading…' : page < pages ? 'Load more' : 'No more articles'}
            </button>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <Sidebar />
          </div>
        </div>
      </div>
      <Footer />
      <div className="mx-auto max-w-7xl px-4 pb-8">
        <FooterLegal />
      </div>
    </div>
  );
}
