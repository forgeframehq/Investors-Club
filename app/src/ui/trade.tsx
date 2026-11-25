import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { orderInClass, tradeInClass } from '@/lib/classroom';
import { fmtShares, money, parseNum, trimNum } from '@/lib/format';
import { freshQuote, isOpen, nextOpenText } from '@/lib/market';
import { roundShares } from '@/lib/rules';
import { db, holdingOf, inClass, orderSolo, portfolio, setSetting, stock, tradeSolo, useStore } from '@/lib/store';

import { watchBadges } from './celebrate';
import { Coach, reasonLabel } from './coach';
import { Btn, C, Chip, Field, Icon, PracticeTag, Row, Txt } from './kit';
import { toast } from './overlay';

/** How many buys must go through "Check before you buy" before it can be skipped. */
const MUST_CHECK = 3;

/** Bottom sheet for buying or selling one stock. `side` null means closed. A buy starts with the check. */
export function TradeSheet({ symbol, side, onClose }: { symbol: string; side: 'buy' | 'sell' | null; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { quotes } = useStore();
  const [unit, setUnit] = useState<'dollars' | 'shares'>('dollars');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [why, setWhy] = useState('');

  useEffect(() => {
    if (side) { setText(''); setError(''); setWhy(''); setChecking(side === 'buy'); setUnit(side === 'buy' ? 'dollars' : 'shares'); }
  }, [side]);

  if (!side) return null;
  const s = stock(symbol);
  const p = portfolio();
  const price = quotes[symbol]?.price ?? 0;
  const held = holdingOf(p, symbol)?.shares ?? 0;
  const amount = parseNum(text);
  const sharesAt = (px: number) => (!(amount > 0) || !px ? 0 : unit === 'dollars' ? roundShares(amount / px) : roundShares(amount));
  const shares = sharesAt(price);
  const total = shares * price;
  const buying = side === 'buy';
  const buysSoFar = p.trades.filter((t) => t.side === 'buy').length + (p.orders ?? []).filter((o) => o.side === 'buy').length;
  // Like a real broker: when the market is closed the order waits and is filled at the first price after it opens.
  const open = isOpen();
  const problem = !text.trim() ? '' : !(amount > 0) ? 'Enter a number.' : shares <= 0 ? 'That is too small to trade.' : buying && total > p.cash + 0.001 ? `You have ${money(p.cash)} in cash.` : !buying && shares > held + 1e-6 ? `You have ${fmtShares(held)}.` : '';

  const quick: [string, () => void][] = buying
    ? [['$100', () => { setUnit('dollars'); setText('100'); }], ['$500', () => { setUnit('dollars'); setText('500'); }], ['$1,000', () => { setUnit('dollars'); setText('1000'); }], ['1 share', () => { setUnit('shares'); setText('1'); }]]
    : [['Half', () => { setUnit('shares'); setText(trimNum(roundShares(held / 2))); }], ['All', () => { setUnit('shares'); setText(trimNum(held)); }]];

  const go = async () => {
    setBusy(true);
    setError('');
    const celebrate = watchBadges();
    try {
      if (!open) {
        const amountOf = buying && unit === 'dollars' ? { dollars: Math.round(amount * 100) / 100 } : { shares };
        if (inClass()) await orderInClass(symbol, side, amountOf, why);
        else {
          const failed = orderSolo(symbol, side, amountOf, why);
          if (failed) throw new Error(failed);
        }
        onClose();
        toast('Order placed. It will be filled when the market opens.');
        return;
      }
      let done: { shares: number; price: number };
      if (inClass()) done = await tradeInClass(symbol, side, shares, why);
      else {
        // Practice trades use the newest real price, fetched this second.
        const q = await freshQuote(symbol);
        const n = sharesAt(q.price);
        const failed = tradeSolo(symbol, side, n, q.price, why);
        if (failed) throw new Error(failed);
        done = { shares: n, price: q.price };
      }
      if (buying && !db.settings.triedBuy) setSetting('triedBuy', true);
      onClose();
      toast(`${buying ? 'Bought' : 'Sold'} ${fmtShares(done.shares)} of ${s.name} at ${money(done.price)}`);
      await celebrate();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: C.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16, paddingBottom: insets.bottom + 14, gap: 12 }}>
            <View style={{ width: 44, height: 4, borderRadius: 2, backgroundColor: C.cardHi, alignSelf: 'center' }} />
            {checking ? (
              <>
                <Coach symbol={symbol} onDone={(reason) => { setWhy(reason); setChecking(false); }} onSkip={buysSoFar >= MUST_CHECK ? () => setChecking(false) : undefined} />
                <Btn title="Cancel" kind="plain" onPress={onClose} />
              </>
            ) : (
            <>
            <Txt size={19} bold>{buying ? 'Buy' : 'Sell'} {s.name}</Txt>
            <PracticeTag />
            {!!why && <Txt size={13} color={C.accent}>Your reason: {reasonLabel(why)}</Txt>}
            <Txt size={14} color={C.muted}>
              {money(price)} a share · {buying ? `you have ${money(p.cash)} cash` : `you own ${fmtShares(held)}`}
            </Txt>
            {!open && (
              <Row gap={10} style={{ backgroundColor: C.accentDim, borderRadius: 12, padding: 12, alignItems: 'flex-start' }}>
                <Icon name="moon-outline" size={20} color={C.accent} />
                <Txt size={13} style={{ flex: 1 }}>{nextOpenText()} You can place an order now. It waits, then is filled at the first price after the market opens, which may be higher or lower than {money(price)}.</Txt>
              </Row>
            )}
            <Row>
              <Btn title="Dollars" kind={unit === 'dollars' ? 'primary' : 'ghost'} height={42} style={{ flex: 1 }} onPress={() => { setUnit('dollars'); setText(''); }} />
              <Btn title="Shares" kind={unit === 'shares' ? 'primary' : 'ghost'} height={42} style={{ flex: 1 }} onPress={() => { setUnit('shares'); setText(''); }} />
            </Row>
            <Field
              accessibilityLabel="Amount"
              value={text}
              onChangeText={setText}
              placeholder={unit === 'dollars' ? 'How many dollars?' : 'How many shares?'}
              keyboardType="decimal-pad"
              style={{ backgroundColor: C.cardHi, fontSize: 20, minHeight: 54 }}
            />
            <Row gap={8} style={{ flexWrap: 'wrap' }}>
              {quick.map(([label, set]) => <Chip key={label} title={label} onPress={set} />)}
            </Row>
            {shares > 0 && !problem && (
              <Txt size={15}>
                {buying ? 'You get' : 'You sell'} <Txt size={15} bold>{fmtShares(shares)}</Txt> for about <Txt size={15} bold>{money(total)}</Txt>
              </Txt>
            )}
            {!!(problem || error) && <Txt size={14} color={C.bad}>{problem || error}</Txt>}
            <Btn title={open ? (buying ? 'Confirm buy' : 'Confirm sell') : buying ? 'Place buy order' : 'Place sell order'} kind={buying ? 'primary' : 'ghost'} color={buying ? undefined : C.bad} busy={busy} disabled={!(shares > 0) || !!problem} onPress={go} />
            <Btn title="Cancel" kind="plain" onPress={onClose} />
            </>
            )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}
