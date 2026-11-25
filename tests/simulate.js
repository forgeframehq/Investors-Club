// A class of 50 students over ten made-up trading days, against the local class server with made-up prices.
// It checks the server keeps every portfolio right while many students trade at once, then takes screenshots of
// what the teacher and one student see. Run it with: ./run-e2e.sh simulate.js
// Nothing here is real: the names are invented and the prices come from the server's MOCK_MARKET mode.
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const APP = process.env.IC_APP || 'http://localhost:8791';
const OUT = process.env.IC_SIM || path.join(require('os').tmpdir(), 'investors-club-sim');
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
const DAYS = 10;
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
const check = (ok, what) => { console.log((ok ? 'ok   ' : 'FAIL ') + what); if (!ok) fails.push(what); };

// A small repeatable random number maker, so every run of the simulation plays out the same way.
let state = 20261125;
const rnd = () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
const pick = (list) => list[Math.floor(rnd() * list.length)];

const times = { trade: [], teacher: [], board: [], join: [] };
let serverErrors = 0;
async function api(route, body, token, kind) {
  const t0 = Date.now();
  const res = await fetch(APP + '/api' + route, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => ({}));
  if (kind) times[kind].push(Date.now() - t0);
  if (res.status >= 500) { serverErrors++; console.log('  server error', res.status, route, JSON.stringify(json).slice(0, 200)); }
  return { status: res.status, ...json };
}
/** Runs the jobs a few at a time, the way a class of students taps at once. */
async function together(jobs, atOnce = 10) {
  for (let i = 0; i < jobs.length; i += atOnce) await Promise.all(jobs.slice(i, i + atOnce).map((j) => j()));
}
const pct = (list, p) => { const s = [...list].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0; };

const FIRST = ['Amara', 'Ben', 'Chloe', 'Dante', 'Eli', 'Farah', 'Gabe', 'Hana', 'Isla', 'Jaden', 'Kai', 'Lena', 'Marcus', 'Nia', 'Omar', 'Priya', 'Quinn', 'Rosa', 'Sam', 'Tia', 'Uma', 'Victor', 'Willow', 'Xavier', 'Yara', 'Zane',
  'Aiden', 'Bella', 'Caleb', 'Daisy', 'Ethan', 'Freya', 'Grace', 'Henry', 'Ivy', 'Jonah', 'Kira', 'Leo', 'Maya', 'Noah', 'Olive', 'Piper', 'Reid', 'Sienna', 'Theo', 'Una', 'Vera', 'Wes', 'Zoe', 'Asha',
  'Bram', 'Cora', 'Dev', 'Esme', 'Finn', 'Gia', 'Hugo', 'Ines', 'Jude', 'Kofi', 'Lila', 'Milo'];
const LAST = ['Adams', 'Baker', 'Clarke', 'Dawson', 'Evans', 'Foster', 'Grant', 'Hughes', 'Irving', 'James', 'Knight', 'Lewis', 'Moore', 'Nash', 'Owens', 'Perry', 'Reid', 'Shaw', 'Turner', 'Vaughn', 'Ward', 'Young'];
const AVATARS = ['surfer', 'snorkeller', 'kite-flyer', 'diver', 'islander', 'explorer', 'turtle', 'robot', 'astronaut', 'aviator', 'pirate-parrot', 'cool-turtle', 'longtail', 'investor-bot'];
const KNOWN = ['RBLX', 'DIS', 'NKE', 'MCD', 'NFLX', 'AAPL', 'GOOGL', 'AMZN', 'SONY', 'EA', 'META', 'KO', 'SBUX', 'TSLA'];
// How each kind of student behaves: how many days in ten they trade, and what they do.
const KINDS = [
  { kind: 'spreader', share: 0.3, active: 0.5, why: ['numbers', 'spread', 'spread', 'know'], learn: 1.4 },
  { kind: 'fan', share: 0.26, active: 0.3, why: ['know', 'know', 'guess'], learn: 0.9 },
  { kind: 'all-in', share: 0.12, active: 0.2, why: ['guess', 'know', ''], learn: 0.4 },
  { kind: 'trader', share: 0.14, active: 0.9, why: ['', '', 'guess', 'numbers'], learn: 0.6 },
  { kind: 'cautious', share: 0.1, active: 0.25, why: ['spread', 'numbers'], learn: 1.2 },
  { kind: 'quiet', share: 0.08, active: 0, why: [''], learn: 0.2 },
];

(async () => {
  // ---- A teacher, a class and 50 students ----
  const teacher = await api('/teacher/signup', { name: 'Ms Simmons', school: 'Warwick Academy', login: 'mssimmons', password: 'apples-and-pears' });
  check(!!teacher.token, 'teacher account created');
  const made = await api('/teacher/classes', { name: 'S2 Investors Club' }, teacher.token);
  const code = made.code;
  check(/^[A-Z0-9]{6}$/.test(code || ''), 'class created');
  const symbols = Object.keys((await api('/quotes')).quotes);
  check(symbols.length === 50, '50 stocks have prices');

  const students = [];
  const used = new Set();
  while (students.length < 50) {
    const first = FIRST[students.length % FIRST.length];
    const last = pick(LAST);
    const name = `${first} ${last[0]}`;
    if (used.has(name)) continue;
    used.add(name);
    let r = rnd(), k = KINDS[0];
    for (const x of KINDS) { if (r < x.share) { k = x; break; } r -= x.share; }
    students.push({ name, fullName: `${first} ${last}`, pin: String(1000 + students.length), avatar: pick(AVATARS), k, token: '', lessons: 0, words: 0, cards: 0, streak: 0, refused: 0, done: 0 });
  }
  await together(students.map((s) => async () => { const j = await api('/join', { code, name: s.name, fullName: s.fullName, pin: s.pin, avatar: s.avatar }, null, 'join'); s.token = j.token; }));
  check(students.every((s) => s.token), 'all 50 students joined, ten at a time');

  // ---- Ten trading days ----
  const history = new Map(students.map((s) => [s.name, []])); // each student's value at the end of each day
  let raceOk = true, ordersOk = true;
  for (let day = 1; day <= DAYS; day++) {
    // Day 6 starts with the market closed: a few students place orders that must fill once it opens.
    const closedStart = day === 6;
    await api('/mock/market', { day, open: !closedStart });
    const quotes = (await api('/quotes')).quotes;
    const early = closedStart ? students.filter((s) => s.k.kind !== 'quiet').slice(0, 8) : [];
    if (closedStart) {
      await together(early.map((s) => async () => { const r = await api('/order', { symbol: pick(KNOWN), side: 'buy', dollars: 150, why: 'know' }, s.token, 'trade'); if (r.status !== 200) s.refused++; }));
      const refusedTrade = await api('/trade', { symbol: 'AAPL', side: 'buy', shares: 1 }, early[0].token);
      check(refusedTrade.status >= 400 && refusedTrade.status < 500, 'day 6: a trade is refused while the market is closed, and orders wait instead');
      await api('/mock/market', { open: true });
      const after = await Promise.all(early.map((s) => api('/me', null, s.token)));
      ordersOk = after.every((m) => m.portfolio && m.portfolio.orders.length === 0);
      check(ordersOk, 'day 6: every waiting order filled when the market opened');
    }

    const cls = (await api(`/teacher/class?code=${code}`, null, teacher.token)).standings;
    const mine = new Map(cls.map((x) => [x.name, x]));
    const jobs = [];
    for (const s of students) {
      const me = mine.get(s.name);
      // Learning moves on most days, faster for some than others.
      if (rnd() < 0.55 * s.k.learn) { s.lessons = Math.min(17, s.lessons + (rnd() < 0.5 ? 1 : 2)); s.words = Math.min(46, s.words + Math.floor(rnd() * 5)); s.cards = Math.min(46, s.cards + Math.floor(rnd() * 4)); s.streak++; } else s.streak = 0;
      const progress = { lessons: s.lessons, words: s.words, cards: s.cards, badges: Math.min(20, Math.floor(s.lessons / 3) + (s.done ? 1 : 0) + (s.streak >= 3 ? 1 : 0)), level: 1 + Math.min(5, Math.floor((s.lessons * 50 + s.words * 10 + s.cards * 10) / 350)), streak: s.streak };
      jobs.push(() => api('/me', { avatar: s.avatar, progress }, s.token));
      if (rnd() >= s.k.active || !me) continue;
      const why = pick(s.k.why);
      const buy = (symbol, dollars) => async () => {
        const shares = Math.floor((dollars / quotes[symbol].price) * 10000) / 10000;
        const r = await api('/trade', { symbol, side: 'buy', shares, why }, s.token, 'trade');
        if (r.status === 200) s.done++; else s.refused++;
      };
      const sell = (h, part) => async () => {
        const r = await api('/trade', { symbol: h.symbol, side: 'sell', shares: Math.floor(h.shares * part * 10000) / 10000 }, s.token, 'trade');
        if (r.status === 200) s.done++; else s.refused++;
      };
      const kind = s.k.kind;
      if (kind === 'spreader') jobs.push(buy(pick(symbols), 300 + Math.round(rnd() * 900)));
      if (kind === 'fan') jobs.push(buy(pick(KNOWN), 500 + Math.round(rnd() * 1500)));
      if (kind === 'all-in') jobs.push(me.holdings.length ? buy(me.holdings[0].symbol, Math.round(me.cash * 0.5)) : buy(pick(KNOWN), Math.round(me.cash * 0.8)));
      if (kind === 'cautious') jobs.push(buy(pick(['SPY', 'QQQ', 'SPY', 'JNJ', 'KO']), 400 + Math.round(rnd() * 600)));
      if (kind === 'trader') {
        if (me.holdings.length && rnd() < 0.6) jobs.push(sell(pick(me.holdings), rnd() < 0.5 ? 1 : 0.5));
        jobs.push(buy(pick(symbols), 400 + Math.round(rnd() * 1600)));
        if (rnd() < 0.3) jobs.push(buy(pick(symbols), 99999)); // tries to spend more than they have
      }
    }
    await together(jobs);

    // Day 4: one student taps Buy twice at the same instant, each for 70% of their cash. Only one may go through.
    if (day === 4) {
      const racer = students.find((s) => s.k.kind === 'fan');
      const before = (await api('/me', null, racer.token)).portfolio;
      const shares = Math.floor(((before.cash * 0.7) / quotes.DIS.price) * 10000) / 10000;
      const both = await Promise.all([1, 2].map(() => api('/trade', { symbol: 'DIS', side: 'buy', shares, why: 'know' }, racer.token)));
      const after = (await api('/me', null, racer.token)).portfolio;
      raceOk = after.cash >= -0.01 && both.filter((r) => r.status === 200).length <= 1 || after.cash >= -0.01;
      check(after.cash >= -0.01, `day 4: two buys at the same instant cannot overspend (cash left ${after.cash.toFixed(2)}, ${both.filter((r) => r.status === 200).length} of 2 went through)`);
    }

    // End of day: the teacher's view must add up for every student.
    const end = await api(`/teacher/class?code=${code}`, null, teacher.token, 'teacher');
    const now = (await api('/quotes')).quotes;
    let bad = 0;
    for (const x of end.standings) {
      const value = x.cash + x.holdings.reduce((sum, h) => sum + h.shares * now[h.symbol].price, 0);
      if (x.cash < -0.01 || Math.abs(value - x.value) > 0.05 || x.holdings.some((h) => h.shares <= 0)) bad++;
      history.get(x.name)?.push(x.value);
    }
    const sorted = end.standings.every((x, i, a) => i === 0 || a[i - 1].value >= x.value - 0.001);
    const trades = end.standings.reduce((n, x) => n + x.trades, 0);
    check(end.standings.length === 50 && bad === 0 && sorted, `day ${day}: 50 portfolios add up and are ranked in order (${trades} trades so far, best ${end.standings[0].gainPct.toFixed(1)}%, worst ${end.standings[49].gainPct.toFixed(1)}%)`);
    const board = await api('/leaderboard', null, students[0].token, 'board');
    if (day === DAYS) check(board.standings.length === 50 && !JSON.stringify(board).includes(students[0].fullName.split(' ')[1] + '"') && !('holdings' in board.standings[0]), 'the student leaderboard has 50 names, with no surnames and no holdings');
  }

  // ---- Limits ----
  const wrong = await api('/join', { code, name: students[0].name, pin: '0000' });
  check(wrong.status === 403, 'a wrong PIN is refused');
  const back = await api('/join', { code, name: students[0].name, pin: students[0].pin });
  check(back.status === 200 && back.portfolio.trades !== undefined, 'the right name and PIN gets a student back in on a new device');
  const extra = [];
  for (let i = 0; i < 11; i++) extra.push(await api('/join', { code, name: `Extra ${String.fromCharCode(65 + i)}`, fullName: `Extra Person${String.fromCharCode(65 + i)}`, pin: '4321', avatar: 'robot' }));
  check(extra.slice(0, 10).every((r) => r.status === 200) && extra[10].status === 403, 'a class takes 60 students and refuses the 61st');
  const totalTrades = students.reduce((n, s) => n + s.done, 0);
  const refused = students.reduce((n, s) => n + s.refused, 0);
  check(serverErrors === 0, 'the server never answered with an error of its own (5xx)');
  const report = {
    students: 50, days: DAYS, trades: totalTrades, refusedAsExpected: refused, serverErrors,
    ms: Object.fromEntries(Object.entries(times).map(([k, v]) => [k, { calls: v.length, typical: pct(v, 0.5), slow: pct(v, 0.95), slowest: Math.max(0, ...v) }])),
  };
  console.log(JSON.stringify(report, null, 1));
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 1));

  // ---- Screenshots ----
  const b = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox', '--no-proxy-server'] });
  const helpers = (p) => {
    const all = async (label) => {
      const h = await p.evaluateHandle((sel) => [...document.querySelectorAll(sel)].filter((e) => e.offsetParent !== null && e.getBoundingClientRect().width > 0), `[aria-label="${label}"]`);
      return [...(await h.getProperties()).values()].map((x) => x.asElement()).filter(Boolean);
    };
    return {
      shot: async (n) => { await sleep(500); await p.screenshot({ path: path.join(OUT, `${n}.png`) }); },
      tap: async (label) => { const arr = await all(label); if (!arr.length) return false; await arr[0].click(); await sleep(500); return true; },
      type: async (label, text) => { const el = (await all(label))[0]; if (!el) return false; await el.click({ clickCount: 3 }); await sleep(200); await el.type(text, { delay: 15 }); return true; },
      text: () => p.evaluate(() => document.body.innerText),
      go: async (route) => { await p.goto(APP + route, { waitUntil: 'networkidle0' }); await sleep(1000); },
    };
  };

  // The teacher, on a laptop.
  const tp = await b.newPage();
  await tp.setViewport({ width: 1366, height: 900, deviceScaleFactor: 1.5 });
  const t = helpers(tp);
  await t.go('/teacher');
  await t.type('Sign-in name', 'mssimmons'); await t.type('Password', 'apples-and-pears'); await t.tap('Sign in as teacher'); await sleep(1500);
  await t.shot('teacher-1-classes');
  await t.go(`/teacher-class?code=${code}`); await sleep(800);
  check((await t.text()).includes('S2 Investors Club'), 'the teacher opens the class of 60');
  await t.shot('teacher-2-overview');
  await t.tap('Students'); await sleep(600); await t.shot('teacher-3-students');
  const top = (await api(`/teacher/class?code=${code}`, null, teacher.token)).standings.filter((x) => x.holdings.length >= 4 && (x.progress?.lessons ?? 0) >= 5)[0];
  await t.tap(`Student ${top.name}`); await sleep(600);
  check((await t.text()).includes(top.fullName), 'the teacher sees the student\'s full name');
  await t.shot('teacher-4-one-student');
  await t.tap('Activity'); await sleep(600); await t.shot('teacher-5-activity');
  await tp.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 }); await sleep(500);
  await t.tap('Students'); await sleep(500); await t.shot('teacher-6-phone');

  // One student, on a phone: a spreader with several holdings, signing in on a new device.
  const s = students.find((x) => x.name === top.name) || students[0];
  const ctx = await b.createBrowserContext();
  const sp = await ctx.newPage();
  await sp.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
  const d = helpers(sp);
  await d.go('/');
  const [first, last] = s.fullName.split(' ');
  await d.tap('Get started'); await d.type('Your first name', first); await d.type('Your last name', last); await d.shot('student-1-name');
  await d.tap(`Picture ${s.avatar.split('-').map((w, i) => (i ? w : w[0].toUpperCase() + w.slice(1))).join(' ')}`); await d.tap('Next'); await d.tap('Keep it simple'); await d.tap('Next');
  await d.tap('Pick Roblox'); await d.tap('Pick Disney'); await d.tap('Pick Nike'); await d.shot('student-2-pick-three'); await d.tap('Next');
  await d.tap('Choose your school'); await sleep(400); await d.shot('student-3-schools'); await d.tap('Warwick Academy'); await sleep(600);
  await d.tap('Choose your class'); await d.tap('S2 Investors Club (Ms Simmons)');
  await d.type('Class code', code); await d.type('PIN', s.pin); await d.shot('student-4-join'); await d.tap('Join my class'); await sleep(2000);
  await d.shot('student-5-first-lesson');
  // The value-over-time graph is drawn from what the device saw each day. This device is new, so give it the
  // student's real end-of-day values from the simulation above.
  const values = history.get(s.name) || [];
  await sp.evaluate((values, passed) => {
    const data = JSON.parse(localStorage.getItem('ic.data') || '{}');
    const day = (back) => { const x = new Date(Date.now() - back * 86400000); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
    if (data.classPortfolio) data.classPortfolio.snapshots = values.map((v, i) => ({ d: day(values.length - 1 - i), v }));
    // Learning is kept on the device too, so give it the lessons this student passed in the simulation.
    data.learned = data.learned || { terms: [], lessons: {}, cards: {}, rounds: 0 };
    for (const id of passed) data.learned.lessons[id] = 4;
    localStorage.setItem('ic.data', JSON.stringify(data));
  }, values, ['market', 'what-is-a-stock', 'exchanges', 'orders', 'prices', 'earnings', 'macro', 'cycles', 'cap', 'markers', 'dividends', 'volatility', 'diversify', 'funds', 'long-term', 'shop-queue', 'bermuda'].slice(0, Math.max(4, s.lessons)));
  await d.go('/'); await d.shot('student-6-home');
  await sp.setViewport({ width: 412, height: 1900, deviceScaleFactor: 2 });
  await d.go('/portfolio'); await d.shot('student-7-portfolio');
  const pt = await d.text();
  check(/Today/.test(pt) && /Allocation/.test(pt) && /% of your portfolio/.test(pt), 'the Portfolio tab shows today\'s gain or loss and the allocation');
  await d.go('/class'); await d.shot('student-8-leaderboard');
  check((await d.text()).includes(`${s.name} (you)`), 'the student sees themselves on a leaderboard of 60');
  await d.go('/learn'); await d.shot('student-9-learn');
  await sp.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
  await d.go(`/stock/${top.holdings[0].symbol}`); await d.shot('student-10-stock');
  await d.go('/settings');
  check(!(await d.text()).includes('Reset practice portfolio'), 'students cannot reset their money');
  await b.close();

  console.log(fails.length ? `\n${fails.length} FAILED` : '\nSimulation passed');
  console.log('Screenshots and report: ' + OUT);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
