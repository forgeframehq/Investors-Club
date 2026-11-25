# Lessons

Newest first. One entry per thing that cost real time. Say what happened, why, and what to do instead.
Lessons from before this app had its own repo are in `forgeframehq/apps/docs/lessons.md`.

## 2026-11-24 — Profiles, flashcards, logos, teacher accounts

- **Draw first-run steps over the app, not instead of it.** The welcome steps are an absolutely positioned view
  on top of the router's `Stack`. Returning them in place of the `Stack` meant nothing could navigate when they
  finished ("join my class" has to open the Class tab).
- **Several badges can arrive in one go.** Reading the tenth word and finishing the first flashcard round happen
  on the same tap, and each badge gets its own box, in the order of the list in `store.ts`. A test that looks for
  one badge has to read every box, not just the first.
- **A pre-filled field needs select-all in the test.** The join form fills in the student's name. Triple-click
  did not select it in the browser test, so typed text was added to the end ("SamSam T"). The test's `type`
  helper now presses Ctrl+A first.
- **Logo pictures cannot be downloaded in a Claude session** (the shell only reaches package registries), so
  they are not bundled. The app loads them from the address Finnhub gives and falls back to lettered tiles.
- **The class server had never been deployed when teacher accounts were added,** so the tables were simply
  redefined. From now on it may be live: see "Changing the server's tables" in `CLAUDE.md`.

## 2026-11-24 — Missions, the website on a laptop

- **Anything a test cannot predict must not open a dialog.** Daily missions depend on the date, so finishing one
  shows a toast, never a box that blocks the next tap. Only a new badge opens a box.
- **Do the bookkeeping before `await`ing a dialog.** The lesson mission was recorded after the badge boxes were
  closed, so closing the app with a box open lost it.
- **One layout rule covers the website.** `Page` and the tab headers keep content in a 720-wide column
  (`WIDE` in `ui/kit.tsx`); a screen that wants more, like the teacher's table, passes `max`.

## 2026-11-24 — Deploying the class server

- **Cloudflare's Git builds ignore `build.command` in `wrangler.jsonc`.** It runs for `wrangler deploy` on a
  computer but not in Workers Builds, so the website would not be built. The build command
  (`node build-web.mjs`) has to be entered in the dashboard when importing the repo.

## 2026-11-24 — Home screen in a trading-app layout

- **Reference: the Gate.io home screen.** Taken from it: total value with today's change at the top, a row of
  shortcut tiles, two mover cards, underlined group tabs, and rows of symbol, price and a solid change block.
  Not taken: its colours, icons, wording or products. Keep it that way with any reference app.

## 2026-11-24 — Typeface, peek panel, live database

- **The typeface is Inter, built in.** On Android the expo-font plugin in `app.json` embeds the files from
  `@expo-google-fonts/inter` and maps the weights, so `fontFamily: F` plus a normal `fontWeight` works. In a
  browser `lib/fonts.ts` adds the `@font-face` rules. Every `Text` and `TextInput` needs `fontFamily: F`; `Txt`
  already has it. `npx expo install` cannot reach Expo's servers from a Claude session: use `npm install`.
- **The class server is live now.** New columns go in `MIGRATIONS` in `backend/src/index.ts` (today's high, low
  and open were the first). Never edit a `CREATE TABLE` line for a table that already exists.
- **An "exact copy" of another app is not on offer.** Asked for Gate.io's look exactly, we took its layout ideas
  (see the entry above) and a free typeface of a similar kind, not its design or font.

## 2026-11-24 — Pastel palette, starting over

- **The look is light and pastel now**: pink sand background, white cards, ocean-blue text, turquoise accent,
  house-colour tiles (`PASTELS` in `lib/theme.ts`). Colours that sit on white must be the deeper shades; the
  bright ones from the dark theme (lime, yellow) were unreadable and were replaced.
- **"Start over as a new student"** in Settings clears this device (`startOver` in the store) and shows the
  welcome steps again. It is how to demo a fresh login without clearing browser data.

## 2026-11-24 — Teacher area, trading rules, APK on request

- **Opening the same page two ways needs a way back.** The teacher's class page can be the first page loaded
  (a shared link), so its back button falls back to `router.replace('/teacher')` when there is no history.
- **Do not trigger a build by adding the trigger file.** The APK workflow runs when `.github/apk-build`
  changes, and creating the file counts as a change, so it is only created when an APK is wanted.
- **Bermuda and New York change their clocks on the same days**, so market hours are 10:30 am to 5 pm Bermuda
  time all year and can be written as fixed text.

## 2026-11-24 — Real market hours and waiting orders

- **"Is the market open" has one answer per place.** The server decides for a class (`isOpen` in the server,
  `/api/quotes` returns `open`), and the app uses that when it has a server, the device clock otherwise.
  Anything that words the answer must be given that same value, or a test with a shut made-up market says
  "open until 5 pm" because the real clock says so.
- **Never fill an order at a stale price.** Orders fill only from prices fetched in the last ten minutes while
  the market is open, in both `settle` (server) and `settleSolo` (device).
- **Tests shut the made-up market with `POST /api/mock/market`**, which exists only when `MOCK_MARKET` is set.

## 2026-11-24 — Character avatars

- **Art comes from Sudhi, not from code.** The twenty profile characters were generated by him and sent as a
  zip; they are resized to 256 px WebP (about 13 KB each) in `app/assets/avatars` with numeric names. To add
  more, convert the same way and add a line to `data/avatars.ts`. Check each one is an original character
  before bundling it.

## 2026-11-24 — Rank emblems and badge medals

- **Art arrives named by what ChatGPT thought it drew, so check each picture.** Two rank emblems came back with
  their names swapped (the briefcase was called "strategist"). They were matched by picture when numbering the
  files in `app/assets/art`; `data/art.ts` lists which number is which.
- **The art has solid pastel backgrounds**, so it is always shown as a rounded tile (`ui/art.tsx`), and a faded
  tile means "not reached yet".

## 2026-11-24 — Learning path, buy coach, 50 stocks, today's graph

- **A saved class lost its school on reload.** `load()` rebuilt the class link field by field and left `school`
  out, so "your school" vanished after a refresh. When a saved object gains a field, check `load()` copies it.
- **50 stocks is the ceiling on the free price key.** A refresh costs one Finnhub request per stock and the limit
  is 60 a minute. The timer job was cut to 3 markers and 2 logos a run, and student requests for markers accept
  a copy up to three days old so they almost never reach Finnhub.
- **Today's 15-minute graph is built from prices we already fetch**, stored in the `intraday` table. Twelve
  Data only fills gaps (once an hour per stock, 500 a day at most), because its free plan is 800 requests a day.
- **A new lesson on the same route needs a `key`.** Going from one lesson straight to the next reuses the screen,
  so its state (step, score) carried over until the body was keyed by lesson id.
- **A buy now starts with "Check before you buy".** Tests that buy must go through it (see `coach` in
  `tests/e2e.js`); it can be skipped only after three buys.
- **No countdowns for children.** The "Shop or queue?" game was planned with a 60-second timer and built without
  one.

## 2026-11-24 — Lessons rewritten

- **The first lessons were pitched too young.** A lemonade-stand story and a lesson on "what is a company" read
  as babyish. The path now starts at "What is the stock market?", uses real companies and proper terms, and every
  lesson can be skipped to its quiz. Ask the age group before writing teaching content.
