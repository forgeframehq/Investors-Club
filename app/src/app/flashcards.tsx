import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Animated, Platform, Pressable, View } from 'react-native';

import { GROUPS, TERMS, type Group, type Term } from '@/data/glossary';
import { CARD_KNOWN, cardsKnown, finishRound, markCard, markTerm, useStore } from '@/lib/store';
import { mission, watchBadges } from '@/ui/celebrate';
import { Bar, Btn, C, Card, Chip, Icon, Page, Row, Txt } from '@/ui/kit';

const ROUND = 10;
type Deck = 'Mix' | Group;

/** Up to ten cards from a deck, shuffled, with the ones not yet known first. */
function deal(deck: Deck, cards: Record<string, number>): Term[] {
  const pool = TERMS.filter((t) => deck === 'Mix' || t.group === deck).map((t) => ({ t, r: Math.random() }));
  pool.sort((a, b) => Math.min(cards[a.t.id] ?? 0, CARD_KNOWN) - Math.min(cards[b.t.id] ?? 0, CARD_KNOWN) || a.r - b.r);
  return pool.slice(0, ROUND).map((x) => x.t).sort(() => Math.random() - 0.5);
}

/** Flashcards made from the glossary: see the word, guess what it means, flip the card to check. Works offline. */
export default function Flashcards() {
  const router = useRouter();
  const { learned, settings } = useStore();
  const [deck, setDeck] = useState<Deck>('Mix');
  const [cards, setCards] = useState<Term[] | null>(null);
  const [at, setAt] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [missed, setMissed] = useState<Term[]>([]);
  const turn = useRef(new Animated.Value(1)).current;
  const celebrate = useRef<() => void>(() => {});

  const start = () => {
    celebrate.current = watchBadges();
    setCards(deal(deck, learned.cards));
    setAt(0);
    setFlipped(false);
    setMissed([]);
  };
  // The card squeezes shut, swaps sides, and opens again, which reads as a flip on Android and in a browser alike.
  const flip = () => {
    const native = Platform.OS !== 'web';
    Animated.timing(turn, { toValue: 0, duration: 120, useNativeDriver: native }).start(() => {
      setFlipped((f) => !f);
      Animated.timing(turn, { toValue: 1, duration: 120, useNativeDriver: native }).start();
    });
  };
  const answer = (knew: boolean) => {
    const card = cards![at];
    markCard(card.id, knew);
    markTerm(card.id);
    if (!knew) setMissed((m) => [...m, card]);
    setFlipped(false);
    setAt(at + 1);
    if (at + 1 >= cards!.length) {
      finishRound();
      celebrate.current();
      mission('cards');
    }
  };

  if (!cards) {
    const inDeck = TERMS.filter((t) => deck === 'Mix' || t.group === deck);
    const known = inDeck.filter((t) => (learned.cards[t.id] ?? 0) >= CARD_KNOWN).length;
    return (
      <Page>
        <Card>
          <Row>
            <Icon name="albums-outline" color={C.accent} />
            <Txt size={18} bold style={{ flex: 1 }}>Flashcards</Txt>
            <Txt size={14} color={C.muted}>{cardsKnown()} of {TERMS.length} known</Txt>
          </Row>
          <Txt size={15} color={C.muted}>You see a word. Say what it means in your head, then flip the card to check. Get a card right twice and it counts as known.</Txt>
        </Card>
        <Txt size={18} bold>Pick a deck</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['Mix', ...GROUPS] as Deck[]).map((d) => <Chip key={d} title={d} selected={deck === d} onPress={() => setDeck(d)} />)}
        </View>
        <Card>
          <Txt size={15}>{deck === 'Mix' ? 'Words from every group' : deck}</Txt>
          <Bar value={inDeck.length ? known / inDeck.length : 0} />
          <Txt size={13} color={C.muted}>{known} of {inDeck.length} known</Txt>
        </Card>
        <Btn title={`Start ${Math.min(ROUND, inDeck.length)} cards`} icon="play" onPress={start} />
      </Page>
    );
  }

  if (at >= cards.length) {
    const right = cards.length - missed.length;
    return (
      <Page>
        <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
          <Icon name={missed.length ? 'thumbs-up-outline' : 'trophy-outline'} size={48} color={C.accent} />
          <Txt size={24} bold center>You knew {right} of {cards.length}</Txt>
          <Txt size={15} color={C.muted} center>{missed.length ? 'The ones you missed will come back first next time.' : 'Every single one. Try another deck.'}</Txt>
        </Card>
        {missed.length > 0 && (
          <Card>
            <Txt size={16} bold>Worth another look</Txt>
            {missed.map((t) => (
              <View key={t.id} style={{ gap: 2 }}>
                <Txt size={15} bold>{t.word}</Txt>
                <Txt size={14} color={C.muted}>{settings.level === 'simple' ? t.simple : t.detailed}</Txt>
              </View>
            ))}
          </Card>
        )}
        <Btn title="Another round" icon="repeat" onPress={start} />
        <Btn title="Choose a different deck" kind="ghost" onPress={() => setCards(null)} />
        <Btn title="Back to Learn" kind="plain" onPress={() => router.back()} />
      </Page>
    );
  }

  const card = cards[at];
  return (
    <Page>
      <Row>
        <Txt size={14} color={C.muted} style={{ flex: 1 }}>Card {at + 1} of {cards.length}</Txt>
        <Txt size={14} color={C.muted}>{card.group}</Txt>
      </Row>
      <Bar value={at / cards.length} height={6} />
      <Animated.View style={{ transform: [{ scaleX: turn }] }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Flashcard" onPress={flip}
          style={{ minHeight: 300, borderRadius: 24, padding: 24, gap: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: flipped ? C.accentDim : C.card, borderWidth: 2, borderColor: flipped ? C.accent : C.border }}>
          {flipped ? (
            <>
              <Txt size={15} bold color={C.accent} center>{card.word}</Txt>
              <Txt size={20} center>{settings.level === 'simple' ? card.simple : card.detailed}</Txt>
            </>
          ) : (
            <>
              <Txt size={34} bold center>{card.word}</Txt>
              <Txt size={15} color={C.muted} center>What does it mean? Tap to flip.</Txt>
            </>
          )}
        </Pressable>
      </Animated.View>
      {flipped ? (
        <Row>
          <Btn title="Still learning" kind="ghost" icon="refresh" style={{ flex: 1 }} onPress={() => answer(false)} />
          <Btn title="I knew it" icon="checkmark" style={{ flex: 1 }} onPress={() => answer(true)} />
        </Row>
      ) : (
        <Btn title="Flip the card" kind="ghost" icon="sync-outline" onPress={flip} />
      )}
    </Page>
  );
}
