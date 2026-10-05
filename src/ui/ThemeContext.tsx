/**
 * ThemeProvider and useTheme hook for Wini.
 * Where it fits: Wraps the root layout and provides active theme tokens across the app.
 *
 * Supports three user choices (WINI_DESIGN_SPEC Section 3):
 * - 'system': Automatically follows OS dark/light mode (default)
 * - 'night': Dark fintech theme (#0B0B0D with #F2F96E lime accent)
 * - 'pocket': Light wallet theme (#F3F4F7 with #2B5BE8 blue accent)
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeColors, nightColors, pocketColors } from './tokens';
import { getRepository } from '../db';

export type ThemeMode = 'system' | 'night' | 'pocket';
export type ActiveTheme = 'night' | 'pocket';

export interface ThemeContextValue {
  mode: ThemeMode;
  activeTheme: ActiveTheme;
  colors: ThemeColors;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'system',
  activeTheme: 'night',
  colors: nightColors,
  isDark: true,
  setThemeMode: async () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Load saved theme preference on start
  useEffect(() => {
    let active = true;
    const repo = getRepository();

    repo
      .getSetting('theme_mode', 'system')
      .then((savedMode) => {
        if (active && (savedMode === 'system' || savedMode === 'night' || savedMode === 'pocket')) {
          setModeState(savedMode as ThemeMode);
        }
      })
      .catch((err) => {
        console.warn('Failed to load theme setting:', err);
      });

    return () => {
      active = false;
    };
  }, []);

  const setThemeMode = useCallback(async (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      const repo = getRepository();
      await repo.setSetting('theme_mode', newMode);
    } catch (err) {
      console.warn('Failed to persist theme setting:', err);
    }
  }, []);

  // Determine effective theme
  const activeTheme: ActiveTheme =
    mode === 'system' ? (systemColorScheme === 'light' ? 'pocket' : 'night') : mode;

  const currentColors = activeTheme === 'pocket' ? pocketColors : nightColors;
  const isDark = activeTheme === 'night';

  const value: ThemeContextValue = {
    mode,
    activeTheme,
    colors: currentColors,
    isDark,
    setThemeMode,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
