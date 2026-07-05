'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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

  const selectedCountry = useMemo(
    () => catalog?.countries?.find((c) => c.id === country),
    [catalog, country],
  );
  const ukRegionSel = selectedCountry?.type === 'regions'
    ? selectedCountry.regions?.find((r) => r.id === ukRegion)
    : null;

  const runAnalysis = useCallback(async () => {
    setLoading(true);
    setAnalysis(null);
    try {
      const params =
        country === 'us'
          ? { country: 'us', state }
          : { country, cityId };
      const { data } = await api.get('/site/weather/analysis', { params });
      setAnalysis(data);
    } catch {
      setAnalysis({ error: 'Could not load weather analysis.' });
    } finally {
      setLoading(false);
    }
  }, [country, state, cityId]);

  const seoSlug = country === 'us' ? state.toLowerCase() : cityId;
  const seoHref = `/weather/${country}/${seoSlug}`;

  const onCountryChange = (next) => {
    setCountry(next);
    const entry = catalog?.countries?.find((c) => c.id === next);
    if (next === 'us') {
      setState('NY');
    } else if (entry?.type === 'regions') {
      const firstRegion = entry.regions?.[0];
      setUkRegion(firstRegion?.id || '');
      setCityId(firstRegion?.cities?.[0]?.id || '');
    } else if (entry?.type === 'cities') {
      setCityId(entry.cities?.[0]?.id || '');
    }
  };

  if (loadingCatalog) {
    return (
      <div className="flex justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50/80 to-white shadow-sm dark:border-cyan-900/50 dark:from-cyan-950/30 dark:to-gray-900">
      <div className="border-b border-cyan-100 px-4 py-4 sm:px-5 dark:border-cyan-900/50">
        <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300">
          <CloudRain className="h-5 w-5 shrink-0" />
          <h2 className="font-display text-lg font-bold text-gray-900 sm:text-xl dark:text-white">Weather analysis</h2>
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          US states, UK cities, and major Asian cities — today plus a 5-day outlook with rain chances.
        </p>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <select
            value={country}
            onChange={(e) => onCountryChange(e.target.value)}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm sm:w-auto dark:border-gray-700 dark:bg-gray-800"
          >
            {catalog?.countries?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>

          {selectedCountry?.type === 'states' && (
            <select
              value={state}
              onChange={(e) => setState(e.target.value)}
              className="w-full min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              {selectedCountry.states?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label || s.name}
                </option>
              ))}
            </select>
          )}

          {selectedCountry?.type === 'regions' && (
            <>
              <select
                value={ukRegion}
                onChange={(e) => {
                  setUkRegion(e.target.value);
                  const first = selectedCountry.regions?.find((r) => r.id === e.target.value)?.cities?.[0];
                  if (first) setCityId(first.id);
                }}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm sm:w-auto dark:border-gray-700 dark:bg-gray-800"
              >
                {selectedCountry.regions?.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {ukRegionSel?.cities?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {selectedCountry?.type === 'cities' && (
            <select
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
              className="w-full min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              {selectedCountry.cities?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={runAnalysis}
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-700 px-5 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50 sm:w-auto"
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
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead className="bg-gray-100 text-xs uppercase tracking-wide text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-2.5">Today</th>
                    <th className="px-4 py-2.5">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">Condition</td>
                    <td className="px-4 py-2.5 font-medium">{analysis.today?.condition}</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">Temperature</td>
                    <td className="px-4 py-2.5 font-medium">{analysis.today?.tempNow}°C</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">Rain chance</td>
                    <td className="px-4 py-2.5 font-medium">{analysis.today?.rainChance ?? '—'}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {analysis.narrative && (
              <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">{analysis.narrative}</p>
            )}
          </div>
        )}

        {analysis?.error && (
          <p className="text-sm text-red-600 dark:text-red-400">{analysis.error}</p>
        )}
      </div>
    </section>
  );
}
