import { Article } from '../models/Article.js';
import { ArticleRedirect } from '../models/ArticleRedirect.js';
import { cacheGet, cacheSet, cacheKeys, cacheDel } from '../services/cacheService.js';
import { publicArticleFilter, newsArticleFilter, evergreenPublicFilter } from '../utils/publicArticleFilter.js';
import { normalizeHeroImage } from '../utils/heroImageUtils.js';
import { recordArticleView } from '../services/viewStatsService.js';
import { getArticleRecommendations } from '../services/recommendationService.js';
import { sanitizeReadTimeMinutes } from '../utils/seoArticleNormalize.js';

function isEvergreenArticle(article) {
  return !!(article?.isEvergreen || article?.contentType === 'evergreen');
}

function trackViewForArticle(article) {
  setImmediate(async () => {
    try {
      await Article.updateOne({ _id: article._id }, { $inc: { views: 1 } });
      await recordArticleView({ isEvergreen: isEvergreenArticle(article) });
    } catch {
      /* noop */
    }
  });
}

function enrichArticleHero(article) {
  if (!article) return article;
  return {
    ...article,
    heroImage: normalizeHeroImage(article.heroImage, article.category),
    readTime: sanitizeReadTimeMinutes(article.readTime, article.body),
  };
}

function enrichList(payload) {
  if (!payload?.items) return payload;
  return { ...payload, items: payload.items.map(enrichArticleHero) };
}

function enrichRecommendations(rec) {
  const map = (arr) => (Array.isArray(arr) ? arr.map(enrichArticleHero) : []);
  return {
    relatedNews: map(rec?.relatedNews),
    relatedGuides: map(rec?.relatedGuides),
    popular: map(rec?.popular),
    recommended: map(rec?.recommended),
  };
}

const listProjection = {
  title: 1,
  slug: 1,
  summary: 1,
  category: 1,
  tags: 1,
  heroImage: 1,
  featuredImage: 1,
  author: 1,
  source: 1,
  seoScore: 1,
  readTime: 1,
  isBreaking: 1,
  isFeatured: 1,
  isPublished: 1,
  isPaused: 1,
  views: 1,
  trendScore: 1,
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
    if (cached) return res.json(enrichList(cached));

    const filter = req.query.evergreen === '1' ? { ...evergreenPublicFilter } : { ...newsArticleFilter };
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

    const payload = enrichList({ items, page, limit, total, pages: Math.ceil(total / limit) });
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
    if (cached) return res.json(cached.map(enrichArticleHero));

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const items = await Article.find({
      isBreaking: true,
      ...publicArticleFilter,
      publishedAt: { $gte: since },
    }, listProjection)
      .sort({ publishedAt: -1 })
      .limit(20)
      .lean();

    const enriched = items.map(enrichArticleHero);
    await cacheSet(ck, enriched, 120);
    res.json(enriched);
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
    res.json(items.map(enrichArticleHero));
  } catch (e) {
    next(e);
  }
}

export async function listEvergreenArticles(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 12));
    const category = req.query.category;
    const filter = { ...evergreenPublicFilter };
    if (category && category !== 'All') filter.category = category;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Article.find(filter, listProjection).sort({ publishedAt: -1 }).skip(skip).limit(limit).lean(),
      Article.countDocuments(filter),
    ]);
    res.json(enrichList({ items, page, limit, total, pages: Math.ceil(total / limit) }));
  } catch (e) {
    next(e);
  }
}

/**
 * Homepage featured list. The FIRST item is the hero, chosen by priority:
 *   1. Manually flagged `isFeatured` (editor override always wins)
 *   2. Highest Google Trends source popularity (`trendScore`) among recent news
 *   3. Most recent news article (safe fallback when trends don't match)
 * News-only (evergreen guides are excluded).
 */
export async function getFeatured(req, res, next) {
  try {
    const ck = cacheKeys().featured;
    const cached = await cacheGet(ck);
    if (cached) return res.json(cached);

    // Recent pool for trend/recency ranking, plus any manually featured article
    // regardless of age so an editor pick is never dropped.
    const recentSince = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const items = await Article.find(
      {
        ...newsArticleFilter,
        $or: [{ isFeatured: true }, { publishedAt: { $gte: recentSince } }],
      },
      listProjection,
    )
      .sort({ isFeatured: -1, trendScore: -1, publishedAt: -1 })
      .limit(5)
      .lean();

    const enriched = items.map(enrichArticleHero);
    await cacheSet(ck, enriched, 120);
    res.json(enriched);
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
      trackViewForArticle(cached.article);
      res.set('Cache-Control', 'public, max-age=60');
      return res.json({
        article: enrichArticleHero(cached.article),
        related: (cached.related || []).map(enrichArticleHero),
        recommendations: enrichRecommendations(cached.recommendations),
      });
    }

    const article = await Article.findOne({ slug, ...publicArticleFilter }).lean();
    if (!article) {
      const redirect = await ArticleRedirect.findOne({ fromPath: `/article/${slug}` }).lean();
      if (redirect?.toPath) {
        return res.redirect(redirect.statusCode || 301, redirect.toPath);
      }
      return res.status(404).json({ message: 'Article not found' });
    }

    trackViewForArticle(article);

    const recommendations = await getArticleRecommendations(article, { perSection: 4 });
    // Backward-compatible "related" = related news, falling back to recommended.
    const related =
      recommendations.relatedNews?.length ? recommendations.relatedNews : recommendations.recommended;

    const payload = {
      article: enrichArticleHero(article),
      related: (related || []).map(enrichArticleHero),
      recommendations,
    };
    await cacheSet(ck, payload, 120);
    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      ...payload,
      article: payload.article,
      recommendations: enrichRecommendations(recommendations),
    });
  } catch (e) {
    next(e);
  }
}

export async function recordEngagement(req, res, next) {
  try {
    const slug = String(req.params.slug || '').trim();
    if (!slug) return res.status(204).end();

    const body = req.body || {};
    const event = String(body.event || '');
    const inc = {};
    const rawDepth = Number(body.scrollDepth);
    if (Number.isFinite(rawDepth)) {
      const depth = Math.max(0, Math.min(100, Math.round(rawDepth)));
      inc['engagement.scrollDepthSum'] = depth;
      inc['engagement.scrollDepthCount'] = 1;
    }
    if (event === 'read') {
      inc['engagement.readCompletions'] = 1;
    }

    if (Object.keys(inc).length) {
      await Article.updateOne({ slug }, { $inc: inc });
    }
    res.status(204).end();
  } catch (e) {
    // Analytics must never break the page — swallow.
    res.status(204).end();
    void next;
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
  await cacheDel(cacheKeys().featured);
  await invalidateSitemapCache();
}
