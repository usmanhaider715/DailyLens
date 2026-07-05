'use client';

import Link from 'next/link';
import { CategoryBadge } from '@/components/common/CategoryBadge';
import { formatArticleDate } from '@/utils/formatDate';
import { truncateText } from '@/utils/truncateText';
import { stripHtml } from '@/utils/stripHtml';
import { HeroImageFrame } from '@/components/common/HeroImageFrame';
import { getArticleFeaturedImage, getArticleImageAlt } from '@/utils/articleImage';

export function ArticleCard({ article, variant = 'default' }) {
  if (!article) return null;
  const summary = stripHtml(article.summary);
  const href = `/article/${article.slug}`;
  const imageUrl = getArticleFeaturedImage(article);
  const imageAlt = getArticleImageAlt(article);

  if (variant === 'compact') {
    return (
      <Link href={href} className="group flex gap-3">
        <HeroImageFrame
          url={imageUrl}
          alt={imageAlt}
          category={article.category}
          aspect="4/3"
          className="w-24 shrink-0"
          rounded="md"
        />
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-primary-700 dark:text-gray-100">
            {article.title}
          </div>
          <p className="mt-1 text-xs text-gray-500">{formatArticleDate(article.publishedAt)}</p>
        </div>
      </Link>
    );
  }

  return (
    <article className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900">
      <Link href={href} className="block">
        <HeroImageFrame
          url={imageUrl}
          alt={imageAlt}
          category={article.category}
          aspect="16/10"
        />
        <div className="p-4">
          <CategoryBadge category={article.category} />
          <h3 className="mt-3 font-display text-xl font-bold text-gray-900 dark:text-white">{article.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
            {truncateText(summary, 180)}
          </p>
          <p className="mt-3 text-xs text-gray-500">
            {article.author} · {formatArticleDate(article.publishedAt)} · {article.readTime || 3} min read
          </p>
        </div>
      </Link>
    </article>
  );
}
