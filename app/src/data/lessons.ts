// The learning path: nine short lessons, in order, written for ages 12 to 14. They start at "What is the stock
// market?" and use real companies and the proper terms, each explained once. A lesson is a few cards (one idea
// each, some with something to tap) and a quiz. Every lesson can be skipped straight to its quiz.
//
// In card text:
//   [shares](share)   a term. It is underlined, and tapping it shows the glossary entry with that id.
//   {b1} {b2} {b3}    the three companies the student picked when they signed up (see brands() in the store).
export interface Question { q: string; options: string[]; answer: number; why: string }
/** Something to tap on a card instead of only reading it. Each kind is drawn by ui/play.tsx. */
export type PlayKind = 'seesaw' | 'pe' | 'eggs' | 'snowball' | 'sort';
export interface LessonCard { title: string; body: string; play?: PlayKind; /** Avatar ids of the characters in this card. */ who?: string[] }
export interface Lesson { id: string; title: string; minutes: number; icon: string; cards: LessonCard[]; quiz: Question[] }

/** The two investors in the last lesson. They are pictures from the avatar list, not real people. */
export const KAI = 'explorer';
export const ZURI = 'kite-flyer';

export const LESSONS: Lesson[] = [
  {
    id: 'market', title: 'What is the stock market?', minutes: 3, icon: 'storefront-outline',
    cards: [
      { title: 'A market for ownership', body: 'The [stock market](market) is where people buy and sell [shares](share): small pieces of ownership in companies. Buy a share of {b1} and you are a part-owner of {b1}.' },
      { title: 'Why companies sell shares', body: 'Selling shares raises money without borrowing it. The first sale to the public is called an [IPO](ipo). After that, shares trade between investors, and the company is not paid again.' },
      { title: 'Exchanges and tickers', body: 'Shares trade on a [stock exchange](exchange). The two biggest are in New York: the NYSE and the Nasdaq. Every company there has a short [ticker symbol](ticker), such as AAPL for Apple.' },
      { title: 'Why people invest', body: 'Owners can gain in two ways: the share price rises, or the company pays a [dividend](dividend). Over long periods shares have grown faster than cash in a bank. They can also fall, sometimes a lot. That is the [risk](risk).' },
      { title: 'Measuring the whole market', body: 'An [index](index) tracks a group of shares. The S&P 500 follows 500 of the largest US companies. A long rise is called a [bull market](bull). A fall of 20% or more is a [bear market](bear).' },
      { title: 'Practice money, real prices', body: 'Here you invest $10,000 of practice money. It is not real, so nothing can be lost. The prices are the real ones from New York, so what you learn is real.' },
    ],
    quiz: [
      { q: 'Long after a company\'s IPO, you buy one of its shares on the exchange. Who receives your money?', options: ['The company', 'The investor who sold the share', 'The exchange'], answer: 1, why: 'After the IPO, shares change hands between investors. The company was paid when it first sold them.' },
      { q: 'What does the S&P 500 measure?', options: ['The price of $500 of gold', 'How 500 of the largest US companies are doing together', 'How many shares were sold today'], answer: 1, why: 'It is an index: one number that follows 500 big companies.' },
      { q: 'Which of these is a bear market?', options: ['Prices falling 20% or more', 'Prices rising for months', 'The market closing for a holiday'], answer: 0, why: 'A bear market is a fall of 20% or more from a recent high.' },
      { q: 'What are the two ways a shareholder can gain?', options: ['Interest and fees', 'A rising share price and dividends', 'Salaries and bonuses'], answer: 1, why: 'The shares can become worth more, and some companies pay out part of their profit.' },
    ],
  },
  {
    id: 'what-is-a-stock', title: 'What is a share worth?', minutes: 3, icon: 'pie-chart-outline',
    cards: [
      { title: 'Market cap', body: 'Share price times the number of shares gives the [market cap](cap): what the whole company is worth. One billion shares at $50 each is a $50 billion company.' },
      { title: 'A low price is not cheap', body: 'A $20 share with 10 billion shares is a $200 billion company. A $500 share with 100 million shares is a $50 billion company. Compare companies, never single share prices.' },
      { title: 'What sits behind the price', body: '[Revenue](revenue) is the money a company takes in from sales. [Earnings](earnings) are what is left after all its costs. Over many years, share prices tend to follow earnings.' },
      { title: 'Fractions of a share', body: 'One share of {b1} may cost more than you want to put in. Here you can buy a [fraction of a share](fraction) with any dollar amount.' },
      { title: 'Gains and losses on paper', body: 'Your [profit or loss](profit) is what your shares are worth now, minus what you paid. Until you sell, it is only on paper: it can still grow or shrink.' },
    ],
    quiz: [
      { q: 'A company has 2 billion shares at $40 each. What is its market cap?', options: ['$80 billion', '$40 billion', '$2 billion'], answer: 0, why: '2 billion times $40 is $80 billion.' },
      { q: 'Company A: $10 a share, 5 billion shares. Company B: $200 a share, 100 million shares. Which is the bigger company?', options: ['B, its share price is higher', 'A: $50 billion against $20 billion', 'They are the same size'], answer: 1, why: 'Size is price times shares. A is $50 billion, B is $20 billion.' },
      { q: 'Revenue is $10 billion and costs are $8 billion. What are the earnings?', options: ['$18 billion', '$2 billion', '$10 billion'], answer: 1, why: 'Earnings are what is left after costs: $10 billion minus $8 billion.' },
      { q: 'You bought at $50. The price is now $60 and you have not sold. What is true?', options: ['You have a $10 gain on paper', 'You have been paid $10', 'Nothing has changed'], answer: 0, why: 'The gain is real only when you sell. Until then it can still change.' },
    ],
  },
  {
    id: 'prices', title: 'Why prices go up and down', minutes: 3, icon: 'trending-up-outline',
    cards: [
      { title: 'Supply and demand', body: 'Nobody sets a share price. It is simply the last price a buyer and a seller agreed on. More buyers than sellers pushes it up. This is [supply and demand](supply).' },
      { title: 'Try it', play: 'seesaw', body: 'Add buyers or sellers and watch what happens to the price.' },
      { title: 'Earnings against expectations', body: 'Companies report their [earnings](earnings) every three months. The price reacts to how the results compare with what investors expected. Good results can still send a price down if people hoped for more.' },
      { title: 'The wider world', body: 'Interest rates, [inflation](inflation) and big news can move most shares at once. News about one industry can move a whole [sector](sector).' },
      { title: 'Short-term noise', body: 'Day to day, prices jump around. That is [volatility](volatility). Nobody predicts those moves reliably, which is why many investors think in years.' },
    ],
    quiz: [
      { q: 'More people want to buy a share than sell it. What usually happens?', options: ['The price rises', 'The price falls', 'Nothing'], answer: 0, why: 'More demand than supply pushes the price up.' },
      { q: 'A company reports record earnings, and its price falls 6% the same day. What is the most likely reason?', options: ['The exchange made a mistake', 'Investors had expected even more', 'Prices always fall after earnings'], answer: 1, why: 'Prices move on results compared with expectations.' },
      { q: 'Interest rates rise sharply and most shares fall on the same day. What does that suggest?', options: ['Every company had bad news at once', 'Something affecting the whole market', 'A fault in the price data'], answer: 1, why: 'Some forces move the whole market, whatever each company is doing.' },
      { q: 'Who can reliably predict tomorrow\'s price?', options: ['Experts on TV', 'Anyone with a chart', 'Nobody'], answer: 2, why: 'Short-term moves are not reliably predictable by anyone.' },
    ],
  },
  {
    id: 'markers', title: 'How to read a company', minutes: 4, icon: 'speedometer-outline',
    cards: [
      { title: 'Look before you buy', body: 'Every stock here shows markers: the key numbers about the company and its price. Reading them is the difference between a choice and a guess.' },
      { title: 'Size', body: '[Market cap](cap) tells you how big the company is. Giants tend to be steadier. Smaller companies can grow faster and carry more [risk](risk).' },
      { title: 'The price of earnings', play: 'pe', body: 'Two companies each earn $10 billion a year. Which one are buyers paying more for, per $1 of earnings?' },
      { title: 'Reading the P/E', body: 'That is the [P/E ratio](pe): share price divided by earnings per share. A high P/E means investors expect strong growth. Compare it with companies in the same sector. No earnings means no P/E.' },
      { title: 'Dividend yield and beta', body: 'The [dividend](dividend) yield is the yearly payout as a percentage of the price. [Beta](beta) measures how much the price swings against the market: above 1 swings more, below 1 less.' },
      { title: 'Growth and the 52-week range', body: '[Sales growth](growth) shows whether the business is getting bigger. The [52-week range](range) shows the lowest and highest price of the past year, and where today sits between them.' },
      { title: 'No single number decides', body: 'Markers describe a stock. They never tell you to buy. Read several together, and ask what the company actually does.' },
    ],
    quiz: [
      { q: 'A share costs $100 and the company earns $5 per share. What is its P/E?', options: ['20', '5', '500'], answer: 0, why: '$100 divided by $5 is 20. Buyers pay $20 for each $1 of yearly earnings.' },
      { q: 'A stock has a dividend yield of 3%. About how much does $200 of its shares pay in a year?', options: ['$6', '$3', '$60'], answer: 0, why: '3% of $200 is $6.' },
      { q: 'A stock has a beta of 1.8. What does that suggest?', options: ['It swings more than the market', 'It pays a big dividend', 'It is a small company'], answer: 0, why: 'A beta above 1 means bigger swings than the market overall.' },
      { q: 'A very high P/E means the stock is definitely a bad buy.', options: ['True', 'False'], answer: 1, why: 'A high P/E shows high expectations. It is not good or bad alone.' },
    ],
  },
  {
    id: 'diversify', title: 'Risk and diversification', minutes: 3, icon: 'grid-outline',
    cards: [
      { title: 'Two kinds of risk', body: 'Company [risk](risk) is something going wrong at one business. Market risk is everything falling together. You can shrink the first kind. You cannot escape the second.' },
      { title: 'One sector or three?', play: 'eggs', body: 'You have $9,000. Put it all into airlines, or split it across an airline, a tech company and a food company? Then see what the news brings.' },
      { title: 'Diversification', body: 'Owning companies in different [sectors](sector) means one bad result hurts less. This is [diversification](diversify). Five airlines is not diversified: they share the same risks.' },
      { title: 'Index funds', body: 'An [index fund](fund) owns every company in an index in one purchase. One share of an S&P 500 fund spreads your money across 500 companies.' },
      { title: 'Cash is a position too', body: 'Holding some [cash](cash) lets you buy when you find something good. Cash does not grow, though, so it is a balance.' },
    ],
    quiz: [
      { q: 'What is diversification?', options: ['Buying only tech stocks', 'Spreading money across different investments', 'Selling everything'], answer: 1, why: 'Spreading out means one bad result does less damage.' },
      { q: 'A portfolio of five different airlines is well diversified.', options: ['True', 'False'], answer: 1, why: 'They are all in one sector, so the same news hits all five.' },
      { q: 'Which is the most diversified?', options: ['An S&P 500 fund', 'One airline', 'Two car makers'], answer: 0, why: 'The fund holds 500 companies across many sectors.' },
      { q: 'Which risk can diversification NOT remove?', options: ['One company having a bad year', 'The whole market falling', 'One sector struggling'], answer: 1, why: 'When the whole market falls, most shares fall with it.' },
    ],
  },
  {
    id: 'long-term', title: 'Time and compounding', minutes: 3, icon: 'hourglass-outline',
    cards: [
      { title: 'Time smooths the bumps', body: 'Over single days, prices jump around. Over many years, strong companies have tended to grow. This is [long-term investing](longterm).' },
      { title: 'Compounding', play: 'snowball', body: 'Start with $100 growing 10% a year. Each year\'s gain earns its own gain. This is [compounding](compound).' },
      { title: 'Cash quietly shrinks', body: 'Prices in shops rise a little every year. That is [inflation](inflation). Money that does not grow buys less over time, which is one reason people invest at all.' },
      { title: 'Trading a lot rarely helps', body: 'Buying and selling all the time means guessing short-term moves. Most people who do it end up behind those who simply held.' },
      { title: 'Have a reason', body: 'Before you buy, say why in one sentence. If the reason is still true later, a falling price alone is not a reason to sell.' },
    ],
    quiz: [
      { q: '$100 grows 10% a year. What is it worth after two years?', options: ['$120', '$121', '$110'], answer: 1, why: 'Year one makes $110. Year two adds 10% of $110, which is $11.' },
      { q: 'Inflation is 3% a year and your cash earns nothing. After a year your cash:', options: ['Buys about 3% less', 'Buys about 3% more', 'Buys exactly the same'], answer: 0, why: 'The number of dollars is the same, but each one buys less.' },
      { q: 'What usually works better for most investors?', options: ['Trading every day', 'Holding good companies for years', 'Following rumours'], answer: 1, why: 'Trading often relies on guessing short-term moves.' },
      { q: 'Your stock drops 5% in a day but nothing about the company changed. A sensible first step is to:', options: ['Sell at once', 'Buy ten more without thinking', 'Check whether your reason for owning it still holds'], answer: 2, why: 'Decide from your reason for owning it, not from one day\'s move.' },
    ],
  },
  {
    id: 'orders', title: 'How buying and selling works', minutes: 3, icon: 'swap-horizontal-outline',
    cards: [
      { title: 'Buying', body: 'To [buy](buy), you choose a dollar amount or a number of shares. You pay the price at that moment and the shares join your [portfolio](portfolio).' },
      { title: 'Selling', body: 'To [sell](sell), you swap shares for cash at the price at that moment. Your gain or loss is the sale price against your [average cost](cost).' },
      { title: 'Market hours', body: 'The NYSE and Nasdaq are open Monday to Friday, 10:30 am to 5 pm Bermuda time, and closed on US holidays. These are the [market hours](hours).' },
      { title: 'Orders that wait', body: 'When the market is closed you can still place an order. It is filled at the first price after the open, which may be higher or lower than the price you saw.' },
      { title: 'Brokers and fees', body: 'In real life you trade through a [broker](broker), and some charge a [commission](fee) on each trade. There are no fees here, but in real investing they add up if you trade often.' },
      { title: 'Check before you buy', body: 'Before a buy, this app asks you to read the company\'s numbers and give your reason. You can skip it later, but a reason beats a guess.' },
    ],
    quiz: [
      { q: 'When are the US markets open, in Bermuda time?', options: ['All day, every day', 'Monday to Friday, 10:30 am to 5 pm', 'Only on Saturdays'], answer: 1, why: 'Weekdays from 10:30 am to 5 pm in Bermuda, except US market holidays.' },
      { q: 'On Sunday you see a price of $50 and place a buy order. On Monday the market opens at $52. What do you pay?', options: ['$50', '$52', 'Nothing, the order is cancelled'], answer: 1, why: 'A waiting order is filled at the first price after the open.' },
      { q: 'Why do commissions matter more to someone who trades every day?', options: ['They pay the fee on every trade', 'Fees only apply on Mondays', 'They do not matter'], answer: 0, why: 'A small fee paid hundreds of times becomes a large cost.' },
    ],
  },
  {
    id: 'bermuda', title: 'Bermuda: insurance and reinsurance', minutes: 3, icon: 'boat-outline',
    cards: [
      { title: 'How insurance works', body: 'Customers pay a premium each year. If something bad happens, such as a hurricane damaging a building, the insurer pays for it. Most years, most customers do not claim.' },
      { title: 'Reinsurance', body: 'One huge disaster could cost more than an insurer has. So insurers buy insurance themselves. That is [reinsurance](insurance), and Bermuda is one of its biggest centres in the world.' },
      { title: 'How a reinsurer earns', body: 'It collects premiums, pays claims, and invests the money in between. A quiet hurricane season means strong [earnings](earnings). A severe one can mean a loss for the year.' },
      { title: 'Bermuda companies on the exchange', body: 'Butterfield Bank, RenaissanceRe, Arch Capital, Everest, AXIS, Hamilton and SiriusPoint all trade in New York. They are in the Bermuda group in this app.' },
      { title: 'The BSX and the dollar', body: 'Bermuda has its own exchange, the BSX. This app uses US prices because they update all day. One Bermuda dollar equals one [US dollar](usd), so no conversion is needed.' },
    ],
    quiz: [
      { q: 'What is reinsurance?', options: ['Insurance for insurance companies', 'A second bank account', 'A type of stock chart'], answer: 0, why: 'Reinsurers take on part of the risk that insurers hold.' },
      { q: 'A very active hurricane season is most likely to make a reinsurer\'s earnings that year:', options: ['Higher', 'Lower', 'Exactly the same'], answer: 1, why: 'More disasters mean more claims to pay.' },
      { q: 'Besides premiums, how does a reinsurer make money?', options: ['By investing the money it holds', 'By selling hurricanes', 'It has no other way'], answer: 0, why: 'Premiums are invested until they are needed to pay claims.' },
      { q: 'How many US dollars is one Bermuda dollar worth?', options: ['Half', 'Two', 'One'], answer: 2, why: 'The Bermuda dollar is fixed one-to-one to the US dollar.' },
    ],
  },
  {
    id: 'shop-queue', title: 'The company and the crowd', minutes: 4, icon: 'people-outline',
    cards: [
      { title: 'Two investors, one stock', who: [KAI, ZURI], body: 'Kai and Zuri are both looking at {b1}. They study completely different things.' },
      { title: 'Kai studies the company', who: [KAI], body: 'Kai asks what the business is worth: its [earnings](earnings), its growth and its [P/E](pe). This is called fundamental analysis. Think of it as judging the shop.' },
      { title: 'Zuri studies the crowd', who: [ZURI], body: 'Zuri asks what other investors have been doing: has the price been climbing or sliding, and how fast? This is called technical analysis. Think of it as judging the queue outside the shop.' },
      { title: 'RSI: measuring the crowd', body: 'The [RSI](rsi) compares the average size of recent up days with recent down days, over 14 days, as a number from 0 to 100. Above 70 is called overbought. Below 30 is called oversold.' },
      { title: 'A queue is not a reason', body: 'A long queue does not make the shop better. A high RSI says many people bought lately. It says nothing about the business, and it does not predict what comes next.' },
      { title: 'Company or crowd?', play: 'sort', body: 'Is each fact about the company, or about the crowd?' },
      { title: 'Use both', who: [KAI, ZURI], body: 'Start with the company, then glance at the crowd. Pass this lesson and every stock shows a Company meter (P/E) and a Crowd meter (RSI).' },
    ],
    quiz: [
      { q: 'Which of these is fundamental analysis?', options: ['Studying a company\'s earnings', 'Counting how many days the price rose', 'Checking what is trending online'], answer: 0, why: 'Fundamentals are about the business itself.' },
      { q: 'A stock\'s RSI is 85. What does that tell you?', options: ['The company earns a lot', 'The price has climbed strongly of late', 'You must buy now'], answer: 1, why: 'A high RSI means strong recent buying. It is never an instruction.' },
      { q: 'An RSI above 70 proves the company is doing well.', options: ['True', 'False'], answer: 1, why: 'RSI measures recent price moves, not the business.' },
      { q: 'What is a sensible order to look at things?', options: ['Only the crowd', 'Neither, just guess', 'The company first, then the crowd'], answer: 2, why: 'Know what you are buying, then see what the mood is.' },
    ],
  },
];

export const lesson = (id: string) => LESSONS.find((l) => l.id === id);
/** The lesson that unlocks the Company and Crowd meters. */
export const METERS_LESSON = 'shop-queue';

/** A quick review: three questions picked from every lesson. It keeps the learning streak going. */
export function reviewLesson(): Lesson {
  const all = LESSONS.flatMap((l) => l.quiz);
  const picked: Question[] = [];
  while (picked.length < 3) {
    const q = all[Math.floor(Math.random() * all.length)];
    if (!picked.includes(q)) picked.push(q);
  }
  return { id: 'review', title: 'Quick review', minutes: 1, icon: 'flash-outline', cards: [], quiz: picked };
}
