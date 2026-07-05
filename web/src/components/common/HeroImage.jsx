'use client';

import { useEffect, useState } from 'react';
import { fallbackHeroUrl, resolveHeroSrc } from '@/utils/heroImage';

export function HeroImage({
  url,
  alt = '',
  category,
  className = '',
  loading = 'lazy',
  fetchPriority,
  width,
  height,
  fill = false,
}) {
  const [displaySrc, setDisplaySrc] = useState(() =>
    url ? resolveHeroSrc(url, category) : fallbackHeroUrl(category),
  );

  useEffect(() => {
    setDisplaySrc(url ? resolveHeroSrc(url, category) : fallbackHeroUrl(category));
  }, [url, category]);

  const imgClass = fill
    ? `absolute inset-0 h-full w-full object-cover ${className}`.trim()
    : className;

  const wrapperClass = fill ? 'relative h-full w-full overflow-hidden bg-gray-200 dark:bg-gray-800' : 'relative w-full overflow-hidden rounded-inherit bg-gray-200 dark:bg-gray-800';

  return (
    <div className={wrapperClass}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={displaySrc}
        alt={alt}
        className={imgClass}
        loading={loading}
        fetchPriority={fetchPriority}
        width={width}
        height={height}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => {
          const fallback = fallbackHeroUrl(category);
          if (displaySrc !== fallback) setDisplaySrc(fallback);
        }}
      />
    </div>
  );
}
