import mongoose from 'mongoose';

const authorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, unique: true, index: true },
    bio: { type: String, default: '' },
    avatar: { type: String, default: '' },
    role: { type: String, default: 'Editor' },
    /** Job title used for E-E-A-T / Person schema (e.g. "Technology Editor"). */
    title: { type: String, default: '' },
    /** Short expertise tags shown on the author page. */
    expertise: { type: [String], default: [] },
    /** Topics this author covers — powers schema.org Person.knowsAbout. */
    knowsAbout: { type: [String], default: [] },
    /** Free-text professional credentials / experience statement. */
    credentials: { type: String, default: '' },
    education: { type: String, default: '' },
    location: { type: String, default: '' },
    /** Year the author/team started covering topics (for "X years covering..."). */
    startedYear: { type: Number },
    email: { type: String, default: '' },
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
    title: 'News Desk — Editorial Team',
    bio: 'The Daily Lens Desk produces breaking news coverage, analysis, and explainers across world news, sports, weather, and technology. Stories are researched from public sources, fact-checked against the original reporting, and rewritten for clarity.',
    credentials:
      'A multi-topic editorial desk following global news wires and public filings, with every quote verified against the original source before publication.',
    expertise: ['Breaking news', 'World affairs', 'Technology', 'Business', 'Sports'],
    knowsAbout: ['World news', 'Technology', 'Business', 'Sports', 'Politics', 'Science'],
    startedYear: 2024,
    isDefault: true,
  },
  {
    name: 'The Daily Lens Guides',
    slug: 'the-daily-lens-guides',
    role: 'Guides & Explainers Team',
    title: 'Evergreen Guides Editor',
    bio: 'The Daily Lens Guides team writes in-depth, evergreen how-to guides and explainers across personal finance, insurance, legal basics, health, and technology. Guides in sensitive categories are held for editorial review before publishing.',
    credentials:
      'Long-form explainer team specialising in reader-first, plain-language guides. Money, insurance, legal and health guides carry clear "general information, not professional advice" disclaimers and are editorially reviewed.',
    expertise: ['Personal finance', 'Insurance', 'Legal basics', 'Health', 'How-to guides'],
    knowsAbout: ['Personal finance', 'Insurance', 'Legal information', 'Health', 'Technology'],
    startedYear: 2024,
    isDefault: false,
  },
  {
    name: 'The Daily Lens Weather Team',
    slug: 'the-daily-lens-weather-team',
    role: 'Weather Editor',
    title: 'Weather Editor',
    bio: 'Forecasts and weather analysis for US states, UK cities, and major Asian metros using Open-Meteo data and editorial summaries.',
    credentials:
      'Weather desk producing location forecasts and plain-language analysis from Open-Meteo model data. For information only — not for safety-critical decisions.',
    expertise: ['Weather forecasting', 'Severe weather', 'Climate context'],
    knowsAbout: ['Weather', 'Forecasting', 'Climate'],
    startedYear: 2024,
    isDefault: false,
  },
];

/**
 * Upsert the built-in authors. Descriptive/authority fields are refreshed on
 * every boot (so E-E-A-T data stays current) while name/bio/role are only set
 * on insert to preserve any admin edits.
 */
export async function ensureDefaultAuthors() {
  for (const a of DEFAULT_AUTHORS) {
    const { name, slug, role, bio, isDefault, ...authority } = a;
    await Author.updateOne(
      { slug },
      {
        $set: authority,
        $setOnInsert: { name, slug, role, bio, isDefault },
      },
      { upsert: true },
    );
  }
}
