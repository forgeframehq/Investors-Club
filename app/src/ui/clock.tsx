import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { marketClock } from '@/lib/market';
import { useStore } from '@/lib/store';

import { C, Txt } from './kit';

/**
 * The market clock: open or closed, and how long until that changes ("closes in 3h 12m (5:00 pm)"). Times are
 * Bermuda time. It moves on every half minute. It informs; it is not a race, so there are no seconds.
 */
export function MarketClock({ card }: { card?: boolean }) {
  useStore(); // the server's own "open" answer arrives with prices
  const [, tick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(timer);
  }, []);
  const clock = marketClock();
  const colour = clock.soon ? C.warm : clock.open ? C.good : C.muted;
  return (
    <View accessibilityLabel="Market clock" style={[{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, card && { backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border, paddingHorizontal: 12, paddingVertical: 9 }]}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: colour }} />
      <Txt size={14} bold color={clock.open ? C.text : C.muted}>{clock.title}</Txt>
      {!!clock.detail && <Txt size={14} color={C.muted} style={{ flexShrink: 1 }}>{clock.detail}</Txt>}
    </View>
  );
}
