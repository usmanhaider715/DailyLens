import {
  getAutoShareConfig,
  updateAutoShareConfig,
  startAutoShareRunJob,
  getAutoShareRunJob,
  controlAutoShareRun,
  getActiveAutoShareRunJob,
} from '../services/autoShareService.js';

export async function getAutoShare(req, res, next) {
  try {
    const data = await getAutoShareConfig();
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function putAutoShare(req, res, next) {
  try {
    const data = await updateAutoShareConfig(req.body);
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function triggerAutoSharePeriod(req, res, next) {
  try {
    const result = await startAutoShareRunJob(req.params.periodId);
    res.json(result);
  } catch (e) {
    if (e.status === 404) return res.status(404).json({ message: e.message });
    if (e.status === 409) return res.status(409).json({ message: e.message, jobId: e.jobId });
    next(e);
  }
}

export async function getAutoShareRunStatus(req, res, next) {
  try {
    const job = getAutoShareRunJob(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json(job);
  } catch (e) {
    next(e);
  }
}

export async function postAutoShareRunControl(req, res, next) {
  try {
    const action = req.body?.action || req.params.action;
    const job = controlAutoShareRun(req.params.jobId, action);
    if (!job) return res.status(404).json({ message: 'Job not found or invalid action' });
    res.json(job);
  } catch (e) {
    next(e);
  }
}

export async function getAutoShareActiveJob(req, res, next) {
  try {
    const job = getActiveAutoShareRunJob();
    res.json({ job });
  } catch (e) {
    next(e);
  }
}
