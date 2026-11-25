import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { TERMS } from '@/data/glossary';
import { LESSONS, LEVELS } from '@/data/lessons';
import { cardsKnown, level, recapPassed, useStore } from '@/lib/store';
import { Emblem, Medal } from '@/ui/art';
import { toast } from '@/ui/overlay';
import { GuessCard, MissionsCard, StreakCard } from '@/ui/daily';
import { Bar, C, Card, Icon, Page, Row, TabHeader, TapCard, Txt, type IconName } from '@/ui/kit';

/** The learning path first, then the streak, missions, games, flashcards and the glossary. All but the real-chart game work with no internet. */
export default function Learn() {
  const router = useRouter();
  const { learned, settings } = useStore();
  const lv = level();
  const isPassed = (id: string, questions: number) => (learned.lessons[id] ?? -1) >= questions;
  const passedCount = LESSONS.filter((l) => isPassed(l.id, l.quiz.length)).length;
  const nextId = LESSONS.find((l) => !isPassed(l.id, l.quiz.length))?.id;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TabHeader title="Learn" />
      <Page>
        <TapCard label="Open the progress ladder" onPress={() => router.push('/ladder')}>
          <Row>
            <Emblem level={lv.number} size={44} />
            <Txt size={16} bold style={{ flex: 1 }}>Rank {lv.number}: {lv.name}</Txt>
            <Txt size={14} color={C.muted}>{lv.points} pts</Txt>
          </Row>
          <Bar value={lv.progress} />
          <Txt size={13} color={C.muted}>Earn points by passing lessons, reading words, knowing flashcards and checking stocks before you buy.</Txt>
          <Row gap={4}>
            <Txt size={14} bold color={C.accent}>See the progress ladder</Txt>
            <Icon name="chevron-forward" size={16} color={C.accent} />
          </Row>
        </TapCard>

        <StreakCard />

        <View style={{ gap: 6 }}>
          <Row>
            <Txt size={18} bold style={{ flex: 1 }}>Learning path</Txt>
            <Txt size={14} color={C.muted}>{passedCount} of {LESSONS.length} lessons done</Txt>
          </Row>
          <Bar value={passedCount / LESSONS.length} height={6} />
          <Txt size={13} color={C.muted}>Four levels, one idea per lesson, about two minutes each. Know it already? Skip to the quiz.</Txt>
        </View>
        {LEVELS.map((group) => {
          const list = LESSONS.filter((l) => l.level === group.n);
          const doneHere = list.filter((l) => isPassed(l.id, l.quiz.length)).length;
          const allDone = doneHere === list.length;
          const recap = group.n < 5;
          return (
            <View key={group.n} style={{ gap: 10 }}>
              <View style={{ gap: 2, marginTop: 6 }}>
                <Row>
                  <Txt size={17} bold style={{ flex: 1 }}>{group.n < 5 ? `Level ${group.n}: ${group.title}` : group.title}</Txt>
                  <Txt size={13} color={C.muted}>{doneHere} of {list.length}</Txt>
                </Row>
                <Txt size={13} color={C.muted}>{group.about}{group.n === 1 && !allDone ? ' Buying unlocks when you finish it.' : ''}</Txt>
              </View>
              {list.map((l) => {
          const i = LESSONS.indexOf(l);
          const score = learned.lessons[l.id];
          const passed = score !== undefined && score >= l.quiz.length;
          const next = l.id === nextId;
          return (
            <TapCard key={l.id} label={`Lesson ${l.title}`} onPress={() => router.push(`/lesson/${l.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 2, borderColor: next ? C.accent : C.card }}>
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: passed || next ? C.accentDim : C.cardHi, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={l.icon as IconName} color={passed || next ? C.accent : C.text} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt size={12} bold color={next ? C.accent : C.muted} style={{ letterSpacing: 0.5 }}>LESSON {i + 1}{next ? ' · UP NEXT' : ''}</Txt>
                <Txt size={16} bold>{l.title}</Txt>
                <Txt size={13} color={C.muted}>{score === undefined ? `${l.minutes} min · ${l.quiz.length} questions` : passed ? 'Passed with full marks' : `Best score ${score} of ${l.quiz.length}. Try again for full marks.`}</Txt>
              </View>
              <Icon name={passed ? 'checkmark-circle' : 'chevron-forward'} size={20} color={passed ? C.accent : C.muted} />
            </TapCard>
          );
        })}
              {recap && (
                <TapCard label={`Level ${group.n} recap`} onPress={() => (allDone ? router.push(`/lesson/recap-${group.n}`) : toast(`Pass the ${list.length} lessons in Level ${group.n} first.`))} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, opacity: allDone ? 1 : 0.55 }}>
                  <Medal id={`level-${group.n}`} size={46} dim={!recapPassed(group.n)} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Txt size={16} bold>Level {group.n} recap</Txt>
                    <Txt size={13} color={C.muted}>{recapPassed(group.n) ? 'Passed. Badge earned.' : allDone ? 'Five questions. Full marks earns the level badge.' : 'Unlocks when the lessons above are passed.'}</Txt>
                  </View>
                  <Icon name={recapPassed(group.n) ? 'checkmark-circle' : allDone ? 'chevron-forward' : 'lock-closed-outline'} size={20} color={recapPassed(group.n) ? C.accent : C.muted} />
                </TapCard>
              )}
            </View>
          );
        })}

        {!settings.triedBuy && (
          <TapCard label="Try your first buy" onPress={() => router.push('/first-buy')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center' }}><Icon name="cart-outline" /></View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt size={16} bold>Try your first buy</Txt>
              <Txt size={13} color={C.muted}>A trial run, step by step. It does not touch your $10,000.</Txt>
            </View>
            <Icon name="chevron-forward" size={20} color={C.muted} />
          </TapCard>
        )}

        <MissionsCard />

        <Txt size={18} bold>Games</Txt>
        <TapCard label="Play What happened next" onPress={() => router.push('/what-next')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center' }}><Icon name="analytics-outline" color={C.accent} /></View>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={16} bold>What happened next?</Txt>
            <Txt size={13} color={C.muted}>See a real chart with the end hidden. Did the price go up or down?</Txt>
          </View>
          <Icon name="chevron-forward" size={20} color={C.muted} />
        </TapCard>
        <GuessCard />

        <Txt size={18} bold>Flashcards</Txt>
        <TapCard label="Play flashcards" onPress={() => router.push('/flashcards')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="albums-outline" color={C.accent} />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Txt size={16} bold>Do you know the words?</Txt>
            <Bar value={cardsKnown() / TERMS.length} height={6} />
            <Txt size={13} color={C.muted}>{cardsKnown()} of {TERMS.length} cards known · 10 cards a round</Txt>
          </View>
          <Icon name="chevron-forward" size={20} color={C.muted} />
        </TapCard>

        <Txt size={18} bold>Glossary</Txt>
        <TapCard label="Open the glossary" onPress={() => router.push('/glossary')} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="book-outline" />
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <Txt size={16} bold>What do all the words mean?</Txt>
            <Bar value={learned.terms.length / TERMS.length} height={6} />
            <Txt size={13} color={C.muted}>{learned.terms.length} of {TERMS.length} words read</Txt>
          </View>
          <Icon name="chevron-forward" size={20} color={C.muted} />
        </TapCard>
      </Page>
    </View>
  );
}
