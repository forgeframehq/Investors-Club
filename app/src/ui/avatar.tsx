import { Pressable, Text, View } from 'react-native';

import { F } from '@/lib/theme';
import { AVATARS, avatar } from '@/data/avatars';

import { C, Icon } from './kit';

/** A round profile picture. Falls back to the first letter of the name when no picture was chosen. */
export function Avatar({ id, name = '', size = 40 }: { id?: string; name?: string; size?: number }) {
  const def = avatar(id);
  const colour = def?.colour ?? C.muted;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: `${colour}2E`, borderWidth: 1, borderColor: `${colour}80`, alignItems: 'center', justifyContent: 'center' }}>
      {def
        ? <Icon name={def.icon} size={size * 0.52} color={colour} />
        : !name.trim() ? <Icon name="person" size={size * 0.5} color={C.muted} />
        : <Text style={{ fontFamily: F, color: C.text, fontSize: size * 0.42, fontWeight: '700' }}>{(name.trim()[0] ?? '?').toUpperCase()}</Text>}
    </View>
  );
}

/** A grid of pictures to choose from. */
export function AvatarPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
      {AVATARS.map((a) => (
        <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`Picture ${a.name}`} accessibilityState={{ selected: value === a.id }} onPress={() => onChange(a.id)}
          style={({ pressed }) => ({ padding: 3, borderRadius: 34, borderWidth: 2, borderColor: value === a.id ? C.accent : 'transparent', opacity: pressed ? 0.7 : 1 })}>
          <Avatar id={a.id} size={56} />
        </Pressable>
      ))}
    </View>
  );
}
