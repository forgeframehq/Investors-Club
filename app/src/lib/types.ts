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
}

export interface Portfolio {
  /** Pretend dollars you started with. */
  start: number;
  cash: number;
  holdings: Holding[];
  trades: Trade[]; // newest first
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
  /** Optional keys for getting prices straight from the data providers when there is no class server. */
  finnhubKey: string;
  twelveKey: string;
  /** Address of the class server. Empty means "use the built-in one, if any". */
  server: string;
}

/** Set once this device has joined a class as a student. */
export interface ClassLink {
  server: string;
  code: string;
  className: string;
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
}

export interface Learned {
  terms: string[];
  /** Lesson id -> best quiz score. */
  lessons: Record<string, number>;
  /** Flashcards: term id -> how well it is known, 0 (new) to 3 (known). */
  cards: Record<string, number>;
  /** Flashcard rounds finished. */
  rounds: number;
}

/** What a student has learned, in numbers. Sent to the class server so the teacher can see it. */
export interface Progress {
  lessons: number;
  words: number;
  cards: number;
  badges: number;
  level: number;
}

export interface HistoryPoint { d: string; c: number }

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
}

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
