import { ForecastBadge } from '../common/ForecastBadge.jsx';
import Link from 'next/link';

export function ForecastBlock({ article, compact = false }) {
  const f = article?.forecast;
  if (!f?.enabled) return null;

  if (compact) {
    return (
      <div className="mt-2 rounded-lg border border-primary-100 bg-primary-50/80 p-3 text-sm dark:border-primary-900 dark:bg-primary-950/40">
        <ForecastBadge confidence={f.confidence} />
        <p className="mt-1 font-semibold text-primary-900 dark:text-primary-100">{f.headline}</p>
        {article.slug && (
          <Link href={`/article/${article.slug}`} className="mt-1 inline-block text-xs text-primary-700 hover:underline">
            Read full story →
          </Link>
        )}
      </div>
    );
  }

  return (
    <aside className="my-8 rounded-2xl border-2 border-primary-200 bg-gradient-to-br from-primary-50 to-white p-6 dark:border-primary-800 dark:from-primary-950/60 dark:to-gray-900">
      <div className="flex flex-wrap items-center gap-2">
        <ForecastBadge confidence={f.confidence} />
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">Editorial outlook</span>
      </div>
      {f.headline && (
        <h3 className="mt-3 font-display text-xl font-bold text-primary-950 dark:text-white">{f.headline}</h3>
      )}
      {f.body && <p className="mt-3 text-base leading-relaxed text-gray-700 dark:text-gray-200">{f.body}</p>}
    </aside>
  );
}
