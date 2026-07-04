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

  return (
    <div
      className={`relative w-full overflow-hidden bg-gray-100 dark:bg-gray-800 ${round} ${className}`}
      style={{ aspectRatio: aspect }}
    >
      <HeroImage url={url} alt={alt} category={category} fill className="object-cover" />
    </div>
  );
}
