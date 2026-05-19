import { Article } from '../models/Article.js';
import { AdSlot } from '../models/AdSlot.js';
import { getSiteSettings } from '../models/SiteSettings.js';
import { NewsSource } from '../models/NewsSource.js';
import { emitBreakingNews } from '../services/socketService.js';
import { runManualFetch as runManualFetchJob } from '../jobs/newsFetcher.js';
import { invalidateArticleCaches } from './articleController.js';
import { buildArticlePayload, ensureUniqueSlug } from '../utils/articleHelpers.js';
import { slugify } from '../utils/slugify.js';
import { Category } from '../models/Category.js';

const adminListProjection = {
  title: 1,
  slug: 1,
  category: 1,
  views: 1,
  publishedAt: 1,
  isBreaking: 1,
  isFeatured: 1,
  isPublished: 1,
  isPaused: 1,
  heroImage: 1,
  forecast: 1,
  sourceType: 1,
};

export async function getAdminArticle(req, res, next) {
  try {
    const doc = await Article.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ message: 'Article not found' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
}

export async function createArticle(req, res, next) {
  try {
    const payload = buildArticlePayload(req.body);
    payload.slug = await ensureUniqueSlug(payload.slug || slugify(payload.title));
    const doc = await Article.create(payload);
    await Category.updateOne({ name: doc.category }, { $inc: { articleCount: 1 } });
    if (doc.isBreaking && doc.isPublished) {
      emitBreakingNews({
        id: doc._id.toString(),
        headline: doc.title,
        slug: doc.slug,
        category: doc.category,
        publishedAt: doc.publishedAt,
      });
    }
    await invalidateArticleCaches();
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
}

export async function updateArticle(req, res, next) {
  try {
    const existing = await Article.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Article not found' });

    const payload = buildArticlePayload(req.body, existing);
    if (req.body.slug && req.body.slug !== existing.slug) {
      payload.slug = await ensureUniqueSlug(slugify(req.body.slug));
    }

    const wasBreaking = existing.isBreaking;
    Object.assign(existing, payload);
    await existing.save();

    if (existing.isBreaking && existing.isPublished && !wasBreaking) {
      emitBreakingNews({
        id: existing._id.toString(),
        headline: existing.title,
        slug: existing.slug,
        category: existing.category,
        publishedAt: existing.publishedAt,
      });
    }

    await invalidateArticleCaches();
    res.json(existing);
  } catch (e) {
    next(e);
  }
}

export async function listAdminArticles(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, parseInt(req.query.limit, 10) || 20);
    const category = req.query.category;
    const q = req.query.q;
    const from = req.query.from ? new Date(req.query.from) : null;
    const to = req.query.to ? new Date(req.query.to) : null;

    const filter = {};
    if (category) filter.category = category;
    if (q) filter.title = new RegExp(q, 'i');
    if (from || to) {
      filter.publishedAt = {};
      if (from) filter.publishedAt.$gte = from;
      if (to) filter.publishedAt.$lte = to;
    }

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Article.find(filter, adminListProjection).sort({ publishedAt: -1 }).skip(skip).limit(limit),
      Article.countDocuments(filter),
    ]);
    res.json({ items, page, limit, total });
  } catch (e) {
    next(e);
  }
}

export async function setFeatured(req, res, next) {
  try {
    await Article.findByIdAndUpdate(req.params.id, { isFeatured: req.body?.value ?? true });
    await invalidateArticleCaches();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function setBreaking(req, res, next) {
  try {
    await Article.findByIdAndUpdate(req.params.id, { isBreaking: req.body?.value ?? true });
    await invalidateArticleCaches();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function setPaused(req, res, next) {
  try {
    await Article.findByIdAndUpdate(req.params.id, { isPaused: req.body?.value ?? true });
    await invalidateArticleCaches();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function deleteArticle(req, res, next) {
  try {
    await Article.findByIdAndDelete(req.params.id);
    await invalidateArticleCaches();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function bulkDelete(req, res, next) {
  try {
    const ids = req.body.ids || [];
    await Article.deleteMany({ _id: { $in: ids } });
    await invalidateArticleCaches();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function manualFetchUrl(req, res, next) {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ message: 'url required' });
    const article = await runManualFetchJob(url);
    res.json({ ok: true, article });
  } catch (e) {
    next(e);
  }
}

export async function breakingPush(req, res, next) {
  try {
    const { headline, category } = req.body;
    if (!headline) return res.status(400).json({ message: 'headline required' });
    const slug = `breaking-${Date.now()}`;
    emitBreakingNews({
      id: null,
      headline,
      slug,
      category: category || 'World',
      publishedAt: new Date().toISOString(),
    });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
}

export async function getSettings(req, res, next) {
  try {
    const doc = await getSiteSettings();
    const sources = await NewsSource.find().sort({ name: 1 }).lean();
    res.json({ settings: doc, sources });
  } catch (e) {
    next(e);
  }
}

export async function updateSettings(req, res, next) {
  try {
    const doc = await getSiteSettings();
    const s = req.body.settings || {};
    const allowed = [
      'fetchInterval',
      'articleTone',
      'minWordCount',
      'maxWordCount',
      'generateAiImages',
      'activeCategories',
      'homepageHeroMode',
      'homepageLiveMatchId',
      'homepageLiveMatchLeague',
      'homepageWeatherRegion',
    ];
    for (const k of allowed) {
      if (s[k] !== undefined) doc[k] = s[k];
    }
    if (Array.isArray(req.body.disabledSourceIds)) {
      doc.disabledSourceIds = req.body.disabledSourceIds;
    }
    await doc.save();

    for (const patch of req.body.sourcesPatch || []) {
      if (patch._id && typeof patch.isActive === 'boolean') {
        await NewsSource.findByIdAndUpdate(patch._id, { isActive: patch.isActive });
      }
    }
    res.json({ ok: true, settings: doc });
  } catch (e) {
    next(e);
  }
}

export async function listAds(req, res, next) {
  try {
    const items = await AdSlot.find().sort({ position: 1, createdAt: -1 }).lean();
    res.json(items);
  } catch (e) {
    next(e);
  }
}

export async function createAd(req, res, next) {
  try {
    const doc = await AdSlot.create(req.body);
    res.json(doc);
  } catch (e) {
    next(e);
  }
}

export async function updateAd(req, res, next) {
  try {
    const doc = await AdSlot.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(doc);
  } catch (e) {
    next(e);
  }
}

export async function adminAnalytics(req, res, next) {
  try {
    const totalViewsAgg = await Article.aggregate([
      { $group: { _id: null, views: { $sum: '$views' } } },
    ]);
    const totalViews = totalViewsAgg[0]?.views || 0;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const articlesToday = await Article.countDocuments({ createdAt: { $gte: startOfDay } });

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const trending = await Article.find({ isPublished: true, publishedAt: { $gte: since } })
      .sort({ views: -1 })
      .limit(5)
      .select('title slug views category')
      .lean();

    const topCategories = await Article.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 8 },
    ]);

    res.json({ totalViews, articlesToday, trending, topCategories });
  } catch (e) {
    next(e);
  }
}
