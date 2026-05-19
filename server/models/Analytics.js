import mongoose from 'mongoose';

const analyticsSchema = new mongoose.Schema({
  articleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Article' },
  date: { type: Date, index: true },
  views: Number,
  uniqueViews: Number,
  avgReadTime: Number,
  shares: Number,
  source: {
    direct: Number,
    search: Number,
    social: Number,
  },
});

export const Analytics = mongoose.model('Analytics', analyticsSchema);
