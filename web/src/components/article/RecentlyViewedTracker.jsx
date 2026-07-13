'use client';

import { useEffect } from 'react';
import { addRecentlyViewed } from '@/utils/readingList';
import { getArticleFeaturedImage } from '@/utils/articleImage';

/** Records the current article into the local "recently viewed" list. */
export function RecentlyViewedTracker({ article }) {
  useEffect(() => {
    if (!article?.slug) return;
    addRecentlyViewed({
      slug: article.slug,
      title: article.title,
      category: article.category,
      image: getArticleFeaturedImage(article) || '',
    });
  }, [article?.slug, article?.title, article?.category]);

  return null;
}
