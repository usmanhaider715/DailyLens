'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MapPin } from 'lucide-react';
import { api } from '@/services/api';
import { useVisitorLocation } from '@/context/VisitorLocationContext';
import { inferUkRegionIdFromCityComposite } from '@/utils/weatherRegionUtils';
import { useWeatherCountryDetail } from '@/hooks/useWeatherCountryDetail';
import { HourlyForecast } from '@/components/weather/HourlyForecast';

export function WeatherLocator({ compact = false }) {
  const { weatherParams, setManualRegion, openPrompt, location: savedLoc, ready: locReady } = useVisitorLocation();
  const [data, setData] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [region, setRegion] = useState('');
  const [cityId, setCityId] = useState('');
  const [loading, setLoading] = useState(true);
  const [geoDenied, setGeoDenied] = useState(false);
  const [pinnedLocation, setPinnedLocation] = useState(false);

  const { detail: countryDetail } = useWeatherCountryDetail(country || null);

  const selectedCountry = useMemo(() => {
    const summary = catalog?.countries?.find((c) => c.id === country);
    if (!summary) return null;
    return countryDetail?.id === country ? { ...summary, ...countryDetail } : summary;
  }, [catalog, country, countryDetail]);
  const ukRegionData = selectedCountry?.type === 'regions'
    ? selectedCountry.regions?.find((r) => r.id === region)
    : null;

  const syncFormFromLocation = useCallback((loc, cat) => {
    if (!loc) return;
    if (loc.country === 'us') {
      setCountry('us');
      setState(loc.id || '');
      setRegion('');
      setCityId('');
      return;
    }
    if (loc.country === 'uk') {
      setCountry('uk');
      const rid = inferUkRegionIdFromCityComposite(cat, loc.id);
      setRegion(rid);
      setCityId(loc.id || '');
      return;
    }
    setCountry(loc.country);
    setState('');
    setRegion('');
    setCityId(loc.id || '');
  }, []);

  const load = useCallback(async (params = {}) => {
    setLoading(true);
    try {
      const { data: w } = await api.get('/site/weather', { params });
      setData(w);
      if (w.location) syncFormFromLocation(w.location, catalog);
      else if (!params.lat) setCountry('');
    } finally {
      setLoading(false);
    }
  }, [syncFormFromLocation, catalog]);

  useEffect(() => {
    api.get('/site/weather/regions').then(({ data }) => setCatalog(data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!locReady) return undefined;
    let cancelled = false;

    async function init() {
      try {
        if (weatherParams) {
          setGeoDenied(savedLoc?.source !== 'geo');
          setPinnedLocation(savedLoc?.source === 'manual');
          await load(weatherParams);
          return;
        }

        const { data: hp } = await api.get('/site/homepage');
        if (cancelled || hp.heroMode !== 'weather') return;

        const p = hp.weatherPrefs || {};
        const useGeo = p.useVisitorLocation !== false;
        setPinnedLocation(!useGeo);

        const fallback =
          p.country === 'uk' && p.cityId
            ? { country: 'uk', cityId: p.cityId }
            : p.country && p.cityId
              ? { country: p.country, cityId: p.cityId }
              : p.country && p.country !== 'us' && p.country !== 'uk'
                ? { country: p.country, cityId: p.cityId }
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
  }, [load, locReady, weatherParams, savedLoc?.source]);

  const onCountry = async (c) => {
    setCountry(c);
    setState('');
    setRegion('');
    setCityId('');
    if (!c) return;
    try {
      const { data: detail } = await api.get(`/site/weather/regions/${c}`);
      if (detail.type === 'cities' && detail.cities?.[0]) {
        const first = detail.cities[0].id;
        setCityId(first);
        load({ country: c, cityId: first });
      }
    } catch {
      /* user can pick subcategory once detail loads */
    }
  };

  const onUsState = (code) => {
    setState(code);
    if (code) {
      const st = selectedCountry?.states?.find((s) => s.id === code);
      setManualRegion({ country: 'us', state: code, name: st?.label || code });
      load({ country: 'us', state: code });
    }
  };

  const onUkCity = (rId, compositeCityId) => {
    setRegion(rId);
    setCityId(compositeCityId);
    if (compositeCityId) load({ country: 'uk', cityId: compositeCityId });
  };

  const onWorldCity = (compositeCityId) => {
    setCityId(compositeCityId);
    if (compositeCityId && country) {
      const city = selectedCountry?.cities?.find((c) => c.id === compositeCityId);
      setManualRegion({ country, cityId: compositeCityId, name: city?.name || country });
      load({ country, cityId: compositeCityId });
    }
  };

  const f = data?.forecast;
  if (loading && !f) {
    return <div className="animate-pulse rounded-xl bg-gray-100 p-8 dark:bg-gray-800">Loading weather…</div>;
  }

  return (
    <section
      className={`rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-4 sm:p-5 dark:border-sky-900 dark:from-sky-950/40 dark:to-gray-900 ${compact ? '' : 'shadow-sm'}`}
    >
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <MapPin className="h-4 w-4 shrink-0 text-sky-600" />
        <span className="font-semibold text-gray-900 dark:text-white">{f?.name || savedLoc?.name || 'Your location'}</span>
        <button type="button" onClick={openPrompt} className="text-xs font-medium text-sky-700 underline dark:text-sky-300">
          Change location
        </button>
        {pinnedLocation && (
          <span className="text-xs text-sky-700 dark:text-sky-300">(default region — change below)</span>
        )}
        {!pinnedLocation && geoDenied && (
          <span className="text-xs text-gray-500">(location unavailable — pick a region below)</span>
        )}
        {!pinnedLocation && !geoDenied && f?.name && (
          <span className="text-xs text-emerald-700 dark:text-emerald-400">Near your location</span>
        )}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <select
          value={country}
          onChange={(e) => onCountry(e.target.value)}
          className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
          aria-label="Country"
        >
          <option value="">Country</option>
          {catalog?.countries?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>

        {selectedCountry?.type === 'states' && (
          <select
            value={state}
            onChange={(e) => onUsState(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 sm:col-span-2"
            aria-label="US state"
          >
            <option value="">Select state</option>
            {selectedCountry.states?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        )}

        {selectedCountry?.type === 'regions' && (
          <>
            <select
              value={region}
              onChange={(e) => {
                const rId = e.target.value;
                setRegion(rId);
                setCityId('');
              }}
              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              aria-label="UK region"
            >
              <option value="">Region</option>
              {selectedCountry.regions?.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <select
              value={cityId}
              onChange={(e) => onUkCity(region, e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              aria-label="UK city"
              disabled={!region}
            >
              <option value="">City</option>
              {ukRegionData?.cities?.map((c) => (
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
            onChange={(e) => onWorldCity(e.target.value)}
            className="w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 sm:col-span-2"
            aria-label="City"
          >
            <option value="">Select city</option>
            {selectedCountry.cities?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {f?.current && (
        <div className="mt-4 flex flex-wrap items-end gap-4">
          <div className="text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white">{f.current.temp}°</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p>{f.current.condition}</p>
            <p>
              Feels like {f.current.feelsLike}° · Wind {f.current.windKph} km/h
            </p>
          </div>
        </div>
      )}

      {f?.daily?.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-3 md:grid-cols-5">
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

      {f?.hourlyByDay?.length > 0 && (
        <HourlyForecast hourlyByDay={f.hourlyByDay} compact />
      )}

      <p className="mt-3 text-[10px] text-gray-400">
        Forecast via Open-Meteo. Not for safety-critical decisions.
      </p>
    </section>
  );
}
