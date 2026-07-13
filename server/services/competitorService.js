import {
  getSeoIntelligenceConfig,
  updateSeoIntelligenceConfig,
} from '../models/SeoIntelligenceConfig.js';
import { getClusterDashboard } from './clusterService.js';

/**
 * Competitor analysis (Section 8).
 *
 * Competitor-specific ranking/topic data requires an external SEO API
 * (Ahrefs/SEMrush/DataForSEO) or a crawler, which is not connected. Rather
 * than invent competitor rankings, we:
 *   - persist the competitor list (real, editable),
 *   - surface the actionable half we CAN compute: our own cluster content gaps
 *     (missing comparisons / guides / FAQs), which is where competitors
 *     typically out-rank a young site.
 * Each competitor row is flagged `requiresIntegration` for the parts that need
 * an external provider.
 */

function normalizeDomain(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');
}

export async function listCompetitors() {
  const config = await getSeoIntelligenceConfig();
  return config.competitors || [];
}

export async function setCompetitors(list) {
  const cleaned = [...new Set((list || []).map(normalizeDomain).filter(Boolean))].slice(0, 25);
  await updateSeoIntelligenceConfig({ competitors: cleaned });
  return cleaned;
}

export async function getCompetitorAnalysis() {
  const [config, clusters] = await Promise.all([
    getSeoIntelligenceConfig(),
    getClusterDashboard(),
  ]);

  // Derived, real content-gap opportunities from our own clusters.
  const contentGaps = clusters.clusters
    .filter((c) => c.completion < 100)
    .map((c) => ({
      cluster: c.title,
      slug: c.slug,
      completion: c.completion,
      missingComparisons: c.missing.comparisons,
      missingGuides: c.missing.ultimateGuides || c.missing.howTo,
      missingFaqs: c.missing.faqs,
      missingReviews: c.missing.reviews,
    }));

  const comparisonOpportunities = contentGaps.filter((g) => g.missingComparisons).map((g) => g.cluster);
  const guideOpportunities = contentGaps.filter((g) => g.missingGuides).map((g) => g.cluster);
  const faqOpportunities = contentGaps.filter((g) => g.missingFaqs).map((g) => g.cluster);

  const competitors = (config.competitors || []).map((domain) => ({
    domain,
    // These require a connected SEO data provider.
    requiresIntegration: true,
    topicsTheyRankFor: null,
    missingDailyLensTopics: null,
    note: 'Connect an SEO data provider (Ahrefs/SEMrush/DataForSEO) to pull this competitor\'s ranking topics.',
  }));

  return {
    connected: Boolean(config.dataSources?.competitorAnalysis),
    competitors,
    contentGaps,
    comparisonOpportunities,
    guideOpportunities,
    faqOpportunities,
    clusterSuggestions: contentGaps.slice(0, 10).map((g) => `Complete the "${g.cluster}" cluster (${g.completion}% done).`),
  };
}
