import React from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { term } from '@/data/glossary';
import { brands, db, markTerm } from '@/lib/store';
import { C, F } from '@/lib/theme';

import { watchBadges } from './celebrate';
import { alertBox } from './overlay';

/** Shows what a glossary word means, and counts it as read. */
export async function explainWord(id: string) {
  const t = term(id);
  if (!t) return;
  const celebrate = watchBadges();
  markTerm(t.id);
  await alertBox(t.word, db.settings.level === 'simple' ? t.simple : t.detailed);
  await celebrate();
}

/**
 * Text with hard words you can tap. `[shares](share)` underlines "shares" and opens the glossary entry `share`;
 * `{b1}`, `{b2}` and `{b3}` become the companies the student picked when they signed up.
 */
export function Words({ text, size = 17, color = C.text, center, style }: { text: string; size?: number; color?: string; center?: boolean; style?: StyleProp<TextStyle> }) {
  const names = brands().map((b) => b.name.replace(/ \(.*\)$/, ''));
  const filled = text.replace(/\{b([123])\}/g, (_, n) => names[Number(n) - 1]);
  const parts = filled.split(/(\[[^\]]+\]\([a-z0-9-]+\))/g);
  return (
    <Text style={[{ fontFamily: F, color, fontSize: size, lineHeight: Math.round(size * 1.4), textAlign: center ? 'center' : undefined }, style]}>
      {parts.map((part, i) => {
        const m = /^\[([^\]]+)\]\(([a-z0-9-]+)\)$/.exec(part);
        if (!m) return part;
        return (
          <Text key={i} accessibilityRole="button" accessibilityLabel={`What does ${m[1]} mean?`} onPress={() => explainWord(m[2])}
            style={{ color: C.accent, fontWeight: '600', textDecorationLine: 'underline' }}>
            {m[1]}
          </Text>
        );
      })}
    </Text>
  );
}
