import { useEffect, useState } from 'react';
import { BreakingNewsTicker } from '../components/layout/BreakingNewsTicker.jsx';
import { Navbar } from '../components/layout/Navbar.jsx';
import { Footer } from '../components/layout/Footer.jsx';
import { AdSlot } from '../components/layout/AdSlot.jsx';
import { HeroSection } from '../components/home/HeroSection.jsx';
import { LiveScoreboard } from '../components/home/LiveScoreboard.jsx';
import { CategoryTabs } from '../components/home/CategoryTabs.jsx';
import { ArticleCard } from '../components/home/ArticleCard.jsx';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { api } from '../services/api.js';
import { Spinner } from '../components/common/Spinner.jsx';
import { SeoHead } from '../components/seo/SeoHead.jsx';
import { buildWebSiteJsonLd, buildOrganizationJsonLd } from '../utils/seoHelpers.js';

export function HomePage() {
  const [tab, setTab] = useState('All');
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
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
    load(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const hasMore = page < pages;

  return (
    <div className="min-h-screen pb-20 lg:pb-0">
      <SeoHead
        title={null}
        path="/"
        jsonLd={[buildWebSiteJsonLd(), buildOrganizationJsonLd()]}
      />
      <BreakingNewsTicker />
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-4">
        <AdSlot
          position="leaderboard-top"
          className="mx-auto h-[50px] w-full max-w-full sm:h-[90px] sm:max-w-[728px]"
        />
      </div>
      <HeroSection />
      <div className="mx-auto max-w-7xl px-4 pb-2">
        <LiveScoreboard />
      </div>
      <div className="py-6">
        <CategoryTabs active={tab} onChange={setTab} />
      </div>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 pb-16">
        <div className="min-w-0 flex-1">
          {loading ? (
            <div className="flex justify-center py-16">
              <Spinner />
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {items.map((a) => (
                <ArticleCard key={a._id || a.slug} article={a} variant="default" />
              ))}
            </div>
          )}
          <div className="mt-8 flex justify-center md:hidden">
            <button
              type="button"
              disabled={!hasMore || loadingMore}
              onClick={() => load(page + 1, true)}
              className="rounded-full bg-primary-700 px-6 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {loadingMore ? 'Loading…' : hasMore ? 'Load more' : 'No more articles'}
            </button>
          </div>
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <Sidebar />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-8">
        <AdSlot
          position="leaderboard-bottom"
          className="mx-auto h-[50px] w-full max-w-full sm:h-[90px] sm:max-w-[728px]"
        />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 p-2 lg:hidden">
        <AdSlot position="mobile-sticky" className="h-16 w-full" />
      </div>

      <Footer />
    </div>
  );
}
