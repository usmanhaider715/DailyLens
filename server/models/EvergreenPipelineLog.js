import mongoose from 'mongoose';

const evergreenPipelineLogSchema = new mongoose.Schema(
  {
    runId: { type: String, required: true, index: true },
    triggeredBy: { type: String, enum: ['schedule', 'manual', 'category'], default: 'schedule' },
    startedAt: { type: Date, default: Date.now },
    finishedAt: Date,
    status: { type: String, enum: ['running', 'success', 'partial', 'failed'], default: 'running' },
    categoriesRun: [String],
    articlesGenerated: { type: Number, default: 0 },
    articlesPending: { type: Number, default: 0 },
    articlesPublished: { type: Number, default: 0 },
    duplicatesRejected: { type: Number, default: 0 },
    failureMessages: [String],
    tokenUsage: {
      inputTokens: { type: Number, default: 0 },
      outputTokens: { type: Number, default: 0 },
    },
    tokenCostUsd: { type: Number, default: 0 },
    details: [
      {
        category: String,
        title: String,
        slug: String,
        action: String,
        reviewStatus: String,
      },
    ],
  },
  { timestamps: true },
);

evergreenPipelineLogSchema.index({ createdAt: -1 });

export const EvergreenPipelineLog = mongoose.model('EvergreenPipelineLog', evergreenPipelineLogSchema);
