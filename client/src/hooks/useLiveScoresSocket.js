import { useEffect } from 'react';
import { getSocket } from '../services/socket.js';

/** Refetch scores when the server poller pushes fresh cricket/soccer data. */
export function useLiveScoresSocket(activeLeague, onUpdate) {
  useEffect(() => {
    const socket = getSocket();
    const handler = ({ leagues = [] }) => {
      if (activeLeague === 'all' || leagues.includes(activeLeague)) {
        onUpdate(true);
      }
    };
    socket.on('live_scores_updated', handler);
    return () => {
      socket.off('live_scores_updated', handler);
    };
  }, [activeLeague, onUpdate]);
}
