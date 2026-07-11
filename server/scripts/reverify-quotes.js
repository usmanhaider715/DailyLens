#!/usr/bin/env node
/** Re-run quote verification on published articles. Usage: node scripts/reverify-quotes.js [--slug=...] */
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Article } from '../models/Article.js';
import { verifyArticleQuotes } from '../utils/quoteVerification.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const slugArg = process.argv.find((a) => a.startsWith('--slug='));
const slugFilter = slugArg ? slugArg.split('=')[1] : null;

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  const query = { isPublished: true, ...(slugFilter ? { slug: slugFilter } : {}) };
  const articles = await Article.find(query).select('slug title body originalTitle source').limit(500).lean();

  let updated = 0;
  for (const article of articles) {
    const sourceText = article.originalTitle || article.title || '';
    const check = verifyArticleQuotes(article.body, sourceText);
    if (check.body !== article.body || check.verified !== article.verifiedQuotes) {
      await Article.updateOne(
        { _id: article._id },
        { $set: { body: check.body, verifiedQuotes: check.verified } },
      );
      updated += 1;
      console.log(`${article.slug}: verified=${check.verified}, failed=${check.failedQuotes.length}`);
    }
  }

  console.log(`Updated ${updated} article(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
