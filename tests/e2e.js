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
  };
}

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox', '--no-proxy-server'] });
  const errs = [];
  const p = await b.newPage();
  await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
  const { shot, tap, type, text, data, go } = driver(p, errs);
  let t;

  // ---- Welcome: name, picture, reading level, portfolio ----
  await go('/'); await shot('00-welcome');
  check((await text()).includes('Welcome to Investors Club'), 'a new student sees the welcome steps');
  check(await tap('Get started') && await type('Your first name', 'Sam') && await tap('Picture Planet'), 'choose a name and a picture'); await shot('00-welcome-profile');
  check(await tap('Next') && await tap('Keep it simple') && await tap('Next'), 'choose a reading level'); await shot('00-welcome-portfolio');
  check(await tap('Practice portfolio'), 'choose the practice portfolio'); await sleep(500);
  let d = await data();
  check(d.settings.onboarded && d.settings.name === 'Sam' && d.settings.avatar === 'planet', 'the profile is saved and the welcome steps do not come back');

  // ---- Market ----
  await go('/'); await shot('01-market');
  t = await text();
  check(!t.includes('Welcome to Investors Club'), 'the app opens on the Market after the welcome steps');
  check((await p.$$('img[alt="AAPL logo"], [aria-label="AAPL logo"]')).length > 0, 'stocks show a logo picture when there is one');
  check(t.includes('Apple') && t.includes('Butterfield Bank') && /\$\d+\.\d\d/.test(t), 'Market lists the stocks with prices');
  check(/AAPL\s*\$\d/.test(t.replace(/\n/g, ' ')), 'the ticker tape shows symbols and prices');
  check(await tap('Bermuda'), 'filter by group'); t = await text();
  check(t.includes('RenaissanceRe') && t.includes('Arch Capital') && t.includes('Everest Group') && !t.includes('McDonald'), 'the Bermuda group shows the Bermuda bank and reinsurers only'); await shot('02-market-bermuda');
  check(await tap('All') && await type('Search stocks', 'disn'), 'search'); await sleep(400);
  check((await text()).includes('Disney') && !(await text()).includes('Coca-Cola'), 'search narrows the list');

  // ---- A stock: graph, markers, buying ----
  await go('/stock/AAPL'); await sleep(800); await shot('03-stock');
  t = await text();
  check(t.includes('Makes the iPhone') && /\$\d+\.\d\d/.test(t), 'stock page shows what the company does and its price');
  check(/COMPANY SIZE/i.test(t) && /JUMPINESS/i.test(t) && /DIVIDEND/i.test(t) && /52-WEEK RANGE/i.test(t), 'markers are shown before buying');
  check((await p.$$('svg path')).length >= 2, 'the price graph is drawn');
  check(await tap('3M'), 'change the graph range');
  check(await tap('Marker Company size'), 'open a marker'); await shot('04-marker-explained');
  check((await text()).includes('What the whole company is worth'), 'the marker is explained in plain words'); await tap('OK');
  check(await tap('Add to watchlist'), 'star the stock');
  check(await tap('Buy'), 'open the buy sheet'); await shot('05-buy-sheet');
  check(await type('Amount', '500'), 'type an amount'); await sleep(300); await shot('06-buy-amount');
  check(/You get/.test(await text()), 'the sheet says how many shares that buys');
  check(await tap('Confirm buy'), 'confirm'); await sleep(900); await shot('07-first-badge');
  t = await text();
  check(t.includes('Badge earned: First Trade'), 'first trade earns a badge'); await tap('OK'); await sleep(400);
  d = await data();
  check(d.solo.holdings.length === 1 && d.solo.holdings[0].symbol === 'AAPL' && Math.abs(d.solo.cash - 9500) < 1, 'practice portfolio saved: Apple held, about $500 spent');
  check(await tap('Buy') && await type('Amount', '999999') && (await text()).includes('in cash'), 'cannot spend more than the cash'); await tap('Cancel');
  check(await tap('Sell') && await tap('Half') && await tap('Confirm sell'), 'sell half'); await sleep(900);
  d = await data();
  check(d.solo.trades.length === 2 && d.solo.cash > 9700, 'selling adds the cash back');

  // ---- Portfolio ----
  await go('/portfolio'); await shot('08-portfolio');
  t = await text();
  check(t.includes('Practice portfolio') && t.includes('Apple') && t.includes('First Trade') && t.includes('Recent trades'), 'Portfolio shows value, holdings, badges and trades');

  // ---- Learn ----
  await go('/learn'); await shot('09-learn');
  check(await tap('Lesson What is a stock?'), 'open a lesson'); await sleep(500); await shot('10-lesson');
  for (let i = 0; i < 4; i++) await tap(i === 3 ? 'Start the quiz' : 'Next');
  check((await text()).includes('What do you own when you buy a share?'), 'quiz starts after the cards');
  for (const a of [2, 1, 3]) { await tap(`Answer ${a}`); await sleep(200); if (a === 2) await shot('11-quiz'); await tap((await text()).includes('See my score') ? 'See my score' : 'Next question'); }
  await sleep(600); await shot('12-lesson-done');
  t = await text();
  check(t.includes('Badge earned: Quick Learner'), 'passing a quiz earns a badge'); await tap('OK'); await sleep(300);
  check((await text()).includes('You scored 3 of 3'), 'full marks recorded');
  await go('/glossary');
  check(await tap('Word Dividend') && (await text()).includes('pocket money'), 'glossary explains a word simply'); await shot('13-glossary');
  check((await data()).learned.terms.includes('dividend'), 'the word is marked as read');

  // ---- Daily missions and the up-or-down game ----
  await go('/learn'); await shot('13-daily');
  t = await text();
  check(t.includes("Today's missions") && t.includes('in a row') && t.includes('Up or down?'), 'Learn shows the daily missions and the up-or-down game');
  check(await tap('Up'), 'make an up-or-down guess'); await sleep(400);
  d = await data();
  check(d.play.guess && d.play.guess.pick === 'up' && (await text()).includes('Come back tomorrow'), 'the guess is saved until the price moves');
  check(d.play.day && d.play.done.length >= 1 && d.play.done.length <= 3, 'things done today tick off the missions that ask for them');

  // ---- Flashcards ----
  await go('/learn');
  check(await tap('Play flashcards') && await tap('Start 10 cards'), 'start a round of flashcards'); await shot('13a-flashcard-front');
  check((await text()).includes('Card 1 of 10'), 'the round has ten cards');
  for (let i = 0; i < 10; i++) {
    await tap('Flip the card'); await sleep(350);
    if (i === 0) { await shot('13b-flashcard-back'); check(await tap('Still learning'), 'a card can be marked as still learning'); }
    else await tap('I knew it');
  }
  await sleep(600);
  // Several badges can arrive at once (reading ten words is one too), each in its own box.
  let seen = '';
  for (let i = 0; i < 5; i++) { seen += await text(); if (!(await tap('OK'))) break; await sleep(300); }
  check(seen.includes('Badge earned: Card Flipper'), 'finishing a round earns a badge');
  await shot('13c-flashcards-done');
  t = await text();
  check(t.includes('You knew 9 of 10') && t.includes('Worth another look'), 'the round ends with a score and the missed card');
  d = await data();
  check(d.learned.rounds === 1 && Object.values(d.learned.cards).filter((n) => n === 1).length === 9, 'flashcard answers are saved');

  // ---- Class: teacher makes an account and a class, student joins and trades ----
  await go('/teacher'); await shot('14-teacher-sign-in');
  check(await tap('Create an account') && await type('Teacher name', 'Ms Smith') && await type('Sign-in name', 'mssmith') && await type('Password', 'apples-and-pears') && await tap('Create account'), 'teacher creates an account'); await sleep(1500);
  check((await text()).includes('Ms Smith') && (await text()).includes('No classes yet'), 'the teacher is signed in and has no classes yet'); await shot('14-teacher-home');
  check(await type('Class name', 'P6 Blue') && await tap('Create class'), 'teacher creates a class'); await sleep(1500); await shot('15-teacher-empty');
  t = await text();
  const code = (t.match(/Class code\s+([A-Z0-9]{6})/) || [])[1];
  const teacherToken = (await data()).teacher.token;
  check(!!code && t.includes('Nobody has joined yet'), 'the class page shows the join code and an empty class');

  // A second student joins straight through the API so the leaderboard has someone to compare with.
  const other = await api('/join', { code, name: 'Alex R', pin: '4321' });
  await api('/trade', { symbol: 'DIS', side: 'buy', shares: 3 }, other.token);

  const ctx = await b.createBrowserContext();
  const sp = await ctx.newPage();
  await sp.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
  const s = driver(sp, errs);
  await s.go('/');
  check(await s.tap('Get started') && await s.type('Your first name', 'Sam') && await s.tap('Picture Gamer') && await s.tap('Next') && await s.tap('Next') && await s.tap('Class portfolio'), 'a new student chooses the class portfolio in the welcome steps'); await sleep(600); await s.shot('16-join');
  check((await s.text()).includes('Join your class'), 'choosing the class portfolio opens the join form');
  check(await s.type('Class code', code) && await s.type('Your name', 'Sam T') && await s.type('PIN', '1234') && await s.tap('Join class'), 'student joins with code, name and PIN'); await sleep(1200); await s.shot('17-leaderboard');
  t = await s.text();
  check(t.includes('P6 Blue') && t.includes('Sam T (you)') && t.includes('Alex R'), 'student sees the class leaderboard');
  await s.go('/stock/NTB');
  check(await s.tap('Buy') && await s.type('Amount', '2000') && await s.tap('Confirm buy'), 'student buys in the class portfolio'); await sleep(1200);
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
  check(await tap('Class P6 Blue'), 'open the class'); await sleep(900); await shot('19-teacher-class');
  t = await text();
  check(t.includes('Sam T') && t.includes('Alex R') && t.includes('Students (2)') && t.includes('Class summary') && t.includes('Most held'), 'the class page shows a summary and both students');
  check(await tap('Student Sam T'), 'open a student'); await shot('19-teacher-student');
  t = await text();
  check(/bought .* of NTB/.test(t) && t.includes('Learning') && t.includes('Butterfield Bank'), "teacher sees the student's holdings, trades and learning");
  check(await tap('Most learned') && await tap('Name'), 'sort the students');
  await p.setViewport({ width: 1366, height: 800, deviceScaleFactor: 1 }); await sleep(600); await shot('19-teacher-laptop');
  check((await text()).includes('LAST ACTIVE'), 'on a laptop the students are shown as a table');
  await p.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 }); await sleep(300);
  const cls = await api(`/teacher/class?code=${code}`, null, teacherToken);
  const sam = cls.standings.find((x) => x.name === 'Sam T');
  check(sam && sam.holdings[0].symbol === 'NTB' && Math.abs(sam.cash - 8000) < 1, 'the class server holds the trade');
  check(sam && sam.avatar === 'gamer' && sam.progress && sam.progress.level >= 1 && !!sam.seen, "the class server knows the student's picture and learning");
  const bad = await api(`/teacher/class?code=${code}`, null, 'nope');
  check(!!bad.error, 'the teacher view needs a signed-in teacher');
  const other2 = await api('/teacher/signup', { name: 'Mr Jones', login: 'mrjones', password: 'plums-and-figs' });
  check(!!other2.token && !!(await api(`/teacher/class?code=${code}`, null, other2.token)).error, "a teacher cannot open another teacher's class");
  check(/do not match/.test((await api('/teacher/login', { login: 'mssmith', password: 'wrong-password' })).error || ''), 'a wrong password is refused');
  const again = await api('/teacher/login', { login: 'MsSmith', password: 'apples-and-pears' });
  check(!!again.token && (await api('/teacher/classes', null, again.token)).classes.length === 1, 'the teacher can sign in on another device and see the class');

  await go('/settings'); await shot('20-settings');
  await go('/market-data'); await shot('21-market-data');
  check((await text()).includes('Prices come from the class server'), 'Market data shows where prices come from');

  const real = errs.filter((e) => !/Failed to load resource|favicon/.test(e));
  check(real.length === 0, 'no errors in the browser console' + (real.length ? ': ' + real.slice(0, 3).join(' | ') : ''));
  await b.close();
  console.log(fails.length ? `\n${fails.length} FAILED` : '\nAll passed');
  console.log('Screenshots: ' + OUT);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
