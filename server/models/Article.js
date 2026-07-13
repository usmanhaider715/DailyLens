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
      enum: [
        'original',
        'generated',
        'placeholder',
        'upload',
        'manual',
        'search',
        'ai',
        'rss',
        'feed',
        'unsplash',
        'pexels',
        'wikimedia',
        'google_images',
        'ai_generated',
      ],
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
    normalizedSourceUrl: { type: String, index: true },
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
        'Gaming',
        'Politics',
        'Crypto',
        'Weather',
        'Finance',
        'Insurance',
        'Legal',
      ],
      index: true,
    },
    tags: [String],
    heroImage: heroSchema,
    featuredImage: { type: String },
    imageSourceType: {
      type: String,
      enum: [
        'unsplash',
        'pexels',
        'wikimedia',
        'google_images',
        'ai_generated',
        'original',
        'upload',
        'manual',
        'search',
        '',
      ],
      default: '',
    },
    imageAttribution: { type: String, default: '' },
    verifiedQuotes: { type: Boolean, default: false },
    rewriteModel: { type: String, enum: ['gpt', 'groq', ''], default: '' },
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
    /** Evergreen articles live in a separate admin section and cannot be bulk-deleted */
    isEvergreen: { type: Boolean, default: false, index: true },
    views: { type: Number, default: 0 },
    publishedAt: { type: Date, default: Date.now, index: true },
    /** Set when auto-share features or publishes — excluded from future auto-share runs */
    lastAutoSharedAt: { type: Date, index: true },
    aiProcessedAt: Date,
    language: { type: String, default: 'en' },
    sourceType: {
      type: String,
      enum: ['manual', 'automated', 'idea-batch', 'evergreen-pipeline'],
      default: 'automated',
    },
    ideaBatchId: { type: String, index: true },
    contentType: {
      type: String,
      enum: ['news', 'evergreen'],
      default: 'news',
      index: true,
    },
    targetKeyword: { type: String, default: '' },
    searchIntent: {
      type: String,
      enum: ['informational', 'commercial', 'transactional', ''],
      default: '',
    },
    rpmTier: { type: String, default: '' },
    reviewStatus: {
      type: String,
      enum: ['pending', 'approved', 'published', 'rejected', ''],
      default: '',
      index: true,
    },
    topicHash: { type: String, index: true, sparse: true },
    faq: [
      {
        question: String,
        answer: String,
      },
    ],
    aiModelUsed: { type: String, default: '' },
    tokenCost: { type: Number, default: 0 },
    generatedAt: { type: Date },
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
articleSchema.index({ normalizedSourceUrl: 1, publishedAt: -1 });
articleSchema.index({ contentType: 1, reviewStatus: 1, publishedAt: -1 });
articleSchema.index({ topicHash: 1, category: 1 }, { unique: true, sparse: true });

export const Article = mongoose.model('Article', articleSchema);
