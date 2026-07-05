'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown, Menu, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { SearchBar } from '@/components/common/SearchBarNext';
import { DarkModeToggle } from '@/components/common/DarkModeToggle';
import { SiteLogo } from '@/components/common/SiteLogo';

const categoryLinks = [
  ['World', 'World'],
  ['Tech', 'Technology'],
  ['Business', 'Business'],
  ['Health', 'Health'],
  ['Entertainment', 'Entertainment'],
  ['Politics', 'Politics'],
  ['Crypto', 'Crypto'],
  ['Weather', 'Weather'],
];

const sportsLinks = [
  { label: 'Sports news', href: '/category/Sports' },
  { label: 'Live scores hub', href: '/live-scores' },
  { label: 'Football / Soccer', href: '/live-scores/football' },
  { label: 'Cricket', href: '/live-scores/cricket' },
  { label: 'NBA', href: '/live-scores/nba' },
  { label: 'NFL', href: '/live-scores/nfl' },
];

function categoryHref(path) {
  return `/category/${encodeURIComponent(path)}`;
}

function NavLink({ href, label, active, onClick }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`text-sm font-medium ${
        active
          ? 'text-primary-700 underline decoration-2 underline-offset-8'
          : 'text-gray-700 hover:text-primary-700 dark:text-gray-200'
      }`}
    >
      {label}
    </Link>
  );
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [sportsOpen, setSportsOpen] = useState(false);
  const pathname = usePathname();

  const sportsActive =
    pathname.startsWith('/category/Sports') || pathname.startsWith('/live-scores');

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <SiteLogo />
        <nav className="hidden items-center gap-5 lg:flex">
          {categoryLinks.slice(0, 3).map(([label, path]) => {
            const href = categoryHref(path);
            return <NavLink key={href} href={href} label={label} active={pathname === href} />;
          })}

          <div
            className="relative"
            onMouseEnter={() => setSportsOpen(true)}
            onMouseLeave={() => setSportsOpen(false)}
          >
            <button
              type="button"
              className={`inline-flex items-center gap-1 text-sm font-medium ${
                sportsActive
                  ? 'text-primary-700 underline decoration-2 underline-offset-8'
                  : 'text-gray-700 hover:text-primary-700 dark:text-gray-200'
              }`}
              aria-expanded={sportsOpen}
            >
              Sports
              <ChevronDown className={`h-4 w-4 transition ${sportsOpen ? 'rotate-180' : ''}`} />
            </button>
            {sportsOpen && (
              <div className="absolute left-0 top-full z-40 mt-1 min-w-[200px] rounded-xl border border-gray-100 bg-white py-2 shadow-lg dark:border-gray-700 dark:bg-gray-900">
                {sportsLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`block px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      pathname === item.href ? 'font-semibold text-primary-700' : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {categoryLinks.slice(3).map(([label, path]) => {
            const href = categoryHref(path);
            return <NavLink key={href} href={href} label={label} active={pathname === href} />;
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
            {categoryLinks.slice(0, 3).map(([label, path]) => {
              const href = categoryHref(path);
              return (
                <Link
                  key={href}
                  href={href}
                  className="rounded-md px-2 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setOpen(false)}
                >
                  {label}
                </Link>
              );
            })}
            <div className="rounded-md bg-gray-50 px-2 py-2 dark:bg-gray-800/60">
              <p className="px-2 text-xs font-bold uppercase tracking-wide text-gray-500">Sports</p>
              {sportsLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-2 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            {categoryLinks.slice(3).map(([label, path]) => {
              const href = categoryHref(path);
              return (
                <Link
                  key={href}
                  href={href}
                  className="rounded-md px-2 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                  onClick={() => setOpen(false)}
                >
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
