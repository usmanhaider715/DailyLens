import { useCallback, useEffect, useRef } from 'react';

export function useInfiniteScroll({ loading, hasMore, onLoadMore }) {
  const ref = useRef(null);

  const onScroll = useCallback(() => {
    const el = ref.current;
    if (!el || loading || !hasMore) return;
    const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 200;
    if (nearBottom) onLoadMore();
  }, [loading, hasMore, onLoadMore]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.addEventListener('scroll', onScroll);
    return () => el.removeEventListener('scroll', onScroll);
  }, [onScroll]);

  return ref;
}
