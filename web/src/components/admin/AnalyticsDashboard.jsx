'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Activity, Globe, Radio, Users, Zap } from 'lucide-react';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';

const LIVE_TRAFFIC_DETAILS = [
  {
    title: 'Real connections (admin)',
    body: 'Each open browser tab with an active Socket.io connection counts as one real visitor. This is the accurate number shown here only.',
  },
  {
    title: 'Public ticker display',
    body: 'Visitors see an engagement count between 500 and 1,000 in the breaking news ticker. It drifts slightly every ~30 seconds and is not the real connection count.',
  },
  {
    title: 'Where visitors see it',
    body: 'The public “X online” badge appears in the breaking news ticker at the top of every page, including mobile.',
  },
  {
    title: 'Also powered by Socket.io',
    body: 'Breaking headline pushes, ticker refreshes every 5 minutes, and live scoreboard updates when football or cricket data changes.',
  },
];

export function AnalyticsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const { data: d } = await api.get('/admin/analytics');
      setData(d);
    } catch {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  if (loading && !data) return <Spinner />;

  const traffic = data?.liveTraffic;
  const liveNow = traffic?.liveNow ?? 0;
  const publicCount = traffic?.publicDisplayCount ?? '—';

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">Dashboard</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Site performance, article stats, and live visitor traffic.
      </p>

      <section className="mt-8">
        <div className="flex flex-wrap items-center gap-2">
          <Radio className="h-5 w-5 text-emerald-600" />
          <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">Live traffic</h2>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
            Real-time
          </span>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white p-5 dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-gray-900">
            <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <Users className="h-4 w-4" />
              Real visitors online
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold tabular-nums text-gray-900 dark:text-white">{liveNow}</span>
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Actual Socket.io connections — admin only.
            </p>
          </div>

          <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-white p-5 dark:border-amber-900/50 dark:from-amber-950/30 dark:to-gray-900">
            <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
              <Globe className="h-4 w-4" />
              Public ticker shows
            </div>
            <div className="mt-2 text-4xl font-bold tabular-nums text-gray-900 dark:text-white">{publicCount}</div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Random {traffic?.publicCountRange ?? '500–1000'} engagement display for visitors.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-800">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Activity className="h-4 w-4" />
              Peak real connections
            </div>
            <div className="mt-2 text-4xl font-bold tabular-nums text-primary-800 dark:text-primary-200">
              {traffic?.peakSinceRestart ?? liveNow}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Resets when the API process restarts.
            </p>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-5 dark:border-gray-800 dark:bg-gray-800">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Zap className="h-4 w-4" />
              Server uptime
            </div>
            <div className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">
              {traffic?.serverStartedAt
                ? new Date(traffic.serverStartedAt).toLocaleString()
                : '—'}
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {traffic?.displayLocation ?? 'Breaking news ticker'} · {traffic?.method ?? 'socket.io'}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-xl border border-gray-100 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-950/50">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Zap className="h-4 w-4 text-amber-500" />
            How live traffic works
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {LIVE_TRAFFIC_DETAILS.map((item) => (
              <div key={item.title}>
                <dt className="text-sm font-semibold text-gray-800 dark:text-gray-200">{item.title}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-gray-400">{item.body}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-500 dark:bg-gray-900 dark:text-gray-400">
            Tip: Open the homepage in a private window — the real connection count above should increase by 1. The
            public ticker will show a separate number between 500 and 1,000.
          </p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">Article analytics</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
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
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 sm:col-span-2 md:col-span-1 dark:border-gray-800 dark:bg-gray-800">
            <div className="text-sm text-gray-500">Top category slots</div>
            <div className="mt-2 space-y-1 text-sm">
              {(data?.topCategories || []).slice(0, 4).map((c) => (
                <div key={c._id} className="flex justify-between gap-2">
                  <span className="truncate">{c._id}</span>
                  <span className="shrink-0 font-semibold">{c.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8">
        <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">Trending (24h)</h2>
        <ul className="mt-3 divide-y divide-gray-100 dark:divide-gray-800">
          {(data?.trending || []).map((a) => (
            <li key={a._id} className="flex flex-col gap-1 py-2 text-sm sm:flex-row sm:justify-between sm:gap-4">
              <span className="min-w-0">{a.title}</span>
              <span className="shrink-0 text-gray-500">{a.views} views</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
