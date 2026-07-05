'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Radio, RefreshCw } from 'lucide-react';
import { api } from '@/services/api';
import { useLiveScoresSocket } from '../../hooks/useLiveScoresSocket.js';
import { ScoreCard } from './ScoreWidgets.jsx';

const FAST_POLL_LEAGUES = new Set(['cricket', 'soccer']);
const POLL_MS_FAST = 20000;
const POLL_MS_DEFAULT = 30000;

export function LiveScoreboard({ compact = false, defaultLeague = 'soccer' }) {
  const [activeLeague, setActiveLeague] = useState(defaultLeague);
  const [leagues, setLeagues] = useState([]);
  const [boards, setBoards] = useState([]);
  const [games, setGames] = useState([]);
  const [competitions, setCompetitions] = useState([]);
  const [eventFilter, setEventFilter] = useState('all');
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(true);
  const loadGenRef = useRef(0);

  const load = useCallback(async (leagueId, { refresh = false, showLoading = false } = {}) => {
    const gen = ++loadGenRef.current;
    if (showLoading) setLoading(true);

    try {
      const { data } = await api.get('/live/scores', {
        params: { league: leagueId, ...(refresh ? { refresh: '1' } : {}) },
      });
      if (gen !== loadGenRef.current) return;

      if (data.leagues?.length) setLeagues(data.leagues);
      if (data.boards) setBoards(data.boards);

      const board = data.boards
        ? data.boards.find((b) => b.leagueId === leagueId)
        : null;

      if (board?.games?.length) {
        setGames(board.games);
        setCompetitions(board.competitions || []);
        setActiveLeague(board.leagueId || leagueId);
      } else if (data.games?.length) {
        setGames(data.games);
        setCompetitions(data.competitions || []);
        if (data.leagueId) setActiveLeague(data.leagueId);
      }

      if (data.updatedAt) setUpdatedAt(data.updatedAt);
    } catch {
      /* keep previous games on error */
    } finally {
      if (gen === loadGenRef.current && showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(defaultLeague, { refresh: true, showLoading: true }).finally(() => setLoading(false));
  }, [load, defaultLeague]);

  const pollMs = FAST_POLL_LEAGUES.has(activeLeague) ? POLL_MS_FAST : POLL_MS_DEFAULT;

  useEffect(() => {
    const id = setInterval(() => {
      if (document.hidden) return;
      load(activeLeague, { refresh: false });
    }, pollMs);
    return () => clearInterval(id);
  }, [activeLeague, load, pollMs]);

  useLiveScoresSocket(activeLeague, () => {
    if (!document.hidden) load(activeLeague, { refresh: true });
  });

  const switchLeague = (id) => {
    setActiveLeague(id);
    setEventFilter('all');
    const cached = boards.find((b) => b.leagueId === id);
    if (cached?.games?.length) {
      setGames(cached.games);
      setCompetitions(cached.competitions || []);
      load(id, { refresh: false });
    } else {
      setLoading(true);
      load(id, { refresh: false, showLoading: true }).finally(() => setLoading(false));
    }
  };

  const hasEventFilter = activeLeague === 'cricket' || activeLeague === 'soccer';

  const eventOptions = useMemo(() => {
    if (!hasEventFilter) return [];
    const fromApi = competitions.length ? competitions : [];
    const fromGames = [...new Set(games.map((g) => g.competition).filter(Boolean))];
    return [...new Set([...fromApi, ...fromGames])].sort();
  }, [hasEventFilter, competitions, games]);

  const displayGames = useMemo(() => {
    const list = games.filter(Boolean);
    if (!hasEventFilter || eventFilter === 'all') return list;
    return list.filter((g) => g.competition === eventFilter);
  }, [games, hasEventFilter, eventFilter]);

  const { liveGames, upcomingGames, recentGames } = useMemo(() => {
    const live = [];
    const upcoming = [];
    const recent = [];
    for (const g of displayGames) {
      if (g.isLive || g.status === 'in') live.push(g);
      else if (g.isFinal || g.status === 'post') recent.push(g);
      else upcoming.push(g);
    }
    return { liveGames: live, upcomingGames: upcoming, recentGames: recent };
  }, [displayGames]);

  if (compact && !displayGames.length && !loading) return null;

  const pollLabel = FAST_POLL_LEAGUES.has(activeLeague) ? 'every 20 seconds' : 'every 30 seconds';

  return (
    <section className="relative overflow-hidden rounded-2xl border border-primary-700/30 bg-gradient-to-br from-primary-950 via-primary-900 to-gray-950 shadow-xl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(168,85,247,0.15),_transparent_50%)]" />
      <div className="relative px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-breaking/20 ring-1 ring-breaking/40">
              <Radio className="h-5 w-5 text-breaking" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-white sm:text-2xl">Live Scoreboard</h2>
              <p className="text-xs text-primary-200/80">
                Live, upcoming &amp; recent results · updates {pollLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => load(activeLeague, { refresh: true, showLoading: true })}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {leagues.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => switchLeague(l.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition ${
                activeLeague === l.id
                  ? 'bg-white text-primary-950 shadow'
                  : 'bg-white/10 text-white/70 hover:bg-white/20'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        {hasEventFilter && eventOptions.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label htmlFor="score-event-filter" className="text-xs font-semibold uppercase tracking-wide text-white/50">
              Competition
            </label>
            <select
              id="score-event-filter"
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="max-w-full flex-1 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 sm:max-w-md"
            >
              <option value="all" className="bg-primary-950 text-white">
                All ({games.length})
              </option>
              {eventOptions.map((name) => {
                const count = games.filter((g) => g.competition === name).length;
                return (
                  <option key={name} value={name} className="bg-primary-950 text-white">
                    {name} ({count})
                  </option>
                );
              })}
            </select>
          </div>
        )}
        {loading && games.length === 0 ? (
          <div className="mt-6 flex gap-3 overflow-hidden">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-28 min-w-[220px] animate-pulse rounded-xl bg-white/5 sm:min-w-[260px]"
              />
            ))}
          </div>
        ) : displayGames.length === 0 ? (
          <p className="mt-6 text-center text-sm text-white/50">
            {eventFilter !== 'all' ? 'No matches for this competition right now.' : 'No games scheduled right now.'}
          </p>
        ) : (
          <div className="mt-5 space-y-5">
            {liveGames.length > 0 && (
              <ScoreboardRow label="Live now" games={liveGames} accent="live" />
            )}
            {upcomingGames.length > 0 && (
              <ScoreboardRow label="Upcoming" games={upcomingGames} accent="upcoming" />
            )}
            {recentGames.length > 0 && (
              <ScoreboardRow label="Recent results" games={recentGames} accent="final" />
            )}
          </div>
        )}
        {updatedAt && (
          <p className="mt-3 text-right text-[10px] text-white/40">
            Updated {new Date(updatedAt).toLocaleTimeString()}
          </p>
        )}
      </div>
    </section>
  );
}

function ScoreboardRow({ label, games, accent }) {
  const accentCls =
    accent === 'live'
      ? 'text-breaking'
      : accent === 'final'
        ? 'text-emerald-300'
        : 'text-sky-300';

  return (
    <div>
      <p className={`mb-2 text-[10px] font-bold uppercase tracking-widest ${accentCls}`}>{label}</p>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {games.map((g) => (
          <ScoreCard key={g.id} game={g} />
        ))}
      </div>
    </div>
  );
}
