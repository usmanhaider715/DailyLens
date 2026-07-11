#!/usr/bin/env node
/**
 * One-time dedupe: find slug-N collisions, keep earliest, 301-redirect others, delete dupes.
 * Usage: node scripts/dedupe-articles.js [--dry-run]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Article } from '../models/Article.js';
import { ArticleRedirect } from '../models/ArticleRedirect.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const dryRun = process.argv.includes('--dry-run');

function baseSlugFromCollision(slug) {
  const match = slug.match(/^(.+)-(\d+)$/);
  if (!match) return null;
  return match[1];
}

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI required');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const articles = await Article.find({}).select('slug title publishedAt createdAt').lean();
  const bySlug = new Map(articles.map((a) => [a.slug, a]));

  const groups = new Map();
  for (const article of articles) {
    const base = baseSlugFromCollision(article.slug);
    if (!base || !bySlug.has(base)) continue;
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(article);
  }

  const redirects = [];
  let deleted = 0;

  for (const [base, dupes] of groups.entries()) {
    const canonical = bySlug.get(base);
    // Always keep the base slug (no -N suffix) as the canonical URL for SEO.
    const keeper = canonical;
    const toRemove = dupes.filter((d) => d.slug !== base);

    console.log(`\nGroup "${base}": keeping ${keeper.slug}, removing ${toRemove.length}`);

    for (const dup of toRemove) {
      const fromPath = `/article/${dup.slug}`;
      const toPath = `/article/${keeper.slug}`;
      redirects.push({ from: fromPath, to: toPath, status: 301, reason: 'dedupe' });

      if (!dryRun) {
        await ArticleRedirect.updateOne(
          { fromPath },
          { $set: { toPath, statusCode: 301, reason: 'dedupe-slug-collision' } },
          { upsert: true },
        );
        await Article.deleteOne({ _id: dup._id });
      }
      deleted += 1;
      console.log(`  ${dryRun ? '[dry-run] ' : ''}redirect ${fromPath} → ${toPath}, delete ${dup.slug}`);
    }
  }

  const outPath = path.join(__dirname, '../../web/redirects.json');
  const existing = fs.existsSync(outPath) ? JSON.parse(fs.readFileSync(outPath, 'utf8')) : [];
  const merged = [...existing];
  const seen = new Set(existing.map((r) => r.from));
  for (const r of redirects) {
    if (!seen.has(r.from)) {
      merged.push(r);
      seen.add(r.from);
    }
  }

  if (!dryRun) {
    fs.writeFileSync(outPath, `${JSON.stringify(merged, null, 2)}\n`);
  }

  console.log(`\nDone. ${deleted} duplicate(s) ${dryRun ? 'would be ' : ''}removed. ${redirects.length} redirect(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
