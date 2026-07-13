'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Activity, AlertTriangle, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';

function healthColor(v) {
  if (v >= 75) return 'text-green-600 dark:text-green-400';
  if (v >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function Stat({ icon: Icon, label, value, tone = '' }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-gray-500">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className={`mt-1 font-display text-3xl font-bold ${tone}`}>{value}</div>
    </div>
  );
}

export function ContentHealthPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data: d } = await api.get('/admin/content-health', { params: { limit: 200 } });
        setData(d);
      } catch {
        toast.error('Failed to load content health');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <Spinner />;
  if (!data) return <p className="text-gray-500">No data.</p>;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Content health</h1>
      <p className="mt-1 text-sm text-gray-500">
        Evergreen guides ranked by health (quality + freshness + engagement). Refresh the weakest first.
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat icon={Activity} label="Guides tracked" value={data.total} />
        <Stat
          icon={RefreshCw}
          label="Need refresh"
          value={data.needingRefresh}
          tone={data.needingRefresh > 0 ? 'text-amber-600 dark:text-amber-400' : ''}
        />
        <Stat icon={Activity} label="Avg health" value={data.avgHealth} tone={healthColor(data.avgHealth)} />
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-800">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3">Article</th>
              <th className="px-4 py-3">Health</th>
              <th className="px-4 py-3">Quality</th>
              <th className="px-4 py-3">Freshness</th>
              <th className="px-4 py-3">Engagement</th>
              <th className="px-4 py-3">Reasons</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {data.items.map((a) => (
              <tr key={a._id} className="align-top">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/articles/edit/${a._id}`}
                    className="font-medium text-primary-700 hover:underline dark:text-primary-400"
                  >
                    {a.title}
                  </Link>
                  <div className="mt-0.5 text-xs text-gray-400">{a.category}</div>
                </td>
                <td className={`px-4 py-3 font-bold ${healthColor(a.health)}`}>{a.health}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.quality}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.freshness}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{a.engagement}</td>
                <td className="px-4 py-3">
                  {a.needsRefresh && (
                    <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                      <AlertTriangle className="h-3 w-3" /> Refresh
                    </span>
                  )}
                  <ul className="text-xs text-gray-500">
                    {a.reasons.map((r) => (
                      <li key={r}>· {r}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
