import { api } from '@/services/api';
import { draftToPublishPayload } from '@/utils/adminDraft';

export const BATCH_STATUS = {
  QUEUED: 'queued',
  REWRITING: 'rewriting',
  GENERATING_IMAGE: 'generating_image',
  READY: 'ready',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PUBLISHING: 'publishing',
  PUBLISHED: 'published',
};

export const STATUS_LABELS = {
  [BATCH_STATUS.QUEUED]: 'Queued',
  [BATCH_STATUS.REWRITING]: 'Rewriting article…',
  [BATCH_STATUS.GENERATING_IMAGE]: 'Generating hero image…',
  [BATCH_STATUS.READY]: 'Ready to publish',
  [BATCH_STATUS.FAILED]: 'Failed',
  [BATCH_STATUS.CANCELLED]: 'Cancelled',
  [BATCH_STATUS.PUBLISHING]: 'Publishing…',
  [BATCH_STATUS.PUBLISHED]: 'Published',
};

export function storyMetaFromSource(source) {
  return {
    sourceName: source.sourceName || 'News source',
    sourceUrl: source.sourceUrl || source.url || '',
    originalTitle: source.title,
    publishedAt: source.publishedAt,
  };
}

export function createQueueItems(sourceItems) {
  return sourceItems.map((source, index) => ({
    id: source.url || source.id || `draft-${index}-${Date.now()}`,
    source,
    meta: storyMetaFromSource(source),
    status: BATCH_STATUS.QUEUED,
    draft: null,
    error: null,
    imageLoaded: false,
  }));
}

export async function generateDraftFromStory(source, signal) {
  const { data } = await api.post(
    '/admin/ai/generate-article',
    {
      title: source.title,
      description: source.description,
      content: source.content || source.description,
      url: source.url,
      imageUrl: source.imageUrl,
      sourceName: source.sourceName,
      sourceUrl: source.sourceUrl || source.url,
      publishedAt: source.publishedAt,
      suggestedCategory: source.suggestedCategory || source.category,
    },
    { signal, timeout: 120000 }
  );
  return data;
}

export function heroPreviewUrl(draft) {
  if (!draft) return '';
  return draft.featuredImage || draft.heroImageUrl || '';
}

export function preloadImage(url, signal) {
  if (!url) return Promise.resolve(false);
  return new Promise((resolve) => {
    const img = new Image();
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      resolve(ok);
    };
    const onAbort = () => finish(false);
    signal?.addEventListener('abort', onAbort);
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    img.referrerPolicy = 'no-referrer';
    img.src = url;
  });
}

export async function publishDraft(draft, meta) {
  const payload = draftToPublishPayload(draft, meta);
  const { data } = await api.post('/admin/articles', payload);
  return data;
}

export function isActiveStatus(status) {
  return [BATCH_STATUS.QUEUED, BATCH_STATUS.REWRITING, BATCH_STATUS.GENERATING_IMAGE, BATCH_STATUS.PUBLISHING].includes(
    status
  );
}
