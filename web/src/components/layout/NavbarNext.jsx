'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { SearchBar } from '@/components/common/SearchBarNext';
import { DarkModeToggle } from '@/components/common/DarkModeToggle';
import { SiteLogo } from '@/components/common/SiteLogo';

const cats = [
  ['World', 'World'],
  ['Tech', 'Technology'],
  ['Business', 'Business'],
  ['Sports', 'Sports'],
  ['Health', 'Health'],
  ['Entertainment', 'Entertainment'],
  ['Politics', 'Politics'],
  ['Crypto', 'Crypto'],
  ['Weather', 'Weather'],
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <SiteLogo />
        <nav className="hidden items-center gap-5 lg:flex">
          {cats.map(([label, path]) => {
            const href = `/category/${encodeURIComponent(path)}`;
            const active = pathname === href;
            return (
              <Link
                key={path}
                href={href}
                className={`text-sm font-medium ${
                  active
                    ? 'text-primary-700 underline decoration-2 underline-offset-8'
                    : 'text-gray-700 hover:text-primary-700 dark:text-gray-200'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          <SearchBar className="hidden md:block" />
          <DarkModeToggle />
          <button
            type="button"
            onClick={() => toast('This feature will be available in the near future.', { icon: '📬' })}
            className="hidden rounded-full bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-800 sm:inline"
          >
            Subscribe
          </button>
          <button
            type="button"
            className="rounded-md p-2 text-gray-700 lg:hidden dark:text-gray-200"
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-gray-100 bg-white px-4 py-3 lg:hidden dark:border-gray-800 dark:bg-gray-900">
          <SearchBar className="mb-3 block md:hidden" inputClassName="!w-full" />
          <div className="flex flex-col gap-2">
            {cats.map(([label, path]) => (
              <Link
                key={path}
                href={`/category/${encodeURIComponent(path)}`}
                className="rounded-md px-2 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
