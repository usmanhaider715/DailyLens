export const categoryColors = {
  World: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100',
  Technology: 'bg-indigo-100 text-indigo-900 dark:bg-indigo-900/40 dark:text-indigo-100',
  Business: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100',
  Sports: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-100',
  Health: 'bg-rose-100 text-rose-900 dark:bg-rose-900/40 dark:text-rose-100',
  Science: 'bg-cyan-100 text-cyan-900 dark:bg-cyan-900/40 dark:text-cyan-100',
  Entertainment: 'bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/40 dark:text-fuchsia-100',
  Gaming: 'bg-purple-100 text-purple-900 dark:bg-purple-900/40 dark:text-purple-100',
  Politics: 'bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-slate-100',
  Crypto: 'bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-100',
  Weather: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-100',
};

export function getCategoryColor(category) {
  return categoryColors[category] || 'bg-primary-100 text-primary-900 dark:bg-primary-900/30 dark:text-primary-100';
}
