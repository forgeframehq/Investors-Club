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

/** Three meanings to choose from: the right one and two from other words, in a random order. */
function choices(card: Term): Term[] {
  const others = TERMS.filter((t) => t.id !== card.id).sort(() => Math.random() - 0.5);
  // Words from the same group make better wrong answers, so they go first.
  const wrong = [...others.filter((t) => t.group === card.group), ...others.filter((t) => t.group !== card.group)].slice(0, 2);
  return [card, ...wrong].sort(() => Math.random() - 0.5);
}

/** Flashcards made from the glossary: see the word, pick what it means, and the card flips to show the answer. Works offline. */
export default function Flashcards() {
  const router = useRouter();
  const { learned, settings } = useStore();
  const [deck, setDeck] = useState<Deck>('Mix');
  const [cards, setCards] = useState<Term[] | null>(null);
  const [at, setAt] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [options, setOptions] = useState<Term[]>([]);
  const [picked, setPicked] = useState<string | null>(null);
  const [missed, setMissed] = useState<Term[]>([]);
  const turn = useRef(new Animated.Value(1)).current;
  const celebrate = useRef<() => void>(() => {});

  const start = () => {
    celebrate.current = watchBadges();
    const dealt = deal(deck, learned.cards);
    setCards(dealt);
    setAt(0);
    setFlipped(false);
    setPicked(null);
    setOptions(choices(dealt[0]));
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
  // Picking an answer records it and flips the card to show the right meaning.
  const choose = (id: string) => {
    if (picked) return;
    const card = cards![at];
    const knew = id === card.id;
    setPicked(id);
    markCard(card.id, knew);
    markTerm(card.id);
    if (!knew) setMissed((m) => [...m, card]);
    flip();
  };
  const next = () => {
    const last = at + 1 >= cards!.length;
    turn.setValue(1);
    setFlipped(false);
    setPicked(null);
    if (!last) setOptions(choices(cards![at + 1]));
    setAt(at + 1);
    if (last) {
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
          <Txt size={15} color={C.muted}>You see a word. Pick what it means and the card flips to show the answer. Get a card right twice and it counts as known.</Txt>
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
          <Txt size={24} bold center>You got {right} of {cards.length}</Txt>
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
  const meaning = (t: Term) => (settings.level === 'simple' ? t.simple : t.detailed);
  const right = picked === card.id;
  return (
    <Page>
      <Row>
        <Txt size={14} color={C.muted} style={{ flex: 1 }}>Card {at + 1} of {cards.length}</Txt>
        <Txt size={14} color={C.muted}>{card.group}</Txt>
      </Row>
      <Bar value={at / cards.length} height={6} />
      <Animated.View style={{ transform: [{ scaleX: turn }] }}>
        <View accessibilityLabel="Flashcard"
          style={{ minHeight: 190, borderRadius: 24, padding: 22, gap: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: flipped ? (right ? C.goodDim : C.cardHi) : C.card, borderWidth: 2, borderColor: flipped ? (right ? C.good : C.bad) : C.border }}>
          {flipped ? (
            <>
              <Row gap={8}>
                <Icon name={right ? 'checkmark-circle' : 'close-circle'} color={right ? C.good : C.bad} />
                <Txt size={17} bold color={right ? C.good : C.bad}>{right ? 'Correct!' : 'Not quite'}</Txt>
              </Row>
              <Txt size={15} bold color={C.muted} center>{card.word} means</Txt>
              <Txt size={18} center>{meaning(card)}</Txt>
            </>
          ) : (
            <>
              <Txt size={32} bold center>{card.word}</Txt>
              <Txt size={15} color={C.muted} center>What does it mean? Pick an answer.</Txt>
            </>
          )}
        </View>
      </Animated.View>
      {options.map((o, i) => {
        const isRight = o.id === card.id;
        const mine = picked === o.id;
        const colour = !picked ? C.card : isRight ? C.good : mine ? C.bad : C.card;
        return (
          <Pressable key={o.id} accessibilityRole="button" accessibilityLabel={`Answer ${i + 1}`} disabled={!!picked} onPress={() => choose(o.id)}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 2, borderColor: colour, opacity: pressed ? 0.7 : picked && !isRight && !mine ? 0.5 : 1 })}>
            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: C.cardHi, alignItems: 'center', justifyContent: 'center' }}>
              {picked && (isRight || mine)
                ? <Icon name={isRight ? 'checkmark' : 'close'} size={18} color={isRight ? C.good : C.bad} />
                : <Txt size={14} bold>{'ABC'[i]}</Txt>}
            </View>
            <Txt size={15} style={{ flex: 1 }}>{meaning(o)}</Txt>
          </Pressable>
        );
      })}
      {!!picked && <Btn title={at + 1 >= cards.length ? 'See my score' : 'Next card'} icon="arrow-forward" onPress={next} />}
    </Page>
  );
}
