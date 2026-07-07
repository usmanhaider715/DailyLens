import mongoose from 'mongoose';

const heroSchema = new mongoose.Schema(
  {
    url: String,
    cloudinaryId: String,
    alt: String,
    credit: String,
    creditUrl: String,
    source: {
      type: String,
      enum: ['original', 'generated', 'placeholder', 'upload', 'manual', 'search', 'ai', 'rss', 'feed'],
    },
    uploadFilename: String,
  },
  { _id: false }
);

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, index: true },
    slug: { type: String, unique: true, index: true },
    originalTitle: String,
    originalUrl: { type: String, unique: true, sparse: true },
    urlHash: { type: String, unique: true, index: true },
    summary: { type: String, required: true },
    body: { type: String, required: true },
    category: {
      type: String,
      enum: [
        'World',
        'Technology',
        'Business',
        'Sports',
        'Health',
        'Science',
        'Entertainment',
        'Politics',
        'Crypto',
        'Weather',
      ],
      index: true,
    },
    tags: [String],
    heroImage: heroSchema,
    featuredImage: { type: String },
    author: { type: String, default: 'AI Editorial Team' },
    source: {
      name: String,
      url: String,
    },
    seoScore: { type: Number, min: 1, max: 10 },
    readTime: Number,
    isBreaking: { type: Boolean, default: false, index: true },
    isFeatured: { type: Boolean, default: false, index: true },
    isPublished: { type: Boolean, default: true, index: true },
    isPaused: { type: Boolean, default: false, index: true },
    views: { type: Number, default: 0 },
    publishedAt: { type: Date, default: Date.now, index: true },
    /** Set when auto-share features or publishes — excluded from future auto-share runs */
    lastAutoSharedAt: { type: Date, index: true },
    aiProcessedAt: Date,
    language: { type: String, default: 'en' },
    sourceType: { type: String, enum: ['manual', 'automated'], default: 'automated' },
    forecast: {
      enabled: { type: Boolean, default: false },
      headline: String,
      body: String,
      confidence: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
    },
  },
  { timestamps: true }
);

articleSchema.index({ 'forecast.enabled': 1, publishedAt: -1 });

articleSchema.index({ title: 'text', body: 'text', tags: 'text' });
articleSchema.index({ category: 1, publishedAt: -1 });

export const Article = mongoose.model('Article', articleSchema);
