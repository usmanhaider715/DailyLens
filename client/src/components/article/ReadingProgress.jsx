import { useEffect, useState } from 'react';

export function ReadingProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrollTop = el.scrollTop;
      const height = el.scrollHeight - el.clientHeight;
      const p = height > 0 ? Math.min(100, Math.round((scrollTop / height) * 100)) : 0;
      setPct(p);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="pointer-events-none fixed left-0 right-0 top-0 z-50 h-[3px] bg-gray-100/80 dark:bg-gray-800/80">
      <div className="h-full bg-primary-600 transition-[width] duration-150 ease-out" style={{ width: `${pct}%` }} />
    </div>
  );
}
