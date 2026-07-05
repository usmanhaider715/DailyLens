import { api } from '@/services/api';

export const MAX_BATCH = 30;

export function storyPayload(item) {
  return {
    title: item.title,
    description: item.description || '',
    content: item.content || item.description || '',
    url: item.url,
    imageUrl: item.imageUrl || '',
    sourceName: item.sourceName || 'News source',
    sourceUrl: item.sourceUrl || item.url,
    publishedAt: item.publishedAt,
    suggestedCategory: item.suggestedCategory || item.category,
  };
}

export async function startBatchPublish(items, delayMs) {
  const { data } = await api.post('/admin/ai/batch-publish', {
    items: items.map(storyPayload),
    delayMs,
  });
  return data;
}

export async function getBatchPublishStatus(jobId) {
  const { data } = await api.get(`/admin/ai/batch-publish/${jobId}`);
  return data;
}

export function pollBatchPublish(jobId, { onProgress, intervalMs = 2500 } = {}) {
  return new Promise((resolve, reject) => {
    let stopped = false;

    const tick = async () => {
      if (stopped) return;
      try {
        const job = await getBatchPublishStatus(jobId);
        onProgress?.(job);
        if (job.status === 'complete' || job.status === 'error') {
          stopped = true;
          resolve(job);
          return;
        }
        setTimeout(tick, intervalMs);
      } catch (err) {
        stopped = true;
        reject(err);
      }
    };

    tick();
  });
}

export async function runBatchPublish(items, options = {}) {
  const data = await startBatchPublish(items, options.delayMs);
  options.onStarted?.(data);
  return data.jobId;
}

export function splitRoughNotes(text) {
  return String(text || '')
    .split(/\n---+\n|\n===+\n/)
    .map((block) => block.trim())
    .filter((block) => block.length >= 80);
}
