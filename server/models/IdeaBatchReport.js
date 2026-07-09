import mongoose from 'mongoose';

const ideaBatchItemSchema = new mongoose.Schema(
  {
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' },
    idea: String,
    title: String,
    slug: String,
    category: String,
    action: { type: String, enum: ['draft', 'skipped', 'failed'] },
  },
  { _id: false }
);

const ideaBatchReportSchema = new mongoose.Schema(
  {
    batchId: { type: String, required: true, index: true },
    category: String,
    status: { type: String, enum: ['success', 'partial', 'failed'], default: 'partial' },
    requestedCount: { type: Number, default: 0 },
    draftCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    skippedCount: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    items: [ideaBatchItemSchema],
    errorMessages: [String],
    summary: String,
    triggeredBy: { type: String, enum: ['manual'], default: 'manual' },
  },
  { timestamps: true }
);

ideaBatchReportSchema.index({ createdAt: -1 });

export const IdeaBatchReport = mongoose.model('IdeaBatchReport', ideaBatchReportSchema);
