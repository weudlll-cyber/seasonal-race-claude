# COMEBACK-CONNECT-1 — the plan's beats reach the camera, and what that costs

**Date:** 2026-09-07
**Branch:** `night/2026-09-06`, off master `554f348e`. **Not merged.**
**Kind:** build + measurement. **The key ships OFF, so nothing changes until he turns it on.**
**Fingerprints:** all four run, all four UNMOVED. Golden races pass. **Nothing minted.**

---

## What is true at source, re-established rather than carried over

Each of the three was opened at the line before it was written down here.

- **`racePlanner.js:1277-1281`** — `getCameraPlan()` delivers the full authored plan, and the comment
  beside it already says what happens to it: *"passes it to comebackDetector.setPlan — where the
  ROLES are consumed and the BEATS are DISCARDED."*
- **`comebackDetector.js:64-75`** (as it stood) — `setPlan` walked `cameraPlan.heroes` and kept
  exactly one thing per hero: the index, when `role === 'comebacker'`. `h.beats` was never read.
- **`CameraDirector.js:1710-1735`** — the comeback candidate is pushed with `this._comebackWeight`
  into `candidates`, and `_weightedRandomPick` then `_acceptsOffer` decide whether it becomes the
  shot. The beats reach neither the moment nor the contest.

COMEBACK-BEATS-1's figures are **that report's claims** and are used here only as the thing to
compare against: 74 comebackers, 215 beats, 11 shots, never the wrong racer, early every time by a
median 0.134 of the race. **This run re-measured the OFF arm itself**, and reproduces 74 written
comebackers and 11 shots over the same forty races.

---

## What was built

**One home, extended — not a second channel.** `setPlan` already walks the heroes array to read the
role; it now keeps the **resolve beat** on the same walk. `best()` takes a third argument,
`progress`, and when the key is on it will not offer a named comebacker before that beat. The
director passes `leaderProgress` — the value the line above it already uses for the outcome-phase
test, read rather than recomputed.

**Behind `comebackUseBeats`, default `false` = today's behaviour exactly**, with a Dev Screen control
in `CameraAdvancedSection`. **The contest, the weights and the role handling are untouched**, and
nothing that draws was changed. A candidate the plan did not name is untouched too: inventing a
moment for a racer the plan never wrote one for would be this feature doing the exact thing it
exists to stop the camera doing.

### ★ Two defects in this piece's own instrument, both found by disbelieving a zero

**1. The lever was not connected, and the first N=30 measured nothing.** Both arms came back
**byte-identical**. `computeTimingFromConfig` builds the director's timing config from an *explicit
key list*, and `comebackUseBeats` was not on it — so `t.comebackUseBeats` was `undefined` and the
gate was always false. A run that reads exactly like "the lever does nothing" was a lever that was
not attached. Fixed at `cameraTimingComputation.js` beside the four gates it travels with, and
proved by calling the function directly: `null` config → `false`, key on → `true`.

**2. Two reported rows were measuring the wrong detector.** With the lever connected, GATE 1 and
GATE 2a were *still* identical across arms. The harness makes its own pure read of `best()` at
`comeback-beats.mjs:237` and was calling it **without the progress argument**, so the new gate was
skipped in exactly the two rows that explain the mechanism. Fixed; those rows now describe the arm
that is actually running, and they turned out to carry the whole finding.

**Both were caught by refusing to publish a zero, not by a test.**

---

## ★ THE TWO COLUMNS

**N = 40 races** (10 tracks × seeds 1,2,3,4), race plan ON, shipped defaults but for the one key.
Stage 1 ran at **N = 30** and showed a readable difference (7 shots → 0), which is why it went
larger.

**The two arms ran IDENTICAL races, and that is checked rather than assumed.** Camera configuration
cannot reach the physics, so every camera-independent field the harness records — each race's
comebackers and their beats, `crossedAt`, `b1Size`, `raceMs`, `heroCount`, `planDelivered` — must be
equal between arms. Compared row by row: **0 differences in 40 races.**

| over 40 races, 74 written comebackers | OFF (shipped) | ON (beats decide when) |
|---|---:|---:|
| camera comebacks SHOWN | **11** | **0** |
| written comebackers the camera showed | 11 of 74 | 0 of 74 |
| races containing a comeback shot | 11 of 40 | 0 of 40 |
| races with a comebacker and NO comeback shot | 29 of 40 | **40 of 40** |
| shots on a racer the plan did not name | 0 of 11 | — |

**The gap between the written beat and the camera's moment.** OFF: n=11, median |Δ| **0.134** of the
race, p90 0.171, max 0.260; signed median **−0.134**, i.e. before the beat; in time, median 9.90 s,
max 15.00 s, **early 11 of 11**. ON: **no pairing exists to measure**, because there are no shots.
So the honest statement is not "it is no longer early" — it is that **the shot that was early is
gone**.

**What the extra shots cost in frame share** — here, what the *removed* shots return:

| state | OFF | ON | delta |
|---|---:|---:|---:|
| LEADER_ZOOM | 41.51% | 43.59% | **+2.08** |
| BATTLE_ZOOM | 22.19% | 22.28% | +0.09 |
| LEAD_CHANGE | 15.34% | 15.89% | +0.55 |
| OVERVIEW | 12.78% | 13.13% | +0.35 |
| PHOTO_FINISH | 5.11% | 5.11% | +0.00 |
| COMEBACK_ZOOM | 3.07% | **0.00%** | **−3.07** |

172,013 frames in each arm — the same frames, as the identity check requires. Two thirds of the
comeback's 3.07% goes to the leader shot.

---

## ★ WHY IT IS ZERO, WHICH IS THE ACTUAL FINDING

The two gate rows, now that they measure the running arm, say it exactly:

| | OFF | ON |
|---|---:|---:|
| frames on which the detector had a candidate | 49,239 | 17,052 |
| **of those, frames INSIDE the offer window** | **7,510 (35 of 40 races)** | **45 (2 of 40 races)** |

**The authored landing and the camera's admissible window barely overlap.** The director will not
consider a comeback until the outcome phase opens at `outcomePhaseThreshold`; the plan writes the
climb's resolve just past that; and by the time the climb has landed the racer has arrived near the
front, where the detector's own `maxCurrentRankPct` gate stops calling it a comeback. Two races out
of forty have any overlap at all, for 45 frames between them, and neither became a shot.

**And the other end of the range is measured, not guessed.** The first build gated on the **peak**
beat instead. Over the same 30 races that produced **two byte-identical columns** — because the peaks
run **0.18 to 0.676** and every one of them is already behind the camera by the time it is allowed
to look. So:

- gate on the **peak** → the beats can never bite; nothing changes at all
- gate on the **resolve** → the beats bite completely; every comeback shot disappears

There is no third authored beat between them. `anchor` is earlier still.

---

## What this piece does not claim

★ **It does not claim the beats make the camera CHOOSE the comeback.** That is the contest, and this
piece changed nothing about it — COMEBACK-WEIGHT-1's claim is that a thirteen-fold weight still left
55 of 74 unshown, and nothing here tests that. The connection moves WHEN a comeback may be offered
and nothing else.

★ **It does not claim the shipped behaviour is better or worse.** The key is off; both columns are
above; **no value is recommended and none is proposed.**

★ **The measurement is the headless director's, not the browser's.** Every figure here comes through
`scripts/lib/raceDriver.mjs`, and OUTCOME-WINDOW-1 (piece 5 of this chain) exists because that
driver's outcome-phase handling is not the browser's. The `--outcome=browser` arm used here reads the
plan controller's phase, which is the closer of the two — but this is not an eye test and does not
stand in for one.

---

## Sabotage

Once, as instructed, with a control on each side. `setPlan` was made to drop the beats on arrival
again — the exact defect this piece repairs. **2 of 9 tests went red**, including the one written to
catch it (*"ON: a named comebacker is NOT offered before the plan's resolve beat"*). Reverted; 9 of 9
green again.

`comebackDetector.js` **had no test of its own before this piece** — it was covered only through the
director, which is precisely how a dropped field goes unnoticed. It has nine now.

---

## Source hygiene

| file | change |
|---|---|
| `client/src/modules/storage/defaults.js` | +1 key `comebackUseBeats: false`, +17 comment lines |
| `client/src/modules/camera/comebackDetector.js` | resolve beat retained on the existing walk; `best()` takes `progress` |
| `client/src/modules/camera/cameraTimingComputation.js` | the key carried into the timing config (defect 1) |
| `client/src/modules/camera/CameraDirector.js` | gate value into `_comebackGates`; `leaderProgress` passed through |
| `client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx` | the control |
| `client/src/modules/camera/comebackDetector.test.js` | new, 9 tests |
| `scripts/diag/comeback-beats.mjs` | `--use-beats` arm; the gate-1 read fixed (defect 2) |

**Reused, not built:** the whole `comeback-beats.mjs` harness and its account, its copy-the-config
override mechanism (added for `--comeback-weight`), the existing `leaderProgress`, and the
`setPlan` walk. **Nothing dead was left behind** — the peak-beat map from the first build was
removed with it, not left beside the resolve one.

`engine-reach --check`, verbatim:

```
ENGINE REACH: 1 of 7 path(s) can change the race:
  client/src/modules/storage/defaults.js
```

So the race-affecting checks were owed and run: **golden races PASS**, and world `8a1977187e9c99b4`,
world-off `aa09ed97a3a32689`, camera `152cf295c4c9ff54`, render `74946ddbeca517a9` — **all four match
the record.** A key that defaults to today's behaviour moved nothing, which is what that default is
for.
