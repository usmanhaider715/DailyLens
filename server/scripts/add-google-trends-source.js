import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { NewsSource } from '../models/NewsSource.js';
import { logger } from '../utils/logger.js';

/**
 * Idempotently adds the "Google Trends USA" auto-share source so it appears as
 * a selectable checkbox in the admin Auto-share panel. Safe to run repeatedly.
 *
 *   node scripts/add-google-trends-source.js
 */
async function run() {
  await connectDB(process.env.MONGODB_URI);
  const res = await NewsSource.findOneAndUpdate(
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
  logger.info(`Google Trends USA source ready: ${res._id}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  logger.error('add-google-trends-source failed:', err);
  process.exit(1);
});
