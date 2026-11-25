// "Check before you buy": a few cards about the company, each with one quick question, then the reason for
// buying. The answers come from the stock's own markers, so the student has to read them. Nothing here says
// whether to buy: it only makes sure the choice is made with open eyes.
import React, { useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { money } from '@/lib/format';
import { loadMarkers } from '@/lib/market';
import { markChecked, portfolio, stock, useStore } from '@/lib/store';
import type { Markers } from '@/lib/types';

import { Bar, Btn, C, Icon, Row, TapCard, Txt } from './kit';

/** The reasons a student can give. The ids are saved with the trade so the teacher can see them. */
export const REASONS: { id: string; label: string; icon: React.ComponentProps<typeof Icon>['name'] }[] = [
  { id: 'know', label: 'I know the company', icon: 'heart-outline' },
  { id: 'numbers', label: 'The numbers look good', icon: 'speedometer-outline' },
  { id: 'spread', label: 'To spread my risk', icon: 'grid-outline' },
  { id: 'guess', label: 'Just a guess', icon: 'help-circle-outline' },
];
export const reasonLabel = (id: string | undefined) => REASONS.find((r) => r.id === id)?.label ?? '';

interface Check { title: string; fact: string; q: string; options: string[]; answer: number; why: string }

function checks(symbol: string, m: Markers | null): Check[] {
  const s = stock(symbol);
  const name = s.name.replace(/ \(.*\)$/, '');
  const out: Check[] = [];
  if (m?.cap) {
    const big = m.cap >= 10_000;
    const text = m.cap >= 1_000_000 ? `$${(m.cap / 1_000_000).toFixed(2)} trillion` : m.cap >= 1000 ? `$${Math.round(m.cap / 1000)} billion` : `$${Math.round(m.cap)} million`;
    out.push({
      title: 'Company size', fact: `${name} is worth ${text}. That makes it a ${m.cap >= 200_000 ? 'giant' : big ? 'large' : m.cap >= 2000 ? 'medium' : 'small'} company.`,
      q: big ? 'Prices of big companies are usually...' : 'Smaller companies can grow faster, but usually carry...', options: big ? ['Steadier', 'Jumpier'] : ['More risk', 'Less risk'], answer: 0,
      why: big ? 'Big companies tend to be steadier. They can still fall.' : 'Smaller companies can grow fast, and fall fast too.',
    });
    if (m.pe && m.pe > 0) {
      out.push({
        title: 'The price of profit (P/E)', fact: `Buyers pay $${m.pe.toFixed(0)} for each $1 of yearly profit.`,
        q: 'Is that low, middle or high?', options: ['Low (under 15)', 'Middle (15 to 30)', 'High (over 30)'], answer: m.pe < 15 ? 0 : m.pe <= 30 ? 1 : 2,
        why: m.pe > 30 ? 'High. People expect profit to grow a lot. They may be right, or just hopeful.' : m.pe < 15 ? 'Low. Buyers are paying little for the profit. Ask yourself why that might be.' : 'In the middle. Neither a bargain nor pricey for its profit.',
      });
    } else {
      out.push({ title: 'The price of profit (P/E)', fact: `${name} has no P/E right now.`, q: 'Why would a company have no P/E?', options: ['It made no profit this year', 'It has no shares'], answer: 0, why: 'No profit means there is nothing to divide the price by. That is worth knowing before you buy.' });
    }
  }
  if (m?.beta !== undefined) {
    out.push({
      title: 'Jumpiness', fact: `Jumpiness is ${m.beta.toFixed(2)}. The whole market is 1.00.`,
      q: 'Compared with the whole market, this price swings...', options: ['Less', 'About the same', 'More'], answer: m.beta < 0.8 ? 0 : m.beta <= 1.3 ? 1 : 2,
      why: m.beta > 1.3 ? 'More. Expect bigger ups and bigger downs.' : m.beta < 0.8 ? 'Less. A calmer ride than most.' : 'About the same as the market.',
    });
  }
  if (m) {
    const div = m.div ?? 0;
    out.push({
      title: 'Dividend', fact: div > 0 ? `${name} pays a dividend of ${div.toFixed(2)}% a year.` : `${name} pays no dividend.`,
      q: 'If you owned $100 of its shares, about how much would it pay you each year?', options: ['Nothing', `About ${money(div > 0 ? div : 3)}`, 'About $50'], answer: div > 0 ? 1 : 0,
      why: div > 0 ? `${div.toFixed(2)}% of $100 is ${money(div)}. Small, but it arrives whatever the price does.` : 'It keeps its profit to grow instead. Any gain has to come from the price rising.',
    });
  }
  const p = portfolio();
  const groups = new Set(p.holdings.map((h) => stock(h.symbol).sector));
  const fresh = !groups.has(s.sector);
  out.push({
    title: 'Your mix', fact: p.holdings.length ? `You own ${p.holdings.length} ${p.holdings.length === 1 ? 'stock' : 'stocks'} in ${groups.size} ${groups.size === 1 ? 'group' : 'groups'}. ${name} is in ${s.sector}.` : `You do not own anything yet. ${name} is in the ${s.sector} group.`,
    q: 'Would this be a new group for you?', options: ['Yes, a new group', 'No, I already own this group'], answer: fresh ? 0 : 1,
    why: fresh ? 'A new group spreads your money, so one bad result hurts less.' : 'More of the same group means more depends on that group doing well.',
  });
  return out;
}

/** The check itself. `onDone` gets the reason picked; `onSkip` is offered only once the check is optional. */
export function Coach({ symbol, onDone, onSkip }: { symbol: string; onDone: (why: string) => void; onSkip?: () => void }) {
  const { markers } = useStore();
  const [ready, setReady] = useState(!!markers[symbol]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [why, setWhy] = useState('');
  useEffect(() => { loadMarkers(symbol).finally(() => setReady(true)); }, [symbol]);
  // Worked out once, so answering does not reshuffle the cards.
  const list = useMemo(() => (ready ? checks(symbol, markers[symbol] ?? null) : []), [ready, symbol]); // eslint-disable-line react-hooks/exhaustive-deps
  const name = stock(symbol).name.replace(/ \(.*\)$/, '');

  if (!ready) return <Txt size={14} color={C.muted} center style={{ paddingVertical: 24 }}>Getting the facts about {name}...</Txt>;
  const c = list[i];
  return (
    <View style={{ gap: 12 }}>
      <Row>
        <Icon name="shield-checkmark-outline" color={C.accent} />
        <Txt size={19} bold style={{ flex: 1 }}>Check before you buy</Txt>
        <Txt size={13} color={C.muted}>{Math.min(i + 1, list.length + 1)} of {list.length + 1}</Txt>
      </Row>
      <Bar value={i / (list.length + 1)} height={6} />
      {c ? (
        <>
          <Txt size={12} bold color={C.accent} style={{ letterSpacing: 0.5 }}>{c.title.toUpperCase()}</Txt>
          <Txt size={16}>{c.fact}</Txt>
          <Txt size={16} bold>{c.q}</Txt>
          {c.options.map((o, k) => {
            const answered = picked !== null;
            const right = k === c.answer;
            return (
              <TapCard key={o} label={`Check answer ${k + 1}`} onPress={() => { if (!answered) setPicked(k); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 13, backgroundColor: !answered ? C.cardHi : right ? C.goodDim : k === picked ? C.badDim : C.cardHi }}>
                <Txt size={15} style={{ flex: 1 }}>{o}</Txt>
                {answered && right && <Icon name="checkmark-circle" color={C.good} />}
                {answered && !right && k === picked && <Icon name="close-circle" color={C.bad} />}
              </TapCard>
            );
          })}
          {picked !== null && (
            <>
              <Txt size={14} color={C.muted}>{c.why}</Txt>
              <Btn title="Next" onPress={() => { setI(i + 1); setPicked(null); }} />
            </>
          )}
        </>
      ) : (
        <>
          <Txt size={16} bold>Why are you buying {name}?</Txt>
          {REASONS.map((r) => (
            <TapCard key={r.id} label={`Reason: ${r.label}`} onPress={() => setWhy(r.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, backgroundColor: C.cardHi, borderWidth: 2, borderColor: why === r.id ? C.accent : C.cardHi }}>
              <Icon name={r.icon} color={why === r.id ? C.accent : C.text} />
              <Txt size={15} style={{ flex: 1 }}>{r.label}</Txt>
              {why === r.id && <Icon name="checkmark-circle" color={C.accent} />}
            </TapCard>
          ))}
          {why === 'guess' && <Txt size={14} color={C.muted}>Thanks for being honest. Guessing is how most people start. Next time, see if one of the cards gives you a reason.</Txt>}
          <Btn title="Choose how much" disabled={!why} onPress={() => { markChecked(symbol); onDone(why); }} />
        </>
      )}
      {onSkip && <Btn title="Skip the check" kind="plain" onPress={onSkip} />}
    </View>
  );
}
