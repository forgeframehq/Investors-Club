// The trading rules. Shared by the app (practice trades) and the class server (class trades), so both always agree.
// Keep this file free of React Native imports: the server bundles it too.
import { isoNow, newId } from './format';
import type { Order, OrderNote, Portfolio, Trade } from './types';

const cents = (v: number) => Math.round(v * 100) / 100;
const STEP = 1e4; // shares are kept to 4 decimal places
export const roundShares = (n: number) => Math.floor(n * STEP + 1e-6) / STEP;

/** Works out the portfolio after a trade, or returns a sentence saying why it cannot happen. There are no fees. */
export function applyTrade<P extends Pick<Portfolio, 'cash' | 'holdings' | 'trades'>>(p: P, symbol: string, side: 'buy' | 'sell', rawShares: number, price: number): P | string {
  const shares = roundShares(rawShares);
  if (!(shares > 0)) return 'Enter how many shares.';
  if (!(price > 0)) return 'There is no price for this stock right now.';
  const amount = cents(shares * price);
  const held = p.holdings.find((h) => h.symbol === symbol);
  const holdings = p.holdings.filter((h) => h.symbol !== symbol);
  let cash = p.cash;
  if (side === 'buy') {
    if (amount > cash + 0.001) return 'That costs more than your cash.';
    cash = cents(cash - amount);
    holdings.push({ symbol, shares: Math.round(((held?.shares ?? 0) + shares) * STEP) / STEP, cost: cents((held?.cost ?? 0) + amount) });
  } else {
    if (!held || shares > held.shares + 1e-6) return held ? `You only have ${held.shares} to sell.` : 'You do not own this stock.';
    cash = cents(cash + amount);
    const left = Math.round((held.shares - shares) * STEP) / STEP;
    if (left > 0) holdings.push({ symbol, shares: left, cost: cents(held.cost * (left / held.shares)) });
  }
  holdings.sort((a, b) => a.symbol.localeCompare(b.symbol));
  const trade: Trade = { id: newId(), symbol, side, shares, price, at: isoNow() };
  return { ...p, cash, holdings, trades: [trade, ...p.trades] };
}

/** How many orders one student may have waiting at once. */
export const MAX_ORDERS = 10;

/** Checks an order when it is placed. Returns a sentence saying why it cannot be placed, or '' if it can. */
export function checkOrder(p: Pick<Portfolio, 'cash' | 'holdings' | 'orders'>, o: Pick<Order, 'symbol' | 'side' | 'shares' | 'dollars'>, lastPrice: number): string {
  if ((p.orders?.length ?? 0) >= MAX_ORDERS) return `You can have ${MAX_ORDERS} orders waiting at most. Cancel one first.`;
  const shares = o.shares !== undefined ? roundShares(o.shares) : 0;
  if (o.side === 'sell') {
    const held = p.holdings.find((h) => h.symbol === o.symbol)?.shares ?? 0;
    if (!(shares > 0)) return 'Enter how many shares.';
    if (shares > held + 1e-6) return held ? `You only have ${held} to sell.` : 'You do not own this stock.';
    return '';
  }
  const cost = o.dollars !== undefined ? o.dollars : shares * lastPrice;
  if (!(cost > 0)) return 'Enter how much to buy.';
  if (cost > p.cash + 0.001) return 'That costs more than your cash.';
  return '';
}

/**
 * Fills waiting orders at the prices given, oldest first. An order with no price yet stays waiting; one that can
 * no longer happen (the price rose past your cash, say) is dropped with a note saying why.
 */
export function fillOrders<P extends Pick<Portfolio, 'cash' | 'holdings' | 'trades' | 'orders' | 'notes'>>(p: P, priceOf: (symbol: string) => number | null): { portfolio: P; filled: Trade[] } {
  let next = p;
  const waiting: Order[] = [];
  const notes: OrderNote[] = [];
  const filled: Trade[] = [];
  for (const o of p.orders ?? []) {
    const price = priceOf(o.symbol);
    if (!price) { waiting.push(o); continue; }
    const shares = o.shares !== undefined ? o.shares : roundShares((o.dollars ?? 0) / price);
    const done = applyTrade(next, o.symbol, o.side, shares, price);
    if (typeof done === 'string') notes.push({ id: o.id, symbol: o.symbol, side: o.side, why: done, at: isoNow() });
    else { next = done; filled.push(done.trades[0]); }
  }
  return { portfolio: { ...next, orders: waiting, notes: [...notes.reverse(), ...(p.notes ?? [])].slice(0, 5) }, filled };
}
