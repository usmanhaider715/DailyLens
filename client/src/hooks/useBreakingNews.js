import { useEffect, useState } from 'react';
import { getSocket } from '../services/socket.js';

export function useBreakingNews(initial = []) {
  const [items, setItems] = useState(initial);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    const s = getSocket();
    const onBreaking = (payload) => {
      setItems((prev) => {
        const next = [{ ...payload, key: `${payload.slug}-${Date.now()}` }, ...prev];
        return next.slice(0, 30);
      });
    };
    const onTicker = (list) => {
      setItems(
        (list || []).map((x) => ({
          ...x,
          headline: x.title,
          key: x.slug,
        }))
      );
    };
    const onLive = (n) => setLiveCount(n);
    s.on('breaking_news', onBreaking);
    s.on('ticker_update', onTicker);
    s.on('live_count', onLive);
    return () => {
      s.off('breaking_news', onBreaking);
      s.off('ticker_update', onTicker);
      s.off('live_count', onLive);
    };
  }, []);

  return { items, liveCount, setItems };
}
