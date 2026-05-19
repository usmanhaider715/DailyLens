import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api.js';
import { Spinner } from '../common/Spinner.jsx';
import { ScoreCard } from '../home/ScoreWidgets.jsx';
import { WeatherForecastPanel } from '../home/WeatherForecastPanel.jsx';

export function HomepageSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState(null);
  const [matches, setMatches] = useState([]);
  const [matchLeague, setMatchLeague] = useState('cricket');
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [weatherPreview, setWeatherPreview] = useState(null);

  const loadSettings = useCallback(async () => {
    const { data } = await api.get('/admin/settings');
    setSettings(data.settings);
    setMatchLeague(data.settings?.homepageLiveMatchLeague || 'cricket');
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

  const loadWeatherPreview = useCallback(async (region) => {
    try {
      const { data } = await api.get('/site/weather', { params: { region: region || 'usa' } });
      setWeatherPreview(data);
    } catch {
      setWeatherPreview(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadSettings();
        if (!cancelled) {
          await loadMatches('cricket');
          await loadWeatherPreview('usa');
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
  }, [loadSettings, loadMatches, loadWeatherPreview]);

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
  const heroMode = settings?.homepageHeroMode || 'featured';

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
                loadWeatherPreview(settings.homepageWeatherRegion || 'usa');
              }}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900 dark:text-white">Weather forecast</span>
              <span className="text-xs text-gray-500">5-day outlook for USA or UK cities (Open-Meteo)</span>
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
            Forecast region
            <select
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              value={settings.homepageWeatherRegion || 'usa'}
              onChange={(e) => {
                const region = e.target.value;
                setSettings({ ...settings, homepageWeatherRegion: region });
                loadWeatherPreview(region);
              }}
            >
              <option value="usa">United States (NY, LA, Chicago)</option>
              <option value="uk">United Kingdom (London, Manchester, Edinburgh)</option>
            </select>
          </label>
          {weatherPreview && (
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Preview</p>
              <WeatherForecastPanel forecast={weatherPreview} size="hero" />
            </div>
          )}
        </div>
      )}

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

