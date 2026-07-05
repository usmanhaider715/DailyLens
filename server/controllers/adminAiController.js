import { fetchLatestNewsFeedForAdmin } from '../services/newsService.js';
import { buildAiDraftResponse } from '../services/aiDraftService.js';
import { searchHeroImageCandidates } from '../services/imageDiscoveryService.js';
import {
  listGoogleTrends,
  fetchGoogleNewsStoryForTrend,
  buildRawArticleFromTrend,
} from '../services/googleTrendsService.js';
import { listGoogleNews24hByCategory, searchGoogleNews } from '../services/googleNewsAdminService.js';
import {
  startBatchPublishJob,
  getBatchPublishJob,
  MAX_BATCH_SIZE,
} from '../services/batchArticleService.js';

export { buildAiDraftResponse } from '../services/aiDraftService.js';

export async function getAiNewsFeed(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 120, 200);
    const category = (req.query.category || '').trim();
    const feed = await fetchLatestNewsFeedForAdmin(limit, {
      category: category && category !== 'All' ? category : undefined,
    });
    res.json({
      items: feed.items,
      categories: feed.categories,
      activeCategory: feed.activeCategory,
      totalInCategory: feed.totalInCategory,
      count: feed.items.length,
      sources: {
        rss: true,
        newsApi: Boolean(process.env.NEWSAPI_KEY),
        gnews: Boolean(process.env.GNEWS_KEY),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function generateArticleFromStory(req, res, next) {
  try {
    const { title, description, content, url, imageUrl, sourceName, sourceUrl, publishedAt, suggestedCategory } =
      req.body || {};

    if (!title || !url) {
      return res.status(400).json({ message: 'title and url are required' });
    }

    const raw = {
      title,
      description: description || '',
      content: content || description || '',
      url,
      imageUrl: imageUrl || '',
      sourceName: sourceName || 'News source',
      sourceUrl: sourceUrl || url,
      publishedAt: publishedAt || new Date().toISOString(),
      suggestedCategory,
    };

    const draft = await buildAiDraftResponse(raw, suggestedCategory);
    res.json(draft);
  } catch (err) {
    const msg =
      err?.response?.data?.error?.message || err.message || 'AI generation failed';
    const status = err?.response?.status;
    if (status === 429) {
      return res.status(429).json({
        message: 'Groq rate limit reached. Wait a moment and try again.',
      });
    }
    if (status === 401) {
      return res.status(500).json({
        message: 'Invalid GROQ_API_KEY. Check server .env configuration.',
      });
    }
    if (/GROQ|not configured/i.test(msg)) {
      return res.status(500).json({ message: msg });
    }
    next(new Error(msg));
  }
}

export async function searchHeroImages(req, res, next) {
  try {
    const { title, category, excludeUrl, query } = req.query || req.body || {};
    const images = await searchHeroImageCandidates({
      title: title || '',
      category: category || 'World',
      excludeUrl: excludeUrl || '',
      query: query || '',
      limit: 8,
    });
    res.json({
      images,
      count: images.length,
      hint:
        images.length === 0
          ? 'No images found. Add GOOGLE_CSE_API_KEY + GOOGLE_CSE_ID for more results, or try a different headline.'
          : null,
    });
  } catch (err) {
    next(err);
  }
}

export async function getGoogleTrends(req, res, next) {
  try {
    const region = (req.query.region || 'both').toLowerCase();
    const data = await listGoogleTrends(region);
    res.json({
      uk: data.uk || [],
      us: data.us || [],
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
}

export async function getGoogleNews24h(req, res, next) {
  try {
    const region = (req.query.region || 'us').toLowerCase() === 'uk' ? 'uk' : 'us';
    const data = await listGoogleNews24hByCategory(region);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function searchGoogleNewsAdmin(req, res, next) {
  try {
    const q = (req.query.q || req.query.query || '').trim();
    if (!q) return res.status(400).json({ message: 'Search query (q) is required' });
    const region = (req.query.region || 'us').toLowerCase() === 'uk' ? 'uk' : 'us';
    const limit = Math.min(Number(req.query.limit) || 30, 50);
    const data = await searchGoogleNews(q, region, limit);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function generateArticleFromRoughText(req, res, next) {
  try {
    const { roughText, category, sourceName, sourceUrl } = req.body || {};
    const text = String(roughText || '').trim();
    if (text.length < 80) {
      return res.status(400).json({ message: 'Paste at least 80 characters of source notes or draft text.' });
    }

    const firstLine = text.split(/\n/).find((l) => l.trim().length > 10)?.trim() || 'Editorial draft';
    const raw = {
      title: firstLine.slice(0, 200),
      description: text.slice(0, 600),
      content: text,
      url: sourceUrl?.trim() || `https://www.dailylens.com/admin/drafts/${Date.now()}`,
      imageUrl: '',
      sourceName: sourceName?.trim() || 'Admin source notes',
      sourceUrl: sourceUrl?.trim() || '',
      publishedAt: new Date().toISOString(),
      suggestedCategory: category,
    };

    const draft = await buildAiDraftResponse(raw, category);
    res.json(draft);
  } catch (err) {
    const msg = err?.response?.data?.error?.message || err.message || 'AI generation failed';
    const status = err?.response?.status;
    if (status === 429) {
      return res.status(429).json({ message: 'Groq rate limit reached. Wait a moment and try again.' });
    }
    next(new Error(msg));
  }
}

export async function generateArticleFromTrend(req, res, next) {
  try {
    const { query, region = 'uk', useGoogleNews } = req.body || {};
    if (!query || !String(query).trim()) {
      return res.status(400).json({ message: 'query is required' });
    }

    const reg = region === 'us' ? 'us' : 'uk';
    let raw;

    if (useGoogleNews !== false) {
      try {
        raw = await fetchGoogleNewsStoryForTrend(String(query).trim(), reg);
      } catch {
        raw = buildRawArticleFromTrend(
          {
            query: String(query).trim(),
            newsItems: [],
            topUrl: '',
            topSource: 'Google Trends',
          },
          reg
        );
      }
    } else {
      raw = buildRawArticleFromTrend(
        { query: String(query).trim(), newsItems: [], topUrl: '', topSource: 'Google Trends' },
        reg
      );
    }

    const draft = await buildAiDraftResponse(raw, raw.suggestedCategory);
    res.json(draft);
  } catch (err) {
    next(err);
  }
}

export async function startBatchPublish(req, res, next) {
  try {
    const { items, delayMs } = req.body || {};
    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({ message: 'items array is required' });
    }
    if (items.length > MAX_BATCH_SIZE) {
      return res.status(400).json({
        message: `Maximum ${MAX_BATCH_SIZE} articles per batch`,
      });
    }
    const invalid = items.find((item) => !item?.title || !item?.url);
    if (invalid) {
      return res.status(400).json({ message: 'Each item needs title and url' });
    }

    const job = startBatchPublishJob(items, { delayMs });
    res.status(202).json({
      ...job,
      message: `Batch started — ${job.total} articles queued (~${Math.ceil((job.total * job.delayMs) / 60000)} min)`,
      maxBatch: MAX_BATCH_SIZE,
    });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ message: err.message });
    next(err);
  }
}

export async function getBatchPublishStatus(req, res, next) {
  try {
    const job = getBatchPublishJob(req.params.jobId);
    if (!job) return res.status(404).json({ message: 'Batch job not found or expired' });
    res.json(job);
  } catch (err) {
    next(err);
  }
}

