export type Sector = 'Tech' | 'Games & Fun' | 'Food & Drink' | 'Shops & Style' | 'Travel & Cars' | 'Money' | 'Health' | 'Bermuda' | 'Funds';

export interface Stock {
  symbol: string;
  name: string;
  sector: Sector;
  /** One or two plain sentences on what the company does. */
  about: string;
}

export interface Quote {
  price: number;
  /** Yesterday's closing price, used for "today's change". */
  prev: number;
  /** When the price was fetched (ms). */
  at: number;
  /** Today's highest, lowest and opening price, when the data source gives them. */
  hi?: number;
  lo?: number;
  open?: number;
}

export interface Holding {
  symbol: string;
  shares: number;
  /** Total paid for the shares still held. */
  cost: number;
}

export interface Trade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  shares: number;
  price: number;
  at: string; // ISO UTC
  /** Buys only: the reason picked in "Check before you buy". Missing when the check was skipped. */
  why?: string;
}

/** A buy or sell placed while the market was closed. It is filled at the first price after the market opens. */
export interface Order {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  /** Either a number of shares, or a number of dollars to spend (buys only). */
  shares?: number;
  dollars?: number;
  at: string; // ISO UTC
  why?: string;
}
/** An order that could not be filled, with the reason in plain words. */
export interface OrderNote { id: string; symbol: string; side: 'buy' | 'sell'; why: string; at: string }

export interface Portfolio {
  /** Pretend dollars you started with. */
  start: number;
  cash: number;
  holdings: Holding[];
  trades: Trade[]; // newest first
  /** Orders waiting for the market to open, oldest first. */
  orders?: Order[];
  /** Orders that could not be filled, newest first. */
  notes?: OrderNote[];
  /** One total value per day, oldest first, for the "how am I doing" graph. */
  snapshots: { d: string; v: number }[];
}

export type Level = 'simple' | 'detailed';

export interface Settings {
  /** First name shown on the Portfolio tab and used to fill in the class join form. */
  name: string;
  /** Id of the picture chosen in the welcome steps (see data/avatars.ts). */
  avatar: string;
  /** True once the welcome steps have been finished on this device. */
  onboarded: boolean;
  accent?: string;
  level: Level;
  /** Up to three companies the student already knows, picked in the welcome steps. Lessons use them as examples. */
  brands?: string[];
  /** True once the trial buy has been finished (or skipped by making a real one). */
  triedBuy?: boolean;
}

/** Set once this device has joined a class as a student. */
export interface ClassLink {
  server: string;
  code: string;
  className: string;
  school?: string;
  /** Student token. Treat like a password. */
  token: string;
  name: string;
}

/** Set once a teacher has signed in on this device. */
export interface TeacherLink {
  server: string;
  /** Teacher token. Treat like a password. */
  token: string;
  name: string;
  login: string;
  school?: string;
}

export interface Learned {
  terms: string[];
  /** Lesson id -> best quiz score. */
  lessons: Record<string, number>;
  /** Flashcards: term id -> how well it is known, 0 (new) to 3 (known). */
  cards: Record<string, number>;
  /** Flashcard rounds finished. */
  rounds: number;
  /** Stocks checked with "Check before you buy". Each one counts once for points, however often it is bought. */
  checked?: string[];
}

/** What a student has learned, in numbers. Sent to the class server so the teacher can see it. */
export interface Progress {
  lessons: number;
  words: number;
  cards: number;
  badges: number;
  level: number;
  /** Days in a row with some learning done: a lesson, a flashcard round or a quick review. */
  streak: number;
}

/** An up-or-down guess waiting for the price to move. */
export interface Guess { day: string; symbol: string; price: number; pick: 'up' | 'down' }
export interface GuessResult { symbol: string; pick: 'up' | 'down'; movePct: number; right: boolean }

/** Daily missions and the up-or-down game. */
export interface Play {
  /** The day `done` belongs to (YYYY-MM-DD on this device). */
  day: string;
  /** Ids of today's missions that are finished. */
  done: string[];
  streak: number;
  /** The last day every mission was done. */
  lastFull: string;
  /** How many days every mission was done, ever. */
  fullDays: number;
  /** The learning streak: the last day something was learned, and how many days in a row that makes. */
  learnDay?: string;
  learnStreak?: number;
  guess: Guess | null;
  lastResult: GuessResult | null;
  right: number;
  guesses: number;
}

export interface HistoryPoint { d: string; c: number }
/** One 15-minute step of a trading day: when it started (ms) and the last price in it. */
export interface IntraPoint { t: number; c: number }

export interface Standing {
  id: string;
  name: string;
  avatar?: string;
  value: number;
  cash: number;
  gainPct: number;
  trades: number;
  companies: number;
  me?: boolean;
}

export interface StudentDetail extends Standing {
  holdings: Holding[];
  recent: Trade[];
  progress: Progress | null;
  /** When they last traded or opened the app in this class (ISO UTC), or '' if never since joining. */
  seen: string;
  /** How many times they bought, and how many of those went through "Check before you buy". */
  buys?: number;
  checked?: number;
}

/** A school on the schools table: how its students are doing on average. */
export interface SchoolStanding { name: string; classes: number; students: number; avgGainPct: number }

/** One line of a teacher's list of classes. */
export interface ClassSummary {
  code: string;
  name: string;
  startCash: number;
  students: number;
  /** Average portfolio change across the class, in percent. */
  avgGainPct: number;
}

/** Facts shown on a stock before buying. Any of them can be missing (funds have few). */
export interface Markers {
  /** Company value in millions of US dollars. */
  cap?: number;
  pe?: number;
  /** Yearly dividend as a percentage of the price. */
  div?: number;
  beta?: number;
  hi?: number;
  lo?: number;
  /** Price change over the past 52 weeks, in percent. */
  yr?: number;
  /** Sales compared with a year earlier, in percent. */
  growth?: number;
  at: number;
}
