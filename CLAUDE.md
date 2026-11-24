# Investors Club

A stock market game for schools in Bermuda: pretend money, real prices, lessons, flashcards, class leaderboards and
a teacher view. `README.md` says what the app does and how to deploy it. `docs/lessons.md` records what cost time
before; add to it whenever something takes more than a few minutes to figure out.

This repo is the home of the app. It was moved here from `forgeframehq/apps` (folder `investors-club/`) on
2026-11-24; do not make further changes to that copy.

## How we work

- Sudhi works from his phone. He does not run builds locally.
- The loop: make the change → push to `main` → GitHub Actions builds the APK (about 20 minutes) → send him the
  download link with what changed and what to check → he installs and reports back.
- Builds are slow, so batch related changes into one push. Only changes under `app/` trigger a build.
- The latest APK is always `releases/download/latest/InvestorsClub.apk`.
- Tell him plainly what was tested and what was not. Nothing here runs on a real phone before he installs it.

## Layout

- `app/` — Expo app (Android + website). Screens in `src/app`, shared controls in `src/ui`, data and maths in
  `src/lib/store.ts`, bundled content in `src/data`.
- `backend/` — Cloudflare Worker + D1: shared prices, logo addresses, teacher accounts, classes, leaderboard, and
  it serves the website. The whole server is `src/index.ts`. Tables create themselves on first use.
- `tests/` — end-to-end test that drives the web build against a local server with made-up prices.
- `app/src/lib/provider.ts`, `rules.ts`, `types.ts` and `data/stocks.ts` are bundled by the server too: no React
  Native imports in them.

## Before pushing an app change

```bash
cd app && npx tsc --noEmit                                         # types
CI=1 npx expo export --platform android --output-dir /tmp/out      # proves the native bundle compiles
cd ../backend && npx tsc --noEmit
cd ../tests && ./run-e2e.sh                                        # drives the app in a browser
```

## Conventions

- **Local-first.** The app works with no account and no network, apart from prices. Classes are optional.
- **Children use this.** No photos, no email addresses, no surnames: a student is a first name with a last
  initial, a PIN and a built-in picture. Do not add anything that collects more without asking Sudhi first.
- **Expo APIs change between SDK versions.** Check the installed package's `.d.ts` in `node_modules` before using
  an Expo API; do not write it from memory.
- **Every pressable has an `accessibilityLabel`.** The end-to-end test finds controls by label, and screen readers
  need it.
- **Colours come from `src/lib/theme.ts`** and are read at render time (`C.accent`, with `C.onAccent` for anything
  drawn on it), so the in-app colour picker works. Do not copy them into module-level constants.
- **No `Alert.alert`.** Use the promise-based dialogs in `src/ui/overlay.tsx`; they also work in the browser test.
- **Plain words in the interface**, written for a ten-year-old. Badges and levels reward learning and spreading
  risk, never trading often.
- **Bundled images get numeric file names.** Android merges asset names that differ only in punctuation or case.
- **Secrets never go in the repo:** data keys, tokens, signing keys, `.dev.vars`.
- **Changing the server's tables:** the class server may be live with real classes. Add columns with a guarded
  `ALTER TABLE`; never drop or rename what is there.

## Limits of a Claude session

- An Android APK cannot be built inside the session. GitHub Actions builds it.
- Action artifacts cannot be downloaded from the session; release assets can, which is why the workflow attaches
  the APK to a release.
- `gh` works for REST (`gh api repos/...`, `gh run view`, `gh run watch`) but GraphQL-backed commands fail.
- The Cloudflare connector can create and query D1 databases but cannot deploy a Worker. Sudhi deploys from the
  Cloudflare dashboard (README, "The class server").
