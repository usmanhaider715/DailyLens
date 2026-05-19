import { Article } from '../models/Article.js';
import { cacheSet, cacheKeys } from '../services/cacheService.js';
import { publicArticleFilter } from '../utils/publicArticleFilter.js';

export async function updateTrendingCache() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const items = await Article.find(
    { ...publicArticleFilter, publishedAt: { $gte: since } },
    {
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
      views: 1,
      publishedAt: 1,
    }
  )
    .sort({ views: -1, publishedAt: -1 })
    .limit(10)
    .lean();

  await cacheSet(cacheKeys().trending, items, 600);
  return items;
}
