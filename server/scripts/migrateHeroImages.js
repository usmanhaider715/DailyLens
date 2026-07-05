/**
 * One-time migration: download remote featuredImage URLs to /uploads/heroes/.
 * Usage: node scripts/migrateHeroImages.js
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import path from 'path';
import { Article } from '../models/Article.js';
import { persistFeaturedImageIfRemote, isLocalHeroUrl } from '../utils/persistHeroImage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI is required');
    process.exit(1);
  }

  await mongoose.connect(uri);

  const articles = await Article.find({
    $or: [
      { featuredImage: { $regex: /^https?:\/\//i } },
      { 'heroImage.url': { $regex: /^https?:\/\//i } },
    ],
  }).select('slug title featuredImage heroImage category');

  console.log(`Found ${articles.length} articles with remote hero URLs`);

  let migrated = 0;
  for (const article of articles) {
    const hint = article.slug || article.title || 'hero';
    const current = article.featuredImage?.trim() || article.heroImage?.url?.trim();
    if (!current || isLocalHeroUrl(current)) continue;

    const localUrl = await persistFeaturedImageIfRemote(current, hint);
    if (!localUrl || localUrl === current) {
      console.warn('Skipped (could not persist):', article.slug);
      continue;
    }

    await Article.updateOne(
      { _id: article._id },
      {
        $set: {
          featuredImage: localUrl,
          'heroImage.url': localUrl,
        },
      },
    );
    migrated += 1;
    console.log('Migrated:', article.slug, '->', localUrl);
  }

  console.log(`Done. Migrated ${migrated} of ${articles.length} articles.`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
