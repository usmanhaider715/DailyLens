import mongoose from 'mongoose';

const autoShareItemSchema = new mongoose.Schema(
  {
    articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' },
    title: String,
    slug: String,
    sourceName: String,
    category: String,
    views: Number,
    action: { type: String, enum: ['featured', 'published'] },
  },
  { _id: false }
);

const categoryBreakdownSchema = new mongoose.Schema(
  {
    category: String,
    requested: { type: Number, default: 0 },
    featured: { type: Number, default: 0 },
    published: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
  },
  { _id: false }
);

const autoShareReportSchema = new mongoose.Schema(
  {
    periodId: { type: String, required: true, index: true },
    periodLabel: String,
    scheduledTimeET: String,
    runDateET: { type: String, index: true },
    status: { type: String, enum: ['success', 'partial', 'failed'], default: 'partial' },
    sourceNames: [String],
    articlesPerCategory: { type: Number, default: 5 },
    categoryCount: { type: Number, default: 0 },
    requestedCount: { type: Number, default: 0 },
    featuredCount: { type: Number, default: 0 },
    publishedCount: { type: Number, default: 0 },
    failedCount: { type: Number, default: 0 },
    durationMs: { type: Number, default: 0 },
    categoryBreakdown: [categoryBreakdownSchema],
    items: [autoShareItemSchema],
    errorMessages: [String],
    summary: String,
    triggeredBy: { type: String, enum: ['schedule', 'manual'], default: 'schedule' },
  },
  { timestamps: true }
);

autoShareReportSchema.index({ createdAt: -1 });

export const AutoShareReport = mongoose.model('AutoShareReport', autoShareReportSchema);
