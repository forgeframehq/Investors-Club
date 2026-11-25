// The learning path, written for ages 12 to 14: sixteen short lessons in four levels, plus a Bermuda bonus.
// One idea per lesson, about two minutes each, with real companies and the proper terms. A lesson is a few cards
// (some with something to tap) and a quiz, and can be skipped straight to its quiz. Each level ends with a recap.
// Buying unlocks once Level 1 is passed (see canBuy() in the store).
//
// In card text:
//   [shares](share)   a term. It is underlined, and tapping it shows the glossary entry with that id.
//   {b1} {b2} {b3}    the three companies the student picked when they signed up (see brands() in the store).
export interface Question { q: string; options: string[]; answer: number; why: string }
/** Something to tap on a card instead of only reading it. Each kind is drawn by ui/play.tsx. */
export type PlayKind = 'seesaw' | 'pe' | 'eggs' | 'snowball' | 'sort';
export interface LessonCard { title: string; body: string; play?: PlayKind; /** Avatar ids of the characters in this card. */ who?: string[] }
export interface Lesson { id: string; /** 1 to 4, or 5 for the bonus lesson. */ level: number; title: string; minutes: number; icon: string; cards: LessonCard[]; quiz: Question[] }

/** The two investors in the last lesson. They are pictures from the avatar list, not real people. */
export const KAI = 'explorer';
export const ZURI = 'kite-flyer';

/** The levels of the path. Level 5 is the bonus and has no recap. */
export const LEVELS = [
  { n: 1, title: 'The basics', about: 'Enough to make your first buy.' },
  { n: 2, title: 'Why prices move', about: 'What pushes a share price up or down.' },
  { n: 3, title: 'Reading a company', about: 'The numbers to check before you buy.' },
  { n: 4, title: 'Investing well', about: 'Habits that matter more than any single pick.' },
  { n: 5, title: 'Bonus: Bermuda', about: 'The industry on your doorstep.' },
];

export const LESSONS: Lesson[] = [
  {
    id: 'market', level: 1, title: 'What is the stock market?', minutes: 2, icon: 'storefront-outline',
    cards: [
      { title: 'A market for ownership', body: 'The [stock market](market) is where people buy and sell [shares](share): small pieces of ownership in companies. Buy a share of {b1} and you are a part-owner of {b1}.' },
      { title: 'Why companies sell shares', body: 'Selling shares raises money without borrowing it. The first sale to the public is called an [IPO](ipo). After that, shares trade between investors, and the company is not paid again.' },
      { title: 'Why people invest', body: 'Owners can gain in two ways: the share price rises, or the company pays a [dividend](dividend). Shares can also fall, sometimes a lot. That is the [risk](risk).' },
      { title: 'Practice money, real prices', body: 'Here you invest $10,000 of practice money. It is not real, so nothing can be lost. The prices are the real ones from the two big US exchanges in New York, the New York Stock Exchange (NYSE) and the Nasdaq, so what you learn is real.' },
    ],
    quiz: [
      { q: 'What is the stock market?', options: ['A place where shares of companies are bought and sold', 'A bank run by the government', 'A shop that sells company products'], answer: 0, why: 'It is where pieces of ownership in companies change hands.' },
      { q: 'Long after a company\'s IPO, you buy one of its shares. Who receives your money?', options: ['The company', 'The investor who sold the share', 'The exchange'], answer: 1, why: 'After the IPO, shares change hands between investors. The company was paid when it first sold them.' },
      { q: 'What are the two ways a shareholder can gain?', options: ['Interest and fees', 'A rising share price and dividends', 'Salaries and bonuses'], answer: 1, why: 'The shares can become worth more, and some companies pay out part of their profit.' },
    ],
  },
  {
    id: 'what-is-a-stock', level: 1, title: 'What is a share?', minutes: 2, icon: 'pie-chart-outline',
    cards: [
      { title: 'A slice of the company', body: 'A company is divided into millions of equal [shares](share). Own one and you own a small slice of everything the company has and earns.' },
      { title: 'What owning gives you', body: 'If the company grows, your slice is worth more. If it pays a [dividend](dividend), you get your part. You do not get its products for free, and you cannot walk in and take things.' },
      { title: 'Fractions of a share', body: 'One share of {b1} may cost more than you want to put in. Here you can buy a [fraction of a share](fraction) with any dollar amount.' },
      { title: 'Gains and losses on paper', body: 'Your [profit or loss](profit) is what your shares are worth now, minus what you paid. Until you sell, it is only on paper: it can still grow or shrink.' },
    ],
    quiz: [
      { q: 'What do you own when you buy a share?', options: ['A loan to the company', 'A small piece of the company', 'One of its products'], answer: 1, why: 'A share is a piece of the company itself.' },
      { q: 'You bought at $50. The price is now $60 and you have not sold. What is true?', options: ['You have a $10 gain on paper', 'You have been paid $10', 'Nothing has changed'], answer: 0, why: 'The gain is real only when you sell. Until then it can still change.' },
      { q: 'You have $25 and one share costs $400. What can you do here?', options: ['Nothing until you have $400', 'Buy a fraction of a share', 'Borrow the rest'], answer: 1, why: '$25 buys one sixteenth of that share.' },
    ],
  },
  {
    id: 'exchanges', level: 1, title: 'Exchanges and tickers', minutes: 2, icon: 'business-outline',
    cards: [
      { title: 'Where shares trade', body: 'Shares are bought and sold on a [stock exchange](exchange). The two biggest are in New York: the NYSE and the Nasdaq. Every stock in this app trades on one of them.' },
      { title: 'Ticker symbols', body: 'Each company has a short code called a [ticker symbol](ticker): AAPL is Apple, DIS is Disney, NTB is Butterfield Bank. Prices are always listed by ticker.' },
      { title: 'Brokers', body: 'You cannot trade on an exchange directly. A [broker](broker) places your trades for you, and some charge a [commission](fee) each time. This app plays the broker and charges nothing.' },
    ],
    quiz: [
      { q: 'What is a ticker symbol?', options: ['A short code for a company\'s shares', 'The price of one share', 'A fee for trading'], answer: 0, why: 'It is the short name a stock trades under, like AAPL.' },
      { q: 'Which of these are the two biggest US stock exchanges?', options: ['The NYSE and the Nasdaq', 'Visa and PayPal', 'The S&P and the Dow'], answer: 0, why: 'Both are in New York. The S&P and the Dow are indexes, not exchanges.' },
      { q: 'What does a broker do?', options: ['Sets the share price', 'Places your trades on the exchange', 'Runs the company'], answer: 1, why: 'A broker is the go-between for you and the exchange.' },
    ],
  },
  {
    id: 'orders', level: 1, title: 'How to buy and sell', minutes: 3, icon: 'swap-horizontal-outline',
    cards: [
      { title: 'Buying', body: 'To [buy](buy), you choose a dollar amount or a number of shares. You pay the price at that moment and the shares join your [portfolio](portfolio).' },
      { title: 'Selling', body: 'To [sell](sell), you swap shares for cash at the price at that moment. Sell for more than you paid and it is a gain. Sell for less and it is a loss.' },
      { title: 'Market hours', body: 'The NYSE and Nasdaq are open Monday to Friday, 10:30 am to 5 pm Bermuda time, and closed on US holidays. These are the [market hours](hours).' },
      { title: 'Orders that wait', body: 'When the market is closed you can still place an order. It is filled at the first price after the open, which may be higher or lower than the price you saw.' },
      { title: 'Check before you buy', body: 'Before a buy, this app asks you to read the company\'s numbers and give your reason. A reason beats a guess. Pass this quiz and buying is unlocked.' },
    ],
    quiz: [
      { q: 'When are the US markets open, in Bermuda time?', options: ['All day, every day', 'Monday to Friday, 10:30 am to 5 pm', 'Only on Saturdays'], answer: 1, why: 'Weekdays from 10:30 am to 5 pm in Bermuda, except US market holidays.' },
      { q: 'On Sunday you see a price of $50 and place a buy order. On Monday the market opens at $52. What do you pay?', options: ['$50', '$52', 'Nothing, the order is cancelled'], answer: 1, why: 'A waiting order is filled at the first price after the open.' },
      { q: 'You bought a share for $20 and sell it for $25. What happened?', options: ['A $5 loss', 'Nothing', 'A $5 gain'], answer: 2, why: 'You sold for $5 more than you paid.' },
    ],
  },
  {
    id: 'prices', level: 2, title: 'Supply and demand', minutes: 2, icon: 'trending-up-outline',
    cards: [
      { title: 'Who sets the price?', body: 'Nobody. A share price is simply the last price a buyer and a seller agreed on. More buyers than sellers pushes it up. This is [supply and demand](supply).' },
      { title: 'Try it', play: 'seesaw', body: 'Add buyers or sellers and watch what happens to the price.' },
      { title: 'Short-term noise', body: 'Day to day, prices jump around for reasons nobody can fully explain. Nobody predicts those moves reliably, which is why many investors think in years.' },
    ],
    quiz: [
      { q: 'More people want to buy a share than sell it. What usually happens?', options: ['The price rises', 'The price falls', 'Nothing'], answer: 0, why: 'More demand than supply pushes the price up.' },
      { q: 'A share is priced at $80. What does that number mean?', options: ['The company chose $80', 'The last buyer and seller agreed on $80', 'The exchange set it at $80'], answer: 1, why: 'A price is just the most recent trade.' },
      { q: 'Who can reliably predict tomorrow\'s price?', options: ['Experts on TV', 'Anyone with a chart', 'Nobody'], answer: 2, why: 'Short-term moves are not reliably predictable by anyone.' },
    ],
  },
  {
    id: 'earnings', level: 2, title: 'Earnings and expectations', minutes: 2, icon: 'receipt-outline',
    cards: [
      { title: 'Revenue and earnings', body: '[Revenue](revenue) is the money a company takes in from sales. [Earnings](earnings) are what is left after all its costs. Earnings are the company\'s profit.' },
      { title: 'Report day', body: 'Every three months, each company publishes its results. On those days its share price can move a lot.' },
      { title: 'It is about expectations', body: 'The price reacts to how results compare with what investors expected. Record earnings can still send a price down if people had hoped for more.' },
    ],
    quiz: [
      { q: 'Revenue is $10 billion and costs are $8 billion. What are the earnings?', options: ['$18 billion', '$2 billion', '$10 billion'], answer: 1, why: 'Earnings are what is left after costs: $10 billion minus $8 billion.' },
      { q: 'A company reports record earnings and its price falls 6% the same day. What is the most likely reason?', options: ['The exchange made a mistake', 'Investors had expected even more', 'Prices always fall after earnings'], answer: 1, why: 'Prices move on results compared with expectations.' },
      { q: 'How often do companies report their earnings?', options: ['Every three months', 'Every day', 'Every ten years'], answer: 0, why: 'Four times a year, once a quarter.' },
    ],
  },
  {
    id: 'macro', level: 2, title: 'Interest rates and inflation', minutes: 2, icon: 'globe-outline',
    cards: [
      { title: 'Interest rates', body: 'An interest rate is the cost of borrowing money. In the US it is steered by the central bank, called the Federal Reserve. When rates rise, borrowing costs companies more and savings accounts pay more, so shares often fall.' },
      { title: 'Inflation', body: 'Prices in shops rise a little every year. That is [inflation](inflation). Money that does not grow buys less over time, which is one reason people invest at all.' },
      { title: 'Whole-market moves', body: 'News about one company moves one share. News about rates or inflation can move almost every share on the same day, whatever each company is doing.' },
    ],
    quiz: [
      { q: 'When interest rates rise sharply, share prices often:', options: ['Fall', 'Double', 'Stop moving'], answer: 0, why: 'Higher rates make borrowing dearer and savings more attractive, so shares tend to fall.' },
      { q: 'Inflation is 3% a year and your cash earns nothing. After a year your cash:', options: ['Buys about 3% less', 'Buys about 3% more', 'Buys exactly the same'], answer: 0, why: 'The number of dollars is the same, but each one buys less.' },
      { q: 'Rates rise and most shares fall on the same day. What does that suggest?', options: ['Every company had bad news at once', 'Something affecting the whole market', 'A fault in the price data'], answer: 1, why: 'Interest rates affect all companies, so most shares move together.' },
    ],
  },
  {
    id: 'cycles', level: 2, title: 'Indexes, bulls and bears', minutes: 2, icon: 'stats-chart-outline',
    cards: [
      { title: 'Indexes', body: 'An [index](index) is one number that tracks a group of shares. The S&P 500 follows 500 of the largest US companies. The Nasdaq 100 follows 100 big Nasdaq companies, many of them tech.' },
      { title: 'Bull markets', body: 'A long stretch of rising prices is called a [bull market](bull). Confidence is high and most shares climb.' },
      { title: 'Bear markets', body: 'A fall of 20% or more from a recent high is a [bear market](bear). They are a normal part of investing, and every one so far has ended.' },
    ],
    quiz: [
      { q: 'What does the S&P 500 measure?', options: ['The price of $500 of gold', 'How 500 of the largest US companies are doing together', 'How many shares were sold today'], answer: 1, why: 'It is an index: one number that follows 500 big companies.' },
      { q: 'Which of these is a bear market?', options: ['Prices falling 20% or more', 'Prices rising for months', 'The market closing for a holiday'], answer: 0, why: 'A bear market is a fall of 20% or more from a recent high.' },
      { q: 'The S&P 500 is up 1% today. What does that tell you?', options: ['Every share rose exactly 1%', 'Large US companies rose about 1% on average', 'Your portfolio rose 1%'], answer: 1, why: 'An index is an average. Single shares can do very differently.' },
    ],
  },
  {
    id: 'cap', level: 3, title: 'Company size (market cap)', minutes: 2, icon: 'resize-outline',
    cards: [
      { title: 'Market cap', body: 'Share price times the number of shares gives the [market cap](cap): what the whole company is worth. One billion shares at $50 each is a $50 billion company.' },
      { title: 'A low price is not cheap', body: 'A $20 share with 10 billion shares is a $200 billion company. A $500 share with 100 million shares is a $50 billion company. Compare companies, never single share prices.' },
      { title: 'Big and small', body: 'Giants tend to be steadier. Smaller companies can grow faster, and can fall faster too.' },
    ],
    quiz: [
      { q: 'A company has 2 billion shares at $40 each. What is its market cap?', options: ['$80 billion', '$40 billion', '$2 billion'], answer: 0, why: '2 billion times $40 is $80 billion.' },
      { q: 'Company A: $10 a share, 5 billion shares. Company B: $200 a share, 100 million shares. Which is bigger?', options: ['B, its share price is higher', 'A: $50 billion against $20 billion', 'They are the same size'], answer: 1, why: 'Size is price times shares. A is $50 billion, B is $20 billion.' },
      { q: 'Compared with giants, small companies usually:', options: ['Swing more', 'Never fall', 'Have higher share prices'], answer: 0, why: 'Less size usually means bigger moves in both directions.' },
    ],
  },
  {
    id: 'markers', level: 3, title: 'Earnings and P/E', minutes: 2, icon: 'speedometer-outline',
    cards: [
      { title: 'The price of earnings', play: 'pe', body: 'Two companies each earn $10 billion a year. Which one are buyers paying more for, per $1 of earnings?' },
      { title: 'The P/E ratio', body: 'That is the [P/E ratio](pe): share price divided by earnings per share. A P/E of 20 means buyers pay $20 for each $1 the company earns in a year.' },
      { title: 'Reading it', body: 'A high P/E means investors expect strong growth. They may be right, or just hopeful. Compare it with companies in the same sector. No earnings means no P/E.' },
    ],
    quiz: [
      { q: 'A share costs $100 and the company earns $5 per share. What is its P/E?', options: ['20', '5', '500'], answer: 0, why: '$100 divided by $5 is 20.' },
      { q: 'A very high P/E means the stock is definitely a bad buy.', options: ['True', 'False'], answer: 1, why: 'A high P/E shows high expectations. It is not good or bad alone.' },
      { q: 'A company made no earnings this year. What is its P/E?', options: ['Zero', 'There is none', '100'], answer: 1, why: 'With nothing to divide by, there is no P/E.' },
    ],
  },
  {
    id: 'dividends', level: 3, title: 'Dividends', minutes: 2, icon: 'cash-outline',
    cards: [
      { title: 'A share of the profit', body: 'A [dividend](dividend) is cash a company pays its owners out of its earnings, usually four times a year.' },
      { title: 'Dividend yield', body: 'The yield is the yearly dividend as a percentage of the share price. A 3% yield pays about $3 a year for every $100 of shares.' },
      { title: 'Not every company pays', body: 'Fast-growing companies often pay nothing and put their profit back into growing. Older, steadier companies tend to pay more.' },
    ],
    quiz: [
      { q: 'A stock has a dividend yield of 3%. About how much does $200 of its shares pay in a year?', options: ['$6', '$3', '$60'], answer: 0, why: '3% of $200 is $6.' },
      { q: 'A company pays no dividend. What is the most likely reason?', options: ['It is failing', 'It is putting its profit back into growing', 'It is breaking the rules'], answer: 1, why: 'Many growing companies reinvest instead of paying out.' },
      { q: 'Where does a dividend come from?', options: ['The company\'s earnings', 'The stock exchange', 'Other investors'], answer: 0, why: 'It is part of the profit, paid to the owners.' },
    ],
  },
  {
    id: 'volatility', level: 3, title: 'Volatility and beta', minutes: 2, icon: 'pulse-outline',
    cards: [
      { title: 'Volatility', body: '[Volatility](volatility) is how much a price swings. A volatile stock can gain or lose several percent in a day.' },
      { title: 'Beta', body: '[Beta](beta) compares a stock\'s swings with the whole market. The market is 1. Above 1 swings more, below 1 swings less.' },
      { title: 'The 52-week range', body: 'The [52-week range](range) shows the lowest and highest price of the past year, and where today\'s price sits between them.' },
    ],
    quiz: [
      { q: 'A stock has a beta of 1.8. What does that suggest?', options: ['It swings more than the market', 'It pays a big dividend', 'It is a small company'], answer: 0, why: 'A beta above 1 means bigger swings than the market overall.' },
      { q: 'A stock has a beta of 0.6. Compared with the market it:', options: ['Swings more', 'Swings less', 'Never moves'], answer: 1, why: 'Below 1 means a calmer ride than the market.' },
      { q: 'What does the 52-week range show?', options: ['The lowest and highest price in the past year', 'The next year\'s prices', 'How many shares exist'], answer: 0, why: 'It is the past year\'s low and high.' },
    ],
  },
  {
    id: 'diversify', level: 4, title: 'Risk and diversification', minutes: 2, icon: 'grid-outline',
    cards: [
      { title: 'Two kinds of risk', body: 'Company [risk](risk) is something going wrong at one business. Market risk is everything falling together. You can shrink the first kind. You cannot escape the second.' },
      { title: 'One sector or three?', play: 'eggs', body: 'You have $9,000. Put it all into airlines, or split it across an airline, a tech company and a food company? Then see what the news brings.' },
      { title: 'Diversification', body: 'Owning companies in different [sectors](sector) means one bad result hurts less. This is [diversification](diversify). Five airlines is not diversified: they share the same risks.' },
    ],
    quiz: [
      { q: 'What is diversification?', options: ['Buying only tech stocks', 'Spreading money across different investments', 'Selling everything'], answer: 1, why: 'Spreading out means one bad result does less damage.' },
      { q: 'A portfolio of five different airlines is well diversified.', options: ['True', 'False'], answer: 1, why: 'They are all in one sector, so the same news hits all five.' },
      { q: 'Which risk can diversification NOT remove?', options: ['One company having a bad year', 'The whole market falling', 'One sector struggling'], answer: 1, why: 'When the whole market falls, most shares fall with it.' },
    ],
  },
  {
    id: 'funds', level: 4, title: 'Funds', minutes: 2, icon: 'layers-outline',
    cards: [
      { title: 'One purchase, many companies', body: 'An [index fund](fund) owns every company in an index. One share of an S&P 500 fund spreads your money across 500 companies.' },
      { title: 'Why investors use them', body: 'A fund is diversified from the first dollar and needs no picking. Many professionals fail to beat a simple index fund over time.' },
      { title: 'Funds in this app', body: 'SPY follows the S&P 500 and QQQ follows the Nasdaq 100. They are in the Funds group. A fund can still fall when the whole market falls.' },
    ],
    quiz: [
      { q: 'What does one share of an S&P 500 fund give you?', options: ['A small piece of 500 companies', 'One share of the biggest company', 'A fixed payment each month'], answer: 0, why: 'The fund holds all 500, so you own a little of each.' },
      { q: 'Which is the most diversified?', options: ['An S&P 500 fund', 'One airline', 'Two car makers'], answer: 0, why: 'The fund holds 500 companies across many sectors.' },
      { q: 'An index fund cannot lose value.', options: ['True', 'False'], answer: 1, why: 'It falls when the market falls. It just does not depend on one company.' },
    ],
  },
  {
    id: 'long-term', level: 4, title: 'Time and compounding', minutes: 2, icon: 'hourglass-outline',
    cards: [
      { title: 'Time smooths the bumps', body: 'Over single days, prices jump around. Over many years, strong companies have tended to grow. This is [long-term investing](longterm).' },
      { title: 'Compounding', play: 'snowball', body: 'Start with $100 growing 10% a year. Each year\'s gain earns its own gain. This is [compounding](compound).' },
      { title: 'Have a reason, and hold', body: 'Trading all the time means guessing short-term moves, and most who do it fall behind. Before you buy, say why in one sentence. If the reason still holds, a falling price alone is no reason to sell.' },
    ],
    quiz: [
      { q: '$100 grows 10% a year. What is it worth after two years?', options: ['$120', '$121', '$110'], answer: 1, why: 'Year one makes $110. Year two adds 10% of $110, which is $11.' },
      { q: 'What usually works better for most investors?', options: ['Trading every day', 'Holding good companies for years', 'Following rumours'], answer: 1, why: 'Trading often relies on guessing short-term moves.' },
      { q: 'Your stock drops 5% in a day but nothing about the company changed. A sensible first step is to:', options: ['Sell at once', 'Buy ten more without thinking', 'Check whether your reason for owning it still holds'], answer: 2, why: 'Decide from your reason for owning it, not from one day\'s move.' },
    ],
  },
  {
    id: 'shop-queue', level: 4, title: 'The company and the crowd', minutes: 4, icon: 'people-outline',
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
  {
    id: 'bermuda', level: 5, title: 'Bermuda: insurance and reinsurance', minutes: 3, icon: 'boat-outline',
    cards: [
      { title: 'How insurance works', body: 'Customers pay a premium each year. If something bad happens, such as a hurricane damaging a building, the insurer pays for it. Most years, most customers do not claim.' },
      { title: 'Reinsurance', body: 'One huge disaster could cost more than an insurer has. So insurers buy insurance themselves. That is [reinsurance](insurance), and Bermuda is one of its biggest centres in the world.' },
      { title: 'How a reinsurer earns', body: 'It collects premiums, pays claims, and invests the money in between. A quiet hurricane season means strong [earnings](earnings). A severe one can mean a loss for the year.' },
      { title: 'Bermuda companies on the exchange', body: 'Butterfield Bank, RenaissanceRe, Arch Capital, Everest, AXIS, Hamilton and SiriusPoint all trade on the NYSE or the Nasdaq in New York. They are in the Bermuda group in this app.' },
      { title: 'The BSX and the dollar', body: 'Bermuda has its own exchange, the BSX. This app uses US prices because they update all day. One Bermuda dollar equals one [US dollar](usd), so no conversion is needed.' },
    ],
    quiz: [
      { q: 'What is reinsurance?', options: ['Insurance for insurance companies', 'A second bank account', 'A type of stock chart'], answer: 0, why: 'Reinsurers take on part of the risk that insurers hold.' },
      { q: 'A very active hurricane season is most likely to make a reinsurer\'s earnings that year:', options: ['Higher', 'Lower', 'Exactly the same'], answer: 1, why: 'More disasters mean more claims to pay.' },
      { q: 'Besides premiums, how does a reinsurer make money?', options: ['By investing the money it holds', 'By selling hurricanes', 'It has no other way'], answer: 0, why: 'Premiums are invested until they are needed to pay claims.' },
      { q: 'How many US dollars is one Bermuda dollar worth?', options: ['Half', 'Two', 'One'], answer: 2, why: 'The Bermuda dollar is fixed one-to-one to the US dollar.' },
    ],
  },
];

export const lesson = (id: string) => LESSONS.find((l) => l.id === id);
/** The lesson that unlocks the Company and Crowd meters. */
export const METERS_LESSON = 'shop-queue';

/** True when the best score saved for a lesson is full marks. */
const full = (scores: Record<string, number>, l: Lesson) => (scores[l.id] ?? -1) >= l.quiz.length;
const sample = (all: Question[], n: number) => {
  const pool = [...all];
  const picked: Question[] = [];
  while (picked.length < n && pool.length) picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return picked;
};

/**
 * A quick review: three questions, only from lessons already passed, so it never asks about something that has
 * not been taught. With nothing passed yet it uses the first lesson. It keeps the learning streak going.
 */
export function reviewLesson(scores: Record<string, number>): Lesson {
  const done = LESSONS.filter((l) => full(scores, l));
  return { id: 'review', level: 0, title: 'Quick review', minutes: 1, icon: 'flash-outline', cards: [], quiz: sample((done.length ? done : [LESSONS[0]]).flatMap((l) => l.quiz), 3) };
}

export const RECAP_QUESTIONS = 5;
export const recapId = (level: number) => `recap-${level}`;
/** The recap at the end of a level: five questions from that level's lessons. Passing it earns the level's badge. */
export function recapLesson(level: number): Lesson | undefined {
  const info = LEVELS.find((x) => x.n === level && x.n < 5);
  if (!info) return undefined;
  return { id: recapId(level), level, title: `Level ${level} recap`, minutes: 2, icon: 'ribbon-outline', cards: [], quiz: sample(LESSONS.filter((l) => l.level === level).flatMap((l) => l.quiz), RECAP_QUESTIONS) };
}
/** Whether every lesson in a level has been passed. */
export const levelDone = (scores: Record<string, number>, level: number) => LESSONS.filter((l) => l.level === level).every((l) => full(scores, l));
