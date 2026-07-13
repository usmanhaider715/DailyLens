'use client';

import { HeroImage } from './HeroImage';

/** Fixed-aspect hero thumbnail for cards and lists. */
export function HeroImageFrame({
  url,
  alt = '',
  category,
  aspect = '16/10',
  className = '',
  rounded = 'none',
}) {
  const round =
    rounded === 'md' ? 'rounded-md' : rounded === 'lg' ? 'rounded-lg' : rounded === 'xl' ? 'rounded-xl' : '';

  // Only default to full width when the caller hasn't set an explicit width
  // (e.g. `w-[88px]`, `w-24`). Otherwise Tailwind's conflicting `w-*` utilities
  // resolve by CSS source order and `w-full` can win, blowing out fixed-size
  // thumbnails on mobile.
  const width = /(^|\s)w-/.test(className) ? '' : 'w-full';

  return (
    <div
      className={`relative ${width} overflow-hidden bg-gray-100 dark:bg-gray-800 ${round} ${className}`}
      style={{ aspectRatio: aspect }}
    >
      <HeroImage url={url} alt={alt} category={category} fill className="object-cover" />
    </div>
  );
}
