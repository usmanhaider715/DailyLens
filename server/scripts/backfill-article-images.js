#!/usr/bin/env node
/**
 * Backfill hero images (and strip AI placeholder text) for existing articles.
 *
 * Image priority, matching editorial policy:
 *   1. Original source image (OG/twitter image from the source URL), downloaded + stored locally
 *   2. Unsplash / Pexels
 *   3. Google Images (Creative Commons / free-use) + Wikimedia Commons
 *   4. AI-generated (Pollinations) — last resort
 *
 * Also removes leftover editor placeholders like "(Note: insert a link here)".
 *
 * Usage:
 *   node scripts/backfill-article-images.js [--dry-run] [--limit=200] [--images-only] [--text-only]
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
import { fetchOgImage } from '../services/imageDiscoveryService.js';
import { isUsableImageUrl, isRejectedHeroImageUrl } from '../utils/heroImageUtils.js';
import { persistFeaturedImageIfRemote } from '../utils/persistHeroImage.js';
import { stripEditorPlaceholders, bodyHasEditorPlaceholder } from '../utils/stripEditorPlaceholders.js';
import { invalidateArticleCaches } from '../controllers/articleController.js';
import { logger } from '../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dryRun = process.argv.includes('--dry-run');
const imagesOnly = process.argv.includes('--images-only');
const textOnly = process.argv.includes('--text-only');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const limit = limitArg ? Number(limitArg.split('=')[1]) : 200;

const GENERIC_UNSPLASH = 'photo-1504711434969-e33886168f5c';
const LICENSED_SOURCES = new Set(['unsplash', 'pexels', 'wikimedia', 'google_images']);

function needsImageBackfill(article) {
  const heroUrl = article.featuredImage || article.heroImage?.url || '';
  const heroSource = String(article.imageSourceType || article.heroImage?.source || '').toLowerCase();

  if (!heroUrl) return true;
  if (heroUrl.includes(GENERIC_UNSPLASH)) return true;
  if (isPublisherHostedImageUrl(heroUrl)) return true;
  if (['placeholder', 'generated', 'original', 'rss', 'feed'].includes(heroSource)) return true;
  if (LICENSED_SOURCES.has(heroSource)) return false;
  // ai_generated or unknown → treat as needing a real photo.
  return true;
}

function sourceUrlFor(article) {
  const candidates = [article.source?.url, article.originalUrl];
  for (const c of candidates) {
    const url = String(c || '').trim();
    if (/^https?:\/\//i.test(url)) return url;
  }
  return null;
}

/** Try the original source image first, then the licensed fallback chain. */
async function resolveBackfillHero(article) {
  const srcUrl = sourceUrlFor(article);
  if (srcUrl) {
    try {
      const og = await fetchOgImage(srcUrl);
      if (og && isUsableImageUrl(og) && !isRejectedHeroImageUrl(og)) {
        return {
          url: og,
          credit: article.source?.name || 'Original publisher',
          creditUrl: srcUrl,
          source: 'original',
          license: 'Original source',
        };
      }
    } catch {
      /* fall through to licensed chain */
    }
  }

  return resolveLicensedHeroImage({
    title: article.title,
    category: article.category,
    keywords: article.tags,
  });
}

async function backfillImages(scanned) {
  const targets = scanned.filter(needsImageBackfill).slice(0, limit);
  console.log(`\n[images] ${targets.length} article(s) need an image (from ${scanned.length} scanned).`);

  let updated = 0;
  for (const article of targets) {
    console.log(`  ${article.slug}…`);
    if (dryRun) {
      updated += 1;
      continue;
    }

    try {
      const hero = await resolveBackfillHero(article);
      if (!hero?.url) {
        console.log('    skipped — no image found');
        continue;
      }

      const persisted = await persistFeaturedImageIfRemote(hero.url, article.slug);
      const url = persisted || hero.url;

      await Article.updateOne(
        { _id: article._id },
        {
          $set: {
            featuredImage: url,
            imageSourceType: hero.source,
            imageAttribution: buildImageAttribution(hero),
            heroImage: {
              url,
              alt: article.heroImage?.alt || article.title,
              credit: hero.credit,
              creditUrl: hero.creditUrl,
              source: hero.source,
            },
          },
        },
      );
      updated += 1;
      console.log(`    → ${hero.source}: ${hero.credit}`);
    } catch (err) {
      logger.warn(`Image backfill failed for ${article.slug}`, err.message);
      console.log(`    failed: ${err.message}`);
    }
  }
  return updated;
}

async function cleanPlaceholders(scanned) {
  const targets = scanned.filter((a) => bodyHasEditorPlaceholder(a.body)).slice(0, limit);
  console.log(`\n[text] ${targets.length} article(s) contain placeholder/editor-note text.`);

  let updated = 0;
  for (const article of targets) {
    const cleaned = stripEditorPlaceholders(article.body);
    if (cleaned === article.body) continue;
    console.log(`  ${article.slug}…`);
    if (dryRun) {
      updated += 1;
      continue;
    }
    await Article.updateOne({ _id: article._id }, { $set: { body: cleaned } });
    updated += 1;
  }
  return updated;
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI required');
    process.exit(1);
  }

  await mongoose.connect(uri);

  const scanned = await Article.find({ isPublished: true })
    .select('title slug category body heroImage featuredImage tags source originalUrl imageSourceType')
    .sort({ updatedAt: -1 })
    .limit(limit * 3)
    .lean();

  let imageUpdates = 0;
  let textUpdates = 0;

  if (!textOnly) imageUpdates = await backfillImages(scanned);
  if (!imagesOnly) textUpdates = await cleanPlaceholders(scanned);

  if (!dryRun && (imageUpdates > 0 || textUpdates > 0)) {
    await invalidateArticleCaches();
  }

  console.log(
    `\n${dryRun ? 'Would update' : 'Updated'} ${imageUpdates} image(s) and ${textUpdates} body text(s).`,
  );
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
