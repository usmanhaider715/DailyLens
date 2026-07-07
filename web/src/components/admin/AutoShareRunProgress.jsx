'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Spinner } from '../common/Spinner.jsx';
import { pollAutoShareRun, phaseLabel, controlAutoShareRun } from '@/utils/autoShareRun';

const CATEGORY_LABELS = { Technology: 'Tech' };

function categoryLabel(name) {
  return CATEGORY_LABELS[name] || name;
}

function formatElapsed(ms) {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function AutoShareRunProgress({ jobId, periodLabel, onComplete, onClose }) {
  const [job, setJob] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const onCompleteRef = useRef(onComplete);
  const toastedRef = useRef(false);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!jobId) return undefined;
    let cancelled = false;
    toastedRef.current = false;

    pollAutoShareRun(jobId, {
      intervalMs: 4000,
      onProgress: (next) => {
        if (!cancelled) setJob(next);
      },
    })
      .then((final) => {
        if (cancelled || toastedRef.current) return;
        toastedRef.current = true;
        setJob(final);
        onCompleteRef.current?.(final);
        if (final.status === 'skipped') {
          toast(final.summary || 'Run skipped', { icon: 'ℹ️' });
        } else if (final.status === 'complete') {
          toast.success(final.summary || 'Auto-share run complete');
        } else if (final.status === 'stopped') {
          toast(final.summary || 'Run stopped', { icon: 'ℹ️' });
        } else if (final.status === 'error') {
          toast.error(final.summary || 'Auto-share run failed');
        }
      })
      .catch((err) => {
        if (cancelled || toastedRef.current) return;
        toastedRef.current = true;
        toast.error(err?.response?.data?.message || 'Could not track run progress');
      });

    return () => {
      cancelled = true;
    };
  }, [jobId]);

  useEffect(() => {
    if (!job?.startedAt) return undefined;
    if (job.status !== 'running' && job.status !== 'stopped') return undefined;
    const id = setInterval(() => {
      setElapsed(Date.now() - job.startedAt);
    }, 1000);
    return () => clearInterval(id);
  }, [job?.startedAt, job?.status]);

  const sendControl = async (action) => {
    try {
      const updated = await controlAutoShareRun(jobId, action);
      setJob(updated);
      const labels = {
        pause: 'Paused',
        continue: 'Resumed',
        stop: 'Stopping run…',
        skip: 'Skipping current article…',
        publish: 'Continuing publish…',
      };
      if (labels[action]) toast(labels[action], { icon: 'ℹ️' });
    } catch {
      toast.error('Could not send control command');
    }
  };

  if (!job) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-4 dark:border-primary-800 dark:bg-primary-950/40">
        <Spinner />
        <span className="text-sm font-medium">Starting {periodLabel || 'auto-share'}…</span>
      </div>
    );
  }

  const pct = job.total ? Math.round((job.done / job.total) * 100) : 0;
  const running = job.status === 'running';
  const paused = job.currentPhase === 'paused';
  const showControls = running || paused;

  const btn =
    'rounded-lg px-2.5 py-1 text-xs font-medium border border-primary-300 bg-white hover:bg-primary-100 dark:border-primary-700 dark:bg-primary-900/40 dark:hover:bg-primary-900';

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-4 dark:border-primary-800 dark:bg-primary-950/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {running ? <Spinner /> : null}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
              {running
                ? `${job.periodLabel || periodLabel}: ${job.done}/${job.total} articles`
                : job.status === 'complete'
                  ? `${job.periodLabel || periodLabel} — complete`
                  : `${job.periodLabel || periodLabel} — ${job.status}`}
            </p>
            <p className="text-xs text-primary-800/80 dark:text-primary-200/80">
              {phaseLabel(job)}
              {job.currentCategory ? ` · ${categoryLabel(job.currentCategory)}` : ''}
              {running && job.startedAt ? ` · ${formatElapsed(elapsed)} elapsed` : ''}
            </p>
            {job.currentTitle ? (
              <p className="mt-1 truncate text-xs text-primary-700/90 dark:text-primary-300/90">
                {job.currentTitle}
              </p>
            ) : null}
          </div>
        </div>
        {!showControls && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-3 py-1 text-xs font-medium text-primary-800 hover:bg-primary-100 dark:text-primary-200 dark:hover:bg-primary-900/50"
          >
            Close
          </button>
        ) : null}
      </div>

      {showControls ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {paused ? (
            <button type="button" className={btn} onClick={() => sendControl('continue')}>
              Continue
            </button>
          ) : (
            <button type="button" className={btn} onClick={() => sendControl('pause')}>
              Pause
            </button>
          )}
          <button type="button" className={btn} onClick={() => sendControl('skip')}>
            Skip this article
          </button>
          <button type="button" className={btn} onClick={() => sendControl('publish')}>
            Publish now
          </button>
          <button
            type="button"
            className="rounded-lg border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
            onClick={() => sendControl('stop')}
          >
            Stop run
          </button>
        </div>
      ) : null}

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-primary-200/60 dark:bg-primary-900/60">
        <div
          className="h-full rounded-full bg-primary-700 transition-all duration-500 dark:bg-primary-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-primary-800/80 dark:text-primary-200/80">
        <span>{job.featured ?? 0} featured</span>
        <span>{job.published ?? 0} published</span>
        <span>{job.failed ?? 0} failed</span>
        {job.skippedCount ? <span>{job.skippedCount} skipped</span> : null}
        {job.categoryIndex ? (
          <span>
            Category {job.categoryIndex}/{job.categoryCount}
          </span>
        ) : null}
        {job.rateLimited ? <span className="text-amber-700 dark:text-amber-400">Rate limited — slowing down</span> : null}
      </div>

      {job.categoryBreakdown?.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {job.categoryBreakdown.map((b) => (
            <span
              key={b.category}
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                b.featured + b.published >= b.requested
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                  : job.currentCategory === b.category && running
                    ? 'bg-primary-200 text-primary-900 dark:bg-primary-800 dark:text-primary-100'
                    : 'bg-white/70 text-primary-800 dark:bg-primary-900/30 dark:text-primary-200'
              }`}
            >
              {categoryLabel(b.category)} {b.featured + b.published}/{b.requested}
            </span>
          ))}
        </div>
      ) : null}

      {job.summary && !showControls ? (
        <p className="mt-2 text-xs text-primary-800/70 dark:text-primary-200/70">{job.summary}</p>
      ) : null}
    </div>
  );
}
