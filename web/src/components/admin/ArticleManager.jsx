'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';
import { formatArticleDate } from '../../utils/formatDate.js';
import { SeoScoreBadge } from '../common/SeoScoreBadge.jsx';
import { HeroImage } from '../common/HeroImage.jsx';

export function ArticleManager() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [q, setQ] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [fetchUrl, setFetchUrl] = useState('');

  const load = async (p = page) => {
    setLoading(true);
    try {
      const { data } = await api.get('/admin/articles', {
        params: { page: p, limit: 20, category: category || undefined, q: q || undefined, from, to },
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
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, from, to]);

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
      await api.post('/admin/articles/bulk-delete', { ids: Array.from(selected) });
      toast.success('Deleted');
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
    } catch {
      toast.error('Delete failed');
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
          {['World', 'Technology', 'Business', 'Sports', 'Health', 'Science', 'Entertainment', 'Politics', 'Crypto', 'Weather'].map(
            (c) => (
              <option key={c} value={c}>
                {c}
              </option>
            )
          )}
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

      <div className="mt-6 overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
        <table className="min-w-full divide-y divide-gray-100 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
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
              <th className="px-3 py-2 text-left">Thumb</th>
              <th className="px-3 py-2 text-left">Headline</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">SEO</th>
              <th className="px-3 py-2">Views</th>
              <th className="px-3 py-2">Published</th>
              <th className="px-3 py-2">Breaking</th>
              <th className="px-3 py-2">Featured</th>
              <th className="px-3 py-2">Paused</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {items.map((a) => (
              <tr key={a._id} className="bg-white dark:bg-gray-900">
                <td className="px-3 py-2">
                  <input
                    type="checkbox"
                    checked={selected.has(String(a._id))}
                    onChange={() => toggleSelect(String(a._id))}
                  />
                </td>
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
                  {a.forecast?.enabled && (
                    <span className="ml-2 rounded bg-primary-100 px-1.5 py-0.5 text-[10px] font-bold text-primary-800">
                      FC
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">{a.category}</td>
                <td className="px-3 py-2">
                  <SeoScoreBadge score={a.seoScore} size="sm" />
                </td>
                <td className="px-3 py-2">{a.views}</td>
                <td className="px-3 py-2 whitespace-nowrap">{formatArticleDate(a.publishedAt)}</td>
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
                <td className="px-3 py-2">
                  <button type="button" className="text-red-600" onClick={() => remove(a._id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between text-sm text-gray-600">
        <span>
          Page {page} of {Math.max(1, Math.ceil(total / 20))}
        </span>
        <div className="space-x-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => load(page - 1)}
            className="rounded border px-3 py-1 disabled:opacity-40"
          >
            Prev
          </button>
          <button
            type="button"
            disabled={page * 20 >= total}
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
