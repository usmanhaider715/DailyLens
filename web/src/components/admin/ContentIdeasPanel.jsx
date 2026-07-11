'use client';

import { formatArticleDateTime } from '@/utils/formatDate';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { api } from '@/services/api';
import { Spinner } from '../common/Spinner.jsx';
import { IdeaBatchRunProgress } from './IdeaBatchRunProgress.jsx';
import { startIdeaBatchRun, getIdeaBatchActiveJob } from '@/utils/ideaBatchRun';
import { ChevronDown, ChevronRight } from 'lucide-react';

const CATEGORIES = [
  'Entertainment',
  'Technology',
  'World',
  'Business',
  'Sports',
  'Health',
  'Gaming',
  'Politics',
  'Crypto',
  'Weather',
  'Science',
];

const EXAMPLE_IDEAS = `Best Space Movies
Best Space Exploration Movies
Best Time Travel Movies
Best Time Loop Movies
Best Parallel Universe Movies
Best Multiverse Movies
Best Artificial Intelligence Movies
Best Robot Movies
Best Hacker Movies`;

function statusBadge(status) {
  const map = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    partial: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    failed: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  };
  return map[status] || 'bg-gray-100 text-gray-700';
}

export function ContentIdeasPanel() {
  const [loading, setLoading] = useState(true);
  const [ideasText, setIdeasText] = useState('');
  const [category, setCategory] = useState('Entertainment');
  const [maxBatch, setMaxBatch] = useState(100);
  const [reports, setReports] = useState([]);
  const [reportsOpen, setReportsOpen] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [jobRunning, setJobRunning] = useState(false);
  const [drafts, setDrafts] = useState([]);
  const [draftSection, setDraftSection] = useState('drafts');
  const [selected, setSelected] = useState(new Set());
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const ideaCount = ideasText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3).length;

  const load = useCallback(async () => {
    try {
      const { data: config } = await api.get('/admin/idea-batch');
      setReports(config.reports || []);
      setMaxBatch(config.maxBatch || 100);
      if (config.activeJob?.id) {
        setActiveJob({ jobId: config.activeJob.id });
        setJobRunning(true);
      }
    } catch {
      toast.error('Failed to load content ideas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loading) refreshDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSection]);

  useEffect(() => {
    load();
    refreshDrafts();
    getIdeaBatchActiveJob()
      .then((job) => {
        if (job?.id) {
          setActiveJob({ jobId: job.id });
          setJobRunning(true);
        }
      })
      .catch(() => {});
  }, [load]);

  const refreshDrafts = async () => {
    setDraftsLoading(true);
    try {
      const { data } = await api.get('/admin/idea-batch/drafts', {
        params: { limit: 100, evergreen: draftSection === 'evergreen-drafts' ? '1' : '0' },
      });
      setDrafts(data.items || []);
      setSelected(new Set());
    } catch {
      toast.error('Failed to refresh drafts');
    } finally {
      setDraftsLoading(false);
    }
  };

  const toggleEvergreen = async (id, value) => {
    try {
      await api.post(`/admin/articles/${id}/evergreen`, { value });
      toast.success(value ? 'Moved to Evergreen drafts' : 'Returned to draft inbox');
      await refreshDrafts();
    } catch {
      toast.error('Could not update evergreen');
    }
  };

  const startBatch = async () => {
    if (!ideasText.trim()) {
      toast.error('Paste at least one idea per line');
      return;
    }
    if (ideaCount > maxBatch) {
      toast.error(`Maximum ${maxBatch} ideas per batch`);
      return;
    }
    try {
      const data = await startIdeaBatchRun({ ideasText, category });
      setActiveJob({ jobId: data.jobId });
      setJobRunning(true);
      toast.success(`Generating ${data.total} drafts in background`);
    } catch (err) {
      const existingJobId = err?.response?.data?.jobId;
      if (err?.response?.status === 409 && existingJobId) {
        setActiveJob({ jobId: existingJobId });
        toast('A batch is already running', { icon: 'ℹ️' });
      } else {
        toast.error(err?.response?.data?.message || 'Failed to start batch');
      }
    }
  };

  const handleRunComplete = useCallback(async () => {
    setJobRunning(false);
    await load();
    await refreshDrafts();
  }, [load]);

  const toggleSelect = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === drafts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(drafts.map((d) => d._id)));
    }
  };

  const publishSelected = async (all = false) => {
    const ids = all ? drafts.map((d) => d._id) : [...selected];
    if (!ids.length) {
      toast.error('Select at least one draft');
      return;
    }
    setPublishing(true);
    try {
      const { data } = await api.post('/admin/idea-batch/drafts/publish', { ids });
      toast.success(`Published ${data.published} article${data.published === 1 ? '' : 's'}`);
      await refreshDrafts();
      await load();
    } catch {
      toast.error('Publish failed');
    } finally {
      setPublishing(false);
    }
  };

  const deleteSelected = async () => {
    const ids = [...selected];
    if (!ids.length) {
      toast.error('Select drafts to delete');
      return;
    }
    if (!window.confirm(`Delete ${ids.length} draft(s)?`)) return;
    try {
      const { data } = await api.post('/admin/idea-batch/drafts/delete', { ids });
      toast.success(`Deleted ${data.deleted} draft(s)`);
      await refreshDrafts();
    } catch {
      toast.error('Delete failed');
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-xl font-bold text-gray-900 dark:text-white">Content ideas</h2>
        <p className="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-400">
          Paste topic ideas (one per line). AI writes full listicle articles and saves them as{' '}
          <strong>drafts</strong>. Review, select, and publish when ready. Runs on the server in the
          background — safe to close this tab.
        </p>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[160px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={() => setIdeasText(EXAMPLE_IDEAS)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            Load example ideas
          </button>
        </div>

        <label className="mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Ideas (one per line) — {ideaCount}/{maxBatch}
        </label>
        <textarea
          value={ideasText}
          onChange={(e) => setIdeasText(e.target.value)}
          rows={10}
          placeholder={'Best Space Movies\nBest Time Travel Movies\n...'}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-700 dark:bg-gray-950"
        />

        <button
          type="button"
          onClick={startBatch}
          disabled={jobRunning || ideaCount === 0}
          className="mt-4 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          Generate drafts
        </button>
      </section>

      {activeJob ? (
        <IdeaBatchRunProgress
          jobId={activeJob.jobId}
          onComplete={handleRunComplete}
          onClose={() => {
            setActiveJob(null);
            setJobRunning(false);
          }}
        />
      ) : null}

      <section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap gap-1 rounded-lg border border-gray-100 bg-gray-50 p-1 dark:border-gray-800 dark:bg-gray-950">
          <button
            type="button"
            onClick={() => setDraftSection('drafts')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              draftSection === 'drafts'
                ? 'bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-white'
                : 'text-gray-600'
            }`}
          >
            Draft inbox
          </button>
          <button
            type="button"
            onClick={() => setDraftSection('evergreen-drafts')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium ${
              draftSection === 'evergreen-drafts'
                ? 'bg-white text-gray-900 shadow dark:bg-gray-900 dark:text-white'
                : 'text-gray-600'
            }`}
          >
            Evergreen drafts
          </button>
        </div>

        {draftSection === 'evergreen-drafts' ? (
          <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">
            Protected drafts — cannot be bulk-deleted. Uncheck Evergreen to move back.
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-display text-lg font-semibold">
              {draftSection === 'evergreen-drafts' ? 'Evergreen drafts' : 'Draft inbox'}
            </h3>
            <p className="text-sm text-gray-500">{drafts.length} draft(s)</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={refreshDrafts}
              disabled={draftsLoading}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={() => publishSelected(false)}
              disabled={publishing || selected.size === 0}
              className="rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700 disabled:opacity-60"
            >
              Publish selected ({selected.size})
            </button>
            <button
              type="button"
              onClick={() => publishSelected(true)}
              disabled={publishing || drafts.length === 0}
              className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-60 dark:bg-white dark:text-gray-900"
            >
              Publish all
            </button>
            {draftSection === 'drafts' ? (
              <button
                type="button"
                onClick={deleteSelected}
                disabled={selected.size === 0}
                className="rounded-lg border border-red-300 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400"
              >
                Delete selected
              </button>
            ) : null}
          </div>
        </div>

        {draftsLoading ? (
          <div className="mt-4">
            <Spinner />
          </div>
        ) : !drafts.length ? (
          <p className="mt-4 text-sm text-gray-500">No drafts yet — generate ideas above.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-800">
                  <th className="py-2 pr-3">
                    <input
                      type="checkbox"
                      checked={selected.size === drafts.length && drafts.length > 0}
                      onChange={toggleAll}
                      aria-label="Select all drafts"
                    />
                  </th>
                  <th className="py-2 pr-4">Title</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Read</th>
                  <th className="py-2 pr-4">Evergreen</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {drafts.map((d) => (
                  <tr key={d._id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="py-3 pr-3">
                      <input
                        type="checkbox"
                        checked={selected.has(d._id)}
                        onChange={() => toggleSelect(d._id)}
                        aria-label={`Select ${d.title}`}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="font-medium">{d.title}</div>
                      <div className="text-xs text-gray-400">{d.slug}</div>
                    </td>
                    <td className="py-3 pr-4">{d.category}</td>
                    <td className="py-3 pr-4">{d.readTime || '—'} min</td>
                    <td className="py-3 pr-4 text-center">
                      <input
                        type="checkbox"
                        checked={!!d.isEvergreen}
                        onChange={(e) => toggleEvergreen(d._id, e.target.checked)}
                        title="Move to Evergreen drafts"
                      />
                    </td>
                    <td className="py-3">
                      <Link
                        href={`/admin/articles/edit/${d._id}`}
                        className="text-xs text-primary-600 hover:underline"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <button
          type="button"
          onClick={() => setReportsOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 p-4 text-left"
        >
          <div>
            <h3 className="font-display text-lg font-semibold">Idea batch reports</h3>
            <p className="text-sm text-gray-500">
              {reports.length ? `${reports.length} run(s) on record` : 'No runs yet'}
            </p>
          </div>
          {reportsOpen ? (
            <ChevronDown className="h-5 w-5 shrink-0 text-gray-400" />
          ) : (
            <ChevronRight className="h-5 w-5 shrink-0 text-gray-400" />
          )}
        </button>

        {reportsOpen && reports.length > 0 ? (
          <div className="border-t border-gray-100 px-4 pb-4 dark:border-gray-800">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 dark:border-gray-800">
                    <th className="py-2 pr-4">When</th>
                    <th className="py-2 pr-4">Category</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2 pr-4">Drafts</th>
                    <th className="py-2">Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((r) => (
                    <tr key={r._id} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 pr-4 whitespace-nowrap">
                        {formatArticleDateTime(r.createdAt)}
                      </td>
                      <td className="py-3 pr-4">{r.category}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(r.status)}`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {r.draftCount}/{r.requestedCount}
                      </td>
                      <td className="py-3">
                        <div>{r.summary}</div>
                        {r.errorMessages?.length > 0 && (
                          <div className="mt-1 text-xs text-red-600">
                            {r.errorMessages.slice(0, 3).join('; ')}
                            {r.errorMessages.length > 3 ? '…' : ''}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
