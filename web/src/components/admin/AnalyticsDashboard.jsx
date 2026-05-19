'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';

export function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: d } = await api.get('/admin/analytics');
        if (!cancelled) setData(d);
      } catch {
        toast.error('Failed to load analytics');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) return <Spinner />;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
          <div className="text-sm text-gray-500">Total views</div>
          <div className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-200">
            {data?.totalViews ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
          <div className="text-sm text-gray-500">Articles today</div>
          <div className="mt-1 text-3xl font-bold text-primary-800 dark:text-primary-200">
            {data?.articlesToday ?? 0}
          </div>
        </div>
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
          <div className="text-sm text-gray-500">Top category slots</div>
          <div className="mt-2 space-y-1 text-sm">
            {(data?.topCategories || []).slice(0, 4).map((c) => (
              <div key={c._id} className="flex justify-between">
                <span>{c._id}</span>
                <span className="font-semibold">{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">Trending (24h)</h2>
        <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
          {(data?.trending || []).map((a) => (
            <li key={a._id} className="flex justify-between py-2 text-sm">
              <span>{a.title}</span>
              <span className="text-gray-500">{a.views} views</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
