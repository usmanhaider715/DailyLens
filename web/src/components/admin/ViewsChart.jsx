'use client';

import { useMemo, useState } from 'react';
import { BarChart3 } from 'lucide-react';

const RANGES = [
  { id: '24h', label: '24 hours' },
  { id: '7d', label: '1 week' },
  { id: '30d', label: '1 month' },
];

function pointTotal(point) {
  if (point.newsViews != null || point.evergreenViews != null) {
    return (point.newsViews || 0) + (point.evergreenViews || 0) || point.views || 0;
  }
  return point.views || 0;
}

function SplitBar({ point, maxViews }) {
  const news = point.newsViews || 0;
  const evergreen = point.evergreenViews || 0;
  const splitTotal = news + evergreen;
  const total = splitTotal > 0 ? splitTotal : point.views || 0;
  const scale = maxViews > 0 ? 100 / maxViews : 0;
  const newsH = Math.max(news > 0 ? 3 : 0, Math.round(news * scale));
  const evergreenH = Math.max(evergreen > 0 ? 3 : 0, Math.round(evergreen * scale));
  const legacyOnly = splitTotal === 0 && (point.views || 0) > 0;
  const legacyH = legacyOnly ? Math.max(4, Math.round((point.views / maxViews) * 100)) : 0;

  const title = [
    `${point.label}${point.dateLabel ? ` (${point.dateLabel})` : ''}`,
    `News: ${news.toLocaleString()}`,
    `Evergreen: ${evergreen.toLocaleString()}`,
    `Total: ${total.toLocaleString()}`,
  ].join('\n');

  return (
    <div
      className="group flex min-w-0 flex-1 flex-col items-center justify-end"
      title={title}
    >
      <div
        className="flex w-full max-w-[32px] flex-col justify-end rounded-t overflow-hidden"
        style={{ height: '12rem' }}
      >
        {legacyOnly ? (
          <div
            className="w-full rounded-t bg-primary-600 transition-all group-hover:bg-primary-500 dark:bg-primary-500"
            style={{ height: `${legacyH}%` }}
          />
        ) : (
          <>
            {evergreen > 0 ? (
              <div
                className="w-full bg-emerald-500 transition-all group-hover:bg-emerald-400"
                style={{ height: `${evergreenH}%` }}
              />
            ) : null}
            {news > 0 ? (
              <div
                className="w-full bg-primary-600 transition-all group-hover:bg-primary-500 dark:bg-primary-500"
                style={{ height: `${newsH}%` }}
              />
            ) : null}
            {total === 0 ? (
              <div className="h-1 w-full rounded-t bg-gray-200 dark:bg-gray-700" />
            ) : null}
          </>
        )}
      </div>
      <span className="mt-2 text-center text-[11px] font-semibold text-gray-700 dark:text-gray-200">
        {point.label}
      </span>
      {point.dateLabel ? (
        <span className="text-[10px] text-gray-400">{point.dateLabel}</span>
      ) : null}
      <span className="mt-0.5 text-[10px] tabular-nums text-gray-500">{total.toLocaleString()}</span>
    </div>
  );
}

function SimpleBar({ point, maxViews }) {
  const height = Math.max(4, Math.round((point.views / maxViews) * 100));
  return (
    <div
      key={point.key}
      className="group flex min-w-0 flex-1 flex-col items-center justify-end"
      title={`${point.label}: ${point.views} views`}
    >
      <div
        className="relative w-full max-w-[28px] rounded-t bg-primary-600 transition-all group-hover:bg-primary-500 dark:bg-primary-500"
        style={{ height: `${height}%`, minHeight: point.views > 0 ? '4px' : 0 }}
      />
      <span className="mt-2 hidden truncate text-[10px] text-gray-400 sm:block sm:max-w-full sm:text-center">
        {point.label}
      </span>
    </div>
  );
}

export function ViewsChart({ chartData }) {
  const [range, setRange] = useState('7d');

  const series = chartData?.[range] || [];
  const showSplit = range === '7d' || range === '30d';
  const maxViews = useMemo(
    () => Math.max(1, ...series.map((p) => (showSplit ? pointTotal(p) : p.views || 0))),
    [series, showSplit],
  );

  const totals = useMemo(() => {
    if (range === '7d' && chartData?.weekTotals) {
      return chartData.weekTotals;
    }
    const news = series.reduce((s, p) => s + (p.newsViews || 0), 0);
    const evergreen = series.reduce((s, p) => s + (p.evergreenViews || 0), 0);
    const all = series.reduce((s, p) => s + (p.views || 0), 0);
    return {
      all: all || news + evergreen,
      news,
      evergreen,
    };
  }, [range, chartData?.weekTotals, series]);

  const periodTotal = showSplit
    ? totals.news + totals.evergreen || totals.all
    : series.reduce((sum, p) => sum + (p.views || 0), 0);

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
        Session-unique page views in {chartData?.timezoneLabel || 'US Eastern (ET)'} ·{' '}
        {periodTotal.toLocaleString()} in this period
        {showSplit ? (
          <span className="ml-1">
            ({totals.news.toLocaleString()} news · {totals.evergreen.toLocaleString()} evergreen)
          </span>
        ) : null}
        <span className="ml-1 text-gray-400">· refresh in same session does not re-count</span>
      </p>

      {showSplit ? (
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-primary-600" />
            News
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-500" />
            Evergreen guides
          </span>
        </div>
      ) : null}

      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950/50">
        {!series.length ? (
          <p className="py-8 text-center text-sm text-gray-500">No view data yet — traffic will appear here.</p>
        ) : showSplit ? (
          <div className="flex items-end gap-1 sm:gap-2">
            {series.map((point) => (
              <SplitBar key={point.key} point={point} maxViews={maxViews} />
            ))}
          </div>
        ) : (
          <>
            <div className="flex h-48 items-end gap-1 sm:gap-1.5">
              {series.map((point) => (
                <SimpleBar key={point.key} point={point} maxViews={maxViews} />
              ))}
            </div>
            <div className="mt-2 flex justify-between text-xs text-gray-400 sm:hidden">
              <span>{series[0]?.label}</span>
              <span>{series[series.length - 1]?.label}</span>
            </div>
          </>
        )}
      </div>

      {range === '7d' && series.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900/50">
            <div className="text-xs text-gray-500">This week · total</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-gray-900 dark:text-white">
              {(totals.all || periodTotal).toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg border border-primary-100 bg-primary-50/50 px-4 py-3 dark:border-primary-900/40 dark:bg-primary-950/20">
            <div className="text-xs text-primary-700 dark:text-primary-300">News articles</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-primary-800 dark:text-primary-200">
              {totals.news.toLocaleString()}
            </div>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 px-4 py-3 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <div className="text-xs text-emerald-700 dark:text-emerald-300">Evergreen guides</div>
            <div className="mt-1 text-2xl font-bold tabular-nums text-emerald-800 dark:text-emerald-200">
              {totals.evergreen.toLocaleString()}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
