'use client';

import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';

const RANGES = [
  { id: '24h', label: '24 hours' },
  { id: '7d', label: '1 week' },
  { id: '30d', label: '1 month' },
];

export function ViewsChart({ chartData }) {
  const [range, setRange] = useState('24h');

  const series = chartData?.[range] || [];
  const maxViews = useMemo(() => Math.max(1, ...series.map((p) => p.views)), [series]);
  const total = useMemo(() => series.reduce((sum, p) => sum + p.views, 0), [series]);

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary-700 dark:text-primary-400" />
          <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">Article views</h2>
        </div>
        <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-950">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                range === r.id
                  ? 'bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-white'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Page views tracked in {chartData?.timezoneLabel || 'US Eastern (ET)'} · {total.toLocaleString()} in this
        period
      </p>

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/50">
        {!series.length ? (
          <p className="py-8 text-center text-sm text-gray-500">No view data yet — traffic will appear here.</p>
        ) : (
          <>
            <div className="flex h-48 items-end gap-1 sm:gap-1.5">
              {series.map((point) => {
                const height = Math.max(4, Math.round((point.views / maxViews) * 100));
                return (
                  <div key={point.key} className="group flex min-w-0 flex-1 flex-col items-center justify-end">
                    <div
                      className="relative w-full max-w-[28px] rounded-t bg-primary-600 transition-all group-hover:bg-primary-500 dark:bg-primary-500"
                      style={{ height: `${height}%` }}
                      title={`${point.label}: ${point.views} views`}
                    />
                    <span className="mt-2 hidden truncate text-[10px] text-gray-400 sm:block sm:max-w-full sm:text-center">
                      {point.label}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-400 sm:hidden">
              <span>{series[0]?.label}</span>
              <span>{series[series.length - 1]?.label}</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
