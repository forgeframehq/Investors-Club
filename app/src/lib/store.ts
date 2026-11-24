// Everything the app remembers lives here and is saved on the device: your practice portfolio, what you have
// learned, the last prices seen, and (if you joined one) your class. Prices themselves come from lib/market.ts.
import { useSyncExternalStore } from 'react';

import { LESSONS } from '@/data/lessons';
import { STOCKS } from '@/data/stocks';
import { TERMS } from '@/data/glossary';

import { dayKey } from './format';
import { applyTrade } from './rules';
import { readJson, writeJson } from './storage';
import { applyAccent } from './theme';
import type { ClassLink, HistoryPoint, Holding, Learned, Markers, Play, Portfolio, Progress, Quote, Settings, Stock, TeacherLink } from './types';

export const START_CASH = 10000;
export const newPortfolio = (start = START_CASH): Portfolio => ({ start, cash: start, holdings: [], trades: [], snapshots: [] });
const newPlay = (): Play => ({ day: '', done: [], streak: 0, lastFull: '', fullDays: 0, guess: null, lastResult: null, right: 0, guesses: 0 });

export const db = {
  ready: false,
  settings: { name: '', avatar: '', onboarded: false, level: 'simple', finnhubKey: '', twelveKey: '', server: '' } as Settings,
  /** Practice portfolio, kept only on this device. */
  solo: newPortfolio(),
  /** The class this device belongs to, and a copy of the portfolio the class server keeps. */
  cls: null as ClassLink | null,
  classPortfolio: null as Portfolio | null,
  /** A teacher signed in on this device. Separate from `cls`, so a teacher can also try the app as a student. */
  teacher: null as TeacherLink | null,
  watch: [] as string[],
  learned: { terms: [], lessons: {}, cards: {}, rounds: 0 } as Learned,
  play: newPlay(),
  quotes: {} as Record<string, Quote>,
  /** Stock symbol -> address of the company's logo picture. Stocks without one show their letters instead. */
  logos: {} as Record<string, string>,
  markers: {} as Record<string, Markers>,
  history: {} as Record<string, { at: number; points: HistoryPoint[] }>,
  /** State of the last price refresh, for the banner on the Market tab. */
  net: { loading: false, error: '', at: 0 },
};

const bySymbol = new Map(STOCKS.map((s) => [s.symbol, s]));
export const stock = (symbol: string): Stock => bySymbol.get(symbol) ?? { symbol, name: symbol, sector: 'Tech', about: '' };

// ---------- change notifications ----------

let version = 0;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => (listeners.add(l), () => void listeners.delete(l));
export function bump() {
  version++;
  listeners.forEach((l) => l());
}
/** Re-renders the calling component whenever anything in the store changes. */
export function useStore() {
  useSyncExternalStore(subscribe, () => version, () => version);
  return db;
}

function save() {
  writeJson('data', { settings: db.settings, solo: db.solo, cls: db.cls, classPortfolio: db.classPortfolio, teacher: db.teacher, watch: db.watch, learned: db.learned, play: db.play });
}
export function commit() {
  save();
  bump();
}
/** Prices are saved separately so the last known ones show straight away next time, even with no signal. */
export function saveMarket() {
  writeJson('market', { quotes: db.quotes, markers: db.markers, history: db.history, logos: db.logos });
  bump();
}

export async function load() {
  const data = await readJson<Partial<typeof db>>('data');
  if (data) {
    Object.assign(db.settings, data.settings ?? {});
    if (data.solo) db.solo = { ...newPortfolio(), ...data.solo };
    // Builds before teacher accounts kept a teacher's class in `cls`. Those are dropped: the teacher signs in instead.
    const cls = data.cls as (ClassLink & { role?: string }) | null | undefined;
    db.cls = cls && cls.role !== 'teacher' ? { server: cls.server, code: cls.code, className: cls.className, token: cls.token, name: cls.name } : null;
    db.classPortfolio = db.cls ? data.classPortfolio ?? null : null;
    db.teacher = data.teacher ?? null;
    db.watch = data.watch ?? [];
    db.learned = { terms: data.learned?.terms ?? [], lessons: data.learned?.lessons ?? {}, cards: data.learned?.cards ?? {}, rounds: data.learned?.rounds ?? 0 };
    db.play = { ...newPlay(), ...(data.play ?? {}) };
    // Someone who used the app before the welcome steps existed does not need to see them.
    if (!db.settings.onboarded && (db.solo.trades.length > 0 || db.cls || db.teacher || db.learned.terms.length > 0)) db.settings.onboarded = true;
  }
  const market = await readJson<Pick<typeof db, 'quotes' | 'markers' | 'history' | 'logos'>>('market');
  if (market) {
    db.quotes = market.quotes ?? {};
    db.markers = market.markers ?? {};
    db.history = market.history ?? {};
    db.logos = market.logos ?? {};
  }
  applyAccent(db.settings.accent);
  db.ready = true;
  bump();
}

// ---------- settings ----------

export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  db.settings[key] = value;
  if (key === 'accent') applyAccent(value as string);
  commit();
}

// ---------- portfolio maths ----------

/** The portfolio on screen: the class one once you have joined a class as a student, otherwise practice. */
export const inClass = () => !!db.cls && !!db.classPortfolio;
export const portfolio = (): Portfolio => (inClass() ? db.classPortfolio! : db.solo);

export const priceOf = (symbol: string): number | null => db.quotes[symbol]?.price ?? null;
export const holdingOf = (p: Portfolio, symbol: string): Holding | undefined => p.holdings.find((h) => h.symbol === symbol);

/** What a holding is worth now. Falls back to what was paid when no price has been seen yet. */
export const holdingValue = (h: Holding) => {
  const price = priceOf(h.symbol);
  return price === null ? h.cost : h.shares * price;
};
export const investedValue = (p: Portfolio) => p.holdings.reduce((sum, h) => sum + holdingValue(h), 0);
export const totalValue = (p: Portfolio) => p.cash + investedValue(p);
export const gainPct = (p: Portfolio) => (p.start ? ((totalValue(p) - p.start) / p.start) * 100 : 0);
export const dayChangePct = (q: Quote | undefined) => (q && q.prev ? ((q.price - q.prev) / q.prev) * 100 : 0);

/** Records a practice trade on this device. Returns an error sentence, or '' when it went through. */
export function tradeSolo(symbol: string, side: 'buy' | 'sell', shares: number, price: number): string {
  const next = applyTrade(db.solo, symbol, side, shares, price);
  if (typeof next === 'string') return next;
  db.solo = next;
  snapshot();
  commit();
  return '';
}

/** Notes today's total value so the portfolio graph has one point per day. */
export function snapshot() {
  for (const p of inClass() ? [db.solo, db.classPortfolio!] : [db.solo]) {
    if (p.holdings.some((h) => priceOf(h.symbol) === null)) continue; // wait until every holding has a price
    const d = dayKey();
    const v = Math.round(totalValue(p) * 100) / 100;
    const last = p.snapshots[p.snapshots.length - 1];
    if (last?.d === d) last.v = v;
    else p.snapshots.push({ d, v });
    if (p.snapshots.length > 400) p.snapshots.splice(0, p.snapshots.length - 400);
  }
}

export function resetSolo() {
  db.solo = newPortfolio();
  commit();
}

export function toggleWatch(symbol: string) {
  db.watch = db.watch.includes(symbol) ? db.watch.filter((s) => s !== symbol) : [...db.watch, symbol];
  commit();
}

// ---------- class ----------

/** Replaces the local copy of the class portfolio with what the server says, keeping the daily graph points. */
export function setClassPortfolio(server: Omit<Portfolio, 'snapshots'>) {
  db.classPortfolio = { ...server, snapshots: db.classPortfolio?.snapshots ?? [] };
  snapshot();
  commit();
}
export function setClass(link: ClassLink | null) {
  db.cls = link;
  if (!link) db.classPortfolio = null;
  commit();
}
export function setTeacher(link: TeacherLink | null) {
  db.teacher = link;
  commit();
}

// ---------- learning, badges and levels ----------

export function markTerm(id: string) {
  if (db.learned.terms.includes(id)) return;
  db.learned.terms.push(id);
  commit();
}
export function finishLesson(id: string, score: number) {
  db.learned.lessons[id] = Math.max(score, db.learned.lessons[id] ?? 0);
  commit();
}

/** A flashcard counts as known once it has been answered "I knew it" this many times in a row. */
export const CARD_KNOWN = 2;
/** Records a flashcard answer. Knowing it moves the card up a step; not knowing it sends it back to the start. */
export function markCard(id: string, knew: boolean) {
  db.learned.cards[id] = knew ? Math.min(3, (db.learned.cards[id] ?? 0) + 1) : 0;
  commit();
}
export function finishRound() {
  db.learned.rounds++;
  commit();
}
export const cardsKnown = () => TERMS.filter((t) => (db.learned.cards[t.id] ?? 0) >= CARD_KNOWN).length;
const lessonsPassed = () => LESSONS.filter((l) => (db.learned.lessons[l.id] ?? 0) >= l.quiz.length).length;
/** What this student has learned, as the class server and the teacher view show it. */
export const progress = (): Progress => ({ lessons: lessonsPassed(), words: db.learned.terms.length, cards: cardsKnown(), badges: badges().filter((b) => b.earned).length, level: level().number, streak: streak() });

// ---------- daily missions ----------

export interface Mission { id: string; title: string; icon: string; go: string }
/** Small things to do each day. None of them is a trade: they reward looking, reading and learning. */
export const MISSIONS: Mission[] = [
  { id: 'word', title: 'Read a new word in the glossary', icon: 'book-outline', go: '/glossary' },
  { id: 'cards', title: 'Finish a round of flashcards', icon: 'albums-outline', go: '/flashcards' },
  { id: 'lesson', title: 'Take a lesson quiz', icon: 'school-outline', go: '/learn' },
  { id: 'marker', title: 'Open a stock and tap one of its markers', icon: 'speedometer-outline', go: '/' },
  { id: 'portfolio', title: 'Check how your portfolio is doing', icon: 'wallet-outline', go: '/portfolio' },
  { id: 'guess', title: 'Make an up-or-down guess', icon: 'swap-vertical-outline', go: '/learn' },
];
const hash = (text: string) => { let h = 7; for (const c of text) h = (h * 31 + c.charCodeAt(0)) % 100003; return h; };
const yesterday = () => dayKey(Date.now() - 86400000);

/** Today's three missions. Everyone gets the same three on the same day, so a class can talk about them. */
export function todaysMissions(day = dayKey()): Mission[] {
  const start = hash(day) % MISSIONS.length;
  const step = 1 + (hash(day + 'x') % 2); // 1 or 2, so the three are always different
  return [0, 1, 2].map((i) => MISSIONS[(start + i * step) % MISSIONS.length]);
}
/** Mission ids finished today. */
export const missionsDone = () => (db.play.day === dayKey() ? db.play.done : []);
/** Days in a row with every mission done. Drops to 0 once a day is missed. */
export const streak = () => (db.play.lastFull === dayKey() || db.play.lastFull === yesterday() ? db.play.streak : 0);

/**
 * Call when the student does something a mission might ask for. Returns 'one' if that finished a mission,
 * 'all' if it finished the last of today's three, and '' if it was not a mission today or was already done.
 */
export function did(id: string): '' | 'one' | 'all' {
  const today = dayKey();
  if (db.play.day !== today) { db.play.day = today; db.play.done = []; }
  const list = todaysMissions(today);
  if (!list.some((m) => m.id === id) || db.play.done.includes(id)) return '';
  db.play.done.push(id);
  const all = list.every((m) => db.play.done.includes(m.id));
  if (all) {
    db.play.streak = db.play.lastFull === yesterday() ? db.play.streak + 1 : 1;
    db.play.lastFull = today;
    db.play.fullDays++;
  }
  commit();
  return all ? 'all' : 'one';
}

// ---------- the up-or-down game ----------

/** The stock everyone is asked about today. */
export const guessStock = (day = dayKey()) => STOCKS[hash(day + 'g') % STOCKS.length];
/** Records today's guess at the current price. Returns false if there is no price to guess from. */
export function makeGuess(pick: 'up' | 'down'): boolean {
  const s = guessStock();
  const price = priceOf(s.symbol);
  if (price === null) return false;
  db.play.guess = { day: dayKey(), symbol: s.symbol, price, pick };
  db.play.lastResult = null;
  commit();
  return true;
}
/** Once a newer price has arrived on a later day, works out whether the waiting guess was right. */
export function settleGuess() {
  const g = db.play.guess;
  const q = g ? db.quotes[g.symbol] : undefined;
  if (!g || !q || g.day >= dayKey() || dayKey(q.at) <= g.day) return;
  const movePct = ((q.price - g.price) / g.price) * 100;
  db.play.guess = null;
  if (Math.abs(movePct) >= 0.005) { // a price that did not move at all is nobody's win
    const right = movePct > 0 === (g.pick === 'up');
    db.play.guesses++;
    if (right) db.play.right++;
    db.play.lastResult = { symbol: g.symbol, pick: g.pick, movePct, right };
  }
  commit();
}

export interface Badge { id: string; title: string; how: string; icon: string; earned: boolean }

/** Badges reward learning and sensible habits. None of them rewards trading often. */
export function badges(): Badge[] {
  const p = portfolio();
  const sectors = new Set(p.holdings.map((h) => stock(h.symbol).sector));
  const lessonsDone = LESSONS.filter((l) => (db.learned.lessons[l.id] ?? 0) >= l.quiz.length).length;
  const oldestHeld = p.holdings.length
    ? Math.min(...p.holdings.map((h) => {
        const buys = p.trades.filter((t) => t.symbol === h.symbol && t.side === 'buy');
        return buys.length ? new Date(buys[buys.length - 1].at).getTime() : Date.now();
      }))
    : Date.now();
  const b = (id: string, title: string, how: string, icon: string, earned: boolean): Badge => ({ id, title, how, icon, earned });
  return [
    b('first-trade', 'First Trade', 'Buy your first stock', 'rocket-outline', p.trades.length > 0),
    b('first-lesson', 'Quick Learner', 'Pass a lesson quiz with full marks', 'school-outline', lessonsDone >= 1),
    b('word-10', 'Word Collector', 'Read 10 words in the glossary', 'book-outline', db.learned.terms.length >= 10),
    b('cards-round', 'Card Flipper', 'Finish a round of flashcards', 'albums-outline', db.learned.rounds >= 1),
    b('cards-20', 'Sharp Memory', 'Know 20 flashcards', 'flash-outline', cardsKnown() >= 20),
    b('streak-3', 'On a Roll', 'Finish your daily missions 3 days in a row', 'flame-outline', db.play.streak >= 3),
    b('streak-5', 'School Week', 'Finish your daily missions 5 days in a row', 'calendar-outline', db.play.streak >= 5),
    b('guess-5', 'Crystal Ball', 'Make 5 up-or-down guesses', 'eye-outline', db.play.guesses >= 5),
    b('three-baskets', 'Three Baskets', 'Own stocks from 3 different groups', 'grid-outline', sectors.size >= 3),
    b('five-companies', 'Team Builder', 'Own 5 different stocks', 'people-outline', p.holdings.length >= 5),
    b('fund', 'Whole Market', 'Own a fund', 'globe-outline', p.holdings.some((h) => stock(h.symbol).sector === 'Funds')),
    b('local', 'Island Investor', 'Own a Bermuda company', 'boat-outline', p.holdings.some((h) => stock(h.symbol).sector === 'Bermuda')),
    b('green', 'In the Green', 'Have your portfolio worth more than you started with', 'trending-up-outline', p.trades.length > 0 && totalValue(p) > p.start),
    b('patient', 'Patient Investor', 'Hold a stock for 30 days', 'hourglass-outline', p.holdings.length > 0 && Date.now() - oldestHeld >= 30 * 86400000),
    b('word-all', 'Dictionary', 'Read every word in the glossary', 'library-outline', db.learned.terms.length >= TERMS.length),
    b('graduate', 'Graduate', 'Pass every lesson quiz with full marks', 'ribbon-outline', lessonsDone >= LESSONS.length),
  ];
}

const LEVELS = ['Rookie', 'Saver', 'Analyst', 'Strategist', 'Fund Manager', 'Tycoon'];
/** Investor level from points: 10 per word read, 10 per flashcard known, 20 per day of missions, 50 per lesson passed, 100 per badge. */
export function level() {
  const points = db.learned.terms.length * 10 + cardsKnown() * 10 + db.play.fullDays * 20 + lessonsPassed() * 50 + badges().filter((x) => x.earned).length * 100;
  const steps = [0, 150, 400, 800, 1400, 2200];
  let i = 0;
  while (i < steps.length - 1 && points >= steps[i + 1]) i++;
  const next = steps[i + 1] ?? null;
  return { name: LEVELS[i], number: i + 1, points, next, progress: next ? (points - steps[i]) / (next - steps[i]) : 1 };
}
