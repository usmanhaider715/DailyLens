'use client';

import { useState } from 'react';
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
  const [src, setSrc] = useState(() => resolveHeroSrc(url, category));
  const [errored, setErrored] = useState(false);

  const display = errored ? fallbackHeroUrl(category) : src;

  const imgClass = fill
    ? `absolute inset-0 h-full w-full object-cover ${className}`.trim()
    : className;

  return (
    <img
      src={display}
      alt={alt}
      className={imgClass}
      loading={loading}
      fetchPriority={fetchPriority}
      width={width}
      height={height}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (!errored) {
          setErrored(true);
          setSrc(fallbackHeroUrl(category));
        }
      }}
    />
  );
}
