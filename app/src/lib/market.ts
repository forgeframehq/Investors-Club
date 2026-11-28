// Where prices come from: the Investors Club server. It holds the market data keys, shares one copy of every
// price between all students, and keeps answers for a while. With no connection the app still opens and shows
// the last prices it saw.
import { Platform } from 'react-native';

import { STOCKS } from '@/data/stocks';

import { marketClock as clockAt, marketOpen, nextOpenText as nextOpenAt } from './provider';
import { commit, db, saveMarket, settleSolo, snapshot } from './store';
import type { HistoryPoint, IntraPoint, Markers, Quote } from './types';

const BUILT_IN = (process.env.EXPO_PUBLIC_SERVER_URL ?? '').trim();
let sameOrigin = ''; // on the website: the address it was loaded from, once we know a server is there

const clean = (url: string) => url.trim().replace(/\/+$/, '');
/** The server to use, or '' if there is none. A class you joined always uses its own server. */
export const serverUrl = () => clean(db.cls?.server || db.teacher?.server || BUILT_IN || sameOrigin);
export type Source = 'server' | 'none';
export const source = (): Source => (serverUrl() ? 'server' : 'none');
export { marketOpen };
/** Whether trading is open right now. The server's answer is used once we have it, so every student agrees. */
export const isOpen = () => (db.net.open !== null ? db.net.open : marketOpen());
/** A sentence saying whether the market is open, and if not, when it opens next (Bermuda time). */
export const nextOpenText = () => nextOpenAt(new Date(), isOpen());

/** Open or closed, and how long until that changes, in Bermuda time. */
export const marketClock = () => clockAt(new Date(), isOpen());

/** Fetches JSON with a time limit and turns failures into a sentence a child can read. */
export async function getJson(url: string, init?: RequestInit, ms = 12000): Promise<any> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { ...init, signal: ctl.signal });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      if (body?.error) throw new Error(String(body.error));
      if (res.status === 429) throw new Error('Too many requests just now. Try again in a minute.');
      throw new Error(`The server answered with an error (${res.status}).`);
    }
    return body;
  } catch (e) {
    if (e instanceof Error && e.name !== 'AbortError' && e.name !== 'TypeError') throw e;
    throw new Error('No connection. Check the internet and try again.');
  } finally {
    clearTimeout(timer);
  }
}

/** On the website, checks whether the address it was loaded from is the server. */
export async function probe() {
  if (Platform.OS !== 'web' || BUILT_IN) return;
  try {
    const origin = globalThis.location?.origin ?? '';
    const j = await getJson(`${origin}/api/health`, undefined, 4000);
    if (j?.ok) sameOrigin = origin;
  } catch {
    // not served by the server; the last prices seen are shown
  }
}

let running: Promise<void> | null = null;
/** Brings every stock's price up to date. Skips the work if they were refreshed recently, unless `force`. */
export function refreshQuotes(force = false): Promise<void> {
  if (running) return running;
  const age = Date.now() - db.net.at;
  if (!force && db.net.at && age < (marketOpen() ? 60_000 : 10 * 60_000)) return Promise.resolve();
  if (source() === 'none') return Promise.resolve();
  db.net = { ...db.net, loading: true };
  running = (async () => {
    let error = '';
    try {
      const j = await getJson(`${serverUrl()}/api/quotes?symbols=${STOCKS.map((s) => s.symbol).join(',')}`);
      for (const [sym, q] of Object.entries((j?.quotes ?? {}) as Record<string, Quote>)) db.quotes[sym] = q;
      if (typeof j?.open === 'boolean') db.net.open = j.open;
    } catch (e) {
      error = (e as Error).message;
    }
    db.net = { ...db.net, loading: false, error, at: error ? db.net.at : Date.now() };
    if (!error && isOpen()) settleSolo();
    snapshot();
    saveMarket();
    commit();
    running = null;
  })();
  return running;
}

/** The newest price for one stock, fetched now. Used just before a trade so it never uses a stale price. */
export async function freshQuote(symbol: string): Promise<Quote> {
  if (source() === 'none') throw new Error('Prices cannot be reached right now. Check the internet and try again.');
  const q: Quote | null = (await getJson(`${serverUrl()}/api/quotes?symbols=${symbol}`))?.quotes?.[symbol] ?? null;
  if (!q) throw new Error('There is no price for this stock right now.');
  db.quotes[symbol] = q;
  saveMarket();
  return q;
}

const DAY = 24 * 3600_000;

const okLogo = (url: unknown): url is string => typeof url === 'string' && /^(https:\/\/|data:image\/)/.test(url);
let logosAt = 0;
/** Company logos for the stock tiles, all in one go. A stock with no logo keeps its lettered tile. */
export async function loadLogos() {
  if (source() === 'none' || Date.now() - logosAt < 3600_000 || STOCKS.every((s) => db.logos[s.symbol])) return;
  logosAt = Date.now();
  try {
    const j = await getJson(`${serverUrl()}/api/logos`);
    let changed = false;
    for (const [sym, url] of Object.entries((j?.logos ?? {}) as Record<string, unknown>)) {
      if (okLogo(url) && db.logos[sym] !== url) { db.logos[sym] = url; changed = true; }
    }
    if (changed) saveMarket();
  } catch {
    // lettered tiles are shown instead
  }
}

/** The markers for a stock (size, P/E, dividend...). Kept for a day. Returns null if they cannot be fetched. */
export async function loadMarkers(symbol: string): Promise<Markers | null> {
  const have = db.markers[symbol];
  if (have && Date.now() - have.at < DAY) return have;
  if (source() === 'none') return have ?? null;
  try {
    const m: Markers = (await getJson(`${serverUrl()}/api/markers?symbol=${symbol}`)).markers;
    db.markers[symbol] = { ...m, at: Date.now() };
    saveMarket();
    return db.markers[symbol];
  } catch {
    return have ?? null;
  }
}

/** A year of daily prices for the graph. Kept for half a day. Throws a readable Error if it cannot be fetched. */
export async function loadHistory(symbol: string): Promise<HistoryPoint[]> {
  const have = db.history[symbol];
  if (have && Date.now() - have.at < DAY / 2) return have.points;
  if (source() === 'none') {
    if (have) return have.points;
    throw new Error('The graph cannot be reached right now. Check the internet and try again.');
  }
  try {
    const points: HistoryPoint[] = (await getJson(`${serverUrl()}/api/history?symbol=${symbol}`)).points;
    if (!points?.length) throw new Error('No graph data for this stock yet.');
    db.history[symbol] = { at: Date.now(), points };
    // Keep the saved file small: graphs for the 12 stocks looked at most recently.
    const keep = Object.entries(db.history).sort((a, b) => b[1].at - a[1].at).slice(0, 12);
    db.history = Object.fromEntries(keep);
    saveMarket();
    return points;
  } catch (e) {
    if (have) return have.points;
    throw e;
  }
}

const intra = new Map<string, { at: number; points: IntraPoint[] }>();
/**
 * The latest trading day in 15-minute steps, oldest first. Kept in memory for a few minutes only: it changes all
 * day. Throws a readable Error if it cannot be fetched.
 */
export async function loadIntraday(symbol: string): Promise<IntraPoint[]> {
  const have = intra.get(symbol);
  if (have && Date.now() - have.at < (isOpen() ? 3 : 30) * 60_000) return have.points;
  if (source() === 'none') throw new Error('The graph cannot be reached right now. Check the internet and try again.');
  try {
    const points: IntraPoint[] = (await getJson(`${serverUrl()}/api/intraday?symbol=${symbol}`)).points ?? [];
    intra.set(symbol, { at: Date.now(), points });
    return points;
  } catch (e) {
    if (have) return have.points;
    throw e;
  }
}
