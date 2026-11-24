# Investors Club

A stock market game for schools in Bermuda. Students invest pretend money in 35 real companies at real prices,
read each stock's markers before choosing, learn the vocabulary, and compete on a class leaderboard.

- `app/` — the app (React Native + Expo). One codebase gives the Android app and the website.
- `backend/` — the class server (Cloudflare Worker + D1). Shares prices between everyone, runs classes and the
  leaderboard, and serves the website. Optional: the app works alone as a practice portfolio.
- `tests/` — end-to-end test that drives the web build against a local server with made-up prices.
- `.github/workflows/android.yml` — builds the APK on GitHub.

## The app

A new student starts with four welcome steps: what the app is, a first name and a picture (chosen from built-in
pictures, never a photo), a reading level, and which portfolio to start with (class or practice).

Four tabs:

- **Market** — a scrolling ticker, then the 35 stocks with logo, price and today's change. Filter by group, search, sort.
- **Portfolio** — total value, gain since the start, your mix by group, holdings, badges, investor level, trades.
- **Learn** — three daily missions with a streak, an up-or-down guessing game, six short lessons with quizzes,
  flashcards (ten a round, the ones you miss come back first), and a 45-word glossary with each word explained at
  two reading levels.
- **Class** — choose your school and class, then join with the class code from your teacher, a first name with
  last initial, and a PIN. Then the class leaderboard and a table of Bermuda schools by average change.

A stock's page shows what the company does, the price, a graph (1W / 1M / 3M / 1Y) and its **markers**: company
size, price-to-earnings, dividend, jumpiness (beta), 52-week range, past year's change and sales growth. Each
marker shows the real number, a plain word ("Giant", "Calm", "Steady payout") and a meter; tapping it explains it.

Buying and selling is in dollars or shares (fractions allowed, no fees). Badges and levels reward learning and
spreading risk, never trading often.

**Teachers** (Settings → For teachers) make an account with their school, a sign-in name and a password, then create as many
classes as they need. Each class has its own join code and starting cash. A class page shows a summary (how many
have traded, the average change, the most held stocks) and every student with their holdings, recent trades, when
they were last active, and what they have learned (level, lessons, words, flashcards, badges). Students can be
sorted by value, name, learning or activity. A teacher can reset a student's PIN, remove a student, start a new
round, or delete a class. Signing in on another device shows the same classes.

No email addresses anywhere: students are a name and a PIN inside one class, and a teacher is a sign-in name and
a password. That also means a forgotten teacher password cannot be reset yet (see "Not built yet").

### Schools

Teachers pick their school from the list in `app/src/data/schools.ts` (or type it if it is missing). Students
only see schools that have a class. The schools table shows averages only: no student or class is named. The
public system is being reorganised, so check the list each school year.

### The stocks

Thirty well-known companies and one fund, plus a Bermuda group: Butterfield Bank and the Bermuda reinsurers that
trade on a US exchange (RenaissanceRe, Arch Capital, Everest Group, AXIS Capital, Hamilton Insurance, SiriusPoint).
Other names with a big presence on the island have no share price to show: PartnerRe and Enstar are privately
owned, and Aspen was bought by Sompo in February 2026 and delisted. The list is `app/src/data/stocks.ts`; every
stock added costs one price request a minute, and the free Finnhub key allows 60.

### Daily missions and the up-or-down game

Every day has the same three missions for everyone (read a new word, finish a flashcard round, check your
portfolio and so on). None of them is a trade. Doing all three keeps a streak going. The up-or-down game asks
whether one stock will be higher or lower by the next visit and always shows the score beside "a coin gets about
half", because the lesson is that one day cannot be predicted.

### The website

The same code is the website: everything in the Android app works in a browser, and on a laptop the teacher's
class page becomes a table. It is served by the class server, so it goes live when that is deployed (below).
Students open the address; teachers open the same address and choose "I am a teacher", or go straight to
`/teacher`.

### Logos

Logo pictures are not stored in this repo. The class server asks Finnhub for each company's logo address a few at
a time and the app loads the pictures from there and keeps them on the device. A stock with no logo (the fund,
usually) shows its letters instead, and so does everything when there is no connection. Check Finnhub's terms for
showing logos before charging schools, as with prices.

### Where prices come from

Prices are real, so they need the internet. Everything else (lessons, glossary, your portfolio at the last prices
seen) works offline. Trades always use a price fetched that second.

1. **Class server** (for schools). Holds the data keys, keeps one shared copy of each price and refreshes it on a
   timer, so a whole class uses about as much data as one person.
2. **Your own keys** (to try the app on one phone). Settings → Market data. A free [Finnhub](https://finnhub.io)
   key gives prices and markers; a free [Twelve Data](https://twelvedata.com) key gives the graphs.

**Before charging schools:** both free plans are for personal, non-commercial use. A paid product shown to
students needs a data plan that allows display to users (Twelve Data calls this "external display"; ask Finnhub
for commercial terms). Price that in.

### Get an APK

The "Android APK" workflow builds on every push to `main` that touches `app/`. The newest build is always
<https://github.com/forgeframehq/investors-club/releases/download/latest/InvestorsClub.apk>.

## The class server

1. Deploy it. In the Cloudflare dashboard: Workers & Pages → Create → Import a repository → this repo, root
   directory `backend`. The D1 database already exists (its id is in `backend/wrangler.jsonc`) and
   the tables create themselves on first use. The deploy also builds the website, so the same address is the
   web app.
2. Add secrets (Worker → Settings → Variables and Secrets):
   - `FINNHUB_KEY` — prices and markers.
   - `TWELVE_KEY` — graphs.
   - `SCHOOL_KEY` — optional but recommended: any phrase you choose. Teachers must enter it to create an
     account, which stops strangers making classes on your server.
3. Point the app at it: either type the address under Settings → Market data, or set the GitHub repository
   variable `INVESTORS_CLUB_SERVER_URL` and rebuild so the APK has it built in. The website needs nothing: it
   uses the address it was loaded from.

### How it stays inside the free data plans

- Finnhub allows 60 requests a minute. The server keeps prices for 60 seconds while the market is open (15
  minutes when closed) and lets only one request at a time refresh them.
- Twelve Data allows 8 a minute and 800 a day. Each stock's graph is kept for 12 hours and markers for 24.
- A timer every 10 minutes refreshes prices and tops up the oldest few graphs, markers and logo addresses.

### Fair play

In a class, the server keeps every portfolio and fills each trade at its own price, so editing the app's saved
data changes nothing. The trading rules are one file shared by app and server (`app/src/lib/rules.ts`).

## Code layout

- `app/src/data/` — the 35 stocks, glossary, lessons, profile pictures, and how markers are worded.
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
