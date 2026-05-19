import mongoose from 'mongoose';

const newsSourceSchema = new mongoose.Schema({
  name: String,
  type: { type: String, enum: ['api', 'rss'] },
  url: String,
  category: String,
  isActive: { type: Boolean, default: true },
  lastFetched: Date,
  articlesCount: { type: Number, default: 0 },
});

export const NewsSource = mongoose.model('NewsSource', newsSourceSchema);
