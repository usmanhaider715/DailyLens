'use client';

import { useEffect, useRef, useState } from 'react';
import { fallbackHeroUrl, resolveHeroSrc } from '@/utils/heroImage';

const LOAD_TIMEOUT_MS = 15000;

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
  const [loaded, setLoaded] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    setSrc(resolveHeroSrc(url, category));
    setErrored(false);
    setLoaded(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setErrored(true);
      setLoaded(true);
    }, LOAD_TIMEOUT_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [url, category]);

  const display = errored ? fallbackHeroUrl(category) : src;

  const imgClass = fill
    ? `absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`.trim()
    : `transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`.trim();

  const wrapperClass = fill ? 'relative h-full w-full' : 'relative inline-block w-full';

  return (
    <div className={wrapperClass}>
      {!loaded && !errored && (
        <div
          className={`absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-700 ${fill ? '' : 'rounded-inherit min-h-[120px]'}`}
          aria-hidden
        />
      )}
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
        onLoad={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          setLoaded(true);
        }}
        onError={() => {
          if (timerRef.current) clearTimeout(timerRef.current);
          if (!errored) {
            setErrored(true);
            setSrc(fallbackHeroUrl(category));
            setLoaded(true);
          }
        }}
      />
    </div>
  );
}
