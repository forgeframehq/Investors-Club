import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { AVATARS, avatar } from '@/data/avatars';
import { F } from '@/lib/theme';

import { C, Icon } from './kit';

/** A round profile picture. Falls back to the first letter of the name when no picture was chosen. */
export function Avatar({ id, name = '', size = 40 }: { id?: string; name?: string; size?: number }) {
  const def = avatar(id);
  if (def) {
    const ring = Math.max(2, Math.round(size * 0.05));
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: ring, borderColor: C.card, overflow: 'hidden', backgroundColor: C.cardHi }}>
        <Image source={def.image} contentFit="cover" accessibilityLabel={`${def.name} picture`} style={{ width: size - ring * 2, height: size - ring * 2 }} />
      </View>
    );
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: C.cardHi, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center' }}>
      {!name.trim()
        ? <Icon name="person" size={size * 0.5} color={C.muted} />
        : <Text style={{ fontFamily: F, color: C.text, fontSize: size * 0.42, fontWeight: '700' }}>{(name.trim()[0] ?? '?').toUpperCase()}</Text>}
    </View>
  );
}

/** Every character, to choose from. */
export function AvatarPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
      {AVATARS.map((a) => (
        <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`Picture ${a.name}`} accessibilityState={{ selected: value === a.id }} onPress={() => onChange(a.id)}
          style={({ pressed }) => ({ padding: 3, borderRadius: 40, borderWidth: 3, borderColor: value === a.id ? C.accent : 'transparent', opacity: pressed ? 0.7 : 1 })}>
          <Avatar id={a.id} size={60} />
        </Pressable>
      ))}
    </View>
  );
}
