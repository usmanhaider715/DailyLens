import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api.js';

const categories = [
  'World',
  'Technology',
  'Business',
  'Sports',
  'Health',
  'Science',
  'Entertainment',
  'Politics',
  'Crypto',
  'Weather',
];

export function BreakingNewsTrigger() {
  const [headline, setHeadline] = useState('');
  const [category, setCategory] = useState('World');

  const push = async () => {
    try {
      await api.post('/admin/breaking-push', { headline, category });
      toast.success('Breaking news pushed');
      setHeadline('');
    } catch {
      toast.error('Push failed');
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-white">Breaking News</h1>
      <input
        value={headline}
        onChange={(e) => setHeadline(e.target.value)}
        placeholder="Headline"
        className="w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full rounded-lg border border-gray-200 px-3 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
      >
        {categories.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={push}
        className="w-full rounded-lg bg-breaking px-4 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-breaking-hover"
      >
        Push breaking news
      </button>
    </div>
  );
}
