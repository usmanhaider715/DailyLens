import { useMemo, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArticleCard } from '../components/home/ArticleCard.jsx';

function VirtualArticleGrid({ items }) {
  const parentRef = useRef(null);
  const rows = useMemo(() => {
    const out = [];
    for (let i = 0; i < items.length; i += 3) out.push(items.slice(i, i + 3));
    return out;
  }, [items]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 420,
    overscan: 4,
  });

  return (
    <div ref={parentRef} className="mt-8 h-[800px] overflow-auto">
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="grid gap-6 pb-6 md:grid-cols-3"
            >
              {row.map((a) => (
                <ArticleCard key={a._id || a.slug} article={a} variant="default" />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default VirtualArticleGrid;
