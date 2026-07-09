import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Category } from '../models/Category.js';
import { NewsSource } from '../models/NewsSource.js';
import { SiteSettings } from '../models/SiteSettings.js';
import { logger } from '../utils/logger.js';

const GAMING_SOURCES = [
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

async function main() {
  await connectDB(process.env.MONGODB_URI);

  await Category.findOneAndUpdate(
    { name: 'Gaming' },
    { name: 'Gaming', slug: 'gaming', articleCount: 0 },
    { upsert: true },
  );
  logger.info('Category Gaming upserted');

  for (const source of GAMING_SOURCES) {
    await NewsSource.findOneAndUpdate({ url: source.url }, { ...source, isActive: false }, { upsert: true });
    logger.info(`Source upserted: ${source.name}`);
  }

  const settings = await SiteSettings.findOne({ key: 'default' });
  if (settings) {
    const cats = settings.activeCategories || [];
    if (!cats.includes('Gaming')) {
      settings.activeCategories = [...cats, 'Gaming'];
      await settings.save();
      logger.info('Added Gaming to activeCategories');
    }
  }

  await mongoose.disconnect();
  logger.info('Gaming category migration complete');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
