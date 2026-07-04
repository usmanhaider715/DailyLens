'use client';

import { useCallback, useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';
import { api } from '@/services/api';
import { inferUkRegionIdFromCityComposite } from '@/utils/weatherRegionUtils';

export function WeatherLocator({ compact = false }) {
  const [data, setData] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [region, setRegion] = useState('');
  const [cityId, setCityId] = useState('');
  const [loading, setLoading] = useState(true);
  const [geoDenied, setGeoDenied] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState(false);

  const load = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const { data: w } = await api.get('/site/weather', { params });
      setData(w);
      if (w.catalog) setCatalog(w.catalog);

      const loc = w.location;
      if (loc?.country === 'us') {
        setCountry('us');
        setState(loc.id || '');
        setRegion('');
        setCityId('');
      } else if (loc?.country === 'uk') {
        setCountry('uk');
        const rid = inferUkRegionIdFromCityComposite(w.catalog, loc.id);
        setRegion(rid);
        setCityId(loc.id || '');
      } else if (w.catalog && !loc) {
        setCountry('');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data: hp } = await api.get('/site/homepage');
        if (cancelled || hp.heroMode !== 'weather') return;

        const p = hp.weatherPrefs || {};
        const useGeo = p.useVisitorLocation !== false;
        setPinnedLocation(!useGeo);

        const fallback =
          p.country === 'uk' && p.cityId
            ? { country: 'uk', cityId: p.cityId }
            : { country: 'us', state: p.state || 'NY' };

        if (!useGeo) {
          setGeoDenied(false);
          await load(fallback);
          return;
        }

        if (!navigator.geolocation) {
          setGeoDenied(true);
          await load(fallback);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            if (cancelled) return;
            setGeoDenied(false);
            await load({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          },
          async () => {
            if (cancelled) return;
            setGeoDenied(true);
            await load(fallback);
          },
          { timeout: 8000, maximumAge: 300000 },
        );
      } catch {
        if (!cancelled) await load({ country: 'us', state: 'NY' });
      }
    }

    init();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const us = catalog?.countries?.find((c) => c.id === 'us');
  const uk = catalog?.countries?.find((c) => c.id === 'uk');
  const ukRegion = uk?.regions?.find((r) => r.id === region);

  const onCountry = (c) => {
    setCountry(c);
    setState('');
    setRegion('');
    setCityId('');
  };

  const onUsState = (code) => {
    setState(code);
    if (code) load({ country: 'us', state: code });
  };

  const onUkCity = (rId, compositeCityId) => {
    setRegion(rId);
    setCityId(compositeCityId);
    if (compositeCityId) load({ country: 'uk', cityId: compositeCityId });
  };

  const f = data?.forecast;
  if (loading && !f) {
    return <div className="animate-pulse rounded-xl bg-gray-100 p-8 dark:bg-gray-800">Loading weather…</div>;
  }

  return (
    <section className={`rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-5 dark:border-sky-900 dark:from-sky-950/40 dark:to-gray-900 ${compact ? '' : 'shadow-sm'}`}>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <MapPin className="h-4 w-4 text-sky-600" />
        <span className="font-semibold text-gray-900 dark:text-white">
          {f?.name || 'Your location'}
        </span>
        {pinnedLocation && (
          <span className="text-xs text-sky-700 dark:text-sky-300">(default region — change below)</span>
        )}
        {!pinnedLocation && geoDenied && (
          <span className="text-xs text-gray-500">(location unavailable — pick a region below)</span>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        <select
          value={country}
          onChange={(e) => onCountry(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          aria-label="Country"
        >
          <option value="">Country</option>
          <option value="us">United States</option>
          <option value="uk">United Kingdom</option>
        </select>

        {country === 'us' && (
          <select
            value={state}
            onChange={(e) => onUsState(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 sm:col-span-2"
            aria-label="US state"
          >
            <option value="">Select state</option>
            {us?.states?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        )}

        {country === 'uk' && (
          <>
            <select
              value={region}
              onChange={(e) => {
                const rId = e.target.value;
                setRegion(rId);
                setCityId('');
              }}
              className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              aria-label="UK region"
            >
              <option value="">Region</option>
              {uk?.regions?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              value={cityId}
              onChange={(e) => onUkCity(region, e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              aria-label="UK city"
              disabled={!region}
            >
              <option value="">City</option>
              {ukRegion?.cities?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {f?.current && (
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="text-4xl font-bold text-gray-900 dark:text-white">{f.current.temp}°</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p>{f.current.condition}</p>
            <p>
              Feels like {f.current.feelsLike}° · Wind {f.current.windKph} km/h
            </p>
          </div>
        </div>
      )}

      {f?.daily?.length > 0 && (
        <div className="mt-4 grid grid-cols-5 gap-2 text-center text-xs">
          {f.daily.slice(0, 5).map((d) => (
            <div key={d.date} className="rounded-lg bg-white/80 p-2 dark:bg-gray-800/80">
              <p className="font-medium text-gray-500">
                {new Date(d.date).toLocaleDateString(undefined, { weekday: 'short' })}
              </p>
              <p className="mt-1 font-bold text-gray-900 dark:text-white">
                {d.high}° / {d.low}°
              </p>
              <p className="mt-0.5 text-gray-500">{d.condition}</p>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] text-gray-400">
        Forecast via Open-Meteo. Not for safety-critical decisions.
      </p>
    </section>
  );
}
