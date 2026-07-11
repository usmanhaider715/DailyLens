'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';
import BatchArticleReviewPanel from './BatchArticleReviewPanel.jsx';
import { MAX_BATCH } from '@/utils/batchPublish';
import { formatArticleDateTime } from '@/utils/formatDate';

const CATEGORY_COLORS = {
  World: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  Technology: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  Business: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  Sports: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  Health: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
  Science: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  Entertainment: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200',
  Gaming: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-200',
  Politics: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  Crypto: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200',
  Weather: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/50 dark:text-cyan-200',
};

const MAX_BATCH_SIZE = MAX_BATCH;

function CategoryBadge({ category }) {
  const cls = CATEGORY_COLORS[category] || CATEGORY_COLORS.World;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {category}
    </span>
  );
}

export function AiNewsFeedPanel({ open, onClose, onApplyDraft }) {
  const router = useRouter();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [totalInCategory, setTotalInCategory] = useState(0);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState([]);
  const [sources, setSources] = useState({ rss: true, newsApi: false, gnews: false });

  const selectableItems = useMemo(
    () => items.filter((item) => !item.alreadyImported),
    [items]
  );

  const loadFeed = useCallback(async (category) => {
    setLoadingFeed(true);
    try {
      const params = { limit: 120 };
      if (category && category !== 'All') params.category = category;
      const { data } = await api.get('/admin/ai/news-feed', { params });
      setItems(data.items || []);
      setCategories(data.categories || []);
      setTotalInCategory(data.totalInCategory ?? data.items?.length ?? 0);
      if (data.sources) setSources(data.sources);
      setSelected(new Set());
      if (!data.items?.length) {
        const extra =
          data.sources?.newsApi || data.sources?.gnews
            ? ''
            : ' RSS + Google News are active; optional NEWSAPI_KEY / GNEWS_KEY add more volume.';
        toast(
          category === 'All'
            ? `No headlines returned right now.${extra}`
            : `No stories in ${category} right now — try All or refresh.`
        );
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not load news feed');
    } finally {
      setLoadingFeed(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    loadFeed(activeCategory);
  }, [open, activeCategory, loadFeed]);

  const toggleSelect = (url) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(selectableItems.slice(0, MAX_BATCH_SIZE).map((i) => i.url)));
  };

  const clearSelection = () => setSelected(new Set());

  const selectedItems = useMemo(
    () => items.filter((item) => selected.has(item.url)),
    [items, selected]
  );

  const startReview = (toProcess) => {
    if (!toProcess.length) {
      toast.error('Select at least one story that is not already imported');
      return;
    }
    if (toProcess.length > MAX_BATCH_SIZE) {
      toast.error(`You can generate up to ${MAX_BATCH_SIZE} articles at a time`);
      return;
    }
    setReviewItems(toProcess);
    setReviewOpen(true);
    onClose();
  };

  if (!open && !reviewOpen) return null;

  const allCount = categories.reduce((sum, c) => sum + c.count, 0);
  const selectedCount = selected.size;
  const allSelectableSelected =
    selectableItems.length > 0 &&
    selectableItems.slice(0, MAX_BATCH_SIZE).every((i) => selected.has(i.url));

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            aria-label="Close"
            onClick={onClose}
          />
          <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-gray-900 sm:rounded-2xl">
            <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <div>
                <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">
                  Latest news from all sources
                </h2>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                  Select stories · AI rewrites with hero images · review before publishing (up to {MAX_BATCH_SIZE})
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                  Active: RSS
                  {sources.newsApi ? ', NewsAPI' : ''}
                  {sources.gnews ? ', GNews' : ''}
                  {!sources.newsApi && !sources.gnews
                    ? ' · add NEWSAPI_KEY / GNEWS_KEY in server .env for extra sources'
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Close
              </button>
            </header>

            <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Category</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={loadingFeed}
                  onClick={() => setActiveCategory('All')}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    activeCategory === 'All'
                      ? 'bg-primary-700 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  All {allCount ? `(${allCount})` : ''}
                </button>
                {categories.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    disabled={loadingFeed || c.count === 0}
                    onClick={() => setActiveCategory(c.name)}
                    title={c.count === 0 ? 'No stories from feeds right now' : undefined}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      activeCategory === c.name
                        ? 'bg-primary-700 text-white'
                        : c.count === 0
                          ? 'cursor-not-allowed bg-gray-50 text-gray-400 dark:bg-gray-900 dark:text-gray-600'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {c.name} ({c.count})
                  </button>
                ))}
              </div>
              {activeCategory !== 'All' && totalInCategory > items.length ? (
                <p className="mt-2 text-xs text-gray-500">
                  Showing {items.length} of {totalInCategory} in {activeCategory}
                </p>
              ) : null}
            </div>

            {!loadingFeed && selectableItems.length > 0 ? (
              <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-5 py-2 text-xs dark:border-gray-800">
                <label className="flex cursor-pointer items-center gap-2 font-medium text-gray-700 dark:text-gray-200">
                  <input
                    type="checkbox"
                    checked={allSelectableSelected}
                    onChange={() => (allSelectableSelected ? clearSelection() : selectAllVisible())}
                    className="rounded border-gray-300"
                  />
                  Select all ({Math.min(selectableItems.length, MAX_BATCH_SIZE)})
                </label>
                {selectedCount > 0 ? (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="text-primary-700 hover:underline dark:text-primary-300"
                  >
                    Clear selection
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="flex-1 overflow-y-auto px-5 py-4">
              {loadingFeed ? (
                <div className="flex justify-center py-12">
                  <Spinner />
                </div>
              ) : items.length === 0 ? (
                <p className="py-8 text-center text-sm text-gray-500">No stories in this category.</p>
              ) : (
                <ul className="space-y-3">
                  {items.map((item) => {
                    const isSelected = selected.has(item.url);
                    const canSelect = !item.alreadyImported;
                    return (
                      <li
                        key={item.url}
                        className={`rounded-xl border p-4 transition ${
                          isSelected
                            ? 'border-primary-400 bg-primary-50/50 dark:border-primary-600 dark:bg-primary-950/20'
                            : 'border-gray-100 dark:border-gray-800'
                        }`}
                      >
                        <div className="flex gap-3">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={!canSelect}
                            onChange={() => toggleSelect(item.url)}
                            title={canSelect ? 'Select for batch review' : 'Already imported'}
                            className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 disabled:opacity-40"
                          />
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt=""
                              className="h-16 w-24 shrink-0 rounded-lg object-cover"
                            />
                          ) : null}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              {item.suggestedCategory ? (
                                <CategoryBadge category={item.suggestedCategory} />
                              ) : null}
                              <p className="text-xs font-medium text-gray-500">{item.sourceName}</p>
                              {item.alreadyImported ? (
                                <span className="text-[10px] font-medium uppercase text-amber-600">
                                  Imported
                                </span>
                              ) : null}
                            </div>
                            <h3 className="mt-1 font-semibold text-gray-900 dark:text-white">
                              {item.title}
                            </h3>
                            {item.description ? (
                              <p className="mt-1 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                                {item.description}
                              </p>
                            ) : null}
                            <p className="mt-1 text-xs text-gray-400">{formatArticleDateTime(item.publishedAt)}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end">
                          <button
                            type="button"
                            disabled={item.alreadyImported}
                            onClick={() => startReview([item])}
                            className="rounded-lg border border-primary-600 px-4 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-50 disabled:opacity-50 dark:border-primary-500 dark:text-primary-100 dark:hover:bg-primary-950/50"
                          >
                            Generate draft
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {selectedCount > 0 ? (
              <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-700 dark:bg-gray-950">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                  {selectedCount} selected
                  {selectedCount > 1 ? ` (max ${MAX_BATCH_SIZE})` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => startReview(selectedItems.filter((item) => !item.alreadyImported))}
                    className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-800"
                  >
                    {selectedCount === 1
                      ? 'Generate draft for review'
                      : `Generate ${selectedCount} drafts for review`}
                  </button>
                </div>
              </footer>
            ) : null}
          </div>
        </div>
      ) : null}

      <BatchArticleReviewPanel
        open={reviewOpen}
        items={reviewItems}
        onClose={() => {
          setReviewOpen(false);
          setReviewItems([]);
        }}
        onPublished={() => router.push('/admin/articles')}
      />
    </>
  );
}
