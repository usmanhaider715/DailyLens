import mongoose from 'mongoose';

const authorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true, index: true },
    bio: { type: String, default: '' },
    avatar: { type: String, default: '' },
    role: { type: String, default: 'Editor' },
    socialLinks: {
      twitter: String,
      linkedin: String,
      website: String,
    },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export const Author = mongoose.model('Author', authorSchema);

export const DEFAULT_AUTHORS = [
  {
    name: 'The Daily Lens Desk',
    slug: 'the-daily-lens-desk',
    role: 'Editorial Team',
    bio: 'The Daily Lens Desk produces breaking news coverage, analysis, and explainers across world news, sports, weather, and technology. Stories are researched from public sources and rewritten for clarity.',
    isDefault: true,
  },
  {
    name: 'The Daily Lens Weather Team',
    slug: 'the-daily-lens-weather-team',
    role: 'Weather Editor',
    bio: 'Forecasts and weather analysis for US states, UK cities, and major Asian metros using Open-Meteo data and editorial summaries.',
    isDefault: false,
  },
];

export async function ensureDefaultAuthors() {
  for (const a of DEFAULT_AUTHORS) {
    await Author.updateOne({ slug: a.slug }, { $setOnInsert: a }, { upsert: true });
  }
}
