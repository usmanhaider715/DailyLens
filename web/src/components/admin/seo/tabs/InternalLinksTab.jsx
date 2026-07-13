'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Search, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';
import { api } from '@/services/api';
import { Card, Badge, Empty, Loading } from '../primitives.jsx';

export function InternalLinksTab() {
  const [slug, setSlug] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async (e) => {
    e?.preventDefault();
    const s = slug.trim().replace(/^.*\/article\//, '').replace(/\/$/, '');
    if (!s) return;
    setLoading(true);
    try {
      const { data: d } = await api.get(`/admin/seo/internal-links/${encodeURIComponent(s)}`);
      setData(d);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Article not found');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={load} className="flex gap-2">
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="Enter an article slug or URL…"
          className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
        />
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Search className="h-4 w-4" /> Analyze
        </button>
      </form>

      {loading && <Loading />}

      {data && !loading && (
        <div className="space-y-4">
          <h3 className="font-display text-base font-bold text-gray-900 dark:text-white">{data.title}</h3>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Suggested links" subtitle="Add these internal links">
              {data.suggestedLinks.length ? (
                <ul className="space-y-1.5 text-sm">
                  {data.suggestedLinks.map((l) => (
                    <li key={l.slug} className="flex items-center justify-between gap-2">
                      <a href={`/article/${l.slug}`} target="_blank" rel="noreferrer" className="truncate text-primary-700 hover:underline dark:text-primary-400">
                        {l.title}
                      </a>
                      <Badge tone="primary">{l.score}</Badge>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty />
              )}
            </Card>

            <Card title="Existing links">
              <p className="mb-1 text-xs font-semibold uppercase text-gray-400">
                <ArrowRight className="mr-1 inline h-3 w-3" /> Outgoing ({data.outgoingLinks.length})
              </p>
              <div className="mb-3 flex flex-wrap gap-1">
                {data.outgoingLinks.length ? (
                  data.outgoingLinks.map((s) => <Badge key={s} tone="blue">{s}</Badge>)
                ) : (
                  <span className="text-xs text-gray-400">None</span>
                )}
              </div>
              <p className="mb-1 text-xs font-semibold uppercase text-gray-400">
                <ArrowLeft className="mr-1 inline h-3 w-3" /> Incoming ({data.incomingLinks.length})
              </p>
              <div className="flex flex-wrap gap-1">
                {data.incomingLinks.length ? (
                  data.incomingLinks.map((l) => <Badge key={l.slug} tone="green">{l.title}</Badge>)
                ) : (
                  <span className="text-xs text-gray-400">None — this may be an orphan page.</span>
                )}
              </div>
            </Card>

            <Card title="Related guides">
              {data.relatedGuides.length ? (
                <ul className="space-y-1 text-sm">
                  {data.relatedGuides.map((l) => (
                    <li key={l.slug} className="truncate">
                      <a href={`/article/${l.slug}`} target="_blank" rel="noreferrer" className="text-primary-700 hover:underline dark:text-primary-400">{l.title}</a>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty />
              )}
            </Card>

            <Card title="Related news">
              {data.relatedNews.length ? (
                <ul className="space-y-1 text-sm">
                  {data.relatedNews.map((l) => (
                    <li key={l.slug} className="truncate">
                      <a href={`/article/${l.slug}`} target="_blank" rel="noreferrer" className="text-primary-700 hover:underline dark:text-primary-400">{l.title}</a>
                    </li>
                  ))}
                </ul>
              ) : (
                <Empty />
              )}
            </Card>
          </div>
        </div>
      )}

      {!data && !loading && (
        <p className="text-sm text-gray-400">
          <Sparkles className="mr-1 inline h-4 w-4" />
          Enter an article to see suggested, incoming and outgoing internal links.
        </p>
      )}
    </div>
  );
}
