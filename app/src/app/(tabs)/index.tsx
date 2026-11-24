import { useRouter } from 'expo-router';
import { F, PASTELS } from '@/lib/theme';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polyline } from 'react-native-svg';

import { SECTORS, STOCKS } from '@/data/stocks';
import { ago, fmtDayKey, money, pct, signedMoney } from '@/lib/format';
import { loadHistory, loadMarkers, marketOpen, nextOpenText, refreshQuotes, source } from '@/lib/market';
import { dayChangePct, inClass, missionsDone, portfolio, stock, streak, toggleWatch, totalValue, useStore } from '@/lib/store';
import type { HistoryPoint } from '@/lib/types';
import { PriceChart } from '@/ui/chart';
import { BermudaFlag } from '@/ui/flag';
import { Avatar } from '@/ui/avatar';
import { Btn, C, Card, Empty, Icon, IconBtn, Row, SearchField, TapCard, Tile, Txt, WIDE, type IconName } from '@/ui/kit';
import { pick } from '@/ui/overlay';
import { Ticker } from '@/ui/ticker';

const SORTS = ['By group', 'Biggest rise today', 'Biggest fall today', 'Lowest price', 'Highest price', 'A to Z'] as const;
type Sort = (typeof SORTS)[number];

/** A solid green or red block with today's change, the way trading apps show it. Grey when nothing moved. */
function ChangeBlock({ value, width = 84 }: { value: number; width?: number }) {
  const flat = Math.abs(value) < 0.005;
  return (
    <View style={{ width, height: 36, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: flat ? C.cardHi : value > 0 ? C.good : C.bad }}>
      <Text style={{ fontFamily: F, color: flat ? C.muted : '#FFFFFF', fontSize: 15, fontWeight: '700' }}>{flat ? '0.00%' : pct(value)}</Text>
    </View>
  );
}

/** A tiny line of recent prices with no axes, for the mover cards. */
function Spark({ values, color }: { values: number[]; color: string }) {
  const w = 72;
  const h = 28;
  const lo = Math.min(...values);
  const span = Math.max(...values) - lo || 1;
  const points = values.map((v, i) => `${((w * i) / (values.length - 1)).toFixed(1)},${(h - 2 - ((h - 4) * (v - lo)) / span).toFixed(1)}`).join(' ');
  return <Svg width={w} height={h}><Polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" /></Svg>;
}

/** Company value in plain short form: $3.97T, $812B, $640M. `millions` is how the data arrives. */
function size(millions: number | undefined) {
  if (!millions) return '-';
  if (millions >= 1e6) return `$${(millions / 1e6).toFixed(2)}T`;
  if (millions >= 1e3) return `$${(millions / 1e3).toFixed(millions >= 1e5 ? 0 : 1)}B`;
  return `$${Math.round(millions)}M`;
}

function Fact({ title, value, color = C.text, align = 'flex-start' }: { title: string; value: string; color?: string; align?: 'flex-start' | 'center' | 'flex-end' }) {
  return (
    <View style={{ flex: 1, alignItems: align, gap: 2 }}>
      <Txt size={12} color={C.muted} lines={1}>{title}</Txt>
      <Txt size={15} bold color={color} lines={1}>{value}</Txt>
    </View>
  );
}

/** What opens under a stock when it is tapped: buttons, today's numbers, and the past month as a graph. */
function Peek({ symbol, onTrade }: { symbol: string; onTrade: () => void }) {
  const { quotes, markers, watch } = useStore();
  const [points, setPoints] = useState<HistoryPoint[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let live = true;
    loadMarkers(symbol);
    loadHistory(symbol).then((pts) => live && setPoints(pts.slice(-22))).catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, [symbol]);
  const q = quotes[symbol];
  const watching = watch.includes(symbol);
  const dollars = (v: number | undefined) => (v ? money(v) : '-');
  return (
    <View style={{ marginHorizontal: -16, paddingHorizontal: 16, paddingVertical: 14, gap: 14, backgroundColor: C.bar }}>
      <Row gap={10}>
        <Btn title={`Trade ${symbol}`} height={44} style={{ flex: 1 }} onPress={onTrade} />
        <Btn title={watching ? 'Watching' : 'Watch'} icon={watching ? 'star' : 'star-outline'} kind="ghost" height={44} style={{ flex: 1 }} onPress={() => toggleWatch(symbol)} />
      </Row>
      <Row>
        <Fact title="Today's high" value={dollars(q?.hi)} color={C.good} />
        <Fact title="Today's low" value={dollars(q?.lo)} color={C.bad} align="center" />
        <Fact title="Today's open" value={dollars(q?.open)} align="flex-end" />
      </Row>
      <Row>
        <Fact title="Company size" value={size(markers[symbol]?.cap)} />
        <Fact title="Group" value={stock(symbol).sector} align="center" />
        <Fact title="Yesterday" value={dollars(q?.prev)} align="flex-end" />
      </Row>
      {points && points.length > 1
        ? <PriceChart values={points.map((x) => x.c)} labels={points.map((x) => fmtDayKey(x.d))} height={150} />
        : <Txt size={13} color={C.muted} center style={{ paddingVertical: 20 }}>{error || 'Drawing the past month...'}</Txt>}
    </View>
  );
}

function Shortcut({ icon, title, badge, tint, onPress }: { icon: IconName; title: string; badge?: string; tint: number; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Shortcut ${title}`} onPress={onPress} style={({ pressed }) => ({ width: 76, alignItems: 'center', gap: 6, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: PASTELS[tint % PASTELS.length], alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={26} />
        {!!badge && (
          <View style={{ position: 'absolute', top: -6, right: -10, backgroundColor: C.accent, borderRadius: 9, paddingHorizontal: 6, paddingVertical: 1 }}>
            <Text style={{ fontFamily: F, color: C.onAccent, fontSize: 11, fontWeight: '700' }}>{badge}</Text>
          </View>
        )}
      </View>
      <Txt size={13} center lines={1}>{title}</Txt>
    </Pressable>
  );
}

/** Home: what your portfolio is worth, shortcuts, today's movers, then every stock with its live price. The app opens here. */
export default function Market() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { quotes, watch, net, settings, history } = useStore();
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState<Sort>('By group');
  const [query, setQuery] = useState('');
  const [peek, setPeek] = useState<string | null>(null);
  const src = source();
  const open = (symbol: string) => router.push(`/stock/${symbol}`);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    let rows = STOCKS.filter((s) => (filter === 'All' ? true : filter === 'Watchlist' ? watch.includes(s.symbol) : s.sector === filter));
    if (q) rows = rows.filter((s) => s.name.toLowerCase().includes(q) || s.symbol.toLowerCase().includes(q));
    const change = (sym: string) => dayChangePct(quotes[sym]);
    const price = (sym: string) => quotes[sym]?.price ?? Infinity;
    if (sort === 'Biggest rise today') rows = [...rows].sort((a, b) => change(b.symbol) - change(a.symbol));
    if (sort === 'Biggest fall today') rows = [...rows].sort((a, b) => change(a.symbol) - change(b.symbol));
    if (sort === 'Lowest price') rows = [...rows].sort((a, b) => price(a.symbol) - price(b.symbol));
    if (sort === 'Highest price') rows = [...rows].sort((a, b) => (quotes[b.symbol]?.price ?? -1) - (quotes[a.symbol]?.price ?? -1));
    if (sort === 'A to Z') rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
    return rows;
  }, [filter, sort, query, quotes, watch]);

  const priced = STOCKS.filter((s) => quotes[s.symbol]);
  const tape = priced.map((s) => ({ symbol: s.symbol, price: quotes[s.symbol].price, change: dayChangePct(quotes[s.symbol]) }));
  const byMove = [...priced].sort((a, b) => dayChangePct(quotes[b.symbol]) - dayChangePct(quotes[a.symbol]));
  const movers = byMove.length > 1 ? [{ title: 'Biggest rise today', s: byMove[0] }, { title: 'Biggest fall today', s: byMove[byMove.length - 1] }] : [];
  const chooseSort = async () => {
    const v = await pick('Sort the list', [...SORTS], sort);
    if (v) setSort(v);
  };

  // Today's change in dollars: what the stocks you hold have moved since yesterday's close.
  const p = portfolio();
  const total = totalValue(p);
  const today = p.holdings.reduce((sum, h) => { const q = quotes[h.symbol]; return q ? sum + h.shares * (q.price - q.prev) : sum; }, 0);
  const todayPct = total - today > 0 ? (today / (total - today)) * 100 : 0;
  const flat = Math.abs(today) < 0.005;
  const done = missionsDone().length;
  const days = streak();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <View style={{ paddingTop: insets.top + 8, backgroundColor: C.bg }}>
        <Row style={{ paddingHorizontal: 16, paddingBottom: 8, ...WIDE }}>
          <TapCard bare label="Edit your profile" onPress={() => router.push('/profile')} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <Avatar id={settings.avatar} name={settings.name} size={40} />
            <View style={{ flex: 1 }}>
              <Row gap={6}>
                <BermudaFlag width={20} />
                <Txt size={11} bold color={C.muted} lines={1} style={{ letterSpacing: 0.6 }}>INVESTORS CLUB OF BERMUDA</Txt>
              </Row>
              <Txt size={17} bold lines={1}>{settings.name ? `Hi, ${settings.name}` : 'Welcome'}</Txt>
              <Row gap={6}>
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: src === 'none' || net.error ? C.bad : marketOpen() ? C.good : C.muted }} />
                <Txt size={12} color={C.muted} lines={1}>{src === 'none' ? 'Prices not set up' : net.error || `${marketOpen() ? 'Market open' : 'Market closed'}${net.at ? ` · updated ${ago(net.at)}` : ''}`}</Txt>
              </Row>
            </View>
          </TapCard>
          <IconBtn name="swap-vertical" label="Sort" onPress={chooseSort} />
          <IconBtn name="settings-outline" label="Settings" onPress={() => router.push('/settings')} />
        </Row>
      </View>
      <Ticker items={tape} onPress={open} />
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingTop: 14, paddingBottom: 28, gap: 16, ...WIDE }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={net.loading} onRefresh={() => refreshQuotes(true)} tintColor={C.accent} colors={[C.accent]} progressBackgroundColor={C.card} />}>
        {src === 'none' && (
          <Card>
            <Row>
              <Icon name="pulse-outline" color={C.accent} />
              <Txt size={17} bold>Turn on live prices</Txt>
            </Row>
            <Txt size={15} color={C.muted}>Investors Club uses real stock prices. Join your class, or add a free market data key, to see them.</Txt>
            <Btn title="Set up market data" onPress={() => router.push('/market-data')} />
          </Card>
        )}

        {src !== 'none' && !marketOpen() && (
          <Row gap={10} style={{ backgroundColor: C.accentDim, borderRadius: 12, padding: 12 }}>
            <Icon name="moon-outline" size={20} color={C.accent} />
            <Txt size={13} style={{ flex: 1 }}>{nextOpenText()} Until then you see the last prices.</Txt>
          </Row>
        )}

        <Row style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={14} color={C.muted}>{inClass() ? 'Class portfolio value' : 'Practice portfolio value'}</Txt>
            <Txt size={38} bold lines={1}>{money(total)}</Txt>
            <Row gap={6}>
              <Txt size={14} color={C.muted}>Today</Txt>
              <Txt size={14} bold color={flat ? C.muted : today > 0 ? C.good : C.bad}>{signedMoney(today)} ({flat ? '0.00%' : pct(todayPct)})</Txt>
            </Row>
          </View>
          <Btn title="My portfolio" height={46} style={{ paddingHorizontal: 18 }} onPress={() => router.push('/portfolio')} />
        </Row>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -16 }} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingTop: 6 }}>
          <Shortcut tint={0} icon="flag-outline" title="Missions" badge={done === 3 ? (days > 1 ? `${days} days` : 'Done') : `${done}/3`} onPress={() => router.push('/learn')} />
          <Shortcut tint={1} icon="albums-outline" title="Flashcards" onPress={() => router.push('/flashcards')} />
          <Shortcut tint={2} icon="school-outline" title="Lessons" onPress={() => router.push('/learn')} />
          <Shortcut tint={3} icon="book-outline" title="Glossary" onPress={() => router.push('/glossary')} />
          <Shortcut tint={4} icon="trophy-outline" title="Class" onPress={() => router.push('/class')} />
        </ScrollView>

        {movers.length > 0 && (
          <Row gap={10}>
            {movers.map(({ title, s }) => {
              const change = dayChangePct(quotes[s.symbol]);
              const colour = change >= 0 ? C.good : C.bad;
              const points = history[s.symbol]?.points.slice(-22).map((x) => x.c) ?? [];
              return (
                <TapCard key={title} label={title} onPress={() => open(s.symbol)} style={{ flex: 1, padding: 12, gap: 8 }}>
                  <Txt size={12} color={C.muted} lines={1}>{title}</Txt>
                  <Row gap={8}>
                    <Tile symbol={s.symbol} size={28} />
                    <Txt size={16} bold style={{ flex: 1 }} lines={1}>{s.symbol}</Txt>
                    {points.length > 2 && <Spark values={points} color={colour} />}
                  </Row>
                  <Row gap={8}>
                    <Txt size={17} bold>{money(quotes[s.symbol].price)}</Txt>
                    <Txt size={14} bold color={colour}>{pct(change)}</Txt>
                  </Row>
                </TapCard>
              );
            })}
          </Row>
        )}

        <SearchField placeholder={`Search the ${STOCKS.length} stocks`} value={query} onChangeText={setQuery} accessibilityLabel="Search stocks" />

        <View style={{ marginHorizontal: -16, borderBottomWidth: 1, borderBottomColor: C.border }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 22, paddingHorizontal: 16 }}>
            {['Watchlist', 'All', ...SECTORS].map((f) => {
              const on = filter === f;
              return (
                <Pressable key={f} accessibilityRole="button" accessibilityLabel={f} accessibilityState={{ selected: on }} onPress={() => setFilter(f)} style={{ paddingBottom: 10, minHeight: 40, justifyContent: 'flex-end', borderBottomWidth: 3, borderBottomColor: on ? C.accent : 'transparent' }}>
                  {f === 'Watchlist'
                    ? <Icon name={on ? 'star' : 'star-outline'} size={22} color={on ? C.accent : C.muted} />
                    : <Text style={{ fontFamily: F, color: on ? C.text : C.muted, fontSize: 17, fontWeight: on ? '700' : '500' }}>{f}</Text>}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {list.length === 0 && (filter === 'Watchlist' && !query
          ? <Empty icon="star-outline" title="Nothing on your watchlist" body="Open a stock and tap the star to keep an eye on it here." />
          : <Empty icon="search" title="No stocks match" body="Try a different word or group." />)}
        <View style={{ gap: 4 }}>
          {list.map((s) => {
            const q = quotes[s.symbol];
            return (
              <View key={s.symbol}>
              <TapCard bare label={s.name} onPress={() => setPeek(peek === s.symbol ? null : s.symbol)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 }}>
                <Tile symbol={s.symbol} size={42} />
                <View style={{ flex: 1, gap: 1 }}>
                  <Txt size={17} bold lines={1}>{s.symbol}</Txt>
                  <Txt size={13} color={C.muted} lines={1}>{s.name}</Txt>
                </View>
                {q ? (
                  <>
                    <Txt size={17} bold>{money(q.price)}</Txt>
                    <ChangeBlock value={dayChangePct(q)} />
                  </>
                ) : <Txt size={14} color={C.muted}>No price yet</Txt>}
              </TapCard>
              {peek === s.symbol && <Peek symbol={s.symbol} onTrade={() => open(s.symbol)} />}
              </View>
            );
          })}
        </View>
        <Txt size={12} color={C.muted} center>Pretend money only. Prices are real and may be a few minutes behind.</Txt>
      </ScrollView>
    </View>
  );
}
