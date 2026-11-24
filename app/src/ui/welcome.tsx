import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { money } from '@/lib/format';
import { commit, db, START_CASH } from '@/lib/store';
import type { Level } from '@/lib/types';

import { Avatar, AvatarPicker } from './avatar';
import { BermudaFlag } from './flag';
import { Btn, C, Field, Icon, Row, TapCard, Txt, type IconName } from './kit';

const STEPS = 4;

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
 * The first thing a new student sees: say hello, pick a name and a picture, choose a reading level, and choose
 * which portfolio to start with. Drawn over the app (see the root layout) until it is finished.
 */
export function Welcome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(db.settings.name);
  const [pic, setPic] = useState(db.settings.avatar || 'surfer');
  const [level, setLevel] = useState<Level>(db.settings.level);

  const finish = (go?: '/class' | '/teacher') => {
    db.settings.name = name.trim();
    db.settings.avatar = name.trim() ? pic : db.settings.avatar;
    db.settings.level = level;
    db.settings.onboarded = true;
    commit();
    if (go) router.push(go);
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
              <Point icon="cash-outline" title={`${money(START_CASH, false)} of pretend money`} body="Nothing here is real money, so it is safe to try things out." />
              <Point icon="pulse-outline" title="Real companies, real prices" body="Buy pieces of companies you know, including ones based right here in Bermuda." />
              <Point icon="trophy-outline" title="Learn, collect badges, climb your class" body="Lessons, flashcards, daily missions, and a table of Bermuda schools." />
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
            <AvatarPicker value={pic} onChange={setPic} starterOnly />
            <Txt size={13} color={C.muted} center>More characters unlock as you level up.</Txt>
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
            <Txt size={26} bold>Choose your portfolio</Txt>
            <Txt size={15} color={C.muted}>A portfolio is everything you own: your cash and your stocks.</Txt>
            <Choice icon="people-outline" title="Class portfolio" body="Join with the code from your teacher and see how you compare on the class leaderboard." onPress={() => finish('/class')} />
            <Choice icon="flask-outline" title="Practice portfolio" body={`Start on your own with ${money(START_CASH, false)}. You can join a class any time.`} onPress={() => finish()} />
          </>
        )}
      </ScrollView>

      <View style={{ paddingHorizontal: 20, gap: 6, maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        {step === 0 && <Btn title="Get started" onPress={() => setStep(1)} />}
        {step === 0 && <Btn title="I am a teacher" kind="text" onPress={() => finish('/teacher')} />}
        {step === 1 && <Btn title="Next" disabled={name.trim().length < 2} onPress={() => setStep(2)} />}
        {step === 2 && <Btn title="Next" onPress={() => setStep(3)} />}
      </View>
    </View>
  );
}
