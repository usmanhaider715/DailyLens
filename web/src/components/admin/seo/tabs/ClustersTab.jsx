'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { ChevronDown, ChevronRight, Sparkles, Link2, Gauge } from 'lucide-react';
import { api } from '@/services/api';
import {
  useApi,
  Card,
  Stat,
  Badge,
  ProgressBar,
  Loading,
  ErrorNote,
  Empty,
  ExportButton,
} from '../primitives.jsx';

const MISSING_LABELS = {
  supportingArticles: 'Supporting',
  comparisons: 'Comparison',
  faqs: 'FAQ',
  reviews: 'Review',
  buyingGuides: 'Buying guide',
  howTo: 'How-to',
  ultimateGuides: 'Ultimate guide',
};

const PRIORITY_TONE = { critical: 'red', high: 'amber', medium: 'blue', low: 'gray' };

export function ClustersTab() {
  const { data, loading, error, refetch } = useApi('/admin/seo/clusters');
  const [expanded, setExpanded] = useState(null);
  const [detail, setDetail] = useState({});
  const [busy, setBusy] = useState(null);

  if (loading) return <Loading />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data?.clusters?.length) return <Empty>No clusters found.</Empty>;

  const toggle = async (slug) => {
    if (expanded === slug) return setExpanded(null);
    setExpanded(slug);
    if (!detail[slug]) {
      try {
        const { data: d } = await api.get(`/admin/seo/clusters/${slug}`);
        setDetail((prev) => ({ ...prev, [slug]: d }));
      } catch {
        toast.error('Could not load cluster');
      }
    }
  };

  const generateMissing = async (cluster) => {
    const missingType = Object.entries(cluster.missing).find(([, v]) => v)?.[0];
    const label = MISSING_LABELS[missingType] || 'guide';
    setBusy(cluster.slug);
    try {
      const { data: res } = await api.post('/admin/seo/manual-generate', {
        keyword: `${cluster.title} ${label.toLowerCase()}`,
        cluster: cluster.title,
        category: cluster.primaryCategory,
      });
      toast.success(`Started generating a ${label} for "${cluster.title}". Review it under Content ideas → drafts.`);
      if (res?.jobId) toast('Draft job running…', { icon: '⚙️' });
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not start generation');
    } finally {
      setBusy(null);
    }
  };

  const csvRows = data.clusters.map((c) => ({
    cluster: c.title,
    category: c.primaryCategory,
    articles: c.articleCount,
    completion: c.completion,
    authority: c.authorityScore,
    seo: c.seoScore,
    internalLinks: c.internalLinkScore,
    priority: c.priority,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Clusters" value={data.total} />
        <Stat label="Completed" value={data.completedClusters} tone="text-green-600 dark:text-green-400" />
        <Stat label="Incomplete" value={data.incompleteClusters} tone="text-amber-600 dark:text-amber-400" />
      </div>

      <div className="flex justify-end">
        <ExportButton rows={csvRows} filename="seo-clusters.csv" />
      </div>

      <div className="space-y-3">
        {data.clusters.map((c) => {
          const missing = Object.entries(c.missing).filter(([, v]) => v);
          const isOpen = expanded === c.slug;
          return (
            <Card key={c.slug} className="!p-0">
              <div className="p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggle(c.slug)}
                    className="flex items-center gap-2 text-left"
                  >
                    {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    <span className="font-display text-sm font-bold text-gray-900 dark:text-white">
                      {c.title}
                    </span>
                    <Badge tone="gray">{c.primaryCategory}</Badge>
                    <Badge tone={PRIORITY_TONE[c.priority]}>{c.priority}</Badge>
                  </button>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <Gauge className="h-3 w-3" /> Authority {c.authorityScore}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Link2 className="h-3 w-3" /> Links {c.internalLinkScore}
                    </span>
                    <span>{c.articleCount} articles</span>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1">
                    <ProgressBar value={c.completion} />
                  </div>
                  <span className="w-10 text-right text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {c.completion}%
                  </span>
                </div>

                {missing.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-gray-400">Missing:</span>
                    {missing.map(([k]) => (
                      <Badge key={k} tone="amber">
                        {MISSING_LABELS[k]}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => toggle(c.slug)}
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    {isOpen ? 'Collapse' : 'Expand cluster'}
                  </button>
                  {missing.length > 0 && (
                    <button
                      type="button"
                      onClick={() => generateMissing(c)}
                      disabled={busy === c.slug}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      {busy === c.slug ? 'Starting…' : 'Generate missing article'}
                    </button>
                  )}
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/30">
                  {!detail[c.slug] ? (
                    <p className="text-xs text-gray-400">Loading members…</p>
                  ) : detail[c.slug].members.length === 0 ? (
                    <Empty>No articles in this cluster yet.</Empty>
                  ) : (
                    <ul className="space-y-1.5">
                      {detail[c.slug].members.map((m) => (
                        <li key={m.slug} className="flex items-center justify-between gap-3 text-xs">
                          <a
                            href={`/article/${m.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="truncate text-primary-700 hover:underline dark:text-primary-400"
                          >
                            {m.title}
                          </a>
                          <span className="flex shrink-0 gap-1">
                            {m.types.map((t) => (
                              <Badge key={t} tone="blue">
                                {t}
                              </Badge>
                            ))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
