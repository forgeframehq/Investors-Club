# Investors Club

A stock market game for schools in Bermuda. Students invest practice money in 50 real companies at real prices,
read each stock's markers before choosing, learn the vocabulary, and compete on a class leaderboard.

- `app/` — the app (React Native + Expo). One codebase gives the Android app and the website.
- `backend/` — the class server (Cloudflare Worker + D1). Shares prices between everyone, runs classes and the
  leaderboard, and serves the website. Optional: the app works alone as a practice portfolio.
- `tests/` — end-to-end test that drives the web build against a local server with made-up prices.
- `.github/workflows/android.yml` — builds the APK on GitHub.

## The app

A new student starts with four welcome steps: what the app is, a first name and a picture (chosen from built-in
twenty characters, never a photo), a reading level, and which portfolio to start with (class or practice).

Four tabs:

- **Market** — the home screen: your portfolio value and today's change, shortcuts, the day's biggest rise and
  fall, a scrolling ticker, then the 50 stocks with logo, price and a green or red change block. Tapping a stock
  opens a peek under it (today's high, low and open, company size, and the past month as a graph) with a Trade
  button. Filter by group, search, sort.
- **Portfolio** — total value, gain since the start, your mix by group, holdings, badges, investor level, trades.
- **Progress ladder** (from Learn or the profile) — six rungs from Rookie to Tycoon, where you stand, and what
  earns points. Points come from learning and good habits, never from trading more.
- **Learn** — three daily missions with a streak, an up-or-down guessing game, six short lessons with quizzes,
  flashcards (ten a round: pick the meaning from three and the card flips to show the answer; the ones you miss
  come back first), and a 45-word glossary with each word explained at
  two reading levels.
- **Class** — choose your school and class, then join with the class code from your teacher, a first name with
  last initial, and a PIN. Then the class leaderboard and a table of Bermuda schools by average change.

A stock's page shows what the company does, the price, a graph (1W / 1M / 3M / 1Y) and its **markers**: company
size, price-to-earnings, dividend, jumpiness (beta), 52-week range, past year's change and sales growth. Each
marker shows the real number, a plain word ("Giant", "Calm", "Steady payout") and a meter; tapping it explains it.

Buying and selling is in dollars or shares (fractions allowed, no fees). Badges and levels reward learning and
spreading risk, never trading often.

**Teachers** have their own area at `/teacher` (the student app has no link to it), with its own header and no
student tabs. They make an account with their school, a sign-in name and a password, then create as many
classes as they need. Each class has its own join code and starting cash. A class page shows a summary (how many
have traded, the average change, the most held stocks) and every student with their holdings, recent trades, when
they were last active, and what they have learned (level, lessons, words, flashcards, badges). Students can be
sorted by value, name, learning or activity. A teacher can reset a student's PIN, remove a student, start a new
round, or delete a class. Signing in on another device shows the same classes.

A class page has four tabs. **Overview**: the join code, how many have traded, the average change, average
learning per student, the most held stocks, and "Worth a word" (who has not traded, who has been away a week,
who has almost everything in one stock). **Students**: the sortable list or table, with a spreadsheet download
on the website. **Activity**: the class's latest trades. **Settings**: pause trading, allow trading only while
the market is open, rename, new round, delete.

### Trading hours and orders

Trading follows the real US markets (NYSE and Nasdaq): 9:30 am to 4 pm New York time on weekdays, which is
10:30 am to 5 pm in Bermuda all year, shut on market holidays and closing at 1 pm New York time (2 pm Bermuda)
on the early-close days. The dates are in `app/src/lib/provider.ts`; update them each year from the NYSE calendar.

While the market is open, a trade happens straight away at the current price. While it is closed, a student
places an **order** instead. Orders wait (up to ten per student, shown under "Waiting orders" on the Portfolio
tab, where they can be cancelled) and are filled at the first price after the market opens, which can differ from
the last price they saw, exactly as with a real broker. An order that can no longer happen (the price rose past
the student's cash) is dropped with a note saying why. In a class the server holds and fills the orders, on its
ten-minute timer or the next time the student opens the app; in practice mode the device does.

What is still simpler than the real thing: no trading fees, fractions of a share are allowed, there are only
market orders (no limit or stop orders), no pre-market or after-hours trading, and prices can be up to a minute
old.

### Logos

Logo pictures are not stored in this repo. The class server asks Finnhub for each company's logo address a few at
a time and the app loads the pictures from there and keeps them on the device. A stock with no logo (the fund,
usually) shows its letters instead, and so does everything when there is no connection. Check Finnhub's terms for
showing logos before charging schools, as with prices.

### Where prices come from

Prices are real, so they need the internet. Everything else (lessons, glossary, your portfolio at the last prices
seen) works offline. Trades always use a price fetched that second.

The Investors Club server is the only source. It holds the data keys ([Finnhub](https://finnhub.io) for prices
and markers, [Twelve Data](https://twelvedata.com) for graphs), keeps one shared copy of each price and refreshes
it on a timer, so a whole class uses about as much data as one person. The app has no setup screen and takes no
keys; the teacher area shows whether prices are up to date.

The "Today" graph shows the latest trading day in 15-minute steps. The server builds it from the prices it
already fetches (free), and fills gaps from Twelve Data at most once an hour per stock.

**Request budget:** Finnhub's free key allows 60 requests a minute and a price refresh costs one per stock, so
keep the list at 50 stocks or fewer. The timer job adds at most 5 more a run (3 markers, 2 logos).

**Before charging schools:** both free plans are for personal, non-commercial use. A paid product shown to
students needs a data plan that allows display to users (Twelve Data calls this "external display"; ask Finnhub
for commercial terms). Price that in.

### Get an APK

The "Android APK" workflow runs only when asked: change `.github/apk-build` and push, or use "Run workflow" on
the Actions tab. The newest build is always
<https://github.com/forgeframehq/investors-club/releases/download/latest/InvestorsClub.apk>.

## The class server

1. Deploy it. In the Cloudflare dashboard: Workers & Pages → Create application → Import a repository → this
   repo. Set the project name to `investors-club` (it must match `name` in `backend/wrangler.jsonc`), the root
   directory to `backend`, and the build command to `node build-web.mjs`. That command builds the website, so
   the same address is the web app; Cloudflare's builds ignore the build command in `wrangler.jsonc`, so it has
   to be typed in. The D1 database already exists (its id is in `backend/wrangler.jsonc`) and the tables create
   themselves on first use.
2. Add secrets (Worker → Settings → Variables and Secrets):
   - `FINNHUB_KEY` — prices and markers.
   - `TWELVE_KEY` — graphs.
   - `SCHOOL_KEY` — optional but recommended: any phrase you choose. Teachers must enter it to create an
     account, which stops strangers making classes on your server.
3. The app is built to use `https://investors-club.forgeframehq.workers.dev` (see `.github/workflows/android.yml`;
   the repository variable `INVESTORS_CLUB_SERVER_URL` overrides it). The website needs nothing: it uses the
   address it was loaded from.

### How it stays inside the free data plans

- Finnhub allows 60 requests a minute. The server keeps prices for 60 seconds while the market is open (15
  minutes when closed) and lets only one request at a time refresh them.
- Twelve Data allows 8 a minute and 800 a day. Each stock's graph is kept for 12 hours and markers for 24.
- A timer every 10 minutes refreshes prices and tops up the oldest few graphs, markers and logo addresses.

### Fair play

In a class, the server keeps every portfolio and fills each trade at its own price, so editing the app's saved
data changes nothing. The trading rules are one file shared by app and server (`app/src/lib/rules.ts`).

## Code layout

- `app/src/data/` — the 50 stocks, glossary, lessons, profile pictures, and how markers are worded.
- `app/src/lib/store.ts` — everything saved on the device, portfolio maths, badges and levels.
- `app/src/lib/market.ts` — picks the price source and caches what it fetches.
- `app/src/lib/provider.ts`, `rules.ts` — shared with the server. Keep them free of React Native imports.
- `app/src/lib/classroom.ts` — calls to the class server.
- `app/src/app/` — one file per screen. `(tabs)/index.tsx` is the Market tab, so the app opens on it.
- `app/src/ui/welcome.tsx` — the welcome steps, drawn over the app until `settings.onboarded` is set.
- `backend/src/index.ts` — the whole server.

## Testing

```bash
cd app && npm install && npx tsc --noEmit
CI=1 npx expo export --platform android --output-dir /tmp/out
cd ../backend && npm install && npx tsc --noEmit
cd ../tests && ./run-e2e.sh
```

The end-to-end test uses made-up prices and plain coloured shapes for logos (`MOCK_MARKET`), so the real Finnhub
and Twelve Data calls, including real logos, are not covered by it. Check those on a phone with real keys.

## Not built yet

- Teacher choosing which stocks a class can trade.
- Bermuda Stock Exchange prices (no free feed).
- Dividends paid into portfolios, and stock splits.
- Resetting a forgotten teacher password, and moving a class from one teacher to another.
- A school-wide view for a head teacher across several teachers' classes.
- A photo as a profile picture (deliberately left out: photos of children need a school's consent).

## Learning path (added 2026-11-24)

- Ten lessons in order, from "Money, companies and profit" to "The shop and the queue", told through one story
  (Sunny's lemonade stand). Cards can hold something to tap (`ui/play.tsx`) and hard words that open the glossary
  (`[word](term-id)` in `data/lessons.ts`). `{b1}` to `{b3}` are the three companies picked at sign-up.
- Sign-up ends with a school drop-down (every Bermuda school), then the class and its code. The first lesson
  opens straight after, and a trial buy (`/first-buy`) uses a spare $100 that never touches the portfolio.
- "Check before you buy" (`ui/coach.tsx`) runs before a buy: required for the first three, optional after. The
  reason picked is saved with the trade (`why`) and shown to the teacher with how often the check was done.
- Passing the last lesson unlocks a Company meter (P/E) and a Crowd meter (RSI, `lib/meters.ts`) on every stock.
- One learning streak: a lesson, a flashcard round or a three-question review (`/lesson/review`) counts for a day.
