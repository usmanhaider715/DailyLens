'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext(null);

function readDarkPreference() {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('theme') === 'dark';
}

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setDark(readDarkPreference());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const root = document.documentElement;
    root.classList.toggle('dark', dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark, ready]);

  const value = useMemo(
    () => ({
      dark,
      toggle: () => setDark((d) => !d),
      setDark,
    }),
    [dark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
