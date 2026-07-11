#!/usr/bin/env node
/**
 * Replace publisher-hotlinked hero images with licensed stock / AI fallbacks.
 * Usage: node scripts/audit-article-images.js [--dry-run] [--limit=50]
 */
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Article } from '../models/Article.js';
import {
  isPublisherHostedImageUrl,
  resolveLicensedHeroImage,
  buildImageAttribution,
} from '../services/licensedImageService.js';
import { persistFeaturedImageIfRemote } from '../utils/persistHeroImage.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 200;

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI required');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const articles = await Article.find({ isPublished: true })
    .select('title slug category heroImage featuredImage tags source')
    .limit(limit)
    .lean();

  let fixed = 0;
  for (const article of articles) {
    const heroUrl = article.featuredImage || article.heroImage?.url || '';
    const sourceHost = article.source?.url ? new URL(article.source.url).hostname : '';
    const needsFix =
      isPublisherHostedImageUrl(heroUrl, [sourceHost]) ||
      article.heroImage?.source === 'original' ||
      article.heroImage?.source === 'rss' ||
      article.heroImage?.source === 'feed';

    if (!needsFix || !heroUrl) continue;

    console.log(`Fixing ${article.slug}: ${heroUrl.slice(0, 80)}…`);
    if (dryRun) {
      fixed += 1;
      continue;
    }

    try {
      const licensed = await resolveLicensedHeroImage({
        title: article.title,
        category: article.category,
        keywords: article.tags,
      });
      if (!licensed?.url) continue;

      const persisted = await persistFeaturedImageIfRemote(licensed.url, article.slug);
      const patch = {
        featuredImage: persisted || licensed.url,
        imageSourceType: licensed.source,
        imageAttribution: buildImageAttribution(licensed),
        heroImage: {
          url: persisted || licensed.url,
          alt: article.title,
          credit: licensed.credit,
          creditUrl: licensed.creditUrl,
          source: licensed.source,
        },
      };
      await Article.updateOne({ _id: article._id }, { $set: patch });
      fixed += 1;
    } catch (err) {
      logger.warn(`Failed to fix image for ${article.slug}`, err.message);
    }
  }

  console.log(`\n${dryRun ? 'Would fix' : 'Fixed'} ${fixed} article(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
