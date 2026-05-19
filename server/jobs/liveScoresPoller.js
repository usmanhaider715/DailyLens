import { logger } from '../utils/logger.js';
import { getCricketScores } from '../services/cricketScoresService.js';
import { getLiveScores, getSoccerScores } from '../services/liveScoresService.js';
import { emitLiveScoresUpdated } from '../services/socketService.js';

const LIVE_LEAGUES = ['cricket', 'soccer'];

export function startLiveScoresPoller() {
  const tick = async () => {
    try {
      await Promise.allSettled([
        getCricketScores({ refresh: true }),
        getSoccerScores({ refresh: true }),
      ]);
      emitLiveScoresUpdated(LIVE_LEAGUES);
    } catch (e) {
      logger.warn('live scores poller tick failed', e?.message);
    }
  };

  tick();
  const id = setInterval(tick, 30000);
  logger.info('Live scores poller started (30s — cricket & soccer)');
  return () => clearInterval(id);
}
