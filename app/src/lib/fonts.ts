// Loads the Inter typeface in a browser. On Android the font files are built into the app by the expo-font
// plugin (app.json), which also maps each weight, so nothing needs loading there.
import { Asset } from 'expo-asset';
import { Platform } from 'react-native';

import { F } from './theme';

const FACES: [number, number][] = [
  [400, require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf')],
  [500, require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf')],
  [600, require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf')],
  [700, require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf')],
  [800, require('@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf')],
];

export function loadWebFonts() {
  if (Platform.OS !== 'web' || typeof document === 'undefined' || document.getElementById('ic-fonts')) return;
  const style = document.createElement('style');
  style.id = 'ic-fonts';
  style.textContent = FACES.map(([weight, file]) => `@font-face{font-family:'${F}';font-weight:${weight};font-style:normal;font-display:swap;src:url('${Asset.fromModule(file).uri}') format('truetype');}`).join('');
  document.head.appendChild(style);
}
