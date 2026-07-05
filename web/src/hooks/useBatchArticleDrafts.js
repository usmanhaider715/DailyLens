'use client';

import { useCallback, useRef, useState } from 'react';
import {
  BATCH_STATUS,
  createQueueItems,
  generateDraftFromStory,
  heroPreviewUrl,
  isActiveStatus,
  preloadImage,
  publishDraft,
} from '@/utils/batchDraftQueue';

export function useBatchArticleDrafts() {
  const [items, setItems] = useState([]);
  const [running, setRunning] = useState(false);
  const abortMap = useRef(new Map());
  const stopAllRef = useRef(false);
  const cancelledIds = useRef(new Set());

  const patchItem = useCallback((id, patch) => {
    setItems((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  }, []);

  const cancelItem = useCallback((id) => {
    cancelledIds.current.add(id);
    abortMap.current.get(id)?.abort();
    abortMap.current.delete(id);
    setItems((prev) =>
      prev.map((row) =>
        row.id === id && (isActiveStatus(row.status) || row.status === BATCH_STATUS.QUEUED)
          ? { ...row, status: BATCH_STATUS.CANCELLED }
          : row
      )
    );
  }, []);

  const cancelAll = useCallback(() => {
    stopAllRef.current = true;
    abortMap.current.forEach((ctrl) => ctrl.abort());
    abortMap.current.clear();
    setItems((prev) =>
      prev.map((row) =>
        isActiveStatus(row.status) || row.status === BATCH_STATUS.QUEUED
          ? { ...row, status: BATCH_STATUS.CANCELLED }
          : row
      )
    );
    setRunning(false);
  }, []);

  const processOne = useCallback(
    async (row) => {
      if (stopAllRef.current) return;
      const controller = new AbortController();
      abortMap.current.set(row.id, controller);

      patchItem(row.id, { status: BATCH_STATUS.REWRITING, error: null });
      try {
        const draft = await generateDraftFromStory(row.source, controller.signal);
        if (controller.signal.aborted || stopAllRef.current) return;

        patchItem(row.id, { status: BATCH_STATUS.GENERATING_IMAGE, draft });
        const imageUrl = heroPreviewUrl(draft);
        const loaded = await preloadImage(imageUrl, controller.signal);
        if (controller.signal.aborted || stopAllRef.current) return;

        patchItem(row.id, {
          status: BATCH_STATUS.READY,
          draft,
          imageLoaded: loaded,
        });
      } catch (err) {
        if (controller.signal.aborted || err?.code === 'ERR_CANCELED') {
          patchItem(row.id, { status: BATCH_STATUS.CANCELLED });
          return;
        }
        patchItem(row.id, {
          status: BATCH_STATUS.FAILED,
          error: err?.response?.data?.message || err?.message || 'Generation failed',
        });
      } finally {
        abortMap.current.delete(row.id);
      }
    },
    [patchItem]
  );

  const startBatch = useCallback(
    async (sourceItems) => {
      stopAllRef.current = false;
      cancelledIds.current.clear();
      const queue = createQueueItems(sourceItems);
      setItems(queue);
      setRunning(true);

      for (const row of queue) {
        if (stopAllRef.current || cancelledIds.current.has(row.id)) continue;
        await processOne(row);
        await new Promise((r) => setTimeout(r, 800));
      }

      setRunning(false);
    },
    [processOne]
  );

  const publishOne = useCallback(
    async (id) => {
      const row = items.find((x) => x.id === id);
      if (!row?.draft || row.status !== BATCH_STATUS.READY) return null;
      patchItem(id, { status: BATCH_STATUS.PUBLISHING });
      try {
        const doc = await publishDraft(row.draft, row.meta);
        patchItem(id, { status: BATCH_STATUS.PUBLISHED });
        return doc;
      } catch (err) {
        patchItem(id, {
          status: BATCH_STATUS.READY,
          error: err?.response?.data?.message || 'Publish failed',
        });
        throw err;
      }
    },
    [items, patchItem]
  );

  const publishAllReady = useCallback(async () => {
    const ready = items.filter((x) => x.status === BATCH_STATUS.READY);
    let count = 0;
    for (const row of ready) {
      try {
        await publishOne(row.id);
        count += 1;
      } catch {
        /* continue with rest */
      }
    }
    return count;
  }, [items, publishOne]);

  const stats = {
    total: items.length,
    ready: items.filter((x) => x.status === BATCH_STATUS.READY).length,
    published: items.filter((x) => x.status === BATCH_STATUS.PUBLISHED).length,
    failed: items.filter((x) => x.status === BATCH_STATUS.FAILED).length,
    active: items.filter((x) => isActiveStatus(x.status)).length,
  };

  return {
    items,
    running,
    stats,
    startBatch,
    cancelItem,
    cancelAll,
    publishOne,
    publishAllReady,
    reset: () => {
      stopAllRef.current = true;
      abortMap.current.forEach((ctrl) => ctrl.abort());
      abortMap.current.clear();
      cancelledIds.current.clear();
      setItems([]);
      setRunning(false);
    },
  };
}
