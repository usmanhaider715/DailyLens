import { Article } from '../models/Article.js';
import { cacheGet, cacheSet, cacheKeys, cacheDel } from '../services/cacheService.js';
import { publicArticleFilter } from '../utils/publicArticleFilter.js';

const listProjection = {
  title: 1,
  slug: 1,
  summary: 1,
  category: 1,
  tags: 1,
  heroImage: 1,
  author: 1,
  source: 1,
  seoScore: 1,
  readTime: 1,
  isBreaking: 1,
  isFeatured: 1,
  isPublished: 1,
  isPaused: 1,
  views: 1,
  publishedAt: 1,
  forecast: 1,
};

export async function listArticles(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 9));
    const category = req.query.category;
    const tag = req.query.tag;
    const sort = req.query.sort || 'latest';

    const cacheKey = cacheKeys().articleList({ page, limit, category, tag, sort });
    const cached = await cacheGet(cacheKey);
    if (cached) return res.json(cached);

    const filter = { ...publicArticleFilter };
    if (category && category !== 'All') {
      const map = { Tech: 'Technology' };
      filter.category = map[category] || category;
    }
    if (tag) filter.tags = tag;

    let sortSpec = { publishedAt: -1 };
    if (sort === 'featured') sortSpec = { isFeatured: -1, publishedAt: -1 };
    if (sort === 'trending') sortSpec = { views: -1, publishedAt: -1 };

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Article.find(filter, listProjection).sort(sortSpec).skip(skip).limit(limit).lean(),
      Article.countDocuments(filter),
    ]);

    const payload = { items, page, limit, total, pages: Math.ceil(total / limit) };
    await cacheSet(cacheKey, payload, 300);
    res.json(payload);
  } catch (e) {
    next(e);
  }
}

export async function getForecasts(req, res, next) {
  try {
    const limit = Math.min(20, parseInt(req.query.limit, 10) || 8);
    const items = await Article.find({
      ...publicArticleFilter,
      'forecast.enabled': true,
    })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .select(listProjection)
      .lean();
    res.json(items);
  } catch (e) {
    next(e);
  }
}

export async function getBreaking(req, res, next) {
  try {
    const ck = cacheKeys().breaking;
    const cached = await cacheGet(ck);
    if (cached) return res.json(cached);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const items = await Article.find({
      isBreaking: true,
      ...publicArticleFilter,
      publishedAt: { $gte: since },
    }, listProjection)
      .sort({ publishedAt: -1 })
      .limit(20)
      .lean();

    await cacheSet(ck, items, 120);
    res.json(items);
  } catch (e) {
    next(e);
  }
}

export async function getTrending(req, res, next) {
  try {
    const ck = cacheKeys().trending;
    const cached = await cacheGet(ck);
    if (cached) return res.json(cached);

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const items = await Article.find(
      { ...publicArticleFilter, publishedAt: { $gte: since } },
      listProjection
    )
      .sort({ views: -1, publishedAt: -1 })
      .limit(10)
      .lean();

    await cacheSet(ck, items, 600);
    res.json(items);
  } catch (e) {
    next(e);
  }
}

export async function getFeatured(req, res, next) {
  try {
    const items = await Article.find(
      { isFeatured: true, ...publicArticleFilter },
      listProjection
    )
      .sort({ publishedAt: -1 })
      .limit(5)
      .lean();
    res.json(items);
  } catch (e) {
    next(e);
  }
}

export async function getArticleBySlug(req, res, next) {
  try {
    const { slug } = req.params;
    const ck = cacheKeys().articleBySlug(slug);
    const cached = await cacheGet(ck);
    if (cached) {
      setImmediate(async () => {
        try {
          await Article.updateOne({ _id: cached.article._id }, { $inc: { views: 1 } });
        } catch {
          /* noop */
        }
      });
      res.set('Cache-Control', 'public, max-age=60');
      return res.json(cached);
    }

    const article = await Article.findOne({ slug, ...publicArticleFilter }).lean();
    if (!article) return res.status(404).json({ message: 'Article not found' });

    setImmediate(async () => {
      try {
        await Article.updateOne({ _id: article._id }, { $inc: { views: 1 } });
      } catch {
        /* noop */
      }
    });

    const related = await Article.find(
      {
        category: article.category,
        ...publicArticleFilter,
        _id: { $ne: article._id },
      },
      listProjection
    )
      .sort({ publishedAt: -1 })
      .limit(4)
      .lean();

    const payload = { article, related };
    await cacheSet(ck, payload, 120);
    res.set('Cache-Control', 'public, max-age=60');
    res.json(payload);
  } catch (e) {
    next(e);
  }
}

export async function invalidateArticleCaches() {
  const { getRedis } = await import('../config/redis.js');
  const { invalidateSitemapCache } = await import('../services/sitemapService.js');
  const redis = getRedis();
  const keys = await redis.keys('articles:list:*');
  if (keys.length) await redis.del(...keys);
  const slugKeys = await redis.keys('articles:slug:*');
  if (slugKeys.length) await redis.del(...slugKeys);
  await cacheDel(cacheKeys().breaking);
  await cacheDel(cacheKeys().trending);
  await invalidateSitemapCache();
}
