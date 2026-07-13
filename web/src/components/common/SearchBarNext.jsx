'use client';

import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/services/api';

export function SearchBar({ className = '', inputClassName = '' }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [tags, setTags] = useState([]);
  const router = useRouter();
  const boxRef = useRef(null);
  const debounceRef = useRef(null);

  const go = (query) => {
    const term = (query ?? q).trim();
    if (!term) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(term)}`);
  };

  const submit = (e) => {
    e.preventDefault();
    go();
  };

  useEffect(() => {
    const term = q.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (term.length < 2) {
      setSuggestions([]);
      setTags([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get('/search/suggest', { params: { q: term } });
        setSuggestions(data?.suggestions || []);
        setTags(data?.tags || []);
        setOpen(true);
      } catch {
        setSuggestions([]);
        setTags([]);
      }
    }, 200);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [q]);

  useEffect(() => {
    const onClick = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const hasDropdown = open && (suggestions.length > 0 || tags.length > 0);

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <form onSubmit={submit} className="relative" role="search">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => q.trim().length >= 2 && setOpen(true)}
          placeholder="Search news..."
          className={`w-full rounded-full border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 outline-none ring-primary-500 focus:ring-2 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 md:w-56 ${inputClassName}`}
          aria-label="Search news"
          autoComplete="off"
        />
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
      </form>

      {hasDropdown && (
        <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900">
          {suggestions.length > 0 && (
            <ul className="max-h-72 overflow-auto py-1">
              {suggestions.map((s) => (
                <li key={s.slug}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      setOpen(false);
                      router.push(`/article/${s.slug}`);
                    }}
                    className="flex w-full flex-col items-start gap-0.5 px-4 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <span className="line-clamp-1 text-sm text-gray-900 dark:text-gray-100">{s.title}</span>
                    {s.category && (
                      <span className="text-[11px] font-medium uppercase tracking-wide text-primary-600 dark:text-primary-400">
                        {s.category}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 border-t border-gray-100 px-3 py-2 dark:border-gray-800">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => go(t)}
                  className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  #{t}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => go()}
            className="block w-full border-t border-gray-100 px-4 py-2 text-left text-sm font-medium text-primary-700 hover:bg-primary-50 dark:border-gray-800 dark:text-primary-400 dark:hover:bg-primary-900/20"
          >
            Search for “{q.trim()}”
          </button>
        </div>
      )}
    </div>
  );
}
