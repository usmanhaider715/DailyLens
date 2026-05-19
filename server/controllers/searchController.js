import { Article } from '../models/Article.js';
import { publicArticleFilter } from '../utils/publicArticleFilter.js';

export async function searchArticles(req, res, next) {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json([]);

    const items = await Article.find(
      { $text: { $search: q }, ...publicArticleFilter },
      { score: { $meta: 'textScore' } }
    )
      .select(
        'title slug summary category heroImage publishedAt readTime views tags'
      )
      .sort({ score: { $meta: 'textScore' } })
      .limit(20)
      .lean();

    res.json(items);
  } catch (e) {
    next(e);
  }
}
