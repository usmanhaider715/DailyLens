'use client';

import { useEffect, useState } from 'react';
import { CloudRain, MapPin } from 'lucide-react';
import { api } from '@/services/api';
import { useVisitorLocation } from '@/context/VisitorLocationContext';
import { Spinner } from '../common/Spinner.jsx';

async function resolveAnalysisParams(weatherParams) {
  if (weatherParams) return weatherParams;

  if (typeof navigator !== 'undefined' && navigator.geolocation) {
    try {
      const pos = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 6000,
          maximumAge: 300000,
          enableHighAccuracy: false,
        });
      });
      return { lat: pos.coords.latitude, lon: pos.coords.longitude };
    } catch {
      /* fall through */
    }
  }

  return { country: 'us', state: 'NY' };
}

export function WeatherAnalysisPanel() {
  const { weatherParams, ready: locReady, location, openPrompt } = useVisitorLocation();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!locReady) return undefined;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const params = await resolveAnalysisParams(weatherParams);
        const { data } = await api.get('/site/weather/analysis', { params });
        if (!cancelled) setAnalysis(data);
      } catch {
        if (!cancelled) setAnalysis({ error: 'Could not load weather analysis.' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [locReady, weatherParams]);

  return (
    <section className="overflow-hidden rounded-2xl border border-cyan-200/80 bg-gradient-to-br from-cyan-50/80 to-white shadow-sm dark:border-cyan-900/50 dark:from-cyan-950/30 dark:to-gray-900">
      <div className="border-b border-cyan-100 px-4 py-4 sm:px-5 dark:border-cyan-900/50">
        <div className="flex items-center gap-2 text-cyan-800 dark:text-cyan-300">
          <CloudRain className="h-5 w-5 shrink-0" />
          <h2 className="font-display text-lg font-bold text-gray-900 sm:text-xl dark:text-white">Weather analysis</h2>
        </div>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Today and a 5-day outlook for your area — rain chances and conditions in plain English.
        </p>
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        {loading && (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        )}

        {!loading && analysis && !analysis.error && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 shrink-0 text-cyan-700 dark:text-cyan-400" />
              <span className="font-semibold text-gray-900 dark:text-white">
                {analysis.locationName || location?.name || 'Your location'}
              </span>
              <button
                type="button"
                onClick={openPrompt}
                className="text-xs font-medium text-cyan-700 underline dark:text-cyan-400"
              >
                Change location
              </button>
            </div>

            <div className="flex flex-wrap items-end gap-4">
              <div className="text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white">
                {analysis.today?.tempNow}°
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p>{analysis.today?.condition}</p>
                <p>
                  Feels like {analysis.today?.feelsLike}° · Wind {analysis.today?.windKph ?? '—'} km/h
                </p>
              </div>
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
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">High / Low</td>
                    <td className="px-4 py-2.5 font-medium">
                      {analysis.today?.high}°C / {analysis.today?.low}°C
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2.5 text-gray-600 dark:text-gray-400">Rain chance</td>
                    <td className="px-4 py-2.5 font-medium">{analysis.today?.rainChance ?? '—'}%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {analysis.bullets?.length > 0 && (
              <ul className="space-y-2 rounded-xl border border-cyan-100 bg-white/70 px-4 py-3 dark:border-cyan-900/40 dark:bg-gray-900/40">
                {analysis.bullets.map((item, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-600 dark:bg-cyan-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}

            {analysis.fiveDay?.length > 0 && (
              <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-3 md:grid-cols-5">
                {analysis.fiveDay.map((d) => (
                  <div key={d.date} className="rounded-lg bg-white/80 p-2 dark:bg-gray-800/80">
                    <p className="font-medium text-gray-500">{d.label}</p>
                    <p className="mt-1 font-bold text-gray-900 dark:text-white">
                      {d.high}° / {d.low}°
                    </p>
                    <p className="mt-0.5 text-gray-500">{d.condition}</p>
                    {d.rainChance != null && (
                      <p className="mt-0.5 text-cyan-700 dark:text-cyan-400">{d.rainChance}% rain</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && analysis?.error && (
          <p className="text-sm text-red-600 dark:text-red-400">{analysis.error}</p>
        )}
      </div>
    </section>
  );
}
