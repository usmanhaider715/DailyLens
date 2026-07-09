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
    /** Deprecated coarse preset — superseded by country/state/city fields below */
    homepageWeatherRegion: {
      type: String,
      default: 'usa',
    },
    /** When true, homepage asks browser geolocation first for forecasts */
    homepageWeatherUseVisitorLocation: { type: Boolean, default: true },
    homepageWeatherCountry: { type: String, enum: ['us', 'uk'], default: 'us' },
    homepageWeatherState: { type: String, default: 'NY' },
    homepageWeatherCityId: { type: String, default: '' },
    homepageLiveMatchId: { type: String, default: null },
    homepageLiveMatchLeague: {
      type: String,
      enum: ['cricket', 'soccer', 'nfl', 'nba', 'mlb'],
      default: 'cricket',
    },
    /** Live crypto price chart on homepage hero column */
    homepageShowCryptoChart: { type: Boolean, default: true },
    homepageCryptoCoinId: { type: String, default: 'bitcoin' },
    /** Scheduled auto-share — articlesPerCategory for each of 10 site categories (US Eastern times) */
    autoShareEnabled: { type: Boolean, default: false },
    autoShareArticleCount: { type: Number, default: 5, min: 1, max: 20 },
    autoShareSourceIds: [{ type: mongoose.Schema.Types.ObjectId }],
    autoSharePeriods: [
      {
        id: String,
        label: String,
        hourET: { type: Number, min: 0, max: 23 },
        minuteET: { type: Number, min: 0, max: 59 },
        enabled: { type: Boolean, default: true },
      },
    ],
    /** Categories included in each auto-share run (empty = all defaults) */
    autoShareCategories: [{ type: String }],
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
