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
