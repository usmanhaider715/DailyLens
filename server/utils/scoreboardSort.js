/** Sort: live first, then upcoming (soonest), then recent finals (newest first). */
export function sortScoreboardGames(games) {
  const rank = (g) => {
    if ( g.isLive || g.status === 'in') return 0;
    if (g.status === 'pre') return 1;
    return 2;
  };

  const timeKey = (g) => {
    const raw = g.eventDate || g.startsAt || g.completedAt;
    if (!raw) return 0;
    const t = new Date(raw).getTime();
    return Number.isNaN(t) ? 0 : t;
  };

  return [...games].sort((a, b) => {
    const r = rank(a) - rank(b);
    if (r !== 0) return r;
    if (rank(a) === 1) return timeKey(a) - timeKey(b);
    if (rank(a) === 2) return timeKey(b) - timeKey(a);
    return 0;
  });
}

export function partitionScoreboardGames(games) {
  const live = [];
  const upcoming = [];
  const recent = [];

  for (const g of games) {
    if (g.isLive || g.status === 'in') live.push(g);
    else if (g.isFinal || g.status === 'post') recent.push(g);
    else upcoming.push(g);
  }

  return {
    live: sortScoreboardGames(live),
    upcoming: sortScoreboardGames(upcoming),
    recent: sortScoreboardGames(recent),
  };
}
