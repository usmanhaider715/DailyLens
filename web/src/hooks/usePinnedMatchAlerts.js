'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { loadPinnedMatches, togglePinnedMatch, isMatchPinned } from '@/utils/pinnedMatches';

async function ensureNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

function notifyMatch(title, body) {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/favicon.png', tag: `match-${title}` });
  } catch {
    /* ignore */
  }
}

export function usePinnedMatchAlerts(games = []) {
  const [pinned, setPinned] = useState([]);
  const prevScores = useRef(new Map());

  useEffect(() => {
    setPinned(loadPinnedMatches());
  }, []);

  useEffect(() => {
    if (!games.length || !pinned.length) return;
    const pinnedKeys = new Set(pinned.map((p) => p.key));
    for (const game of games) {
      const key = `${game.leagueId}:${game.id}`;
      if (!pinnedKeys.has(key)) continue;
      const scoreKey = `${game.away?.score}-${game.home?.score}`;
      const statusKey = game.statusText || game.status;
      const prev = prevScores.current.get(key);
      const label = `${game.away?.name} vs ${game.home?.name}`;
      if (prev && (prev.scoreKey !== scoreKey || (game.isLive && prev.statusKey !== statusKey))) {
        notifyMatch(label, `${game.away?.score} – ${game.home?.score} · ${statusKey}`);
      }
      prevScores.current.set(key, { scoreKey, statusKey });
    }
  }, [games, pinned]);

  const togglePin = useCallback(async (game) => {
    const willPin = !isMatchPinned(game, pinned);
    if (willPin) {
      const ok = await ensureNotificationPermission();
      if (!ok) {
        toast.error('Enable browser notifications to get live score alerts on mobile.');
      }
    }
    const { pinned: isPinned, list } = togglePinnedMatch(game);
    setPinned(list);
    toast.success(isPinned ? 'Match pinned — score alerts enabled' : 'Match unpinned');
    return isPinned;
  }, [pinned]);

  const isPinned = useCallback((game) => isMatchPinned(game, pinned), [pinned]);

  return { pinned, togglePin, isPinned };
}
