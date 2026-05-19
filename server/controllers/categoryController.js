import { Category } from '../models/Category.js';
import { Article } from '../models/Article.js';
import { publicArticleFilter } from '../utils/publicArticleFilter.js';

export async function listCategories(req, res, next) {
  try {
    const counts = await Article.aggregate([
      { $match: publicArticleFilter },
      { $group: { _id: '$category', count: { $sum: 1 } } },
    ]);
    const map = new Map(counts.map((c) => [c._id, c.count]));
    const cats = await Category.find().sort({ name: 1 }).lean();
    const merged = cats.map((c) => ({
      ...c,
      articleCount: map.get(c.name) ?? c.articleCount ?? 0,
    }));
    res.json(merged);
  } catch (e) {
    next(e);
  }
}
