import axios from 'axios';
import { cacheGet, cacheSet } from './cacheService.js';
import { getLiveCacheTtl } from '../utils/liveCacheTtl.js';
import { sortScoreboardGames } from '../utils/scoreboardSort.js';

const SPORTS_DB = 'https://www.thesportsdb.com/api/v1/json/3';
const FIXTURES_CACHE_KEY = 'live:scores:cricket:fixtures';
const FIXTURES_TTL = 30 * 60; // 30 min — league lists change slowly

/** ICC / international competitions (TheSportsDB league IDs) */
const ICC_LEAGUE_IDS = [
  '4575',
  '4801',
  '4844',
  '4979',
  '5100',
  '5102',
  '5103',
  '5104',
  '4458',
  '4459',
];

const FRANCHISE_LEAGUE_IDS = [
  '4460',
  '4461',
  '4462',
  '4463',
  '5067',
  '5078',
  '5174',
  '5175',
  '5176',
  '5177',
  '5401',
  '5490',
];

const ALL_LEAGUE_IDS = [...new Set([...ICC_LEAGUE_IDS, ...FRANCHISE_LEAGUE_IDS])];
const ICC_SEASON_IDS = ['5103', '5100', '4979', '4575', '4801', '4844'];
/** Leagues to pull last completed fixtures from */
const PAST_RESULTS_LEAGUE_IDS = ['4460', '4461', '4462', '4463', '4575', '4801'];
const RECENT_DAY_OFFSETS = [-7, -6, -5, -4, -3, -2, -1, 0, 1, 2];

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function abbreviate(name) {
  if (!name) return '—';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 4).toUpperCase();
  return parts
    .map((p) => p[0])
    .join('')
    .slice(0, 4)
    .toUpperCase();
}

function parseStatus(strStatus = '') {
  const s = strStatus.toLowerCase();
  if (s.includes('live') || s.includes('progress') || s === 'in play') {
    return { state: 'in', isLive: true, isFinal: false };
  }
  if (
    s.includes('finished') ||
    s.includes('completed') ||
    s.includes('won') ||
    s === 'ft' ||
    s.includes('result')
  ) {
    return { state: 'post', isLive: false, isFinal: true };
  }
  return { state: 'pre', isLive: false, isFinal: false };
}

function parseEventStart(ev) {
  if (ev.strTimestamp) {
    const d = new Date(ev.strTimestamp);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (ev.dateEvent) {
    const timePart = (ev.strTimeLocal || ev.strTime || '12:00:00').slice(0, 8);
    const d = new Date(`${ev.dateEvent}T${timePart}`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function formatScheduledLabel(date) {
  if (!date) return 'Scheduled';
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function formatScore(value, strResult, side) {
  if (value != null && value !== '') return String(value);
  if (!strResult) return '—';
  const parts = strResult.split(/\s+v\s+|\s+vs\s+/i);
  if (parts.length === 2) {
    return side === 'home' ? parts[1].trim() : parts[0].trim();
  }
  return strResult.length <= 12 ? strResult : '—';
}

function mapCricketEvent(ev) {
  const { state, isLive, isFinal } = parseStatus(ev.strStatus || '');
  const startsAt = parseEventStart(ev);
  const homeScore = formatScore(ev.intHomeScore, ev.strResult, 'home');
  const awayScore = formatScore(ev.intAwayScore, ev.strResult, 'away');

  let statusText = ev.strStatus || ev.strDescriptionEN || '';
  if (state === 'pre' && startsAt) {
    statusText = `Starts ${formatScheduledLabel(startsAt)}`;
  } else if (state === 'pre' && /not started/i.test(ev.strStatus || '')) {
    statusText = startsAt ? `Starts ${formatScheduledLabel(startsAt)}` : 'Not started';
  }

  return {
    id: `cricket-${ev.idEvent}`,
    league: ev.strLeague || 'Cricket',
    leagueId: 'cricket',
    competition: ev.strLeague || 'Cricket',
    status: state,
    statusText,
    clock: ev.strTimeLocal || ev.strTime || '',
    startsAt: startsAt?.toISOString() || null,
    completedAt: isFinal && startsAt ? startsAt.toISOString() : null,
    eventDate: startsAt?.toISOString() || null,
    isLive,
    isFinal,
    venue: ev.strVenue || null,
    home: {
      name: ev.strHomeTeam || 'TBD',
      abbr: abbreviate(ev.strHomeTeam),
      score: state === 'pre' ? '—' : homeScore,
      logo: ev.strHomeTeamBadge || null,
      winner:
        isFinal && ev.intHomeScore != null && ev.intAwayScore != null
          ? Number(ev.intHomeScore) > Number(ev.intAwayScore)
          : false,
    },
    away: {
      name: ev.strAwayTeam || 'TBD',
      abbr: abbreviate(ev.strAwayTeam),
      score: state === 'pre' ? '—' : awayScore,
      logo: ev.strAwayTeamBadge || null,
      winner:
        isFinal && ev.intHomeScore != null && ev.intAwayScore != null
          ? Number(ev.intAwayScore) > Number(ev.intHomeScore)
          : false,
    },
    link: ev.strVideo || `https://www.espncricinfo.com/search?q=${encodeURIComponent(ev.strEvent || '')}`,
  };
}

function mapCricketDataMatch(m) {
  const status = m.status || m.state || '';
  const { state, isLive, isFinal } = parseStatus(status);
  const startsAt = m.dateTimeGMT ? new Date(m.dateTimeGMT) : null;
  const teams = m.teams || [];
  const t1 = teams[0] || {};
  const t2 = teams[1] || {};
  const score = m.score || [];

  const scoreFor = (idx) => {
    if (state === 'pre') return '—';
    const block = score[idx];
    if (!block) return '—';
    const inn = block.inning || block;
    if (inn.r != null && inn.w != null) return `${inn.r}/${inn.w}`;
    if (inn.r != null) return String(inn.r);
    return '—';
  };

  let statusText = status;
  if (state === 'pre' && startsAt && !Number.isNaN(startsAt.getTime())) {
    statusText = `Starts ${formatScheduledLabel(startsAt)}`;
  }

  return {
    id: `cricket-${m.id || m.name}`,
    league: m.series || m.name || 'Cricket',
    leagueId: 'cricket',
    competition: m.series || m.name || 'Cricket',
    status: state,
    statusText,
    clock: m.dateTimeGMT || '',
    startsAt: startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt.toISOString() : null,
    completedAt:
      isFinal && startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt.toISOString() : null,
    eventDate: startsAt && !Number.isNaN(startsAt.getTime()) ? startsAt.toISOString() : null,
    isLive,
    isFinal,
    venue: m.venue || null,
    home: {
      name: t2.name || t2.teamName || 'TBD',
      abbr: abbreviate(t2.name || t2.teamName),
      score: scoreFor(1),
      logo: t2.img || null,
      winner: false,
    },
    away: {
      name: t1.name || t1.teamName || 'TBD',
      abbr: abbreviate(t1.name || t1.teamName),
      score: scoreFor(0),
      logo: t1.img || null,
      winner: false,
    },
    link: m.url || `https://www.espncricinfo.com/search?q=${encodeURIComponent(m.name || '')}`,
  };
}

async function sportsDbGet(path, params = {}) {
  const { data } = await axios.get(`${SPORTS_DB}/${path}`, {
    params,
    timeout: 12000,
    headers: { 'User-Agent': 'DailyLensBot/1.0' },
  });
  return data.events || [];
}

async function fetchInBatches(ids, fetcher, batchSize = 3) {
  const results = [];
  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize);
    const batch = await Promise.allSettled(chunk.map(fetcher));
    results.push(...batch);
    if (i + batchSize < ids.length) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return results;
}

function collectEvents(results) {
  const byId = new Map();
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const ev of r.value) {
      if (ev?.idEvent && ev.strSport === 'Cricket') {
        byId.set(ev.idEvent, ev);
      }
    }
  }
  return [...byId.values()];
}

/** Light fetch: past week + today + next 2 days. */
async function fetchTheSportsDbRecentDays() {
  const today = new Date();
  const dates = RECENT_DAY_OFFSETS.map((offset) =>
    formatDate(new Date(today.getTime() + offset * 86400000)),
  );
  const dayResults = await Promise.allSettled(
    dates.map((d) => sportsDbGet('eventsday.php', { d, s: 'Cricket' })),
  );
  return collectEvents(dayResults);
}

async function fetchTheSportsDbPastLeagues() {
  const pastResults = await fetchInBatches(
    PAST_RESULTS_LEAGUE_IDS,
    (id) => sportsDbGet('eventspastleague.php', { id }),
    2,
  );
  return collectEvents(pastResults).slice(0, 80);
}

/** Full fetch: recent days + league fixtures (cached separately). */
async function fetchTheSportsDbFull() {
  const recent = await fetchTheSportsDbRecentDays();
  const byId = new Map(recent.map((ev) => [ev.idEvent, ev]));

  let fixtures = await cacheGet(FIXTURES_CACHE_KEY);
  if (!fixtures) {
    const season = String(new Date().getFullYear());
    const nextResults = await fetchInBatches(
      ALL_LEAGUE_IDS,
      (id) => sportsDbGet('eventsnextleague.php', { id }),
      3,
    );
    const iccSeasonResults = await fetchInBatches(
      ICC_SEASON_IDS,
      (id) => sportsDbGet('eventsseason.php', { id, s: season }),
      2,
    );
    fixtures = collectEvents([...nextResults, ...iccSeasonResults]);
    await cacheSet(FIXTURES_CACHE_KEY, fixtures, FIXTURES_TTL);
  }

  for (const ev of fixtures) {
    byId.set(ev.idEvent, ev);
  }

  return [...byId.values()];
}

async function fetchCricketDataMatches() {
  const apikey = process.env.CRICKETDATA_API_KEY;
  if (!apikey) return [];

  try {
    const { data } = await axios.get('https://api.cricapi.com/v1/currentMatches', {
      params: { apikey, offset: 0 },
      timeout: 12000,
      headers: { 'User-Agent': 'DailyLensBot/1.0' },
    });
    if (data?.status !== 'success' || !Array.isArray(data.data)) return [];
    return data.data.map(mapCricketDataMatch);
  } catch {
    return [];
  }
}

function mergeGameLists(...lists) {
  const byId = new Map();
  for (const list of lists) {
    for (const g of list || []) {
      if (g?.id) byId.set(g.id, g);
    }
  }
  return sortScoreboardGames([...byId.values()]).slice(0, 48);
}

function buildPayload(games, sources, fetchedAt = new Date().toISOString()) {
  const competitions = [...new Set(games.map((g) => g.competition).filter(Boolean))].sort();
  return {
    leagueId: 'cricket',
    label: 'Cricket',
    games,
    competitions,
    updatedAt: new Date().toISOString(),
    fetchedAt,
    sources,
  };
}

export async function getCricketScores({ refresh = false } = {}) {
  const cacheKey = 'live:scores:cricket';
  const cached = await cacheGet(cacheKey);

  if (!refresh && cached?.games?.length) {
    return cached;
  }

  const previousGames = cached?.games || [];
  const useFullFetch = !cached?.games?.length;

  const [sportsDbResult, pastLeaguesResult, cricketDataResult] = await Promise.allSettled([
    useFullFetch ? fetchTheSportsDbFull() : fetchTheSportsDbRecentDays(),
    fetchTheSportsDbPastLeagues(),
    fetchCricketDataMatches(),
  ]);

  const freshMapped = [];
  if (sportsDbResult.status === 'fulfilled') {
    for (const ev of sportsDbResult.value) {
      freshMapped.push(mapCricketEvent(ev));
    }
  }
  if (pastLeaguesResult.status === 'fulfilled') {
    for (const ev of pastLeaguesResult.value) {
      freshMapped.push(mapCricketEvent(ev));
    }
  }
  if (cricketDataResult.status === 'fulfilled') {
    freshMapped.push(...cricketDataResult.value);
  }

  const games = mergeGameLists(previousGames, freshMapped);

  if (games.length === 0 && cached?.games?.length) {
    return cached;
  }

  const payload = buildPayload(games, {
    theSportsDb: sportsDbResult.status === 'fulfilled',
    cricketData:
      cricketDataResult.status === 'fulfilled' && Boolean(process.env.CRICKETDATA_API_KEY),
  });

  await cacheSet(cacheKey, payload, getLiveCacheTtl(games));
  return payload;
}

export async function findCricketGameById(matchId) {
  if (!matchId) return null;
  const board = await getCricketScores();
  return board.games?.find((g) => g.id === matchId) || null;
}
