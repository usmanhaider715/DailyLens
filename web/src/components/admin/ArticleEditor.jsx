'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';
import { AiNewsFeedPanel } from './AiNewsFeedPanel.jsx';

const categories = [
  'World',
  'Technology',
  'Business',
  'Sports',
  'Health',
  'Science',
  'Entertainment',
  'Politics',
  'Crypto',
  'Weather',
];

const emptyForm = {
  title: '',
  slug: '',
  summary: '',
  body: '',
  category: 'World',
  tags: '',
  author: 'The Daily Lens Desk',
  heroImageUrl: '',
  heroImageAlt: '',
  heroImageCredit: '',
  heroImageCreditUrl: '',
  isBreaking: false,
  isFeatured: false,
  isPublished: true,
  isPaused: false,
  forecastEnabled: false,
  forecastHeadline: '',
  forecastBody: '',
  forecastConfidence: 'Medium',
};

export function ArticleEditor() {
  const { id } = useParams();
  const isNew = !id || id === 'new';
  const router = useRouter();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [aiFeedOpen, setAiFeedOpen] = useState(false);

  useEffect(() => {
    if (isNew) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/admin/articles/${id}`);
        if (cancelled) return;
        setForm({
          title: data.title || '',
          slug: data.slug || '',
          summary: data.summary || '',
          body: data.body || '',
          category: data.category || 'World',
          tags: (data.tags || []).join(', '),
          author: data.author || 'The Daily Lens Desk',
          heroImageUrl: data.heroImage?.url || '',
          heroImageAlt: data.heroImage?.alt || '',
          isBreaking: !!data.isBreaking,
          isFeatured: !!data.isFeatured,
          isPublished: data.isPublished !== false,
          isPaused: !!data.isPaused,
          forecastEnabled: !!data.forecast?.enabled,
          forecastHeadline: data.forecast?.headline || '',
          forecastBody: data.forecast?.body || '',
          forecastConfidence: data.forecast?.confidence || 'Medium',
        });
      } catch {
        toast.error('Could not load article');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isNew]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const buildPayload = () => ({
    title: form.title,
    slug: form.slug || undefined,
    summary: form.summary,
    body: form.body,
    category: form.category,
    tags: form.tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean),
    author: form.author,
    heroImage: form.heroImageUrl
      ? {
          url: form.heroImageUrl,
          alt: form.heroImageAlt || form.title,
          credit: form.heroImageCredit || '',
          creditUrl: form.heroImageCreditUrl || '',
          source: 'original',
        }
      : undefined,
    isBreaking: form.isBreaking,
    isFeatured: form.isFeatured,
    isPublished: form.isPublished,
    isPaused: form.isPaused,
    forecast: {
      enabled: form.forecastEnabled,
      headline: form.forecastHeadline,
      body: form.forecastBody,
      confidence: form.forecastConfidence,
    },
  });

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isNew) {
        const { data } = await api.post('/admin/articles', buildPayload());
        toast.success('Article published');
        router.push(`/admin/articles/edit/${data._id}`);
      } else {
        await api.put(`/admin/articles/${id}`, buildPayload());
        toast.success('Article updated');
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">
          {isNew ? 'Write article' : 'Edit article'}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          {isNew ? (
            <button
              type="button"
              onClick={() => setAiFeedOpen(true)}
              className="rounded-lg border border-primary-600 bg-primary-50 px-4 py-2 text-sm font-semibold text-primary-800 hover:bg-primary-100 dark:border-primary-500 dark:bg-primary-950/50 dark:text-primary-100"
            >
              Get articles from AI
            </button>
          ) : null}
          <Link href="/admin/articles" className="text-sm font-medium text-primary-700 hover:underline">
            ← Back to articles
          </Link>
        </div>
      </div>

      <AiNewsFeedPanel
        open={aiFeedOpen}
        onClose={() => setAiFeedOpen(false)}
        onApplyDraft={(draft) => {
          setForm((f) => ({
            ...f,
            title: draft.title || f.title,
            summary: draft.summary || f.summary,
            body: draft.body || f.body,
            category: draft.category || f.category,
            tags: draft.tags || f.tags,
            heroImageUrl: draft.heroImageUrl || f.heroImageUrl,
            heroImageAlt: draft.heroImageAlt || f.heroImageAlt,
            heroImageCredit: draft.heroImageCredit || f.heroImageCredit,
            heroImageCreditUrl: draft.heroImageCreditUrl || f.heroImageCreditUrl,
            isBreaking: draft.isBreaking ?? f.isBreaking,
          }));
        }}
      />

      <form onSubmit={save} className="space-y-6">
        <section className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="font-display text-lg font-bold">Headline & story</h2>
          <label className="mt-4 block text-sm font-medium">
            Headline *
            <input
              required
              value={form.title}
              onChange={(e) => set('title', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <label className="mt-3 block text-sm font-medium">
            URL slug (optional)
            <input
              value={form.slug}
              onChange={(e) => set('slug', e.target.value)}
              placeholder="auto-generated from headline"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Summary (card / SEO)
            <textarea
              rows={2}
              value={form.summary}
              onChange={(e) => set('summary', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Article body *
            <textarea
              required
              rows={12}
              value={form.body}
              onChange={(e) => set('body', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
        </section>

        <section className="rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="font-display text-lg font-bold">Metadata</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">
              Category
              <select
                value={form.category}
                onChange={(e) => set('category', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              Author
              <input
                value={form.author}
                onChange={(e) => set('author', e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
          </div>
          <label className="mt-3 block text-sm font-medium">
            Tags (comma-separated)
            <input
              value={form.tags}
              onChange={(e) => set('tags', e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <label className="mt-3 block text-sm font-medium">
            Hero image URL
            <input
              value={form.heroImageUrl}
              onChange={(e) => set('heroImageUrl', e.target.value)}
              placeholder="https://..."
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
          <div className="mt-4 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isPublished} onChange={(e) => set('isPublished', e.target.checked)} />
              Published
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} />
              Featured
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isBreaking} onChange={(e) => set('isBreaking', e.target.checked)} />
              Breaking news
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.isPaused} onChange={(e) => set('isPaused', e.target.checked)} />
              Paused (hidden from site)
            </label>
          </div>
        </section>

        <section className="rounded-xl border-2 border-primary-200 bg-primary-50/50 p-5 dark:border-primary-800 dark:bg-primary-950/30">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-primary-950 dark:text-white">Forecast / outlook</h2>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={form.forecastEnabled}
                onChange={(e) => set('forecastEnabled', e.target.checked)}
              />
              Show forecast on site
            </label>
          </div>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Appears on the article page, homepage forecast widget, categories, and cards.
          </p>
          {form.forecastEnabled && (
            <>
              <label className="mt-4 block text-sm font-medium">
                Forecast headline
                <input
                  value={form.forecastHeadline}
                  onChange={(e) => set('forecastHeadline', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
              <label className="mt-3 block text-sm font-medium">
                Forecast analysis
                <textarea
                  rows={4}
                  value={form.forecastBody}
                  onChange={(e) => set('forecastBody', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                />
              </label>
              <label className="mt-3 block text-sm font-medium">
                Confidence
                <select
                  value={form.forecastConfidence}
                  onChange={(e) => set('forecastConfidence', e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                >
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </label>
            </>
          )}
        </section>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-primary-700 px-8 py-3 font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : isNew ? 'Publish article' : 'Save changes'}
        </button>
      </form>
    </div>
  );
}
