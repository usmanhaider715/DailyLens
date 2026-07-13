'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Eye } from 'lucide-react';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';
import { formatArticleDateTime } from '../../utils/formatDate.js';
import { SeoScoreBadge } from '../common/SeoScoreBadge.jsx';
import { HeroImage } from '../common/HeroImage.jsx';
import { buildPageNumbers } from '@/utils/pagination';
import { useAuth } from '@/context/AuthContext';

const SECTIONS = [
  { id: 'published', label: 'Published articles' },
  { id: 'evergreen', label: 'Evergreen articles' },
  { id: 'drafts', label: 'Drafts' },
  { id: 'evergreen-drafts', label: 'Evergreen drafts' },
];

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

export function ArticleManager() {
  const { ready } = useAuth();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState('published');
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [fetchUrl, setFetchUrl] = useState('');
  const limit = 20;

  const load = async (p = page, sec = section) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/articles', {
        params: {
          page: p,
          limit,
          section: sec,
          category: category || undefined,
          q: q || undefined,
          from,
          to,
        },
      });
      setItems(data.items || []);
      setTotal(data.total || 0);
      setPage(data.page || p);
    } catch {
      toast.error('Failed to load articles');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ready) return;
    setPage(1);
    load(1, section);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, section, category, from, to]);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const pageNumbers = useMemo(() => buildPageNumbers(page, totalPages), [page, totalPages]);

  const isEvergreenSection = section === 'evergreen' || section === 'evergreen-drafts';
  const showEvergreenToggle = section === 'published' || section === 'drafts';
  const showDelete = !isEvergreenSection;
  const showPublicView = section === 'published' || section === 'evergreen';

  const publicArticleHref = (slug) => `/article/${slug}`;

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const bulkDelete = async () => {
    if (!selected.size) return;
    try {
      const { data } = await api.post('/admin/articles/bulk-delete', { ids: Array.from(selected) });
      if (data.skipped) {
        toast(`Deleted ${data.deleted}; ${data.skipped} evergreen skipped`, { icon: 'ℹ️' });
      } else {
        toast.success(`Deleted ${data.deleted || selected.size}`);
      }
      setSelected(new Set());
      load();
    } catch {
      toast.error('Bulk delete failed');
    }
  };

  const toggleField = async (id, field, value) => {
    try {
      if (field === 'feature') await api.post(`/admin/articles/${id}/feature`, { value });
      if (field === 'breaking') await api.post(`/admin/articles/${id}/breaking`, { value });
      if (field === 'pause') await api.post(`/admin/articles/${id}/pause`, { value });
      if (field === 'evergreen') {
        await api.post(`/admin/articles/${id}/evergreen`, { value });
        toast.success(value ? 'Moved to Evergreen' : 'Removed from Evergreen');
      }
      load();
    } catch {
      toast.error('Update failed');
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/admin/articles/${id}`);
      toast.success('Deleted');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Delete failed');
    }
  };

  const manualFetch = async () => {
    if (!fetchUrl.trim()) return;
    try {
      await api.post('/admin/fetch-url', { url: fetchUrl.trim() });
      toast.success('Fetch started — article will appear when processed');
      setFetchUrl('');
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Fetch failed');
    }
  };

  const allIds = useMemo(() => items.map((i) => String(i._id)), [items]);

  if (loading && !items.length) return <Spinner />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Articles</h1>
        <Link
          href="/admin/articles/new"
          className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-800"
        >
          + Write article
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-950">
        {SECTIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSection(s.id);
              setSelected(new Set());
            }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              section === s.id
                ? 'bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-white'
                : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isEvergreenSection ? (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          Evergreen articles are protected — they cannot be deleted here. Uncheck Evergreen to move back to the
          main list.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search headline"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
        />
        <button
          type="button"
          onClick={() => load(1)}
          className="rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white"
        >
          Apply
        </button>
      </div>

      {section === 'published' ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={fetchUrl}
            onChange={(e) => setFetchUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="min-w-[240px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
          <button
            type="button"
            onClick={manualFetch}
            className="rounded-lg border border-primary-200 px-4 py-2 text-sm font-semibold text-primary-800 dark:border-primary-800 dark:text-primary-100"
          >
            Fetch URL
          </button>
          <button
            type="button"
            onClick={bulkDelete}
            disabled={!selected.size}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            Bulk delete
          </button>
        </div>
      ) : null}

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {showDelete ? (
                <th className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allIds.length > 0 && allIds.every((id) => selected.has(id))}
                    onChange={(e) => {
                      if (e.target.checked) setSelected(new Set(allIds));
                      else setSelected(new Set());
                    }}
                  />
                </th>
              ) : null}
              {showPublicView ? <th className="px-3 py-2 text-left" aria-label="View on site" /> : null}
              <th className="px-3 py-2 text-left">Thumb</th>
              <th className="px-3 py-2 text-left">Headline</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">SEO</th>
              <th className="px-3 py-2">Views</th>
              <th className="px-3 py-2">{section.includes('draft') ? 'Created' : 'Published'}</th>
              <th className="px-3 py-2">Breaking</th>
              <th className="px-3 py-2">Featured</th>
              <th className="px-3 py-2">Paused</th>
              <th className="px-3 py-2" title="Move to protected Evergreen section">
                Evergreen
              </th>
              {showDelete ? <th className="px-3 py-2" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((a) => (
              <tr key={a._id} className="bg-white dark:bg-gray-900">
                {showDelete ? (
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(String(a._id))}
                      onChange={() => toggleSelect(String(a._id))}
                    />
                  </td>
                ) : null}
                {showPublicView ? (
                  <td className="px-3 py-2">
                    {a.slug ? (
                      <a
                        href={publicArticleHref(a.slug)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary-700 dark:hover:bg-gray-800 dark:hover:text-primary-300"
                        title="View on website"
                        aria-label={`View "${a.title}" on website`}
                      >
                        <Eye className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="inline-block w-7 text-gray-300">—</span>
                    )}
                  </td>
                ) : null}
                <td className="px-3 py-2">
                  <HeroImage
                    url={a.heroImage?.url}
                    alt={a.title}
                    category={a.category}
                    className="h-12 w-16 rounded object-cover"
                  />
                </td>
                <td className="max-w-xs px-3 py-2 font-medium text-gray-900 dark:text-gray-100">
                  <Link href={`/admin/articles/edit/${a._id}`} className="hover:text-primary-700 hover:underline">
                    {a.title}
                  </Link>
                  {a.isPaused && (
                    <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-900">
                      PAUSED
                    </span>
                  )}
                  {a.isEvergreen && (
                    <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-900">
                      EVERGREEN
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">{a.category}</td>
                <td className="px-3 py-2">
                  <SeoScoreBadge score={a.seoScore} size="sm" />
                </td>
                <td className="px-3 py-2">{a.views ?? 0}</td>
                <td
                  className="px-3 py-2 whitespace-nowrap"
                  title={a.publishedAt ? new Date(a.publishedAt).toISOString() : undefined}
                >
                  {formatArticleDateTime(a.publishedAt)}
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={!!a.isBreaking}
                    onChange={(e) => toggleField(a._id, 'breaking', e.target.checked)}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={!!a.isFeatured}
                    onChange={(e) => toggleField(a._id, 'feature', e.target.checked)}
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={!!a.isPaused}
                    onChange={(e) => toggleField(a._id, 'pause', e.target.checked)}
                    title="Hide from public site"
                  />
                </td>
                <td className="px-3 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={!!a.isEvergreen}
                    onChange={(e) => toggleField(a._id, 'evergreen', e.target.checked)}
                    title={
                      showEvergreenToggle
                        ? 'Move to Evergreen section'
                        : 'Uncheck to return to main list'
                    }
                  />
                </td>
                {showDelete ? (
                  <td className="px-3 py-2">
                    <button type="button" className="text-red-600" onClick={() => remove(a._id)}>
                      Delete
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600">
        <span>
          Page {page} of {totalPages} ({total} total)
        </span>
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => load(page - 1)}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          {pageNumbers.map((n, idx) =>
            n === '…' ? (
              <span key={`ellipsis-${idx}`} className="px-2 text-gray-400">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => load(n)}
                className={`min-w-[2rem] rounded border px-2 py-1 ${
                  n === page
                    ? 'border-primary-600 bg-primary-600 text-white'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
              >
                {n}
              </button>
            )
          )}
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => load(page + 1)}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
