import {
  getIdeaBatchConfig,
  startIdeaBatchJob,
  getIdeaBatchRunJob,
  controlIdeaBatchRun,
  getActiveIdeaBatchRunJob,
  listIdeaDrafts,
  bulkPublishDrafts,
  bulkDeleteDrafts,
} from '../services/ideaBatchService.js';

export async function getIdeaBatch(req, res, next) {
  try {
    const data = await getIdeaBatchConfig();
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function postIdeaBatchStart(req, res, next) {
  try {
    const result = await startIdeaBatchJob({
      ideasText: req.body?.ideasText,
      category: req.body?.category || 'Entertainment',
    });
    res.json(result);
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ message: e.message });
    if (e.status === 409) return res.status(409).json({ message: e.message, jobId: e.jobId });
    next(e);
  }
}

export async function getIdeaBatchRunStatus(req, res, next) {
  try {
    const job = getIdeaBatchRunJob(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (e) {
    next(e);
  }
}

export async function getIdeaBatchActiveJob(req, res, next) {
  try {
    const job = getActiveIdeaBatchRunJob();
    res.json({ job });
  } catch (e) {
    next(e);
  }
}

export async function postIdeaBatchRunControl(req, res, next) {
  try {
    const action = req.body?.action || req.params.action;
    const job = controlIdeaBatchRun(req.params.jobId, action);
    if (!job) return res.status(404).json({ message: 'Job not found or invalid action' });
    res.json(job);
  } catch (e) {
    next(e);
  }
}

export async function getIdeaDrafts(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 50);
    const batchId = req.query.batchId;
    const evergreen = req.query.evergreen === '1' || req.query.evergreen === 'true';
    const data = await listIdeaDrafts({ page, limit, batchId, evergreen });
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function postBulkPublishDrafts(req, res, next) {
  try {
    const ids = req.body?.ids || [];
    const data = await bulkPublishDrafts(ids);
    res.json(data);
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ message: e.message });
    next(e);
  }
}

export async function postBulkDeleteDrafts(req, res, next) {
  try {
    const ids = req.body?.ids || [];
    const data = await bulkDeleteDrafts(ids);
    res.json(data);
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ message: e.message });
    next(e);
  }
}
