import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, useWindowDimensions, View } from 'react-native';

import { deleteClass, removeStudent, resetPin, restartClass, teacherClass, updateClass, type TeacherClassView } from '@/lib/classroom';
import { ago, fmtDate, fmtShares, money } from '@/lib/format';
import { nextOpenText } from '@/lib/market';
import { stock, useStore } from '@/lib/store';
import type { StudentDetail, Trade } from '@/lib/types';
import { Emblem } from '@/ui/art';
import { Avatar } from '@/ui/avatar';
import { reasonLabel } from '@/ui/coach';
import { Btn, C, Card, Chip, Delta, Divider, Empty, Icon, Page, Row, Stat, Tile, Txt } from '@/ui/kit';
import { confirm, menu, prompt, toast } from '@/ui/overlay';
import { TeacherBar } from '@/ui/teacher-bar';

const TABS = ['Overview', 'Students', 'Activity', 'Settings'] as const;
type Tab = (typeof TABS)[number];
const SORTS = ['Top value', 'Name', 'Most learned', 'Quietest'] as const;
type Sort = (typeof SORTS)[number];
const WEEK = 7 * 86400000;

const learnedScore = (s: StudentDetail) => (s.progress ? s.progress.lessons * 50 + s.progress.words * 10 + s.progress.cards * 10 + s.progress.badges * 100 : 0);
const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** A switch-like row for a class rule. */
function Rule({ title, body, on, onPress }: { title: string; body: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={title} accessibilityState={{ checked: on }} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={16} bold>{title}</Txt>
        <Txt size={13} color={C.muted}>{body}</Txt>
      </View>
      <View style={{ width: 52, height: 30, borderRadius: 15, padding: 3, backgroundColor: on ? C.accent : C.cardHi, alignItems: on ? 'flex-end' : 'flex-start' }}>
        <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFFFFF' }} />
      </View>
    </Pressable>
  );
}

/** One class as the teacher sees it: an overview, every student, what the class has been doing, and its rules. */
export default function TeacherClass() {
  const router = useRouter();
  const { teacher } = useStore();
  const code = String(useLocalSearchParams<{ code?: string }>().code ?? '').toUpperCase();
  const [cls, setCls] = useState<TeacherClassView | null>(null);
  const [tab, setTab] = useState<Tab>('Overview');
  const [sort, setSort] = useState<Sort>('Top value');
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // On a laptop the students are a table, one row each; on a phone they are cards.
  const wide = useWindowDimensions().width >= 1000;

  const refresh = useCallback(async () => {
    if (!teacher || !code) return;
    setBusy(true);
    try {
      setCls(await teacherClass(code));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [teacher, code]);
  useEffect(() => { refresh(); }, [refresh]);

  const all = useMemo(() => cls?.students ?? [], [cls]);
  const students = useMemo(() => {
    const rows = [...all]; // the server sends them richest first
    if (sort === 'Name') rows.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'Most learned') rows.sort((a, b) => learnedScore(b) - learnedScore(a));
    if (sort === 'Quietest') rows.sort((a, b) => a.trades - b.trades || (a.seen || '').localeCompare(b.seen || ''));
    return rows;
  }, [all, sort]);
  const rank = useMemo(() => new Map(all.map((s, i) => [s.id, i + 1])), [all]);
  const activity = useMemo(() => all.flatMap((s) => s.recent.map((t) => ({ t, s }))).sort((a, b) => b.t.at.localeCompare(a.t.at)).slice(0, 40), [all]);

  const act = async (work: () => Promise<unknown>) => {
    try {
      await work();
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
    refresh();
  };
  const manage = async (s: StudentDetail) => {
    const i = await menu(s.name, [{ label: 'Reset PIN', icon: 'key-outline' }, { label: 'Remove from class', icon: 'person-remove-outline', danger: true }]);
    if (i === 0 && (await confirm(`Reset ${s.name}'s PIN?`, 'They will choose a new PIN the next time they join with this name.', 'Reset PIN'))) await act(() => resetPin(code, s.id));
    if (i === 1 && (await confirm(`Remove ${s.name}?`, 'They disappear from the leaderboard and cannot rejoin with this name.', 'Remove', { danger: true }))) await act(() => removeStudent(code, s.id));
  };
  const rename = async () => {
    const name = await prompt('Class name', cls?.name ?? '', 'Class name, like P6 Blue', { okText: 'Save' });
    if (name && name.trim().length >= 2) await act(() => updateClass(code, { name: name.trim() }));
  };
  const restart = async () => {
    if (await confirm('Start a new round?', 'Every student goes back to the starting cash with no stocks and no trades. This cannot be undone.', 'Start a new round', { danger: true })) await act(() => restartClass(code));
  };
  const remove = async () => {
    if (!(await confirm(`Delete ${cls?.name ?? 'this class'}?`, 'The class, its students and all their trades are deleted for good. This cannot be undone.', 'Delete class', { danger: true }))) return;
    try {
      await deleteClass(code);
      toast('Class deleted');
      router.replace('/teacher');
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    toast('Class code copied');
  };
  /** Saves the students table as a spreadsheet file. Browser only. */
  const download = () => {
    const head = ['Rank', 'Student', 'Value', 'Change %', 'Cash', 'Stocks', 'Trades', 'Level', 'Lessons passed', 'Words read', 'Flashcards known', 'Badges', 'Learning streak', 'Buys', 'Buys checked first', 'Last active'];
    const lines = all.map((s) => [rank.get(s.id) ?? '', s.name, s.value.toFixed(2), s.gainPct.toFixed(2), s.cash.toFixed(2), s.companies, s.trades, s.progress?.level ?? '', s.progress?.lessons ?? '', s.progress?.words ?? '', s.progress?.cards ?? '', s.progress?.badges ?? '', s.progress?.streak ?? '', s.buys ?? 0, s.checked ?? 0, s.seen]);
    const text = [head, ...lines].map((row) => row.map(csvCell).join(',')).join('\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    link.download = `${(cls?.name ?? 'class').replace(/[^a-z0-9]+/gi, '-')}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (!teacher) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
        <Stack.Screen options={{ headerShown: false }} />
        <TeacherBar back />
        <Page><Empty icon="school-outline" title="Sign in as a teacher" body="Go back to see the teacher sign-in." /></Page>
      </View>
    );
  }

  const traded = all.filter((s) => s.trades > 0).length;
  const average = all.length ? all.reduce((sum, s) => sum + s.gainPct, 0) / all.length : 0;
  const held = new Map<string, number>();
  for (const s of all) for (const h of s.holdings) held.set(h.symbol, (held.get(h.symbol) ?? 0) + 1);
  const popular = [...held.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5);
  const notTraded = all.filter((s) => s.trades === 0);
  const quiet = all.filter((s) => s.trades > 0 && (!s.seen || Date.now() - new Date(s.seen).getTime() > WEEK));
  const oneBasket = all.filter((s) => s.holdings.length === 1 && s.cash < s.value * 0.2);
  const learned = all.filter((s) => s.progress);
  const mean = (pickNumber: (s: StudentDetail) => number) => (learned.length ? (learned.reduce((sum, s) => sum + pickNumber(s), 0) / learned.length).toFixed(1) : '-');

  const details = (s: StudentDetail) => (
    <>
      <Divider />
      <Row gap={24}>
        <Stat title="Cash" value={money(s.cash)} />
        <Stat title="In stocks" value={money(s.value - s.cash)} />
      </Row>
      <Txt size={13} color={C.muted}>{s.seen ? `Last active ${ago(new Date(s.seen).getTime())}` : 'Has not opened the app since joining'}</Txt>

      <Txt size={14} bold>Learning</Txt>
      {s.progress
        ? <Row gap={8} style={{ alignItems: 'flex-start' }}><Emblem level={s.progress.level} size={34} /><Txt size={13} color={C.muted} style={{ flex: 1 }}>Level {s.progress.level} · {s.progress.lessons} {s.progress.lessons === 1 ? 'lesson' : 'lessons'} passed · {s.progress.words} words read · {s.progress.cards} flashcards known · {s.progress.badges} {s.progress.badges === 1 ? 'badge' : 'badges'} · {s.progress.streak ?? 0}-day learning streak</Txt></Row>
        : <Txt size={13} color={C.muted}>Nothing reported yet.</Txt>}

      <Txt size={14} bold>Check before you buy</Txt>
      <Txt size={13} color={C.muted}>{s.buys ? `Did the check on ${s.checked ?? 0} of ${s.buys} ${s.buys === 1 ? 'buy' : 'buys'}. It is required for the first three, then optional.` : 'No buys yet.'}</Txt>

      <Txt size={14} bold>Holdings</Txt>
      {s.holdings.length === 0 && <Txt size={13} color={C.muted}>All in cash.</Txt>}
      {s.holdings.map((h) => (
        <Row key={h.symbol} gap={10}>
          <Tile symbol={h.symbol} size={30} />
          <Txt size={14} style={{ flex: 1 }} lines={1}>{stock(h.symbol).name}</Txt>
          <Txt size={13} color={C.muted}>{fmtShares(h.shares)} · paid {money(h.cost)}</Txt>
        </Row>
      ))}

      <Txt size={14} bold>Recent trades</Txt>
      {s.recent.length === 0 && <Txt size={13} color={C.muted}>No trades yet.</Txt>}
      {s.recent.map((t) => (
        <Txt key={t.id} size={13} color={C.muted}>{fmtDate(t.at)} · {t.side === 'buy' ? 'bought' : 'sold'} {fmtShares(t.shares)} of {t.symbol} at {money(t.price)}{t.side === 'buy' ? ` · ${t.why ? `reason: ${reasonLabel(t.why)}` : 'check skipped'}` : ''}</Txt>
      ))}
      <Btn title={`Manage ${s.name}`} kind="ghost" height={42} style={wide ? { alignSelf: 'flex-start', paddingHorizontal: 24 } : undefined} onPress={() => manage(s)} />
    </>
  );
  // Column widths for the table shown on a big screen.
  const col = { num: { width: 64 }, wide: { width: 96 } } as const;
  const head = (title: string, style: object) => <Txt size={12} color={C.muted} style={style}>{title.toUpperCase()}</Txt>;
  const names = (list: StudentDetail[]) => list.map((s) => s.name).join(', ');
  const line = (t: Trade, s: StudentDetail) => `${s.name} ${t.side === 'buy' ? 'bought' : 'sold'} ${fmtShares(t.shares)} of ${stock(t.symbol).name} at ${money(t.price)}`;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <TeacherBar back max={wide ? 1180 : 720} />
      <Page max={wide ? 1180 : undefined}>
        <Row>
          <View style={{ flex: 1 }}>
            <Txt size={26} bold lines={1}>{cls?.name ?? 'Class'}</Txt>
            <Txt size={14} color={C.muted}>{all.length} {all.length === 1 ? 'student' : 'students'} · join code {code}{cls?.paused ? ' · trading paused' : ''}</Txt>
          </View>
          <Btn title="Refresh" kind="text" icon="refresh" busy={busy} onPress={refresh} />
        </Row>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {TABS.map((x) => <Chip key={x} title={x} selected={tab === x} onPress={() => setTab(x)} />)}
        </View>
        {!!error && <Txt size={14} color={C.bad}>{error}</Txt>}

        {tab === 'Overview' && (
          <>
            <Card>
              <Txt size={13} color={C.muted}>Class code</Txt>
              <Row>
                <Txt size={34} bold style={{ flex: 1, letterSpacing: 4 }}>{code}</Txt>
                <Btn title="Copy" kind="ghost" icon="copy-outline" height={42} onPress={copyCode} />
              </Row>
              <Txt size={14} color={C.muted}>Students open the Class tab, choose {teacher.school || 'their school'} and this class, then enter this code, a first name with last initial, and a PIN they choose.</Txt>
            </Card>
            {cls && all.length === 0 && <Empty icon="people-outline" title="Nobody has joined yet" body="Share the class code. Students appear here as they join." />}
            {all.length > 0 && (
              <View style={{ flexDirection: wide ? 'row' : 'column', gap: 14, alignItems: 'flex-start' }}>
                <Card style={{ flex: wide ? 1 : undefined, alignSelf: 'stretch' }}>
                  <Txt size={17} bold>Class summary</Txt>
                  <Row gap={24} style={{ flexWrap: 'wrap' }}>
                    <Stat title="Students" value={String(all.length)} />
                    <Stat title="Have traded" value={`${traded} of ${all.length}`} />
                    <View style={{ gap: 4 }}>
                      <Txt size={13} color={C.muted}>Average change</Txt>
                      <Delta value={average} size={16} />
                    </View>
                  </Row>
                  <Divider />
                  <Txt size={13} color={C.muted}>Learning, on average per student</Txt>
                  <Row gap={24} style={{ flexWrap: 'wrap' }}>
                    <Stat title="Lessons passed" value={mean((s) => s.progress!.lessons)} />
                    <Stat title="Words read" value={mean((s) => s.progress!.words)} />
                    <Stat title="Flashcards known" value={mean((s) => s.progress!.cards)} />
                  </Row>
                </Card>
                <Card style={{ flex: wide ? 1 : undefined, alignSelf: 'stretch' }}>
                  <Txt size={17} bold>Most held</Txt>
                  {popular.length === 0 && <Txt size={14} color={C.muted}>Nobody owns a stock yet.</Txt>}
                  {popular.map(([symbol, n]) => (
                    <Row key={symbol} gap={10}>
                      <Tile symbol={symbol} size={30} />
                      <Txt size={15} style={{ flex: 1 }} lines={1}>{stock(symbol).name}</Txt>
                      <Txt size={14} color={C.muted}>{n} {n === 1 ? 'student' : 'students'}</Txt>
                    </Row>
                  ))}
                </Card>
              </View>
            )}
            {all.length > 0 && (
              <Card>
                <Txt size={17} bold>Worth a word</Txt>
                {notTraded.length + quiet.length + oneBasket.length === 0 && <Txt size={14} color={C.muted}>Nothing stands out. Everyone has traded, been active this week, and spread their money.</Txt>}
                {notTraded.length > 0 && <Txt size={14}><Txt size={14} bold>Have not traded yet: </Txt>{names(notTraded)}</Txt>}
                {quiet.length > 0 && <Txt size={14}><Txt size={14} bold>Not active for a week: </Txt>{names(quiet)}</Txt>}
                {oneBasket.length > 0 && <Txt size={14}><Txt size={14} bold>Almost everything in one stock: </Txt>{names(oneBasket)}</Txt>}
              </Card>
            )}
          </>
        )}

        {tab === 'Students' && (
          <>
            {all.length === 0 && <Empty icon="people-outline" title="Nobody has joined yet" body="Share the class code. Students appear here as they join." />}
            {all.length > 0 && (
              <Row style={{ flexWrap: 'wrap' }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, flex: 1 }}>
                  {SORTS.map((x) => <Chip key={x} title={x} selected={sort === x} onPress={() => setSort(x)} />)}
                </View>
                {Platform.OS === 'web' && <Btn title="Download spreadsheet" kind="ghost" icon="download-outline" height={40} onPress={download} />}
              </Row>
            )}
            {wide && all.length > 0 && (
              <Row gap={12} style={{ paddingHorizontal: 12 }}>
                <View style={{ width: 40 }} />
                {head('Student', { flex: 1 })}
                {head('Value', { ...col.wide, textAlign: 'right' })}
                {head('Change', { ...col.wide, textAlign: 'right' })}
                {head('Stocks', col.num)}
                {head('Trades', col.num)}
                {head('Level', col.num)}
                {head('Lessons', col.num)}
                {head('Words', col.num)}
                {head('Cards', col.num)}
                {head('Last active', col.wide)}
                <View style={{ width: 18 }} />
              </Row>
            )}
            {students.map((s) => (
              <Card key={s.id} style={{ padding: 12 }}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Student ${s.name}`} onPress={() => setOpen(open === s.id ? null : s.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Avatar id={s.avatar} name={s.name} size={40} />
                  <View style={{ flex: 1 }}>
                    <Txt size={16} bold lines={1}>{s.name}</Txt>
                    <Txt size={13} color={C.muted}>{wide ? `#${rank.get(s.id)}` : `#${rank.get(s.id)} · ${s.companies} ${s.companies === 1 ? 'stock' : 'stocks'} · ${s.trades} ${s.trades === 1 ? 'trade' : 'trades'}`}</Txt>
                  </View>
                  {wide ? (
                    <>
                      <Txt size={15} bold style={{ ...col.wide, textAlign: 'right' }}>{money(s.value)}</Txt>
                      <View style={{ ...col.wide, alignItems: 'flex-end' }}><Delta value={s.gainPct} size={14} /></View>
                      <Txt size={15} style={col.num}>{s.companies}</Txt>
                      <Txt size={15} style={col.num}>{s.trades}</Txt>
                      <Row gap={4} style={col.num}>{s.progress ? <Emblem level={s.progress.level} size={26} /> : null}<Txt size={15}>{s.progress?.level ?? '-'}</Txt></Row>
                      <Txt size={15} style={col.num}>{s.progress?.lessons ?? '-'}</Txt>
                      <Txt size={15} style={col.num}>{s.progress?.words ?? '-'}</Txt>
                      <Txt size={15} style={col.num}>{s.progress?.cards ?? '-'}</Txt>
                      <Txt size={14} color={C.muted} style={col.wide} lines={1}>{s.seen ? ago(new Date(s.seen).getTime()) : 'never'}</Txt>
                    </>
                  ) : (
                    <View style={{ alignItems: 'flex-end', gap: 3 }}>
                      <Txt size={16} bold>{money(s.value)}</Txt>
                      <Delta value={s.gainPct} size={13} />
                    </View>
                  )}
                  <Icon name={open === s.id ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
                </Pressable>
                {open === s.id && details(s)}
              </Card>
            ))}
          </>
        )}

        {tab === 'Activity' && (
          <Card>
            <Txt size={17} bold>Latest trades in this class</Txt>
            {activity.length === 0 && <Txt size={14} color={C.muted}>No trades yet. They show up here as students buy and sell.</Txt>}
            {activity.map(({ t, s }) => (
              <Row key={t.id} gap={10} style={{ alignItems: 'flex-start' }}>
                <Icon name={t.side === 'buy' ? 'arrow-down-circle-outline' : 'arrow-up-circle-outline'} size={20} color={t.side === 'buy' ? C.good : C.warm} />
                <View style={{ flex: 1 }}>
                  <Txt size={14}>{line(t, s)}</Txt>
                  <Txt size={12} color={C.muted}>{fmtDate(t.at, true)}</Txt>
                </View>
              </Row>
            ))}
          </Card>
        )}

        {tab === 'Settings' && cls && (
          <>
            <Card>
              <Txt size={17} bold>Trading rules</Txt>
              <Rule title="Pause trading" body="Students can look and learn but cannot buy or sell. Useful during a lesson, or to freeze the leaderboard at the end of a round." on={cls.paused} onPress={() => act(() => updateClass(code, { paused: !cls.paused }))} />
              <Divider />
              <Txt size={14} bold>Trading hours</Txt>
              <Txt size={13} color={C.muted}>Trades happen only while the US stock market is open, like the real thing: 10:30 am to 5 pm Bermuda time, Monday to Friday, and not on US market holidays. Outside those hours a student can place an order, and it is filled at the first price after the market opens. {nextOpenText()}</Txt>
            </Card>
            <Card>
              <Txt size={17} bold>This class</Txt>
              <Txt size={14} color={C.muted}>Each student started with {money(cls.startCash, false)}.</Txt>
              <Btn title="Rename the class" kind="ghost" icon="create-outline" left onPress={rename} />
              <Btn title="Start a new round" kind="ghost" icon="reload" left onPress={restart} />
              <Btn title="Delete this class" kind="ghost" icon="trash-outline" left color={C.bad} onPress={remove} />
            </Card>
          </>
        )}
      </Page>
    </View>
  );
}
