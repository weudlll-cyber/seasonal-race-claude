# HULL-WIRED-1 — the hull stops being advice and starts selecting the guards

2026-09-10 · night chain 2026-09-09, piece 2 · branch `fix/hull-1` · **nothing minted, no fingerprint
moved, no engine, camera or drawing code touched.**

HULL-FIX-1 built a truthful hull and deliberately left it **unwired**: `engine-reach --check` told a
committer the truth while `npm run verify` routed past the same files. Its stated reason was that the
world fingerprint was blind to the files that would newly select it. Piece 1 (W-REF-ONE-HOME-1)
attacked that reason. **This piece establishes how much of it actually went away — the answer is "one
file of five" — and wires the hull anyway, for a reason it can defend.**

---

## 1 · ★ ESTABLISHED FIRST: what piece 1 actually removed

Not argued from piece 1's success. Measured with a **module-resolution probe** — a Node loader hook
recording every module the world fingerprint's own run loads.

`scripts/fingerprint-default.mjs` SPAWNS `scripts/sim-fairness.mjs` (`:239-242`), so the sim's graph
is the question. Recorded before and after piece 1:

```
sim modules loaded BEFORE piece 1: 79   AFTER: 80
NEW: ['client/src/modules/raceParams.js']
```

| proven race-changer (HULL-FIX-1, by sabotage) | loaded by the world fingerprint? |
|---|---|
| `client/src/modules/raceParams.js` | ★ **YES — since piece 1** |
| `client/src/modules/raceActionStage.js` | **no — blind** |
| `client/src/modules/baseSpeedConfig.js` | **no — blind** |
| `client/src/modules/rowLayoutConfig.js` | **no — blind** |
| `client/src/modules/racerNames.js` | **no — blind** |

★ **Piece 1 removed the objection for ONE file of five, and this report will not round that up.** The
sim reads the `DEFAULT_*` objects directly rather than through the loaders, pins its own roster, and
applies no action stage — so four of the five are still outside its reach by construction, not by
oversight.

**And piece 1 wired that one file with no list at all.** Because `sim-fairness.mjs` now genuinely
imports `raceParams.js`, `closureOf` grew by itself: `raceParams.js` **now selects
`world-fingerprint`**, where before it did not. A real dependency is the only wiring that cannot go
stale.

---

## 2 · ★ THE GAP, SIZED BEFORE IT WAS FILLED

"Wire the hull" could mean anything from one line to a rebuild. So the question was made concrete:
**which hull files select NO guard that could detect a race change?** Race detectors taken as
`golden-races`, `world-fingerprint`, `client-suite` (it carries `goldenRealArm.test.js`, which drives
the shipped path), `render-fingerprint` and `camera-fingerprint`.

| | before | after |
|---|---|---|
| hull files | 197 | 197 |
| select at least one race detector | **181** | **197** |
| **select none** | **16** | ★ **0** |

The 16 were **all instruments under `scripts/`** — `camera-replay.mjs`, `check-ending-frame.mjs`, five
`diag/*`, `exp-anchor-truth-ab.mjs`, `finish-band-truth.mjs`, `lib/pngFrame.mjs`, `lib/raceDriver.mjs`,
`outcome-phase-window.mjs`, `pair-reach-census.mjs`, `parity/goldenRunner.mjs`, `phys-bench.mjs`,
`sim-fairness.characterisation.test.mjs`.

★ **So the honest headline is that the hull was already 92% wired, by accident.** `golden-races`
reached `raceParams.js` and `raceActionStage.js` only because its own file's closure happens to
contain `scripts/golden/goldenRace.mjs`, which imports them. Nothing guaranteed that. Nothing would
have noticed if the fixture driver had stopped importing one. **What this piece replaces is not an
absence of coverage but an accident of it.**

---

## 3 · THE MECHANISM: `hull: true`, a relationship and not a list

`scripts/lib/routing.mjs` `resolveGuard` gains one declared field. A guard may say **"my subject is
the race"**, and the tool answers what that means today:

```js
const hull = d.hull ? raceHull().files : [];
const files = new Set([...self, ...reached, ...hull, ...(d.files ?? [])]);
```

- **A BOOLEAN, NOT A PATH LIST.** The hull is derived on every run from source. A guard that had to
  enumerate it would be a second home for it, stale the first time a module moved.
- **OPT-IN.** Most guards are not about the race; the docs, lint and container guards would only get
  slower. **Two** declare it, and each says at its own declaration why.
- **`raceHull()` is now memoised** for the default question. `resolveGuard` asks it once per guard —
  thirty-odd times per plan — and each answer costs a `git ls-files`, a read of every tracked source
  file and twenty closure walks: **586 ms for the first call, 0 ms for the next thirty.** An explicit
  `entries` argument (the tests) is never cached, because that would be a cache keyed on nothing.

### Who declares it, and the two very different reasons

**`golden-races` — cost 0.4 s.** It previously selected on 30 of the hull's files and now selects on
all 197. ★ **The cost of saying yes here is less than reading the sentence that explains it**, which is
why this guard says it first.

**`world-fingerprint` — cost ~107 s.** It selected on 83 and now selects on 197. This one is declared
**with its eyes open**, and the declaration says so: about 115 of the files it newly selects are
camera, drawing and HUD code that the instrument **does not load and cannot judge**. It is declared
anyway because the two errors are not symmetric — a green run nobody needed costs 107 seconds; a race
change shipped unmeasured costs a record nobody can trust, and this project has paid that twice in
eight weeks.

★ **AND THE GUARD NOW CARRIES THE HONEST HALF.** A new `blind` entry records, measured rather than
feared, that its run loads **80 repository modules against the hull's 197**, that exactly one of the
five proven race-changers is among them, that the other four are detected by `goldenRealArm.test.js`
in the client suite instead — and that **a green here is not a clearance for a hull file this run does
not load.** Selecting is not seeing. Without that entry, wiring would have bought a more confident
green rather than a truer one.

---

## 4 · ★ WHAT IT COSTS — measured on real diffs, with a control that can fail

Method: for each first-parent merge into `origin/master` in the window, take the files it brought in
and ask the **same resolver `verify` uses** which guards they select — each declaration resolved
**twice from source**, once as written and once with `hull` removed.

★ **The first run of this control reported +0 and was wrong.** `collect()` returns guards already
RESOLVED, so re-resolving one with `hull:false` still carried the expanded hull in its `files` array
and the two arms came out identical. The control now resolves from the raw declarations and
**asserts that it can show a difference at all** before reporting one:

```
declarations carrying hull:true -> golden-races, world-fingerprint
  golden-races:      30 files -> 200 files
  world-fingerprint: 83 files -> 198 files
```

| window | guard | selected BEFORE | selected NOW | newly |
|---|---|---|---|---|
| **8 weeks** (411 merges) | `world-fingerprint` | 76 (18%) | **120 (29%)** | **+44** |
| | `golden-races` | 50 (12%) | **115 (28%)** | **+65** |
| **3 weeks** (261 merges) | `world-fingerprint` | 32 (12%) | **56 (21%)** | **+24** |
| | `golden-races` | 21 (8%) | **53 (20%)** | **+32** |

### ★ WHAT THAT MEANS FOR A NORMAL WORKING DAY

Guard seconds across the eight-week window: **8 152 s → 12 886 s**, an increase of **4 734 s ≈ 79
minutes over eight weeks**.

- **+85 seconds of guard time per day** on the eight-week average (~7 merges/day).
- **+123 seconds per day** on the busier last three weeks (~12 merges/day).
- In plain terms: **about one extra world-fingerprint run every day and a half**, and roughly two
  extra minutes of waiting spread across a working day.

`golden-races` contributes almost nothing to that number — 65 extra selections × 0.4 s = 26 seconds
across eight weeks. **The entire cost is the world fingerprint, and it is under two minutes a day.**

This sits beside HULL-FIX-1's figure rather than replacing it: that measured the pre-commit
**tripwire** going 15% → 28% of merges. This measures the **guards**, which is the part that costs
wall clock.

---

## 5 · WHAT THE WIRING BROKE, AND WHY THAT IS THE FINDING

Two existing tests in `scripts/verify.test.mjs` went red, and both encoded the belief this piece
corrects — the same shape as HULL-FIX-1's "the closure EXCLUDES presentation code". **Neither was
deleted; both were replaced by the property that now needs guarding.**

1. *"...and a client file OUTSIDE the closure does not — the saving, and its L203 pair"* asserted that
   `camera/finishPhase.js` does **not** select the world fingerprint, reasoning that *"a camera file
   cannot be read by the race"*. That reasoning was never established — it was the import closure's
   answer, and the import closure cannot see the modules that produce the engine's arguments. **The
   saving is smaller than the test claimed**, and it is now stated where it holds: the guard is narrow
   against the rest of the application, and `SetupScreen.jsx` is the honest negative.
2. *"ENGINE: a file in the reach hull selects the world fingerprint — a camera file does not"* — the
   same assertion, now **inverted on purpose**, with the reason and the `blind` entry named at the
   assertion.

Two new tests hold the wiring itself:

- **`hull:true` selects a file that no `reach` entry can reach** — using `baseSpeedConfig.js`, the
  sharpest case, ★ **with a control assertion that fails if `reach` alone already reached it**, so the
  test cannot pass for the wrong reason;
- **the two guards whose subject is the race declare it** and select on a proven race-changer — named,
  because a silent revert would look exactly like a narrower hull.

`scripts/verify.test.mjs`: **53 tests, 53 pass.**

---

## 6 · CHECKS

```
node scripts/engine-reach.mjs --check scripts/check-golden-races.mjs scripts/engine-reach.mjs scripts/fingerprint-default.mjs scripts/lib/routing.mjs

ENGINE REACH: none of 4 path(s) carry a change that can reach the race engine.
  4 outside the hull (cannot reach the engine at all): scripts/check-golden-races.mjs, scripts/engine-reach.mjs, scripts/fingerprint-default.mjs, scripts/lib/routing.mjs
```

| check | result |
|---|---|
| `npm run verify` (plain) | **PASS 15 / FAIL 0 / SKIP 19**, 128.4 s — `world-fingerprint` selected and **matching its record** |
| `node --test scripts/verify.test.mjs` | **PASS 53/53** |
| `node --test scripts/engine-reach.test.mjs` | **PASS 19/19** |
| golden races | **PASS** (selected by verify, 2.7 s) |
| fingerprints | **none minted; the world fingerprint was run by verify and matches** |

---

## 7 · SOURCE HYGIENE

| file | change |
|---|---|
| `scripts/lib/routing.mjs` | `resolveGuard` honours `hull: true`; the `dataReach` emptiness test counts it too |
| `scripts/engine-reach.mjs` | `raceHull()` memoised for the default question, with the reason |
| `scripts/check-golden-races.mjs` | `hull: true` + why it is cheap |
| `scripts/fingerprint-default.mjs` | `hull: true` + why it is expensive and declared anyway; **a new measured `blind` entry** |
| `scripts/verify.test.mjs` | 2 tests replaced, 2 added |

**REMOVED:** the two assertions that a camera file cannot select the world fingerprint. **Nothing dead
is left behind:** `raceHull()` had no other caller needing the un-memoised form, and the old
assertions are replaced rather than dropped.

**NOTICED AND LEFT, outside this piece:**
`client/src/modules/parity/goldenRealArm.test.js` imports `scripts/parity/goldenRunner.mjs`, but
`client-suite` routes on `client/`, so **a change to `goldenRunner.mjs` does not select the suite that
runs it.** It now selects `golden-races` and `world-fingerprint` through the hull, so it is no longer
unguarded — but the specific detector that would actually see it is still not selected by it. That is
a suite-routing question, not a hull one, and it is named here rather than fixed.

**No record was created by hand. `git stash` was not used.**
