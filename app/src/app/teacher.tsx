import * as Clipboard from 'expo-clipboard';
import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';

import { createClass, teacherClasses, teacherSignIn, teacherSignOut, teacherSignUp } from '@/lib/classroom';
import { SCHOOLS } from '@/data/schools';
import { ago, money } from '@/lib/format';
import { isOpen, refreshQuotes, serverUrl } from '@/lib/market';
import { STOCKS } from '@/data/stocks';
import { useStore } from '@/lib/store';
import type { ClassSummary } from '@/lib/types';
import { Btn, C, Card, Chip, Delta, Empty, Field, Icon, Page, Row, Stat, TapCard, Txt } from '@/ui/kit';
import { TeacherBar } from '@/ui/teacher-bar';
import { confirm, pick, prompt, toast } from '@/ui/overlay';

const CASH = [1000, 10000, 100000];

/** Teacher sign-in, then every class the teacher runs. Tap a class to see its students. */
export default function Teacher() {
  const router = useRouter();
  const { teacher, net, quotes } = useStore();
  const [mode, setMode] = useState<'in' | 'new'>('in');
  const [name, setName] = useState('');
  const [school, setSchool] = useState('');
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [schoolKey, setSchoolKey] = useState('');
  const [className, setClassName] = useState('');
  const [cash, setCash] = useState(10000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [classes, setClasses] = useState<ClassSummary[] | null>(null);

  const refresh = useCallback(async () => {
    if (!teacher) return setClasses(null);
    try {
      setClasses(await teacherClasses());
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  }, [teacher]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await work();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const enter = () => run(async () => {
    if (mode === 'new') await teacherSignUp(name, school, login, password, schoolKey);
    else await teacherSignIn(login, password);
    setPassword('');
  });
  const OTHER = 'My school is not on the list';
  const chooseSchool = async () => {
    const v = await pick('Your school', [...SCHOOLS.map((x) => x.name), OTHER], school || null);
    if (v === OTHER) {
      const typed = await prompt('Your school', '', 'School name', { okText: 'Use this name' });
      if (typed && typed.trim().length >= 3) setSchool(typed.trim());
    } else if (v) setSchool(v);
  };
  const chooseCash = async () => {
    const v = await pick('Starting cash for each student', CASH, cash, (n) => money(n, false));
    if (v) setCash(v);
  };
  const create = () => run(async () => {
    const made = await createClass(className, cash);
    setClassName('');
    toast(`${made.name} is ready`);
    router.push(`/teacher-class?code=${made.code}`);
  });
  const signOut = async () => {
    if (!(await confirm('Sign out?', 'Your classes keep running. Sign in again to see them.', 'Sign out'))) return;
    await teacherSignOut();
  };

  if (!teacher) {
    const isNew = mode === 'new';
    return (
      <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Stack.Screen options={{ headerShown: false }} />
      <TeacherBar />
      <Page>
        {!serverUrl() && <Card><Txt size={15}>Classes need a class server. Add its address under Settings, then Market data.</Txt></Card>}
        <Card>
          <Row>
            <Icon name="school-outline" color={C.accent} />
            <Txt size={18} bold>For teachers</Txt>
          </Row>
          <Txt size={15} color={C.muted}>Create classes, hand out a join code, and see every student's portfolio, trades and learning in one place.</Txt>
          <Row gap={8}>
            <Chip title="Sign in" selected={!isNew} onPress={() => { setMode('in'); setError(''); }} />
            <Chip title="Create an account" selected={isNew} onPress={() => { setMode('new'); setError(''); }} />
          </Row>
          {isNew && <Field accessibilityLabel="Teacher name" placeholder="Your name, like Ms Smith" value={name} onChangeText={setName} maxLength={30} style={{ backgroundColor: C.cardHi }} />}
          {isNew && <Btn title={school || 'Choose your school'} kind="ghost" left icon="business-outline" onPress={chooseSchool} />}
          <Field accessibilityLabel="Sign-in name" placeholder={isNew ? 'Choose a sign-in name, like mssmith' : 'Sign-in name'} value={login} onChangeText={setLogin} autoCapitalize="none" autoCorrect={false} maxLength={30} style={{ backgroundColor: C.cardHi }} />
          <Field accessibilityLabel="Password" placeholder={isNew ? 'Choose a password (8 or more characters)' : 'Password'} value={password} onChangeText={setPassword} autoCapitalize="none" autoCorrect={false} secureTextEntry maxLength={100} style={{ backgroundColor: C.cardHi }} />
          {isNew && <Field accessibilityLabel="School key" placeholder="School key (only if you were given one)" value={schoolKey} onChangeText={setSchoolKey} autoCapitalize="none" autoCorrect={false} style={{ backgroundColor: C.cardHi }} />}
          {!!error && <Txt size={14} color={C.bad}>{error}</Txt>}
          <Btn title={isNew ? 'Create account' : 'Sign in as teacher'} busy={busy} disabled={login.trim().length < 3 || password.length < 8 || (isNew && (name.trim().length < 2 || !school))} onPress={enter} />
          {isNew && <Txt size={12} color={C.muted}>Write your password down. There is no email on the account, so it cannot be sent to you if you forget it.</Txt>}
        </Card>
        <Card>
          <Txt size={16} bold>What you get as a teacher</Txt>
          {['Any number of classes, each with its own join code', 'Every student\'s portfolio, holdings and trades', 'What each student has learned: lessons, words, flashcards, badges', 'Who has not traded or been active, and who has everything in one stock', 'Rules for the class: pause trading, or trade only in market hours', 'A spreadsheet of the class to download'].map((x) => (
            <Row key={x} gap={10} style={{ alignItems: 'flex-start' }}>
              <Icon name="checkmark-circle" size={18} color={C.accent} />
              <Txt size={14} style={{ flex: 1 }}>{x}</Txt>
            </Row>
          ))}
        </Card>
      </Page>
      </View>
    );
  }

  const site = serverUrl();
  const copy = async (text: string, what: string) => {
    await Clipboard.setStringAsync(text);
    toast(`${what} copied`);
  };
  const total = (classes ?? []).reduce((sum, c) => sum + c.students, 0);
  const overall = total ? (classes ?? []).reduce((sum, c) => sum + c.avgGainPct * c.students, 0) / total : 0;

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
    <Stack.Screen options={{ headerShown: false }} />
    <TeacherBar />
    <Page>
      <Row>
        <View style={{ flex: 1 }}>
          <Txt size={13} color={C.muted}>Signed in as</Txt>
          <Txt size={22} bold>{teacher.name}</Txt>
          {!!teacher.school && <Txt size={14} color={C.muted}>{teacher.school}</Txt>}
        </View>
        <Btn title="Sign out" kind="text" icon="log-out-outline" onPress={signOut} />
      </Row>
      {/* The one place that says whether prices are flowing. Students never see setup details. */}
      <TapCard bare label="Check prices now" onPress={() => refreshQuotes(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: net.error || !net.at ? C.bad : C.good }} />
        <Txt size={13} color={C.muted} style={{ flex: 1 }}>
          {net.error ? `Prices: ${net.error}` : net.at ? `Prices: up to date for ${Object.keys(quotes).filter((k) => STOCKS.some((s) => s.symbol === k)).length} of ${STOCKS.length} stocks, updated ${ago(net.at)}. Market ${isOpen() ? 'open' : 'closed'}. Tap to check again.` : 'Prices: checking...'}
        </Txt>
      </TapCard>

      {!!classes?.length && (
        <Card>
          <Row gap={28} style={{ flexWrap: 'wrap' }}>
            <Stat title="Classes" value={String(classes.length)} />
            <Stat title="Students" value={String(total)} />
            <View style={{ gap: 4 }}>
              <Txt size={13} color={C.muted}>Average change, all students</Txt>
              <Delta value={overall} size={16} />
            </View>
          </Row>
        </Card>
      )}

      <Txt size={18} bold>Your classes{classes ? ` (${classes.length})` : ''}</Txt>
      {!!error && <Txt size={14} color={C.bad}>{error}</Txt>}
      {classes?.length === 0 && <Empty icon="people-outline" title="No classes yet" body="Make your first class below. You get a code for students to join with." />}
      {classes?.map((c) => (
        <TapCard key={c.code} label={`Class ${c.name}`} onPress={() => router.push(`/teacher-class?code=${c.code}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={17} bold lines={1}>{c.name}</Txt>
            <Txt size={13} color={C.muted}>{c.students} {c.students === 1 ? 'student' : 'students'} · code {c.code}</Txt>
          </View>
          {c.students > 0 && (
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <Delta value={c.avgGainPct} />
              <Txt size={12} color={C.muted}>class average</Txt>
            </View>
          )}
          <Icon name="chevron-forward" size={20} color={C.muted} />
        </TapCard>
      ))}

      <Card>
        <Txt size={18} bold>New class</Txt>
        <Field accessibilityLabel="Class name" placeholder="Class name, like P6 Blue" value={className} onChangeText={setClassName} maxLength={40} style={{ backgroundColor: C.cardHi }} />
        <Btn title={`Starting cash: ${money(cash, false)}`} kind="ghost" left icon="cash-outline" onPress={chooseCash} />
        <Btn title="Create class" busy={busy} disabled={className.trim().length < 2} onPress={create} />
      </Card>

      {!!site && (
        <Card>
          <Txt size={18} bold>Links to share</Txt>
          <Txt size={13} color={C.muted}>Students and teachers use different addresses.</Txt>
          <Row>
            <View style={{ flex: 1 }}>
              <Txt size={14} bold>For students</Txt>
              <Txt size={13} color={C.muted} lines={1}>{site}</Txt>
            </View>
            <Btn title="Copy student link" kind="ghost" icon="copy-outline" height={40} onPress={() => copy(site, 'Student link')} />
          </Row>
          <Row>
            <View style={{ flex: 1 }}>
              <Txt size={14} bold>For teachers</Txt>
              <Txt size={13} color={C.muted} lines={1}>{site}/teacher</Txt>
            </View>
            <Btn title="Copy teacher link" kind="ghost" icon="copy-outline" height={40} onPress={() => copy(`${site}/teacher`, 'Teacher link')} />
          </Row>
        </Card>
      )}
    </Page>
    </View>
  );
}
