'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';

const RANGES = [
  { id: '1d', label: '1D' },
  { id: '1m', label: '1M' },
  { id: '6m', label: '6M' },
  { id: '1y', label: '1Y' },
];

function formatUsd(n, { compact = false } = {}) {
  if (n == null || Number.isNaN(n)) return '—';
  if (compact) {
    if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(2)}B`;
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  }
  if (n >= 1) {
    return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `$${n.toFixed(4)}`;
}

function formatDateTime(ts, rangeId) {
  const d = new Date(ts);
  if (rangeId === '1d') {
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function calcChange(current, previous) {
  if (previous == null || previous === 0 || current == null) {
    return { amount: 0, percent: 0, up: true, previous: previous ?? 0 };
  }
  const amount = current - previous;
  const percent = (amount / previous) * 100;
  return { amount, percent, up: amount >= 0, previous };
}

function ChangeBadge({ amount, percent, size = 'sm', showPrevious, previousPrice }) {
  const up = amount >= 0;
  const sign = up ? '+' : '−';
  const absAmount = Math.abs(amount);
  const absPercent = Math.abs(percent);
  const sizeClass =
    size === 'lg'
      ? 'gap-1.5 rounded-lg px-3 py-1.5 text-sm'
      : 'gap-1 rounded-md px-2 py-0.5 text-xs';

  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={`inline-flex w-fit items-center font-semibold tabular-nums ${sizeClass} ${
          up
            ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
            : 'bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-300'
        }`}
      >
        {up ? <TrendingUp className="h-3.5 w-3.5 shrink-0" /> : <TrendingDown className="h-3.5 w-3.5 shrink-0" />}
        <span>
          {sign}
          {formatUsd(absAmount)} ({sign}
          {absPercent.toFixed(2)}%)
        </span>
      </span>
      {showPrevious && previousPrice != null && (
        <span className="text-[11px] text-gray-500 dark:text-gray-400">
          vs previous {formatUsd(previousPrice)}
        </span>
      )}
    </div>
  );
}

function buildChartGeometry(prices, width, height, padY = 8) {
  if (!prices?.length) {
    return { line: '', area: '', points: [], min: 0, max: 0 };
  }
  const vals = prices.map((p) => p.price);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  const step = width / Math.max(prices.length - 1, 1);

  const points = prices.map((p, i) => {
    const x = i * step;
    const y = height - padY - ((p.price - min) / span) * (height - padY * 2);
    return { x, y, price: p.price, t: p.t, label: p.label, index: i };
  });

  const line = points.map((pt, i) => `${i === 0 ? 'M' : 'L'}${pt.x.toFixed(2)},${pt.y.toFixed(2)}`).join(' ');
  const area = `${line} L${width},${height} L0,${height} Z`;
  return { line, area, points, min, max };
}

export function CryptoMarketChart({
  defaultCoinId = 'bitcoin',
  compact = false,
  className = '',
}) {
  const [coins, setCoins] = useState([]);
  const [coinId, setCoinId] = useState(defaultCoinId);
  const [range, setRange] = useState('1m');
  const [chart, setChart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [hoverIndex, setHoverIndex] = useState(null);
  const chartWrapRef = useRef(null);

  const loadCoins = useCallback(async () => {
    const { data } = await api.get('/site/crypto/coins');
    setCoins(data.coins || []);
  }, []);

  const loadChart = useCallback(async (id, r, showSpinner = true) => {
    if (showSpinner) setLoadingChart(true);
    try {
      const { data } = await api.get('/site/crypto/chart', { params: { coin: id, range: r } });
      setChart(data);
      setHoverIndex(null);
    } catch {
      setChart(null);
      setHoverIndex(null);
    } finally {
      setLoadingChart(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCoins().then(() => loadChart(defaultCoinId, '1m', true));
  }, [defaultCoinId, loadCoins, loadChart]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!document.hidden) loadChart(coinId, range, false);
    }, 60000);
    return () => clearInterval(id);
  }, [coinId, range, loadChart]);

  const onCoinChange = (id) => {
    setCoinId(id);
    loadChart(id, range);
  };

  const onRangeChange = (r) => {
    setRange(r);
    loadChart(coinId, r);
  };

  const width = compact ? 560 : 720;
  const height = compact ? 140 : 180;
  const geometry = useMemo(
    () => buildChartGeometry(chart?.prices, width, height),
    [chart?.prices, width, height]
  );

  const periodChange = useMemo(() => {
    if (!chart?.stats) return null;
    return calcChange(chart.stats.price, chart.stats.first);
  }, [chart?.stats]);

  const activeIndex = hoverIndex ?? (geometry.points.length ? geometry.points.length - 1 : null);
  const activePoint =
    activeIndex != null && geometry.points[activeIndex] ? geometry.points[activeIndex] : null;
  const prevPoint =
    activeIndex != null && activeIndex > 0 ? geometry.points[activeIndex - 1] : null;
  const pointChange = useMemo(() => {
    if (!activePoint) return null;
    if (!prevPoint) {
      return calcChange(activePoint.price, chart?.stats?.first);
    }
    return calcChange(activePoint.price, prevPoint.price);
  }, [activePoint, prevPoint, chart?.stats?.first]);

  const up = (chart?.stats?.changePercent ?? 0) >= 0;
  const stroke = up ? '#10b981' : '#ef4444';
  const handlePointer = (clientX) => {
    const el = chartWrapRef.current;
    if (!el || !geometry.points.length) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const idx = Math.round(ratio * (geometry.points.length - 1));
    setHoverIndex(idx);
  };

  const clearHover = () => setHoverIndex(null);

  const tooltipLeftPct =
    activePoint && geometry.points.length > 1
      ? (activePoint.x / width) * 100
      : 100;

  if (loading && !chart) {
    return (
      <div
        className={`flex min-h-[200px] items-center justify-center rounded-xl border border-gray-100/80 bg-white dark:border-gray-800 dark:bg-gray-900 ${className}`}
      >
        <Spinner />
      </div>
    );
  }

  const displayPrice = activePoint?.price ?? chart?.stats?.price;
  const isHovering = hoverIndex != null;

  return (
    <section
      className={`overflow-hidden rounded-xl border border-gray-100/80 bg-white dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      <div className="border-b border-gray-100/80 px-3 py-3 dark:border-gray-800 sm:px-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Crypto
            </p>
            {chart?.stats && (
              <div className="mt-1 space-y-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-xl font-semibold tabular-nums text-gray-900 dark:text-white">
                    {formatUsd(displayPrice)}
                  </span>
                  {isHovering && activePoint && (
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      {formatDateTime(activePoint.t, range)}
                    </span>
                  )}
                </div>
                {periodChange && !isHovering && (
                  <ChangeBadge
                    amount={periodChange.amount}
                    percent={periodChange.percent}
                    size="sm"
                  />
                )}
                {isHovering && pointChange && (
                  <ChangeBadge
                    amount={pointChange.amount}
                    percent={pointChange.percent}
                    size="sm"
                    showPrevious
                    previousPrice={pointChange.previous}
                  />
                )}
                <span className="block text-[11px] text-gray-500">
                  {chart.name} ({chart.symbol}) · {chart.rangeLabel || range.toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <select
            value={coinId}
            onChange={(e) => onCoinChange(e.target.value)}
            className="max-w-[200px] shrink-0 rounded-md border border-gray-200 bg-transparent px-2 py-1.5 text-xs font-medium text-gray-900 dark:border-gray-700 dark:text-gray-100"
            aria-label="Select cryptocurrency"
          >
            {coins.map((c) => (
              <option key={c.id} value={c.id}>
                {c.symbol} — {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2 flex gap-0.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => onRangeChange(r.id)}
              className={`rounded px-2.5 py-0.5 text-[11px] font-semibold transition ${
                range === r.id
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative px-2 pb-1 pt-0 sm:px-3">
        {loadingChart && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-gray-900/60">
            <Spinner />
          </div>
        )}
        {chart?.prices?.length ? (
          <div
            ref={chartWrapRef}
            className="relative touch-none select-none"
            onMouseMove={(e) => handlePointer(e.clientX)}
            onMouseLeave={clearHover}
            onTouchMove={(e) => {
              if (e.touches[0]) handlePointer(e.touches[0].clientX);
            }}
            onTouchEnd={clearHover}
          >
            {isHovering && activePoint && pointChange && (
              <div
                className="pointer-events-none absolute z-30 -translate-x-1/2 rounded-lg border border-gray-200/90 bg-white/95 px-2.5 py-2 shadow-sm backdrop-blur-sm dark:border-gray-700 dark:bg-gray-950/95"
                style={{
                  left: `${Math.min(Math.max(tooltipLeftPct, 8), 92)}%`,
                  top: '8px',
                }}
              >
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {formatDateTime(activePoint.t, range)}
                </p>
                <p className="mt-0.5 text-sm font-semibold tabular-nums text-gray-900 dark:text-white">
                  {formatUsd(activePoint.price)}
                </p>
                <div className="mt-1">
                  <ChangeBadge amount={pointChange.amount} percent={pointChange.percent} size="sm" />
                </div>
              </div>
            )}

            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-auto w-full cursor-crosshair"
              preserveAspectRatio="none"
              role="img"
              aria-label={`${chart.name} price chart`}
            >
              <path
                d={geometry.line}
                fill="none"
                stroke={stroke}
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
              {isHovering && activePoint && (
                <>
                  <line
                    x1={activePoint.x}
                    y1={0}
                    x2={activePoint.x}
                    y2={height}
                    stroke="#9ca3af"
                    strokeWidth="0.5"
                    strokeDasharray="3 3"
                    opacity="0.6"
                  />
                  <circle
                    cx={activePoint.x}
                    cy={activePoint.y}
                    r="3"
                    fill={stroke}
                    stroke="white"
                    strokeWidth="1"
                  />
                </>
              )}
            </svg>
          </div>
        ) : (
          <p className="py-16 text-center text-sm text-gray-500">Chart data unavailable.</p>
        )}
        {chart?.stats && (
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 px-1 pb-2 text-[10px] text-gray-400">
            <span>L {formatUsd(chart.stats.low, { compact: true })}</span>
            <span>H {formatUsd(chart.stats.high, { compact: true })}</span>
          </div>
        )}
      </div>
    </section>
  );
}
