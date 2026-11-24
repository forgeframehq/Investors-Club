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
