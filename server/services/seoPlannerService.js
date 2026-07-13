import {
  evergreenClaudeChat,
  parseClaudeJson,
  isEvergreenClaudeConfigured,
} from '../lib/evergreenClaude.js';
import { getSeoIntelligenceConfig } from '../models/SeoIntelligenceConfig.js';
import { getClusterDashboard } from './clusterService.js';
import { getKeywordIntelligence } from './keywordIntelligenceService.js';
import { getContentAudit } from './contentAuditService.js';
import { getSearchConsoleOverview, isSearchConsoleConfigured } from './searchConsoleService.js';

/**
 * AI Planner (Sections 9 & 17).
 *
 * The planner NEVER invents random topics. It first gathers real signals
 * (existing clusters + gaps, keyword coverage/cannibalization, content issues,
 * and — if connected — Search Console striking-distance queries), then asks the
 * AI to rank concrete ideas by ROI with an explicit reason for each. If no AI
 * provider is configured, a deterministic rule-based plan is produced from the
 * same signals so the feature still works.
 */

const SCORE_KEYS = [
  'searchDemand',
  'commercialValue',
  'authority',
  'evergreenScore',
  'ctrPotential',
  'internalLinking',
  'competition',
  'trafficPotential',
];

async function gatherSignals(categoryFilter) {
  const [config, clusters, keywords, audit] = await Promise.all([
    getSeoIntelligenceConfig(),
    getClusterDashboard(),
    getKeywordIntelligence(),
    getContentAudit(),
  ]);

  let searchConsole = null;
  if (isSearchConsoleConfigured()) {
    searchConsole = await getSearchConsoleOverview();
  }

  let incompleteClusters = clusters.clusters.filter((c) => c.completion < 100);
  if (categoryFilter) {
    incompleteClusters = incompleteClusters.filter((c) => c.primaryCategory === categoryFilter);
  }

  return { config, clusters, incompleteClusters, keywords, audit, searchConsole };
}

function buildPlannerPrompt(signals, { mode }) {
  const gapLines = signals.incompleteClusters
    .slice(0, 12)
    .map((c) => {
      const missing = Object.entries(c.missing)
        .filter(([, v]) => v)
        .map(([k]) => k)
        .join(', ');
      return `- Cluster "${c.title}" (${c.primaryCategory}, ${c.completion}% complete, priority ${c.priority}) missing: ${missing || 'none'}`;
    })
    .join('\n');

  const missingKw = signals.keywords.missingKeywords
    .slice(0, 10)
    .map((m) => `- ${m.hub}: ${m.keywords.slice(0, 6).join(', ')}`)
    .join('\n');

  const cannibal = signals.keywords.cannibalization
    .slice(0, 8)
    .map((c) => `- "${c.keyword}" targeted by ${c.count} articles`)
    .join('\n');

  const strikingDistance = signals.searchConsole?.connected
    ? signals.searchConsole.rankingOpportunities
        .slice(0, 12)
        .map((q) => `- "${q.query}" at position ${q.position.toFixed(1)} with ${q.impressions} impressions`)
        .join('\n')
    : '(Search Console not connected)';

  const distribution = signals.config.strategy?.distribution || {};

  return `You are the head of SEO strategy for The Daily Lens. Recommend the highest-ROI evergreen articles to create next. You must ONLY recommend topics justified by the signals below — never generic filler.

GENERATION MODE: ${mode}
TARGET TOPIC DISTRIBUTION: ${distribution.existingClusters || 70}% existing clusters, ${distribution.supportingArticles || 20}% supporting articles, ${distribution.newClusters || 10}% new clusters.

CLUSTER GAPS (highest leverage — completing clusters builds topical authority):
${gapLines || '(clusters look complete)'}

UNCOVERED HUB KEYWORDS (content gaps):
${missingKw || '(none)'}

KEYWORD CANNIBALIZATION (consolidate, do not create more of these):
${cannibal || '(none)'}

SEARCH CONSOLE STRIKING-DISTANCE QUERIES (positions 5-20 — quick wins):
${strikingDistance}

CONTENT ISSUES: ${signals.audit.thinArticles.count} thin, ${signals.audit.oldArticles.count} stale, ${signals.audit.orphanPages.count} orphan pages.

For EACH idea, score every dimension 0-100: ${SCORE_KEYS.join(', ')}. Compute roiScore as the weighted priority. Every idea MUST include a one-sentence "why" tied to a specific signal above.

Return ONLY JSON:
{"ideas":[{"title":"","target_keyword":"","cluster":"","search_intent":"informational|commercial|transactional","priority":"high|medium|low","why":"","scores":{${SCORE_KEYS.map((k) => `"${k}":0`).join(',')}},"roiScore":0}]}
Provide 12-18 ideas, sorted by roiScore descending.`;
}

function rank(ideas) {
  const norm = (i) => ({
    title: i.title || '',
    targetKeyword: i.target_keyword || i.targetKeyword || '',
    cluster: i.cluster || '',
    searchIntent: i.search_intent || i.searchIntent || 'informational',
    priority: (i.priority || 'medium').toLowerCase(),
    why: i.why || i.reason || '',
    scores: i.scores || {},
    roiScore: Number(i.roiScore) || 0,
  });
  const all = (Array.isArray(ideas) ? ideas : []).map(norm).filter((i) => i.title);
  return {
    high: all.filter((i) => i.priority === 'high').sort((a, b) => b.roiScore - a.roiScore),
    medium: all.filter((i) => i.priority === 'medium').sort((a, b) => b.roiScore - a.roiScore),
    low: all.filter((i) => i.priority === 'low').sort((a, b) => b.roiScore - a.roiScore),
  };
}

/** Deterministic fallback plan built directly from the gap signals. */
function rulePlan(signals) {
  const ideas = [];
  for (const c of signals.incompleteClusters.slice(0, 12)) {
    const missing = Object.entries(c.missing).filter(([, v]) => v).map(([k]) => k);
    for (const type of missing.slice(0, 2)) {
      const label = {
        comparisons: `Best ${c.title} options compared`,
        faqs: `${c.title}: frequently asked questions`,
        reviews: `${c.title} reviews and recommendations`,
        buyingGuides: `${c.title} buying guide`,
        howTo: `How to get started with ${c.title}`,
        ultimateGuides: `The complete guide to ${c.title}`,
        supportingArticles: `${c.title} explained for beginners`,
      }[type] || `${c.title} guide`;
      const priority = c.priority === 'critical' || c.priority === 'high' ? 'high' : c.completion < 40 ? 'high' : 'medium';
      ideas.push({
        title: label,
        target_keyword: c.title.toLowerCase(),
        cluster: c.title,
        search_intent: type === 'buyingGuides' || type === 'reviews' ? 'commercial' : 'informational',
        priority,
        why: `Completes the "${c.title}" cluster (currently ${c.completion}%), which strengthens topical authority for this ${c.primaryCategory} silo.`,
        scores: { internalLinking: 90, authority: 80, evergreenScore: 85, searchDemand: 60, commercialValue: 50, ctrPotential: 55, competition: 50, trafficPotential: 60 },
        roiScore: 100 - c.completion,
      });
    }
  }
  return ideas;
}

export async function runSeoPlan({ category = null } = {}) {
  const signals = await gatherSignals(category);
  const mode = signals.config.strategy?.generationMode || 'mixed';

  const meta = {
    mode,
    category,
    signalsUsed: {
      incompleteClusters: signals.incompleteClusters.length,
      missingKeywordGroups: signals.keywords.missingKeywords.length,
      cannibalization: signals.keywords.cannibalization.length,
      searchConsole: Boolean(signals.searchConsole?.connected),
      contentIssues:
        signals.audit.thinArticles.count + signals.audit.oldArticles.count + signals.audit.orphanPages.count,
    },
  };

  if (!isEvergreenClaudeConfigured()) {
    return { source: 'rule-based', ...meta, plan: rank(rulePlan(signals)), model: null, costUsd: 0 };
  }

  try {
    const { content, model, costUsd } = await evergreenClaudeChat({
      purpose: 'idea',
      maxTokens: 3000,
      temperature: 0.4,
      messages: [{ role: 'user', content: buildPlannerPrompt(signals, { mode }) }],
    });
    let ideas = parseClaudeJson(content);
    if (!Array.isArray(ideas)) ideas = ideas?.ideas || [];
    if (!ideas.length) throw new Error('empty plan');
    return { source: 'ai', ...meta, plan: rank(ideas), model, costUsd: costUsd || 0 };
  } catch (err) {
    // Never leave the planner empty — fall back to the deterministic plan.
    return {
      source: 'rule-based',
      ...meta,
      plan: rank(rulePlan(signals)),
      model: null,
      costUsd: 0,
      aiError: err.message,
    };
  }
}
