import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { AdSlot } from '../models/AdSlot.js';
import { NewsSource } from '../models/NewsSource.js';
import { SiteSettings } from '../models/SiteSettings.js';
import { Article } from '../models/Article.js';
import { demoArticles } from './demoArticles.js';
import { hashUrl } from '../utils/hashUrl.js';
import { logger } from '../utils/logger.js';

const categories = [
  'World',
  'Technology',
  'Business',
  'Sports',
  'Health',
  'Science',
  'Entertainment',
  'Gaming',
  'Politics',
  'Crypto',
  'Weather',
];

const adPositions = [
  'leaderboard-top',
  'leaderboard-bottom',
  'sidebar-top',
  'sidebar-mid',
  'in-article',
  'mobile-sticky',
];

const rssSources = [
  { name: 'BBC', type: 'rss', url: 'http://feeds.bbci.co.uk/news/rss.xml', category: 'World' },
  { name: 'Reuters', type: 'rss', url: 'https://feeds.reuters.com/reuters/topNews', category: 'World' },
  { name: 'Google Trends US', type: 'rss', url: 'https://trends.google.com/trending/rss?geo=US', category: 'World' },
  { name: 'Google Trends UK', type: 'rss', url: 'https://trends.google.com/trending/rss?geo=GB', category: 'World' },
  { name: 'TechCrunch', type: 'rss', url: 'https://techcrunch.com/feed/', category: 'Technology' },
  { name: 'ESPN', type: 'rss', url: 'https://www.espn.com/espn/rss/news', category: 'Sports' },
  { name: 'CoinDesk', type: 'rss', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', category: 'Crypto' },
  { name: 'Al Jazeera', type: 'rss', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'World' },
  { name: 'Variety', type: 'rss', url: 'https://variety.com/feed/', category: 'Entertainment' },
  { name: 'Hollywood Reporter', type: 'rss', url: 'https://www.hollywoodreporter.com/feed/', category: 'Entertainment' },
  { name: 'Deadline', type: 'rss', url: 'https://deadline.com/feed/', category: 'Entertainment' },
  { name: 'Rolling Stone', type: 'rss', url: 'https://www.rollingstone.com/feed/', category: 'Entertainment' },
  { name: 'Entertainment Weekly', type: 'rss', url: 'https://ew.com/feed/', category: 'Entertainment' },
  { name: 'IGN', type: 'rss', url: 'https://feeds.ign.com/ign/all', category: 'Gaming' },
  { name: 'Kotaku', type: 'rss', url: 'https://kotaku.com/rss', category: 'Gaming' },
  { name: 'Polygon', type: 'rss', url: 'https://www.polygon.com/rss/index.xml', category: 'Gaming' },
  { name: 'Eurogamer', type: 'rss', url: 'https://www.eurogamer.net/feed', category: 'Gaming' },
  { name: 'PC Gamer', type: 'rss', url: 'https://www.pcgamer.com/rss/', category: 'Gaming' },
  { name: 'Rock Paper Shotgun', type: 'rss', url: 'https://www.rockpapershotgun.com/feed', category: 'Gaming' },
  { name: 'Nintendo Life', type: 'rss', url: 'https://www.nintendolife.com/feeds/news', category: 'Gaming' },
  {
    name: 'Google News Gaming',
    type: 'rss',
    url: 'https://news.google.com/rss/search?q=video+games+OR+gaming+OR+playstation+OR+xbox+OR+nintendo&hl=en-US&gl=US&ceid=US:en',
    category: 'Gaming',
  },
];

async function seedDemoArticles() {
  let created = 0;
  for (const raw of demoArticles) {
    const urlHash = hashUrl(`demo://${raw.slug}`);
    const exists = await Article.findOne({ $or: [{ slug: raw.slug }, { urlHash }] });
    if (exists) {
      await Article.updateOne(
        { _id: exists._id },
        {
          $set: {
            ...raw,
            urlHash,
            originalUrl: `demo://${raw.slug}`,
            isPublished: true,
          },
        }
      );
      continue;
    }
    await Article.create({
      ...raw,
      urlHash,
      originalUrl: `demo://${raw.slug}`,
      originalTitle: raw.title,
      source: { name: 'The Daily Lens', url: '' },
    });
    created += 1;
  }

  for (const name of categories) {
    const count = await Article.countDocuments({ category: name, isPublished: true });
    await Category.updateOne({ name }, { articleCount: count });
  }

  logger.info(`Demo articles: ${created} created, ${demoArticles.length} total in seed set`);
}

async function seed() {
  await connectDB(process.env.MONGODB_URI);

  const email = process.env.ADMIN_EMAIL || 'admin@dailylens.com';
  const password = process.env.ADMIN_PASSWORD || 'DailyLens2026!';
  const hash = await bcrypt.hash(password, 10);
  await User.findOneAndUpdate(
    { email: email.toLowerCase() },
    { email: email.toLowerCase(), password: hash, role: 'admin' },
    { upsert: true, new: true }
  );
  logger.info(`Admin user: ${email}`);

  for (const name of categories) {
    const slug = name.toLowerCase();
    await Category.findOneAndUpdate({ name }, { name, slug, articleCount: 0 }, { upsert: true });
  }

  for (const position of adPositions) {
    await AdSlot.findOneAndUpdate(
      { position, name: `Default ${position}` },
      {
        name: `Default ${position}`,
        position,
        type: 'adsense',
        adsenseSlotId: '0000000000',
        isActive: false,
      },
      { upsert: true }
    );
  }

  for (const s of rssSources) {
    await NewsSource.findOneAndUpdate(
      { url: s.url },
      { ...s, isActive: false },
      { upsert: true, new: true }
    );
  }
  await NewsSource.findOneAndUpdate(
    { name: 'NewsAPI', url: 'newsapi' },
    { name: 'NewsAPI', type: 'api', url: 'newsapi', category: 'general', isActive: false },
    { upsert: true }
  );
  await NewsSource.findOneAndUpdate(
    { name: 'GNews', url: 'gnews' },
    { name: 'GNews', type: 'api', url: 'gnews', category: 'world', isActive: false },
    { upsert: true }
  );
  await NewsSource.findOneAndUpdate(
    { url: 'google-trends-us' },
    {
      name: 'Google Trends USA',
      type: 'api',
      url: 'google-trends-us',
      category: 'World',
      isActive: true,
    },
    { upsert: true }
  );

  await SiteSettings.findOneAndUpdate(
    { key: 'default' },
    {
      key: 'default',
      fetchInterval: '15min',
      articleTone: 'Neutral',
      minWordCount: 500,
      maxWordCount: 800,
      generateAiImages: false,
      activeCategories: categories,
      disabledSourceIds: [],
    },
    { upsert: true }
  );

  await seedDemoArticles();

  logger.info('Seed complete (demo content, AI pipeline disabled via DISABLE_AI_PIPELINE)');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
