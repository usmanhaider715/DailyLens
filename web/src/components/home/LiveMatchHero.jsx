'use client';

import { useCallback, useEffect, useState } from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import { ScoreCard } from './ScoreWidgets.jsx';

export function LiveMatchHero({ embedded = false }) {
  const [game, setGame] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (refresh = false) => {
    try {
      const { data } = await api.get('/site/homepage', {
        params: refresh ? { refresh: '1' } : {},
      });
      setGame(data.liveMatch || null);
      setUpdatedAt(data.liveMatch?.updatedAt || new Date().toISOString());
    } catch {
      setGame(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
    const id = setInterval(() => {
      if (!document.hidden) load(true);
    }, 12000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) {
    const skeleton = (
      <div
        className={`animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800 ${
          embedded ? 'min-h-[380px]' : 'h-[320px]'
        }`}
      />
    );
    if (embedded) return skeleton;
    return <section className="mx-auto max-w-7xl px-4 py-8">{skeleton}</section>;
  }

  if (!game) {
    const empty = (
      <div
        className={`flex items-center justify-center rounded-2xl border border-dashed p-10 text-center text-sm ${
          embedded
            ? 'min-h-[380px] border-primary-700/40 bg-primary-950/50 text-white/60'
            : 'border-gray-200 text-gray-500 dark:border-gray-700'
        }`}
      >
        Live match not available. Choose a match in Admin → Homepage.
      </div>
    );
    if (embedded) return empty;
    return <section className="mx-auto max-w-7xl px-4 py-8">{empty}</section>;
  }

  const panel = (
    <div
      className={`relative overflow-hidden rounded-2xl border border-primary-700/30 bg-gradient-to-br from-primary-950 via-primary-900 to-gray-950 shadow-xl ${
        embedded ? 'min-h-[380px]' : ''
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(168,85,247,0.2),_transparent_55%)]" />
      <div className="relative flex h-full min-h-[380px] flex-col p-4 sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-breaking/20 ring-1 ring-breaking/40">
              <Radio className="h-5 w-5 text-breaking" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-primary-200/80">Live on homepage</p>
              <h2 className="font-display text-xl font-bold text-white sm:text-2xl">
                {game.away?.name} vs {game.home?.name}
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <ScoreCard game={game} size="hero" />
        </div>
        {updatedAt && (
          <p className="mt-3 text-right text-[10px] text-white/40">
            Updated {new Date(updatedAt).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );

  if (embedded) return panel;
  return <section className="mx-auto max-w-7xl px-4 py-8">{panel}</section>;
}

