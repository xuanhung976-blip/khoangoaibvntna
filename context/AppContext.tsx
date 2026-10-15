import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { User } from '../types';
import { isChief } from '../lib/domain';

export type ThemePref = 'light' | 'dark' | 'system';
const THEME_KEY = 'kn_theme';

const readTheme = (): ThemePref => {
  try {
    const value = localStorage.getItem(THEME_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
};

const prefersDark = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

type AppContextValue = {
  user: User;
  chief: boolean;
  theme: ThemePref;
  dark: boolean;
  setTheme: (theme: ThemePref) => void;
  logout: () => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
  passwordOpen: boolean;
  setPasswordOpen: (open: boolean) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export const AppProvider: React.FC<{ user: User; onLogout: () => void; children: React.ReactNode }> = ({ user, onLogout, children }) => {
  const [theme, setThemeState] = useState<ThemePref>(readTheme);
  const [systemDark, setSystemDark] = useState(prefersDark);
  const [commandOpen, setCommandOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!media) return;
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener?.('change', onChange);
    return () => media.removeEventListener?.('change', onChange);
  }, []);

  const dark = theme === 'dark' || (theme === 'system' && systemDark);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#090e18' : '#0f766e');
  }, [dark]);

  const setTheme = useCallback((next: ThemePref) => {
    setThemeState(next);
    try {
      if (next === 'system') localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      chief: isChief(user),
      theme,
      dark,
      setTheme,
      logout: onLogout,
      commandOpen,
      setCommandOpen,
      passwordOpen,
      setPasswordOpen,
    }),
    [user, theme, dark, setTheme, onLogout, commandOpen, passwordOpen],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextValue => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
};
