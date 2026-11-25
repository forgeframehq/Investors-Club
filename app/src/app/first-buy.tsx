import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { fmtShares, money } from '@/lib/format';
import { nextOpenText, refreshQuotes } from '@/lib/market';
import { roundShares } from '@/lib/rules';
import { brands, setSetting, useStore } from '@/lib/store';
import type { Stock } from '@/lib/types';
import { Bar, Btn, C, Card, Chip, Icon, Page, PracticeTag, Row, TapCard, Tile, Txt } from '@/ui/kit';
import { Words } from '@/ui/words';

const WALLET = 100;

/**
 * A trial buy, step by step, with a separate $100 that is thrown away afterwards. It uses the last real price we
 * have, so it works when the market is closed, and it never touches the student's own portfolio.
 */
export default function FirstBuy() {
  const router = useRouter();
  const { quotes } = useStore();
  const [step, setStep] = useState(0);
  const [s, setS] = useState<Stock | null>(null);
  const [dollars, setDollars] = useState(0);
  useEffect(() => { refreshQuotes(); }, []);

  const price = s ? quotes[s.symbol]?.price ?? 0 : 0;
  const shares = price ? roundShares(dollars / price) : 0;
  const finish = (go: string) => { setSetting('triedBuy', true); router.replace(go as never); };

  return (
    <Page>
      <Bar value={(step + 1) / 4} height={6} />
      <PracticeTag />

      {step === 0 && (
        <>
          <Txt size={24} bold>Pick a company</Txt>
          <Words size={15} color={C.muted} text="This is a trial run with a spare $100. Your own $10,000 is not touched. Start with a company you know." />
          {brands().map((b) => (
            <TapCard key={b.symbol} label={`Choose ${b.name}`} onPress={() => { setS(b); setStep(1); }} style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <Tile symbol={b.symbol} size={46} />
              <View style={{ flex: 1, gap: 2 }}>
                <Txt size={16} bold>{b.name}</Txt>
                <Txt size={13} color={C.muted} lines={2}>{b.about}</Txt>
              </View>
              <Txt size={15} bold>{quotes[b.symbol] ? money(quotes[b.symbol].price) : ''}</Txt>
            </TapCard>
          ))}
        </>
      )}

      {step === 1 && s && (
        <>
          <Txt size={24} bold>Look at the price</Txt>
          <Card style={{ alignItems: 'center', gap: 8, paddingVertical: 22 }}>
            <Tile symbol={s.symbol} size={56} />
            <Txt size={15} color={C.muted}>One share of {s.name} costs</Txt>
            <Txt size={34} bold>{price ? money(price) : 'No price yet'}</Txt>
          </Card>
          <Words size={15} text={`That is the real [share price](price) right now. You do not need a whole share: you can buy a [fraction](fraction) with any amount. ${nextOpenText()}`} />
          <Btn title="Next" disabled={!price} onPress={() => setStep(2)} />
        </>
      )}

      {step === 2 && s && (
        <>
          <Txt size={24} bold>How much will you put in?</Txt>
          <Txt size={15} color={C.muted}>You have {money(WALLET, false)} for this trial. A good habit: never put everything into one company.</Txt>
          <Row gap={8} style={{ flexWrap: 'wrap' }}>
            {[10, 25, 50, 100].map((v) => <Chip key={v} title={`$${v}`} selected={dollars === v} onPress={() => setDollars(v)} />)}
          </Row>
          {dollars > 0 && (
            <Card>
              <Txt size={16}>{money(dollars, false)} buys <Txt size={16} bold>{fmtShares(shares)}</Txt> of {s.name}.</Txt>
              <Txt size={14} color={C.muted}>{dollars === WALLET ? 'That is all of it in one company. If it has a bad week, so does all your money.' : `You keep ${money(WALLET - dollars, false)} in cash for other ideas.`}</Txt>
            </Card>
          )}
          <Btn title="Confirm trial buy" disabled={!dollars} onPress={() => setStep(3)} />
        </>
      )}

      {step === 3 && s && (
        <>
          <Card style={{ alignItems: 'center', gap: 10, paddingVertical: 26 }}>
            <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.accentDim, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="checkmark" size={36} color={C.accent} />
            </View>
            <Txt size={22} bold center>You bought {fmtShares(shares)} of {s.name}</Txt>
            <Txt size={15} color={C.muted} center>That is how a buy works. This one was a trial, so it is not in your portfolio.</Txt>
          </Card>
          <Card>
            <Txt size={16} bold>What happens after a real buy</Txt>
            <Words size={15} text={`The shares sit in your [portfolio](portfolio). If the price goes from ${money(price)} to ${money(price * 1.1)}, your ${money(dollars, false)} becomes ${money(dollars * 1.1)}. If it falls to ${money(price * 0.9)}, it becomes ${money(dollars * 0.9)}.`} />
            <Txt size={14} color={C.muted}>Before each real buy, the app helps you check the company first.</Txt>
          </Card>
          <Btn title={`Open ${s.name} for real`} onPress={() => finish(`/stock/${s.symbol}`)} />
          <Btn title="Back to my lessons" kind="ghost" onPress={() => finish('/learn')} />
        </>
      )}
    </Page>
  );
}
