'use client';

import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '@/hooks/useDarkMode';

export function DarkModeToggle() {
  const { dark, toggle } = useDarkMode();
  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-full border border-gray-200 p-2 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
      aria-label="Toggle dark mode"
    >
      {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
