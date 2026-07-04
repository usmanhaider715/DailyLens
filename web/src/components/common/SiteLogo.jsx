import Link from 'next/link';

export function SiteLogo({ size = 'md', showText = true, href = '/', className = '' }) {
  const sizes = {
    sm: { img: 28, class: 'h-7 w-7' },
    md: { img: 36, class: 'h-9 w-9' },
    lg: { img: 48, class: 'h-12 w-12' },
  };
  const s = sizes[size] || sizes.md;

  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="The Daily Lens"
        width={s.img}
        height={s.img}
        className={`${s.class} shrink-0 object-contain`}
        decoding="async"
      />
      {showText && (
        <span className="font-display text-xl font-bold text-primary-950 dark:text-white sm:text-2xl">
          The Daily Lens
        </span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className={`flex items-center gap-2.5 ${className}`}>
        {inner}
      </Link>
    );
  }

  return <div className={`flex items-center gap-2.5 ${className}`}>{inner}</div>;
}

