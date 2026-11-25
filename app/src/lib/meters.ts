// The Crowd meter is the Relative Strength Index (RSI), worked out the standard way (Wilder's smoothing over
// 14 days) from the daily closing prices we already have. No React Native imports: it is plain maths.

export interface Rsi {
  /** 0 to 100. Above 70 means lots of recent buying; below 30 lots of recent selling. */
  value: number;
  /** The smoothed average rise and fall per day, in dollars, that the value comes from. */
  rise: number;
  fall: number;
}

/** RSI over `days` from closing prices, oldest first. Null when there are too few prices. */
export function rsi(closes: number[], days = 14): Rsi | null {
  if (closes.length < days + 1) return null;
  let rise = 0;
  let fall = 0;
  for (let i = 1; i <= days; i++) {
    const move = closes[i] - closes[i - 1];
    if (move > 0) rise += move; else fall -= move;
  }
  rise /= days;
  fall /= days;
  for (let i = days + 1; i < closes.length; i++) {
    const move = closes[i] - closes[i - 1];
    rise = (rise * (days - 1) + Math.max(move, 0)) / days;
    fall = (fall * (days - 1) + Math.max(-move, 0)) / days;
  }
  const value = fall === 0 ? 100 : 100 - 100 / (1 + rise / fall);
  return { value, rise, fall };
}

/** The Crowd meter in plain words. It describes the mood; it never says what to do. */
export const crowdWord = (value: number) => (value >= 70 ? 'Big queue' : value <= 30 ? 'Crowd has walked away' : 'A normal day');
/** The Company meter in plain words: how much buyers pay for each $1 of profit. */
export const companyWord = (pe: number) => (pe < 15 ? 'Low price for its profit' : pe <= 30 ? 'Middle price for its profit' : 'High price for its profit');
