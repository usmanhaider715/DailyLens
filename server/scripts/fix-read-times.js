/**
 * One-off: fix articles where readTime was saved as word count (e.g. 550 → 3 min).
 * Usage: node scripts/fix-read-times.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Article } from '../models/Article.js';
import { parseReadTimeMinutes } from '../utils/seoArticleNormalize.js';

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const candidates = await Article.find({ readTime: { $gt: 20 } })
    .select('_id title readTime body')
    .lean();

  let updated = 0;
  for (const doc of candidates) {
    const fixed = parseReadTimeMinutes(doc.readTime, doc.body);
    if (fixed !== doc.readTime) {
      await Article.updateOne({ _id: doc._id }, { $set: { readTime: fixed } });
      updated += 1;
      console.log(`${doc.title?.slice(0, 50)}: ${doc.readTime} → ${fixed} min`);
    }
  }

  console.log(`Done. Updated ${updated} of ${candidates.length} candidates.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
