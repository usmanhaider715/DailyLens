'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';
import { ArticleDraftPreviewModal } from './ArticleDraftPreviewModal.jsx';
import BatchArticleReviewPanel from './BatchArticleReviewPanel.jsx';
import { draftToEditorForm, draftToPublishPayload, saveAdminDraft } from '@/utils/adminDraft';
import { MAX_BATCH } from '@/utils/batchPublish';
import { Sparkles, TrendingUp, Newspaper, Search } from 'lucide-react';

const CATEGORIES = [
  'World',
  'Technology',
  'Business',
  'Sports',
  'Health',
  'Science',
  'Entertainment',
  'Gaming',
  'Politics',
  'Crypto',
  'Weather',
];

async function requestAiDraft(story) {
  const { data } = await api.post('/admin/ai/generate-article', {
    title: story.title,
    description: story.description,
    content: story.content || story.description,
    url: story.url,
    imageUrl: story.imageUrl,
    sourceName: story.sourceName,
    sourceUrl: story.sourceUrl || story.url,
    publishedAt: story.publishedAt,
    suggestedCategory: story.suggestedCategory || story.category,
  });
  return data;
}

async function requestAiDraftFromTrend(trend, region) {
  const { data } = await api.post('/admin/ai/generate-from-trend', {
    query: trend.query,
    region,
    useGoogleNews: true,
  });
  return data;
}

function StoryRow({ story, onWrite, busyKey, label, selected, onToggle, bulkMode }) {
  const key = story.url || story.id;
  const busy = busyKey === key;
  return (
    <li className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 gap-3">
        {bulkMode ? (
          <input
            type="checkbox"
            checked={!!selected}
            onChange={() => onToggle?.(key)}
            disabled={!!busyKey}
            className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{story.title}</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {story.sourceName}
            {story.publishedAt
              ? ` · ${new Date(story.publishedAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
              : ''}
          </p>
        </div>
      </div>
      {!bulkMode ? (
        <button
          type="button"
          disabled={!!busyKey}
          onClick={() => onWrite(story, label)}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
        >
          {busy ? <Spinner className="h-3.5 w-3.5 border-white/30 border-t-white" /> : <Sparkles className="h-3.5 w-3.5" />}
          Write by AI
        </button>
      ) : null}
    </li>
  );
}

function TrendRow({ trend, region, onWrite, busyKey }) {
  const busy = busyKey === trend.id;
  return (
    <li className="flex flex-col gap-2 border-b border-gray-100 px-4 py-3 last:border-0 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <p className="font-medium capitalize text-gray-900 dark:text-white">{trend.query}</p>
        {trend.topHeadline && (
          <p className="mt-0.5 line-clamp-1 text-xs text-gray-500">{trend.topHeadline}</p>
        )}
        {trend.traffic && <p className="mt-0.5 text-[10px] font-semibold uppercase text-gray-400">{trend.traffic}</p>}
      </div>
      <button
        type="button"
        disabled={!!busyKey}
        onClick={() => onWrite(trend, region)}
        className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
      >
        {busy ? <Spinner className="h-3.5 w-3.5 border-white/30 border-t-white" /> : <Sparkles className="h-3.5 w-3.5" />}
        Write by AI
      </button>
    </li>
  );
}

export function GoogleNewsHub() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState('news24h');
  const [region, setRegion] = useState('us');
  const [loading, setLoading] = useState(false);
  const [uk, setUk] = useState([]);
  const [us, setUs] = useState([]);
  const [news24h, setNews24h] = useState(null);
  const [activeCategory, setActiveCategory] = useState('World');
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busyKey, setBusyKey] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState([]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewDraft, setPreviewDraft] = useState(null);
  const [previewMeta, setPreviewMeta] = useState(null);

  const loadTrends = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/ai/google-trends', { params: { region: 'both' } });
      setUk(data.uk || []);
      setUs(data.us || []);
    } catch {
      toast.error('Could not load trends');
    } finally {
      setLoading(false);
    }
  }, []);

  const load24h = useCallback(async (reg) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/ai/google-news/24h', { params: { region: reg } });
      setNews24h(data);
    } catch {
      toast.error('Could not load Google News');
      setNews24h(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (mainTab === 'trends') loadTrends();
    if (mainTab === 'news24h') load24h(region);
  }, [mainTab, region, loadTrends, load24h]);

  useEffect(() => {
    setSelected(new Set());
  }, [mainTab, activeCategory, region]);

  const runSearch = async (e) => {
    e?.preventDefault();
    const q = searchQ.trim();
    if (!q) return;
    setSearching(true);
    try {
      const { data } = await api.get('/admin/ai/google-news/search', {
        params: { q, region, limit: 30 },
      });
      setSearchResults(data.items || []);
      if (!data.items?.length) toast('No stories in the last 24 hours for that search.');
    } catch {
      toast.error('Search failed');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const openPreview = async (draft, meta) => {
    setPreviewDraft(draft);
    setPreviewMeta(meta);
    setPreviewOpen(true);
    setPreviewLoading(false);
  };

  const startGenerate = async (fn, key, meta) => {
    setBusyKey(key);
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewDraft(null);
    setPreviewMeta(meta);
    try {
      const draft = await fn();
      await openPreview(draft, meta);
    } catch (err) {
      setPreviewOpen(false);
      toast.error(err?.response?.data?.message || 'AI generation failed');
    } finally {
      setBusyKey(null);
    }
  };

  const handleStoryWrite = (story, label) => {
    const key = story.url || story.id;
    startGenerate(
      () => requestAiDraft(story),
      key,
      {
        sourceName: story.sourceName,
        sourceUrl: story.sourceUrl || story.url,
        sourceTitle: story.title,
        originalTitle: story.title,
        publishedAt: story.publishedAt,
        label,
      }
    );
  };

  const handleTrendWrite = (trend, reg) => {
    startGenerate(
      () => requestAiDraftFromTrend(trend, reg),
      trend.id,
      {
        sourceName: trend.topSource || 'Google Trends',
        sourceUrl: trend.topUrl || '',
        sourceTitle: trend.query,
        originalTitle: trend.query,
      }
    );
  };

  const handlePublish = async () => {
    if (!previewDraft) return;
    await api.post('/admin/articles', draftToPublishPayload(previewDraft, previewMeta));
    toast.success('Article published');
    setPreviewOpen(false);
    router.push('/admin/articles');
  };

  const handleEdit = () => {
    if (!previewDraft) return;
    saveAdminDraft(previewDraft, previewMeta);
    setPreviewOpen(false);
    router.push('/admin/articles/new');
  };

  const categoryStories = news24h?.categories?.[activeCategory] || [];
  const visibleStories = mainTab === 'search' ? searchResults : categoryStories;
  const storyKey = (story) => story.url || story.id;

  const toggleSelect = (key) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else if (next.size < MAX_BATCH) next.add(key);
      else toast.error(`Maximum ${MAX_BATCH} stories per batch`);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelected(new Set(visibleStories.slice(0, MAX_BATCH).map(storyKey)));
  };

  const clearSelection = () => setSelected(new Set());

  const selectedStories = visibleStories.filter((s) => selected.has(storyKey(s)));

  const publishSelected = () => {
    if (selectedStories.length === 0) {
      toast.error('Select at least one story');
      return;
    }
    if (selectedStories.length === 1) {
      return handleStoryWrite(selectedStories[0], activeCategory);
    }
    setReviewItems(selectedStories);
    setReviewOpen(true);
    setSelected(new Set());
  };

  const bulkMode = mainTab === 'news24h' || mainTab === 'search';

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary-700 dark:text-primary-400">
            <Newspaper className="h-5 w-5" />
            <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Google News & Trends</h1>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Last 24 hours by category, trending searches, and custom Google News search. AI rewrites with preview,
            free-use hero images (Wikimedia Commons, Google Images CC filter, Unsplash fallback).
          </p>
        </div>
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <option value="us">US edition</option>
          <option value="uk">UK edition</option>
        </select>
      </div>

      <div className="flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
        {[
          { id: 'news24h', label: '24h by category', icon: Newspaper },
          { id: 'trends', label: 'Trending', icon: TrendingUp },
          { id: 'search', label: 'Search news', icon: Search },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setMainTab(t.id)}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold ${
              mainTab === t.id
                ? 'bg-white text-gray-900 shadow dark:bg-gray-950 dark:text-white'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {mainTab === 'news24h' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => {
              const count = news24h?.categories?.[cat]?.length ?? 0;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    activeCategory === cat
                      ? 'bg-primary-700 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
          <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
              <div>
                <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">
                  {activeCategory} — last 24 hours
                </h2>
                <p className="text-xs text-gray-500">
                  {news24h?.total ?? 0} stories across all categories · {region.toUpperCase()} feed
                </p>
              </div>
              {categoryStories.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <label className="flex cursor-pointer items-center gap-2 font-medium">
                    <input
                      type="checkbox"
                      checked={
                        categoryStories.length > 0 &&
                        categoryStories.slice(0, MAX_BATCH).every((s) => selected.has(storyKey(s)))
                      }
                      onChange={() =>
                        categoryStories.slice(0, MAX_BATCH).every((s) => selected.has(storyKey(s)))
                          ? clearSelection()
                          : selectAllVisible()
                      }
                      disabled={reviewOpen}
                      className="rounded border-gray-300"
                    />
                    Select up to {MAX_BATCH}
                  </label>
                  {selected.size > 0 ? (
                    <button type="button" onClick={clearSelection} className="text-primary-700 hover:underline">
                      Clear
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : categoryStories.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500">No stories in the last 24h for this category.</p>
            ) : (
              <ul>
                {categoryStories.map((story) => (
                  <StoryRow
                    key={story.id}
                    story={story}
                    onWrite={handleStoryWrite}
                    busyKey={busyKey}
                    label={activeCategory}
                    bulkMode={bulkMode}
                    selected={selected.has(storyKey(story))}
                    onToggle={toggleSelect}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {mainTab === 'trends' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {loading ? (
            <div className="col-span-2 flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="border-b px-4 py-3 font-bold">🇬🇧 UK trending</div>
                <ul>
                  {uk.map((t) => (
                    <TrendRow key={t.id} trend={t} region="uk" onWrite={handleTrendWrite} busyKey={busyKey} />
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
                <div className="border-b px-4 py-3 font-bold">🇺🇸 US trending</div>
                <ul>
                  {us.map((t) => (
                    <TrendRow key={t.id} trend={t} region="us" onWrite={handleTrendWrite} busyKey={busyKey} />
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}

      {mainTab === 'search' && (
        <div className="space-y-4">
          <form onSubmit={runSearch} className="flex flex-wrap gap-2">
            <input
              type="search"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Search any topic on Google News…"
              className="min-w-[240px] flex-1 rounded-lg border border-gray-200 px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <button
              type="submit"
              disabled={searching}
              className="rounded-lg bg-primary-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
            >
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>
          <div className="rounded-xl border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="border-b px-4 py-3 text-sm text-gray-500">
              Results from the last 24 hours · rewrite any story with AI
            </div>
            {searching ? (
              <div className="flex justify-center py-12">
                <Spinner />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-gray-500">Search for news to get started.</p>
            ) : (
              <ul>
                {searchResults.map((story) => (
                  <StoryRow
                    key={story.id}
                    story={story}
                    onWrite={handleStoryWrite}
                    busyKey={busyKey}
                    label="search"
                    bulkMode={bulkMode}
                    selected={selected.has(storyKey(story))}
                    onToggle={toggleSelect}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {bulkMode && selected.size > 0 ? (
        <div className="sticky bottom-4 z-20 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary-200 bg-white px-5 py-4 shadow-lg dark:border-primary-800 dark:bg-gray-900">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
            {selected.size} selected (max {MAX_BATCH})
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearSelection}
              className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={publishSelected}
              className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-800"
            >
              {selected.size === 1
                ? 'Generate draft for review'
                : `Generate ${selected.size} drafts for review`}
            </button>
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

      <ArticleDraftPreviewModal
        open={previewOpen}
        draft={previewDraft}
        meta={previewMeta}
        loading={previewLoading}
        onClose={() => {
          if (!previewLoading) setPreviewOpen(false);
        }}
        onPublish={handlePublish}
        onEdit={handleEdit}
      />
    </div>
  );
}
