'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';
import { ScoreCard } from '../home/ScoreWidgets.jsx';
import { WeatherForecastPanel } from '../home/WeatherForecastPanel.jsx';
import { inferUkRegionIdFromCityComposite } from '@/utils/weatherRegionUtils';
import { useWeatherCountryDetail } from '@/hooks/useWeatherCountryDetail';

function normalizeLoadedSettings(raw) {
  const s = { ...raw };
  if (!s.homepageWeatherCountry) {
    s.homepageWeatherCountry = s.homepageWeatherRegion === 'uk' ? 'uk' : 'us';
  }
  if (s.homepageWeatherUseVisitorLocation === undefined) {
    s.homepageWeatherUseVisitorLocation = true;
  }
  if (!s.homepageWeatherState) s.homepageWeatherState = 'NY';
  if (s.homepageWeatherCityId === undefined) s.homepageWeatherCityId = '';
  if (s.homepageWeatherCountry === 'uk' && !s.homepageWeatherCityId) {
    s.homepageWeatherCityId = 'england-london';
  }
  if (s.homepageShowCryptoChart === undefined) s.homepageShowCryptoChart = true;
  if (!s.homepageCryptoCoinId) s.homepageCryptoCoinId = 'bitcoin';
  return s;
}

function buildWeatherPreviewParams(settings) {
  if (settings.homepageWeatherUseVisitorLocation !== false) {
    if (settings.homepageWeatherCountry === 'uk' && settings.homepageWeatherCityId) {
      return { country: 'uk', cityId: settings.homepageWeatherCityId };
    }
    return { country: 'us', state: settings.homepageWeatherState || 'NY' };
  }
  if (settings.homepageWeatherCountry === 'uk' && settings.homepageWeatherCityId) {
    return { country: 'uk', cityId: settings.homepageWeatherCityId };
  }
  return { country: 'us', state: settings.homepageWeatherState || 'NY' };
}

export function HomepageSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [matches, setMatches] = useState([]);
  const [matchLeague, setMatchLeague] = useState('cricket');
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [weatherPreview, setWeatherPreview] = useState(null);
  const [locationCatalog, setLocationCatalog] = useState(null);
  const [ukRmaRegion, setUkRmaRegion] = useState('');
  const [cryptoCoins, setCryptoCoins] = useState([]);

  const loadWeatherPreview = useCallback(async (s) => {
    try {
      const params = buildWeatherPreviewParams(s);
      const { data } = await api.get('/site/weather', { params });
      setWeatherPreview(data);
    } catch {
      setWeatherPreview(null);
    }
  }, []);

  const loadLocationCatalog = useCallback(async () => {
    try {
      const { data } = await api.get('/site/weather/regions');
      setLocationCatalog(data);
    } catch {
      setLocationCatalog(null);
    }
  }, []);

  const loadMatches = useCallback(async (league) => {
    setLoadingMatches(true);
    try {
      const { data } = await api.get('/live/scores', { params: { league, refresh: '1' } });
      setMatches(data.games || []);
    } catch {
      setMatches([]);
      toast.error('Could not load matches');
    } finally {
      setLoadingMatches(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadLocationCatalog();
        const { data } = await api.get('/admin/settings');
        if (cancelled) return;
        const normalized = normalizeLoadedSettings(data.settings);
        setSettings(normalized);
        setMatchLeague(data.settings?.homepageLiveMatchLeague || 'cricket');
        await loadMatches('cricket');
        try {
          const { data: cryptoData } = await api.get('/site/crypto/coins');
          if (!cancelled) setCryptoCoins(cryptoData.coins || []);
        } catch {
          /* optional */
        }
      } catch {
        if (!cancelled) toast.error('Failed to load settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time bootstrap
  }, []);

  const heroMode = settings?.homepageHeroMode || 'featured';
  const us = useWeatherCountryDetail(heroMode === 'weather' ? 'us' : null).detail;
  const uk = useWeatherCountryDetail(heroMode === 'weather' ? 'uk' : null).detail;

  useEffect(() => {
    if (!settings || settings.homepageHeroMode !== 'weather') return;
    const cid = settings.homepageWeatherCityId || '';
    if (settings.homepageWeatherCountry !== 'uk') {
      setUkRmaRegion('');
      return;
    }
    setUkRmaRegion(inferUkRegionIdFromCityComposite(locationCatalog, cid));
  }, [
    settings?.homepageHeroMode,
    settings?.homepageWeatherCountry,
    settings?.homepageWeatherCityId,
    locationCatalog,
  ]);

  /** Keep preview synced when editors change preset fields while on weather hero */
  useEffect(() => {
    if (loading || !settings || settings.homepageHeroMode !== 'weather') return;
    loadWeatherPreview(settings);
  }, [
    loading,
    settings?.homepageHeroMode,
    settings?.homepageWeatherUseVisitorLocation,
    settings?.homepageWeatherCountry,
    settings?.homepageWeatherState,
    settings?.homepageWeatherCityId,
    loadWeatherPreview,
    settings,
  ]);

  const groupedMatches = useMemo(() => {
    const map = new Map();
    for (const m of matches) {
      const key = m.competition || m.league || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(m);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [matches]);

  const selectedMatch = matches.find((m) => m.id === settings?.homepageLiveMatchId);

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/admin/settings', { settings });
      toast.success('Homepage settings saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <Spinner />;

  const ukRegionSel = uk?.regions?.find((r) => r.id === ukRmaRegion);
  const visitorMode = settings.homepageWeatherUseVisitorLocation !== false;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Homepage</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Choose what appears in the main hero area. Featured articles always stay in the sidebar and bottom row.
        </p>
      </div>

      <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Hero area</p>
        <div className="flex flex-col gap-3">
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="radio"
              name="heroMode"
              checked={heroMode === 'featured'}
              onChange={() => setSettings({ ...settings, homepageHeroMode: 'featured' })}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900 dark:text-white">Featured article</span>
              <span className="text-xs text-gray-500">Large hero with the latest featured news story</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="radio"
              name="heroMode"
              checked={heroMode === 'live_match'}
              onChange={() => setSettings({ ...settings, homepageHeroMode: 'live_match' })}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900 dark:text-white">Live match scores</span>
              <span className="text-xs text-gray-500">Cricket, NFL, NBA, or MLB — includes ICC & league fixtures</span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="radio"
              name="heroMode"
              checked={heroMode === 'weather'}
              onChange={() => {
                setSettings({ ...settings, homepageHeroMode: 'weather' });
                loadWeatherPreview({ ...settings, homepageHeroMode: 'weather' });
              }}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900 dark:text-white">Weather forecast</span>
              <span className="text-xs text-gray-500">
                Open-Meteo 5-day outlook — visitor location or a fixed US state / UK city
              </span>
            </span>
          </label>
        </div>
      </div>

      {heroMode === 'live_match' && (
        <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
              League
              <select
                className="mt-1 block w-full min-w-[140px] rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                value={matchLeague}
                onChange={(e) => {
                  const league = e.target.value;
                  setMatchLeague(league);
                  setSettings({ ...settings, homepageLiveMatchLeague: league, homepageLiveMatchId: null });
                  loadMatches(league);
                }}
              >
                <option value="cricket">Cricket (ICC + leagues)</option>
                <option value="soccer">Soccer / Football</option>
                <option value="nfl">NFL</option>
                <option value="nba">NBA</option>
                <option value="mlb">MLB</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => loadMatches(matchLeague)}
              disabled={loadingMatches}
              className="rounded-lg border border-primary-200 px-4 py-2 text-sm font-semibold text-primary-800 dark:border-primary-800 dark:text-primary-100"
            >
              {loadingMatches ? 'Loading…' : 'Refresh matches'}
            </button>
          </div>

          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Select match
            <select
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              value={settings.homepageLiveMatchId || ''}
              onChange={(e) => setSettings({ ...settings, homepageLiveMatchId: e.target.value || null })}
            >
              <option value="">— Choose a match —</option>
              {groupedMatches.map(([competition, list]) => (
                <optgroup key={competition} label={competition}>
                  {list.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.away?.name} vs {m.home?.name}
                      {m.isLive ? ' · LIVE' : m.statusText ? ` · ${m.statusText}` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          {selectedMatch && (
            <div className="overflow-hidden rounded-xl border border-primary-700/30 bg-gradient-to-br from-primary-950 via-primary-900 to-gray-950 p-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-white/50">Preview</p>
              <ScoreCard game={selectedMatch} size="hero" />
            </div>
          )}
        </div>
      )}

      {heroMode === 'weather' && (
        <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            On the homepage, visitors can refine location with the dropdowns. Geolocation prompts only appear when enabled below.
          </p>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Forecast source</p>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                name="wxSource"
                checked={visitorMode}
                onChange={() => {
                  const next = {
                    ...settings,
                    homepageWeatherUseVisitorLocation: true,
                  };
                  setSettings(next);
                  loadWeatherPreview(next);
                }}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900 dark:text-white">Visitor’s current location</span>
                <span className="text-xs text-gray-500">
                  Browser geolocation first; if unavailable, uses your fallback fixed location below
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="radio"
                name="wxSource"
                checked={!visitorMode}
                onChange={() => {
                  const next = {
                    ...settings,
                    homepageWeatherUseVisitorLocation: false,
                  };
                  setSettings(next);
                  loadWeatherPreview(next);
                }}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900 dark:text-white">Fixed location</span>
                <span className="text-xs text-gray-500">Same forecast for every visitor — no GPS prompt</span>
              </span>
            </label>
          </div>

          <div className="rounded-lg border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-950/40">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">Fallback / fixed area</p>
            <p className="mt-0.5 text-xs text-gray-500">
              {visitorMode
                ? 'Used when access to location is denied or unavailable.'
                : 'Homepage hero shows this area for everyone.'}
            </p>

            <label className="mt-3 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Country
              <select
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                value={settings.homepageWeatherCountry || 'us'}
                onChange={(e) => {
                  const c = e.target.value;
                  const next = {
                    ...settings,
                    homepageWeatherCountry: c,
                    homepageWeatherState: c === 'us' ? settings.homepageWeatherState || 'NY' : settings.homepageWeatherState,
                    homepageWeatherCityId: c === 'uk' ? settings.homepageWeatherCityId || '' : '',
                  };
                  setSettings(next);
                  setUkRmaRegion(c === 'uk' ? inferUkRegionIdFromCityComposite(locationCatalog, next.homepageWeatherCityId) : '');
                  loadWeatherPreview(next);
                }}
              >
                <option value="us">United States (all 50 states + D.C.)</option>
                <option value="uk">United Kingdom (England, Scotland, Wales, N. Ireland)</option>
              </select>
            </label>

            {settings.homepageWeatherCountry === 'us' && (
              <label className="mt-3 block text-sm font-medium text-gray-700 dark:text-gray-200">
                State / territory (capital coordinates)
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  value={settings.homepageWeatherState || ''}
                  onChange={(e) => {
                    const next = { ...settings, homepageWeatherState: e.target.value };
                    setSettings(next);
                    loadWeatherPreview(next);
                  }}
                >
                  <option value="">Select state</option>
                  {us?.states?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {settings.homepageWeatherCountry === 'uk' && (
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Region
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    value={ukRmaRegion}
                    onChange={(e) => {
                      const rId = e.target.value;
                      setUkRmaRegion(rId);
                      const firstCity = uk?.regions?.find((r) => r.id === rId)?.cities?.[0];
                      const next = {
                        ...settings,
                        homepageWeatherCityId: firstCity?.id || '',
                      };
                      setSettings(next);
                      if (firstCity?.id) loadWeatherPreview(next);
                    }}
                  >
                    <option value="">Select region</option>
                    {uk?.regions?.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  City
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                    value={settings.homepageWeatherCityId || ''}
                    disabled={!ukRmaRegion}
                    onChange={(e) => {
                      const next = { ...settings, homepageWeatherCityId: e.target.value };
                      setSettings(next);
                      if (e.target.value) loadWeatherPreview(next);
                    }}
                  >
                    <option value="">Select city</option>
                    {ukRegionSel?.cities?.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          {weatherPreview?.forecast ? (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Preview {visitorMode ? '(fallback / manual pick — not GPS)' : ''}
              </p>
              <WeatherForecastPanel forecast={weatherPreview} size="hero" />
            </div>
          ) : (
            <p className="text-sm text-gray-500">Pick a complete location for preview.</p>
          )}
        </div>
      )}

      <div className="space-y-4 rounded-xl border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">Crypto price chart</p>
        <p className="text-xs text-gray-500">
          Live chart below the featured hero on the homepage. Always shown on the Crypto category page.
        </p>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={settings.homepageShowCryptoChart !== false}
            onChange={(e) =>
              setSettings({ ...settings, homepageShowCryptoChart: e.target.checked })
            }
          />
          <span className="text-sm text-gray-800 dark:text-gray-200">Show crypto chart on homepage</span>
        </label>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          Default coin on homepage
          <select
            className="mt-1 w-full max-w-md rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={settings.homepageCryptoCoinId || 'bitcoin'}
            onChange={(e) =>
              setSettings({ ...settings, homepageCryptoCoinId: e.target.value })
            }
            disabled={settings.homepageShowCryptoChart === false}
          >
            {cryptoCoins.length ? (
              cryptoCoins.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.symbol} — {c.name}
                </option>
              ))
            ) : (
              <option value="bitcoin">BTC — Bitcoin</option>
            )}
          </select>
        </label>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-primary-700 px-6 py-2.5 text-sm font-semibold text-white hover:bg-primary-800 disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save homepage settings'}
      </button>
    </div>
  );
}
