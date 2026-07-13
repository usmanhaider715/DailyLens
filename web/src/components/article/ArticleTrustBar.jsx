'use client';

import Link from 'next/link';
import { Check, Clock, RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { CategoryBadge } from '../common/CategoryBadge.jsx';
import { formatArticleDateTime } from '@/utils/formatDate';
import { authorSlug } from '@/utils/seoHelpers';

/** Only surface an "Updated" date when it is meaningfully later than publish. */
function wasUpdated(article) {
  if (!article?.updatedAt || !article?.publishedAt) return false;
  const pub = new Date(article.publishedAt).getTime();
  const upd = new Date(article.updatedAt).getTime();
  if (Number.isNaN(pub) || Number.isNaN(upd)) return false;
  return upd - pub > 60 * 60 * 1000; // > 1 hour
}

const chipBase =
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 font-medium transition-colors';

/**
 * Reader-facing authority / trust bar shown on every article.
 * Surfaces: author, published + updated dates, reading time, category,
 * fact-check + editorial-review status, AI transparency, and the original
 * source + publisher — the core E-E-A-T signals for Google News.
 */
export function ArticleTrustBar({ article }) {
  const author = article.author || 'The Daily Lens Desk';
  const reviewed = ['approved', 'published'].includes(
    String(article.reviewStatus || '').toLowerCase(),
  );
  const factChecked = !!article.verifiedQuotes;
  const source = article.source || {};
  const hasSourceLink = source.url && /^https?:\/\//i.test(source.url);
  const updated = wasUpdated(article);

  return (
    <section aria-label="Article information and sourcing" className="mt-5 space-y-3">
      {/* Byline */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-gray-600 dark:text-gray-300">
        <CategoryBadge category={article.category} />
        <span>
          By{' '}
          <Link
            href={`/author/${authorSlug(author)}`}
            rel="author"
            className="font-semibold text-primary-700 hover:underline dark:text-primary-400"
          >
            {author}
          </Link>
        </span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          {article.readTime || 3} min read
        </span>
      </div>

      {/* Publish / update dates */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
        <time dateTime={article.publishedAt}>
          Published {formatArticleDateTime(article.publishedAt)}
        </time>
        {updated && (
          <time
            dateTime={article.updatedAt}
            className="inline-flex items-center gap-1 text-gray-600 dark:text-gray-300"
          >
            <RefreshCw className="h-3 w-3" aria-hidden="true" />
            Updated {formatArticleDateTime(article.updatedAt)}
          </time>
        )}
      </div>

      {/* Trust chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        {factChecked && (
          <Link
            href="/editorial/fact-checking"
            className={`${chipBase} border-green-200 bg-green-50 text-green-800 hover:bg-green-100 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300`}
            title="Quotes and key facts verified against the original source"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Fact-checked
          </Link>
        )}
        {reviewed && (
          <Link
            href="/editorial/publishing-process#review"
            className={`${chipBase} border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300`}
            title="Reviewed under our editorial standards"
          >
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Editorially reviewed
          </Link>
        )}
        <Link
          href="/editorial/ai"
          className={`${chipBase} border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300`}
          title="How AI is used and reviewed at The Daily Lens"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          How we report
        </Link>
      </div>

      {/* Publisher + original source */}
      <p className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-xs leading-relaxed text-gray-600 dark:border-gray-800 dark:bg-gray-900/50 dark:text-gray-300">
        <span className="font-semibold text-gray-800 dark:text-gray-200">Published by </span>
        <Link href="/about" className="text-primary-700 hover:underline dark:text-primary-400">
          The Daily Lens
        </Link>
        {source.name ? (
          <>
            {' · '}
            <span className="font-semibold text-gray-800 dark:text-gray-200">Source: </span>
            {hasSourceLink ? (
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-primary-700 hover:underline dark:text-primary-400"
              >
                {source.name || 'Original report'}
              </a>
            ) : (
              <span>{source.name}</span>
            )}
          </>
        ) : null}
      </p>
    </section>
  );
}
