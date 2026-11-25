// Investors Club class server. Three jobs:
//   1. Prices. Holds the market data keys, answers for every student from one shared copy, and refreshes it on a timer.
//   2. Classes. Teacher accounts (a sign-in name and a password), join codes, student sign-in by name + PIN (no
//      email), portfolios, trades filled at the server's price, and what each student has learned.
//   3. The website. The same deploy serves the web version of the app (see wrangler.jsonc).
// The database tables create themselves on first use, so deploying needs no database commands.
import { SCHOOLS } from '../../app/src/data/schools';
import { STOCKS } from '../../app/src/data/stocks';
import { finnhubLogo, finnhubMarkers, finnhubQuote, marketOpen, newYorkDay, nextOpenText, twelveHistory, twelveIntraday, type GetJson } from '../../app/src/lib/provider';
import { applyTrade, checkOrder, fillOrders, roundShares } from '../../app/src/lib/rules';
import type { HistoryPoint, Holding, IntraPoint, Markers, Order, OrderNote, Progress, Quote, Trade } from '../../app/src/lib/types';

interface Env {
  DB: D1Database;
  FINNHUB_KEY?: string;
  TWELVE_KEY?: string;
  SCHOOL_KEY?: string;
  /** Tests only: made-up prices so the end-to-end test needs no keys or network. */
  MOCK_MARKET?: string;
}

const SYMBOLS = STOCKS.map((s) => s.symbol);
const ALLOWED = new Set(SYMBOLS);
const MAX_CLASS = 60;
const MAX_CLASSES = 30; // per teacher
const DAY = 24 * 3600_000;
const STEP = 15 * 60_000; // one step of the "today" graph

class Problem extends Error {
  constructor(public status: number, message: string) { super(message); }
}
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...CORS } });

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS teachers (id TEXT PRIMARY KEY, login_key TEXT NOT NULL UNIQUE, login TEXT NOT NULL, name TEXT NOT NULL, school TEXT NOT NULL DEFAULT '', salt TEXT NOT NULL, pass_hash TEXT NOT NULL, fails INTEGER NOT NULL DEFAULT 0, fail_at INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS teacher_sessions (token_hash TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS classes (code TEXT PRIMARY KEY, pub TEXT NOT NULL DEFAULT '', name TEXT NOT NULL, owner TEXT NOT NULL, school TEXT NOT NULL DEFAULT '', start_cash REAL NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS classes_school ON classes (school)`,
  `CREATE INDEX IF NOT EXISTS classes_owner ON classes (owner)`,
  `CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, class_code TEXT NOT NULL, name TEXT NOT NULL, name_key TEXT NOT NULL, pin_hash TEXT, fails INTEGER NOT NULL DEFAULT 0, cash REAL NOT NULL, stamp TEXT NOT NULL DEFAULT '', removed INTEGER NOT NULL DEFAULT 0, avatar TEXT NOT NULL DEFAULT '', progress TEXT NOT NULL DEFAULT '', seen TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS students_name ON students (class_code, name_key)`,
  `CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, student_id TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS holdings (student_id TEXT NOT NULL, symbol TEXT NOT NULL, shares REAL NOT NULL, cost REAL NOT NULL, PRIMARY KEY (student_id, symbol))`,
  `CREATE TABLE IF NOT EXISTS trades (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, symbol TEXT NOT NULL, side TEXT NOT NULL, shares REAL NOT NULL, price REAL NOT NULL, at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS trades_student ON trades (student_id, at)`,
  `CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, student_id TEXT NOT NULL, symbol TEXT NOT NULL, side TEXT NOT NULL, shares REAL, dollars REAL, status TEXT NOT NULL DEFAULT 'waiting', note TEXT NOT NULL DEFAULT '', at TEXT NOT NULL, done_at TEXT NOT NULL DEFAULT '')`,
  `CREATE INDEX IF NOT EXISTS orders_student ON orders (student_id, status)`,
  `CREATE TABLE IF NOT EXISTS quotes (symbol TEXT PRIMARY KEY, price REAL NOT NULL, prev REAL NOT NULL, at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS cache (k TEXT PRIMARY KEY, v TEXT NOT NULL, at INTEGER NOT NULL)`,
  // Today's prices in 15-minute steps: `t` is when the step started, `price` the last price seen in it.
  `CREATE TABLE IF NOT EXISTS intraday (symbol TEXT NOT NULL, t INTEGER NOT NULL, price REAL NOT NULL, PRIMARY KEY (symbol, t))`,
];
// Columns added after the server first went live. Each is added once; the cache row remembers how far we got,
// so a warm server pays one small read and a database that already has them is left alone.
const MIGRATIONS = [
  ['ALTER TABLE quotes ADD COLUMN hi REAL', 'ALTER TABLE quotes ADD COLUMN lo REAL', 'ALTER TABLE quotes ADD COLUMN open REAL'],
  // Class rules a teacher can set: stop all trading for now, or allow it only while the market is open.
  ['ALTER TABLE classes ADD COLUMN paused INTEGER NOT NULL DEFAULT 0', 'ALTER TABLE classes ADD COLUMN hours_only INTEGER NOT NULL DEFAULT 0'],
  // The reason a student picked in "Check before you buy". Empty when the check was skipped, and for sells.
  [`ALTER TABLE trades ADD COLUMN why TEXT NOT NULL DEFAULT ''`, `ALTER TABLE orders ADD COLUMN why TEXT NOT NULL DEFAULT ''`],
  // The student's full name. Only their teacher is ever sent it: classmates and leaderboards get `name` (first
  // name and last initial). Empty for students who joined before it was asked for.
  [`ALTER TABLE students ADD COLUMN full_name TEXT NOT NULL DEFAULT ''`],
];
async function prepare(env: Env) {
  await env.DB.batch(SCHEMA.map((sql) => env.DB.prepare(sql)));
  const row = await env.DB.prepare(`SELECT at FROM cache WHERE k = 'schema'`).first<{ at: number }>();
  for (let i = row?.at ?? 0; i < MIGRATIONS.length; i++) {
    for (const sql of MIGRATIONS[i]) await env.DB.prepare(sql).run().catch((e) => { if (!/duplicate column/i.test(String(e))) throw e; });
    await env.DB.prepare(`INSERT INTO cache (k, v, at) VALUES ('schema', '', ?) ON CONFLICT(k) DO UPDATE SET at = excluded.at`).bind(i + 1).run();
  }
}
let ready: Promise<unknown> | null = null;
const ensure = (env: Env) => (ready ??= prepare(env).catch((e) => { ready = null; throw e; }));

// ---------- small helpers ----------

const now = () => new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
function random(length: number, alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789') {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}
/** Join codes avoid letters and digits that look alike (O/0, I/1). */
const joinCode = () => random(6, 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789');
async function sha(text: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
/** Slow on purpose, so a stolen copy of the database does not give away passwords quickly. */
async function passHash(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 100_000 }, key, 256);
  return Array.from(new Uint8Array(bits), (b) => b.toString(16).padStart(2, '0')).join('');
}
const getJson: GetJson = async (url) => {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Problem(res.status === 429 ? 429 : 502, res.status === 429 ? 'The price service is busy. Try again in a minute.' : 'The price service did not answer.');
  return res.json();
};

// ---------- made-up market for tests ----------

function seed(text: string) {
  let h = 2166136261;
  for (const c of text) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) / 4294967296;
}
const mockBase = (symbol: string) => Math.round((20 + seed(symbol) * 380) * 100) / 100;
const mockQuote = (symbol: string): Quote => {
  const base = mockBase(symbol);
  const price = Math.round(base * (1 + (seed(symbol + 'x') - 0.4) * 0.05) * 100) / 100;
  return { price, prev: base, at: Date.now(), hi: Math.round(Math.max(price, base) * 101) / 100, lo: Math.round(Math.min(price, base) * 99) / 100, open: base };
};
function mockHistory(symbol: string): HistoryPoint[] {
  const end = mockQuote(symbol).price;
  const points: HistoryPoint[] = [];
  let price = end * (0.7 + seed(symbol + 'h') * 0.4);
  for (let i = 259; i >= 0; i--) {
    price = i === 0 ? end : price + ((end - price) / (i + 1)) + (seed(symbol + i) - 0.5) * end * 0.03;
    points.push({ d: new Date(Date.now() - i * DAY).toISOString().slice(0, 10), c: Math.round(price * 100) / 100 });
  }
  return points;
}
function mockIntraday(symbol: string): IntraPoint[] {
  const q = mockQuote(symbol);
  const start = Math.floor(Date.now() / STEP) * STEP - 25 * STEP;
  return Array.from({ length: 26 }, (_, i) => ({ t: start + i * STEP, c: i === 25 ? q.price : Math.round((q.prev + ((q.price - q.prev) * i) / 25 + (seed(symbol + 'i' + i) - 0.5) * q.prev * 0.01) * 100) / 100 }));
}
const mockMarkers = (symbol: string): Markers => {
  const q = mockQuote(symbol);
  return { cap: Math.round(2000 + seed(symbol + 'c') * 900000), pe: Math.round(8 + seed(symbol + 'p') * 40), div: Math.round(seed(symbol + 'd') * 30) / 10, beta: Math.round((0.5 + seed(symbol + 'b') * 1.3) * 100) / 100, hi: Math.round(q.price * 1.2 * 100) / 100, lo: Math.round(q.price * 0.7 * 100) / 100, yr: Math.round((seed(symbol + 'y') - 0.35) * 60), growth: Math.round((seed(symbol + 'g') - 0.3) * 30), at: Date.now() };
};

/** A plain coloured shape standing in for a company logo, so the test covers how pictures are shown. */
const mockLogo = (symbol: string) => {
  const hue = Math.round(seed(symbol + 'l') * 360);
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="hsl(${hue},70%,45%)"/></svg>`)}`;
};

/** Tests can shut the made-up market to try orders that wait for it to open. */
let mockOpen = true;
/** Whether students can trade right now. Real trading hours, except in tests. */
const isOpen = (env: Env) => (env.MOCK_MARKET ? mockOpen : marketOpen());

// ---------- prices ----------

/**
 * Current prices. Stale ones are refreshed from Finnhub, but only by one request at a time: the others get the
 * copy we already have. That keeps a class of 30 opening the app at once inside the free plan's limit.
 */
async function getQuotes(env: Env, symbols: string[], opts: { single?: boolean } = {}): Promise<Record<string, Quote>> {
  const want = symbols.filter((s) => ALLOWED.has(s));
  if (env.MOCK_MARKET) return Object.fromEntries(want.map((s) => [s, mockQuote(s)]));
  const rows = (await env.DB.prepare('SELECT symbol, price, prev, at, hi, lo, open FROM quotes').all<Quote & { symbol: string }>()).results;
  const have = new Map(rows.map((r) => [r.symbol, { price: r.price, prev: r.prev, at: r.at, ...(r.hi ? { hi: r.hi } : {}), ...(r.lo ? { lo: r.lo } : {}), ...(r.open ? { open: r.open } : {}) } as Quote]));
  const ttl = marketOpen() ? 60_000 : 15 * 60_000;
  const stale = want.filter((s) => Date.now() - (have.get(s)?.at ?? 0) > ttl);
  if (stale.length && env.FINNHUB_KEY) {
    let mayFetch = !!opts.single;
    if (!mayFetch) {
      const until = Date.now() + 20_000;
      await env.DB.prepare(`INSERT OR IGNORE INTO cache (k, v, at) VALUES ('quote-lock', '', 0)`).run();
      const claim = await env.DB.prepare(`UPDATE cache SET at = ? WHERE k = 'quote-lock' AND at < ?`).bind(until, Date.now()).run();
      mayFetch = claim.meta.changes === 1;
    }
    if (mayFetch) {
      const fresh = await Promise.allSettled(stale.map(async (s) => [s, await finnhubQuote(getJson, env.FINNHUB_KEY!, s)] as const));
      const got = fresh.flatMap((r) => (r.status === 'fulfilled' && r.value[1] ? [[r.value[0], r.value[1]] as const] : []));
      for (const [s, q] of got) have.set(s, q);
      for (let i = 0; i < got.length; i += 14) { // 7 values a row, and D1 binds at most 100 a statement
        const part = got.slice(i, i + 14);
        await env.DB.prepare(`INSERT INTO quotes (symbol, price, prev, at, hi, lo, open) VALUES ${part.map(() => '(?,?,?,?,?,?,?)').join(',')} ON CONFLICT(symbol) DO UPDATE SET price = excluded.price, prev = excluded.prev, at = excluded.at, hi = excluded.hi, lo = excluded.lo, open = excluded.open`)
          .bind(...part.flatMap(([s, q]) => [s, q.price, q.prev, q.at, q.hi ?? null, q.lo ?? null, q.open ?? null])).run();
      }
      await sample(env, got);
    }
  }
  return Object.fromEntries(want.flatMap((s) => (have.has(s) ? [[s, have.get(s)!]] : [])));
}

let sampledAt = 0;
/**
 * Notes the prices we just fetched as steps of today's graph. Free: it reuses prices we already have. Written
 * every few minutes at most, and only while the market is open, so each step ends on its last price.
 */
async function sample(env: Env, got: (readonly [string, Quote])[]) {
  if (got.length < 2 || !marketOpen() || Date.now() - sampledAt < 4 * 60_000) return; // one stock is a trade, not a refresh
  sampledAt = Date.now();
  const t = Math.floor(Date.now() / STEP) * STEP;
  for (let i = 0; i < got.length; i += 30) {
    const part = got.slice(i, i + 30);
    await env.DB.prepare(`INSERT INTO intraday (symbol, t, price) VALUES ${part.map(() => '(?,?,?)').join(',')} ON CONFLICT(symbol, t) DO UPDATE SET price = excluded.price`)
      .bind(...part.flatMap(([s, q]) => [s, t, q.price])).run();
  }
}
/** How many 15-minute steps a full trading day has, and how many of today's should exist by now. */
const FULL_DAY = 26;
/**
 * The latest trading day in 15-minute steps. Our own steps are used when we have them. When they are missing
 * (the server is new, or nobody had the app open), the gap is filled from the graph service, at most once an
 * hour per stock and within a daily allowance, because that service's free plan is small.
 */
async function getIntraday(env: Env, symbol: string): Promise<IntraPoint[]> {
  if (env.MOCK_MARKET) return mockIntraday(symbol);
  const read = async () => (await env.DB.prepare('SELECT t, price AS c FROM intraday WHERE symbol = ? AND t > ? ORDER BY t').bind(symbol, Date.now() - 5 * DAY).all<IntraPoint>()).results;
  const latest = (rows: IntraPoint[]) => {
    const day = rows.length ? newYorkDay(new Date(rows[rows.length - 1].t)) : '';
    return rows.filter((r) => newYorkDay(new Date(r.t)) === day);
  };
  let rows = await read();
  const open = marketOpen();
  const today = newYorkDay(new Date());
  const mine = latest(rows);
  // While the market is open we want today's steps so far; when it is closed, a whole day.
  const opened = Date.now() - (mine[0]?.t ?? Date.now());
  const thin = open ? (mine.length === 0 || newYorkDay(new Date(mine[0].t)) !== today || mine.length < opened / STEP - 3) : mine.length < FULL_DAY - 6;
  if (thin && env.TWELVE_KEY) {
    const tried = await env.DB.prepare('SELECT at FROM cache WHERE k = ?').bind(`ib:${symbol}`).first<{ at: number }>();
    const budget = `tw:${new Date().toISOString().slice(0, 10)}`;
    const used = (await env.DB.prepare('SELECT at FROM cache WHERE k = ?').bind(budget).first<{ at: number }>())?.at ?? 0;
    if (Date.now() - (tried?.at ?? 0) > 3600_000 && used < 500) {
      await env.DB.batch([
        env.DB.prepare(`INSERT INTO cache (k, v, at) VALUES (?, '', ?) ON CONFLICT(k) DO UPDATE SET at = excluded.at`).bind(`ib:${symbol}`, Date.now()),
        env.DB.prepare(`INSERT INTO cache (k, v, at) VALUES (?, '', 1) ON CONFLICT(k) DO UPDATE SET at = at + 1`).bind(budget),
      ]);
      const filled = await twelveIntraday(getJson, env.TWELVE_KEY, symbol).catch(() => []);
      // Steps we noted ourselves are kept: they match the prices students traded at.
      for (let i = 0; i < filled.length; i += 30) {
        const part = filled.slice(i, i + 30);
        await env.DB.prepare(`INSERT OR IGNORE INTO intraday (symbol, t, price) VALUES ${part.map(() => '(?,?,?)').join(',')}`).bind(...part.flatMap((p) => [symbol, p.t, p.c])).run();
      }
      if (filled.length) rows = await read();
    }
  }
  return latest(rows);
}

async function cached<T>(env: Env, key: string, ttl: number, make: () => Promise<T>): Promise<T> {
  const row = await env.DB.prepare('SELECT v, at FROM cache WHERE k = ?').bind(key).first<{ v: string; at: number }>();
  if (row && Date.now() - row.at < ttl) return JSON.parse(row.v) as T;
  try {
    const value = await make();
    await env.DB.prepare('INSERT INTO cache (k, v, at) VALUES (?, ?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v, at = excluded.at').bind(key, JSON.stringify(value), Date.now()).run();
    return value;
  } catch (e) {
    if (row) return JSON.parse(row.v) as T; // an old answer beats no answer
    throw e;
  }
}
/**
 * A student opening a stock gets the markers we have, up to three days old. The timer job refreshes them daily,
 * so opening stocks almost never costs a request to the price service.
 */
function getMarkers(env: Env, symbol: string, ttl = 3 * DAY): Promise<Markers> {
  if (env.MOCK_MARKET) return Promise.resolve(mockMarkers(symbol));
  if (!env.FINNHUB_KEY) throw new Problem(503, 'Prices are not set up on the class server yet.');
  return cached(env, `m:${symbol}`, ttl, () => finnhubMarkers(getJson, env.FINNHUB_KEY!, symbol));
}
function getHistory(env: Env, symbol: string): Promise<HistoryPoint[]> {
  if (env.MOCK_MARKET) return Promise.resolve(mockHistory(symbol));
  if (!env.TWELVE_KEY) throw new Problem(503, 'Graphs are not set up on the class server yet.');
  return cached(env, `h:${symbol}`, DAY / 2, async () => {
    const points = await twelveHistory(getJson, env.TWELVE_KEY!, symbol);
    if (!points.length) throw new Problem(502, 'No graph data for this stock yet.');
    return points;
  });
}

/** Company logo addresses we already know. They are collected a few at a time by the timer job. */
async function getLogos(env: Env): Promise<Record<string, string>> {
  if (env.MOCK_MARKET) return Object.fromEntries(SYMBOLS.map((s) => [s, mockLogo(s)]));
  const rows = (await env.DB.prepare(`SELECT k, v FROM cache WHERE k LIKE 'l:%'`).all<{ k: string; v: string }>()).results;
  return Object.fromEntries(rows.flatMap((r) => {
    const url = JSON.parse(r.v) as string;
    return url ? [[r.k.slice(2), url]] : [];
  }));
}

/** Timer job: refresh prices while the market is open, and top up a few of the oldest markers, graphs and logos. */
async function warm(env: Env) {
  await ensure(env);
  if (env.FINNHUB_KEY) await getQuotes(env, SYMBOLS);
  await settleAll(env);
  const rows = (await env.DB.prepare('SELECT k, at FROM cache').all<{ k: string; at: number }>()).results;
  const at = new Map(rows.map((r) => [r.k, r.at]));
  const oldest = (prefix: string, ttl: number, count: number) =>
    SYMBOLS.filter((s) => Date.now() - (at.get(prefix + s) ?? 0) > ttl).sort((a, b) => (at.get(prefix + a) ?? 0) - (at.get(prefix + b) ?? 0)).slice(0, count);
  // The free price key allows 60 requests a minute and a price refresh uses one per stock (50). So this job
  // adds at most 5 more: 3 markers and 2 logos each run, which still covers every stock within a few hours.
  if (env.FINNHUB_KEY) await Promise.allSettled(oldest('m:', DAY, 3).map((s) => getMarkers(env, s, DAY)));
  // An empty answer is kept too, so a stock with no logo (funds, mostly) is not asked for again every ten minutes.
  if (env.FINNHUB_KEY) await Promise.allSettled(oldest('l:', 30 * DAY, 2).map((s) => cached(env, `l:${s}`, 30 * DAY, () => finnhubLogo(getJson, env.FINNHUB_KEY!, s))));
  if (env.TWELVE_KEY) for (const s of oldest('h:', DAY / 2, 4)) await getHistory(env, s).catch(() => {});
  await env.DB.batch([
    env.DB.prepare('DELETE FROM intraday WHERE t < ?').bind(Date.now() - 6 * DAY),
    env.DB.prepare(`DELETE FROM cache WHERE (k LIKE 'tw:%' OR k LIKE 'ib:%') AND k != ? AND (k LIKE 'tw:%' OR at < ?)`).bind(`tw:${new Date().toISOString().slice(0, 10)}`, Date.now() - DAY),
  ]);
}

// ---------- classes ----------

interface TeacherRow { id: string; login: string; name: string; school: string; salt: string; pass_hash: string; fails: number; fail_at: number }
interface ClassRow { code: string; pub: string; name: string; owner: string; school: string; start_cash: number; paused: number; hours_only: number }
/** What the app needs to know about a class's trading rules. */
const rules = (cls: ClassRow) => ({ paused: !!cls.paused, hours_only: !!cls.hours_only });
interface StudentRow { id: string; class_code: string; name: string; cash: number; stamp: string; pin_hash: string | null; fails: number; removed: number; avatar: string }

const cleanName = (text: unknown, max: number) => String(text ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
const nameKey = (name: string) => name.toLowerCase();
const pinHash = (code: string, name: string, pin: string) => sha(`${code}:${nameKey(name)}:${pin}`);
/** Avatars are ids from the app's built-in list, never uploaded pictures. */
const cleanAvatar = (v: unknown) => (typeof v === 'string' && /^[a-z0-9-]{1,24}$/.test(v) ? v : '');
/** The reasons a student can pick in "Check before you buy". Anything else is dropped. */
const cleanWhy = (v: unknown) => (typeof v === 'string' && ['know', 'numbers', 'spread', 'guess'].includes(v) ? v : '');
/** Keeps only the counts the teacher view shows, each within a sensible range. */
function cleanProgress(v: unknown): Progress | null {
  if (!v || typeof v !== 'object') return null;
  const n = (k: keyof Progress) => Math.max(0, Math.min(999, Math.round(Number((v as Record<string, unknown>)[k]) || 0)));
  return { lessons: n('lessons'), words: n('words'), cards: n('cards'), badges: n('badges'), level: n('level'), streak: n('streak') };
}
const parseProgress = (text: string): Progress | null => { try { return text ? (JSON.parse(text) as Progress) : null; } catch { return null; } };

async function loadPortfolio(env: Env, student: StudentRow, startCash: number) {
  const [holdings, trades, orders, notes] = await env.DB.batch([
    env.DB.prepare('SELECT symbol, shares, cost FROM holdings WHERE student_id = ? ORDER BY symbol').bind(student.id),
    env.DB.prepare('SELECT id, symbol, side, shares, price, at, why FROM trades WHERE student_id = ? ORDER BY at DESC, rowid DESC LIMIT 100').bind(student.id),
    env.DB.prepare(`SELECT id, symbol, side, shares, dollars, at, why FROM orders WHERE student_id = ? AND status = 'waiting' ORDER BY at, rowid`).bind(student.id),
    env.DB.prepare(`SELECT id, symbol, side, note AS why, done_at AS at FROM orders WHERE student_id = ? AND status = 'dropped' ORDER BY done_at DESC LIMIT 5`).bind(student.id),
  ]);
  const waiting = (orders.results as unknown as (Order & { shares: number | null; dollars: number | null })[]).map((o) => ({ id: o.id, symbol: o.symbol, side: o.side, at: o.at, ...(o.shares ? { shares: o.shares } : {}), ...(o.dollars ? { dollars: o.dollars } : {}), ...(o.why ? { why: o.why } : {}) }) as Order);
  return { start: startCash, cash: student.cash, holdings: holdings.results as unknown as Holding[], trades: trades.results as unknown as Trade[], orders: waiting, notes: notes.results as unknown as OrderNote[] };
}
type ServerPortfolio = Awaited<ReturnType<typeof loadPortfolio>>;

/**
 * Writes a portfolio that changed through trades. The stamp makes the whole change apply once or not at all,
 * even if two requests arrive together. `extra` statements run only if the change applies.
 */
async function savePortfolio(env: Env, student: StudentRow, after: ServerPortfolio, newTrades: Trade[], extra: (guard: string, bind: [string, string]) => D1PreparedStatement[] = () => []) {
  const stamp = random(12);
  const guard = '(SELECT stamp FROM students WHERE id = ?) = ?';
  const bind: [string, string] = [student.id, stamp];
  const touched = [...new Set(newTrades.map((t) => t.symbol))];
  const results = await env.DB.batch([
    env.DB.prepare('UPDATE students SET cash = ?, stamp = ?, seen = ? WHERE id = ? AND stamp = ?').bind(after.cash, stamp, now(), student.id, student.stamp),
    ...touched.map((symbol) => {
      const holding = after.holdings.find((h) => h.symbol === symbol);
      return holding
        ? env.DB.prepare(`INSERT INTO holdings (student_id, symbol, shares, cost) SELECT ?,?,?,? WHERE ${guard} ON CONFLICT(student_id, symbol) DO UPDATE SET shares = excluded.shares, cost = excluded.cost`).bind(student.id, symbol, holding.shares, holding.cost, ...bind)
        : env.DB.prepare(`DELETE FROM holdings WHERE student_id = ? AND symbol = ? AND ${guard}`).bind(student.id, symbol, ...bind);
    }),
    ...newTrades.map((t) => env.DB.prepare(`INSERT INTO trades (id, student_id, symbol, side, shares, price, at, why) SELECT ?,?,?,?,?,?,?,? WHERE ${guard}`).bind(t.id, student.id, t.symbol, t.side, t.shares, t.price, t.at, t.why ?? '', ...bind)),
    ...extra(guard, bind),
  ]);
  if (results[0].meta.changes !== 1) throw new Problem(409, 'That did not go through. Try again.');
  student.stamp = stamp;
  student.cash = after.cash;
}

/**
 * Fills a student's waiting orders if the market is open and trading is not paused. Only prices fetched in the
 * last ten minutes count, so an order placed overnight is never filled at yesterday's price.
 */
async function settle(env: Env, student: StudentRow, cls: ClassRow): Promise<ServerPortfolio> {
  const before = await loadPortfolio(env, student, cls.start_cash);
  if (!before.orders.length || cls.paused || !isOpen(env)) return before;
  const quotes = await getQuotes(env, [...new Set(before.orders.map((o) => o.symbol))]);
  const { portfolio: after, filled } = fillOrders(before, (symbol) => (quotes[symbol] && Date.now() - quotes[symbol].at < 10 * 60_000 ? quotes[symbol].price : null));
  const dropped = after.notes.filter((n) => !before.notes.some((x) => x.id === n.id));
  const done = before.orders.filter((o) => !after.orders.some((x) => x.id === o.id) && !dropped.some((n) => n.id === o.id));
  if (!done.length && !dropped.length) return before;
  await savePortfolio(env, student, after, filled, (guard, bind) => [
    ...done.map((o) => env.DB.prepare(`UPDATE orders SET status = 'filled', done_at = ? WHERE id = ? AND ${guard}`).bind(now(), o.id, ...bind)),
    ...dropped.map((n) => env.DB.prepare(`UPDATE orders SET status = 'dropped', note = ?, done_at = ? WHERE id = ? AND ${guard}`).bind(n.why, n.at, n.id, ...bind)),
  ]);
  return { ...after, trades: after.trades.slice(0, 100) };
}
/** Timer job: fills waiting orders for everyone once the market is open. */
async function settleAll(env: Env) {
  if (!isOpen(env)) return;
  const rows = (await env.DB.prepare(`SELECT DISTINCT s.* FROM orders o JOIN students s ON s.id = o.student_id WHERE o.status = 'waiting' AND s.removed = 0 LIMIT 60`).all<StudentRow>()).results;
  const classes = new Map<string, ClassRow | null>();
  for (const student of rows) {
    if (!classes.has(student.class_code)) classes.set(student.class_code, await env.DB.prepare('SELECT * FROM classes WHERE code = ?').bind(student.class_code).first<ClassRow>());
    const cls = classes.get(student.class_code);
    if (cls) await settle(env, student, cls).catch((e) => console.error('settle', student.id, e));
  }
}

async function studentFromToken(env: Env, req: Request): Promise<{ student: StudentRow; cls: ClassRow }> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) throw new Problem(401, 'Join your class again to continue.');
  const student = await env.DB.prepare('SELECT s.* FROM sessions x JOIN students s ON s.id = x.student_id WHERE x.token_hash = ? AND s.removed = 0').bind(await sha(token)).first<StudentRow>();
  if (!student) throw new Problem(401, 'Join your class again to continue.');
  const cls = await env.DB.prepare('SELECT * FROM classes WHERE code = ?').bind(student.class_code).first<ClassRow>();
  if (!cls) throw new Problem(401, 'That class no longer exists.');
  return { student, cls };
}
async function teacherFromToken(env: Env, req: Request): Promise<TeacherRow> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  const teacher = token ? await env.DB.prepare('SELECT t.* FROM teacher_sessions x JOIN teachers t ON t.id = x.teacher_id WHERE x.token_hash = ?').bind(await sha(token)).first<TeacherRow>() : null;
  if (!teacher) throw new Problem(401, 'Sign in as a teacher to continue.');
  return teacher;
}
/** The class with this code, but only if it belongs to this teacher. */
async function classOf(env: Env, teacher: TeacherRow, code: unknown): Promise<ClassRow> {
  const cls = await env.DB.prepare('SELECT * FROM classes WHERE code = ? AND owner = ?').bind(String(code ?? '').trim().toUpperCase(), teacher.id).first<ClassRow>();
  if (!cls) throw new Problem(404, 'That class is not one of yours.');
  return cls;
}
async function teacherSession(env: Env, teacher: Pick<TeacherRow, 'id' | 'name' | 'login' | 'school'>) {
  const token = random(40);
  await env.DB.prepare('INSERT INTO teacher_sessions (token_hash, teacher_id, created_at) VALUES (?,?,?)').bind(await sha(token), teacher.id, now()).run();
  return json({ token, name: teacher.name, login: teacher.login, school: teacher.school });
}

/** Everyone in a class, richest first. `detail` adds holdings and recent trades for the teacher view. */
async function standings(env: Env, cls: ClassRow, meId: string | null, detail: boolean) {
  const [students, holdings, counts, recent] = await env.DB.batch([
    env.DB.prepare('SELECT id, name, full_name, cash, avatar, progress, seen FROM students WHERE class_code = ? AND removed = 0').bind(cls.code),
    env.DB.prepare('SELECT h.student_id, h.symbol, h.shares, h.cost FROM holdings h JOIN students s ON s.id = h.student_id WHERE s.class_code = ? AND s.removed = 0').bind(cls.code),
    env.DB.prepare(`SELECT t.student_id, COUNT(*) AS n, SUM(CASE WHEN t.side = 'buy' THEN 1 ELSE 0 END) AS buys, SUM(CASE WHEN t.side = 'buy' AND t.why != '' THEN 1 ELSE 0 END) AS checked FROM trades t JOIN students s ON s.id = t.student_id WHERE s.class_code = ? GROUP BY t.student_id`).bind(cls.code),
    env.DB.prepare('SELECT t.student_id, t.id, t.symbol, t.side, t.shares, t.price, t.at, t.why FROM trades t JOIN students s ON s.id = t.student_id WHERE s.class_code = ? ORDER BY t.at DESC, t.rowid DESC LIMIT ?').bind(cls.code, detail ? 400 : 0),
  ]);
  const held = holdings.results as unknown as (Holding & { student_id: string })[];
  const quotes = await getQuotes(env, [...new Set(held.map((h) => h.symbol))]);
  const count = new Map((counts.results as unknown as { student_id: string; n: number; buys: number; checked: number }[]).map((r) => [r.student_id, r]));
  const list = (students.results as unknown as { id: string; name: string; full_name: string; cash: number; avatar: string; progress: string; seen: string }[]).map((s) => {
    const mine = held.filter((h) => h.student_id === s.id);
    const value = s.cash + mine.reduce((sum, h) => sum + (quotes[h.symbol] ? h.shares * quotes[h.symbol].price : h.cost), 0);
    return {
      id: s.id, name: s.name, avatar: s.avatar, cash: s.cash, value: Math.round(value * 100) / 100,
      gainPct: Math.round(((value - cls.start_cash) / cls.start_cash) * 10000) / 100,
      trades: count.get(s.id)?.n ?? 0, companies: mine.length, me: s.id === meId || undefined,
      ...(detail ? {
        fullName: s.full_name, progress: parseProgress(s.progress), seen: s.seen, buys: count.get(s.id)?.buys ?? 0, checked: count.get(s.id)?.checked ?? 0,
        holdings: mine.map(({ symbol, shares, cost }) => ({ symbol, shares, cost })),
        recent: (recent.results as unknown as (Trade & { student_id: string })[]).filter((t) => t.student_id === s.id).slice(0, 10).map(({ student_id: _, ...t }) => t),
      } : {}),
    };
  });
  return list.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name));
}

// ---------- routes ----------

async function route(req: Request, env: Env): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, '').replace(/\/+$/, '') || '/';
  const post = req.method === 'POST';
  const body = post ? ((await req.json().catch(() => ({}))) as Record<string, unknown>) : {};
  const one = () => {
    const symbol = (url.searchParams.get('symbol') ?? '').toUpperCase();
    if (!ALLOWED.has(symbol)) throw new Problem(404, 'That stock is not in the Investors Club list.');
    return symbol;
  };

  if (path === '/health') return json({ ok: true, prices: !!(env.FINNHUB_KEY || env.MOCK_MARKET), graphs: !!(env.TWELVE_KEY || env.MOCK_MARKET), school_key: !!env.SCHOOL_KEY });
  await ensure(env);

  if (path === '/quotes') {
    const symbols = (url.searchParams.get('symbols') ?? '').toUpperCase().split(',').filter(Boolean);
    return json({ quotes: await getQuotes(env, symbols.length ? symbols : SYMBOLS, { single: symbols.length === 1 }), open: isOpen(env) });
  }
  if (path === '/mock/market' && post && env.MOCK_MARKET) {
    mockOpen = !!body.open;
    return json({ open: mockOpen });
  }
  if (path === '/markers') return json({ markers: await getMarkers(env, one()) });
  if (path === '/logos') return json({ logos: await getLogos(env) });
  if (path === '/history') return json({ points: await getHistory(env, one()) });
  if (path === '/intraday') return json({ points: await getIntraday(env, one()) });

  // Schools that have at least one class here, with how each school's students are doing on average. Only totals
  // are public: no student or class is named.
  if (path === '/schools') {
    const [classes, students, holdings] = await env.DB.batch([
      env.DB.prepare(`SELECT code, school, start_cash FROM classes WHERE school != ''`),
      env.DB.prepare('SELECT id, class_code, cash FROM students WHERE removed = 0'),
      env.DB.prepare('SELECT h.student_id, h.symbol, h.shares, h.cost FROM holdings h JOIN students s ON s.id = h.student_id WHERE s.removed = 0'),
    ]);
    const held = holdings.results as unknown as (Holding & { student_id: string })[];
    const quotes = await getQuotes(env, [...new Set(held.map((h) => h.symbol))]);
    const invested = new Map<string, number>();
    for (const h of held) invested.set(h.student_id, (invested.get(h.student_id) ?? 0) + (quotes[h.symbol] ? h.shares * quotes[h.symbol].price : h.cost));
    const bySchool = new Map<string, { classes: number; gains: number[] }>();
    const all = students.results as unknown as { id: string; class_code: string; cash: number }[];
    for (const c of classes.results as unknown as { code: string; school: string; start_cash: number }[]) {
      const entry = bySchool.get(c.school) ?? { classes: 0, gains: [] };
      entry.classes++;
      for (const st of all) if (st.class_code === c.code) entry.gains.push(((st.cash + (invested.get(st.id) ?? 0) - c.start_cash) / c.start_cash) * 100);
      bySchool.set(c.school, entry);
    }
    const schools = [...bySchool.entries()].map(([name, e]) => ({ name, classes: e.classes, students: e.gains.length, avgGainPct: e.gains.length ? Math.round((e.gains.reduce((a, b) => a + b, 0) / e.gains.length) * 100) / 100 : 0 }));
    return json({ schools: schools.sort((a, b) => b.avgGainPct - a.avgGainPct || a.name.localeCompare(b.name)) });
  }
  // The classes at one school, for a student choosing theirs. The join code is not included: it comes from the teacher.
  if (path === '/school-classes') {
    const rows = await env.DB.prepare('SELECT c.pub AS id, c.name, t.name AS teacher FROM classes c JOIN teachers t ON t.id = c.owner WHERE c.school = ? ORDER BY c.name').bind(url.searchParams.get('school') ?? '').all();
    return json({ classes: rows.results });
  }

  if (path === '/join' && post) {
    const code = String(body.code ?? '').trim().toUpperCase();
    const name = cleanName(body.name, 20);
    const pin = String(body.pin ?? '').trim();
    const avatar = cleanAvatar(body.avatar);
    const typed = cleanName(body.fullName, 40);
    const fullName = /^[\p{L} .'-]{3,}$/u.test(typed) ? typed : '';
    // A student who picked their class from the list sends its id too, and the code has to be that class's code.
    const picked = body.class ? await env.DB.prepare('SELECT * FROM classes WHERE pub = ?').bind(String(body.class)).first<ClassRow>() : null;
    if (picked && picked.code !== code) throw new Problem(403, `That is not the code for ${picked.name}. Check it with your teacher.`);
    const cls = picked ?? await env.DB.prepare('SELECT * FROM classes WHERE code = ?').bind(code).first<ClassRow>();
    if (!cls) throw new Problem(404, 'No class has that code. Check it with your teacher.');
    if (name.length < 2 || !/^[\p{L}\p{N} .'-]+$/u.test(name)) throw new Problem(400, 'Enter your first name and last initial, like "Sam T".');
    if (!/^\d{4,8}$/.test(pin)) throw new Problem(400, 'Your PIN must be 4 to 8 digits.');
    const hash = await pinHash(code, name, pin);
    let student = await env.DB.prepare('SELECT * FROM students WHERE class_code = ? AND name_key = ?').bind(code, nameKey(name)).first<StudentRow>();
    if (student) {
      if (student.removed) throw new Problem(403, 'This name was removed from the class. Ask your teacher.');
      if (student.fails >= 10) throw new Problem(403, 'Too many wrong PINs. Ask your teacher to reset your PIN.');
      if (student.pin_hash === null) await env.DB.prepare('UPDATE students SET pin_hash = ?, fails = 0 WHERE id = ?').bind(hash, student.id).run();
      else if (student.pin_hash !== hash) {
        await env.DB.prepare('UPDATE students SET fails = fails + 1 WHERE id = ?').bind(student.id).run();
        throw new Problem(403, 'That name is already in this class and the PIN does not match. If it is someone else, add your last initial.');
      } else if (student.fails) await env.DB.prepare('UPDATE students SET fails = 0 WHERE id = ?').bind(student.id).run();
      if (fullName) await env.DB.prepare('UPDATE students SET full_name = ? WHERE id = ?').bind(fullName, student.id).run();
    } else {
      const size = await env.DB.prepare('SELECT COUNT(*) AS n FROM students WHERE class_code = ? AND removed = 0').bind(code).first<{ n: number }>();
      if ((size?.n ?? 0) >= MAX_CLASS) throw new Problem(403, 'This class is full.');
      student = { id: random(16), class_code: code, name, cash: cls.start_cash, stamp: '', pin_hash: hash, fails: 0, removed: 0, avatar };
      await env.DB.prepare('INSERT INTO students (id, class_code, name, name_key, pin_hash, cash, avatar, created_at, full_name) VALUES (?,?,?,?,?,?,?,?,?)').bind(student.id, code, name, nameKey(name), hash, cls.start_cash, avatar, now(), fullName).run();
    }
    const token = random(32);
    await env.DB.prepare('INSERT INTO sessions (token_hash, student_id, created_at) VALUES (?,?,?)').bind(await sha(token), student.id, now()).run();
    return json({ token, name: student.name, class: { code: cls.code, name: cls.name, school: cls.school }, portfolio: await loadPortfolio(env, student, cls.start_cash) });
  }

  // GET reads the portfolio. POST does the same and also saves the student's picture and what they have learned.
  if (path === '/me') {
    const { student, cls } = await studentFromToken(env, req);
    if (post) {
      const progress = cleanProgress(body.progress);
      await env.DB.prepare('UPDATE students SET avatar = ?, progress = ?, seen = ? WHERE id = ?').bind(cleanAvatar(body.avatar) || student.avatar, progress ? JSON.stringify(progress) : '', now(), student.id).run();
    }
    return json({ name: student.name, class: { code: cls.code, name: cls.name }, portfolio: await settle(env, student, cls) });
  }

  if (path === '/trade' && post) {
    const { student, cls } = await studentFromToken(env, req);
    const symbol = String(body.symbol ?? '').toUpperCase();
    const side = body.side === 'sell' ? 'sell' : 'buy';
    const shares = roundShares(Number(body.shares));
    if (!ALLOWED.has(symbol)) throw new Problem(404, 'That stock is not in the Investors Club list.');
    if (cls.paused) throw new Problem(403, 'Your teacher has paused trading for this class. Your portfolio is safe. Try again later.');
    if (!isOpen(env)) throw new Problem(403, `${nextOpenText(new Date(), false)} Place an order and it will be filled when the market opens.`);
    const quote = (await getQuotes(env, [symbol], { single: true }))[symbol];
    if (!quote) throw new Problem(503, 'There is no price for this stock right now. Try again in a minute.');
    const before = await loadPortfolio(env, student, cls.start_cash);
    const after = applyTrade(before, symbol, side, shares, quote.price, cleanWhy(body.why));
    if (typeof after === 'string') throw new Problem(400, after);
    await savePortfolio(env, student, after, [after.trades[0]]);
    return json({ trade: after.trades[0], quote, portfolio: { ...after, trades: after.trades.slice(0, 100) } });
  }

  // An order placed while the market is closed. It waits and is filled at the first price after the market opens.
  if (path === '/order' && post) {
    const { student, cls } = await studentFromToken(env, req);
    const symbol = String(body.symbol ?? '').toUpperCase();
    const side = body.side === 'sell' ? 'sell' : 'buy';
    if (!ALLOWED.has(symbol)) throw new Problem(404, 'That stock is not in the Investors Club list.');
    if (cls.paused) throw new Problem(403, 'Your teacher has paused trading for this class. Your portfolio is safe. Try again later.');
    if (isOpen(env)) throw new Problem(409, 'The market is open now, so you can trade straight away.');
    const dollars = side === 'buy' && body.dollars !== undefined ? Math.round(Number(body.dollars) * 100) / 100 : undefined;
    const shares = dollars === undefined ? roundShares(Number(body.shares)) : undefined;
    const last = (await getQuotes(env, [symbol]))[symbol]?.price ?? 0;
    const before = await loadPortfolio(env, student, cls.start_cash);
    const problem = checkOrder(before, { symbol, side, shares, dollars }, last);
    if (problem) throw new Problem(400, problem);
    await env.DB.prepare('INSERT INTO orders (id, student_id, symbol, side, shares, dollars, at, why) VALUES (?,?,?,?,?,?,?,?)').bind(random(16), student.id, symbol, side, shares ?? null, dollars ?? null, now(), side === 'buy' ? cleanWhy(body.why) : '').run();
    return json({ portfolio: await loadPortfolio(env, student, cls.start_cash) });
  }
  if (path === '/order/cancel' && post) {
    const { student, cls } = await studentFromToken(env, req);
    await env.DB.prepare(`DELETE FROM orders WHERE id = ? AND student_id = ? AND status = 'waiting'`).bind(String(body.id ?? ''), student.id).run();
    return json({ portfolio: await loadPortfolio(env, student, cls.start_cash) });
  }

  if (path === '/leaderboard') {
    const { student, cls } = await studentFromToken(env, req);
    return json({ class: { code: cls.code, name: cls.name, ...rules(cls) }, standings: await standings(env, cls, student.id, false) });
  }

  // ---- teachers ----

  if (path === '/teacher/signup' && post) {
    if (env.SCHOOL_KEY && String(body.school_key ?? '').trim() !== env.SCHOOL_KEY) throw new Problem(403, 'That school key is not right. Ask whoever set up Investors Club for your school.');
    const name = cleanName(body.name, 30);
    const login = cleanName(body.login, 30);
    const password = String(body.password ?? '');
    // A school from the built-in list, or one the teacher typed because theirs was missing.
    const school = cleanName(body.school, 60);
    if (school.length < 3) throw new Problem(400, 'Choose your school.');
    if (name.length < 2) throw new Problem(400, 'Enter your name, like "Ms Smith".');
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(login)) throw new Problem(400, 'Choose a sign-in name of 3 to 30 letters or numbers, with no spaces.');
    if (password.length < 8 || password.length > 100) throw new Problem(400, 'Choose a password of at least 8 characters.');
    const taken = await env.DB.prepare('SELECT 1 FROM teachers WHERE login_key = ?').bind(login.toLowerCase()).first();
    if (taken) throw new Problem(409, 'That sign-in name is taken. Choose another, or sign in if it is yours.');
    const teacher = { id: random(16), login, name, school: SCHOOLS.find((x) => x.name.toLowerCase() === school.toLowerCase())?.name ?? school };
    const salt = random(16);
    await env.DB.prepare('INSERT INTO teachers (id, login_key, login, name, school, salt, pass_hash, created_at) VALUES (?,?,?,?,?,?,?,?)').bind(teacher.id, login.toLowerCase(), login, name, teacher.school, salt, await passHash(password, salt), now()).run();
    return teacherSession(env, teacher);
  }

  if (path === '/teacher/login' && post) {
    const wrong = new Problem(403, 'That sign-in name and password do not match.');
    const teacher = await env.DB.prepare('SELECT * FROM teachers WHERE login_key = ?').bind(String(body.login ?? '').trim().toLowerCase()).first<TeacherRow>();
    if (!teacher) throw wrong;
    // Ten wrong passwords lock the account for 15 minutes, which makes guessing impractical.
    if (teacher.fails >= 10 && Date.now() - teacher.fail_at < 15 * 60_000) throw new Problem(403, 'Too many wrong passwords. Wait 15 minutes and try again.');
    if ((await passHash(String(body.password ?? ''), teacher.salt)) !== teacher.pass_hash) {
      await env.DB.prepare('UPDATE teachers SET fails = CASE WHEN fails >= 10 THEN 1 ELSE fails + 1 END, fail_at = ? WHERE id = ?').bind(Date.now(), teacher.id).run();
      throw wrong;
    }
    if (teacher.fails) await env.DB.prepare('UPDATE teachers SET fails = 0 WHERE id = ?').bind(teacher.id).run();
    return teacherSession(env, teacher);
  }

  if (path.startsWith('/teacher/')) {
    const teacher = await teacherFromToken(env, req);

    if (path === '/teacher/logout' && post) {
      await env.DB.prepare('DELETE FROM teacher_sessions WHERE token_hash = ?').bind(await sha((req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, ''))).run();
      return json({ ok: true });
    }

    // Every class this teacher runs, with how many students it has and how the class is doing on average.
    if (path === '/teacher/classes' && !post) {
      const [classes, students, holdings] = await env.DB.batch([
        env.DB.prepare('SELECT code, name, start_cash FROM classes WHERE owner = ? ORDER BY created_at').bind(teacher.id),
        env.DB.prepare('SELECT s.id, s.class_code, s.cash FROM students s JOIN classes c ON c.code = s.class_code WHERE c.owner = ? AND s.removed = 0').bind(teacher.id),
        env.DB.prepare('SELECT h.student_id, h.symbol, h.shares, h.cost FROM holdings h JOIN students s ON s.id = h.student_id JOIN classes c ON c.code = s.class_code WHERE c.owner = ? AND s.removed = 0').bind(teacher.id),
      ]);
      const held = holdings.results as unknown as (Holding & { student_id: string })[];
      const quotes = await getQuotes(env, [...new Set(held.map((h) => h.symbol))]);
      const invested = new Map<string, number>();
      for (const h of held) invested.set(h.student_id, (invested.get(h.student_id) ?? 0) + (quotes[h.symbol] ? h.shares * quotes[h.symbol].price : h.cost));
      const all = students.results as unknown as { id: string; class_code: string; cash: number }[];
      return json({
        name: teacher.name, school: teacher.school,
        classes: (classes.results as unknown as { code: string; name: string; start_cash: number }[]).map((c) => {
          const mine = all.filter((x) => x.class_code === c.code);
          const gains = mine.map((x) => ((x.cash + (invested.get(x.id) ?? 0) - c.start_cash) / c.start_cash) * 100);
          return { code: c.code, name: c.name, startCash: c.start_cash, students: mine.length, avgGainPct: gains.length ? Math.round((gains.reduce((a, b) => a + b, 0) / gains.length) * 100) / 100 : 0 };
        }),
      });
    }

    if (path === '/teacher/classes' && post) {
      const name = cleanName(body.name, 40);
      const startCash = Math.round(Number(body.start_cash) || 10000);
      if (name.length < 2) throw new Problem(400, 'Give the class a name.');
      if (startCash < 100 || startCash > 1_000_000) throw new Problem(400, 'Starting cash must be between $100 and $1,000,000.');
      const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM classes WHERE owner = ?').bind(teacher.id).first<{ n: number }>();
      if ((count?.n ?? 0) >= MAX_CLASSES) throw new Problem(403, `You can run up to ${MAX_CLASSES} classes.`);
      const code = joinCode();
      await env.DB.prepare('INSERT INTO classes (code, pub, name, owner, school, start_cash, created_at) VALUES (?,?,?,?,?,?,?)').bind(code, random(10), name, teacher.id, teacher.school, startCash, now()).run();
      return json({ code, name });
    }

    if (path === '/teacher/class' && !post) {
      const cls = await classOf(env, teacher, url.searchParams.get('code'));
      return json({ class: { code: cls.code, name: cls.name, start_cash: cls.start_cash, ...rules(cls) }, standings: await standings(env, cls, null, true) });
    }
    if (!post) throw new Problem(404, 'Not found.');
    const cls = await classOf(env, teacher, body.code);
    const inClass = 'student_id IN (SELECT id FROM students WHERE class_code = ?)';

    if (path === '/teacher/update-class') {
      const name = body.name === undefined ? cls.name : cleanName(body.name, 40);
      if (name.length < 2) throw new Problem(400, 'Give the class a name.');
      const flag = (v: unknown, was: number) => (v === undefined ? was : v ? 1 : 0);
      await env.DB.prepare('UPDATE classes SET name = ?, paused = ?, hours_only = ? WHERE code = ?').bind(name, flag(body.paused, cls.paused), flag(body.hours_only, cls.hours_only), cls.code).run();
      return json({ ok: true });
    }
    if (path === '/teacher/restart') {
      await env.DB.batch([
        env.DB.prepare(`DELETE FROM holdings WHERE ${inClass}`).bind(cls.code),
        env.DB.prepare(`DELETE FROM trades WHERE ${inClass}`).bind(cls.code),
        env.DB.prepare(`DELETE FROM orders WHERE ${inClass}`).bind(cls.code),
        env.DB.prepare(`UPDATE students SET cash = ?, stamp = '' WHERE class_code = ?`).bind(cls.start_cash, cls.code),
      ]);
      return json({ ok: true });
    }
    if (path === '/teacher/delete-class') {
      await env.DB.batch([
        env.DB.prepare(`DELETE FROM holdings WHERE ${inClass}`).bind(cls.code),
        env.DB.prepare(`DELETE FROM trades WHERE ${inClass}`).bind(cls.code),
        env.DB.prepare(`DELETE FROM sessions WHERE ${inClass}`).bind(cls.code),
        env.DB.prepare(`DELETE FROM orders WHERE ${inClass}`).bind(cls.code),
        env.DB.prepare('DELETE FROM students WHERE class_code = ?').bind(cls.code),
        env.DB.prepare('DELETE FROM classes WHERE code = ?').bind(cls.code),
      ]);
      return json({ ok: true });
    }
    const id = String(body.student_id ?? '');
    const student = await env.DB.prepare('SELECT id FROM students WHERE id = ? AND class_code = ?').bind(id, cls.code).first();
    if (!student) throw new Problem(404, 'That student is not in this class.');
    if (path === '/teacher/remove') {
      await env.DB.batch([env.DB.prepare('UPDATE students SET removed = 1 WHERE id = ?').bind(id), env.DB.prepare('DELETE FROM sessions WHERE student_id = ?').bind(id)]);
      return json({ ok: true });
    }
    if (path === '/teacher/reset-pin') {
      await env.DB.batch([env.DB.prepare('UPDATE students SET pin_hash = NULL, fails = 0 WHERE id = ?').bind(id), env.DB.prepare('DELETE FROM sessions WHERE student_id = ?').bind(id)]);
      return json({ ok: true });
    }
  }
  throw new Problem(404, 'Not found.');
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
    try {
      return await route(req, env);
    } catch (e) {
      if (e instanceof Problem) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: 'Something went wrong on the class server.' }, 500);
    }
  },
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(warm(env));
  },
} satisfies ExportedHandler<Env>;
