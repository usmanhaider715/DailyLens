'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useBatchArticleDrafts } from '@/hooks/useBatchArticleDrafts';
import { saveAdminDraft } from '@/utils/adminDraft';
import { BATCH_STATUS } from '@/utils/batchDraftQueue';
import BatchReviewCard from './BatchReviewCard';

export default function BatchArticleReviewPanel({ open, items: sourceItems, onClose, onPublished }) {
  const router = useRouter();
  const { items, running, stats, startBatch, cancelItem, cancelAll, publishOne, publishAllReady, reset } =
    useBatchArticleDrafts();
  const [publishingId, setPublishingId] = useState(null);
  const [publishingAll, setPublishingAll] = useState(false);
  const batchKeyRef = useRef(null);

  useEffect(() => {
    if (!open || !sourceItems?.length) return;
    const key = sourceItems.map((s) => s.url || s.title).join('|');
    if (batchKeyRef.current === key) return;
    batchKeyRef.current = key;
    startBatch(sourceItems);
  }, [open, sourceItems, startBatch]);

  useEffect(() => {
    if (!open) batchKeyRef.current = null;
  }, [open]);

  const handleClose = () => {
    if (running) {
      const ok = window.confirm('Generation is still running. Cancel all and close?');
      if (!ok) return;
      cancelAll();
    }
    reset();
    onClose?.();
  };

  const handlePublishOne = async (id) => {
    setPublishingId(id);
    try {
      const doc = await publishOne(id);
      toast.success('Article published');
      onPublished?.(doc);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Publish failed');
    } finally {
      setPublishingId(null);
    }
  };

  const handlePublishAll = async () => {
    if (!stats.ready) return;
    setPublishingAll(true);
    try {
      const count = await publishAllReady();
      toast.success(count ? `Published ${count} article${count === 1 ? '' : 's'}` : 'Nothing to publish');
      if (count) onPublished?.();
    } catch {
      toast.error('Some articles failed to publish');
    } finally {
      setPublishingAll(false);
    }
  };

  const handleEditInEditor = (item) => {
    if (!item?.draft) return;
    saveAdminDraft(item.draft, item.meta);
    router.push('/admin/articles/new');
  };

  if (!open) return null;

  const allDone = stats.published + stats.failed + items.filter((x) => x.status === BATCH_STATUS.CANCELLED).length === stats.total;

  return (
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center bg-gray-950/70 p-0 backdrop-blur-sm sm:p-4 md:p-6">
      <div className="flex h-full w-full max-w-7xl flex-col overflow-hidden rounded-none bg-white shadow-2xl dark:bg-gray-950 sm:rounded-2xl sm:h-[min(92vh,900px)]">
        <header className="border-b border-gray-200 bg-gradient-to-r from-gray-900 via-gray-900 to-primary-950 px-5 py-5 text-white dark:border-gray-800 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary-300">AI draft review</p>
              <h2 className="mt-1 font-display text-2xl font-bold sm:text-3xl">Review before publishing</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-300">
                Each article is rewritten and receives an AI hero image. Publish individually or approve the whole batch
                when ready.
              </p>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-white/20 px-3 py-2 text-sm font-medium text-white hover:bg-white/10"
            >
              Close
            </button>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <StatChip label="Total" value={stats.total} />
              <StatChip label="Ready" value={stats.ready} tone="emerald" />
              <StatChip label="Published" value={stats.published} tone="primary" />
              {stats.failed > 0 && <StatChip label="Failed" value={stats.failed} tone="red" />}
              {stats.active > 0 && <StatChip label="In progress" value={stats.active} tone="amber" pulse />}
            </div>

            <div className="ml-auto flex flex-wrap gap-2">
              {running && (
                <button
                  type="button"
                  onClick={cancelAll}
                  className="rounded-lg border border-white/25 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
                >
                  Stop all
                </button>
              )}
              <button
                type="button"
                disabled={!stats.ready || publishingAll || running}
                onClick={handlePublishAll}
                className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-900/30 hover:bg-primary-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {publishingAll ? 'Publishing…' : `Publish all ready (${stats.ready})`}
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 dark:bg-gray-950 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <BatchReviewCard
                key={item.id}
                item={item}
                onCancel={cancelItem}
                onPublish={handlePublishOne}
                onEditInEditor={handleEditInEditor}
                publishing={publishingId === item.id}
              />
            ))}
          </div>

          {!items.length && (
            <div className="flex h-48 items-center justify-center text-sm text-gray-500">Preparing batch…</div>
          )}

          {allDone && stats.ready === 0 && stats.published > 0 && (
            <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
              Batch complete. You can close this panel.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatChip({ label, value, tone = 'neutral', pulse = false }) {
  const tones = {
    neutral: 'bg-white/10 text-white',
    emerald: 'bg-emerald-500/20 text-emerald-100',
    primary: 'bg-primary-500/25 text-primary-100',
    red: 'bg-red-500/20 text-red-100',
    amber: 'bg-amber-500/20 text-amber-100',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${tones[tone]}`}>
      {pulse && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
      {label}: {value}
    </span>
  );
}
