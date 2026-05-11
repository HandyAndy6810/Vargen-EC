import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = '@vargen_theme_mode';

export interface Colors {
  paper:      string;
  paperDeep:  string;
  card:       string;
  ink:        string;
  muted:      string;
  mutedHi:    string;
  lineSoft:   string;
  orange:     string;
  orangeDeep: string;
  orangeSoft: string;
  red:        string;
  redSoft:    string;
  green:      string;
  greenSoft:  string;
  teal:       string;
  tealSoft:   string;
  statusBar:  'dark' | 'light';
  blurTint:   'light' | 'dark' | 'default';
}

export const lightColors: Colors = {
  paper:      '#FFFBF8',
  paperDeep:  '#FFF0E6',
  card:       '#FFFFFF',
  ink:        '#1A0E06',
  muted:      'rgba(26,14,6,0.50)',
  mutedHi:    'rgba(26,14,6,0.72)',
  lineSoft:   'rgba(26,14,6,0.08)',
  orange:     '#FF5C00',
  orangeDeep: '#E64500',
  orangeSoft: '#FFF0E6',
  red:        '#FF3B30',
  redSoft:    'rgba(255,59,48,0.12)',
  green:      '#34C759',
  greenSoft:  'rgba(52,199,89,0.12)',
  teal:       '#00C7BE',
  tealSoft:   'rgba(0,199,190,0.12)',
  statusBar:  'dark',
  blurTint:   'light',
};

export const darkColors: Colors = {
  paper:      '#0D0E11',
  paperDeep:  '#080909',
  card:       '#16181D',
  ink:        '#F2F4F7',
  muted:      'rgba(242,244,247,0.48)',
  mutedHi:    'rgba(242,244,247,0.70)',
  lineSoft:   'rgba(242,244,247,0.10)',
  orange:     '#FF5C00',
  orangeDeep: '#E64500',
  orangeSoft: 'rgba(255,92,0,0.15)',
  red:        '#FF453A',
  redSoft:    'rgba(255,69,58,0.18)',
  green:      '#30D158',
  greenSoft:  'rgba(48,209,88,0.18)',
  teal:       '#63E6E2',
  tealSoft:   'rgba(99,230,226,0.18)',
  statusBar:  'light',
  blurTint:   'dark',
};

interface ThemeCtx {
  mode: ThemeMode;
  colors: Colors;
  isDark: boolean;
  ready: boolean;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  mode: 'system',
  colors: lightColors,
  isDark: false,
  ready: false,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setModeState(val);
      }
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  function setMode(m: ThemeMode) {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m);
  }

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  return React.createElement(
    ThemeContext.Provider,
    { value: { mode, colors, isDark, ready, setMode } },
    children,
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
