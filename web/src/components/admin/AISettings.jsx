'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';

const allCategories = [
  'World',
  'Technology',
  'Business',
  'Sports',
  'Health',
  'Science',
  'Entertainment',
  'Gaming',
  'Politics',
  'Crypto',
  'Weather',
];

export function AISettings() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState(null);
  const [sources, setSources] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/admin/settings');
        if (cancelled) return;
        setSettings(data.settings);
        setSources(data.sources || []);
      } catch {
        toast.error('Failed to load settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const save = async () => {
    try {
      const disabledSourceIds = sources.filter((s) => !s.isActive).map((s) => s._id);
      const sourcesPatch = sources.map((s) => ({ _id: s._id, isActive: s.isActive }));
      await api.put('/admin/settings', { settings, disabledSourceIds, sourcesPatch });
      toast.success('Settings saved');
    } catch {
      toast.error('Save failed');
    }
  };

  if (loading || !settings) return <Spinner />;

  const toggleCategory = (name) => {
    const cur = new Set(settings.activeCategories?.length ? settings.activeCategories : allCategories);
    if (cur.has(name)) cur.delete(name);
    else cur.add(name);
    setSettings({ ...settings, activeCategories: Array.from(cur) });
  };

  const toggleSource = (id) => {
    setSources((prev) =>
      prev.map((s) => (String(s._id) === String(id) ? { ...s, isActive: !s.isActive } : s))
    );
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">AI Settings</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Fetch interval
          <select
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={settings.fetchInterval}
            onChange={(e) => setSettings({ ...settings, fetchInterval: e.target.value })}
          >
            <option value="5min">5 minutes</option>
            <option value="15min">15 minutes</option>
            <option value="30min">30 minutes</option>
            <option value="1hr">1 hour</option>
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Article tone
          <select
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={settings.articleTone}
            onChange={(e) => setSettings({ ...settings, articleTone: e.target.value })}
          >
            <option>Formal</option>
            <option>Neutral</option>
            <option>Engaging</option>
            <option>Tabloid</option>
          </select>
        </label>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Min words
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={settings.minWordCount}
            onChange={(e) => setSettings({ ...settings, minWordCount: Number(e.target.value) })}
          />
        </label>
        <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
          Max words
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            value={settings.maxWordCount}
            onChange={(e) => setSettings({ ...settings, maxWordCount: Number(e.target.value) })}
          />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
        <input
          type="checkbox"
          checked={!!settings.generateAiImages}
          onChange={(e) => setSettings({ ...settings, generateAiImages: e.target.checked })}
        />
        Generate AI images (DALL·E credits)
      </label>

      <div>
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Active categories</div>
        <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-3">
          {allCategories.map((c) => {
            const active = settings.activeCategories?.includes(c) ?? true;
            return (
              <label key={c} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={active} onChange={() => toggleCategory(c)} />
                {c}
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <div className="text-sm font-semibold text-gray-800 dark:text-gray-100">Sources</div>
        <ul className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-100 dark:divide-gray-800 dark:border-gray-800">
          {sources.map((s) => (
            <li key={s._id} className="flex items-center justify-between px-3 py-2 text-sm">
              <div>
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-gray-500">{s.type}</div>
              </div>
              <input type="checkbox" checked={!!s.isActive} onChange={() => toggleSource(s._id)} />
            </li>
          ))}
        </ul>
      </div>

      <button type="button" onClick={save} className="rounded-lg bg-primary-700 px-6 py-3 font-semibold text-white">
        Save settings
      </button>
    </div>
  );
}
