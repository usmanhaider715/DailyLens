import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { NewsSource } from '../models/NewsSource.js';
import { getSiteSettings } from '../models/SiteSettings.js';
import { logger } from '../utils/logger.js';

/**
 * Idempotently ensures the "Google Trends USA" auto-share source exists so it
 * appears as a selectable checkbox in the admin Auto-share panel. When the
 * source is created for the first time it is also auto-selected in auto-share
 * (added to autoShareSourceIds) so it's active out of the box — but only on
 * first creation, so it never fights a later manual un-tick.
 *
 *   node scripts/add-google-trends-source.js
 */
async function run() {
  await connectDB(process.env.MONGODB_URI);

  const existing = await NewsSource.findOne({ url: 'google-trends-us' }).lean();
  const src = await NewsSource.findOneAndUpdate(
    { url: 'google-trends-us' },
    {
      name: 'Google Trends USA',
      type: 'api',
      url: 'google-trends-us',
      category: 'World',
      isActive: true,
    },
    { upsert: true, new: true }
  );
  logger.info(`Google Trends USA source ready: ${src._id}`);

  if (!existing) {
    const settings = await getSiteSettings();
    const ids = (settings.autoShareSourceIds || []).map(String);
    // Empty list means "all sources selected", so it's already covered.
    if (ids.length && !ids.includes(String(src._id))) {
      settings.autoShareSourceIds = [...settings.autoShareSourceIds, src._id];
      await settings.save();
      logger.info('Auto-selected Google Trends USA in auto-share (first-time setup)');
    }
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  logger.error('add-google-trends-source failed:', err);
  process.exit(1);
});
