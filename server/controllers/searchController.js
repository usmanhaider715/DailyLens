import { Article } from '../models/Article.js';
import { publicArticleFilter } from '../utils/publicArticleFilter.js';
import { logger } from '../utils/logger.js';

const SELECT =
  'title slug summary category heroImage featuredImage publishedAt readTime views tags author';

function escapeRegex(text) {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function regexSearch(q) {
  const re = new RegExp(escapeRegex(q), 'i');
  return Article.find({
    ...publicArticleFilter,
    $or: [{ title: re }, { summary: re }, { tags: re }],
  })
    .select(SELECT)
    .sort({ publishedAt: -1 })
    .limit(20)
    .lean();
}

export async function suggestArticles(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (q.length < 2) return res.json({ suggestions: [], tags: [] });

    const re = new RegExp(escapeRegex(q), 'i');
    const items = await Article.find(
      { ...publicArticleFilter, $or: [{ title: re }, { tags: re }] },
      { title: 1, slug: 1, category: 1 },
    )
      .sort({ views: -1, publishedAt: -1 })
      .limit(6)
      .lean();

    // Distinct matching tags for quick "search this tag" chips.
    const tagDocs = await Article.find(
      { ...publicArticleFilter, tags: re },
      { tags: 1 },
    )
      .limit(40)
      .lean();
    const tagSet = new Set();
    for (const d of tagDocs) {
      for (const t of d.tags || []) {
        if (re.test(t)) tagSet.add(t);
        if (tagSet.size >= 6) break;
      }
      if (tagSet.size >= 6) break;
    }

    res.set('Cache-Control', 'public, max-age=60');
    res.json({ suggestions: items, tags: [...tagSet] });
  } catch (e) {
    next(e);
  }
}

export async function searchArticles(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    let items = [];

    try {
      items = await Article.find(
        { $text: { $search: q }, ...publicArticleFilter },
        { score: { $meta: 'textScore' } },
      )
        .select(SELECT)
        .sort({ score: { $meta: 'textScore' } })
        .limit(20)
        .lean();
    } catch (err) {
      logger.warn('Text search failed — using regex fallback', err.message);
    }

    if (!items.length) {
      items = await regexSearch(q);
    }

    res.json(items);
  } catch (e) {
    next(e);
  }
}
