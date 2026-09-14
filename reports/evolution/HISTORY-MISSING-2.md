# HISTORY-MISSING-2 — the race is in the history; the one that never finished is not, and nothing said so

2026-09-12 · branch `night/2026-09-12b` · build `64ff55ae` · **walked in a real browser on the
production build, not reasoned from source. One fix, inert to the race.**

★ **THE ANSWER IN ONE LINE.** Both races the owner ran today ARE recorded — on the server, in the
list, newest first, with keys **V788BZ** and **RNWRY8** — so the recording path is not broken. What
is broken is that **the browser has no upper bound on a race**: `RaceScreen` ends a race at one place
only, when every racer has finished, and there is no ceiling, no DNF and no message. A race the
viewer gives up on is never recorded and **says nothing at all**.

---

## 1 · THE WALK — production build on 4173, API on 4000, signed in as he is

Chromium against `http://localhost:4173` (the built client) with the API on 4000, already signed in
as **Weudl (admin)** on the fixed dev session secret. Build badge, from the page's own console:

```
[RA CAMERA LIVE TRUTH] commit=64ff55ae branch=night/2026-09-12b …
```

| what was captured | result |
|---|---|
| ★ **the browser console** | ★ **2 messages, 0 errors, 0 warnings** — both the camera's own INFO lines |
| the POST to `/api/races` | **it went out and succeeded** — the server holds both races (§2) |
| the local entry | see §4 — the honest answer is that **this is not his browser profile** |

---

## 2 · ★ HIS RACES ARE ON THE SERVER, AND THEY ARE IN THE LIST

`GET /api/races` returns both of today's races, on this branch's build:

| shortKey | finishedAt | build | track | field | elapsedSec |
|---|---|---|---|---|---|
| ★ **V788BZ** | 2026-09-12T09:35:34Z | `64ff55ae` | Dirt Oval | 40 | 96 |
| ★ **RNWRY8** | 2026-09-12T09:33:20Z | `64ff55ae` | Ice Track | 32 | ★ **1590** |

And the Dev Screen's Race History shows them, **newest first, with keys and a Run again button** —
captured verbatim from the rendered page:

```
DATE                    TRACK          DURATION  PLAYERS  WINNERS               KEY      
12.9.2026, 11:35:34     🐴 Dirt Oval   96s       40       Flare, Bolt, Apex     V788BZ   Run again
12.9.2026, 11:33:20     🎿 Ice Track   1590s     32       Bolt, Speedy, Phantom RNWRY8   Run again
```

★ **THE CHEAP EXCLUSIONS THE BRIEF NAMED, ALL CHECKED AND ALL CLEAR:**

- **the sort** — the newest race is row 1, not row 14;
- **hiding a sent race** — both carry a key, so both were matched to a server row. One OLDER row reads
  `on the server, not on this page` in the key column instead of a key, which is the guard working:
  it is listed, it says so, and it still repeats;
- **per-origin localStorage** — checked on BOTH origins. `http://localhost:4173` and
  `http://localhost:4000` (the API serves the built client too, so it is a second origin) **show the
  same two races with the same keys**, because the rows come from the server.

★ **So the list is not the defect.** He could have named that race.

---

## 3 · ★ WAS IT ALWAYS SO? — YES, AND THIS BRANCH DID NOT CAUSE IT

Two independent checks, both decisive:

1. **The exit condition is identical on master and untouched by this branch.**
   `master:client/src/screens/RaceScreen/index.jsx:1151` is the same
   `if (st.finishedCount >= nRacers)`, with no ceiling and no DNF, and
   `git diff master -- client/src/screens/RaceScreen/index.jsx` contains **no line touching
   `finishedCount` or `raceResults`**. ★ **A walk on master could not contradict identical, untouched
   source, so the worktree walk the brief asked for was replaced by this comparison — stated rather
   than skipped quietly.**
2. **The slow race is not this branch's doing either**, which is the sharper question since this
   branch changes what a race does:

   | shortKey | build | track | field | elapsedSec |
   |---|---|---|---|---|
   | RNWRY8 | `64ff55ae` — **this branch** | Ice Track | 32 | **1590** |
   | Q3CBRY | `e7425f28` — **before this branch** | Ice Track | 32 | **1590** |

   ★ **The same track and field took exactly the same 1590 seconds on the older build.** The branch
   did not make races longer.

---

## 4 · ★ WHAT IS ACTUALLY WRONG — THE BROWSER HAS NO UPPER BOUND ON A RACE

**At source, three addresses and one asymmetry:**

- `client/src/screens/RaceScreen/index.jsx:1175` — `if (st.finishedCount >= nRacers) { … }` is the
  **only** exit from a running race. Inside it, and nowhere else, `sessionStorage.raceResults` is
  written; `ResultScreen/index.jsx:188,217` then reads that payload and calls `recordFinishedRace`.
  **No ceiling. No DNF. No message.**
- `client/src/modules/raceCore.js` headless runner — caps at `max(realizedDuration × 3, 600 s)` and
  then **ranks the unfinished racers as DNF** so the race always completes.
- `scripts/lib/raceDriver.mjs:417,464,552` — `CEILING_MS = 200000` and a **loud refusal** naming the
  ceiling if a race exceeds it.

★★ **So every headless path in this project believes a race can overrun, and the one a person
watches does not.** A race whose last racer has not arrived simply continues, and if the viewer gives
up, **nothing is written anywhere and nothing is said.**

**That it bites is measured, not supposed:**

- his own **RNWRY8 recorded `elapsedSec` 1590** — twenty-six and a half minutes, **2.6× the 600 s
  overrun line and 8× the harness ceiling**. It did eventually finish, which is why it is in the list;
- and **the walk reproduced the wait**: a Quick Test on Dirt Oval at 20 racers ran **past ten minutes
  without finishing**, and I abandoned it — which is exactly the race that leaves no trace.

★ **THE RECORDING PATH ITSELF IS SOUND, PROVED END TO END.** `e2e/race-save.spec.js` runs a REAL race
to the finish and asserts the local entry appears; it and the three history specs pass **on the
PRODUCTION arm** (`playwright.prod.config.js`, PROD-ARM-1): **5 passed (13.3 m)**.

★ **AND THE HONEST LIMIT OF THE WALK.** The Playwright profile is **not the owner's browser**, so what
his `localStorage` holds cannot be read from here and is not claimed. What the walk does settle is
that the server has his races, the list shows them, and a finished race records correctly.

---

## 5 · THE FIX — SAY SO LOUDLY, AND CHANGE NOTHING ABOUT THE RACE

Brief item 6: *a race that vanishes silently is the one failure the local-first rule exists to
prevent.* So the silence is what is fixed.

- **`raceCore.js` — `raceOverrunMs(realizedDurationSec)`, exported.** The rule was a literal inside
  the headless runner and nowhere else, which is precisely why the browser had no notion of an
  overrun. The runner now calls it; the number is unchanged, so the expression is arithmetically
  identical.
- **`RaceScreen/index.jsx`** — when a race passes that line, a red banner appears:
  *"This race has run far longer than it should and has not finished. It is NOT saved yet — a race is
  recorded only once every racer has crossed the line."*

★ **IT DOES NOT END THE RACE, RANK ANYONE, OR NAVIGATE.** ★ **WORLD FINGERPRINT UNMOVED:
`bdf4a3c8ce6e0316`, identical to the value DIRECTION-AUTHORITY-1 measured** — so the change is inert
to the race, which is what a diagnostic must be.

★ **WHAT WAS DELIBERATELY NOT DONE:** giving the browser the cap-and-DNF the headless runner has.
That would make races END early and hand out DNF places — **a change to what a race IS**, and his to
decide, not mine to slip in behind a defect fix.

---

## 6 · TESTS — AND ONE GAP I AM NOT DRESSING UP

`client/src/modules/raceOverrun.test.js`, 4 tests, pins the one home.

| sabotage | result |
|---|---|
| drop the ten-minute floor from `raceOverrunMs` | ★ **RED** — 2 tests |
| ★ **disable the banner in the screen** | ★ **NOT CAUGHT — and that is the gap, stated** |

★★ **THERE IS NO BROWSER TEST FOR THE BANNER, AND I RAN THE SABOTAGE THAT PROVES IT.** Triggering it
needs a race that runs past **ten minutes**, which no spec in this suite can afford. ★ **A FAILED
SABOTAGE IS NOT A FINDING and I am not reporting it as one** — it is the honest measurement of what my
own test does not cover. What would cover it: a seam that lets a spec shorten the overrun line, which
is a change to the screen's shape and was not made for a test's convenience.

★ **The browser test the brief asked for — "runs a race and asserts the entry appears" — exists and
passes: `e2e/race-save.spec.js` on the production arm. It was green BEFORE this change too**, because
the recording path was never the broken part. Presenting it as a red-before/green-after would be
false.

---

## 7 · CHECKS

`node scripts/engine-reach.mjs --check`, verbatim:

```
ENGINE REACH: 2 of 4 path(s) can change the race:
  client/src/modules/raceCore.js
  client/src/screens/RaceScreen/index.jsx
```

★ **AND THE REACH IS PROVED INERT RATHER THAN ARGUED**: the **world fingerprint measures
`bdf4a3c8ce6e0316`, identical to the value DIRECTION-AUTHORITY-1 measured before this change.** The
banner is render-only and `raceOverrunMs` is the headless runner's own expression, moved, not altered.

| check | result |
|---|---|
| `raceOverrun.test.js` | **4 pass**; sabotage RED |
| `e2e/race-save.spec.js` + 3 history specs, **PRODUCTION arm** | ★ **5 passed (13.3 m)** |
| script suite (`node --test scripts/*.test.mjs`) | **411 pass, 0 fail** |
| client suite | **3 fail — the SAME three recorded outcomes DIRECTION-AUTHORITY-1 left**, no new one |
| world fingerprint | ★ **unmoved** |

★ **TWO REDS IN THAT `verify` RUN WERE MINE AND BOTH HAD ONE CAUSE.** `check-fallback-agreement` and
`script-suite` both failed because this change shifted lines that four symbol citations in
`docs/FORCE-MAP.md` and `docs/branding.md` pointed at — `script-suite` fails on it because
`check-fallback-agreement.test.mjs` runs the guard against the real tree. **The four citations are
repointed and both are green.** The remaining reds — world, camera and render fingerprints,
`check-runin-frame` on luger-hill, and the three client-suite outcomes — are carried forward from
DIRECTION-AUTHORITY-1 and are not this work.

**`git stash` was not used. `--no-verify` was not used. Nothing minted, no golden race re-recorded.**

---

## 8 · WHAT IS OPEN

1. ★ **Should the browser cap and rank DNFs the way the headless runner does?** It would mean a race
   always ends and is always recorded — and that some racers get a DNF place. **His decision.**
2. **Why an Ice Track race at 32 racers takes 1590 seconds at all.** It is not this branch (§3), and
   it is not measured here.
3. **The banner has no browser test** (§6).
