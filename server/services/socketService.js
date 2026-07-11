let ioRef = null;
let peakLiveCount = 0;
const serverStartedAt = new Date();

const PUBLIC_MIN = 500;
const PUBLIC_MAX = 1000;
let publicDisplayCount = randomInRange(PUBLIC_MIN, PUBLIC_MAX);

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function nudgePublicCount() {
  const delta = randomInRange(-12, 12);
  publicDisplayCount = Math.min(PUBLIC_MAX, Math.max(PUBLIC_MIN, publicDisplayCount + delta));
  if (Math.random() < 0.08) {
    publicDisplayCount = randomInRange(PUBLIC_MIN, PUBLIC_MAX);
  }
}

export function setSocketIO(io) {
  ioRef = io;
}

export function getIO() {
  return ioRef;
}

export function getLiveConnectionCount() {
  if (!ioRef) return 0;
  return typeof ioRef.engine?.clientsCount === 'number'
    ? ioRef.engine.clientsCount
    : ioRef.sockets?.sockets?.size ?? 0;
}

export function getPublicDisplayCount() {
  return publicDisplayCount;
}

export function getLiveTrafficStats() {
  const liveNow = getLiveConnectionCount();
  if (liveNow > peakLiveCount) peakLiveCount = liveNow;
  return {
    liveNow,
    publicDisplayCount: getPublicDisplayCount(),
    peakSinceRestart: peakLiveCount,
    serverStartedAt: serverStartedAt.toISOString(),
    displayLocation: 'Breaking news ticker (top bar)',
    method: 'socket.io',
    publicCountRange: `${PUBLIC_MIN}–${PUBLIC_MAX}`,
  };
}

export function emitBreakingNews(payload) {
  ioRef?.emit('breaking_news', payload);
}

export function emitTickerUpdate(headlines) {
  ioRef?.emit('ticker_update', headlines);
}

export function emitLiveCount(n) {
  ioRef?.emit('live_count', n);
}

export function broadcastLiveCount() {
  if (!ioRef) return;
  const real = getLiveConnectionCount();
  if (real > peakLiveCount) peakLiveCount = real;
  emitLiveCount(real);
}

/** Notify clients that live scoreboards were refreshed (cricket, soccer, etc.). */
export function emitLiveScoresUpdated(leagueIds = []) {
  ioRef?.emit('live_scores_updated', { leagues: leagueIds, at: new Date().toISOString() });
}
