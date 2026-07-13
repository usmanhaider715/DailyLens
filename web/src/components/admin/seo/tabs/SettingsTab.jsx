'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Save } from 'lucide-react';
import { api } from '@/services/api';
import { useApi, Card, Badge, Loading, ErrorNote } from '../primitives.jsx';

const INTENTS = ['informational', 'commercial', 'transactional', 'navigational', 'mixed'];
const PRIORITIES = ['critical', 'high', 'medium', 'low'];
const MODES = [
  ['cluster-expansion', 'Cluster Expansion'],
  ['new-topic-discovery', 'New Topic Discovery'],
  ['competitor-gap', 'Competitor Gap'],
  ['search-console-recovery', 'Search Console Recovery'],
  ['long-tail', 'Long Tail Keywords'],
  ['commercial', 'Commercial Topics'],
  ['mixed', 'Mixed'],
];

const DATA_SOURCE_LABELS = {
  searchConsole: 'Google Search Console',
  googleTrends: 'Google Trends',
  existingArticles: 'Existing Articles',
  existingCategories: 'Existing Categories',
  analytics: 'Analytics',
  competitorAnalysis: 'Competitor Analysis',
  keywordDatabase: 'Keyword Database',
  manualKeywordImport: 'Manual Keyword Import',
  csvKeywordUpload: 'CSV Keyword Upload',
  googleAutocomplete: 'Google Autocomplete',
  peopleAlsoAsk: 'People Also Ask',
  relatedSearches: 'Related Searches',
};

const EXTERNAL_SOURCES = new Set([
  'searchConsole',
  'competitorAnalysis',
  'keywordDatabase',
  'googleAutocomplete',
  'peopleAlsoAsk',
  'relatedSearches',
]);

const cellCls = 'w-20 rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white';
const selCls = 'rounded border border-gray-200 px-2 py-1 text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white';

export function SettingsTab() {
  const { data, loading, error } = useApi('/admin/seo/config');
  const [cfg, setCfg] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setCfg(structuredClone(data));
  }, [data]);

  if (loading || !cfg) return <Loading />;
  if (error) return <ErrorNote>{error}</ErrorNote>;

  const setTarget = (i, key, value) => {
    setCfg((c) => {
      const next = structuredClone(c);
      next.categoryTargets[i][key] = value;
      return next;
    });
  };
  const toggleSource = (key) =>
    setCfg((c) => ({ ...c, dataSources: { ...c.dataSources, [key]: !c.dataSources[key] } }));
  const setStrategy = (key, value) =>
    setCfg((c) => ({ ...c, strategy: { ...c.strategy, [key]: value } }));
  const setDist = (key, value) =>
    setCfg((c) => ({
      ...c,
      strategy: { ...c.strategy, distribution: { ...c.strategy.distribution, [key]: Number(value) } },
    }));

  const save = async () => {
    setSaving(true);
    try {
      await api.put('/admin/seo/config', {
        categoryTargets: cfg.categoryTargets,
        dataSources: cfg.dataSources,
        strategy: cfg.strategy,
      });
      toast.success('Settings saved');
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const dist = cfg.strategy.distribution || {};
  const distTotal = (dist.existingClusters || 0) + (dist.supportingArticles || 0) + (dist.newClusters || 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>

      <Card title="Category targets" subtitle="Goals used to compute status and pace">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="text-gray-400">
              <tr>
                <th className="px-2 py-2">Category</th>
                <th className="px-2 py-2">Monthly</th>
                <th className="px-2 py-2">Authority</th>
                <th className="px-2 py-2">Difficulty</th>
                <th className="px-2 py-2">Min volume</th>
                <th className="px-2 py-2">Intent</th>
                <th className="px-2 py-2">Priority</th>
              </tr>
            </thead>
            <tbody>
              {cfg.categoryTargets.map((t, i) => (
                <tr key={t.name} className="border-t border-gray-100 dark:border-gray-800">
                  <td className="px-2 py-2 font-medium text-gray-800 dark:text-gray-200">{t.name}</td>
                  <td className="px-2 py-2"><input type="number" min="0" value={t.targetMonthlyArticles} onChange={(e) => setTarget(i, 'targetMonthlyArticles', Number(e.target.value))} className={cellCls} /></td>
                  <td className="px-2 py-2"><input type="number" min="0" max="100" value={t.targetAuthorityScore} onChange={(e) => setTarget(i, 'targetAuthorityScore', Number(e.target.value))} className={cellCls} /></td>
                  <td className="px-2 py-2"><input type="number" min="0" max="100" value={t.targetKeywordDifficulty} onChange={(e) => setTarget(i, 'targetKeywordDifficulty', Number(e.target.value))} className={cellCls} /></td>
                  <td className="px-2 py-2"><input type="number" min="0" value={t.minSearchVolume} onChange={(e) => setTarget(i, 'minSearchVolume', Number(e.target.value))} className={cellCls} /></td>
                  <td className="px-2 py-2">
                    <select value={t.targetSearchIntent} onChange={(e) => setTarget(i, 'targetSearchIntent', e.target.value)} className={selCls}>
                      {INTENTS.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <select value={t.priorityLevel} onChange={(e) => setTarget(i, 'priorityLevel', e.target.value)} className={selCls}>
                      {PRIORITIES.map((x) => <option key={x} value={x}>{x}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="Data sources" subtitle="Enable each independently">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Object.keys(DATA_SOURCE_LABELS).map((key) => (
            <label key={key} className="flex items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 text-sm dark:border-gray-800">
              <span className="flex items-center gap-2">
                {DATA_SOURCE_LABELS[key]}
                {EXTERNAL_SOURCES.has(key) && <Badge tone="amber">external</Badge>}
              </span>
              <input type="checkbox" checked={!!cfg.dataSources[key]} onChange={() => toggleSource(key)} className="h-4 w-4" />
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-400">
          Sources tagged “external” only produce data once their API credentials are configured on the server.
        </p>
      </Card>

      <Card title="Topic generation strategy">
        <div className="flex flex-wrap items-end gap-6">
          <label className="text-xs text-gray-500">
            Generation mode
            <select value={cfg.strategy.generationMode} onChange={(e) => setStrategy('generationMode', e.target.value)} className={`mt-1 block ${selCls}`}>
              {MODES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <div>
            <p className="mb-1 text-xs text-gray-500">Topic distribution {distTotal !== 100 && <span className="text-amber-500">(should total 100%, currently {distTotal}%)</span>}</p>
            <div className="flex gap-3">
              <DistInput label="Existing clusters" value={dist.existingClusters} onChange={(v) => setDist('existingClusters', v)} />
              <DistInput label="Supporting" value={dist.supportingArticles} onChange={(v) => setDist('supportingArticles', v)} />
              <DistInput label="New clusters" value={dist.newClusters} onChange={(v) => setDist('newClusters', v)} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function DistInput({ label, value, onChange }) {
  return (
    <label className="text-center text-[11px] text-gray-500">
      <input type="number" min="0" max="100" value={value ?? 0} onChange={(e) => onChange(e.target.value)} className={`${cellCls} block`} />
      {label}
    </label>
  );
}
