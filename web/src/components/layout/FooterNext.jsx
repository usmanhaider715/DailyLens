'use client';

import Link from 'next/link';
import { SiteLogo } from '@/components/common/SiteLogo';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-gray-100 bg-gray-50 py-12 dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 md:flex-row md:justify-between">
        <div>
          <SiteLogo href={null} showText size="lg" />
          <p className="mt-2 max-w-md text-sm text-gray-600 dark:text-gray-300">
            Independent news, live scores, and weather — updated throughout the day.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">Sections</div>
            <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
              <li><Link href="/category/World">World</Link></li>
              <li><Link href="/category/Technology">Technology</Link></li>
              <li><Link href="/category/Business">Business</Link></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">Company</div>
            <ul className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
              <li><Link href="/about">About</Link></li>
              <li><Link href="/editorial-standards">Editorial standards</Link></li>
              <li><a href="/feed.xml">RSS Feed</a></li>
              <li><a href="/sitemap.xml">Sitemap</a></li>
              <li><Link href="/legal/privacy">Privacy</Link></li>
              <li><Link href="/legal/terms">Terms</Link></li>
              <li><Link href="/legal/disclaimer">Disclaimer</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-7xl px-4 text-center text-xs text-gray-500">
        © {new Date().getFullYear()} The Daily Lens. All rights reserved.
      </p>
    </footer>
  );
}
