'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';
import { Play, Save, RefreshCw, Check, X, Pencil } from 'lucide-react';

const CATEGORY_NAMES = [
  'Finance',
  'Insurance',
  'Legal',
  'Technology',
  'Health',
  'Business',
  'Entertainment',
];

export function EvergreenPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);
  const [config, setConfig] = useState(null);
  const [pending, setPending] = useState([]);
  const [logs, setLogs] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editBody, setEditBody] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: settings }, { data: pendingData }] = await Promise.all([
        api.get('/admin/evergreen'),
        api.get('/admin/evergreen/pending', { params: { limit: 50 } }),
      ]);
      setConfig(settings.config);
      setPending(pendingData.items || []);
      setLogs(settings.logs || []);
    } catch {
      toast.error('Could not load evergreen settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/admin/evergreen', config);
      setConfig(data.config);
      toast.success('Evergreen settings saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const runPipeline = async (category = null) => {
    setRunning(true);
    try {
      const { data } = await api.post('/admin/evergreen/run', category ? { category } : {});
      toast.success(
        `Run complete — ${data.generated} generated (${data.published} live, ${data.pending} pending)`,
      );
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Pipeline run failed');
    } finally {
      setRunning(false);
    }
  };

  const approve = async (id) => {
    try {
      await api.post(`/admin/evergreen/pending/${id}/approve`, editId === id ? { body: editBody } : {});
      toast.success('Approved & published');
      setEditId(null);
      setEditBody('');
      load();
    } catch {
      toast.error('Approve failed');
    }
  };

  const reject = async (id) => {
    try {
      await api.post(`/admin/evergreen/pending/${id}/reject`);
      toast.success('Rejected');
      load();
    } catch {
      toast.error('Reject failed');
    }
  };

  const updateCategory = (name, patch) => {
    setConfig((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.name === name ? { ...c, ...patch } : c)),
    }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-emerald-200 bg-white p-6 dark:border-emerald-900/50 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Evergreen pipeline</h2>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Claude-powered self-help guides — separate from the news rewrite pipeline.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => runPipeline()}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {running ? <Spinner /> : <Play className="h-4 w-4" />}
              Run all categories
            </button>
            <button
              type="button"
              onClick={saveSettings}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold dark:border-gray-600"
            >
              <Save className="h-4 w-4" />
              Save settings
            </button>
            <button type="button" onClick={load} className="rounded-lg border border-gray-300 p-2 dark:border-gray-600">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={!!config?.enabled}
              onChange={(e) => setConfig((p) => ({ ...p, enabled: e.target.checked }))}
            />
            System enabled
          </label>
          <label className="text-sm">
            Daily run time
            <input
              type="time"
              value={config?.runTime || '06:00'}
              onChange={(e) => setConfig((p) => ({ ...p, runTime: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>
          <label className="text-sm">
            Timezone
            <input
              type="text"
              value={config?.timezone || 'Asia/Karachi'}
              onChange={(e) => setConfig((p) => ({ ...p, timezone: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
            />
          </label>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase text-gray-500 dark:border-gray-700">
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4">Enabled</th>
                <th className="py-2 pr-4">Articles/day</th>
                <th className="py-2 pr-4">Require approval</th>
                <th className="py-2">Run</th>
              </tr>
            </thead>
            <tbody>
              {(config?.categories || []).map((cat) => (
                <tr key={cat.name} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-3 pr-4 font-medium">{cat.name}</td>
                  <td className="py-3 pr-4">
                    <input
                      type="checkbox"
                      checked={!!cat.enabled}
                      onChange={(e) => updateCategory(cat.name, { enabled: e.target.checked })}
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <input
                      type="number"
                      min={0}
                      max={10}
                      value={cat.articlesPerDay ?? 1}
                      onChange={(e) =>
                        updateCategory(cat.name, { articlesPerDay: Number(e.target.value) })
                      }
                      className="w-20 rounded border border-gray-200 px-2 py-1 dark:border-gray-700 dark:bg-gray-950"
                    />
                  </td>
                  <td className="py-3 pr-4">
                    <input
                      type="checkbox"
                      checked={!!cat.requireApproval}
                      onChange={(e) => updateCategory(cat.name, { requireApproval: e.target.checked })}
                    />
                  </td>
                  <td className="py-3">
                    <button
                      type="button"
                      onClick={() => runPipeline(cat.name)}
                      disabled={running || !cat.enabled}
                      className="text-xs font-semibold text-emerald-700 hover:underline disabled:opacity-50 dark:text-emerald-400"
                    >
                      Run now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-amber-200 bg-white p-6 dark:border-amber-900/40 dark:bg-gray-900">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          Pending review ({pending.length})
        </h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          YMYL categories (Finance, Insurance, Legal, Health) default to manual approval.
        </p>
        {pending.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No articles awaiting review.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {pending.map((item) => (
              <li
                key={item._id}
                className="rounded-lg border border-gray-200 p-4 dark:border-gray-700"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {item.category} · {item.wordCount || '—'} words · keyword: {item.targetKeyword || '—'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditId(item._id);
                        setEditBody(item.body || '');
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-semibold"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => approve(item._id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <Check className="h-3.5 w-3.5" /> Approve
                    </button>
                    <button
                      type="button"
                      onClick={() => reject(item._id)}
                      className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <X className="h-3.5 w-3.5" /> Reject
                    </button>
                  </div>
                </div>
                {editId === item._id && (
                  <textarea
                    value={editBody}
                    onChange={(e) => setEditBody(e.target.value)}
                    rows={12}
                    className="mt-3 w-full rounded-lg border border-gray-200 p-3 font-mono text-xs dark:border-gray-700 dark:bg-gray-950"
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Pipeline logs (last 20)</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b text-xs uppercase text-gray-500">
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Status</th>
                <th className="py-2 pr-3">Generated</th>
                <th className="py-2 pr-3">Dupes</th>
                <th className="py-2 pr-3">Cost</th>
                <th className="py-2">Categories</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-3 text-xs">
                    {new Date(log.startedAt || log.createdAt).toLocaleString()}
                  </td>
                  <td className="py-2 pr-3">{log.status}</td>
                  <td className="py-2 pr-3">
                    {log.articlesGenerated} ({log.articlesPublished} live / {log.articlesPending} pending)
                  </td>
                  <td className="py-2 pr-3">{log.duplicatesRejected ?? 0}</td>
                  <td className="py-2 pr-3">${(log.tokenCostUsd || 0).toFixed(4)}</td>
                  <td className="py-2 text-xs">{(log.categoriesRun || []).join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
