import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { lesson, LESSONS, levelDone, METERS_LESSON, recapLesson, reviewLesson } from '@/data/lessons';
import { db, finishLesson, learnedToday, recapPassed, streak, useStore } from '@/lib/store';
import { Avatar } from '@/ui/avatar';
import { mission, watchBadges } from '@/ui/celebrate';
import { Bar, Btn, C, Card, Empty, Icon, Page, Row, Txt } from '@/ui/kit';
import { toast } from '@/ui/overlay';
import { Play } from '@/ui/play';
import { Words } from '@/ui/words';

/** A lesson: a few cards (one idea each, some with something to tap), then a quiz. `review` is three questions from any lesson. */
export default function LessonScreen() {
  const { id, first, again } = useLocalSearchParams<{ id: string; first?: string; again?: string }>();
  // The key starts the screen afresh when one lesson leads straight into the next.
  return <LessonBody key={`${id}${again ?? ''}`} id={String(id)} first={!!first} />;
}

function LessonBody({ id, first }: { id: string; first: boolean }) {
  const router = useRouter();
  const { settings } = useStore();
  const [l] = useState(() => (id === 'review' ? reviewLesson(db.learned.lessons) : id.startsWith('recap-') ? recapLesson(Number(id.slice(6))) : lesson(id)));
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  if (!l) return <Empty icon="help-circle-outline" title="Lesson not found" body="Go back and choose a lesson." />;

  const review = l.id === 'review';
  const recap = l.id.startsWith('recap-');
  const number = LESSONS.findIndex((x) => x.id === l.id) + 1;
  const following = review || recap ? undefined : LESSONS[number];
  // After the last lesson of a level comes that level's recap.
  const recapNext = !review && !recap && l.level < 5 && following?.level !== l.level && levelDone(db.learned.lessons, l.level) && !recapPassed(l.level) ? l.level : 0;
  const afterRecap = recap ? LESSONS.find((x) => x.level === l.level + 1) : undefined;
  const total = l.cards.length + l.quiz.length;
  const done = step >= total;
  const card = step < l.cards.length ? l.cards[step] : null;
  const question = !card && !done ? l.quiz[step - l.cards.length] : null;
  const passed = score === l.quiz.length;

  const next = async () => {
    const right = question && picked === question.answer ? 1 : 0;
    const newScore = score + right;
    setScore(newScore);
    setPicked(null);
    setStep(step + 1);
    if (step + 1 >= total) {
      const celebrate = watchBadges();
      const first = review ? learnedToday() : (finishLesson(l.id, newScore), false);
      const days = streak();
      if (review ? first : days > 0) toast(days > 1 ? `Learning streak: ${days} days in a row!` : 'You learned something today. Come back tomorrow to start a streak.');
      mission('lesson'); // before the badge boxes, so it counts even if the app is closed with one still open
      await celebrate();
    }
  };
  const again = () => { setStep(0); setScore(0); setPicked(null); };

  return (
    <Page>
      <Stack.Screen options={{ title: review || recap ? l.title : `Lesson ${number} of ${LESSONS.length}` }} />
      <Bar value={Math.min(step, total) / total} height={6} />

      {card && (
        <>
          <Card style={{ gap: 12, paddingVertical: 22 }}>
            <Row>
              <Txt size={13} color={C.muted} style={{ flex: 1 }}>{l.title} · {step + 1} of {l.cards.length}</Txt>
              {card.who?.map((w) => <Avatar key={w} id={w} size={44} />)}
            </Row>
            <Txt size={22} bold>{card.title}</Txt>
            <Words text={card.body} />
            {card.play && <Play kind={card.play} />}
          </Card>
          <Row>
            {step > 0 && <Btn title="Back" kind="ghost" style={{ flex: 1 }} onPress={() => setStep(step - 1)} />}
            <Btn title={step === l.cards.length - 1 ? 'Start the quiz' : 'Next'} style={{ flex: 2 }} onPress={() => setStep(step + 1)} />
          </Row>
          <Row style={{ justifyContent: 'center' }}>
            <Btn title="Skip to the quiz" kind="text" onPress={() => setStep(l.cards.length)} />
            {first && <Btn title="Skip for now" kind="plain" onPress={() => router.replace('/')} />}
          </Row>
          <Txt size={12} color={C.muted} center>Know this already? Pass the quiz and the lesson counts. Tap an underlined word to see what it means.</Txt>
        </>
      )}

      {question && (
        <>
          <Txt size={13} color={C.muted}>Question {step - l.cards.length + 1} of {l.quiz.length}</Txt>
          <Txt size={20} bold>{question.q}</Txt>
          {question.options.map((o, i) => {
            const answered = picked !== null;
            const right = i === question.answer;
            const colour = !answered ? C.card : right ? C.goodDim : i === picked ? C.badDim : C.card;
            const edge = !answered ? C.card : right ? C.good : i === picked ? C.bad : C.card;
            return (
              <Pressable key={o} accessibilityRole="button" accessibilityLabel={`Answer ${i + 1}`} disabled={answered} onPress={() => setPicked(i)}
                style={({ pressed }) => ({ backgroundColor: colour, borderColor: edge, borderWidth: 1.5, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.7 : 1 })}>
                <Txt size={16} style={{ flex: 1 }}>{o}</Txt>
                {answered && right && <Icon name="checkmark-circle" color={C.good} />}
                {answered && !right && i === picked && <Icon name="close-circle" color={C.bad} />}
              </Pressable>
            );
          })}
          {picked !== null && (
            <>
              <Card>
                <Txt size={16} bold color={picked === question.answer ? C.good : C.bad}>{picked === question.answer ? 'Correct' : 'Not quite'}</Txt>
                <Txt size={15} color={C.muted}>{question.why}</Txt>
              </Card>
              <Btn title={step === total - 1 ? 'See my score' : 'Next question'} onPress={next} />
            </>
          )}
        </>
      )}

      {done && (
        <>
          <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={passed ? 'ribbon' : 'school'} size={34} color={C.accent} />
            </View>
            <Txt size={24} bold>You scored {score} of {l.quiz.length}</Txt>
            <Txt size={15} color={C.muted} center>
              {review ? 'A quick review a day keeps your learning streak going.'
                : recap ? (passed ? `Full marks. You earned the Level ${l.level} badge.` : 'Full marks earns the level badge. The questions change each time, so try again.')
                : passed ? (l.id === 'orders' ? 'Full marks. Level 1 is done, so buying is unlocked.' : l.id === METERS_LESSON ? 'Full marks. Every stock now shows you a Company meter and a Crowd meter.' : 'Full marks. This lesson is passed.')
                : 'Get every question right to pass the lesson. You can try as many times as you like.'}
            </Txt>
          </Card>
          {!review && !passed && <Btn title="Try again" onPress={again} />}
          {!review && !recap && passed && l.id === 'orders' && !settings.triedBuy && <Btn title="Try your first buy" icon="cart-outline" onPress={() => router.replace('/first-buy')} />}
          {!!recapNext && passed && <Btn title={`Level ${recapNext} recap`} icon="ribbon-outline" kind={l.id === 'orders' && !settings.triedBuy ? 'ghost' : 'primary'} onPress={() => router.replace(`/lesson/recap-${recapNext}`)} />}
          {!review && !recap && !recapNext && passed && following && <Btn title={`Next lesson: ${following.title}`} onPress={() => router.replace(`/lesson/${following.id}`)} />}
          {recap && passed && afterRecap && <Btn title={`Start Level ${afterRecap.level}: ${afterRecap.title}`} onPress={() => router.replace(`/lesson/${afterRecap.id}`)} />}
          {recap && !passed && <Btn title="Try again" onPress={() => router.replace(`/lesson/${l.id}?again=${Date.now()}`)} />}
          <Btn title="Back to lessons" kind={review || (passed && !following && !afterRecap) ? 'primary' : 'ghost'} onPress={() => (router.canGoBack() ? router.back() : router.replace('/learn'))} />
        </>
      )}
    </Page>
  );
}
