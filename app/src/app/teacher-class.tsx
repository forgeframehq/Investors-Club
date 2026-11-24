import * as Clipboard from 'expo-clipboard';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';

import { deleteClass, removeStudent, resetPin, restartClass, teacherClass } from '@/lib/classroom';
import { ago, fmtDate, fmtShares, money } from '@/lib/format';
import { stock, useStore } from '@/lib/store';
import type { StudentDetail } from '@/lib/types';
import { Avatar } from '@/ui/avatar';
import { Btn, C, Card, Chip, Delta, Divider, Empty, Page, Row, Stat, Tile, Txt, Icon } from '@/ui/kit';
import { confirm, menu, toast } from '@/ui/overlay';

const SORTS = ['Top value', 'Name', 'Most learned', 'Quietest'] as const;
type Sort = (typeof SORTS)[number];

const learnedScore = (s: StudentDetail) => (s.progress ? s.progress.lessons * 50 + s.progress.words * 10 + s.progress.cards * 10 + s.progress.badges * 100 : 0);

/** One class as the teacher sees it: a summary, then every student with their portfolio, trades and learning. */
export default function TeacherClass() {
  const router = useRouter();
  const { teacher } = useStore();
  const code = String(useLocalSearchParams<{ code?: string }>().code ?? '').toUpperCase();
  const [cls, setCls] = useState<{ name: string; startCash: number; students: StudentDetail[] } | null>(null);
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

  const students = useMemo(() => {
    const rows = [...(cls?.students ?? [])]; // the server sends them richest first
    if (sort === 'Name') rows.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === 'Most learned') rows.sort((a, b) => learnedScore(b) - learnedScore(a));
    if (sort === 'Quietest') rows.sort((a, b) => a.trades - b.trades || (a.seen || '').localeCompare(b.seen || ''));
    return rows;
  }, [cls, sort]);
  const rank = useMemo(() => new Map((cls?.students ?? []).map((s, i) => [s.id, i + 1])), [cls]);

  const act = async (work: () => Promise<unknown>) => {
    try {
      await work();
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
  const restart = async () => {
    if (await confirm('Start a new round?', 'Every student goes back to the starting cash with no stocks and no trades. This cannot be undone.', 'Start a new round', { danger: true })) await act(() => restartClass(code));
  };
  const remove = async () => {
    if (!(await confirm(`Delete ${cls?.name ?? 'this class'}?`, 'The class, its students and all their trades are deleted for good. This cannot be undone.', 'Delete class', { danger: true }))) return;
    try {
      await deleteClass(code);
      toast('Class deleted');
      router.back();
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const copyCode = async () => {
    await Clipboard.setStringAsync(code);
    toast('Class code copied');
  };

  if (!teacher) return <Page><Empty icon="school-outline" title="Sign in as a teacher" body="Open Settings, then For teachers, to see your classes." /></Page>;

  const all = cls?.students ?? [];
  const traded = all.filter((s) => s.trades > 0).length;
  const average = all.length ? all.reduce((sum, s) => sum + s.gainPct, 0) / all.length : 0;
  const held = new Map<string, number>();
  for (const s of all) for (const h of s.holdings) held.set(h.symbol, (held.get(h.symbol) ?? 0) + 1);
  const popular = [...held.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 4);

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
        ? <Txt size={13} color={C.muted}>Level {s.progress.level} · {s.progress.lessons} {s.progress.lessons === 1 ? 'lesson' : 'lessons'} passed · {s.progress.words} words read · {s.progress.cards} flashcards known · {s.progress.badges} {s.progress.badges === 1 ? 'badge' : 'badges'} · {s.progress.streak ?? 0}-day mission streak</Txt>
        : <Txt size={13} color={C.muted}>Nothing reported yet.</Txt>}

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
        <Txt key={t.id} size={13} color={C.muted}>{fmtDate(t.at)} · {t.side === 'buy' ? 'bought' : 'sold'} {fmtShares(t.shares)} of {t.symbol} at {money(t.price)}</Txt>
      ))}
      <Btn title={`Manage ${s.name}`} kind="ghost" height={42} style={wide ? { alignSelf: 'flex-start', paddingHorizontal: 24 } : undefined} onPress={() => manage(s)} />
    </>
  );
  // Column widths for the table shown on a big screen.
  const col = { num: { width: 64 }, wide: { width: 96 } } as const;
  const head = (title: string, style: object) => <Txt size={12} color={C.muted} style={style}>{title.toUpperCase()}</Txt>;

  return (
    <Page max={wide ? 1180 : undefined}>
      <Stack.Screen options={{ title: cls?.name ?? 'Class' }} />
      <Card>
        <Txt size={13} color={C.muted}>Class code</Txt>
        <Row>
          <Txt size={34} bold style={{ flex: 1, letterSpacing: 4 }}>{code}</Txt>
          <Btn title="Copy" kind="ghost" icon="copy-outline" height={42} onPress={copyCode} />
        </Row>
        <Txt size={14} color={C.muted}>Students open the Class tab and enter this code, a first name with last initial, and a PIN they choose.</Txt>
      </Card>

      {!!error && <Txt size={14} color={C.bad}>{error}</Txt>}
      {cls && all.length === 0 && <Empty icon="people-outline" title="Nobody has joined yet" body="Share the class code. Students appear here as they join." />}

      {all.length > 0 && (
        <>
          <Card>
            <Txt size={17} bold>Class summary</Txt>
            <Row gap={24} style={{ flexWrap: 'wrap' }}>
              <Stat title="Students" value={String(all.length)} />
              <Stat title="Have traded" value={`${traded} of ${all.length}`} />
              <View style={{ gap: 4 }}>
                <Txt size={13} color={C.muted}>Average change</Txt>
                <Delta value={average} size={16} />
              </View>
            </Row>
            {popular.length > 0 && (
              <>
                <Divider />
                <Txt size={13} color={C.muted}>Most held</Txt>
                {popular.map(([symbol, n]) => (
                  <Row key={symbol} gap={10}>
                    <Tile symbol={symbol} size={30} />
                    <Txt size={15} style={{ flex: 1 }} lines={1}>{stock(symbol).name}</Txt>
                    <Txt size={14} color={C.muted}>{n} {n === 1 ? 'student' : 'students'}</Txt>
                  </Row>
                ))}
              </>
            )}
          </Card>

          <Row>
            <Txt size={18} bold style={{ flex: 1 }}>Students ({all.length})</Txt>
            <Btn title="Refresh" kind="text" icon="refresh" busy={busy} onPress={refresh} />
          </Row>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {SORTS.map((x) => <Chip key={x} title={x} selected={sort === x} onPress={() => setSort(x)} />)}
          </View>

          {wide && (
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
                    <Txt size={15} style={col.num}>{s.progress?.level ?? '-'}</Txt>
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

      <Divider />
      <Btn title="Start a new round" kind="ghost" icon="reload" onPress={restart} />
      <Btn title="Delete this class" kind="plain" color={C.bad} onPress={remove} />
    </Page>
  );
}
