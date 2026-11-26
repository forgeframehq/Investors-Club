// End-to-end test. Drives the web build of Investors Club like a student and a teacher would, against a local
// class server with made-up prices. Run it with ./run-e2e.sh (see that file for what it needs).
// Every control is found by its accessibilityLabel, so keep labels on anything pressable.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const APP = process.env.IC_APP || 'http://localhost:8791';
const OUT = process.env.IC_SHOTS || path.join(require('os').tmpdir(), 'investors-club-e2e');
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails.push(what); };
const api = (route, body, token) => fetch(APP + '/api' + route, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined }).then((r) => r.json());

function driver(p, errs) {
  p.on('pageerror', (e) => errs.push(String(e).slice(0, 300)));
  p.on('console', (m) => m.type() === 'error' && errs.push(m.text().slice(0, 300)));
  const visible = (sel) => p.evaluateHandle((sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0), sel);
  const all = async (label) => [...(await (await visible(`[aria-label="${label}"]`)).getProperties()).values()].map((x) => x.asElement()).filter(Boolean);
  return {
    shot: async (n) => { await sleep(400); await p.screenshot({ path: path.join(OUT, `${n}.png`) }); },
    tap: async (label, which = 'first') => { const arr = await all(label); if (!arr.length) return false; await (which === 'last' ? arr[arr.length - 1] : arr[0]).click(); await sleep(500); return true; },
    // Wait 200 ms after clicking a field before typing: a script that types instantly can lose the first character.
    // Select-all first, so a field that already has something in it (the join form fills in your name) is replaced.
    type: async (label, text) => { const el = (await all(label))[0]; if (!el) return false; await el.click({ clickCount: 3 }); await sleep(200); await p.keyboard.down('Control'); await p.keyboard.press('KeyA'); await p.keyboard.up('Control'); await el.type(text, { delay: 30 }); return true; },
    text: () => p.evaluate(() => document.body.innerText),
    data: () => p.evaluate(() => JSON.parse(localStorage.getItem('ic.data') || '{}')),
    go: async (route) => { await p.goto(APP + route, { waitUntil: 'networkidle0' }); await sleep(900); },
    eval: (fn) => p.evaluate(fn),
  };
}

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox', '--no-proxy-server'] });
  const errs = [];
  const p = await b.newPage();
  await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
  const { shot, tap, type, text, data, go } = driver(p, errs);
  // Goes through "Check before you buy": answers each card, then gives a reason. Returns how many cards there were.
  const coach = async (d, reason = 'I know the company') => {
    let cards = 0;
    for (let i = 0; i < 8 && (await d.tap('Check answer 1')); i++) { cards++; await d.tap('Next'); }
    return (await d.tap(`Reason: ${reason}`)) && (await d.tap('Choose how much')) ? cards : -1;
  };
  // Passes a lesson by skipping to its quiz and giving these answers (1 is the first option).
  const pass = async (d, id, answers) => {
    await d.go(`/lesson/${id}`); await d.tap('Skip to the quiz');
    for (const a of answers) { await d.tap(`Answer ${a}`); await sleep(150); if (!(await d.tap('See my score'))) await d.tap('Next question'); }
    await sleep(500);
    let seen = '';
    for (let i = 0; i < 4; i++) { seen += await d.text(); if (!(await d.tap('OK'))) break; await sleep(300); }
    return seen;
  };
  const LEVEL1 = [['market', [1, 2, 2]], ['what-is-a-stock', [2, 1, 2]], ['exchanges', [1, 1, 2]], ['orders', [2, 2, 3]]];
  // The welcome steps up to choosing a school: name, picture, reading level, three companies.
  const welcome = async (d, picture) => (await d.tap('Get started')) && (await d.type('Your first name', 'Sam')) && (await d.type('Your last name', 'Trott')) && (await d.tap(picture)) && (await d.tap('Next')) && (await d.tap('Keep it simple')) && (await d.tap('Next')) && (await d.tap('Pick Roblox')) && (await d.tap('Pick Disney')) && (await d.tap('Pick Nike')) && (await d.tap('Next'));
  let t;

  // ---- Welcome: name, picture, reading level, three companies, school ----
  await go('/'); await shot('00-welcome');
  check((await text()).includes('Welcome to Investors Club'), 'a new student sees the welcome steps');
  check(!(await text()).includes('I am a teacher'), 'the student welcome has no teacher link');
  check(await welcome({ tap, type }, 'Picture Turtle'), 'choose a name, a picture, a reading level and three companies'); await shot('00-welcome-school');
  check((await text()).includes('Find your class') && await tap('Choose your school'), 'the last step asks for the school'); await sleep(500); await shot('00-welcome-schools');
  check((await text()).includes('Warwick Academy') && (await text()).includes('CedarBridge Academy') && await tap('My school is not on the list'), 'every Bermuda school is in the drop-down');
  check(await tap('Start with a practice portfolio'), 'a school with no class starts with the practice portfolio'); await sleep(700); await shot('00-first-lesson');
  t = await text();
  check(t.includes('A market for ownership') && t.includes('Lesson 1 of 17') && t.includes('Roblox'), 'the first lesson is "What is the stock market?", using a company the student picked');
  check(await tap('What does stock market mean?'), 'tap a term in a lesson'); await sleep(300); await shot('00-word');
  check((await text()).includes('Stock market'), 'the term is explained'); await tap('OK'); await sleep(200);
  check(await tap('Skip for now') && !(await text()).includes('A market for ownership'), 'the first lesson can be skipped'); await sleep(400);
  await go('/lesson/prices'); await tap('Next');
  check(await tap('Add a buyer') && /More people want to buy/.test(await text()), 'a lesson card has something to tap'); await shot('00-lesson-play');
  let d = await data();
  check(d.settings.onboarded && d.settings.name === 'Sam' && d.settings.last === 'Trott' && d.settings.avatar === 'turtle' && d.settings.brands.join() === 'RBLX,DIS,NKE' && d.watch.includes('RBLX'), 'the profile and the three companies are saved');

  // ---- The trial buy: step by step, without touching the real portfolio ----
  await go('/'); await shot('01-home-start');
  check((await text()).includes('START HERE') && (await text()).includes('Practice money, not real'), 'home shows where to start and labels the money as practice money');
  await go('/first-buy');
  check(await tap('Choose Roblox') && await tap('Next') && await tap('$25') && await tap('Confirm trial buy'), 'go through the trial buy'); await shot('01-trial-buy');
  d = await data();
  check((await text()).includes('You bought') && d.solo.cash === 10000 && d.solo.trades.length === 0, 'the trial buy leaves the real $10,000 untouched');
  check(await tap('Back to my lessons') && (await data()).settings.triedBuy === true, 'the trial buy is done once');

  // ---- Market ----
  await go('/'); await shot('01-market');
  t = await text();
  check(!t.includes('Welcome to Investors Club'), 'the app opens on the Market after the welcome steps');
  check((await p.$$('img[alt="AAPL logo"], [aria-label="AAPL logo"]')).length > 0, 'stocks show a logo picture when there is one');
  check(t.includes('Apple') && t.includes('Butterfield Bank') && /\$\d+\.\d\d/.test(t), 'Market lists the stocks with prices');
  check(/AAPL\s*\$\d/.test(t.replace(/\n/g, ' ')), 'the ticker tape shows symbols and prices');
  check(await tap('Bermuda'), 'filter by group'); t = await text();
  check(t.includes('RenaissanceRe') && t.includes('Arch Capital') && t.includes('Everest Group') && !t.includes('McDonald'), 'the Bermuda group shows the Bermuda bank and reinsurers only'); await shot('02-market-bermuda');
  check(await tap('All') && await tap('Apple'), 'tap a stock to peek at it'); await sleep(900); await shot('02-peek');
  t = await text();
  check(/Today's high/.test(t) && /Company size/.test(t) && /Trade AAPL/.test(t) && (await p.$$('svg path')).length >= 2, 'the peek shows today\'s numbers, the buttons and a graph');
  check(await tap('Watch') && (await data()).watch.includes('AAPL') && await tap('Watching'), 'watch a stock from the peek');
  await tap('Apple');
  check(await type('Search stocks', 'disn'), 'search'); await sleep(400);
  check((await text()).includes('Disney') && !(await text()).includes('Coca-Cola'), 'search narrows the list');

  // ---- Level 1 unlocks buying ----
  await go('/stock/AAPL'); await sleep(600);
  check(await tap('Buy') && (await text()).includes('Finish Level 1 first'), 'buying is locked until Level 1 is passed'); await shot('02a-buy-locked'); await tap('Cancel');
  await go('/lesson/review'); await sleep(300);
  check(/What is the stock market\?|IPO|two ways a shareholder/.test(await text()), 'with nothing passed, the quick review only asks about the first lesson');
  let got = '';
  for (const [id, answers] of LEVEL1) got += await pass({ go, tap, text }, id, answers);
  check(got.includes('Badge earned: Quick Learner'), 'passing a quiz earns a badge');
  check((await text()).includes('buying is unlocked') && (await text()).includes('Level 1 recap'), 'finishing Level 1 unlocks buying and offers the recap'); await shot('02b-level1-done');
  check(await tap('Level 1 recap') && (await text()).includes('Question 1 of 5'), 'a level ends with a five-question recap');
  d = await data();
  check(d.play.learnStreak === 1 && d.learned.lessons.orders === 3, 'finishing a lesson starts the learning streak');

  // ---- A stock: graph, markers, buying ----
  await go('/stock/AAPL'); await sleep(800); await shot('03-stock');
  t = await text();
  check(t.includes('Makes the iPhone') && /\$\d+\.\d\d/.test(t), 'stock page shows what the company does and its price');
  check(/COMPANY SIZE/i.test(t) && /JUMPINESS/i.test(t) && /DIVIDEND/i.test(t) && /52-WEEK RANGE/i.test(t), 'markers are shown before buying');
  check((await p.$$('svg path')).length >= 2, 'the price graph is drawn');
  check(/15-minute steps/.test(t), 'the graph opens on today in 15-minute steps');
  check(t.includes('Pass the lesson') && !/RSI \d/.test(t), 'the Company and Crowd meters are locked until the last lesson is passed');
  check(await tap('3M'), 'change the graph range');
  check(await tap('Marker Company size'), 'open a marker'); await shot('04-marker-explained');
  check((await text()).includes('What the whole company is worth'), 'the marker is explained in plain words'); await tap('OK');
  check(await tap('Add to watchlist'), 'star the stock');
  check(await tap('Buy') && (await text()).includes('Check before you buy') && !(await text()).includes('Skip the check'), 'a buy starts with the check, which cannot be skipped at first'); await shot('05-coach');
  check((await coach({ tap })) === 5, 'the check has five cards and then asks for a reason'); await shot('05-buy-sheet');
  check((await text()).includes('Your reason: I know the company'), 'the buy sheet shows the reason');
  check(await type('Amount', '500'), 'type an amount'); await sleep(300); await shot('06-buy-amount');
  check(/You get/.test(await text()), 'the sheet says how many shares that buys');
  check(await tap('Confirm buy'), 'confirm'); await sleep(900); await shot('07-first-badge');
  t = await text();
  check(t.includes('Badge earned: First Trade'), 'first trade earns a badge'); for (let i = 0; i < 3 && (await tap('OK')); i++) await sleep(400);
  d = await data();
  check(d.solo.holdings.length === 1 && d.solo.holdings[0].symbol === 'AAPL' && Math.abs(d.solo.cash - 9500) < 1, 'practice portfolio saved: Apple held, about $500 spent');
  check(d.solo.trades[0].why === 'know' && d.learned.checked.includes('AAPL'), 'the reason is saved with the trade');
  check(await tap('Buy') && (await coach({ tap })) > 0 && await type('Amount', '999999') && (await text()).includes('in cash'), 'cannot spend more than the cash'); await tap('Cancel');
  check(await tap('Sell') && await tap('Half') && await tap('Confirm sell'), 'sell half'); await sleep(900);
  d = await data();
  check(d.solo.trades.length === 2 && d.solo.cash > 9700, 'selling adds the cash back');

  // ---- Market closed: orders wait and fill at the open ----
  await api('/mock/market', { open: false });
  await go('/'); await shot('07a-market-closed');
  check(/market is closed/i.test(await text()), 'the home screen says when the market is closed');
  await go('/stock/MSFT'); await sleep(600);
  check(await tap('Buy') && (await coach({ tap }, 'The numbers look good')) > 0 && /Place an order now|place an order now/i.test(await text()), 'when the market is closed the buy sheet explains that orders wait'); await shot('07b-order-sheet');
  check(await type('Amount', '300') && await tap('Place buy order'), 'place an order for the open'); await sleep(700);
  d = await data();
  check(d.solo.orders.length === 1 && d.solo.orders[0].symbol === 'MSFT' && d.solo.orders[0].dollars === 300 && d.solo.trades.length === 2, 'the order waits; no trade happens yet');
  await go('/portfolio'); await shot('07c-waiting-order');
  check((await text()).includes('Waiting orders') && (await text()).includes('Microsoft'), 'the waiting order shows in the portfolio');
  await api('/mock/market', { open: true });
  await go('/'); await sleep(900);
  d = await data();
  check(d.solo.orders.length === 0 && d.solo.trades.length === 3 && d.solo.trades[0].symbol === 'MSFT', 'the order fills once the market opens');
  check(d.solo.trades[0].why === 'numbers', 'the reason given with an order stays with the trade when it fills');
  await go('/stock/KO'); await sleep(500);
  check(await tap('Buy') && (await coach({ tap }, 'Just a guess')) > 0 && await type('Amount', '100') && await tap('Confirm buy'), 'a third buy, still with the check'); await sleep(900);
  for (let i = 0; i < 3 && (await tap('OK')); i++) await sleep(300);
  await go('/stock/DIS'); await sleep(500);
  check(await tap('Buy') && (await text()).includes('Skip the check') && await tap('Skip the check') && (await text()).includes('Buy Disney'), 'after three buys the check can be skipped'); await tap('Cancel');

  // ---- Portfolio ----
  await go('/portfolio'); await shot('08-portfolio');
  t = await text();
  check(t.includes('Practice portfolio') && t.includes('Apple') && t.includes('First Trade') && t.includes('Recent trades'), 'Portfolio shows value, holdings, badges and trades');

  // ---- Learn ----
  await go('/learn'); await shot('09-learn');
  t = await text();
  check(t.includes('Learning path') && /\d of 17 lessons done/.test(t) && t.includes('UP NEXT') && t.includes('Learning streak') && t.includes('Level 1: The basics') && t.includes('Level 4: Investing well') && t.includes('Bonus: Bermuda'), 'Learn shows the path in four levels, what is next, and the learning streak');
  check(await tap('Lesson Company size (market cap)'), 'open a lesson'); await sleep(500); await shot('10-lesson');
  check(await tap('Skip to the quiz') && (await text()).includes('What is its market cap?'), 'any lesson can be skipped straight to its quiz');
  for (const a of [1, 2, 21]) { await tap(`Answer ${a % 10}`); await sleep(200); if (a === 2) await shot('11-quiz'); await tap((await text()).includes('See my score') ? 'See my score' : 'Next question'); }
  await sleep(600); await shot('12-lesson-done');
  t = await text();
  t = await text();
  check(t.includes('You scored 3 of 3') && t.includes('Next lesson: Earnings and P/E'), 'full marks recorded, and the next lesson is offered');
  await go('/lesson/review'); await sleep(400);
  for (let i = 0; i < 3; i++) { await tap('Answer 1'); await sleep(200); await tap(i === 2 ? 'See my score' : 'Next question'); }
  await sleep(400); await shot('12-review');
  check(/You scored \d of 3/.test(await text()), 'the quick review asks three questions');
  for (let i = 0; i < 3 && (await tap('OK')); i++) await sleep(300);

  // ---- The shop and the queue: meters unlock after the last lesson, and a real-chart game ----
  await go('/lesson/shop-queue'); await sleep(400);
  for (let i = 0; i < 5; i++) await tap('Next');
  check((await text()).includes('Company or crowd?') && await tap('The company') && /about the company/.test(await text()), 'the company-or-crowd game is part of the last lesson'); await shot('12-shop-queue');
  await tap('Next one'); await tap('Next'); await tap('Start the quiz');
  for (const a of [1, 2, 2, 3]) { await tap(`Answer ${a}`); await sleep(200); await tap((await text()).includes('See my score') ? 'See my score' : 'Next question'); }
  await sleep(500);
  for (let i = 0; i < 3 && (await tap('OK')); i++) await sleep(300);
  check((await text()).includes('Company meter and a Crowd meter'), 'passing the last lesson unlocks the meters');
  await go('/stock/AAPL'); await sleep(900); await shot('12-meters');
  t = await text();
  check(/COMPANY METER/i.test(t) && /CROWD METER/i.test(t) && /RSI \d+/.test(t), 'every stock now shows the Company meter and the Crowd meter');
  check(await tap('See the math') && /RSI = 100 - 100/.test(await text()), 'the Crowd meter shows its math'); await shot('12-math'); await tap('OK');
  await go('/what-next'); await sleep(900);
  check(await tap('It went up') && /Over the next month the price went (up|down)/.test(await text()), 'the real-chart game reveals what happened next'); await shot('12-what-next');
  await go('/glossary');
  check(await tap('Word Dividend') && (await text()).includes('pocket money'), 'glossary explains a word simply'); await shot('13-glossary');
  check((await data()).learned.terms.includes('dividend'), 'the word is marked as read');

  // ---- Progress ladder ----
  await go('/learn');
  check(await tap('Open the progress ladder'), 'open the progress ladder from Learn'); await sleep(400); await shot('12a-ladder');
  t = await text();
  check(t.includes('Tycoon') && t.includes('You are here') && t.includes('How to climb'), 'the ladder shows every rung, where you are, and how to climb');
  await go('/profile');
  check((await p.$$('[aria-label^="Picture "]')).length === 20 && !(await text()).includes('Unlocks at'), 'every character is free to choose');

  // ---- Daily missions and the up-or-down game ----
  await go('/learn'); await shot('13-daily');
  t = await text();
  check(t.includes("Today's missions") && t.includes('in a row') && t.includes('Up or down?'), 'Learn shows the streak, the daily missions and the up-or-down game');
  check(await tap('Up'), 'make an up-or-down guess'); await sleep(400);
  d = await data();
  check(d.play.guess && d.play.guess.pick === 'up' && (await text()).includes('Come back tomorrow'), 'the guess is saved until the price moves');
  check(d.play.day && d.play.done.length >= 1 && d.play.done.length <= 3, 'things done today tick off the missions that ask for them');

  // ---- Flashcards ----
  await go('/learn');
  check(await tap('Play flashcards') && await tap('Start 10 cards'), 'start a round of flashcards'); await shot('13a-flashcard-front');
  check((await text()).includes('Card 1 of 10'), 'the round has ten cards');
  check((await text()).includes('Pick an answer'), 'a flashcard asks you to pick the meaning');
  for (let i = 0; i < 10; i++) {
    await tap('Answer 1'); await sleep(450);
    if (i === 0) { await shot('13b-flashcard-back'); check(/Correct!|Not quite/.test(await text()), 'picking an answer flips the card to show the right meaning'); }
    await tap(i === 9 ? 'See my score' : 'Next card'); await sleep(150);
  }
  await sleep(600);
  // Several badges can arrive at once (reading ten words is one too), each in its own box.
  let seen = '';
  for (let i = 0; i < 5; i++) { seen += await text(); if (!(await tap('OK'))) break; await sleep(300); }
  check(seen.includes('Badge earned: Card Flipper'), 'finishing a round earns a badge');
  await shot('13c-flashcards-done');
  t = await text();
  check(/You got \d+ of 10/.test(t), 'the round ends with a score');
  d = await data();
  check(d.learned.rounds === 1 && Object.keys(d.learned.cards).length === 10, 'flashcard answers are saved');

  // ---- Class: teacher makes an account and a class, student joins and trades ----
  await go('/teacher'); await shot('14-teacher-sign-in');
  check(await tap('Create an account') && await type('Teacher name', 'Ms Smith') && await tap('Choose your school') && await tap('Warwick Academy') && await type('Sign-in name', 'mssmith') && await type('Password', 'apples-and-pears') && await tap('Create account'), 'teacher creates an account'); await sleep(1500);
  check((await text()).includes('Ms Smith') && (await text()).includes('No classes yet'), 'the teacher is signed in and has no classes yet'); await shot('14-teacher-home');
  check(await type('Class name', 'P6 Blue') && await tap('Create class'), 'teacher creates a class'); await sleep(1500); await shot('15-teacher-empty');
  t = await text();
  const code = (t.match(/Class code\s+([A-Z0-9]{6})/) || [])[1];
  const teacherToken = (await data()).teacher.token;
  check(!!code && t.includes('Nobody has joined yet'), 'the class page shows the join code and an empty class');

  // A second student joins straight through the API so the leaderboard has someone to compare with.
  const other = await api('/join', { code, name: 'Alex R', pin: '4321' });
  await api('/trade', { symbol: 'DIS', side: 'buy', shares: 3 }, other.token);

  // Class orders: the server holds them while the market is closed and fills them when it opens.
  await api('/mock/market', { open: false });
  check(/market is closed/i.test((await api('/trade', { symbol: 'KO', side: 'buy', shares: 1 }, other.token)).error || ''), 'the class server refuses trades while the market is closed');
  const waiting = await api('/order', { symbol: 'KO', side: 'buy', dollars: 500 }, other.token);
  check(waiting.portfolio && waiting.portfolio.orders.length === 1, 'a class order waits on the server');
  check(/costs more/.test((await api('/order', { symbol: 'KO', side: 'buy', dollars: 999999 }, other.token)).error || ''), 'an order for more than your cash is refused');
  await api('/mock/market', { open: true });
  const filled = await api('/me', { progress: null }, other.token);
  check(filled.portfolio.orders.length === 0 && filled.portfolio.holdings.some((h) => h.symbol === 'KO'), 'the class order is filled when the market opens');

  const ctx = await b.createBrowserContext();
  const sp = await ctx.newPage();
  await sp.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
  const s = driver(sp, errs);
  await s.go('/teacher');
  t = await s.text();
  check(t.includes('Teacher area') && t.includes('What you get as a teacher') && !t.includes('Welcome to Investors Club'), 'the teacher address opens the teacher area, without the student welcome steps');
  await s.go('/');
  check(await welcome(s, 'Picture Robot'), 'a new student goes through the welcome steps'); await s.shot('16-join-school');
  check(await s.tap('Choose your school') && await s.tap('Warwick Academy') && await s.tap('Choose your class') && await s.tap('P6 Blue (Ms Smith)'), 'student chooses their school and class from the drop-downs'); await s.shot('16-join-chosen');
  check((await s.text()).includes('Your class will see you as Sam T') && await s.type('Class code', code) && await s.type('PIN', '1234') && await s.tap('Join my class'), 'student joins with code, name and PIN'); await sleep(1500);
  check((await s.text()).includes('A market for ownership'), 'after joining, the first lesson opens');
  await s.go('/class'); await sleep(900); await s.shot('17-leaderboard');
  t = await s.text();
  check(t.includes('P6 Blue') && t.includes('Sam T (you)') && t.includes('Alex R'), 'student sees the class leaderboard');
  check(t.includes('Bermuda schools') && t.includes('Warwick Academy (your school)'), 'student sees the table of schools');
  await s.go('/stock/NTB');
  for (const [id, answers] of LEVEL1) await pass(s, id, answers);
  await s.go('/stock/NTB');
  check(await s.tap('Buy') && (await coach(s, 'To spread my risk')) > 0 && await s.type('Amount', '2000') && await s.tap('Confirm buy'), 'student buys in the class portfolio, after the check'); await sleep(1200);
  await s.tap('OK'); await sleep(300); await s.tap('OK');
  await s.go('/portfolio'); await s.shot('18-class-portfolio');
  t = await s.text();
  check(t.includes('class portfolio') && t.includes('Butterfield Bank'), 'Portfolio switches to the class portfolio');
  const wrong = await api('/join', { code, name: 'Sam T', pin: '0000' });
  check(/PIN does not match/.test(wrong.error || ''), 'someone else cannot take a name without the PIN');
  const back = await api('/join', { code, name: 'sam t', pin: '1234' });
  check(back.portfolio && back.portfolio.holdings.length === 1, 'the same name and PIN signs back in on another device');

  // ---- Teacher view ----
  await go('/teacher'); await sleep(900); await shot('19-teacher-classes');
  t = await text();
  check(t.includes('P6 Blue') && t.includes('2 students') && t.includes('class average'), 'the teacher sees the class with its size and average');
  check(t.includes('Teacher area') && t.includes('Warwick Academy') && t.includes('Links to share'), 'the teacher area has its own header and the links to share');
  check(/Prices: up to date for 50 of 50 stocks/.test(t), 'the teacher area says whether prices are up to date');
  check(await tap('Class P6 Blue'), 'open the class'); await sleep(900); await shot('19-teacher-class');
  t = await text();
  check(t.includes('Class summary') && t.includes('Most held') && t.includes('Worth a word') && t.includes('2 students'), 'the class overview shows a summary, popular stocks and who needs a word');
  check(await tap('Students'), 'open the students tab'); await sleep(400);
  t = await text();
  check(t.includes('Sam T') && t.includes('Alex R') && t.includes('Download spreadsheet'), 'the students tab lists both students and offers a spreadsheet');
  check(await tap('Student Sam T'), 'open a student'); await shot('19-teacher-student');
  t = await text();
  check(/bought .* of NTB/.test(t) && t.includes('Learning') && t.includes('Butterfield Bank'), "teacher sees the student's holdings, trades and learning");
  check(t.includes('reason: To spread my risk') && t.includes('Did the check on 1 of 1 buy'), 'teacher sees why the student bought and how often they checked first');
  check(await tap('Most learned') && await tap('Name'), 'sort the students');
  await p.setViewport({ width: 1366, height: 800, deviceScaleFactor: 1 }); await sleep(600); await shot('19-teacher-laptop');
  check((await text()).includes('LAST ACTIVE'), 'on a laptop the students are shown as a table');
  await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 }); await sleep(300);
  check(await tap('Activity'), 'open the activity tab'); await sleep(300); await shot('19-teacher-activity');
  check(/Sam T bought .* of Butterfield Bank/.test(await text()), 'the activity tab lists the class\'s latest trades');
  check(await tap('Settings') && await tap('Pause trading'), 'pause trading for the class'); await sleep(900); await shot('19-teacher-settings');
  check(/paused trading/.test((await api('/trade', { symbol: 'DIS', side: 'buy', shares: 1 }, other.token)).error || ''), 'a paused class cannot trade');
  check(await tap('Pause trading'), 'turn trading back on'); await sleep(900);
  check(!!(await api('/trade', { symbol: 'DIS', side: 'buy', shares: 1 }, other.token)).trade, 'trading works again once it is turned back on');
  const cls = await api(`/teacher/class?code=${code}`, null, teacherToken);
  const sam = cls.standings.find((x) => x.name === 'Sam T');
  check(sam && sam.holdings[0].symbol === 'NTB' && Math.abs(sam.cash - 8000) < 1, 'the class server holds the trade');
  const board = await api('/leaderboard', null, (await s.data()).cls.token);
  check(board.standings && board.standings.some((x) => x.name === 'Sam T'), 'the student leaderboard shows first name and last initial');
  check(sam && sam.fullName === 'Sam Trott' && !JSON.stringify(board).includes('Trott'), 'the teacher gets the full name; the student leaderboard never does');
  await s.go('/settings');
  check((await s.text()).includes('Sign out') && !(await s.text()).includes('Start over'), 'a student in a class can sign out, for shared tablets');
  check(sam && sam.buys === 1 && sam.checked === 1 && sam.recent[0].why === 'spread', 'the class server keeps the reason for the buy');
  const alex = cls.standings.find((x) => x.name === 'Alex R');
  check(alex && alex.buys >= 2 && alex.checked === 0, 'buys made without the check are counted as unchecked');
  const steps = await api('/intraday?symbol=AAPL');
  check(steps.points && steps.points.length === 26 && steps.points[1].t - steps.points[0].t === 900000, 'the server gives today in 15-minute steps');
  check(Object.keys((await api('/quotes')).quotes).length === 50, 'the server has prices for all 50 stocks');
  check(sam && sam.avatar === 'robot' && sam.progress && sam.progress.level >= 1 && !!sam.seen, "the class server knows the student's picture and learning");
  const bad = await api(`/teacher/class?code=${code}`, null, 'nope');
  check(!!bad.error, 'the teacher view needs a signed-in teacher');
  const other2 = await api('/teacher/signup', { name: 'Mr Jones', school: 'Saltus Grammar School', login: 'mrjones', password: 'plums-and-figs' });
  const made2 = await api('/teacher/classes', { name: 'M2 Red', start_cash: 10000 }, other2.token);
  const wrongClass = await api('/join', { class: (await api('/school-classes?school=' + encodeURIComponent('Saltus Grammar School'))).classes[0].id, code, name: 'Pat Q', pin: '9999' });
  check(!!made2.code && /not the code for M2 Red/.test(wrongClass.error || ''), "one class's code does not open another class");
  check(!!other2.token && !!(await api(`/teacher/class?code=${code}`, null, other2.token)).error, "a teacher cannot open another teacher's class");
  check(/do not match/.test((await api('/teacher/login', { login: 'mssmith', password: 'wrong-password' })).error || ''), 'a wrong password is refused');
  const again = await api('/teacher/login', { login: 'MsSmith', password: 'apples-and-pears' });
  check(!!again.token && (await api('/teacher/classes', null, again.token)).classes.length === 1, 'the teacher can sign in on another device and see the class');

  await go('/settings'); await shot('20-settings');
  t = await text();
  check(!t.includes('Start over') && !t.includes('Sign out') && t.includes('Reset this device'), 'Settings has the temporary reset for testing, and no sign out without a class');
  const has = (rgb) => p.evaluate((c) => [...document.querySelectorAll('div')].some((e) => getComputedStyle(e).backgroundColor === c), rgb);
  check(await tap('Dark') && (await data()).settings.theme === 'dark' && await has('rgb(13, 25, 36)') && !(await has('rgb(255, 243, 238)')), 'dark mode recolours the app'); await shot('20-settings-dark');
  await go('/'); await shot('20-home-dark'); await go('/portfolio'); await shot('20-portfolio-dark'); await go('/settings');
  const sizeOf = () => p.evaluate(() => parseFloat(getComputedStyle([...document.querySelectorAll('div')].find((e) => e.innerText === 'Text size')).fontSize));
  const before = await sizeOf();
  check(await tap('Large') && (await sizeOf()) > before, 'large text makes the text bigger'); await shot('20-settings-large');
  check(await tap('Less') && (await data()).settings.lessMotion === true, 'less movement can be switched on');
  await tap('Normal'); await tap('Full'); await tap('Light');
  check(await has('rgb(255, 243, 238)'), 'and back to light');
  await go('/teacher'); await sleep(600);
  check(await tap('Reset this device') && await tap('Reset'), 'a teacher can reset the device'); await sleep(900);
  d = await data();
  check((await text()).includes('Welcome to Investors Club') && !d.settings.onboarded && d.solo.trades.length === 0 && !d.teacher, 'resetting clears this device and shows the welcome steps again');
  await welcome({ tap, type }, 'Picture Turtle'); await tap('Practise on my own for now'); await sleep(500);
  await go('/settings'); await shot('21-settings-clean');
  t = await text();
  check(!t.includes('Market data') && !t.includes('For teachers') && !/key/i.test(t), 'Settings has no setup screens or teacher link for students');
  check(await tap('Reset this device') && await tap('Reset'), 'the temporary reset asks first'); await sleep(900);
  check((await text()).includes('Welcome to Investors Club') && !(await data()).settings.onboarded, 'and goes back to the start');
  await welcome({ tap, type }, 'Picture Turtle'); await tap('Practise on my own for now'); await sleep(500);
  await go('/class');
  check(!(await text()).includes('I am a teacher') && (await text()).includes('Choose your school'), 'the Class tab has no teacher link');

  const real = errs.filter((e) => !/Failed to load resource|favicon/.test(e));
  check(real.length === 0, 'no errors in the browser console' + (real.length ? ': ' + real.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nAll passed');
  console.log('Screenshots: ' + OUT);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
