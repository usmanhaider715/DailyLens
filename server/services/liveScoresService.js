import axios from 'axios';
import { cacheGet, cacheSet, cacheDel } from './cacheService.js';
import { getCricketScores } from './cricketScoresService.js';
import { getLiveCacheTtl } from '../utils/liveCacheTtl.js';
import { sortScoreboardGames } from '../utils/scoreboardSort.js';
import { logger } from '../utils/logger.js';

const PAST_DAYS_ESPN = 7;
const FUTURE_DAYS_ESPN = 2;

const ESPN_LEAGUES = [
  {
    id: 'nfl',
    label: 'NFL',
    url: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
  },
  {
    id: 'nba',
    label: 'NBA',
    url: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
  },
  {
    id: 'mlb',
    label: 'MLB',
    url: 'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard',
  },
  {
    id: 'nhl',
    label: 'NHL',
    url: 'https://site.api.espn.com/apis/site/v2/sports/hockey/nhl/scoreboard',
  },
];

export const SOCCER_LEAGUES = [
  { slug: 'eng.1', label: 'Premier League', competition: 'Premier League' },
  { slug: 'esp.1', label: 'La Liga', competition: 'La Liga' },
  { slug: 'ger.1', label: 'Bundesliga', competition: 'Bundesliga' },
  { slug: 'ita.1', label: 'Serie A', competition: 'Serie A' },
  { slug: 'fra.1', label: 'Ligue 1', competition: 'Ligue 1' },
  { slug: 'usa.1', label: 'MLS', competition: 'MLS' },
];

const CRICKET_LEAGUE = { id: 'cricket', label: 'Cricket' };
const SOCCER_LEAGUE = { id: 'soccer', label: 'Soccer' };

const LEAGUES = [...ESPN_LEAGUES, CRICKET_LEAGUE, SOCCER_LEAGUE];

function mapTeam(competitor) {
  if (!competitor) return null;
  return {
    name: competitor.team?.displayName || competitor.team?.name || 'TBD',
    abbr: competitor.team?.abbreviation || '—',
    score: String(competitor.score ?? '0'),
    logo: competitor.team?.logo || null,
    winner: competitor.winner === true,
  };
}

function formatEspnDate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function parseScoreboard(data, leagueMeta, competition, idPrefix = false) {
  return (data?.events || []).map((ev) => {
    const comp = ev.competitions?.[0];
    const competitors = comp?.competitors || [];
    const home = competitors.find((c) => c.homeAway === 'home') || competitors[0];
    const away = competitors.find((c) => c.homeAway === 'away') || competitors[1];
    const state = ev.status?.type?.state || 'pre';
    const eventDate = ev.date || comp?.date || null;

    return {
      id: idPrefix ? `soccer-${ev.id}` : String(ev.id),
      league: leagueMeta.label,
      leagueId: leagueMeta.id,
      competition: competition || leagueMeta.label,
      status: state,
      statusText: ev.status?.type?.shortDetail || ev.status?.type?.detail || '',
      clock: ev.status?.displayClock || '',
      eventDate,
      startsAt: state === 'pre' ? eventDate : null,
      completedAt: state === 'post' ? eventDate : null,
      isLive: state === 'in',
      isFinal: state === 'post',
      home: mapTeam(home),
      away: mapTeam(away),
      link: comp?.links?.[0]?.href || ev.links?.[0]?.href || null,
    };
  });
}

function mergeGamesById(...lists) {
  const byId = new Map();
  for (const list of lists) {
    for (const g of list || []) {
      if (g?.id) byId.set(g.id, g);
    }
  }
  return sortScoreboardGames([...byId.values()]);
}

async function fetchEspnGamesForDateRange(baseUrl, leagueMeta, competition, idPrefix, pastDays, futureDays) {
  const lists = [];
  const today = new Date();

  lists.push(await fetchEspnScoreboard(baseUrl, leagueMeta, competition, idPrefix));

  for (let offset = -pastDays; offset <= futureDays; offset += 1) {
    if (offset === 0) continue;
    const d = new Date(today.getTime() + offset * 86400000);
    const url = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}dates=${formatEspnDate(d)}`;
    const dayGames = await fetchEspnScoreboard(url, leagueMeta, competition, idPrefix);
    if (offset < 0) {
      lists.push(dayGames.filter((g) => g.isFinal || g.status === 'post'));
    } else {
      lists.push(dayGames.filter((g) => g.status === 'pre'));
    }
  }

  return mergeGamesById(...lists).slice(0, 40);
}

async function fetchEspnScoreboard(url, leagueMeta, competition, idPrefix = false) {
  try {
    const { data } = await axios.get(url, {
      timeout: 12000,
      headers: { 'User-Agent': 'DailyLensBot/1.0' },
      validateStatus: (s) => s < 500,
    });
    if (!data?.events) return [];
    return parseScoreboard(data, leagueMeta, competition, idPrefix);
  } catch (err) {
    logger.error(`ESPN scoreboard failed ${leagueMeta.id}:`, err.message);
    return [];
  }
}

async function fetchLeagueScores(leagueMeta, { refresh = false } = {}) {
  const cacheKey = `live:scores:${leagueMeta.id}`;
  const cached = await cacheGet(cacheKey);
  if (!refresh && cached) return cached;

  const games = await fetchEspnGamesForDateRange(
    leagueMeta.url,
    leagueMeta,
    leagueMeta.label,
    false,
    PAST_DAYS_ESPN,
    FUTURE_DAYS_ESPN
  );
  const payload = {
    leagueId: leagueMeta.id,
    label: leagueMeta.label,
    games,
    updatedAt: new Date().toISOString(),
  };

  if (games.length === 0 && cached?.games?.length) return cached;

  await cacheSet(cacheKey, payload, getLiveCacheTtl(games));
  return payload;
}

export async function getSoccerScores({ refresh = false } = {}) {
  const cacheKey = 'live:scores:soccer';
  const cached = await cacheGet(cacheKey);
  if (!refresh && cached?.games?.length) return cached;

  const previousGames = cached?.games || [];
  const leagueMeta = { id: 'soccer', label: 'Soccer' };
  const results = await Promise.allSettled(
    SOCCER_LEAGUES.map(async (sl) => {
      const base = `https://site.api.espn.com/apis/site/v2/sports/soccer/${sl.slug}/scoreboard`;
      return fetchEspnGamesForDateRange(base, leagueMeta, sl.competition, true, 5, 2);
    }),
  );

  const freshLists = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const games = mergeGamesById(previousGames, ...freshLists).slice(0, 56);

  if (games.length === 0 && cached?.games?.length) return cached;

  const competitions = [...new Set(games.map((g) => g.competition).filter(Boolean))].sort();

  const payload = {
    leagueId: 'soccer',
    label: 'Soccer',
    games,
    competitions,
    updatedAt: new Date().toISOString(),
  };

  await cacheSet(cacheKey, payload, getLiveCacheTtl(games));
  return payload;
}

async function fetchBoardForLeague(meta, options = {}) {
  if (meta.id === 'cricket') {
    return getCricketScores(options);
  }
  if (meta.id === 'soccer') {
    return getSoccerScores(options);
  }
  return fetchLeagueScores(meta, options);
}

export async function getLiveScores(leagueId, { refresh = false } = {}) {
  if (leagueId && leagueId !== 'all') {
    const meta = LEAGUES.find((l) => l.id === leagueId);
    if (!meta) {
      return { leagues: LEAGUES.map((l) => ({ id: l.id, label: l.label })), active: null, games: [] };
    }
    try {
      const result = await fetchBoardForLeague(meta, { refresh });
      return {
        leagues: LEAGUES.map((l) => ({ id: l.id, label: l.label })),
        active: result.leagueId,
        ...result,
      };
    } catch (err) {
      logger.error(`live scores ${leagueId}:`, err.message);
      const cached = await cacheGet(`live:scores:${leagueId}`);
      if (cached) return { leagues: LEAGUES.map((l) => ({ id: l.id, label: l.label })), active: leagueId, ...cached };
      return { leagues: LEAGUES.map((l) => ({ id: l.id, label: l.label })), active: leagueId, games: [], label: meta.label };
    }
  }

  const cacheKey = 'live:scores:all';
  if (!refresh) {
    const cached = await cacheGet(cacheKey);
    if (cached) return cached;
  } else {
    await cacheDel(cacheKey);
  }

  const results = await Promise.allSettled(
    LEAGUES.map((l) => fetchBoardForLeague(l, { refresh })),
  );

  const boards = results.filter((r) => r.status === 'fulfilled').map((r) => r.value);
  const allGames = boards.flatMap((b) => b.games || []);
  const payload = {
    leagues: LEAGUES.map((l) => ({ id: l.id, label: l.label })),
    boards,
    updatedAt: new Date().toISOString(),
  };

  await cacheSet(cacheKey, payload, getLiveCacheTtl(allGames));
  return payload;
}
