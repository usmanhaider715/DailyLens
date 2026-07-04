let ioRef = null;
let peakLiveCount = 0;
const serverStartedAt = new Date();

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

export function getLiveTrafficStats() {
  const liveNow = getLiveConnectionCount();
  if (liveNow > peakLiveCount) peakLiveCount = liveNow;
  return {
    liveNow,
    peakSinceRestart: peakLiveCount,
    serverStartedAt: serverStartedAt.toISOString(),
    displayLocation: 'Breaking news ticker (top bar)',
    method: 'socket.io',
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
  const n = getLiveConnectionCount();
  if (n > peakLiveCount) peakLiveCount = n;
  emitLiveCount(n);
}

/** Notify clients that live scoreboards were refreshed (cricket, soccer, etc.). */
export function emitLiveScoresUpdated(leagueIds = []) {
  ioRef?.emit('live_scores_updated', { leagues: leagueIds, at: new Date().toISOString() });
}
