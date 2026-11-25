// The things to tap inside lessons. Each one shows a single idea by letting the student try it.
// None of them has a timer, and none can be "failed": they are for trying, the quiz is for checking.
import React, { useState } from 'react';
import { View } from 'react-native';

import type { PlayKind } from '@/data/lessons';
import { money } from '@/lib/format';

import { Btn, C, Icon, Row, TapCard, Txt } from './kit';

const Box = ({ children }: { children: React.ReactNode }) => <View style={{ backgroundColor: C.cardHi, borderRadius: 14, padding: 14, gap: 10 }}>{children}</View>;
function Sum({ title, value, color = C.text }: { title: string; value: string; color?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', gap: 2 }}>
      <Txt size={12} color={C.muted}>{title}</Txt>
      <Txt size={20} bold color={color}>{value}</Txt>
    </View>
  );
}

function Seesaw() {
  const [buyers, setBuyers] = useState(3);
  const [sellers, setSellers] = useState(3);
  const price = Math.max(2, 20 + (buyers - sellers) * 2);
  const people = (n: number, color: string) => <Row gap={2} style={{ flexWrap: 'wrap', justifyContent: 'center', minHeight: 22 }}>{Array.from({ length: Math.min(n, 12) }, (_, k) => <Icon key={k} name="person" size={18} color={color} />)}</Row>;
  return (
    <Box>
      <Row style={{ alignItems: 'flex-start' }}>
        <View style={{ flex: 1, gap: 4, alignItems: 'center' }}><Txt size={12} color={C.muted}>{buyers} buyers</Txt>{people(buyers, C.good)}</View>
        <View style={{ alignItems: 'center', gap: 2, minWidth: 96 }}>
          <Txt size={12} color={C.muted}>Share price</Txt>
          <Txt size={26} bold color={price > 20 ? C.good : price < 20 ? C.bad : C.text}>{money(price, false)}</Txt>
        </View>
        <View style={{ flex: 1, gap: 4, alignItems: 'center' }}><Txt size={12} color={C.muted}>{sellers} sellers</Txt>{people(sellers, C.bad)}</View>
      </Row>
      <Txt size={14} color={C.muted} center>{buyers > sellers ? 'More people want to buy than sell, so buyers have to offer more.' : buyers < sellers ? 'More people want to sell than buy, so sellers have to accept less.' : 'Buyers and sellers are even, so the price stays put.'}</Txt>
      <Row>
        <Btn title="Add a buyer" kind="ghost" color={C.good} style={{ flex: 1, backgroundColor: C.card }} onPress={() => setBuyers(buyers + 1)} />
        <Btn title="Add a seller" kind="ghost" color={C.bad} style={{ flex: 1, backgroundColor: C.card }} onPress={() => setSellers(sellers + 1)} />
      </Row>
    </Box>
  );
}

function Pe() {
  const [pick, setPick] = useState<string | null>(null);
  const stand = (id: string, cost: number) => (
    <TapCard label={`Company ${id}`} onPress={() => setPick(id)} style={{ flex: 1, alignItems: 'center', gap: 4, borderWidth: 2, borderColor: pick === id ? C.accent : C.card }}>
      <Txt size={16} bold>Company {id}</Txt>
      <Txt size={13} color={C.muted} center>Market cap ${cost} billion</Txt>
      <Txt size={13} color={C.muted} center>Earns $10 billion a year</Txt>
      {pick && <Txt size={15} bold color={C.accent}>P/E {cost / 10}</Txt>}
    </TapCard>
  );
  return (
    <Box>
      <Row style={{ alignItems: 'stretch' }}>{stand('A', 100)}{stand('B', 300)}</Row>
      {pick && <Txt size={14} center>{pick === 'B' ? 'Yes.' : 'It is company B.'} At B, buyers pay $30 for each $1 of earnings. At A they pay $10. B is not worse: investors may expect it to grow faster. But they are paying three times as much for the same earnings today.</Txt>}
    </Box>
  );
}

const SUMMERS = { Rainy: [-30, 6, 3], Sunny: [35, 4, 0] } as const; // fuel prices jump, or a travel boom
const BASKETS = ['Airline', 'Tech', 'Food'];
function Eggs() {
  const [spread, setSpread] = useState<boolean | null>(null);
  const [summer, setSummer] = useState<keyof typeof SUMMERS | null>(null);
  const start = spread ? [3000, 3000, 3000] : [9000, 0, 0];
  const end = summer ? start.map((v, i) => Math.round(v * (1 + SUMMERS[summer][i] / 100))) : start;
  const total = end.reduce((a, b) => a + b, 0);
  return (
    <Box>
      <Row>
        <Btn title="All in airlines" kind={spread === false ? 'primary' : 'ghost'} height={44} style={[{ flex: 1 }, spread !== false && { backgroundColor: C.card }]} onPress={() => { setSpread(false); setSummer(null); }} />
        <Btn title="Split across three" kind={spread ? 'primary' : 'ghost'} height={44} style={[{ flex: 1 }, !spread && { backgroundColor: C.card }]} onPress={() => { setSpread(true); setSummer(null); }} />
      </Row>
      {spread !== null && (
        <>
          <Row>{BASKETS.map((b, i) => <Sum key={b} title={b} value={money(end[i], false)} color={!summer || end[i] === start[i] ? C.text : end[i] > start[i] ? C.good : C.bad} />)}</Row>
          <Row>
            <Btn title="Fuel prices jump" icon="flame-outline" kind="ghost" height={44} style={{ flex: 1, backgroundColor: C.card }} onPress={() => setSummer('Rainy')} />
            <Btn title="Travel boom" icon="airplane-outline" kind="ghost" height={44} style={{ flex: 1, backgroundColor: C.card }} onPress={() => setSummer('Sunny')} />
          </Row>
          {summer && <Txt size={14} center>Your $9,000 is now <Txt size={14} bold color={total >= 9000 ? C.good : C.bad}>{money(total, false)}</Txt>. {spread ? 'Split up, the swings are smaller both ways. That is the trade: less risk, less thrill.' : 'With everything in one sector, one piece of news decides it all. Try splitting it.'}</Txt>}
        </>
      )}
    </Box>
  );
}

function Snowball() {
  const [year, setYear] = useState(0);
  const value = 100 * 1.1 ** year;
  const gain = year ? value - 100 * 1.1 ** (year - 1) : 0;
  return (
    <Box>
      <Row>
        <Sum title="Year" value={String(year)} />
        <Sum title="Worth" value={money(value)} color={C.good} />
        <Sum title="Gain this year" value={money(gain)} />
      </Row>
      <Txt size={14} color={C.muted} center>{year === 0 ? 'The first year adds $10.' : year < 10 ? 'Each year adds a bit more than the last, because the gains are growing too.' : 'After ten years the $100 has more than doubled, and the yearly gain keeps getting bigger.'}</Txt>
      <Btn title={year >= 10 ? 'Start again' : 'Next year'} icon="play-forward-outline" onPress={() => setYear(year >= 10 ? 0 : year + 1)} />
    </Box>
  );
}

const SORT: [string, 'shop' | 'queue'][] = [
  ['Earnings grew 20% this year.', 'shop'],
  ['The stock is trending on social media.', 'queue'],
  ['The P/E ratio is 18.', 'shop'],
  ['The price has risen nine days in a row.', 'queue'],
  ['It is launching a new product line.', 'shop'],
  ['Twice as many shares as usual changed hands this week.', 'queue'],
  ['It raised its dividend.', 'shop'],
  ['The RSI is 80.', 'queue'],
];
function Sort() {
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [said, setSaid] = useState<'shop' | 'queue' | null>(null);
  if (i >= SORT.length) {
    return (
      <Box>
        <Txt size={18} bold center>{right} of {SORT.length} right</Txt>
        <Txt size={14} color={C.muted} center>Earnings, P/E, dividends and plans are the company. Buzz, volume and recent price moves are the crowd.</Txt>
        <Btn title="Play again" kind="ghost" style={{ backgroundColor: C.card }} onPress={() => { setI(0); setRight(0); setSaid(null); }} />
      </Box>
    );
  }
  const [text, answer] = SORT[i];
  const choose = (v: 'shop' | 'queue') => { setSaid(v); if (v === answer) setRight(right + 1); };
  return (
    <Box>
      <Txt size={12} color={C.muted} center>{i + 1} of {SORT.length}</Txt>
      <Txt size={17} bold center>{text}</Txt>
      {said === null ? (
        <Row>
          <Btn title="The company" icon="storefront-outline" kind="ghost" style={{ flex: 1, backgroundColor: C.card }} onPress={() => choose('shop')} />
          <Btn title="The crowd" icon="people-outline" kind="ghost" style={{ flex: 1, backgroundColor: C.card }} onPress={() => choose('queue')} />
        </Row>
      ) : (
        <>
          <Txt size={15} bold center color={said === answer ? C.good : C.bad}>{said === answer ? 'Right.' : 'Not quite.'} That is about the {answer === 'shop' ? 'company' : 'crowd'}.</Txt>
          <Btn title={i === SORT.length - 1 ? 'See my score' : 'Next one'} onPress={() => { setI(i + 1); setSaid(null); }} />
        </>
      )}
    </Box>
  );
}

const PLAYS: Record<PlayKind, () => React.JSX.Element> = { seesaw: Seesaw, pe: Pe, eggs: Eggs, snowball: Snowball, sort: Sort };
/** The thing to tap on a lesson card. */
export function Play({ kind }: { kind: PlayKind }) {
  const Part = PLAYS[kind];
  return <Part />;
}
