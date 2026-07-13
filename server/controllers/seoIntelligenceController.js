import {
  getSeoIntelligenceConfig,
  updateSeoIntelligenceConfig,
} from '../models/SeoIntelligenceConfig.js';
import {
  getCategoryIntelligence,
  getEvergreenAnalytics,
} from '../services/seoIntelligenceService.js';
import { getClusterDashboard, getClusterDetail } from '../services/clusterService.js';
import { getKeywordIntelligence } from '../services/keywordIntelligenceService.js';
import {
  getContentAudit,
  getRefreshCandidates,
  getInternalLinkMap,
} from '../services/contentAuditService.js';
import { getSearchConsoleOverview } from '../services/searchConsoleService.js';
import {
  getCompetitorAnalysis,
  setCompetitors,
} from '../services/competitorService.js';
import { runSeoPlan } from '../services/seoPlannerService.js';
import { getEnrichedPipelineLogs } from '../services/pipelineLogService.js';
import { startIdeaBatchJob } from '../services/ideaBatchService.js';

export async function getConfig(req, res, next) {
  try {
    res.json(await getSeoIntelligenceConfig());
  } catch (e) {
    next(e);
  }
}

export async function putConfig(req, res, next) {
  try {
    const updates = {};
    const { categoryTargets, dataSources, strategy, competitors } = req.body || {};
    if (Array.isArray(categoryTargets)) updates.categoryTargets = categoryTargets;
    if (dataSources && typeof dataSources === 'object') updates.dataSources = dataSources;
    if (strategy && typeof strategy === 'object') updates.strategy = strategy;
    if (Array.isArray(competitors)) updates.competitors = competitors;
    res.json(await updateSeoIntelligenceConfig(updates));
  } catch (e) {
    next(e);
  }
}

export async function getCategories(req, res, next) {
  try {
    res.json(await getCategoryIntelligence());
  } catch (e) {
    next(e);
  }
}

export async function getClusters(req, res, next) {
  try {
    res.json(await getClusterDashboard());
  } catch (e) {
    next(e);
  }
}

export async function getCluster(req, res, next) {
  try {
    const data = await getClusterDetail(req.params.slug);
    if (!data) return res.status(404).json({ message: 'Cluster not found' });
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function getKeywords(req, res, next) {
  try {
    res.json(await getKeywordIntelligence());
  } catch (e) {
    next(e);
  }
}

export async function getAudit(req, res, next) {
  try {
    res.json(await getContentAudit());
  } catch (e) {
    next(e);
  }
}

export async function getRefresh(req, res, next) {
  try {
    const limit = Math.min(300, parseInt(req.query.limit, 10) || 100);
    res.json(await getRefreshCandidates({ limit }));
  } catch (e) {
    next(e);
  }
}

export async function getInternalLinks(req, res, next) {
  try {
    const data = await getInternalLinkMap(req.params.slug);
    if (!data) return res.status(404).json({ message: 'Article not found' });
    res.json(data);
  } catch (e) {
    next(e);
  }
}

export async function getAnalytics(req, res, next) {
  try {
    res.json(await getEvergreenAnalytics());
  } catch (e) {
    next(e);
  }
}

export async function getSearchConsole(req, res, next) {
  try {
    res.json(await getSearchConsoleOverview());
  } catch (e) {
    next(e);
  }
}

export async function getCompetitors(req, res, next) {
  try {
    res.json(await getCompetitorAnalysis());
  } catch (e) {
    next(e);
  }
}

export async function putCompetitors(req, res, next) {
  try {
    const competitors = await setCompetitors(req.body?.competitors || []);
    res.json({ competitors });
  } catch (e) {
    next(e);
  }
}

export async function postPlan(req, res, next) {
  try {
    res.json(await runSeoPlan({ category: req.body?.category || null }));
  } catch (e) {
    next(e);
  }
}

export async function getLogs(req, res, next) {
  try {
    const limit = Math.min(50, parseInt(req.query.limit, 10) || 20);
    res.json(await getEnrichedPipelineLogs({ limit }));
  } catch (e) {
    next(e);
  }
}

/**
 * Manual topic generator (Section 15). Reuses the existing idea-batch pipeline
 * so it inherits the same progress polling + draft review — no new job infra.
 */
export async function postManualGenerate(req, res, next) {
  try {
    const { keyword, cluster, targetIntent, difficulty, commercialValue, searchVolume, category } =
      req.body || {};
    if (!keyword || !String(keyword).trim()) {
      return res.status(400).json({ message: 'A keyword or topic is required.' });
    }
    // Encode the SEO brief into the idea line so the writer has full context.
    const brief = [
      String(keyword).trim(),
      cluster ? `(cluster: ${cluster})` : '',
      targetIntent ? `(intent: ${targetIntent})` : '',
    ]
      .filter(Boolean)
      .join(' ');

    const result = await startIdeaBatchJob({
      ideasText: brief,
      category: category || cluster || 'Technology',
    });
    res.json({ ...result, brief, meta: { difficulty, commercialValue, searchVolume } });
  } catch (e) {
    if (e.status === 400) return res.status(400).json({ message: e.message });
    if (e.status === 409) return res.status(409).json({ message: e.message, jobId: e.jobId });
    next(e);
  }
}
