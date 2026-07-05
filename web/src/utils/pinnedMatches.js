const STORAGE_KEY = 'dailylens-pinned-matches';

export function loadPinnedMatches() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function savePinnedMatches(list) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 20)));
}

export function matchPinKey(game) {
  return `${game.leagueId}:${game.id}`;
}

export function isMatchPinned(game, list = loadPinnedMatches()) {
  const key = matchPinKey(game);
  return list.some((p) => p.key === key);
}

export function togglePinnedMatch(game) {
  const key = matchPinKey(game);
  const label = `${game.away?.name || 'Away'} vs ${game.home?.name || 'Home'}`;
  let list = loadPinnedMatches();
  if (list.some((p) => p.key === key)) {
    list = list.filter((p) => p.key !== key);
    savePinnedMatches(list);
    return { pinned: false, list };
  }
  list = [
    {
      key,
      id: game.id,
      leagueId: game.leagueId,
      label,
      competition: game.competition || game.league,
    },
    ...list,
  ];
  savePinnedMatches(list);
  return { pinned: true, list };
}
