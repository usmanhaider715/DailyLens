import { api } from '@/services/api';

export async function startIdeaBatchRun({ ideasText, category }) {
  const { data } = await api.post('/admin/idea-batch/start', { ideasText, category });
  return data;
}

export async function getIdeaBatchRunStatus(jobId) {
  const { data } = await api.get(`/admin/idea-batch/run-status/${jobId}`);
  return data;
}

export async function controlIdeaBatchRun(jobId, action) {
  const { data } = await api.post(`/admin/idea-batch/run-status/${jobId}/control`, { action });
  return data;
}

export async function getIdeaBatchActiveJob() {
  const { data } = await api.get('/admin/idea-batch/active-job');
  return data.job;
}

export function pollIdeaBatchRun(jobId, { onProgress, intervalMs = 4000 } = {}) {
  return new Promise((resolve, reject) => {
    let stopped = false;
    let rateLimitHits = 0;

    const tick = async () => {
      if (stopped) return;
      try {
        const job = await getIdeaBatchRunStatus(jobId);
        rateLimitHits = 0;
        onProgress?.(job);
        if (
          job.status === 'complete' ||
          job.status === 'error' ||
          job.status === 'stopped'
        ) {
          stopped = true;
          resolve(job);
          return;
        }
        setTimeout(tick, intervalMs);
      } catch (err) {
        if (err?.response?.status === 429 && rateLimitHits < 8) {
          rateLimitHits += 1;
          setTimeout(tick, intervalMs * 2);
          return;
        }
        stopped = true;
        reject(err);
      }
    };

    tick();
  });
}

export function ideaPhaseLabel(job) {
  switch (job?.currentPhase) {
    case 'starting':
      return 'Starting batch…';
    case 'generating':
      return 'Writing article draft';
    case 'waiting_gap':
      return `Waiting ${job.waitingSeconds || 0}s before next idea`;
    case 'waiting_rate_limit':
      return `AI rate limit — waiting ${job.waitingSeconds || 0}s`;
    case 'paused':
      return 'Paused — click Continue to resume';
    case 'stopping':
      return 'Stopping…';
    case 'stopped':
      return 'Stopped by user';
    case 'complete':
      return 'Batch complete';
    case 'error':
      return 'Batch failed';
    default:
      return 'Processing…';
  }
}
