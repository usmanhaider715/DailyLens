'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { CloudRain, Sparkles } from 'lucide-react';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';

export function WeatherAnalysisPanel() {
  const [catalog, setCatalog] = useState(null);
  const [country, setCountry] = useState('us');
  const [state, setState] = useState('NY');
  const [ukRegion, setUkRegion] = useState('england');
  const [cityId, setCityId] = useState('england-london');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/site/weather/regions');
        setCatalog(data);
      } finally {
        setLoadingCatalog(false);
      }
    })();
  }, []);

  const us = catalog?.countries?.find((c) => c.id === 'us');
  const uk = catalog?.countries?.find((c) => c.id === 'uk');
  const ukRegionSel = uk?.regions?.find((r) => r.id === ukRegion);

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setAnalysis(null);
    try {
      const params =
        country === 'uk'
          ? { country: 'uk', cityId }
          : { country: 'us', state };
      const { data } = await api.get('/site/weather/analysis', { params });
      setAnalysis(data);
    } catch {
      setAnalysis({ error: 'Could not load weather analysis.' });
    } finally {
      setLoading(false);
    }
  }, [country, state, cityId]);

  const seoSlug = country === 'uk' ? cityId : state.toLowerCase();
  const seoHref = `/weather/${country}/${seoSlug}`;

  if (loadingCatalog) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50/80 to-white shadow-sm dark:border-cyan-900/50 dark:from-cyan-950/30 dark:to-gray-900">
      <div className="border-b border-cyan-100 px-5 py-4 dark:border-cyan-900/50">
        <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300">
          <CloudRain className="h-5 w-5" />
          <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">Weather analysis</h2>
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Select a US state or UK city for a clear today + 5-day outlook with rain chances. Optimized for search
          and easy reading.
        </p>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap gap-3">
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <option value="us">United States</option>
            <option value="uk">United Kingdom</option>
          </select>

          {country === 'us' ? (
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="min-w-[200px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              {us?.states?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label || s.name}
                </option>
              ))}
            </select>
          ) : (
            <>
              <select
                value={ukRegion}
                onChange={(e) => {
                  setUkRegion(e.target.value);
                  const first = uk?.regions?.find((r) => r.id === e.target.value)?.cities?.[0];
                  if (first) setCityId(first.id);
                }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {uk?.regions?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="min-w-[180px] flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {ukRegionSel?.cities?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          )}

          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50"
          >
            {loading ? <Spinner className="h-4 w-4 border-white/30 border-t-white" /> : <Sparkles className="h-4 w-4" />}
            Get weather analysis
          </button>
        </div>

        {analysis && !analysis.error && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{analysis.locationName}</p>
              <Link href={seoHref} className="text-xs font-semibold text-primary-700 hover:underline dark:text-primary-400">
                View SEO page →
              </Link>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full min-w-[320px] text-left text-sm">
                <thead className="bg-gray-100 text-xs uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-2.5">Today</th>
                    <th className="px-4 py-2.5">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {analysis.table?.today?.map((row) => (
                    <tr key={row.label}>
                      <td className="px-4 py-2 font-medium text-gray-700 dark:text-gray-300">{row.label}</td>
                      <td className="px-4 py-2 text-gray-900 dark:text-gray-100">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="bg-gray-100 text-xs uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <tr>
                    <th className="px-3 py-2.5">Day</th>
                    <th className="px-3 py-2.5">Conditions</th>
                    <th className="px-3 py-2.5">High</th>
                    <th className="px-3 py-2.5">Low</th>
                    <th className="px-3 py-2.5">Rain</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {analysis.fiveDay?.map((d) => (
                    <tr key={d.date}>
                      <td className="px-3 py-2 font-medium">{d.label}</td>
                      <td className="px-3 py-2">{d.condition}</td>
                      <td className="px-3 py-2">{d.high}°C</td>
                      <td className="px-3 py-2">{d.low}°C</td>
                      <td className="px-3 py-2">
                        {d.rainChance != null ? `${d.rainChance}% (${d.rainOutlook})` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl bg-white/80 p-4 text-sm leading-relaxed text-gray-700 dark:bg-gray-950/50 dark:text-gray-300">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">Summary</p>
              {analysis.narrative?.split('\n').map((p, i) => (
                <p key={i} className={i > 0 ? 'mt-2' : ''}>
                  {p}
                </p>
              ))}
              <p className="mt-3 text-[11px] text-gray-400">
                Source: {analysis.source} · {analysis.aiEnhanced ? 'AI-enhanced summary' : 'Editorial summary'} · Updated{' '}
                {new Date(analysis.analyzedAt).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {analysis?.error && <p className="text-sm text-red-600">{analysis.error}</p>}
      </div>
    </section>
  );
}
