'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Spinner } from '../common/Spinner.jsx';
import { pollIdeaBatchRun, ideaPhaseLabel, controlIdeaBatchRun } from '@/utils/ideaBatchRun';

function formatElapsed(ms) {
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function IdeaBatchRunProgress({ jobId, onComplete, onClose }) {
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

    pollIdeaBatchRun(jobId, {
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
        if (final.status === 'complete') {
          toast.success(final.summary || 'Idea batch complete');
        } else if (final.status === 'stopped') {
          toast(final.summary || 'Batch stopped', { icon: 'ℹ️' });
        } else if (final.status === 'error') {
          toast.error(final.summary || 'Idea batch failed');
        }
      })
      .catch((err) => {
        if (cancelled || toastedRef.current) return;
        toastedRef.current = true;
        toast.error(err?.response?.data?.message || 'Could not track batch progress');
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
      const updated = await controlIdeaBatchRun(jobId, action);
      setJob(updated);
      const labels = {
        pause: 'Paused',
        continue: 'Resumed',
        stop: 'Stopping batch…',
        skip: 'Skipping current idea…',
        publish: 'Continuing…',
      };
      if (labels[action]) toast(labels[action], { icon: 'ℹ️' });
    } catch {
      toast.error('Could not send control command');
    }
  };

  if (!job) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 px-4 py-4 dark:border-violet-800 dark:bg-violet-950/40">
        <Spinner />
        <span className="text-sm font-medium">Starting idea batch…</span>
      </div>
    );
  }

  const pct = job.total ? Math.round((job.done / job.total) * 100) : 0;
  const running = job.status === 'running';
  const paused = job.currentPhase === 'paused';
  const showControls = running || paused;

  const btn =
    'rounded-lg px-2.5 py-1 text-xs font-medium border border-violet-300 bg-white hover:bg-violet-100 dark:border-violet-700 dark:bg-violet-900/40 dark:hover:bg-violet-900';

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-4 dark:border-violet-800 dark:bg-violet-950/40">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {running ? <Spinner /> : null}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-violet-900 dark:text-violet-100">
              {running
                ? `Content ideas: ${job.done}/${job.total} processed`
                : job.status === 'complete'
                  ? 'Content ideas — complete'
                  : `Content ideas — ${job.status}`}
            </p>
            <p className="text-xs text-violet-800/80 dark:text-violet-200/80">
              {ideaPhaseLabel(job)}
              {job.category ? ` · ${job.category}` : ''}
              {running && job.startedAt ? ` · ${formatElapsed(elapsed)} elapsed` : ''}
            </p>
            {job.currentTitle ? (
              <p className="mt-1 truncate text-xs text-violet-700/90 dark:text-violet-300/90">
                {job.currentTitle}
              </p>
            ) : null}
          </div>
        </div>
        {!showControls && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-3 py-1 text-xs font-medium text-violet-800 hover:bg-violet-100 dark:text-violet-200 dark:hover:bg-violet-900/50"
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

      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-violet-200/60 dark:bg-violet-900/60">
        <div
          className="h-full rounded-full bg-violet-700 transition-all duration-500 dark:bg-violet-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-violet-800/80 dark:text-violet-200/80">
        <span>{job.drafted ?? 0} drafts saved</span>
        <span>{job.failed ?? 0} failed</span>
        {job.skippedCount ? <span>{job.skippedCount} skipped</span> : null}
        {job.ideaIndex ? (
          <span>
            Idea {job.ideaIndex}/{job.total}
          </span>
        ) : null}
        {job.rateLimited ? (
          <span className="text-amber-700 dark:text-amber-400">Rate limited — slowing down</span>
        ) : null}
      </div>

      {job.summary && !showControls ? (
        <p className="mt-2 text-xs text-violet-800/70 dark:text-violet-200/70">{job.summary}</p>
      ) : null}
    </div>
  );
}
