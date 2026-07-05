import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ArticleCard } from './ArticleCard.jsx';
import { CategoryBadge } from '../common/CategoryBadge.jsx';
import { formatArticleDate } from '../../utils/formatDate.js';
import { HeroImageFrame } from '../common/HeroImageFrame.jsx';
import { getArticleFeaturedImage, getArticleImageAlt } from '@/utils/articleImage';
import { stripHtml } from '../../utils/stripHtml.js';

function SectionLabel({ children }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="font-display text-lg font-bold tracking-tight text-gray-900 dark:text-white">
        {children}
      </h2>
      <span className="h-px flex-1 bg-gradient-to-r from-primary-300 to-transparent dark:from-primary-700" />
    </div>
  );
}

export function FeaturedSidebar({ articles }) {
  if (!articles?.length) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 p-8 text-center dark:border-gray-700 dark:bg-gray-900/30">
        <p className="text-sm text-gray-500">Featured stories will appear here.</p>
      </div>
    );
  }

  return (
    <aside className="flex flex-col">
      <SectionLabel>Featured stories</SectionLabel>
      <ol className="mt-4 space-y-0 divide-y divide-gray-100 dark:divide-gray-800">
        {articles.map((a, idx) => (
          <li key={a._id || a.slug}>
            <Link
              href={`/article/${a.slug}`}
              className="group flex gap-4 py-4 transition first:pt-0 last:pb-0 hover:bg-gray-50/80 dark:hover:bg-gray-900/40"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 font-display text-sm font-bold text-primary-800 dark:bg-primary-950 dark:text-primary-200">
                {idx + 2}
              </span>
              <HeroImageFrame
                url={getArticleFeaturedImage(a)}
                alt={getArticleImageAlt(a)}
                category={a.category}
                aspect="4/3"
                className="w-[88px] shrink-0 shadow-sm transition group-hover:shadow-md"
                rounded="lg"
              />
              <div className="min-w-0 flex-1">
                <CategoryBadge category={a.category} />
                <h3 className="mt-1.5 line-clamp-3 font-display text-[15px] font-semibold leading-snug text-gray-900 transition group-hover:text-primary-800 dark:text-white dark:group-hover:text-primary-300">
                  {a.title}
                </h3>
                {a.summary ? (
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                    {stripHtml(a.summary)}
                  </p>
                ) : null}
                <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-gray-400">
                  {formatArticleDate(a.publishedAt)}
                  {a.readTime ? ` · ${a.readTime} min` : ''}
                </p>
              </div>
              <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-gray-300 opacity-0 transition group-hover:opacity-100 group-hover:text-primary-600 dark:text-gray-600" />
            </Link>
          </li>
        ))}
      </ol>
    </aside>
  );
}

export function FeaturedBottomStrip({ articles }) {
  if (!articles?.length) return null;
  return (
    <div className="mt-10 border-t border-gray-100 pt-10 dark:border-gray-800">
      <SectionLabel>More headlines</SectionLabel>
      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {articles.map((a) => (
          <ArticleCard key={a._id || a.slug} article={a} variant="default" />
        ))}
      </div>
    </div>
  );
}
