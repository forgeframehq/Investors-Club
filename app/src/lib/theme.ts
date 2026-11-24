// Colours. Everything reads C at render time, so changing the accent and remounting the screens re-themes the app.
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

export const C = {
  bg: '#FFF3EE', // pink sand
  bar: '#FFFFFF',
  card: '#FFFFFF',
  cardHi: '#F4ECEA',
  border: '#EFDFDA',
  text: '#16324A', // deep ocean blue
  muted: '#667A8C',
  accent: ACCENTS.Ocean.accent as string,
  accentDim: ACCENTS.Ocean.accentDim as string,
  onAccent: ACCENTS.Ocean.onAccent as string, // text and icons drawn on top of the accent colour
  warm: '#E8793A', // second highlight: streaks, tips, cautions
  third: '#8E7BE0', // third series colour in charts
  good: '#1FA971',
  goodDim: '#DFF5EA',
  bad: '#E5484D',
  badDim: '#FDE3E3',
  dark: '#16324A',
};

export function applyAccent(name: string | undefined) {
  Object.assign(C, ACCENTS[(name && name in ACCENTS ? name : DEFAULT_ACCENT) as AccentName]);
}
