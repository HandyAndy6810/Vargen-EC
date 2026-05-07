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
  paper:      '#f7f4ee',
  paperDeep:  '#efe9dd',
  card:       '#ffffff',
  ink:        '#141310',
  muted:      'rgba(20,19,16,0.55)',
  mutedHi:    'rgba(20,19,16,0.72)',
  lineSoft:   'rgba(20,19,16,0.08)',
  orange:     '#f26a2a',
  orangeDeep: '#d94d0e',
  orangeSoft: '#ffe6d3',
  red:        '#d23b3b',
  redSoft:    '#fde5e5',
  green:      '#2a9d4c',
  greenSoft:  '#e5f6eb',
  teal:       '#0f766e',
  tealSoft:   '#ccfbf1',
  statusBar:  'dark',
  blurTint:   'light',
};

export const darkColors: Colors = {
  paper:      '#141310',
  paperDeep:  '#1e1c18',
  card:       '#232018',
  ink:        '#f7f4ee',
  muted:      'rgba(247,244,238,0.55)',
  mutedHi:    'rgba(247,244,238,0.72)',
  lineSoft:   'rgba(247,244,238,0.1)',
  orange:     '#f26a2a',
  orangeDeep: '#d94d0e',
  orangeSoft: 'rgba(242,106,42,0.2)',
  red:        '#e05555',
  redSoft:    'rgba(224,85,85,0.18)',
  green:      '#34d368',
  greenSoft:  'rgba(52,211,104,0.18)',
  teal:       '#2dd4bf',
  tealSoft:   'rgba(45,212,191,0.18)',
  statusBar:  'light',
  blurTint:   'dark',
};

interface ThemeCtx {
  mode: ThemeMode;
  colors: Colors;
  isDark: boolean;
  setMode: (m: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  mode: 'system',
  colors: lightColors,
  isDark: false,
  setMode: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((val) => {
      if (val === 'light' || val === 'dark' || val === 'system') {
        setModeState(val);
      }
    });
  }, []);

  function setMode(m: ThemeMode) {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m);
  }

  const isDark = mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  return React.createElement(
    ThemeContext.Provider,
    { value: { mode, colors, isDark, setMode } },
    children,
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
