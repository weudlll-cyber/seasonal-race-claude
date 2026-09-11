# MINT-CAMERA-PLAN-1 — river-run answered, then CAMERA and RENDER minted

2026-09-11 · branch `night/2026-09-11` · **CAMERA and RENDER minted. World and world-off NOT touched
and measured UNMOVED. The golden races were not re-recorded and PASS.**

★ The piece this follows is named **CAMERA-PLAN-BLIND-1** in the tree (the brief called it
INSTRUMENT-PLAN-1); same piece, same measurements.

---

## 1 · ★ PART 1 — WHY `river-run` DID NOT MOVE, WITH ITS ADDRESS

**Nothing was minted until this was answered**, because an unexplained exception inside a record is
exactly where this project has gone wrong repeatedly.

### The measurement that decides it

The camera can only differ once the plan is delivered for two reasons: **the precedence fires** (it is
gated on `isCast()`, and `_cast` was null before the fix), or **the detector answers differently on a
frame where `_pickNextState` is actually running**, which re-normalises the weighted draw. Frames on
which the director is *not* deciding cannot change anything, so those are the frames that were
counted — on the camera fingerprint's **own** identity (seed 5601, camSeed 1439767152, 40 racers):

| track | cast | ★ precedence fires | ★ differs on a DECISION frame | COMEBACK entries | verdict | camera |
|---|---|---|---|---|---|---|
| city-circuit | 2 | **1** | 0 | 1 | precedence fires | moved |
| dirt-oval | 2 | **1** | 1 | 1 | precedence fires | moved |
| ice-track | 2 | **1** | 0 | 1 | precedence fires | moved |
| mountainstreet | 2 | **1** | 1 | 1 | precedence fires | moved |
| searound | 3 | **1** | 0 | 1 | precedence fires | moved |
| seatrack | 2 | **1** | 0 | 1 | precedence fires | moved |
| garden-path | 2 | 0 | **1** | 0 | pool differs | moved |
| luger-hill | 1 | 0 | **140** | 0 | pool differs | moved |
| space-sprint | 1 | 0 | **3** | 0 | pool differs | moved |
| ★ **river-run** | **2** | **0** | **0** | **0** | ★ **NOTHING DIFFERS** | ★ **unmoved** |

★ **The three verdicts partition the ten tracks exactly — 6 + 3 + 1 — and the nine that moved are
exactly the nine with a cause.**

### ★ THE ANSWER, AND WHICH CANDIDATE IT IS

**It is a PROPERTY OF THE RACE, not a blind instrument.** Case 4 of the brief; parts 2 and 3 proceed.

- ★ **"The instrument is still blind there" is RULED OUT.** The plan **is** delivered on river-run:
  a cast of **2**, at race progress **0.1504** — the choreo boundary, exactly where the product's
  heroes are cast. **So the STOP condition does not apply.**
- ★ **"The plan casts no comebacker" is RULED OUT** by the same number — the cast is 2, not 0.
- ★ **What is true:** on **all 118 frames where `_pickNextState` actually runs**, the detector offers
  **nobody** — `offerOnDecision` is **0 with the plan and 0 without it**, and `differOnDecision` is
  **0**. The candidate pool is therefore byte-identical on every decision frame, the weighted draw is
  identical, and the precedence never has a cast racer to act on.

**Address:** `comebackDetector.js` `best()` returns null on every one of those frames, under the
director's own gate in `CameraDirector._pickNextState` (outcome phase · comeback cooldown ·
`comebackWeight > 0`).

★ **A FINER DISTINCTION THAN "THE POPULATIONS COINCIDE".** They do not coincide — **both are empty**
at every decision. That is why an earlier, coarser probe was misleading: over *all* frames the
detector does offer somebody on river-run (768 of 3 862), and `_cast` and `_b1` disagree on 131 of the
gated frames. **None of those frames is a decision frame.** The first hypothesis in
CAMERA-PLAN-BLIND-1 — "the detector never offers anybody" — was checked and is false; this is the
corrected statement, and the difference between the two is entirely *which frames you count*.

★ **DO TWO EXPLANATIONS FIT?** No. "No comebacker cast" and "the instrument is blind" are both
excluded by the delivered cast of 2. "No overlap with a decision point" and "the camera never reaches
a comeback state" are **the same fact** here, not two: the state is never reached *because* nothing
is ever offered at a decision. **What would separate them if they were distinct** — a frame where a
candidate is offered at a decision and still loses the draw — **occurs zero times.**

---

## 2 · PART 2 — THE MINT

### Re-measured on this tree, and ★ what was minted is what was measured

| role | record before | ★ re-measured now | minted |
|---|---|---|---|
| **camera** | `75aef5cd474c54e5` | ★ **`92ab7120a80af8ed`** | **yes** |
| **render** | `40b2de6fcc5bafd8` | ★ **`5e5fdc3fb6656d68`** | **yes** |
| world | `8a1977187e9c99b4` | `8a1977187e9c99b4` | ★ **NOT minted — UNMOVED** |
| world-off | `aa09ed97a3a32689` | `aa09ed97a3a32689` | ★ **NOT minted — UNMOVED** |

Both reproduced CAMERA-PLAN-BLIND-1's values exactly, so the STOP in part 2.1 did not trigger.
**Golden races: PASS — not re-recorded.**

★ **`check-fingerprints --mint` re-ran every role's own `reproduce` command against the written
record: 4 of 4 agree.** That is the check that catches a record edited without re-minting.

★ **Stray copies: 0**, over 1 196 tracked files — the trap that caught the last two mints was looked
for and is clear.

### What the mint note records

The product is **not** changed (no camera file, no drawing file touched; the one product change,
`heroCurveGenerator.js`, is inert — world and world-off byte-identical, golden races pass, and the
per-track **frame counts are identical** either side of the fix). The cause per track, as §1. The
river-run answer. And the rule that ★ **every camera figure before this mint, and every render
figure, describes the blind picture on the nine tracks that moved and is not comparable across it** —
on river-run the two arms are byte-identical, so figures there carry across unchanged.

`mintedOn` is **PROVISIONAL** and is corrected to the merge commit after CI goes green, per THE SHIP
ORDER step 11.

### ★ THE SIX INSTRUMENTS STILL BLIND, NAMED IN THE RECORD ITSELF

Each builds its own frame loop, so fixing the shared driver does **not** fix them by inheritance:

`scripts/check-ending-frame.mjs` · `scripts/diag/start-formation.mjs` ·
`scripts/exp-anchor-truth-ab.mjs` · `scripts/exp-camera-bisect.mjs` · `scripts/finish-band-truth.mjs` ·
`scripts/sim-race-visual.mjs`

`scripts/camera-replay.mjs:345` already delivered a plan and was the only one that did. **They were
not fixed here — the decision rule said report them — and a record minted while six instruments still
run a director without a plan is honest only if it says so, which the mint note does.**

---

## 3 · PART 3 — CHECKS AND THE MERGE

| check | result |
|---|---|
| `npm run verify`, plain | ★ **PASS 25 · FAIL 0** |
| client suite | green (inside verify, retries disabled) |
| server suite | **35 files, 836 tests, all pass** |
| golden races | **PASS**, not re-recorded |
| temporary arms in tracked source | ★ **none** — no `setHoldArm`, no `_holdArm`, no `holdActive` |
| changed defaults | ★ **none** — `defaults.js` is untouched by this branch |

★ **Nothing was hidden behind the two fingerprint failures.** That was the explicit worry — the
racing guards were hidden behind the camera one last week — and with the record corrected the run is
green on all 25.

<!-- MERGE -->
