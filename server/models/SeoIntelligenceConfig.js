import mongoose from 'mongoose';
import { EVERGREEN_CATEGORY_NAMES } from './EvergreenConfig.js';

/**
 * SEO Intelligence Center configuration (singleton).
 *
 * This is ADDITIVE to EvergreenConfig — it stores the intelligence-layer
 * settings (per-category SEO targets, data-source toggles, topic strategy,
 * competitors) without touching the existing evergreen generation config.
 */

export const GENERATION_MODES = [
  'cluster-expansion',
  'new-topic-discovery',
  'competitor-gap',
  'search-console-recovery',
  'long-tail',
  'commercial',
  'mixed',
];

export const SEARCH_INTENTS = ['informational', 'commercial', 'transactional', 'navigational', 'mixed'];
export const PRIORITY_LEVELS = ['critical', 'high', 'medium', 'low'];

const categoryTargetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    targetMonthlyArticles: { type: Number, default: 20, min: 0 },
    targetAuthorityScore: { type: Number, default: 70, min: 0, max: 100 },
    targetKeywordDifficulty: { type: Number, default: 40, min: 0, max: 100 },
    minSearchVolume: { type: Number, default: 100, min: 0 },
    targetSearchIntent: { type: String, enum: SEARCH_INTENTS, default: 'informational' },
    priorityLevel: { type: String, enum: PRIORITY_LEVELS, default: 'medium' },
  },
  { _id: false },
);

/** Every source defaults OFF; external ones only light up when credentials exist. */
const dataSourcesSchema = new mongoose.Schema(
  {
    searchConsole: { type: Boolean, default: false },
    googleTrends: { type: Boolean, default: true },
    existingArticles: { type: Boolean, default: true },
    existingCategories: { type: Boolean, default: true },
    analytics: { type: Boolean, default: true },
    competitorAnalysis: { type: Boolean, default: false },
    keywordDatabase: { type: Boolean, default: false },
    manualKeywordImport: { type: Boolean, default: true },
    csvKeywordUpload: { type: Boolean, default: true },
    googleAutocomplete: { type: Boolean, default: false },
    peopleAlsoAsk: { type: Boolean, default: false },
    relatedSearches: { type: Boolean, default: false },
  },
  { _id: false },
);

const strategySchema = new mongoose.Schema(
  {
    generationMode: { type: String, enum: GENERATION_MODES, default: 'mixed' },
    distribution: {
      existingClusters: { type: Number, default: 70, min: 0, max: 100 },
      supportingArticles: { type: Number, default: 20, min: 0, max: 100 },
      newClusters: { type: Number, default: 10, min: 0, max: 100 },
    },
  },
  { _id: false },
);

export function defaultCategoryTargets() {
  return EVERGREEN_CATEGORY_NAMES.map((name) => ({ name }));
}

const seoIntelligenceConfigSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'seo_intel_config' },
    categoryTargets: { type: [categoryTargetSchema], default: defaultCategoryTargets },
    dataSources: { type: dataSourcesSchema, default: () => ({}) },
    strategy: { type: strategySchema, default: () => ({}) },
    competitors: { type: [String], default: [] },
  },
  { timestamps: true },
);

export const SeoIntelligenceConfig = mongoose.model(
  'SeoIntelligenceConfig',
  seoIntelligenceConfigSchema,
);

export async function getSeoIntelligenceConfig() {
  let doc = await SeoIntelligenceConfig.findById('seo_intel_config').lean();
  if (!doc) {
    doc = (
      await SeoIntelligenceConfig.create({
        _id: 'seo_intel_config',
        categoryTargets: defaultCategoryTargets(),
      })
    ).toObject();
  }
  // Backfill target rows for any category added later.
  const have = new Set((doc.categoryTargets || []).map((c) => c.name));
  const missing = EVERGREEN_CATEGORY_NAMES.filter((n) => !have.has(n));
  if (missing.length) {
    doc.categoryTargets = [...(doc.categoryTargets || []), ...missing.map((name) => ({ name }))];
  }
  return doc;
}

export async function updateSeoIntelligenceConfig(updates) {
  return SeoIntelligenceConfig.findByIdAndUpdate(
    'seo_intel_config',
    { $set: updates },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();
}

/** Category target lookup with sane fallback so services never crash. */
export function targetForCategory(config, name) {
  return (
    (config?.categoryTargets || []).find((c) => c.name === name) || {
      name,
      targetMonthlyArticles: 20,
      targetAuthorityScore: 70,
      targetKeywordDifficulty: 40,
      minSearchVolume: 100,
      targetSearchIntent: 'informational',
      priorityLevel: 'medium',
    }
  );
}
