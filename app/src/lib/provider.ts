// Talks to the market data providers. Shared by the app (when it fetches prices itself) and the class server.
// Keep this file free of React Native imports: the server bundles it too.
//   Finnhub      - current price, the markers and company logos. Free key: 60 requests a minute.
//   Twelve Data  - daily price history for the graphs. Free key: 8 requests a minute, 800 a day.
// Both free plans are for personal use. Selling this to schools needs a paid data licence (see the README).
import type { HistoryPoint, Markers, Quote } from './types';

/** Fetches a URL and returns its JSON, or throws an Error with a sentence a user can read. */
export type GetJson = (url: string) => Promise<any>;

const FINNHUB = 'https://finnhub.io/api/v1';
const TWELVE = 'https://api.twelvedata.com';
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

export async function finnhubQuote(get: GetJson, key: string, symbol: string): Promise<Quote | null> {
  const j = await get(`${FINNHUB}/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`);
  const price = num(j?.c);
  if (!price) return null; // Finnhub answers 0 for a symbol it does not know
  const q: Quote = { price, prev: num(j.pc) || price, at: Date.now() };
  if (num(j.h)) q.hi = j.h;
  if (num(j.l)) q.lo = j.l;
  if (num(j.o)) q.open = j.o;
  return q;
}

export async function finnhubMarkers(get: GetJson, key: string, symbol: string): Promise<Markers> {
  const j = await get(`${FINNHUB}/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${encodeURIComponent(key)}`);
  const m = (j?.metric ?? {}) as Record<string, unknown>;
  const first = (...names: string[]) => names.map((n) => num(m[n])).find((v) => v !== undefined);
  const out: Markers = { at: Date.now() };
  const set = <K extends keyof Markers>(k: K, v: number | undefined) => { if (v !== undefined) out[k] = v; };
  set('cap', first('marketCapitalization'));
  set('pe', first('peTTM', 'peBasicExclExtraTTM', 'peExclExtraTTM', 'peNormalizedAnnual', 'peAnnual'));
  set('div', first('dividendYieldIndicatedAnnual', 'currentDividendYieldTTM'));
  set('beta', first('beta'));
  set('hi', first('52WeekHigh'));
  set('lo', first('52WeekLow'));
  set('yr', first('52WeekPriceReturnDaily'));
  set('growth', first('revenueGrowthTTMYoy', 'revenueGrowthQuarterlyYoy'));
  return out;
}

/** The address of the company's logo picture, or '' if Finnhub has none (funds usually do not). */
export async function finnhubLogo(get: GetJson, key: string, symbol: string): Promise<string> {
  const j = await get(`${FINNHUB}/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`);
  const url = typeof j?.logo === 'string' ? j.logo.trim() : '';
  return /^https:\/\//.test(url) ? url : '';
}

/** About a year of daily closing prices, oldest first. */
export async function twelveHistory(get: GetJson, key: string, symbol: string): Promise<HistoryPoint[]> {
  const j = await get(`${TWELVE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=1day&outputsize=260&apikey=${encodeURIComponent(key)}`);
  if (j?.status === 'error') throw new Error(j.code === 429 ? 'The graph service is busy. Try again in a minute.' : String(j.message || 'No graph data for this stock.'));
  const values = Array.isArray(j?.values) ? j.values : [];
  const points: HistoryPoint[] = [];
  for (const v of values) {
    const c = Number(v?.close);
    const d = String(v?.datetime ?? '').slice(0, 10);
    if (d && Number.isFinite(c) && c > 0) points.push({ d, c });
  }
  return points.reverse();
}

/**
 * The most recent 15-minute steps (about one trading day), oldest first. `t` is when each step started.
 * Costs one of the free plan's 800 requests a day, so the server only asks when it has no steps of its own.
 */
export async function twelveIntraday(get: GetJson, key: string, symbol: string): Promise<{ t: number; c: number }[]> {
  const j = await get(`${TWELVE}/time_series?symbol=${encodeURIComponent(symbol)}&interval=15min&outputsize=30&timezone=UTC&apikey=${encodeURIComponent(key)}`);
  if (j?.status === 'error') throw new Error(String(j.message || 'No graph data for this stock.'));
  const out: { t: number; c: number }[] = [];
  for (const v of Array.isArray(j?.values) ? j.values : []) {
    const c = Number(v?.close);
    const t = Date.parse(`${String(v?.datetime ?? '').replace(' ', 'T')}Z`);
    if (Number.isFinite(t) && Number.isFinite(c) && c > 0) out.push({ t, c });
  }
  return out.reverse();
}

// Days the US stock markets (NYSE and Nasdaq) are shut, in New York dates. Update this list each year.
const HOLIDAYS = new Set([
  '2026-11-26', '2026-12-25',
  '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31', '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
]);
/** Days the markets shut early, at 1 pm New York time (2 pm in Bermuda). */
const EARLY = new Set(['2026-11-27', '2026-12-24', '2027-11-26']);
/** The date in New York as YYYY-MM-DD. */
export function newYorkDay(now: Date): string {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
}

/**
 * True during US trading hours: 9:30 am to 4 pm New York time, Monday to Friday, except market holidays.
 * In Bermuda that is 10:30 am to 5 pm all year, because Bermuda changes its clocks on the same days.
 */
export function marketOpen(now = new Date()): boolean {
  if (HOLIDAYS.has(newYorkDay(now))) return false;
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(now);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
    const day = get('weekday');
    const minutes = (Number(get('hour')) % 24) * 60 + Number(get('minute'));
    return day !== 'Sat' && day !== 'Sun' && minutes >= 570 && minutes < (EARLY.has(newYorkDay(now)) ? 780 : 960);
  } catch {
    const day = now.getUTCDay();
    const minutes = now.getUTCHours() * 60 + now.getUTCMinutes();
    return day >= 1 && day <= 5 && minutes >= 870 && minutes < 1260; // winter hours; an hour out in summer
  }
}

/**
 * A sentence saying when the market next opens, in Bermuda time. Checked in ten-minute steps for up to a week.
 * `open` is whether trading is open now; it differs from the clock only in tests.
 */
export function nextOpenText(now = new Date(), open = marketOpen(now)): string {
  if (!open && marketOpen(now)) return 'The market is closed.';
  if (open) return `The market is open until ${EARLY.has(newYorkDay(now)) ? '2 pm' : '5 pm'} Bermuda time.`;
  for (let t = now.getTime(), end = t + 8 * 86400000; t < end; t += 600000) {
    const at = new Date(t);
    if (!marketOpen(at)) continue;
    const days = Math.round((Date.parse(newYorkDay(at)) - Date.parse(newYorkDay(now))) / 86400000);
    const day = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `on ${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(`${newYorkDay(at)}T12:00:00Z`).getUTCDay()]}`;
    return `The market is closed. It opens ${day} at 10:30 am Bermuda time.`;
  }
  return 'The market is closed.';
}

/** Minutes since midnight in New York, and the New York date. */
function newYorkNow(now: Date): { minutes: number; day: string } {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { minutes: (get('hour') % 24) * 60 + get('minute'), day: newYorkDay(now) };
}
/** "3h 12m", "1d 21h" or "8m": a length of time in the two biggest units that matter. */
function span(ms: number): string {
  const m = Math.max(1, Math.round(ms / 60000));
  if (m >= 1440) return `${Math.floor(m / 1440)}d ${Math.floor((m % 1440) / 60)}h`;
  if (m >= 60) return `${Math.floor(m / 60)}h ${m % 60}m`;
  return `${m}m`;
}
let nextOpen = { from: 0, at: 0 };
/** When the market next opens (ms), found in ten-minute steps for up to eight days and remembered until then. */
function nextOpenAt(now: Date): number {
  const t0 = now.getTime();
  if (t0 >= nextOpen.from && t0 < nextOpen.at) return nextOpen.at;
  for (let t = Math.ceil(t0 / 600000) * 600000, end = t0 + 8 * 86400000; t < end; t += 600000) {
    if (marketOpen(new Date(t))) { nextOpen = { from: t0, at: t }; return t; }
  }
  return 0;
}

export interface MarketClock {
  open: boolean;
  /** The main line, like "Market open" or "Market closed". */
  title: string;
  /** What comes next, like "closes in 3h 12m (5:00 pm)" or "opens Monday 10:30 am, in 1d 21h". Bermuda time. */
  detail: string;
  /** True in the last 15 minutes of the day: an order placed after the close waits for the next open. */
  soon: boolean;
}
/**
 * The market clock: open or closed, and how long until that changes. `open` is whether trading is open now; it
 * differs from the real clock only in tests, and then there is no countdown.
 */
export function marketClock(now = new Date(), open = marketOpen(now)): MarketClock {
  const real = marketOpen(now);
  if (open !== real) return { open, title: open ? 'Market open' : 'Market closed', detail: '', soon: false };
  try {
    if (open) {
      const { minutes, day } = newYorkNow(now);
      const early = EARLY.has(day);
      const left = (early ? 780 : 960) - minutes;
      return { open, title: left <= 15 ? 'Market closing soon' : 'Market open', detail: `closes in ${span(left * 60000)} (${early ? '2:00 pm' : '5:00 pm'})`, soon: left <= 15 };
    }
    const at = nextOpenAt(now);
    if (!at) return { open, title: 'Market closed', detail: '', soon: false };
    const days = Math.round((Date.parse(newYorkDay(new Date(at))) - Date.parse(newYorkDay(now))) / 86400000);
    const day = days === 0 ? 'today' : days === 1 ? 'tomorrow' : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date(`${newYorkDay(new Date(at))}T12:00:00Z`).getUTCDay()];
    return { open, title: 'Market closed', detail: `opens ${day} 10:30 am, in ${span(at - now.getTime())}`, soon: false };
  } catch {
    return { open, title: open ? 'Market open' : 'Market closed', detail: '', soon: false };
  }
}
