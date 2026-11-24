import { Image } from 'expo-image';
import { Pressable, Text, View } from 'react-native';

import { AVATARS, avatar, TIERS } from '@/data/avatars';
import { F } from '@/lib/theme';

import { C, Icon, Row, Txt } from './kit';
import { toast } from './overlay';

/** A round profile picture, ringed in its tier's colour. Falls back to the first letter of the name when no picture was chosen. */
export function Avatar({ id, name = '', size = 40 }: { id?: string; name?: string; size?: number }) {
  const def = avatar(id);
  if (def) {
    const ring = Math.max(2, Math.round(size * 0.05));
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: ring, borderColor: TIERS[def.tier].colour, overflow: 'hidden', backgroundColor: C.cardHi }}>
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

/**
 * Pictures to choose from, grouped by tier. `level` is the student's investor level: tiers above it are shown
 * locked, so there is something to work towards. With `starterOnly` (the welcome steps) only the first tier shows.
 */
export function AvatarPicker({ value, onChange, level = 1, starterOnly }: { value: string; onChange: (id: string) => void; level?: number; starterOnly?: boolean }) {
  return (
    <View style={{ gap: 14 }}>
      {TIERS.map((tier, t) => {
        if (starterOnly && t > 0) return null;
        const open = level >= tier.level;
        return (
          <View key={tier.name} style={{ gap: 8 }}>
            {!starterOnly && (
              <Row gap={8}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tier.colour }} />
                <Txt size={14} bold>{tier.name}</Txt>
                {!open && <Txt size={13} color={C.muted}>Unlocks at level {tier.level}</Txt>}
              </Row>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: starterOnly ? 'center' : 'flex-start' }}>
              {AVATARS.filter((a) => a.tier === t).map((a) => (
                <Pressable key={a.id} accessibilityRole="button" accessibilityLabel={`Picture ${a.name}`} accessibilityState={{ selected: value === a.id, disabled: !open }}
                  onPress={() => (open ? onChange(a.id) : toast(`${a.name} unlocks at level ${tier.level}. Keep learning!`))}
                  style={({ pressed }) => ({ padding: 3, borderRadius: 40, borderWidth: 3, borderColor: value === a.id ? C.accent : 'transparent', opacity: pressed ? 0.7 : 1 })}>
                  <View style={{ opacity: open ? 1 : 0.35 }}><Avatar id={a.id} size={64} /></View>
                  {!open && (
                    <View style={{ position: 'absolute', right: 0, bottom: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: C.text, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="lock-closed" size={13} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        );
      })}
    </View>
  );
}
