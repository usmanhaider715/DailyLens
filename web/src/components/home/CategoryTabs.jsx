const tabs = [
  'All',
  'World',
  'Technology',
  'Business',
  'Sports',
  'Health',
  'Entertainment',
  'Politics',
  'Crypto',
  'Weather',
];

export function CategoryTabs({ active, onChange }) {
  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onChange(t)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              active === t
                ? 'bg-primary-700 text-white'
                : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            {t === 'Technology' ? 'Tech' : t}
          </button>
        ))}
      </div>
    </div>
  );
}
