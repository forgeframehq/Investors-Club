import { Image } from 'expo-image';
import { View } from 'react-native';

import { BADGE_ART, RANK_ART } from '@/data/art';

import { C } from './kit';

function Tile({ image, size, dim, label }: { image: number | undefined; size: number; dim?: boolean; label: string }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.24, overflow: 'hidden', backgroundColor: C.cardHi, opacity: dim ? 0.3 : 1 }}>
      {!!image && <Image source={image} contentFit="cover" accessibilityLabel={label} style={{ width: size, height: size }} />}
    </View>
  );
}

/** The emblem for an investor level (1 to 6). `dim` shows it faded, for a rung not reached yet. */
export const Emblem = ({ level, size = 48, dim }: { level: number; size?: number; dim?: boolean }) =>
  <Tile image={RANK_ART[Math.max(1, Math.min(RANK_ART.length, level)) - 1]} size={size} dim={dim} label={`Level ${level} emblem`} />;

/** The medal for a badge. `dim` shows it faded, for a badge not earned yet. */
export const Medal = ({ id, size = 64, dim }: { id: string; size?: number; dim?: boolean }) =>
  <Tile image={BADGE_ART[id]} size={size} dim={dim} label="Badge medal" />;
