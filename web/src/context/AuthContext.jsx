'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, setAuthToken } from '@/services/api';

const AuthContext = createContext(null);

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

function readSession(key) {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeSession(key, value) {
  if (typeof window === 'undefined') return;
  try {
    if (value == null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = readSession(TOKEN_KEY);
    const raw = readSession(USER_KEY);
    if (t) {
      setToken(t);
      setAuthToken(t);
    }
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        /* ignore */
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (token) {
      writeSession(TOKEN_KEY, token);
      setAuthToken(token);
    } else {
      writeSession(TOKEN_KEY, null);
      setAuthToken(null);
    }
  }, [token, ready]);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    setToken(data.token);
    setUser(data.user);
    writeSession(USER_KEY, JSON.stringify(data.user));
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    writeSession(USER_KEY, null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      ready,
      login,
      logout,
      isAuthenticated: !!token,
    }),
    [token, user, ready]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
