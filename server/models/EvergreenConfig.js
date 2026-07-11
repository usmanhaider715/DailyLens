import mongoose from 'mongoose';

export const EVERGREEN_CATEGORY_NAMES = [
  'Finance',
  'Insurance',
  'Legal',
  'Technology',
  'Health',
  'Business',
  'Entertainment',
];

export const DEFAULT_RPM_TIERS = {
  Finance: '$15–25',
  Insurance: '$20–35',
  Legal: '$18–30',
  Technology: '$8–15',
  Health: '$12–20',
  Business: '$10–18',
  Entertainment: '$6–12',
};

export function defaultEvergreenCategories() {
  return [
    { name: 'Finance', enabled: true, articlesPerDay: 2, requireApproval: true },
    { name: 'Insurance', enabled: true, articlesPerDay: 1, requireApproval: true },
    { name: 'Legal', enabled: true, articlesPerDay: 1, requireApproval: true },
    { name: 'Technology', enabled: true, articlesPerDay: 2, requireApproval: false },
    { name: 'Health', enabled: true, articlesPerDay: 1, requireApproval: true },
    { name: 'Business', enabled: true, articlesPerDay: 2, requireApproval: false },
    { name: 'Entertainment', enabled: true, articlesPerDay: 2, requireApproval: false },
  ];
}

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    articlesPerDay: { type: Number, default: 1, min: 0, max: 10 },
    requireApproval: { type: Boolean, default: true },
  },
  { _id: false },
);

const evergreenConfigSchema = new mongoose.Schema(
  {
    _id: { type: String, default: 'evergreen_config' },
    enabled: { type: Boolean, default: true },
    runTime: { type: String, default: '06:00' },
    timezone: { type: String, default: 'Asia/Karachi' },
    lastRunDate: { type: String, default: '' },
    categories: { type: [categorySchema], default: defaultEvergreenCategories },
  },
  { timestamps: true },
);

export const EvergreenConfig = mongoose.model('EvergreenConfig', evergreenConfigSchema);

export async function getEvergreenConfig() {
  let doc = await EvergreenConfig.findById('evergreen_config').lean();
  if (!doc) {
    doc = (
      await EvergreenConfig.create({
        _id: 'evergreen_config',
        categories: defaultEvergreenCategories(),
      })
    ).toObject();
  }
  return doc;
}

export async function updateEvergreenConfig(updates) {
  const doc = await EvergreenConfig.findByIdAndUpdate(
    'evergreen_config',
    { $set: updates },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();
  return doc;
}
