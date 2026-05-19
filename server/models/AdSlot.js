import mongoose from 'mongoose';

const adSlotSchema = new mongoose.Schema({
  name: String,
  position: {
    type: String,
    enum: [
      'leaderboard-top',
      'leaderboard-bottom',
      'sidebar-top',
      'sidebar-mid',
      'in-article',
      'mobile-sticky',
    ],
  },
  type: { type: String, enum: ['adsense', 'custom'] },
  adsenseSlotId: String,
  customHtml: String,
  imageUrl: String,
  linkUrl: String,
  isActive: { type: Boolean, default: true },
  category: String,
  startDate: Date,
  endDate: Date,
  impressions: { type: Number, default: 0 },
  clicks: { type: Number, default: 0 },
},
{ timestamps: true }
);

export const AdSlot = mongoose.model('AdSlot', adSlotSchema);
