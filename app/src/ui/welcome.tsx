import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SCHOOLS } from '@/data/schools';
import { joinClass, schoolClasses, schools } from '@/lib/classroom';
import { money } from '@/lib/format';
import { commit, db, START_CASH, stock } from '@/lib/store';
import type { Level } from '@/lib/types';

import { Avatar, AvatarPicker } from './avatar';
import { BermudaFlag } from './flag';
import { Btn, C, Field, Icon, Row, TapCard, Tile, Txt, type IconName } from './kit';
import { pick } from './overlay';

const STEPS = 5;
/** Companies most children already know, to pick three from. Lessons then use their picks as examples. */
const KNOWN = ['RBLX', 'DIS', 'NKE', 'MCD', 'NFLX', 'SPOT', 'AAPL', 'GOOGL', 'AMZN', 'SONY', 'EA', 'META', 'KO', 'SBUX', 'HSY', 'CROX', 'MAT', 'TSLA'];
const NOT_LISTED = 'My school is not on the list';
interface ClassChoice { id: string; name: string; teacher: string }

function Point({ icon, title, body }: { icon: IconName; title: string; body: string }) {
  return (
    <Row gap={14} style={{ alignItems: 'flex-start' }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} color={C.accent} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={16} bold>{title}</Txt>
        <Txt size={14} color={C.muted}>{body}</Txt>
      </View>
    </Row>
  );
}

function Choice({ icon, title, body, selected, onPress }: { icon: IconName; title: string; body: string; selected?: boolean; onPress: () => void }) {
  return (
    <TapCard label={title} onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 2, borderColor: selected ? C.accent : C.card }}>
      <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: selected ? C.accentDim : C.cardHi, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} color={selected ? C.accent : C.text} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt size={17} bold>{title}</Txt>
        <Txt size={14} color={C.muted}>{body}</Txt>
      </View>
      {selected && <Icon name="checkmark-circle" color={C.accent} />}
    </TapCard>
  );
}

/**
 * The first thing a new student sees: say hello, pick a name and a picture, choose a reading level, pick three
 * companies they know, then find their school and class. Drawn over the app (see the root layout) until it is
 * finished. Teachers never come through here: they use the teacher area.
 */
export function Welcome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(db.settings.name);
  const [pic, setPic] = useState(db.settings.avatar || 'surfer');
  const [level, setLevel] = useState<Level>(db.settings.level);
  const [liked, setLiked] = useState<string[]>([]);
  const [school, setSchool] = useState('');
  const [classes, setClasses] = useState<ClassChoice[] | null>(null);
  const [choice, setChoice] = useState<ClassChoice | null>(null);
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const keep = () => {
    db.settings.name = name.trim();
    db.settings.avatar = pic;
    db.settings.level = level;
    db.settings.brands = liked;
    for (const s of liked) if (!db.watch.includes(s)) db.watch.push(s);
  };
  /** Ends the welcome steps and opens the first lesson. */
  const finish = () => {
    keep();
    db.settings.onboarded = true;
    commit();
    router.push('/lesson/market?first=1');
  };
  const like = (symbol: string) => setLiked(liked.includes(symbol) ? liked.filter((s) => s !== symbol) : liked.length < 3 ? [...liked, symbol] : liked);

  const chooseSchool = async () => {
    // Every Bermuda school, plus any a teacher typed in that is not on our list.
    const extra = await schools().then((list) => list.map((s) => s.name)).catch(() => [] as string[]);
    const v = await pick('Which school do you go to?', [...[...new Set([...SCHOOLS.map((s) => s.name), ...extra])].sort(), NOT_LISTED], school || null);
    if (!v) return;
    setSchool(v);
    setChoice(null);
    setClasses(null);
    setError('');
    if (v === NOT_LISTED) return setClasses([]);
    setBusy(true);
    try {
      setClasses(await schoolClasses(v));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const chooseClass = async () => {
    const v = await pick('Which class are you in?', classes ?? [], choice, (c) => `${c.name} (${c.teacher})`);
    if (v) setChoice(v);
  };
  const join = async () => {
    setBusy(true);
    setError('');
    try {
      keep();
      await joinClass(choice?.id ?? '', code, fullName || name, pin);
      finish();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: C.bg, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }}>
      <Row gap={6} style={{ paddingHorizontal: 20, height: 32 }}>
        {step > 0 && <Btn title="Back" kind="plain" icon="chevron-back" height={32} onPress={() => setStep(step - 1)} />}
        <View style={{ flex: 1 }} />
        {Array.from({ length: STEPS }, (_, i) => <View key={i} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i <= step ? C.accent : C.cardHi }} />)}
      </Row>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20, gap: 16, flexGrow: 1, justifyContent: 'center', maxWidth: 520, width: '100%', alignSelf: 'center' }} keyboardShouldPersistTaps="handled">
        {step === 0 && (
          <>
            <View style={{ width: 76, height: 76, borderRadius: 24, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="trending-up" size={42} color={C.accent} />
            </View>
            <Row gap={8}>
              <BermudaFlag width={34} />
              <Txt size={13} bold color={C.muted} style={{ letterSpacing: 0.6 }}>BERMUDA</Txt>
            </Row>
            <Txt size={32} bold>Welcome to Investors Club of Bermuda</Txt>
            <Txt size={16} color={C.muted}>Made for Bermuda schools. Learn how the stock market works by trying it yourself.</Txt>
            <View style={{ gap: 16, marginTop: 8 }}>
              <Point icon="cash-outline" title={`${money(START_CASH, false)} of practice money`} body="It is not real money, so it is safe to try things out." />
              <Point icon="pulse-outline" title="Real companies, real prices" body="Buy pieces of companies you know, including ones based right here in Bermuda." />
              <Point icon="trophy-outline" title="Learn step by step" body="Short lessons with real companies, then flashcards, badges and your class table." />
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <View style={{ alignItems: 'center', gap: 10 }}>
              <Avatar id={pic} name={name} size={92} />
              <Txt size={26} bold center>Make your profile</Txt>
              <Txt size={15} color={C.muted} center>Your first name is enough. Then pick a picture.</Txt>
            </View>
            <Field accessibilityLabel="Your first name" placeholder="First name, like Sam" value={name} onChangeText={setName} maxLength={20} autoCorrect={false} autoCapitalize="words" />
            <AvatarPicker value={pic} onChange={setPic} />
          </>
        )}

        {step === 2 && (
          <>
            <Txt size={26} bold>How should we explain things?</Txt>
            <Txt size={15} color={C.muted}>You can change this later in Settings.</Txt>
            <Choice icon="happy-outline" title="Keep it simple" body="Short, everyday words. Good for primary school." selected={level === 'simple'} onPress={() => setLevel('simple')} />
            <Choice icon="glasses-outline" title="Give me the detail" body="The proper terms, with more explanation. Good for older students." selected={level === 'detailed'} onPress={() => setLevel('detailed')} />
          </>
        )}

        {step === 3 && (
          <>
            <Txt size={26} bold>Pick three you know</Txt>
            <Txt size={15} color={C.muted}>These are real companies. Your lessons will use the ones you pick as examples. {liked.length} of 3 picked.</Txt>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {KNOWN.map((symbol) => {
                const on = liked.includes(symbol);
                return (
                  <TapCard key={symbol} label={`Pick ${stock(symbol).name}`} onPress={() => like(symbol)} style={{ width: '31%', flexGrow: 1, alignItems: 'center', gap: 6, padding: 10, borderWidth: 2, borderColor: on ? C.accent : C.card, opacity: !on && liked.length >= 3 ? 0.5 : 1 }}>
                    <Tile symbol={symbol} size={44} />
                    <Txt size={12} bold={on} center lines={1}>{stock(symbol).name.replace(/ \(.*\)$/, '')}</Txt>
                  </TapCard>
                );
              })}
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <Txt size={26} bold>Find your class</Txt>
            <Txt size={15} color={C.muted}>Choose your school, then your class. Your teacher gives you the class code.</Txt>
            <Btn title={school || 'Choose your school'} kind="ghost" left icon="business-outline" busy={busy && !classes} onPress={chooseSchool} />
            {classes && classes.length > 0 && (
              <>
                <Btn title={choice ? `${choice.name} (${choice.teacher})` : 'Choose your class'} kind="ghost" left icon="people-outline" onPress={chooseClass} />
                {choice && (
                  <>
                    <Field accessibilityLabel="Class code" placeholder="Class code from your teacher" value={code} onChangeText={(t) => setCode(t.toUpperCase())} autoCapitalize="characters" autoCorrect={false} maxLength={6} />
                    <Field accessibilityLabel="Your name" placeholder="First name and last initial, like Sam T" value={fullName || name} onChangeText={setFullName} maxLength={20} autoCorrect={false} />
                    <Field accessibilityLabel="PIN" placeholder="Choose a PIN (4 digits)" value={pin} onChangeText={(t) => setPin(t.replace(/\D/g, ''))} keyboardType="number-pad" secureTextEntry maxLength={8} />
                    <Txt size={12} color={C.muted}>Remember your PIN. You need your name and PIN to get back in on another device. No email or surname needed.</Txt>
                  </>
                )}
              </>
            )}
            {classes && classes.length === 0 && (
              <Row gap={10} style={{ backgroundColor: C.accentDim, borderRadius: 12, padding: 12, alignItems: 'flex-start' }}>
                <Icon name="information-circle-outline" size={20} color={C.accent} />
                <Txt size={14} style={{ flex: 1 }}>{school === NOT_LISTED ? 'No problem.' : `${school} has no class here yet.`} Start with a practice portfolio now. You can join your class later from the Class tab.</Txt>
              </Row>
            )}
            {!!error && <Txt size={14} color={C.bad}>{error}</Txt>}
          </>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, gap: 6, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        {step === 0 && <Btn title="Get started" onPress={() => setStep(1)} />}
        {step === 1 && <Btn title="Next" disabled={name.trim().length < 2} onPress={() => setStep(2)} />}
        {step === 2 && <Btn title="Next" onPress={() => setStep(3)} />}
        {step === 3 && <Btn title="Next" disabled={liked.length < 3} onPress={() => setStep(4)} />}
        {step === 4 && choice && <Btn title="Join my class" busy={busy} disabled={!code.trim() || !(fullName || name).trim() || pin.length < 4} onPress={join} />}
        {step === 4 && classes?.length === 0 && <Btn title="Start with a practice portfolio" onPress={finish} />}
        {step === 4 && classes?.length !== 0 && <Btn title="Practise on my own for now" kind="text" onPress={finish} />}
      </View>
    </View>
  );
}
