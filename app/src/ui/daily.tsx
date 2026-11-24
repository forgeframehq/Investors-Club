import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

import { money, pct } from '@/lib/format';
import { guessStock, makeGuess, missionsDone, settleGuess, stock, streak, todaysMissions, useStore } from '@/lib/store';

import { mission, watchBadges } from './celebrate';
import { Btn, C, Card, Icon, Row, TapCard, Tile, Txt, type IconName } from './kit';

function Flame() {
  const days = streak();
  return (
    <Row gap={4}>
      <Icon name={days ? 'flame' : 'flame-outline'} size={18} color={days ? C.warm : C.muted} />
      <Txt size={14} color={days ? C.warm : C.muted}>{days} {days === 1 ? 'day' : 'days'} in a row</Txt>
    </Row>
  );
}

/** Today's three missions, each a tap away. */
export function MissionsCard() {
  const router = useRouter();
  useStore();
  const done = missionsDone();
  return (
    <Card>
      <Row>
        <Icon name="flag-outline" color={C.accent} />
        <Txt size={18} bold style={{ flex: 1 }}>Today's missions</Txt>
        <Flame />
      </Row>
      {todaysMissions().map((m) => {
        const ok = done.includes(m.id);
        return (
          <TapCard key={m.id} bare label={`Mission: ${m.title}`} onPress={() => router.push(m.go as never)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }}>
            <Icon name={ok ? 'checkmark-circle' : (m.icon as IconName)} color={ok ? C.accent : C.text} />
            <Txt size={15} color={ok ? C.muted : C.text} style={{ flex: 1, textDecorationLine: ok ? 'line-through' : 'none' }}>{m.title}</Txt>
            {!ok && <Icon name="chevron-forward" size={18} color={C.muted} />}
          </TapCard>
        );
      })}
      <Txt size={13} color={C.muted}>{done.length === 3 ? 'All done. Come back tomorrow to keep your streak going.' : 'Do all three to keep your streak going. New missions every day.'}</Txt>
    </Card>
  );
}

/**
 * Up or down? One stock a day: guess which way the price goes before you next check in. The point it teaches is
 * that nobody can call one day reliably, so the score is always shown next to what a coin would get.
 */
export function GuessCard() {
  const { play, quotes } = useStore();
  useEffect(() => { settleGuess(); });
  const s = guessStock();
  const q = quotes[s.symbol];
  const waiting = play.guess;
  const last = play.lastResult;

  const pick = (way: 'up' | 'down') => {
    const celebrate = watchBadges();
    if (!makeGuess(way)) return;
    mission('guess');
    celebrate();
  };

  return (
    <Card>
      <Row>
        <Icon name="swap-vertical-outline" color={C.accent} />
        <Txt size={18} bold style={{ flex: 1 }}>Up or down?</Txt>
        {play.guesses > 0 && <Txt size={14} color={C.muted}>{play.right} of {play.guesses} right</Txt>}
      </Row>

      {last && (
        <View style={{ backgroundColor: last.right ? C.goodDim : C.cardHi, borderRadius: 12, padding: 12, gap: 2 }}>
          <Txt size={15} bold color={last.right ? C.good : C.text}>{last.right ? 'You were right!' : 'Not this time.'}</Txt>
          <Txt size={14} color={C.muted}>You said {stock(last.symbol).name} would go {last.pick}. It moved {pct(last.movePct)}.</Txt>
        </View>
      )}

      {waiting ? (
        <>
          <Row gap={12}>
            <Tile symbol={waiting.symbol} size={40} />
            <View style={{ flex: 1 }}>
              <Txt size={16} bold>{stock(waiting.symbol).name}</Txt>
              <Txt size={14} color={C.muted}>You said {waiting.pick} from {money(waiting.price)}</Txt>
            </View>
            <Icon name={waiting.pick === 'up' ? 'arrow-up' : 'arrow-down'} color={C.accent} />
          </Row>
          <Txt size={13} color={C.muted}>Come back tomorrow to see if you were right.</Txt>
        </>
      ) : (
        <>
          <Row gap={12}>
            <Tile symbol={s.symbol} size={40} />
            <View style={{ flex: 1 }}>
              <Txt size={16} bold>{s.name}</Txt>
              <Txt size={14} color={C.muted}>{q ? `${money(q.price)} now. Higher or lower tomorrow?` : 'Waiting for a price. Check your connection.'}</Txt>
            </View>
          </Row>
          <Row>
            <Btn title="Up" icon="arrow-up" kind="ghost" color={C.good} style={{ flex: 1 }} disabled={!q} onPress={() => pick('up')} />
            <Btn title="Down" icon="arrow-down" kind="ghost" color={C.bad} style={{ flex: 1 }} disabled={!q} onPress={() => pick('down')} />
          </Row>
        </>
      )}
      <Txt size={13} color={C.muted}>A coin gets about half of these right, and so do most experts. One day is luck, which is why investors think in years.</Txt>
    </Card>
  );
}
