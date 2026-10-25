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
  lineMid:    string;
  /** Rim tiles (Home): translucent fill, side/bottom edge, brighter top edge.
   *  Separate from lineSoft, which also draws the row dividers inside cards. */
  tile:       string;
  tileEdge:   string;
  tileRim:    string;
  /** Dark cards that carry white text (invoice, customers and receipts headers).
   *  Graphite in both modes: c.ink flips to near-white in dark mode, which put
   *  white text on a white card. */
  heroFill:   string;
  /** 1px edge for heroFill cards: invisible in light, a hairline in dark where
   *  the graphite card sits close to the page (1.23:1). */
  heroEdge:   string;
  /** Small filled chips, avatars and buttons whose text is c.paper. In dark mode
   *  a lighter grey than the cards but clearly darker than body text, so a filled
   *  tile never matches the text colour (#141416 on it is 7.39:1). */
  fillStrong: string;
  orange:     string;
  orangeDeep: string;
  orangeSoft: string;
  red:        string;
  redSoft:    string;
  green:      string;
  greenSoft:  string;
  teal:       string;
  tealSoft:   string;
  blue:       string;
  blueSoft:   string;
  blueBorder: string;
  statusBar:  'dark' | 'light';
  blurTint:   'light' | 'dark' | 'default';
}

// Neutral greys (redesign, Oct 2026). muted's alpha is higher than before on
// purpose: at 0.50 on the new grey, small muted text fell below 4.5:1 contrast.
export const lightColors: Colors = {
  paper:      '#F2F2F0',
  paperDeep:  '#E8E8E5',
  card:       '#FFFFFF',
  ink:        '#1C1D21',
  muted:      'rgba(28,29,33,0.66)',
  mutedHi:    'rgba(28,29,33,0.80)',
  lineSoft:   'rgba(28,29,33,0.08)',
  lineMid:    'rgba(28,29,33,0.14)',
  tile:       'rgba(255,255,255,0.72)',
  tileEdge:   'rgba(255,255,255,0.80)',
  tileRim:    '#FFFFFF',
  heroFill:   '#1C1D21',
  heroEdge:   '#1C1D21',
  fillStrong: '#1C1D21',
  orange:     '#f26a2a',
  orangeDeep: '#d94d0e',
  orangeSoft: '#ffe6d3',
  red:        '#FF3B30',
  redSoft:    'rgba(255,59,48,0.12)',
  green:      '#34C759',
  greenSoft:  'rgba(52,199,89,0.12)',
  teal:       '#00C7BE',
  tealSoft:   'rgba(0,199,190,0.12)',
  blue:       '#1f6feb',
  blueSoft:   '#eaf2ff',
  blueBorder: '#c8dcff',
  statusBar:  'dark',
  blurTint:   'light',
};

export const darkColors: Colors = {
  paper:      '#141416',
  paperDeep:  '#0E0E10',
  card:       '#1C1D20',
  ink:        '#F2F2F0',
  muted:      'rgba(242,242,240,0.60)',
  mutedHi:    'rgba(242,242,240,0.78)',
  lineSoft:   'rgba(242,242,240,0.10)',
  lineMid:    'rgba(242,242,240,0.16)',
  tile:       'rgba(255,255,255,0.05)',
  tileEdge:   'rgba(255,255,255,0.09)',
  tileRim:    'rgba(255,255,255,0.16)',
  heroFill:   '#26272B',
  heroEdge:   'rgba(255,255,255,0.09)',
  fillStrong: '#A3A4A8',
  orange:     '#f26a2a',
  orangeDeep: '#d94d0e',
  orangeSoft: 'rgba(242,106,42,0.16)',
  red:        '#FF453A',
  redSoft:    'rgba(255,69,58,0.18)',
  green:      '#30D158',
  greenSoft:  'rgba(48,209,88,0.18)',
  teal:       '#63E6E2',
  tealSoft:   'rgba(99,230,226,0.18)',
  blue:       '#6ea8ff',
  blueSoft:   'rgba(110,168,255,0.14)',
  blueBorder: 'rgba(110,168,255,0.35)',
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
