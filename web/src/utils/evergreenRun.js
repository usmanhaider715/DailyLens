import { api } from '@/services/api';

export async function startEvergreenRun(category = null) {
  const { data } = await api.post('/admin/evergreen/run', category ? { category } : {});
  return data;
}

export async function getEvergreenRunStatus(jobId) {
  const { data } = await api.get(`/admin/evergreen/run-status/${jobId}`);
  return data;
}

export async function controlEvergreenRun(jobId, action) {
  const { data } = await api.post(`/admin/evergreen/run-status/${jobId}/control`, { action });
  return data;
}

export async function getEvergreenActiveJob() {
  const { data } = await api.get('/admin/evergreen/active-job');
  return data.job;
}

export function pollEvergreenRun(jobId, { onProgress, intervalMs = 4000 } = {}) {
  return new Promise((resolve, reject) => {
    let stopped = false;
    let rateLimitHits = 0;

    const tick = async () => {
      if (stopped) return;
      try {
        const job = await getEvergreenRunStatus(jobId);
        rateLimitHits = 0;
        onProgress?.(job);
        if (['complete', 'error', 'stopped', 'partial'].includes(job.status)) {
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

export function evergreenPhaseLabel(job) {
  switch (job?.currentPhase) {
    case 'starting':
      return 'Starting pipeline…';
    case 'ideating':
      return 'Generating topic ideas';
    case 'deduping':
      return 'Checking for duplicate topics';
    case 'writing':
      return 'Writing article';
    case 'imaging':
      return 'Finding hero image';
    case 'saving':
      return 'Saving article';
    case 'waiting_gap':
      return `Waiting ${job.waitingSeconds || 0}s before next article`;
    case 'waiting_rate_limit':
      return `AI rate limit — waiting ${job.waitingSeconds || 0}s`;
    case 'paused':
      return 'Paused — click Continue to resume';
    case 'stopping':
      return 'Stopping…';
    case 'stopped':
      return 'Stopped by user';
    case 'complete':
      return 'Run complete';
    case 'partial':
      return 'Run finished with errors';
    case 'error':
      return 'Run failed';
    default:
      return 'Processing…';
  }
}
