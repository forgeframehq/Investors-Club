import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { term } from '@/data/glossary';
import { lesson, METERS_LESSON } from '@/data/lessons';
import { markerViews, type MarkerView } from '@/data/markers';
import { fmtClock, fmtDayKey, fmtShares, dayKey, money, pct, signedMoney } from '@/lib/format';
import { loadHistory, loadIntraday, loadMarkers, refreshQuotes, source } from '@/lib/market';
import { companyWord, crowdWord, rsi } from '@/lib/meters';
import { dayChangePct, holdingOf, holdingValue, markTerm, portfolio, stock, toggleWatch, useStore } from '@/lib/store';
import type { HistoryPoint, IntraPoint } from '@/lib/types';
import { PriceChart } from '@/ui/chart';
import { mission, watchBadges } from '@/ui/celebrate';
import { Bar, Btn, C, Caption, Card, Chip, Delta, Empty, Icon, IconBtn, Page, Row, Stat, Tile, Txt } from '@/ui/kit';
import { alertBox } from '@/ui/overlay';
import { TradeSheet } from '@/ui/trade';

const RANGES = { Today: 0, '1W': 5, '1M': 22, '3M': 66, '1Y': 400 } as const;
type Range = keyof typeof RANGES;

/** One stock: price, graph, markers to read before choosing, and the buy and sell buttons. */
export default function StockScreen() {
  const { symbol: raw } = useLocalSearchParams<{ symbol: string }>();
  const symbol = String(raw ?? '').toUpperCase();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { quotes, markers, watch, settings, learned } = useStore();
  const s = stock(symbol);
  const q = quotes[symbol];
  const p = portfolio();
  const held = holdingOf(p, symbol);
  const [range, setRange] = useState<Range>('Today');
  const [steps, setSteps] = useState<IntraPoint[] | null>(null);
  const [stepsError, setStepsError] = useState('');
  const [points, setPoints] = useState<HistoryPoint[] | null>(null);
  const [graphError, setGraphError] = useState('');
  const [side, setSide] = useState<'buy' | 'sell' | null>(null);

  useEffect(() => {
    let live = true;
    refreshQuotes();
    loadMarkers(symbol);
    loadHistory(symbol).then((pts) => live && setPoints(pts)).catch((e: Error) => live && setGraphError(e.message));
    loadIntraday(symbol).then((pts) => live && setSteps(pts)).catch((e: Error) => live && setStepsError(e.message));
    return () => { live = false; };
  }, [symbol]);

  if (!s.about) return <Empty icon="help-circle-outline" title="Stock not found" body="That stock is not in the Investors Club list." />;

  // Add today's live price to the end of the daily history so the graph and the big number agree.
  const series = points ? [...points] : [];
  if (q && series.length && series[series.length - 1].d < dayKey()) series.push({ d: dayKey(), c: q.price });
  else if (q && series.length) series[series.length - 1] = { ...series[series.length - 1], c: q.price };
  // "Today" is the latest trading day in 15-minute steps, ending on the live price.
  const today = range === 'Today';
  const shown = today
    ? [...(steps ?? []).map((x) => ({ label: fmtClock(x.t), c: x.c })), ...(q && steps?.length && q.at > steps[steps.length - 1].t + 60_000 ? [{ label: fmtClock(q.at), c: q.price }] : [])]
    : series.slice(-RANGES[range]).map((x) => ({ label: fmtDayKey(x.d), c: x.c }));
  const moved = shown.length > 1 ? ((shown[shown.length - 1].c - shown[0].c) / shown[0].c) * 100 : 0;
  // The Company and Crowd meters unlock once "The shop and the queue" is passed.
  const metersOn = (learned.lessons[METERS_LESSON] ?? 0) >= (lesson(METERS_LESSON)?.quiz.length ?? 99);
  const pe = markers[symbol]?.pe;
  const crowd = series.length ? rsi(series.map((x) => x.c)) : null;
  const seeMath = () => crowd && alertBox('The math behind the Crowd meter', `It is called RSI. Over about the last 14 days:\n\nAverage rise on up days: ${money(crowd.rise)}\nAverage fall on down days: ${money(crowd.fall)}\n\nStrength = rise divided by fall = ${crowd.fall ? (crowd.rise / crowd.fall).toFixed(2) : 'very high'}\nRSI = 100 - 100 / (1 + strength) = ${crowd.value.toFixed(0)}\n\nAbove 70 means lots of buying lately. Below 30 means lots of selling. It measures the crowd, not the company, and it does not say what happens next.`);
  const views = markerViews(markers[symbol] ?? null, q);

  const explain = async (m: MarkerView) => {
    const t = term(m.term);
    if (!t) return;
    const celebrate = watchBadges();
    markTerm(t.id);
    await alertBox(t.word, `${settings.level === 'simple' ? t.simple : t.detailed}\n\n${s.name}: ${m.value}. ${m.hint}`);
    celebrate();
    mission('marker');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ title: symbol, headerRight: () => <IconBtn name={watch.includes(symbol) ? 'star' : 'star-outline'} color={watch.includes(symbol) ? C.accent : C.text} label={watch.includes(symbol) ? 'Remove from watchlist' : 'Add to watchlist'} onPress={() => toggleWatch(symbol)} /> }} />
      <Page bottom={24}>
        <Card style={{ borderWidth: 1, borderColor: C.border }}>
          <Row gap={14}>
            <Tile symbol={symbol} size={60} />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size={21} bold>{s.name}</Txt>
              <Txt size={13} color={C.muted}>{s.sector}</Txt>
            </View>
          </Row>
          <Txt size={15} color={C.muted}>{s.about}</Txt>
          {q ? (
            <Row gap={12} style={{ alignItems: 'flex-end' }}>
              <Txt size={34} bold>{money(q.price)}</Txt>
              <View style={{ paddingBottom: 7, gap: 2 }}>
                <Delta value={dayChangePct(q)} pill />
              </View>
              <Txt size={13} color={C.muted} style={{ paddingBottom: 9 }}>today</Txt>
            </Row>
          ) : (
            <Txt size={15} color={C.muted}>{source() === 'none' ? 'No connection, so there is no price yet.' : 'Getting the price...'}</Txt>
          )}
        </Card>

        <Card>
          <Row gap={6} style={{ flexWrap: 'wrap' }}>
            {(Object.keys(RANGES) as Range[]).map((r) => <Chip key={r} title={r} selected={range === r} onPress={() => setRange(r)} />)}
            <View style={{ flex: 1 }} />
            {shown.length > 1 && <Delta value={moved} />}
          </Row>
          {shown.length > 1 ? (
            <PriceChart values={shown.map((x) => x.c)} labels={shown.map((x) => x.label)} />
          ) : (
            <View style={{ height: 120, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
              <Txt size={14} color={C.muted} center>{today ? stepsError || (steps ? 'Today\'s graph fills in as the day goes on. Try 1W or 1M for now.' : 'Drawing the graph...') : graphError || 'Drawing the graph...'}</Txt>
            </View>
          )}
          {today && shown.length > 1 && <Txt size={12} color={C.muted}>The latest trading day in 15-minute steps, Bermuda time.</Txt>}
        </Card>

        <View style={{ gap: 4, marginTop: 4 }}>
          <Txt size={18} bold>Markers</Txt>
          <Txt size={14} color={C.muted}>Read these before you choose. Tap one to learn what it means.</Txt>
        </View>
        {views.length === 0 && <Card><Txt size={14} color={C.muted}>{source() === 'none' ? 'Markers appear once the internet is back.' : 'Getting the markers...'}</Txt></Card>}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {views.map((m) => {
            const colour = m.tone === 'up' ? C.good : m.tone === 'down' ? C.bad : C.accent;
            return (
              <Pressable key={m.id} accessibilityRole="button" accessibilityLabel={`Marker ${m.title}`} onPress={() => explain(m)}
                style={({ pressed }) => ({ flexBasis: m.id === 'range' ? '100%' : '47%', flexGrow: 1, backgroundColor: C.card, borderRadius: 16, padding: 14, gap: 6, opacity: pressed ? 0.7 : 1 })}>
                <Row gap={6}>
                  <Caption>{m.title}</Caption>
                  <View style={{ flex: 1 }} />
                  <Icon name="information-circle-outline" size={16} color={C.muted} />
                </Row>
                <Txt size={19} bold>{m.value}</Txt>
                <View style={{ alignSelf: 'flex-start', backgroundColor: `${colour}22`, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                  <Txt size={13} color={colour} bold>{m.word}</Txt>
                </View>
                {m.meter !== null && <Bar value={m.meter} color={colour} height={6} />}
              </Pressable>
            );
          })}
        </View>
        {views.length > 0 && <Txt size={12} color={C.muted}>Markers describe a company. No single marker tells you to buy or sell.</Txt>}

        <View style={{ gap: 4, marginTop: 4 }}>
          <Txt size={18} bold>The company and the crowd</Txt>
          <Txt size={14} color={C.muted}>{metersOn ? 'The company and the crowd, side by side.' : 'Two meters that unlock when you pass the last lesson.'}</Txt>
        </View>
        {!metersOn ? (
          <Card>
            <Row>
              <Icon name="lock-closed-outline" color={C.muted} />
              <Txt size={15} style={{ flex: 1 }}>Pass the lesson "The company and the crowd" to see the Company meter and the Crowd meter here.</Txt>
            </Row>
            <Btn title="Open the lesson" kind="ghost" onPress={() => router.push(`/lesson/${METERS_LESSON}`)} />
          </Card>
        ) : (
          <Card style={{ gap: 14 }}>
            <View style={{ gap: 6 }}>
              <Row><Icon name="storefront-outline" size={18} color={C.accent} /><Caption>Company meter</Caption><View style={{ flex: 1 }} /><Txt size={13} color={C.muted}>{pe && pe > 0 ? `P/E ${pe.toFixed(1)}` : ''}</Txt></Row>
              <Txt size={17} bold>{pe && pe > 0 ? companyWord(pe) : 'No reading'}</Txt>
              {pe && pe > 0 ? <Bar value={pe / 60} height={8} /> : <Txt size={13} color={C.muted}>There is no P/E for a fund, or when a company made no profit this year.</Txt>}
            </View>
            <View style={{ gap: 6 }}>
              <Row><Icon name="people-outline" size={18} color={C.accent} /><Caption>Crowd meter</Caption><View style={{ flex: 1 }} /><Txt size={13} color={C.muted}>{crowd ? `RSI ${crowd.value.toFixed(0)}` : ''}</Txt></Row>
              <Txt size={17} bold>{crowd ? crowdWord(crowd.value) : 'No reading yet'}</Txt>
              {crowd && <Bar value={crowd.value / 100} height={8} />}
              {crowd && <Btn title="See the math" kind="text" height={34} style={{ alignSelf: 'flex-start', paddingHorizontal: 0 }} onPress={seeMath} />}
            </View>
            <Txt size={12} color={C.muted}>The meters describe. They never tell you to buy or sell.</Txt>
          </Card>
        )}

        {held && (
          <Card>
            <Txt size={17} bold>You own</Txt>
            <Row gap={22} style={{ flexWrap: 'wrap' }}>
              <Stat title="Shares" value={fmtShares(held.shares).replace(/ shares?$/, '')} />
              <Stat title="Worth now" value={money(holdingValue(held))} />
              <Stat title="You paid" value={money(held.cost)} />
              <Stat title="Gain or loss" value={`${signedMoney(holdingValue(held) - held.cost)} (${pct(held.cost ? ((holdingValue(held) - held.cost) / held.cost) * 100 : 0)})`} color={holdingValue(held) >= held.cost ? C.good : C.bad} />
            </Row>
          </Card>
        )}
      </Page>
      <View style={{ flexDirection: 'row', gap: 10, padding: 12, paddingBottom: insets.bottom + 12, backgroundColor: C.bar }}>
        {held && <Btn title="Sell" kind="ghost" color={C.bad} style={{ flex: 1 }} onPress={() => setSide('sell')} />}
        <Btn title="Buy" style={{ flex: 2 }} disabled={!q} onPress={() => setSide('buy')} />
      </View>
      <TradeSheet symbol={symbol} side={side} onClose={() => setSide(null)} />
    </View>
  );
}
