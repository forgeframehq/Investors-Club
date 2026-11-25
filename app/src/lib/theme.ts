// Colours and look. Everything reads C and T at render time, so changing a look setting and remounting the
// screens re-themes the app. Never copy these into module-level constants or StyleSheet.create.
import { Appearance } from 'react-native';

/** The app's typeface. On Android it is built into the app (see the expo-font plugin in app.json); in a browser lib/fonts.ts loads it. */
export const F = 'Inter';

// The palette comes from Bermuda: pink sand, turquoise water, and the pastel houses with their white roofs.
// Accents are a shade deeper than the pastels so buttons and links stay easy to read on a light background.
export const ACCENTS = {
  Ocean: { accent: '#0FA3A8', accentDim: '#D6F3F2', onAccent: '#FFFFFF' },
  'Pink Sand': { accent: '#E8658F', accentDim: '#FFE1EA', onAccent: '#FFFFFF' },
  Sky: { accent: '#3D8FE0', accentDim: '#DBECFC', onAccent: '#FFFFFF' },
  Sunshine: { accent: '#F2B63C', accentDim: '#FFF1CC', onAccent: '#3A2A00' },
  Coral: { accent: '#F27A5E', accentDim: '#FFE3DB', onAccent: '#FFFFFF' },
  Lilac: { accent: '#8E7BE0', accentDim: '#E9E3FC', onAccent: '#FFFFFF' },
} as const;
export type AccentName = keyof typeof ACCENTS;
export const DEFAULT_ACCENT: AccentName = 'Ocean';

/** House colours, for tiles that sit side by side: pink, yellow, mint, sky, lilac. */
export const PASTELS = ['#FFD6E0', '#FFEFB5', '#CDEFE0', '#CFE6FA', '#E4DBFB'];

const LIGHT = {
  bg: '#FFF3EE', // pink sand
  bar: '#FFFFFF',
  card: '#FFFFFF',
  cardHi: '#F4ECEA',
  border: '#EFDFDA',
  text: '#16324A', // deep ocean blue
  muted: '#667A8C',
  warm: '#E8793A', // second highlight: streaks, tips, cautions
  third: '#8E7BE0', // third series colour in charts
  good: '#1FA971',
  goodDim: '#DFF5EA',
  bad: '#E5484D',
  badDim: '#FDE3E3',
  dark: '#16324A',
};
// Night on the water: deep ocean blues, with the same accents a little brighter against them.
const DARK: typeof LIGHT = {
  bg: '#0D1924',
  bar: '#122231',
  card: '#16293A',
  cardHi: '#20384E',
  border: '#27405A',
  text: '#EAF2F8',
  muted: '#9DB2C4',
  warm: '#F08A4B',
  third: '#A999F0',
  good: '#34C98A',
  goodDim: '#12382C',
  bad: '#FF6B6E',
  badDim: '#45211F',
  dark: '#0A141D',
};

export const C = {
  ...LIGHT,
  accent: ACCENTS.Ocean.accent as string,
  accentDim: ACCENTS.Ocean.accentDim as string,
  onAccent: ACCENTS.Ocean.onAccent as string, // text and icons drawn on top of the accent colour
};

/** Things about how the app looks that are not colours. Read at render time, like C. */
export const T = {
  /** True while the dark colours are in use. */
  dark: false,
  /** Every text size is multiplied by this: 1, or 1.15 for "Large". */
  scale: 1,
  /** False when the student asked for less movement: the price tape stands still and cards do not flip. */
  motion: true,
};

export type ThemeChoice = 'light' | 'dark' | 'auto';
/** Mixes two colours given as #RRGGBB: `part` of the first, the rest of the second. */
function mix(a: string, b: string, part: number) {
  const n = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return `#${[0, 1, 2].map((i) => Math.round(n(a, i) * part + n(b, i) * (1 - part)).toString(16).padStart(2, '0')).join('')}`;
}

/**
 * Puts the student's choices into C and T. Call it whenever a look setting changes; the root layout then remounts
 * the screens (see its `key`) so every one of them picks up the new look.
 */
export function applyTheme(look: { accent?: string; theme?: string; textSize?: string; lessMotion?: boolean } = {}) {
  const dark = look.theme === 'dark' || (look.theme === 'auto' && Appearance.getColorScheme() === 'dark');
  const accent = ACCENTS[(look.accent && look.accent in ACCENTS ? look.accent : DEFAULT_ACCENT) as AccentName];
  Object.assign(C, dark ? DARK : LIGHT, accent, dark ? { accentDim: mix(accent.accent, DARK.card, 0.24) } : {});
  T.dark = dark;
  T.scale = look.textSize === 'large' ? 1.15 : 1;
  T.motion = !look.lessMotion;
}
