export function SeoScoreBadge({ score, size = 'md' }) {
  const n = Number(score);
  if (!Number.isFinite(n) || n < 1) return null;

  const rounded = Math.round(Math.min(10, Math.max(1, n)));
  const color =
    rounded >= 8
      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200'
      : rounded >= 6
        ? 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200'
        : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200';

  const sizeCls = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wide ${color} ${sizeCls}`}
      title="AI editorial SEO quality score (1–10)"
    >
      SEO {rounded}/10
    </span>
  );
}
