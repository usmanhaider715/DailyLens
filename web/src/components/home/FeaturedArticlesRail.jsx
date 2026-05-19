import Link from 'next/link';
import { ArticleCard } from './ArticleCard.jsx';
import { CategoryBadge } from '../common/CategoryBadge.jsx';
import { formatArticleDate } from '../../utils/formatDate.js';

export function FeaturedSidebar({ articles }) {
  if (!articles?.length) {
    return (
      <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500 dark:border-gray-700">
        No featured stories in the sidebar yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {articles.map((a) => (
        <div
          key={a._id || a.slug}
          className="flex gap-3 rounded-xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
        >
          <img
            src={a.heroImage?.url || '/favicon.svg'}
            alt=""
            className="h-20 w-24 shrink-0 rounded-lg object-cover"
            loading="lazy"
          />
          <div className="min-w-0">
            <CategoryBadge category={a.category} />
            <Link href={`/article/${a.slug}`} className="mt-1 block">
              <h3 className="line-clamp-3 font-display text-base font-semibold text-gray-900 hover:text-primary-700 dark:text-white">
                {a.title}
              </h3>
            </Link>
            <div className="mt-1 text-xs text-gray-500">{formatArticleDate(a.publishedAt)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeaturedBottomStrip({ articles }) {
  if (!articles?.length) return null;
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {articles.map((a) => (
        <ArticleCard key={a._id || a.slug} article={a} variant="horizontal" />
      ))}
    </div>
  );
}
