'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchBar({ className = '', inputClassName = '' }) {
  const [q, setQ] = useState('');
  const router = useRouter();

  const submit = (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  return (
    <form onSubmit={submit} className={`relative ${className}`}>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search news..."
        className={`w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none ring-primary-500 focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 md:w-56 ${inputClassName}`}
        aria-label="Search news"
      />
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
    </form>
  );
}
