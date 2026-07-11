import {
  getEvergreenConfig,
  updateEvergreenConfig,
  defaultEvergreenCategories,
} from '../models/EvergreenConfig.js';
import {
  runEvergreenPipeline,
  listPendingEvergreen,
  approveEvergreenArticle,
  rejectEvergreenArticle,
  listEvergreenPipelineLogs,
  isEvergreenPipelineRunning,
} from '../services/evergreenPipelineService.js';

export async function getEvergreenSettings(req, res, next) {
  try {
    const config = await getEvergreenConfig();
    const pending = await listPendingEvergreen({ page: 1, limit: 5 });
    const logs = await listEvergreenPipelineLogs(20);
    res.json({
      config,
      pendingCount: pending.total,
      pendingPreview: pending.items,
      logs,
      running: isEvergreenPipelineRunning(),
    });
  } catch (e) {
    next(e);
  }
}

export async function putEvergreenSettings(req, res, next) {
  try {
    const { enabled, runTime, timezone, categories } = req.body || {};
    const updates = {};
    if (enabled !== undefined) updates.enabled = !!enabled;
    if (runTime) updates.runTime = String(runTime).slice(0, 5);
    if (timezone) updates.timezone = String(timezone).trim();
    if (Array.isArray(categories)) {
      updates.categories = categories.map((c) => ({
        name: c.name,
        enabled: !!c.enabled,
        articlesPerDay: Math.min(10, Math.max(0, Number(c.articlesPerDay) || 0)),
        requireApproval: !!c.requireApproval,
      }));
    }
    const config = await updateEvergreenConfig(updates);
    res.json({ config });
  } catch (e) {
    next(e);
  }
}

export async function postEvergreenRun(req, res, next) {
  try {
    const category = req.body?.category || null;
    const result = await runEvergreenPipeline({ triggeredBy: 'manual', categoryFilter: category });
    res.json(result);
  } catch (e) {
    if (e.status === 409) return res.status(409).json({ message: e.message });
    if (e.status === 503) return res.status(503).json({ message: e.message });
    next(e);
  }
}

export async function getEvergreenPending(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    const data = await listPendingEvergreen({ page, limit });
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function postEvergreenApprove(req, res, next) {
  try {
    const article = await approveEvergreenArticle(req.params.id, { body: req.body?.body });
    res.json({ ok: true, article });
  } catch (e) {
    if (e.status === 404) return res.status(404).json({ message: e.message });
    next(e);
  }
}

export async function postEvergreenReject(req, res, next) {
  try {
    const article = await rejectEvergreenArticle(req.params.id);
    res.json({ ok: true, article });
  } catch (e) {
    if (e.status === 404) return res.status(404).json({ message: e.message });
    next(e);
  }
}

export async function getEvergreenLogs(req, res, next) {
  try {
    const logs = await listEvergreenPipelineLogs(20);
    res.json({ logs });
  } catch (e) {
    next(e);
  }
}

export async function resetEvergreenDefaults(req, res, next) {
  try {
    const config = await updateEvergreenConfig({ categories: defaultEvergreenCategories() });
    res.json({ config });
  } catch (e) {
    next(e);
  }
}
