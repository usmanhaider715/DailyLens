import { AutoShareReport } from '../models/AutoShareReport.js';
import { IdeaBatchReport } from '../models/IdeaBatchReport.js';
import { getActiveAutoShareRunJob } from '../services/autoShareService.js';
import { getActiveIdeaBatchRunJob } from '../services/ideaBatchService.js';

export async function buildLastRunSummary() {
  const lines = [];

  const autoJob = getActiveAutoShareRunJob();
  if (autoJob) {
    lines.push(
      `Auto-share RUNNING: ${autoJob.periodLabel || 'manual'} — ${autoJob.done}/${autoJob.total} (${autoJob.currentPhase})`,
    );
  }

  const ideaJob = getActiveIdeaBatchRunJob();
  if (ideaJob) {
    lines.push(
      `Idea batch RUNNING: ${ideaJob.drafted || 0}/${ideaJob.total} drafts (${ideaJob.currentPhase})`,
    );
  }

  const [lastAuto, lastIdea] = await Promise.all([
    AutoShareReport.findOne().sort({ createdAt: -1 }).lean(),
    IdeaBatchReport.findOne().sort({ createdAt: -1 }).lean(),
  ]);

  if (lastAuto) {
    lines.push(
      `Last auto-share: ${lastAuto.runDateET} ${lastAuto.scheduledTimeET} — ${lastAuto.status} — ${lastAuto.summary || 'no summary'}`,
    );
  }

  if (lastIdea) {
    lines.push(
      `Last idea batch: ${new Date(lastIdea.createdAt).toISOString()} — ${lastIdea.status} — ${lastIdea.summary || 'no summary'}`,
    );
  }

  if (!lines.length) return 'No background runs recorded yet.';
  return lines.join('\n');
}
