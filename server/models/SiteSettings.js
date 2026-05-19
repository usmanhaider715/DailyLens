import mongoose from 'mongoose';

const siteSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'default', unique: true },
    fetchInterval: {
      type: String,
      enum: ['5min', '15min', '30min', '1hr'],
      default: '15min',
    },
    articleTone: {
      type: String,
      enum: ['Formal', 'Neutral', 'Engaging', 'Tabloid'],
      default: 'Neutral',
    },
    minWordCount: { type: Number, default: 500 },
    maxWordCount: { type: Number, default: 800 },
    generateAiImages: { type: Boolean, default: true },
    activeCategories: [{ type: String }],
    disabledSourceIds: [{ type: mongoose.Schema.Types.ObjectId }],
    homepageHeroMode: {
      type: String,
      enum: ['featured', 'live_match', 'weather'],
      default: 'featured',
    },
    homepageWeatherRegion: {
      type: String,
      enum: ['usa', 'uk'],
      default: 'usa',
    },
    homepageLiveMatchId: { type: String, default: null },
    homepageLiveMatchLeague: {
      type: String,
      enum: ['cricket', 'soccer', 'nfl', 'nba', 'mlb'],
      default: 'cricket',
    },
  },
  { timestamps: true }
);

export const SiteSettings = mongoose.model('SiteSettings', siteSettingsSchema);

export async function getSiteSettings() {
  let doc = await SiteSettings.findOne({ key: 'default' });
  if (!doc) {
    doc = await SiteSettings.create({ key: 'default' });
  }
  return doc;
}
