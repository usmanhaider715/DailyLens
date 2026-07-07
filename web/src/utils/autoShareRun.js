import { api } from '@/services/api';

export async function startAutoShareRun(periodId) {
  const { data } = await api.post(`/admin/auto-share/run/${periodId}`);
  return data;
}

export async function getAutoShareRunStatus(jobId) {
  const { data } = await api.get(`/admin/auto-share/run-status/${jobId}`);
  return data;
}

export async function controlAutoShareRun(jobId, action) {
  const { data } = await api.post(`/admin/auto-share/run-status/${jobId}/control`, { action });
  return data;
}

export function pollAutoShareRun(jobId, { onProgress, intervalMs = 4000 } = {}) {
  return new Promise((resolve, reject) => {
    let stopped = false;
    let rateLimitHits = 0;

    const tick = async () => {
      if (stopped) return;
      try {
        const job = await getAutoShareRunStatus(jobId);
        rateLimitHits = 0;
        onProgress?.(job);
        if (
          job.status === 'complete' ||
          job.status === 'error' ||
          job.status === 'skipped' ||
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

export function phaseLabel(job) {
  switch (job?.currentPhase) {
    case 'starting':
      return 'Starting run…';
    case 'featuring':
      return 'Featuring top articles';
    case 'publishing':
      return 'Publishing via AI (can take 1–3 min per article)';
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
    case 'error':
      return 'Run failed';
    case 'skipped':
      return 'Skipped';
    default:
      return 'Processing…';
  }
}
