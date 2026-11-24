import { useRouter } from 'expo-router';
import { View } from 'react-native';

import { TERMS } from '@/data/glossary';
import { LESSONS } from '@/data/lessons';
import { cardsKnown, level, useStore } from '@/lib/store';
import { GuessCard, MissionsCard } from '@/ui/daily';
import { Bar, C, Card, Icon, Page, Row, TabHeader, TapCard, Txt, type IconName } from '@/ui/kit';

/** Daily missions, the up-or-down game, lessons with quizzes, flashcards, and the glossary. Everything here works with no internet. */
export default function Learn() {
  const router = useRouter();
  const { learned } = useStore();
  const lv = level();
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <TabHeader title="Learn" />
      <Page>
        <Card>
          <Row>
            <Icon name="ribbon-outline" color={C.accent} />
            <Txt size={16} bold style={{ flex: 1 }}>Level {lv.number}: {lv.name}</Txt>
            <Txt size={14} color={C.muted}>{lv.points} pts</Txt>
          </Row>
          <Bar value={lv.progress} />
          <Txt size={13} color={C.muted}>Earn points by reading words, knowing flashcards, passing quizzes and collecting badges.</Txt>
        </Card>

        <MissionsCard />
        <GuessCard />

        <Txt size={18} bold>Lessons</Txt>
        {LESSONS.map((l) => {
          const score = learned.lessons[l.id];
          const passed = score !== undefined && score >= l.quiz.length;
          return (
            <TapCard key={l.id} label={`Lesson ${l.title}`} onPress={() => router.push(`/lesson/${l.id}`)} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: passed ? C.accentDim : C.cardHi, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={l.icon as IconName} color={passed ? C.accent : C.text} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt size={16} bold>{l.title}</Txt>
                <Txt size={13} color={C.muted}>{score === undefined ? `${l.minutes} min · ${l.quiz.length} questions` : passed ? 'Passed with full marks' : `Best score ${score} of ${l.quiz.length}. Try again for full marks.`}</Txt>
              </View>
              <Icon name={passed ? 'checkmark-circle' : 'chevron-forward'} size={20} color={passed ? C.accent : C.muted} />
            </TapCard>
          );
        })}

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
