'use client';

import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { isBookmarked, toggleBookmark } from '@/utils/readingList';
import { getArticleFeaturedImage } from '@/utils/articleImage';

export function BookmarkButton({ article }) {
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setSaved(isBookmarked(article.slug));
  }, [article.slug]);

  const onClick = () => {
    const next = toggleBookmark({
      slug: article.slug,
      title: article.title,
      category: article.category,
      image: getArticleFeaturedImage(article) || '',
    });
    setSaved(next);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? 'Remove bookmark' : 'Save to reading list'}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        saved
          ? 'border-primary-300 bg-primary-50 text-primary-700 dark:border-primary-900/50 dark:bg-primary-900/20 dark:text-primary-300'
          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      <Bookmark className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} aria-hidden="true" />
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
