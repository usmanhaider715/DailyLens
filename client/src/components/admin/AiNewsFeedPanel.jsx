import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api.js';
import { Spinner } from '../common/Spinner.jsx';

const CATEGORY_COLORS = {
  World: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  Technology: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200',
  Business: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200',
  Sports: 'bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200',
  Health: 'bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200',
  Science: 'bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200',
  Entertainment: 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-200',
  Politics: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200',
  Crypto: 'bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200',
  Weather: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/50 dark:text-cyan-200',
};

function formatDate(d) {
  if (!d) return '';
  try {
    return new Date(d).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

function CategoryBadge({ category }) {
  const cls = CATEGORY_COLORS[category] || CATEGORY_COLORS.World;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}>
      {category}
    </span>
  );
}

export function AiNewsFeedPanel({ open, onClose, onApplyDraft }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [totalInCategory, setTotalInCategory] = useState(0);
  const [loadingFeed, setLoadingFeed] = useState(false);
  const [generatingId, setGeneratingId] = useState(null);
  const [statusText, setStatusText] = useState('');

  const loadFeed = useCallback(async (category) => {
    setLoadingFeed(true);
    try {
      const params = { limit: 100 };
      if (category && category !== 'All') params.category = category;
      const { data } = await api.get('/admin/ai/news-feed', { params });
      setItems(data.items || []);
      setCategories(data.categories || []);
      setTotalInCategory(data.totalInCategory ?? data.items?.length ?? 0);
      if (!data.items?.length) {
        toast(
          category === 'All'
            ? 'No headlines returned. Add NEWSAPI_KEY or GNEWS_KEY in server .env.'
            : `No stories in ${category} right now.`
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

  const addArticle = async (item) => {
    setGeneratingId(item.url);
    setStatusText('Writing article and finding source image…');
    try {
      const { data: draft } = await api.post('/admin/ai/generate-article', {
        title: item.title,
        description: item.description,
        content: item.description,
        url: item.url,
        imageUrl: item.imageUrl,
        sourceName: item.sourceName,
        sourceUrl: item.sourceUrl || item.url,
        publishedAt: item.publishedAt,
        suggestedCategory: item.suggestedCategory,
      });

      onApplyDraft({
        title: draft.title,
        summary: draft.summary,
        body: draft.body,
        category: draft.category,
        tags: (draft.tags || []).join(', '),
        heroImageUrl: draft.heroImageUrl || '',
        heroImageAlt: draft.heroImageAlt || draft.title,
        heroImageCredit: draft.heroImageCredit || item.sourceName,
        heroImageCreditUrl: draft.heroImageCreditUrl || item.url,
        heroImageSource: draft.heroImageSource || 'original',
        isBreaking: draft.isBreaking,
      });

      toast.success('Article drafted — review and publish');
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not generate article');
    } finally {
      setGeneratingId(null);
      setStatusText('');
    }
  };

  if (!open) return null;

  const busy = !!generatingId;
  const allCount = categories.reduce((sum, c) => sum + c.count, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close"
        disabled={busy}
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl dark:bg-gray-900 sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div>
            <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">
              Latest news from all sources
            </h2>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              Categories from NewsAPI, GNews, and RSS feeds · Groq writes the article
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg px-3 py-1 text-sm text-gray-500 hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
          >
            Close
          </button>
        </header>

        <div className="border-b border-gray-100 px-5 py-3 dark:border-gray-800">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Category</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || loadingFeed}
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
                disabled={busy || loadingFeed}
                onClick={() => setActiveCategory(c.name)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  activeCategory === c.name
                    ? 'bg-primary-700 text-white'
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

        {busy ? (
          <div className="border-b border-primary-200 bg-primary-50 px-5 py-3 text-sm text-primary-900 dark:border-primary-800 dark:bg-primary-950/40 dark:text-primary-100">
            <div className="flex items-center gap-3">
              <Spinner />
              <span>{statusText}</span>
            </div>
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
                const isGen = generatingId === item.url;
                return (
                  <li
                    key={item.url}
                    className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"
                  >
                    <div className="flex gap-3">
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
                        <p className="mt-1 text-xs text-gray-400">{formatDate(item.publishedAt)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => addArticle(item)}
                        className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
                      >
                        {isGen ? 'Generating…' : 'Add this article'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
