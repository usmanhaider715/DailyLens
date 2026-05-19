export function ForecastBadge({ confidence, compact = false }) {
  if (compact) {
    return (
      <span className="inline-flex items-center rounded-full bg-primary-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-800 dark:bg-primary-900/50 dark:text-primary-200">
        Forecast
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-primary-200 bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-800 dark:border-primary-800 dark:bg-primary-950/50 dark:text-primary-200">
      Forecast
      {confidence && <span className="opacity-70">· {confidence}</span>}
    </span>
  );
}
