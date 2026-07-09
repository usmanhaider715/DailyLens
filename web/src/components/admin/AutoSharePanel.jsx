'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';
import { Plus, Trash2, Play, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import { AutoShareRunProgress } from './AutoShareRunProgress.jsx';
import { ContentIdeasPanel } from './ContentIdeasPanel.jsx';
import { startAutoShareRun } from '@/utils/autoShareRun';

function formatEtClock(parts) {
  if (!parts) return '—';
  const h = parts.hour % 12 || 12;
  const ampm = parts.hour >= 12 ? 'PM' : 'AM';
  return `${parts.dateKey} ${h}:${String(parts.minute).padStart(2, '0')} ${ampm} ET`;
}

function formatPeriodTime(hourET, minuteET) {
  const h = Number(hourET);
  const m = Number(minuteET);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm} ET`;
}

function statusBadge(status) {
  const map = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

const CATEGORY_LABELS = {
  Technology: 'Tech',
};

function categoryLabel(name) {
  return CATEGORY_LABELS[name] || name;
}

function newPeriod() {
  return {
    id: crypto.randomUUID(),
    label: 'New slot',
    hourET: 9,
    minuteET: 0,
    enabled: true,
  };
}

export function AutoSharePanel() {
  const [tab, setTab] = useState('auto-share');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [runningId, setRunningId] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [articleCount, setArticleCount] = useState(5);
  const [categories, setCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [sourceIds, setSourceIds] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [sources, setSources] = useState([]);
  const [reports, setReports] = useState([]);
  const [easternNow, setEasternNow] = useState(null);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/auto-share');
      setEnabled(!!data.enabled);
      setArticleCount(data.articlesPerCategory ?? data.articleCount ?? 5);
      setCategories(data.categories || []);
      setSelectedCategories(
        data.selectedCategories?.length ? data.selectedCategories : data.categories || []
      );
      setSourceIds(data.sourceIds || []);
      setPeriods(data.periods?.length ? data.periods : [newPeriod()]);
      setSources(data.sources || []);
      setReports(data.reports || []);
      setEasternNow(data.easternNow || null);
    } catch {
      toast.error('Failed to load auto-share settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    api
      .get('/admin/auto-share/active-job')
      .then(({ data }) => {
        if (data.job?.id) {
          setActiveJob({ jobId: data.job.id, periodLabel: data.job.periodLabel });
          setRunningId(data.job.periodId);
        }
      })
      .catch(() => {});
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/admin/auto-share', {
        enabled,
        articleCount,
        sourceIds,
        periods,
        selectedCategories,
      });
      setReports(data.reports || []);
      setEasternNow(data.easternNow || null);
      toast.success('Auto-share settings saved');
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const runNow = async (periodId) => {
    if (!sourceIds.length) {
      toast.error('Select at least one news source, then click Save settings');
      return;
    }
    if (!selectedCategories.length) {
      toast.error('Select at least one category, then click Save settings');
      return;
    }
    if (runningId) return;

    const period = periods.find((p) => p.id === periodId);
    setRunningId(periodId);
    try {
      const data = await startAutoShareRun(periodId);
      setActiveJob({ jobId: data.jobId, periodLabel: data.periodLabel || period?.label });
    } catch (err) {
      const existingJobId = err?.response?.data?.jobId;
      if (err?.response?.status === 409 && existingJobId) {
        setActiveJob({ jobId: existingJobId, periodLabel: period?.label });
        toast('A run is already in progress', { icon: 'ℹ️' });
      } else {
        toast.error(err?.response?.data?.message || 'Run failed to start');
        setRunningId(null);
      }
    }
  };

  const handleRunComplete = useCallback(async () => {
    setRunningId(null);
    await load();
  }, [load]);

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const activeCategoryCount = selectedCategories.length || categories.length || 10;
    const sid = String(id);
    setSourceIds((prev) =>
      prev.includes(sid) ? prev.filter((x) => x !== sid) : [...prev, sid],
    );
  };

  const updatePeriod = (id, patch) => {
    setPeriods((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  };

  if (loading) return <Spinner />;

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Auto-share & content ideas
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
            Schedule RSS auto-sharing or batch-generate listicle drafts from topic ideas. All runs
            continue on the server in the background.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-800 dark:bg-gray-900">
          <Clock className="h-4 w-4 text-primary-600" />
          <span className="text-gray-600 dark:text-gray-400">Now:</span>
          <strong>{formatEtClock(easternNow)}</strong>
        </div>
      </div>

      <div className="flex gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-950">
        <button
          type="button"
          onClick={() => setTab('auto-share')}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            tab === 'auto-share'
              ? 'bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-white'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
          }`}
        >
          Auto-share
        </button>
        <button
          type="button"
          onClick={() => setTab('content-ideas')}
          className={`rounded-md px-4 py-2 text-sm font-medium ${
            tab === 'content-ideas'
              ? 'bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-white'
              : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'
          }`}
        >
          Content ideas
        </button>
      </div>

      {tab === 'content-ideas' ? (
        <ContentIdeasPanel />
      ) : (
        <>
      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="h-5 w-5 rounded border-gray-300"
            />
            <span className="font-medium">Enable scheduled auto-share</span>
          </label>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Articles per category
            </label>
            <input
              type="number"
              min={1}
              max={20}
              value={articleCount}
              onChange={(e) => setArticleCount(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-950"
            />
            <p className="mt-1 text-xs text-gray-500">
              {articleCount} × {activeCategoryCount} categories ={' '}
              <strong>{articleCount * activeCategoryCount} articles per run</strong>
            </p>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Categories to run
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategories(categories)}
                  className="text-xs text-primary-600 hover:underline"
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCategories([])}
                  className="text-xs text-gray-500 hover:underline"
                >
                  None
                </button>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {(categories.length
                ? categories
                : ['World', 'Technology', 'Business', 'Sports', 'Health', 'Entertainment', 'Gaming', 'Politics', 'Crypto', 'Weather']
              ).map((cat) => {
                const on = selectedCategories.includes(cat);
                return (
                  <label
                    key={cat}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                      on
                        ? 'border-primary-400 bg-primary-50 text-primary-900 dark:border-primary-700 dark:bg-primary-950/50 dark:text-primary-100'
                        : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => toggleCategory(cat)}
                      className="h-3 w-3"
                    />
                    {categoryLabel(cat)}
                  </label>
                );
              })}
            </div>
            {!selectedCategories.length ? (
              <p className="mt-2 text-xs text-amber-600">Select at least one category, then save.</p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="font-display text-lg font-semibold">News sources</h2>
        <p className="mt-1 text-sm text-gray-500">
          Select which sources to pull hot stories from. All sources are selected by default — click{' '}
          <strong>Save settings</strong> after changes.
        </p>
        {sourceIds.length === 0 ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
            No sources selected — check at least one source below, then save before running.
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSourceIds(sources.map((s) => String(s._id)))}
            className="rounded-lg border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Select all
          </button>
          <button
            type="button"
            onClick={() => setSourceIds([])}
            className="rounded-lg border border-gray-300 px-3 py-1 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Clear all
          </button>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {sources.map((s) => (
            <label
              key={s._id}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800"
            >
              <input
                type="checkbox"
                checked={sourceIds.includes(String(s._id))}
                onChange={() => toggleSource(s._id)}
                className="h-4 w-4"
              />
              <span className="text-sm">{s.name}</span>
              {!s.isActive && (
                <span className="ml-auto text-xs text-amber-600">inactive</span>
              )}
            </label>
          ))}
          {!sources.length && (
            <p className="text-sm text-gray-500">No news sources configured yet.</p>
          )}
        </div>
      </section>

      {activeJob ? (
        <AutoShareRunProgress
          jobId={activeJob.jobId}
          periodLabel={activeJob.periodLabel}
          onComplete={handleRunComplete}
          onClose={() => setActiveJob(null)}
        />
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold">Schedule (US Eastern)</h2>
            <p className="mt-1 text-sm text-gray-500">Add multiple time slots — each runs once per day</p>
          </div>
          <button
            type="button"
            onClick={() => setPeriods((p) => [...p, newPeriod()])}
            className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Add period
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {periods.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-100 p-4 dark:border-gray-800"
            >
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={p.enabled !== false}
                  onChange={(e) => updatePeriod(p.id, { enabled: e.target.checked })}
                />
                <span className="text-xs text-gray-500">On</span>
              </label>
              <div className="min-w-[140px] flex-1">
                <span className="text-xs text-gray-500">Label</span>
                <input
                  value={p.label || ''}
                  onChange={(e) => updatePeriod(p.id, { label: e.target.value })}
                  className="mt-0.5 w-full rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                />
              </div>
              <div>
                <span className="text-xs text-gray-500">Hour (0–23 ET)</span>
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={p.hourET}
                  onChange={(e) => updatePeriod(p.id, { hourET: Number(e.target.value) })}
                  className="mt-0.5 w-20 rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                />
              </div>
              <div>
                <span className="text-xs text-gray-500">Minute</span>
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={p.minuteET}
                  onChange={(e) => updatePeriod(p.id, { minuteET: Number(e.target.value) })}
                  className="mt-0.5 w-20 rounded border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-950"
                />
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {formatPeriodTime(p.hourET, p.minuteET)}
              </span>
              <button
                type="button"
                onClick={() => runNow(p.id)}
                disabled={!!runningId}
                className="flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-800 disabled:opacity-60 dark:bg-white dark:text-gray-900"
              >
                <Play className="h-3.5 w-3.5" />
                {runningId === p.id ? 'Running…' : 'Run now'}
              </button>
              <button
                type="button"
                onClick={() => setPeriods((prev) => prev.filter((x) => x.id !== p.id))}
                className="rounded p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                aria-label="Remove period"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setReportsOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 p-6 text-left"
        >
          <div>
            <h2 className="font-display text-lg font-semibold">Run reports</h2>
            <p className="mt-1 text-sm text-gray-500">
              {reports.length
                ? `${reports.length} run(s) — click to ${reportsOpen ? 'collapse' : 'expand'}`
                : 'History of each scheduled or manual run'}
            </p>
          </div>
          {reportsOpen ? (
            <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
          )}
        </button>

        {reportsOpen ? (
          !reports.length ? (
            <p className="border-t border-gray-100 px-6 pb-6 text-sm text-gray-500 dark:border-gray-800">
              No runs yet.
            </p>
          ) : (
            <div className="border-t border-gray-100 px-6 pb-6 dark:border-gray-800">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-800">
                      <th className="py-2 pr-4">When</th>
                      <th className="py-2 pr-4">Period</th>
                      <th className="py-2 pr-4">Status</th>
                      <th className="py-2 pr-4">Featured</th>
                      <th className="py-2 pr-4">Published</th>
                      <th className="py-2">Summary</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((r) => (
                      <tr key={r._id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-3 pr-4 whitespace-nowrap">
                          {r.runDateET} {r.scheduledTimeET}
                          <div className="text-xs text-gray-400">
                            {r.triggeredBy === 'manual' ? 'Manual' : 'Scheduled'}
                          </div>
                        </td>
                        <td className="py-3 pr-4">{r.periodLabel}</td>
                        <td className="py-3 pr-4">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(r.status)}`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 pr-4">{r.featuredCount ?? 0}</td>
                        <td className="py-3 pr-4">{r.publishedCount ?? 0}</td>
                        <td className="py-3">
                          <div>{r.summary}</div>
                          {r.categoryBreakdown?.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {r.categoryBreakdown.map((b) => (
                                <span
                                  key={b.category}
                                  className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                                  title={`Featured ${b.featured}, published ${b.published}, failed ${b.failed}`}
                                >
                                  {categoryLabel(b.category)}: {b.featured + b.published}/{b.requested}
                                </span>
                              ))}
                            </div>
                          )}
                          {r.errorMessages?.length > 0 && (
                            <div className="mt-1 max-h-24 overflow-y-auto text-xs text-red-600">
                              {r.errorMessages.slice(0, 5).join('; ')}
                              {r.errorMessages.length > 5 ? ` (+${r.errorMessages.length - 5} more)` : ''}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : null}
      </section>
        </>
      )}
    </div>
  );
}
