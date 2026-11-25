// The learning path: ten short lessons, in order, that start from nothing. One story runs through them all:
// Sunny's lemonade stand. Each lesson is a few cards (one idea each, some with something to tap) and a quiz.
//
// In card text:
//   [shares](share)   a hard word. It is underlined, and tapping it shows the glossary entry with that id.
//   {b1} {b2} {b3}    the three companies the student picked when they signed up (see brands() in the store).
export interface Question { q: string; options: string[]; answer: number; why: string }
/** Something to tap on a card instead of only reading it. Each kind is drawn by ui/play.tsx. */
export type PlayKind = 'profit' | 'slices' | 'seesaw' | 'pe' | 'eggs' | 'snowball' | 'sort';
export interface LessonCard { title: string; body: string; play?: PlayKind; /** Avatar ids of the characters in this card. */ who?: string[] }
export interface Lesson { id: string; title: string; minutes: number; icon: string; cards: LessonCard[]; quiz: Question[] }

/** The characters in the story. They are pictures from the avatar list, not real people. */
export const SUNNY = 'islander';
export const KAI = 'explorer';
export const ZURI = 'kite-flyer';

export const LESSONS: Lesson[] = [
  {
    id: 'money', title: 'Money, companies and profit', minutes: 2, icon: 'cash-outline',
    cards: [
      { title: 'Meet Sunny', who: [SUNNY], body: 'Sunny lives in Bermuda and makes the best lemonade on the island. One hot Saturday she sets up a stand near Horseshoe Bay.' },
      { title: 'A company sells something', body: 'A [company](company) makes or sells something people want. Sunny\'s stand is a tiny company. {b1} is a giant one. The idea is the same.' },
      { title: 'Money in, money out', play: 'profit', body: 'A cup sells for $2. The lemons, sugar and cup cost $1. Sell some cups and see what is left over.' },
      { title: 'Profit', body: 'The money left after paying the costs is called [profit](profit). Profit is why companies exist. The owners can keep it, or use it to grow.' },
      { title: 'Growing costs money', who: [SUNNY], body: 'Sunny wants a second stand in St. George\'s. It costs $200. She has $40. Where could the rest come from? That is the next lesson.' },
    ],
    quiz: [
      { q: 'What is a company?', options: ['A kind of bank account', 'People who make or sell something others want', 'A place to keep money safe'], answer: 1, why: 'A company makes or sells things. Sunny\'s stand is one. So is a giant like Disney.' },
      { q: 'Sunny sells 10 cups for $2 each. Her costs were $10. What is her profit?', options: ['$20', '$2', '$10'], answer: 2, why: '$20 came in and $10 went out, so $10 is left. That is the profit.' },
      { q: 'What can owners do with profit?', options: ['Keep it or use it to grow', 'Nothing, it disappears', 'They must give it away'], answer: 0, why: 'Profit belongs to the owners. They can keep it or put it back into the company.' },
    ],
  },
  {
    id: 'market', title: 'What is the stock market?', minutes: 3, icon: 'storefront-outline',
    cards: [
      { title: 'Sunny needs $200', who: [SUNNY], body: 'She could save for months. Or she could ask friends to put money in now, and give each of them a piece of the stand in return.' },
      { title: 'Slices of the stand', play: 'slices', body: 'Cut the stand into equal pieces. Each piece is called a [share](share).' },
      { title: 'Owners together', body: 'A friend who buys a share now owns part of the stand. If the stand makes a profit, part of it is theirs. People who do this are called [investors](investor).' },
      { title: 'A market for shares', body: 'Later, one friend wants their money back. They can sell their share to somebody else. A place where people buy and sell shares is a [stock market](market).' },
      { title: 'The real thing', body: '{b1} and {b2} did exactly what Sunny did, only bigger: millions of shares, bought and sold on a [stock exchange](exchange) in New York.' },
      { title: 'Practice money, real prices', body: 'In this app you get $10,000 of practice money. It is not real, so you cannot lose anything. The prices are real, so what you learn is real.' },
    ],
    quiz: [
      { q: 'Why did Sunny sell pieces of her stand?', options: ['To get money to grow', 'To close the stand', 'Because lemons ran out'], answer: 0, why: 'Selling shares brought in the money for a second stand.' },
      { q: 'What is a stock market?', options: ['A shop that sells lemonade', 'A place where people buy and sell shares', 'A bank for companies'], answer: 1, why: 'It is where shares change hands between buyers and sellers.' },
      { q: 'Is the money in this app real?', options: ['Yes', 'Only on weekdays', 'No, it is practice money'], answer: 2, why: 'The money is for practice. Only the prices are real.' },
    ],
  },
  {
    id: 'what-is-a-stock', title: 'What is a share worth?', minutes: 3, icon: 'pie-chart-outline',
    cards: [
      { title: 'One slice', who: [SUNNY], body: 'Sunny cut her stand into 10 shares and sold them for $20 each. Whoever holds one share owns one tenth of the stand.' },
      { title: 'What is the whole stand worth?', body: '10 shares at $20 each makes $200. The share price times the number of shares tells you the [size of the company](cap).' },
      { title: 'Bigger numbers, same sum', body: '{b1} has millions of shares. Multiply them by the share price and you get what the whole company is worth.' },
      { title: 'A low price is not a bargain', body: 'A $5 share is not a better deal than a $500 share. It depends how many shares there are. Compare whole companies, not single share prices.' },
      { title: 'You can own a little', body: 'You do not have to buy a whole share. Here you can put $10 into any company and own a [fraction of a share](fraction).' },
      { title: 'How owners gain, and lose', body: 'If the stand does well, people will pay more for a share. Some companies also pay owners a [dividend](dividend). If it does badly, a share is worth less. Nothing is guaranteed.' },
    ],
    quiz: [
      { q: 'What do you own when you buy a share?', options: ['A loan to the company', 'A small piece of the company', 'One of its products'], answer: 1, why: 'A share is a piece of the company itself.' },
      { q: 'A stand has 10 shares at $30 each. What is the whole stand worth?', options: ['$300', '$30', '$40'], answer: 0, why: '10 shares times $30 is $300.' },
      { q: 'A $5 share is always a better deal than a $500 share.', options: ['True', 'False'], answer: 1, why: 'The price of one share says nothing alone. It depends how many shares the company has.' },
      { q: 'Can a share price go down?', options: ['No, never', 'Only on weekends', 'Yes, it can'], answer: 2, why: 'Prices rise and fall. No share price is guaranteed.' },
    ],
  },
  {
    id: 'prices', title: 'Why prices go up and down', minutes: 3, icon: 'trending-up-outline',
    cards: [
      { title: 'Who decides the price?', body: 'Nobody sets it. The [price](price) is just what the last buyer and the last seller agreed on.' },
      { title: 'Buyers and sellers', play: 'seesaw', body: 'Add buyers or sellers for a share of Sunny\'s stand and watch the price.' },
      { title: 'News brings buyers', who: [SUNNY], body: 'A heat wave is coming, so Sunny will sell more lemonade. More people want her shares. A rainy summer does the opposite.' },
      { title: 'It is about what people expect', body: 'A company can have a good year and its price can still fall, if people were hoping for even better.' },
      { title: 'Nobody knows tomorrow', body: 'Day-to-day moves are close to impossible to predict. That is why many investors think in years.' },
    ],
    quiz: [
      { q: 'More people want to buy a share than sell it. What usually happens?', options: ['The price rises', 'The price falls', 'Nothing'], answer: 0, why: 'More buyers than sellers pushes the price up.' },
      { q: 'A company reports good profits but the price falls. Why might that be?', options: ['The market made a mistake', 'People expected even more', 'Prices only fall on Mondays'], answer: 1, why: 'Prices move on results compared with what was expected.' },
      { q: 'Who can reliably predict tomorrow\'s price?', options: ['Experts on TV', 'Anyone with a chart', 'Nobody'], answer: 2, why: 'Short-term moves are not reliably predictable by anyone.' },
    ],
  },
  {
    id: 'markers', title: 'How to read a company', minutes: 4, icon: 'speedometer-outline',
    cards: [
      { title: 'Look before you buy', body: 'Every stock here shows markers: quick facts about the company and its price. Reading them is what makes a choice instead of a guess.' },
      { title: 'Size', body: '[Company size](cap) is what the whole company is worth. Giants tend to be steadier. Small companies can grow faster but carry more [risk](risk).' },
      { title: 'The price of profit', play: 'pe', body: 'Two stands each make $10 profit a year. Which one costs more for each $1 of profit?' },
      { title: 'P/E', body: 'That number is called [P/E](pe): the price buyers pay for each $1 of yearly profit. A high P/E means people expect profit to grow. They may be right, or just hopeful.' },
      { title: 'Dividend and jumpiness', body: 'A [dividend](dividend) is cash paid to owners. [Jumpiness](beta) shows how much the price swings: above 1 is jumpier than the market, below 1 is calmer.' },
      { title: 'No single marker decides', body: 'Markers describe a stock. They never tell you to buy. Look at several together, and ask what the company actually does.' },
    ],
    quiz: [
      { q: 'What does company size measure?', options: ['The price of one share', 'What the whole company is worth', 'Last year\'s profit'], answer: 1, why: 'It is the share price times the number of shares.' },
      { q: 'A stock has a jumpiness of 1.8. What does that suggest?', options: ['It swings more than the market', 'It pays a big dividend', 'It is a small company'], answer: 0, why: 'Above 1 means bigger swings than the market overall.' },
      { q: 'A very high P/E means the stock is definitely a bad buy.', options: ['True', 'False'], answer: 1, why: 'A high P/E shows high hopes. It is not good or bad alone.' },
      { q: 'What is a dividend?', options: ['A fee for trading', 'A type of chart', 'Cash a company pays its owners'], answer: 2, why: 'Dividends are a share of profits paid to the owners.' },
    ],
  },
  {
    id: 'diversify', title: 'Risk and spreading', minutes: 3, icon: 'grid-outline',
    cards: [
      { title: 'What is risk?', body: '[Risk](risk) is the chance that things turn out worse than you hoped. Every share has some.' },
      { title: 'One basket or three?', play: 'eggs', body: 'You have $90. Put it all into lemonade, or spread it across lemonade, umbrellas and ice cream? Then see what the summer brings.' },
      { title: 'Spread it out', body: 'Owning several companies in different [groups](sector) means one bad result hurts less. This is called [diversification](diversify).' },
      { title: 'Funds do it for you', body: 'A [fund](fund) owns hundreds of companies in one purchase. It is the simplest way to spread your money.' },
      { title: 'Cash counts too', body: 'Keeping some [cash](cash) means you can buy when you find something you like. Cash does not grow, though, so it is a balance.' },
    ],
    quiz: [
      { q: 'What is diversification?', options: ['Buying only tech stocks', 'Spreading money across different investments', 'Selling everything'], answer: 1, why: 'Spreading out means one bad result does less damage.' },
      { q: 'Which is the most spread out?', options: ['An S&P 500 fund', 'One airline', 'Two car makers'], answer: 0, why: 'The fund holds 500 companies across many groups.' },
      { q: 'Why keep some cash?', options: ['It grows fastest', 'It is required', 'So you can buy later without selling'], answer: 2, why: 'Cash gives you room to act on new ideas.' },
    ],
  },
  {
    id: 'long-term', title: 'Time and patience', minutes: 3, icon: 'hourglass-outline',
    cards: [
      { title: 'Patience pays', body: 'Over single days, prices jump around. Over many years, strong companies have tended to grow. Time smooths out the bumps.' },
      { title: 'The snowball', play: 'snowball', body: 'Start with $100 that grows 10% a year. Each year\'s gain earns its own gain. This is [compounding](compound).' },
      { title: 'Trading a lot rarely helps', body: 'Buying and selling all the time means guessing short-term moves. Most people who do it end up behind those who simply held.' },
      { title: 'Have a reason', body: 'Before you buy, say why in one sentence. If the reason is still true later, a falling price alone is not a reason to sell.' },
    ],
    quiz: [
      { q: 'What is compounding?', options: ['Gains earning their own gains', 'Paying a fee each trade', 'Selling at a loss'], answer: 0, why: 'Growth builds on earlier growth, like a snowball.' },
      { q: 'What usually works better for most investors?', options: ['Trading every day', 'Holding good companies for years', 'Following rumours'], answer: 1, why: 'Trading often relies on guessing short-term moves.' },
      { q: 'Your stock drops 5% in a day but nothing about the company changed. A sensible first step is to:', options: ['Sell at once', 'Buy ten more without thinking', 'Check whether your reason for owning it still holds'], answer: 2, why: 'Decide from your reason for owning it, not from one day\'s move.' },
    ],
  },
  {
    id: 'orders', title: 'How buying and selling works', minutes: 3, icon: 'swap-horizontal-outline',
    cards: [
      { title: 'Buying', body: 'To [buy](buy), you say how many dollars or shares you want. You pay the price at that moment, and the shares join your [portfolio](portfolio).' },
      { title: 'Selling', body: 'To [sell](sell), you swap shares back for cash at the price at that moment. Sell for more than you paid and you made a gain. Sell for less and it is a loss.' },
      { title: 'The market has opening hours', body: 'US markets are open Monday to Friday, from 10:30 am to 5 pm Bermuda time. They close at weekends and on holidays. These are the [market hours](hours).' },
      { title: 'Orders that wait', body: 'When the market is closed you can still place an order. It waits, then is filled at the first price after the market opens. That price may be higher or lower than the one you saw.' },
      { title: 'Check before you buy', body: 'Before a buy, this app asks you to look at the company and say why you are buying. An investor with a reason learns more than one with a guess.' },
    ],
    quiz: [
      { q: 'When are US markets open, in Bermuda time?', options: ['All day, every day', 'Monday to Friday, 10:30 am to 5 pm', 'Only on Saturdays'], answer: 1, why: 'Weekdays from 10:30 am to 5 pm in Bermuda, except market holidays.' },
      { q: 'You place a buy order on Saturday. What happens?', options: ['It waits until the market opens', 'It is filled at once', 'It is thrown away'], answer: 0, why: 'The order waits and is filled at the first price after the market opens.' },
      { q: 'You bought a share for $20 and sell it for $25. What happened?', options: ['A $5 loss', 'Nothing', 'A $5 gain'], answer: 2, why: 'You sold for $5 more than you paid.' },
    ],
  },
  {
    id: 'bermuda', title: 'Bermuda: insurance and reinsurance', minutes: 3, icon: 'boat-outline',
    cards: [
      { title: 'What is insurance?', body: 'People pay a little each year. If something bad happens, like a hurricane damaging the roof, the insurance company pays for the repair.' },
      { title: 'Insurance for insurers', body: 'One huge hurricane could cost more than an insurer has. So insurers buy insurance too. That is called [reinsurance](insurance).' },
      { title: 'A small island with a big role', body: 'Bermuda is one of the world\'s largest centres for reinsurance. When a big storm hits somewhere in the world, Bermuda companies help pay to rebuild.' },
      { title: 'Local companies you can follow', body: 'Some Bermuda companies trade in New York, such as Butterfield Bank, RenaissanceRe and Arch Capital. They are in the Bermuda group in this app.' },
      { title: 'Bermuda has an exchange too', body: 'The Bermuda Stock Exchange (BSX) lists local companies. This app uses US prices because they update all day.' },
      { title: 'Same dollar value', body: 'One Bermuda dollar equals one [US dollar](usd), so the prices you see here need no conversion.' },
    ],
    quiz: [
      { q: 'What is reinsurance?', options: ['Insurance for insurance companies', 'A second bank account', 'A type of stock chart'], answer: 0, why: 'Reinsurers share the risk that insurers take on.' },
      { q: 'What is the BSX?', options: ['A US bank', 'The Bermuda Stock Exchange', 'A fund'], answer: 1, why: 'The BSX is Bermuda\'s own stock exchange.' },
      { q: 'How many US dollars is one Bermuda dollar worth?', options: ['Half', 'Two', 'One'], answer: 2, why: 'The Bermuda dollar is fixed one-to-one to the US dollar.' },
    ],
  },
  {
    id: 'shop-queue', title: 'The shop and the queue', minutes: 4, icon: 'people-outline',
    cards: [
      { title: 'Two friends, one stand', who: [KAI, ZURI], body: 'Kai and Zuri both want a share of Sunny\'s stand. They look at two very different things.' },
      { title: 'Kai looks at the shop', who: [KAI], body: 'Kai asks: is this a good business? How much profit does it make, and what does a share cost for that profit? That is the company. Its number is the [P/E](pe).' },
      { title: 'Zuri looks at the queue', who: [ZURI], body: 'Zuri asks: how many people are rushing to buy right now? A long queue means lots of buying lately. An empty pavement means people have lost interest. That is the crowd.' },
      { title: 'The Crowd meter', body: 'Investors measure the queue with a number from 0 to 100 called [RSI](rsi). Above 70 is a big queue: the price has climbed a lot lately. Below 30 the crowd has walked away.' },
      { title: 'A queue is not a reason', body: 'A long queue does not make the lemonade taste better. Crowds can be right, or just excited. The shop tells you what you are buying. The queue only tells you the mood.' },
      { title: 'Shop or queue?', play: 'sort', body: 'Is each sentence about the company, or about the crowd?' },
      { title: 'Use both', who: [KAI, ZURI], body: 'Look at the shop first, then glance at the queue. Pass this lesson and every stock shows you a Company meter and a Crowd meter.' },
    ],
    quiz: [
      { q: 'Which question is about the company (the shop)?', options: ['How much profit does it make?', 'How many people bought this week?', 'Is the price jumping today?'], answer: 0, why: 'Profit is about the business itself.' },
      { q: 'The Crowd meter (RSI) is at 85. What does that tell you?', options: ['The company makes a big profit', 'The price has climbed a lot lately', 'You must buy now'], answer: 1, why: 'A high RSI means lots of recent buying. It says nothing about the business, and it is never an instruction.' },
      { q: 'A long queue proves the lemonade is good.', options: ['True', 'False'], answer: 1, why: 'Crowds can be right or just excited. Check the shop as well.' },
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
