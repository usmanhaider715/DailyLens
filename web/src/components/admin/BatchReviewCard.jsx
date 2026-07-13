'use client';

import { BATCH_STATUS, STATUS_LABELS, heroPreviewUrl, isActiveStatus } from '@/utils/batchDraftQueue';
import { formatAiModelLabel } from '@/utils/formatAiModel';

const STEP_ORDER = [
  BATCH_STATUS.QUEUED,
  BATCH_STATUS.REWRITING,
  BATCH_STATUS.GENERATING_IMAGE,
  BATCH_STATUS.READY,
];

function stepIndex(status) {
  if (status === BATCH_STATUS.PUBLISHED) return 4;
  if (status === BATCH_STATUS.PUBLISHING) return 3;
  if (status === BATCH_STATUS.FAILED || status === BATCH_STATUS.CANCELLED) return -1;
  const idx = STEP_ORDER.indexOf(status);
  return idx >= 0 ? idx : 0;
}

function statusPillClass(status) {
  switch (status) {
    case BATCH_STATUS.READY:
      return 'bg-emerald-500/15 text-emerald-700 ring-emerald-500/30 dark:text-emerald-300';
    case BATCH_STATUS.PUBLISHED:
      return 'bg-primary-500/15 text-primary-700 ring-primary-500/30 dark:text-primary-300';
    case BATCH_STATUS.FAILED:
      return 'bg-red-500/15 text-red-700 ring-red-500/30 dark:text-red-300';
    case BATCH_STATUS.CANCELLED:
      return 'bg-gray-500/15 text-gray-600 ring-gray-500/30 dark:text-gray-400';
    default:
      return isActiveStatus(status)
        ? 'bg-amber-500/15 text-amber-800 ring-amber-500/30 dark:text-amber-200'
        : 'bg-gray-500/15 text-gray-600 ring-gray-500/30 dark:text-gray-400';
  }
}

export default function BatchReviewCard({ item, onCancel, onPublish, onEditInEditor, publishing }) {
  const title = item.draft?.title || item.source?.title || 'Untitled article';
  const preview = heroPreviewUrl(item.draft);
  const active = isActiveStatus(item.status);
  const step = stepIndex(item.status);
  const modelLabel = formatAiModelLabel(item.draft?.aiModelUsed, item.draft?.rewriteModel);

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200/80 bg-white shadow-sm transition hover:shadow-md dark:border-gray-700/80 dark:bg-gray-900">
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            className={`h-full w-full object-cover transition-all duration-700 ${item.imageLoaded ? 'scale-100 opacity-100' : 'scale-105 opacity-40 blur-sm'}`}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            {active ? (
              <>
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500/30 border-t-primary-600" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">{STATUS_LABELS[item.status]}</p>
              </>
            ) : (
              <p className="text-sm text-gray-500">Hero image pending</p>
            )}
          </div>
        )}

        {(active || item.status === BATCH_STATUS.GENERATING_IMAGE) && (
          <div className="absolute inset-0 flex items-end bg-gradient-to-t from-gray-900/70 via-gray-900/20 to-transparent p-3">
            <p className="text-xs font-medium text-white">{STATUS_LABELS[item.status]}</p>
          </div>
        )}

        <span
          className={`absolute right-2 top-2 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset backdrop-blur-sm ${statusPillClass(item.status)}`}
        >
          {STATUS_LABELS[item.status]}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex gap-1">
          {['Queue', 'Rewrite', 'Image', 'Ready'].map((label, i) => (
            <div
              key={label}
              className={`h-1 flex-1 rounded-full transition-colors ${
                step > i ? 'bg-primary-500' : step === i && active ? 'bg-amber-400 animate-pulse' : 'bg-gray-200 dark:bg-gray-700'
              }`}
              title={label}
            />
          ))}
        </div>

        <h3 className="line-clamp-2 font-display text-sm font-bold leading-snug text-gray-900 dark:text-white">{title}</h3>
        <p className="mt-1 line-clamp-1 text-xs text-gray-500 dark:text-gray-400">
          {item.meta?.sourceName || 'Source'}
          {modelLabel ? ` · ${modelLabel}` : active ? ' · generating…' : ''}
        </p>

        {item.error && (
          <p className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {item.error}
          </p>
        )}

        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          {active && (
            <button
              type="button"
              onClick={() => onCancel(item.id)}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
          )}

          {item.status === BATCH_STATUS.READY && (
            <>
              <button
                type="button"
                onClick={() => onEditInEditor?.(item)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={publishing}
                onClick={() => onPublish(item.id)}
                className="flex-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-60"
              >
                {publishing ? 'Publishing…' : 'Publish'}
              </button>
            </>
          )}

          {item.status === BATCH_STATUS.PUBLISHED && (
            <span className="text-xs font-semibold text-primary-600 dark:text-primary-400">Live on site</span>
          )}
        </div>
      </div>
    </article>
  );
}
