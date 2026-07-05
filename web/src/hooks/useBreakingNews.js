'use client';

import { useEffect, useState } from 'react';
import { getSocket } from '@/services/socket';

export function useBreakingNews(initial = []) {
  const [items, setItems] = useState(initial);
  const [liveCount, setLiveCount] = useState(0);

  useEffect(() => {
    let socket;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      socket = getSocket();
      if (!socket) return;

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
          })),
        );
      };
      const onLive = (n) => setLiveCount(n);

      socket.on('breaking_news', onBreaking);
      socket.on('ticker_update', onTicker);
      socket.on('live_count', onLive);
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      const id = window.requestIdleCallback(connect, { timeout: 2500 });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
        if (socket) {
          socket.off('breaking_news');
          socket.off('ticker_update');
          socket.off('live_count');
        }
      };
    }

    const timer = setTimeout(connect, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      if (socket) {
        socket.off('breaking_news');
        socket.off('ticker_update');
        socket.off('live_count');
      }
    };
  }, []);

  return { items, liveCount, setItems };
}
