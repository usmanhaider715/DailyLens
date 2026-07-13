import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { NewsSource } from '../models/NewsSource.js';
import { getSiteSettings } from '../models/SiteSettings.js';
import { logger } from '../utils/logger.js';

/** Selects the Google Trends USA source in auto-share (idempotent). */
async function run() {
  await connectDB(process.env.MONGODB_URI);
  const src = await NewsSource.findOne({ url: 'google-trends-us' }).lean();
  if (!src) throw new Error('Google Trends USA source not found — run add-google-trends-source.js first');

  const settings = await getSiteSettings();
  const ids = (settings.autoShareSourceIds || []).map(String);
  if (!ids.length) {
    // Empty means "all sources" — leave as-is; the new source is already covered.
    logger.info('autoShareSourceIds empty (all sources selected) — Google Trends USA already active');
  } else if (!ids.includes(String(src._id))) {
    settings.autoShareSourceIds = [...settings.autoShareSourceIds, src._id];
    await settings.save();
    logger.info('Added Google Trends USA to autoShareSourceIds');
  } else {
    logger.info('Google Trends USA already selected in auto-share');
  }
  await mongoose.disconnect();
}

run().catch((err) => {
  logger.error('enable-google-trends-source failed:', err);
  process.exit(1);
});
