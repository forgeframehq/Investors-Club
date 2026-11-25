import { useCallback, useEffect, useState } from 'react';

import { STOCKS } from '@/data/stocks';
import { fmtDayKey, pct } from '@/lib/format';
import { loadHistory } from '@/lib/market';
import type { HistoryPoint, Stock } from '@/lib/types';
import { PriceChart } from '@/ui/chart';
import { Btn, C, Card, Page, Row, Tile, Txt } from '@/ui/kit';

const SEEN = 60; // days of chart shown
const AHEAD = 22; // about a month of trading days kept hidden

interface Round { stock: Stock; before: HistoryPoint[]; after: HistoryPoint[] }

/**
 * A real chart with the end hidden: did the price go up or down over the next month? It teaches that a chart
 * alone does not tell you what comes next, so the score is always shown beside what a coin would get.
 */
export default function WhatNext() {
  const [round, setRound] = useState<Round | null>(null);
  const [error, setError] = useState('');
  const [said, setSaid] = useState<'up' | 'down' | null>(null);
  const [right, setRight] = useState(0);
  const [played, setPlayed] = useState(0);

  const deal = useCallback(async () => {
    setSaid(null);
    setRound(null);
    setError('');
    for (let tries = 0; tries < 4; tries++) {
      const stock = STOCKS[Math.floor(Math.random() * STOCKS.length)];
      try {
        const points = await loadHistory(stock.symbol);
        if (points.length < SEEN + AHEAD + 5) continue;
        const cut = SEEN + Math.floor(Math.random() * (points.length - SEEN - AHEAD));
        return setRound({ stock, before: points.slice(cut - SEEN, cut), after: points.slice(cut, cut + AHEAD) });
      } catch (e) {
        setError((e as Error).message);
      }
    }
    setError((was) => was || 'No chart could be loaded. Try again in a minute.');
  }, []);
  useEffect(() => { deal(); }, [deal]);

  const from = round ? round.before[round.before.length - 1].c : 0;
  const to = round ? round.after[round.after.length - 1].c : 0;
  const move = from ? ((to - from) / from) * 100 : 0;
  const answer = move >= 0 ? 'up' : 'down';
  const choose = (v: 'up' | 'down') => { setSaid(v); setPlayed(played + 1); if (v === answer) setRight(right + 1); };
  const shown = round ? (said ? [...round.before, ...round.after] : round.before) : [];

  return (
    <Page>
      <Txt size={15} color={C.muted}>A real company and its real prices. The next month is hidden. Which way did it go?</Txt>
      {!round && <Card><Txt size={14} color={C.muted} center>{error || 'Finding a chart...'}</Txt>{!!error && <Btn title="Try again" kind="ghost" onPress={deal} />}</Card>}
      {round && (
        <>
          <Card>
            <Row>
              <Tile symbol={round.stock.symbol} size={40} />
              <Txt size={17} bold style={{ flex: 1 }}>{round.stock.name}</Txt>
            </Row>
            <PriceChart values={shown.map((x) => x.c)} labels={shown.map((x) => fmtDayKey(x.d))} color={C.accent} />
            <Txt size={12} color={C.muted}>{said ? 'The whole chart, with the hidden month on the right.' : `About three months, ending ${fmtDayKey(round.before[round.before.length - 1].d)}.`}</Txt>
          </Card>
          {said === null ? (
            <Row>
              <Btn title="It went up" icon="trending-up" kind="ghost" color={C.good} style={{ flex: 1 }} onPress={() => choose('up')} />
              <Btn title="It went down" icon="trending-down" kind="ghost" color={C.bad} style={{ flex: 1 }} onPress={() => choose('down')} />
            </Row>
          ) : (
            <>
              <Card>
                <Txt size={18} bold color={said === answer ? C.good : C.bad}>{said === answer ? 'You got it.' : 'Not this time.'}</Txt>
                <Txt size={15}>Over the next month the price went {answer} by {pct(move).replace(/^[+-]/, '')}.</Txt>
                <Txt size={14} color={C.muted}>You have {right} of {played} right. Flipping a coin would get about half. A chart shows what the crowd did, not what it will do next.</Txt>
              </Card>
              <Btn title="Another chart" onPress={deal} />
            </>
          )}
        </>
      )}
    </Page>
  );
}
