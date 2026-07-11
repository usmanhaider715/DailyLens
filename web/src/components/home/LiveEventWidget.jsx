'use client';

import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { ExternalLink } from 'lucide-react';

export function LiveEventWidget() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get('/live/sports');
        if (!cancelled) setItems(data.items || []);
      } catch {
        if (!cancelled) setItems([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items.length) return null;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Live Desk</h3>
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
          ESPN wire
        </span>
      </div>
      <ul className="mt-3 space-y-3 text-sm">
        {items.map((it, idx) => (
          <li key={idx} className="flex items-start justify-between gap-2">
            <span className="text-gray-800 dark:text-gray-200">{it.title}</span>
            {it.link && (
              <a href={it.link} target="_blank" rel="noreferrer" className="shrink-0 text-primary-700">
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
