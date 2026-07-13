'use client';

import { useEffect } from 'react';

/**
 * Fire-and-forget reader engagement tracking: records max scroll depth and a
 * "read complete" signal (scrolled past ~90% after dwelling a few seconds).
 * Deduped per session, sent via sendBeacon so it never blocks navigation.
 */
export function ArticleEngagementTracker({ slug }) {
  useEffect(() => {
    if (!slug || typeof window === 'undefined') return;

    const sessionKey = `dl_eng_${slug}`;
    let alreadyRead = false;
    try {
      alreadyRead = sessionStorage.getItem(sessionKey) === '1';
    } catch {
      /* ignore */
    }

    const start = Date.now();
    let maxDepth = 0;
    let readSent = alreadyRead;

    const send = (payload) => {
      const url = `/api/articles/${encodeURIComponent(slug)}/engagement`;
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        if (navigator.sendBeacon && navigator.sendBeacon(url, blob)) return;
      } catch {
        /* fall through */
      }
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {});
    };

    const computeDepth = () => {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - window.innerHeight;
      const depth = scrollable > 0 ? ((window.scrollY || 0) / scrollable) * 100 : 100;
      maxDepth = Math.max(maxDepth, Math.min(100, depth));

      if (!readSent && maxDepth >= 90 && Date.now() - start > 8000) {
        readSent = true;
        try {
          sessionStorage.setItem(sessionKey, '1');
        } catch {
          /* ignore */
        }
        send({ event: 'read', scrollDepth: Math.round(maxDepth) });
      }
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        computeDepth();
        ticking = false;
      });
    };

    const onLeave = () => {
      if (maxDepth > 0 && !readSent) send({ scrollDepth: Math.round(maxDepth) });
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onLeave();
    });
    window.addEventListener('pagehide', onLeave);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pagehide', onLeave);
      onLeave();
    };
  }, [slug]);

  return null;
}
