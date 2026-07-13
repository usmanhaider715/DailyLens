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
