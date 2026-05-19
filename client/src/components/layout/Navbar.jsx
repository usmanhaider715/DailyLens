import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { SearchBar } from '../common/SearchBar.jsx';
import { DarkModeToggle } from '../common/DarkModeToggle.jsx';

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
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-gray-900/95">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link
          to="/"
          className="font-display text-xl font-bold text-primary-950 dark:text-white sm:text-2xl"
        >
          The Daily Lens
        </Link>

        <nav className="hidden items-center gap-5 lg:flex">
          {cats.map(([label, path]) => (
            <NavLink
              key={path}
              to={`/category/${encodeURIComponent(path)}`}
              className={({ isActive }) =>
                `text-sm font-medium ${
                  isActive
                    ? 'text-primary-700 underline decoration-2 underline-offset-8'
                    : 'text-gray-700 hover:text-primary-700 dark:text-gray-200'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <SearchBar className="hidden md:block" />
          <DarkModeToggle />
          <button
            type="button"
            onClick={() => navigate('/')}
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
                to={`/category/${encodeURIComponent(path)}`}
                className="rounded-md px-2 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800"
                onClick={() => setOpen(false)}
              >
                {label}
              </Link>
            ))}
            <button
              type="button"
              className="mt-2 rounded-full bg-primary-700 py-2 text-sm font-semibold text-white"
              onClick={() => {
                setOpen(false);
                navigate('/');
              }}
            >
              Subscribe
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
