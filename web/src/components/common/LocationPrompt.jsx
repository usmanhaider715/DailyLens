'use client';

import { useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import { useVisitorLocation } from '@/context/VisitorLocationContext';
import { api } from '@/services/api';
import { useWeatherCountryDetail } from '@/hooks/useWeatherCountryDetail';

export function LocationPrompt() {
  const { showPrompt, requesting, requestGeolocation, setManualRegion, dismissPrompt } = useVisitorLocation();
  const [catalog, setCatalog] = useState(null);
  const [country, setCountry] = useState('us');
  const [state, setState] = useState('NY');
  const [ukRegion, setUkRegion] = useState('england');
  const [cityId, setCityId] = useState('');
  const [step, setStep] = useState('choose');
  const { detail: countryDetail, loading: loadingDetail } = useWeatherCountryDetail(
    step === 'manual' ? country : null,
  );

  useEffect(() => {
    if (!showPrompt) return;
    api.get('/site/weather/regions').then(({ data }) => setCatalog(data)).catch(() => {});
  }, [showPrompt]);

  useEffect(() => {
    if (!countryDetail) return;
    if (countryDetail.type === 'states' && countryDetail.states?.[0]) {
      setState(countryDetail.states[0].id);
    } else if (countryDetail.type === 'regions') {
      const firstRegion = countryDetail.regions?.[0];
      setUkRegion(firstRegion?.id || '');
      setCityId(firstRegion?.cities?.[0]?.id || '');
    } else if (countryDetail.type === 'cities') {
      setCityId(countryDetail.cities?.[0]?.id || '');
    }
  }, [countryDetail]);

  if (!showPrompt) return null;

  const ukRegionSel = countryDetail?.type === 'regions'
    ? countryDetail.regions?.find((r) => r.id === ukRegion)
    : null;

  const saveManual = () => {
    if (country === 'us') {
      const st = countryDetail?.states?.find((s) => s.id === state);
      setManualRegion({ country, state, name: st?.label || state });
      return;
    }
    if (country === 'uk') {
      const city = ukRegionSel?.cities?.find((c) => c.id === cityId);
      setManualRegion({ country, cityId, name: city?.name || country });
      return;
    }
    const city = countryDetail?.cities?.find((c) => c.id === cityId);
    setManualRegion({ country, cityId, name: city?.name || country });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-4 sm:items-center">
      <div
        role="dialog"
        aria-labelledby="location-prompt-title"
        className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-700 dark:bg-gray-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2 text-primary-700 dark:text-primary-400">
            <MapPin className="h-5 w-5" />
            <h2 id="location-prompt-title" className="font-display text-lg font-bold text-gray-900 dark:text-white">
              Personalize your experience
            </h2>
          </div>
          <button type="button" onClick={dismissPrompt} className="rounded-lg p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Share your location for local weather, match kick-off times in your timezone, and smarter sports updates.
        </p>

        {step === 'choose' ? (
          <div className="mt-5 flex flex-col gap-2">
            <button
              type="button"
              disabled={requesting}
              onClick={async () => {
                const ok = await requestGeolocation();
                if (!ok) setStep('manual');
              }}
              className="rounded-xl bg-primary-700 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-60"
            >
              {requesting ? 'Detecting location…' : 'Use my location'}
            </button>
            <button
              type="button"
              onClick={() => setStep('manual')}
              className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800"
            >
              Choose region manually
            </button>
            <button type="button" onClick={dismissPrompt} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
              Not now
            </button>
          </div>
        ) : (
          <div className="mt-5 space-y-3">
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              {catalog?.countries?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              )) || <option value="us">United States</option>}
            </select>

            {loadingDetail && <p className="text-xs text-gray-500">Loading cities…</p>}

            {!loadingDetail && countryDetail?.type === 'states' && (
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {countryDetail.states?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}

            {!loadingDetail && countryDetail?.type === 'regions' && (
              <>
                <select
                  value={ukRegion}
                  onChange={(e) => {
                    setUkRegion(e.target.value);
                    const first = countryDetail.regions?.find((r) => r.id === e.target.value)?.cities?.[0];
                    if (first) setCityId(first.id);
                  }}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  {countryDetail.regions?.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
                <select
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  {ukRegionSel?.cities?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </>
            )}

            {!loadingDetail && countryDetail?.type === 'cities' && (
              <select
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              >
                {countryDetail.cities?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={saveManual}
              disabled={loadingDetail}
              className="w-full rounded-xl bg-primary-700 px-4 py-3 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-60"
            >
              Save region
            </button>
            <button type="button" onClick={() => setStep('choose')} className="text-sm text-gray-500">
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
