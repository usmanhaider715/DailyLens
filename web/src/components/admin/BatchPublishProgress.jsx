'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Spinner } from '../common/Spinner.jsx';
import { pollBatchPublish } from '@/utils/batchPublish';

export function BatchPublishProgress({ jobId, onComplete, onClose }) {
  const [job, setJob] = useState(null);

  useEffect(() => {
    if (!jobId) return undefined;
    let cancelled = false;

    pollBatchPublish(jobId, {
      onProgress: (next) => {
        if (!cancelled) setJob(next);
      },
    })
      .then((final) => {
        if (cancelled) return;
        setJob(final);
        onComplete?.(final);
        if (final.published > 0) {
          toast.success(`Published ${final.published} article${final.published === 1 ? '' : 's'}`);
        }
        if (final.failed > 0) {
          toast.error(`${final.failed} article${final.failed === 1 ? '' : 's'} failed`);
        }
        if (final.skipped > 0) {
          toast(`${final.skipped} skipped (already imported)`, { icon: 'ℹ️' });
        }
      })
      .catch((err) => {
        if (!cancelled) toast.error(err?.response?.data?.message || 'Batch publish failed');
      });

    return () => {
      cancelled = true;
    };
  }, [jobId, onComplete]);

  if (!job) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 text-sm dark:border-primary-800 dark:bg-primary-950/40">
        <Spinner />
        Starting batch…
      </div>
    );
  }

  const pct = job.total ? Math.round((job.done / job.total) * 100) : 0;

  return (
    <div className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-3 dark:border-primary-800 dark:bg-primary-950/40">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          {job.status === 'running' ? <Spinner /> : null}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">
              {job.status === 'complete'
                ? 'Batch complete'
                : job.status === 'error'
                  ? 'Batch error'
                  : `Publishing ${job.done}/${job.total}`}
            </p>
            {job.current ? (
              <p className="truncate text-xs text-primary-800/80 dark:text-primary-200/80">{job.current}</p>
            ) : null}
          </div>
        </div>
        {onClose && job.status !== 'running' ? (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg px-3 py-1 text-xs font-medium text-primary-800 hover:bg-primary-100 dark:text-primary-200 dark:hover:bg-primary-900/50"
          >
            Close
          </button>
        ) : null}
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-primary-200/60 dark:bg-primary-900/60">
        <div
          className="h-full rounded-full bg-primary-700 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-primary-800/70 dark:text-primary-200/70">
        {job.published} published · {job.failed} failed · {job.skipped} skipped
        {job.rateLimited ? ' · Groq rate limit hit — slowing down' : ''}
      </p>
    </div>
  );
}
