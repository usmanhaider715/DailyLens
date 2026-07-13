'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { api } from '@/services/api';
import {
  useApi,
  Card,
  Stat,
  Badge,
  HealthDot,
  Loading,
  ErrorNote,
  Empty,
  ExportButton,
  healthColor,
} from '../primitives.jsx';

export function RefreshTab() {
  const { data, loading, error } = useApi('/admin/seo/refresh', { params: { limit: 150 } });
  const [busy, setBusy] = useState(null);

  if (loading) return <Loading />;
  if (error) return <ErrorNote>{error}</ErrorNote>;
  if (!data) return <Empty />;

  const generateRefresh = async (item) => {
    setBusy(item.slug);
    try {
      await api.post('/admin/seo/manual-generate', {
        keyword: item.title,
        category: item.category,
        cluster: item.category,
      });
      toast.success(`Refresh draft started for "${item.title}". Review it under Content ideas → drafts.`);
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Could not start refresh');
    } finally {
      setBusy(null);
    }
  };

  const csvRows = data.items.map((i) => ({
    title: i.title,
    category: i.category,
    health: i.health,
    ageDays: i.ageDays,
    views: i.views,
    olderThan6Months: i.flags.olderThan6Months,
    missingFaq: i.flags.missingFaq,
    lowTraffic: i.flags.lowTraffic,
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Stat icon={RefreshCw} label="Guides needing refresh" value={data.total} tone="text-amber-600 dark:text-amber-400" />
        <Stat label="Auto-refresh" value="Via scheduler" hint="The evergreen scheduler regenerates on your daily run time." />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">
          Older than 6 months, declining traffic, or missing FAQ/schema — worst first.
        </p>
        <ExportButton rows={csvRows} filename="refresh-center.csv" />
      </div>

      {data.items.length === 0 ? (
        <Empty>All guides look fresh.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-3">Article</th>
                <th className="px-4 py-3">Health</th>
                <th className="px-4 py-3">Age</th>
                <th className="px-4 py-3">Views</th>
                <th className="px-4 py-3">Flags</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.items.map((it) => (
                <tr key={it.slug} className="align-top">
                  <td className="px-4 py-3">
                    <a href={`/article/${it.slug}`} target="_blank" rel="noreferrer" className="font-medium text-primary-700 hover:underline dark:text-primary-400">
                      {it.title}
                    </a>
                    <div className="text-xs text-gray-400">{it.category}</div>
                  </td>
                  <td className={`px-4 py-3 font-bold ${healthColor(it.health)}`}>
                    <HealthDot value={it.health} /> {it.health}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{it.ageDays}d</td>
                  <td className="px-4 py-3 text-gray-500">{it.views}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {it.flags.olderThan6Months && <Badge tone="amber">6mo+</Badge>}
                      {it.flags.missingFaq && <Badge tone="blue">No FAQ</Badge>}
                      {it.flags.lowTraffic && <Badge tone="red">Low traffic</Badge>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => generateRefresh(it)}
                      disabled={busy === it.slug}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      {busy === it.slug ? 'Starting…' : 'Generate refresh'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
