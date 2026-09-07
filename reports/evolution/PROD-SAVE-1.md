# PROD-SAVE-1 — the race was in the list all along, at row 14

**Date:** 2026-09-07
**Branch:** `feat/team-races-1`, off `dd8eb948`. **Not merged.** `night/2026-09-06` untouched.
**Fingerprints:** `engine-reach --check` selects nothing; nothing minted. Golden races **PASS**.

---

# PART 1 — the race that is not in the list

## What was captured, verbatim, on the PRODUCTION build

Reproduced on `scripts/serve-production.mjs` at **:4173**, signed in, against an API on :4000 —
on a **COPY** of his data (`server/data` duplicated, identity files removed so an admin could be
founded; his live install never touched, the copy and its account deleted afterwards).

A race was run to the finish. Everything on the save path **worked**:

| | |
|---|---|
| POST | `61. [POST] http://localhost:4000/api/races => [201] Created` |
| local entry | written — `id mtrbrs69mc72`, `hasInputs: true` |
| its sync | `{"state":"sent","serverId":"7d64…5292","at":"2026-09-07T14:17:36.692Z"}` |
| **browser console** | **1 error, and it is not ours**: `Failed to load resource: 401 (Unauthorized) @ /api/auth/me` — the pre-login identity check, before sign-in. Nothing else, no warnings. |

So the POST goes out, is accepted 201, and the entry is on the device marked sent. **The save path is
not broken on the production build.**

## ★ Where it is lost — the list's ORDER, and it was measured

The Race History table, production build, immediately after that race:

```
 0: history-row-local  :: 11.8.2026, 20:52:09  City Circuit   96s  20  …  this device only
 1: history-row-local  :: 11.8.2026, 20:48:57  …
 …
11: history-row-local  :: 10.6.2026, 02:32:41  Space Sprint   53s  20  …  this device only
12: history-row-stored :: 7.9.2026, 16:17:36   City Circuit   85s   2  …  G5EM27
13: history-row-stored :: 7.9.2026, 16:06:35   City Circuit   57s  40  …  8EDU7R
14: history-row-stored :: 7.9.2026, 13:18:37   City Circuit   86s  20  …  733DSV
```

**★ His own missing race, `733DSV`, is row 14.** Every September race sits *below* twelve entries
from 11 August and 10 June. No filter was set (`history-hidden-count` and `history-empty` both
absent).

The cause is one expression, `RaceHistory.jsx`:

```js
return [...unsent, ...stored];
```

Local rows as a block, then server rows — **each half sorted only within itself, the list never
sorted as a whole.** A race that has just been stored *is* a server row, so it is appended after
every local entry the device holds, however old. With a screenful of older local rows above it, a
newly stored race is off the bottom of the view — which reads exactly like never having been
recorded, from the server *and* from the device, which is precisely how he reported it.

## The fix

The whole list is sorted by date, newest first, across both stores. `date` is an ISO string on both
row kinds (`entry.date`, `race.finishedAt`), so a lexicographic compare is a chronological one.

**The "unsent first" grouping this replaces was deliberate — and it is the thing that caused the
symptom.** An unsent race is still visible and still says it is unsent; it simply no longer outranks
a newer race for being unsent. Per the decision rules: part 1 proved the assembly built by
HISTORY-NEVER-VANISHES-1 / HISTORY-FILTER-SAYS-SO-1 was the cause, so it was changed, and this says
so. Their join and filters are otherwise untouched.

**Same browser, same production build, after the fix:**

```
 0: history-row-stored :: 7.9.2026, 16:17:36  …  G5EM27
 1: history-row-stored :: 7.9.2026, 16:06:35  …  8EDU7R
 2: history-row-stored :: 7.9.2026, 13:18:37  …  733DSV   ← was row 14
 3: history-row-local  :: 11.8.2026, 20:52:09 …  this device only
```

## ★ What was checked and RULED OUT — the build was a red herring

The brief's first suspect was the bundle, and it was checked before anything else:

- **A missing named export** — the class that bit this branch at `38219030`. `npm run build`
  succeeds; a missing export is a hard build failure and there is none.
- **A build-mode branch on the save path** — the client contains exactly **two**
  `import.meta.env` uses, both in `services/api.js:17` for the API base URL. **None** on the save
  path, in `ResultScreen`, in `raceHistory.js` or in `racesApi.js`.
- **`VITE_API_URL` inlining** — unset at build time, so the bundle carries the fallback
  `http://localhost:4000`, which is where his API is. Not it.
- **StrictMode's double effect** — dev-only, and the `hasSaved` ref guards it either way. Not it.
- **CORS from :4173** — `http://localhost:4173` has been in `RA_CLIENT_ORIGIN` throughout, and the
  POST returned 201 from that origin. Not it.

★ **The defect is not production-specific at all.** `[...unsent, ...stored]` has no build-mode
branch. It reproduces wherever the device holds local entries newer in the list than the new race is
in position — which is why every clean-environment browser test passed: with three or four seeded
entries the new race was still on screen. **What hid it was DATA VOLUME, not the bundle.** The
production build was where he happened to be standing.

## ★ Can the browser harness drive the production build? NO — and that is the larger finding

It cannot, and this is what blocks it, at source:

- `client/playwright.config.js:38` — `baseURL: E2E.appUrl`, which is
  `http://localhost:5399` (`e2e/e2e-env.js:40`), the **dev** server.
- `client/playwright.config.js:78` — the app `webServer` runs
  `npm run dev -- --port … --strictPort`, with `env: { VITE_API_URL: E2E.apiUrl }`.

**Every browser proof this project has ever taken was taken against `npm run dev`.** What driving
production would take, stated and not built here:

1. `VITE_API_URL` is **inlined at build time** in a bundle, not read at start. So a production e2e
   arm must either build with the e2e API's URL baked in (a build per run, ~2.4 s plus the copy), or
   run its API on the port the bundle already carries, `:4000` — which collides with the owner's own
   API.
2. The app `webServer` becomes `build` + `serve-production.mjs` instead of `dev`, and
   `serve-production.mjs` copies `client/dist` to `LOCALAPPDATA` and serves from there, so the
   harness would drive a different directory than the one it builds.
3. `baseURL` moves to that server's port.

Because of (1), that is a real decision about the harness's shape, not a switch. **So this fix is
proved by the manual production run above — the row indices before and after, in his build — and
NOT by another dev-only spec**, which is what the brief asked for when the harness cannot reach
production.

## ★ A collision this piece caused in the SUITE, not in the product

Running the three history specs together, one failed: `race-history.spec.js:99`, *"same seed"*,
expected 5230 and got 854 — the repeat ran a race the test never ran.

**It is mine, and it is not the sort.** The same file passes **4/4 alone**. The run reported
*"Running 7 tests using 3 workers"*: `playwright.config.js:31` sets `fullyParallel: false`, which
serialises tests INSIDE a file and still runs FILES in parallel. The history specs share one API and
one storage state, so another file can store a race between this one storing its own and reading the
list — and `.first()` then points at a race this test never ran. That was safe until PROD-SAVE-1
added two more race-storing spec files.

The row is now found by **its own short key**, which the test had already read at step 2, instead of
by being first. That is true under any ordering and weakens no assertion. **The product fix is
unaffected either way** — proven in isolation and, above, by hand on the production build.

★ **Worth naming: file-level parallelism against one shared API is a standing hazard**, not a
one-off. Any two spec files that store races can collide the same way. Nothing here changes the
config; a future piece that adds a third race-storing spec meets it again.

**Reused, not built:** `scripts/serve-production.mjs`, the existing history specs, and the
`data-testid` hooks HISTORY-FILTER-SAYS-SO-1 added (`history-hidden-count`, `history-empty`) — they
are what proved no filter was set.

---

# PART 2 — skip-by-click. ESTABLISHED ONLY. NOTHING CHANGED.

**1 · What `ceremonySkipOnClick` does, and its shipped default.**
`client/src/modules/storage/defaults.js:299` — **`ceremonySkipOnClick: false`**. A left mousedown
moves the ceremony clock forward to the next beat boundary: `onCeremonyClick`,
`client/src/screens/RaceScreen/index.jsx:1951-1964`, bound at `:1974` as
`onMouseDown` on `.race-canvas-wrapper`. It cancels no beat and names none — it sets
`st.countdownStart = now - nextBeatStart(…)`. The default's own comment reads *"OFF IS TODAY'S
BEHAVIOUR EXACTLY"*.
★ **His stored `false` is the shipped default, not a change.** The key has never held any other
value in `defaults.js` (searched with `git log -S`), so a stored `false` and an absent value are
indistinguishable and neither implies anyone turned it off.

**2 · Which screens and which parts.**
**One screen and one phase.** Only `RaceScreen`, and only the countdown:
`index.jsx:1955` returns unless `st.phase === PHASE.COUNTDOWN`. The handler sits on the wrapper
rather than the canvas so the brand card — a DOM child — is covered by bubbling.
★ It has **never** applied to any other screen. The result screen's podium build-up has a
**separate and unrelated** skip: `ResultScreen/index.jsx:171-180`, `window` `pointerdown`/`keydown`
listeners, always on and not gated by this key. So "it no longer skips on every screen" describes
two different mechanisms; only one of them is this setting.

**3 · Is the behaviour gated on the build mode anywhere? — NO.**
There is no `import.meta.env`, no `NODE_ENV` and no `__DEV__` on `RaceScreen/index.jsx` or
`camera/startCeremony.js`. The client's only two `import.meta.env` uses are
`services/api.js:17`, for the API base URL. **The behaviour is identical in development and in the
production build**, so turning the setting on gives him skip-by-click on the build he tests — which
is his stated requirement.

**4 · Did anything change it recently? — NO.**
One commit, ever: **`d46fd443`, 2026-08-22, `feat(CEREMONY-SKIP-1)`** — which introduced the key,
the `false` default and the handler together. `git log -S` over the key, the handler and the default
line returns that commit and nothing else.

★ **The answer is: it is a setting, and it is off.** The switch is Dev Screen → Camera (advanced),
`CameraAdvancedSection.jsx:418`. **Nothing was turned on, no default was moved, and there is no
build-mode gate to remove.**

---

## Source hygiene

| file | before | after |
|---|---:|---:|
| `client/src/screens/DevScreen/sections/RaceHistory.jsx` | 483 | 499 |
| `client/e2e/race-history.spec.js` | 216 | 228 |

Two files changed — the list, and one test selector made precise for the collision this piece caused.
**Nothing was dead and nothing was removed** — the per-half sort became one sort over the joined
list; no branch was orphaned. No file was added: the brief asked for a production browser test or a
report of what blocks one, and it is the latter.

**Noticed and deliberately left:** the local history on the production origin held **twelve** entries
dated 11 August and 10 June with no `sync` field at all — the pre-RACE-SAVE-3 shape. They are his and
were not touched, read only. And `localStorage` is per origin, so races run at `:5173` and races run
at `:4173` keep **separate local histories**; the server copy is what makes them one list. That is
worth knowing when comparing the two, and nothing here changes it.

**Nothing of his was deleted or rewritten:** not a stored race, not a local entry, not a user. The
diagnostic ran on a copy under `c:/tmp`, and the copy and the admin created inside it are gone.

`engine-reach --check`, verbatim:

```
ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
  1 outside the hull (cannot reach the engine at all): client/src/screens/DevScreen/sections/RaceHistory.jsx
```
