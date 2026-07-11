#!/usr/bin/env node
/**
 * Upgrade generic AI/placeholder heroes to keyword-matched Unsplash/Pexels/Wikimedia.
 * Usage: node scripts/refresh-article-images.js [--dry-run] [--limit=100]
 */
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Article } from '../models/Article.js';
import {
  resolveLicensedHeroImage,
  buildImageAttribution,
  isPublisherHostedImageUrl,
} from '../services/licensedImageService.js';
import { persistFeaturedImageIfRemote } from '../utils/persistHeroImage.js';
import { invalidateArticleCaches } from '../controllers/articleController.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dryRun = process.argv.includes('--dry-run');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 200;

const GENERIC_UNSPLASH = 'photo-1504711434969-e33886168f5c';
const LICENSED_SOURCES = new Set(['unsplash', 'pexels', 'wikimedia']);

function needsImageRefresh(article) {
  const heroUrl = article.featuredImage || article.heroImage?.url || '';
  const heroSource = String(article.imageSourceType || article.heroImage?.source || '').toLowerCase();

  if (!heroUrl) return true;

  if (isPublisherHostedImageUrl(heroUrl)) return true;
  if (heroSource === 'original' || heroSource === 'rss' || heroSource === 'feed') return true;

  if (LICENSED_SOURCES.has(heroSource) && !heroUrl.includes(GENERIC_UNSPLASH)) {
    return false;
  }

  if (
    heroSource === 'ai_generated' ||
    heroSource === 'placeholder' ||
    heroSource === 'generated' ||
    heroUrl.includes(GENERIC_UNSPLASH)
  ) {
    return true;
  }

  return !LICENSED_SOURCES.has(heroSource);
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI required');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const articles = await Article.find({ isPublished: true })
    .select('title slug category heroImage featuredImage tags source imageSourceType imageAttribution')
    .sort({ updatedAt: -1 })
    .limit(limit * 3)
    .lean();

  const targets = articles.filter(needsImageRefresh).slice(0, limit);
  console.log(`Found ${targets.length} article(s) to refresh (from ${articles.length} scanned).`);

  let updated = 0;
  for (const article of targets) {
    const prev = article.featuredImage || article.heroImage?.url || '';
    console.log(`Refreshing ${article.slug}…`);

    if (dryRun) {
      updated += 1;
      continue;
    }

    try {
      const licensed = await resolveLicensedHeroImage({
        title: article.title,
        category: article.category,
        keywords: article.tags,
      });
      if (!licensed?.url) {
        console.log(`  skipped — no licensed image found`);
        continue;
      }

      const persisted = await persistFeaturedImageIfRemote(licensed.url, article.slug);
      const url = persisted || licensed.url;
      await Article.updateOne(
        { _id: article._id },
        {
          $set: {
            featuredImage: url,
            imageSourceType: licensed.source,
            imageAttribution: buildImageAttribution(licensed),
            heroImage: {
              url,
              alt: article.heroImage?.alt || article.title,
              credit: licensed.credit,
              creditUrl: licensed.creditUrl,
              source: licensed.source,
            },
          },
        },
      );
      updated += 1;
      console.log(`  → ${licensed.source}: ${licensed.credit}`);
    } catch (err) {
      logger.warn(`Refresh failed for ${article.slug}`, err.message);
      console.log(`  failed: ${err.message}`);
    }
  }

  if (!dryRun && updated > 0) {
    await invalidateArticleCaches();
  }

  console.log(`\n${dryRun ? 'Would refresh' : 'Refreshed'} ${updated} article(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
