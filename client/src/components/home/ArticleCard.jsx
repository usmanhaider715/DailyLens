import { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CategoryBadge } from '../common/CategoryBadge.jsx';
import { formatArticleDate } from '../../utils/formatDate.js';
import { truncateText } from '../../utils/truncateText.js';
import { stripHtml } from '../../utils/stripHtml.js';
import { ForecastBadge } from '../common/ForecastBadge.jsx';

function ArticleCardBase({ article, variant = 'default' }) {
  if (!article) return null;
  const summary = stripHtml(article.summary);

  if (variant === 'compact') {
    return (
      <Link to={`/article/${article.slug}`} className="group flex gap-3">
        <img
          src={article.heroImage?.url || '/favicon.svg'}
          alt=""
          className="h-16 w-20 shrink-0 rounded-md object-cover"
          loading="lazy"
        />
        <div className="min-w-0">
          <div className="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-primary-700 dark:text-gray-100">
            {article.title}
          </div>
          <div className="mt-1 text-xs text-gray-500">{formatArticleDate(article.publishedAt)}</div>
        </div>
      </Link>
    );
  }

  if (variant === 'featured') {
    return (
      <motion.div whileHover={{ scale: 1.01 }} className="relative overflow-hidden rounded-2xl">
        <Link to={`/article/${article.slug}`} className="block">
          <img
            src={article.heroImage?.url || '/favicon.svg'}
            alt=""
            className="h-80 w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 text-white">
            <CategoryBadge category={article.category} />
            <h3 className="mt-3 font-display text-3xl font-bold leading-tight">{article.title}</h3>
            <p className="mt-2 line-clamp-2 text-sm text-white/90">{summary}</p>
          </div>
        </Link>
      </motion.div>
    );
  }

  if (variant === 'horizontal') {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        className="flex overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
      >
        <Link to={`/article/${article.slug}`} className="w-2/5 shrink-0">
          <img
            src={article.heroImage?.url || '/favicon.svg'}
            alt=""
            className="h-full min-h-[140px] w-full object-cover"
            loading="lazy"
          />
        </Link>
        <div className="flex w-3/5 flex-col justify-center p-4">
          <CategoryBadge category={article.category} />
          <Link to={`/article/${article.slug}`} className="mt-2 block">
            <h3 className="font-display text-lg font-bold text-gray-900 hover:text-primary-700 dark:text-white">
              {article.title}
            </h3>
          </Link>
          <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">{summary}</p>
          <div className="mt-2 text-xs text-gray-500">
            {article.author} · {formatArticleDate(article.publishedAt)} · {article.readTime || 3} min read
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.article
      whileHover={{ scale: 1.02 }}
      className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
    >
      <Link to={`/article/${article.slug}`} className="block">
        <img
          src={article.heroImage?.url || '/favicon.svg'}
          alt=""
          className="h-48 w-full object-cover"
          loading="lazy"
        />
        <div className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryBadge category={article.category} />
            {article.forecast?.enabled && <ForecastBadge compact />}
          </div>
          <h3 className="mt-3 font-display text-xl font-bold text-gray-900 dark:text-white">{article.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-gray-600 dark:text-gray-300">
            {truncateText(summary, 180)}
          </p>
          <div className="mt-3 text-xs text-gray-500">
            {article.author} · {formatArticleDate(article.publishedAt)} · {article.readTime || 3} min read
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

export const ArticleCard = memo(ArticleCardBase);
