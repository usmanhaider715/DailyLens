import 'dotenv/config';
import http from 'http';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { Server } from 'socket.io';
import { connectDB } from './config/db.js';
import { configureCloudinary } from './config/cloudinary.js';
import { getRedis } from './config/redis.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { applySecurity, getAllowedOrigins } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setSocketIO, emitTickerUpdate, broadcastLiveCount } from './services/socketService.js';
import { validateProductionEnv } from './utils/envValidate.js';
import { Article } from './models/Article.js';
import { publicArticleFilter } from './utils/publicArticleFilter.js';
import { logger } from './utils/logger.js';
import { verifyMailerConnection } from './lib/mailer.js';
import { scheduleNewsFetcher } from './jobs/newsFetcher.js';
import { scheduleAutoShare } from './jobs/autoShareScheduler.js';
import { scheduleEvergreenPipeline } from './jobs/evergreenScheduler.js';
import { updateTrendingCache } from './jobs/trendingUpdater.js';
import { startLiveScoresPoller } from './jobs/liveScoresPoller.js';

import articlesRoutes from './routes/articles.js';
import categoriesRoutes from './routes/categories.js';
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import analyticsRoutes from './routes/analytics.js';
import adsRoutes from './routes/ads.js';
import searchRoutes from './routes/search.js';
import liveRoutes from './routes/live.js';
import siteRoutes from './routes/site.js';
import imagesRoutes from './routes/images.js';
import authorsRoutes from './routes/authors.js';
import contactRoutes from './routes/contact.js';
import { ensureDefaultAuthors } from './models/Author.js';
import {
  buildSitemapIndexXml,
  buildSitemapArticlesXml,
  buildSitemapCategoriesXml,
  buildSitemapNewsXml,
  buildRobotsTxt,
  buildRssFeed,
  buildLlmsTxt,
} from './services/sitemapService.js';
import { getHeroUploadDir } from './utils/heroFileUpload.js';

const app = express();
const server = http.createServer(app);

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

const io = new Server(server, {
  cors: {
    origin: getAllowedOrigins(),
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

setSocketIO(io);

applySecurity(app);
app.use(
  cors({
    origin: getAllowedOrigins(),
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '256kb' }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
app.use(apiLimiter);

app.use(
  '/uploads/heroes',
  express.static(getHeroUploadDir(), {
    maxAge: '365d',
    immutable: true,
  })
);

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(buildRobotsTxt());
});

app.get('/sitemap.xml', async (req, res, next) => {
  try {
    const xml = await buildSitemapIndexXml();
    res.type('application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (e) {
    next(e);
  }
});

app.get('/sitemap-articles.xml', async (req, res, next) => {
  try {
    const xml = await buildSitemapArticlesXml();
    res.type('application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (e) {
    next(e);
  }
});

app.get('/sitemap-categories.xml', async (req, res, next) => {
  try {
    const xml = await buildSitemapCategoriesXml();
    res.type('application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(xml);
  } catch (e) {
    next(e);
  }
});

app.get('/sitemap-news.xml', async (req, res, next) => {
  try {
    const xml = await buildSitemapNewsXml();
    res.type('application/xml');
    res.set('Cache-Control', 'public, max-age=1800');
    res.send(xml);
  } catch (e) {
    next(e);
  }
});

app.get('/feed.xml', async (req, res, next) => {
  try {
    const xml = await buildRssFeed();
    res.type('application/rss+xml');
    res.set('Cache-Control', 'public, max-age=600');
    res.send(xml);
  } catch (e) {
    next(e);
  }
});

app.get('/llms.txt', (req, res) => {
  res.type('text/plain');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(buildLlmsTxt());
});

app.use('/api/articles', articlesRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/ads', adsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/live', liveRoutes);
app.use('/api/site', siteRoutes);
app.use('/api/images', imagesRoutes);
app.use('/api/authors', authorsRoutes);
app.use('/api/contact', contactRoutes);

app.use(errorHandler);

io.on('connection', (socket) => {
  broadcastLiveCount();
  socket.on('disconnect', () => {
    broadcastLiveCount();
  });
});

async function pushTicker() {
  try {
    const items = await Article.find(publicArticleFilter)
      .sort({ publishedAt: -1 })
      .limit(10)
      .select('title slug category publishedAt')
      .lean();
    emitTickerUpdate(items);
  } catch (e) {
    logger.error('ticker push failed', e);
  }
}

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    validateProductionEnv();
    configureCloudinary();
    await connectDB(process.env.MONGODB_URI);
    await ensureDefaultAuthors();
    getRedis();
    await verifyMailerConnection();
    if (process.env.DISABLE_AI_PIPELINE !== 'true') {
      scheduleNewsFetcher();
      logger.info('AI news fetcher cron enabled');
    } else {
      logger.info('AI news fetcher disabled (DISABLE_AI_PIPELINE=true)');
    }
    scheduleAutoShare();
    scheduleEvergreenPipeline();
    await pushTicker();
    setInterval(pushTicker, 5 * 60 * 1000);
    startLiveScoresPoller();
    await updateTrendingCache();
    setInterval(broadcastLiveCount, 30000);
    server.listen(PORT, '0.0.0.0', () => logger.info(`Server listening on ${PORT}`));
  } catch (e) {
    logger.error(e);
    process.exit(1);
  }
}

start();
