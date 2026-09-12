# DIRECTION-AUTHORITY-1 — the comebacker is HELD and then RELEASED, and the sign flips at every field size

2026-09-12 · branch `night/2026-09-12b` · **BUILT AND MEASURED. The race CHANGES. Nothing minted, no
golden race re-recorded, not merged — he looks first.**

★ **THE ANSWER IN ONE LINE.** The staged comebacker was authored as a ROUND TRIP and never fired —
0 of 180, then 9 of 200. He is now a **HOLD-AND-RELEASE**: one authored leg down to a staging rank,
ending at 0.70, after which the curve is over and he climbs back by racing. **He is now cast in
52–70% of races, and the places he gains flip sign at every field size** — from −3/−9/−15/−25 to
**+1/+6/+10/+25**.

| | before | after |
|---|---|---|
| cast at all (200 races) | **0 of 180**, then 9 of 200 | ★ **52–70%** |
| places gained, N=100 | **−25** | ★ **+25** |
| reaches the top 5, N=100 | 10% | ★ **30%** |
| heroes per race | 5.31 | 5.21 |
| B2 attackers, fallers, sovereign-leads | 578 / 61 / 68 | ★ **578 / 61 / 68 — unchanged** |

---

## 1 · WHAT WAS BUILT, AND WHY THE SHAPE HAD TO CHANGE

★ **THE ROUND TRIP CANNOT FIT, AND THAT IS MEASURED, NOT ARGUED.** `feasibleTiming` has to buy BOTH
legs — down to the staging rank and back to the top 5 — out of one budget, and COMEBACK-CONSTANT-
DEFICIT-1 measured that round trip needing **1.66× the runway that exists** (median, 200 races). The
same report established that no value of `minJerkPeakFactor` buys it: at 1.0 — no premium at all —
it still casts **0 of 200**.

★ **THE DESCENT ALONE FITS.** It needs roughly half its window. So the comebacker is now authored as
ONE leg:

> he is steered down to a staging rank, arriving at `holdReleaseProgress`. **There the curve ENDS.**
> From that progress he is steered to his DRAWN place like any other racer, and the climb is raced
> rather than authored.

That is the owner's own description, and PACE-DEFICIT-1 had already measured the climb it relies on:
a racer released at 0.70 regains **18 to 64 places** in the last 30%.

### ★ IT IS A PROPERTY, NOT A ROLE

Nothing added reads a hero's name — a gate that waived a rule for "the comebacker" would be a second
definition of feasibility, and this project has paid for that shape before. What is read instead:

- the curve carries **`releaseAt`**, and only a held curve has one;
- `checkPositiveBudget` is skipped for a curve **that is not trying to deliver anyone into a band** —
  asking a hold to be in-band at its own last point is asking it not to be a hold;
- the planner releases at **the curve's own end**, so the release and the shape are the same fact.

### ★ DIRECTIONAL FEASIBILITY — and NEITHER CLAMP NUMBER MOVED

The controller clamp is asymmetric: `maxMult` and `minMult` are not equidistant from 1.0, and the
drop authority is half again the climb authority. The gate priced **both** directions at the climb
half. Each leg is now priced by the authority governing **its own direction of travel** — a racer
climbs by out-accelerating the field and falls back by not accelerating, and the shipped clamp
already said the second is cheaper. **Both numbers already ship and neither moved**; the drop budget
is DERIVED from `minMult` and threaded live from the planner, so a tuned clamp moves the gate with it.

### ★ ONE THING TRIED FIRST, MEASURED, AND DELIBERATELY NOT DONE

`racerFeasibility` counts `(ahead + behind)` — **both** directions — and then uses it as a
**one-directional** rate. Splitting the count per direction is the more defensible model and was
built first. It **roughly halves the rate and collapses the cast to nothing**, because
`speedBudgetFrac` was calibrated against the existing expression. Re-calibrating it is a separate
change with its own measurement. **Named at source, left undone.**

★ **AND THE DIRECTIONAL BUDGET BUYS NOTHING ON ITS OWN, which is worth saying plainly.** Measured on
4 400 racers across four field sizes, the climb and drop rates are **identical in 100% of cases**:
the budget window already spans the entire field, so widening it reaches no further. **The shape
change is what did the work; the direction split is correctness, not leverage.**

---

## 2 · ★ HOW OFTEN THE ROLE IS CAST

**Method.** 10 tracks × {20, 40, 60, 100} racers × 5 seeds = **200 races**, shipped engine, no arm.
`held` is read from the PLAN (`getHeldRelease`), never guessed from the race.

| N | races | ★ HELD comebacker cast | before |
|---|---|---|---|
| 20 | 50 | ★ **35 (70%)** | 0 of 180 |
| 40 | 50 | ★ **26 (52%)** | 0 of 180 |
| 60 | 50 | ★ **30 (60%)** | 0 of 180 |
| 100 | 50 | ★ **30 (60%)** | 0 of 180 |

★ **HONESTLY AGAINST THE BRIEF'S BAR.** It asked for "the large majority of big-enough races".
**52–70% is a majority, not a large one.** At the gate alone the shape is feasible in 83–100% of
races; the rest is lost to slot competition with the other roles and to the hole guard. **That gap is
the piece's own open number, and it is named rather than rounded up.**

---

## 3 · ★ WHAT HE DOES — AND THE SIGN FLIPS AT EVERY FIELD SIZE

`placesGained` is rank at the 0.70 release minus finishing rank. Medians.

| N | held | staged depth | rank at 0.70 | finish | ★ places gained | ★ top 5 |
|---|---|---|---|---|---|---|
| 20 | 35 | 10 | 7 | 6 | **+1** | 16/35 (46%) |
| 40 | 26 | 18 | 14 | 6 | ★ **+6** | 12/26 (46%) |
| 60 | 30 | 27 | 21 | 14 | ★ **+10** | 8/30 (27%) |
| 100 | 30 | 45 | 33 | 11 | ★ **+25** | 9/30 (30%) |

**THE CONTROL — the same 200 races on the old engine, every comebacker:**

| N | comebackers | rank at 0.70 | finish | places gained | top 5 |
|---|---|---|---|---|---|
| 20 | 81 | 4 | 6 | **−3** | 39/81 (48%) |
| 40 | 89 | 3 | 13 | **−9** | 29/89 (33%) |
| 60 | 104 | 5 | 20 | **−15** | 15/104 (14%) |
| 100 | 81 | 5 | 32 | **−25** | 8/81 (10%) |

★ **THE COMPARISON HE ASKED FOR.** He rejected a 6→3 move as not a comeback. The held comebacker's
median move is **14→6 at N=40, 21→14 at N=60 and 33→11 at N=100** — and the old one went
*backwards* at every size. **Top-5 reach rises at three sizes of four**: 33%→46%, 14%→27%, 10%→30%.

★ **N=20 IS THE WEAK CASE AND IT IS NOT DRESSED UP.** +1 place, and top-5 reach slips 48%→46%. At
twenty racers the staging rank is 8 and the whole field is shallow, so there is little to come back
from — the same reason the rule casts nobody below twenty. **Whether 20 should be the floor rather
than, say, 30 is his call**; the number is here rather than buried.

---

## 4 · ★ THE PACE HE ACTUALLY RUNS — and it is far CHEAPER than predicted

**Predicted 5–8%. Measured: essentially free.** 80 races, held comebackers only.

| what was measured | result |
|---|---|
| his distance over the hold ÷ the field's MEDIAN distance | **0.998 – 1.005** (≈ 0%) |
| deepest multiplier the servo ever commanded | **0.9125** — an 8.8% deficit |
| what the clamp allows | 15% |

★ **WHY IT IS NEARLY FREE, MEASURED RATHER THAN ASSERTED.** At the 0.70 release the field is packed:
the racer a **third** of the way back is only **0.5–4.1%** behind the leader in distance, and at
N=20 only **0.5–0.8%**. So dropping twenty-five ranks costs almost no pace at all. The two numbers
disagree on purpose and both are reported, because quoting only the distance ratio would say the hold
costs nothing at all, and quoting only the servo's deepest command would overstate it.

★ **PACE-DEFICIT-1's 5–8% WAS AN UPPER BOUND AND SAID SO.** Its arm held a racer from the very FRONT
with a blunt constant multiplier; the servo here stops pushing once the target rank is reached.
**Nothing is being bought with pace nobody measured — the opposite.**

---

## 5 · ★ WHAT ELSE THE GATE NOW ACCEPTS, BY ROLE

| role | control | treatment | change |
|---|---|---|---|
| attacker-b2 | 578 | **578** | ★ **0** |
| faller | 61 | **61** | ★ **0** |
| sovereign-lead | 68 | **68** | ★ **0** |
| comebacker | 355 | 334 | −21 |
| **heroes per race** | 5.31 | **5.21** | −0.10 |

★ **HE WILL SEE NO HERO HE DID NOT ASK FOR.** Every other role is cast exactly as often as before,
to the race. The only change is within the comebacker slot: **121 of the 334 are now HELD ones**, and
the count falls slightly because one held comebacker sometimes occupies a slot that previously held
two fall-back ones. **The race gets marginally FEWER heroes, not more** — which is the opposite of
the risk the brief named.

---

## 6 · FAIRNESS

**Method.** `sim-fairness.mjs`, ten tracks, **each at ITS OWN `defaultRacerTypeId`** (never a
hardcoded one), 30 races × 40 racers per track at the track's shipped default duration, `--seed=1`,
race plan active. **300 races, 12 000 finishes.**

★ **A NUMBER, NOT A GATE — and the N is stated because it is SMALLER than the methodology's.**
`docs/FAIRNESS.md`'s pooled baseline is 300 races **per track** across all twenty racer types;
this is 30 per track at one type. It has the power to see a gross start-row effect and NOT a subtle
one, and it is reported on that basis.

### Band-reach — the comebacker's band AND the rest of the field

| track | B1 (1–5) | B2 | B3 | B4 |
|---|---|---|---|---|
| city-circuit | 88% | 88% | 85% | 94% |
| dirt-oval | 84% | 83% | 84% | 95% |
| garden-path | 83% | 87% | 84% | 93% |
| ice-track | 89% | 89% | 85% | 94% |
| luger-hill | 89% | 90% | 88% | 95% |
| mountainstreet | 86% | 89% | 87% | 94% |
| river-run | 88% | 90% | 87% | 94% |
| searound | 86% | 88% | 86% | 94% |
| seatrack | 88% | 89% | 87% | 95% |
| space-sprint | 87% | 89% | 86% | 94% |

★ **Every band on every track is between 83% and 95%, against the 70% line.** The comebacker's own
band (B1) is 83–89%, and it is not the weakest column on any track. ★ **His rule is that a DRAWN
PLACE IS REACHED, and holding a racer does not violate it** — the held comebacker is released with
30% of the race left precisely so his drawn place is still reachable, and B1 reach says it is.

### Per-start-row χ², with Holm

| track | χ² | p (uncorrected) | verdict |
|---|---|---|---|
| city-circuit | 0.7 | 0.880 | fair |
| dirt-oval | 0.7 | 0.880 | fair |
| garden-path | 0.3 | 0.847 | fair |
| ice-track | 3.9 | 0.275 | fair |
| **luger-hill** | **2.3** | **0.678** | **fair** |
| mountainstreet | 3.3 | 0.064 | fair |
| river-run | 0.1 | 0.714 | fair |
| searound | 4.0 | 0.679 | fair |
| seatrack | 2.3 | 0.324 | fair |
| space-sprint | 0.5 | 0.769 | fair |

★ **ZERO tracks are unfair, before any correction.** The smallest p is mountainstreet's 0.064, already
above 0.05 uncorrected; **Holm can only raise it**, so the corrected answer is zero as well and no
track needs a before/after line.

★ **AND `luger-hill` IS NOT CLAIMED AS FIXED.** The brief names it as already unfair on master at
**χ² 23.100**. It reads 2.3 here — but **that baseline was measured over all twenty racer types at
300 races per track, and this is luge alone at 30.** ★ **The two are not a matched pair and the
difference must not be read as a repair.** What this run does support is the narrower claim the piece
actually needs: **at the scale measured, the change introduces no new start-row unfairness anywhere.**
A matched re-run of the master baseline was not affordable tonight and is named as owed.

---

## 7 · SABOTAGE — BOTH, AND BOTH BIT

| # | the sabotage | result |
|---|---|---|
| a | **undo the change** — cast the staged comebacker as a round trip again | ★ **RED** — "the emitted curve carries its release, and ONLY held curves do" |
| b | **release at the wrong progress** — move `holdReleaseProgress` | ★ **RED** — two tests, including the one that pins the last 30% for the climb |

Both reverted. ★ The release test pins the number **as a number**, not against the config, precisely
because a test comparing the config to itself would pass at any value.

★ **AND THE EARLIER BRIEF'S NOTE THAT THESE TWO COULD NOT BE WRITTEN IS RETIRED WITH THE SHAPE IT
DESCRIBED.** COMEBACK-STAGED-1 could not sabotage a release because there was none. There is one now.

---

## 8 · THE BROWSER

★ **IT PASSES, AND THE TRACE IS THE PICTURE.** `client/e2e/held-comebacker.spec.js`, Dirt Oval,
Quick Test seed 41003, real Chromium, real renderer:

```
[held-comebacker] racer 0: hold starts at rank 6, deepest 11, at release 8, best after release 2
```

**Held back from 6th to 11th, released at 0.70 in 8th, and second by the end.** That is the shape,
seen from outside the engine.

**How it sees the race:** an INERT probe, `racearena:holdProbe`, the same shape as the race-inputs
probe beside it in `RaceScreen/index.jsx` and there for the same reason — without an observable the
spec could only RE-DERIVE the rank it is meant to check, which is not a check. It reads the PLAN's
own `getHeldRelease` and the live rank off the same sorted field the scoreboard uses.

★ **WHAT IT DELIBERATELY DOES NOT ASSERT: a finishing place.** A racer's NAME is physics here
(`stablePairBit` hashes it) and Quick Test's auto-filled players are not the sweep's roster, so the
same seed is a DIFFERENT race through this door. Pinning a headless number here would pin something
this door cannot reproduce. It asserts what it can settle: that a held hero exists, that he is held
BACKWARDS from where the hold found him, and that the release actually releases him.

★ **AND THE RUN REPRODUCED THE KNOWN GEOMETRY FLAKE** — `Failed to fetch`, 6 of 10 track geometries
uncached — **without failing**, because Dirt Oval was not among them. That is PIECE 5(b)'s subject and
it is named here rather than absorbed.

---

## 9 · FINGERPRINTS — ALL FOUR MOVED, AS EXPECTED

★ **NOTHING WAS MINTED AND NO GOLDEN RACE WAS RE-RECORDED.** These are measured and reported for his
eye.

| role | recorded | ★ measured now |
|---|---|---|
| world | `8a1977187e9c99b4` | ★ `bdf4a3c8ce6e0316` |
| world-off | `aa09ed97a3a32689` | ★ `cadd1d4b2391a2a6` |
| camera | `92ab7120a80af8ed` | ★ `3df640a42e934312` |
| render | `5e5fdc3fb6656d68` | ★ `6a84085e79535dd6` |

### ★ CAMERA AND RENDER MOVED TOO — REPORTED SEPARATELY, AS ASKED

The brief expected this change to alter **which race is run, not how it is drawn**. Both camera and
render moved anyway, and **the honest answer is that the two causes cannot be separated by assertion
here**:

- the race underneath them changed, which is enough on its own to move both;
- **and the camera now SEES the cast.** `camera-fingerprint.mjs`, `render-fingerprint.mjs` and
  `raceDriver.mjs` all deliver the camera plan through `scripts/lib/cameraPlanDelivery.mjs`. ★ **That
  corrects a standing note in my own memory** which said these harnesses were blind to the cast — true
  when COMEBACK-PRECEDENCE-1 wrote it, false since MINT-CAMERA-PLAN-1 shipped the helper.

**So: both fingerprints moved, one of the two causes is certainly present, and separating them needs
an experiment this piece did not run.** Named, not guessed.

---

## 10 · CHECKS

`node scripts/engine-reach.mjs --check`, verbatim from the commit hook:

```
ENGINE REACH: 3 of 8 path(s) can change the race:
  client/src/modules/heroCurveGenerator.js
  client/src/modules/racePlanner.js
  client/src/screens/RaceScreen/index.jsx
```

★ `RaceScreen/index.jsx` is in that list because of the **hold probe**, which is INERT unless
`racearena:holdProbe` is set — the same shape as the race-inputs probe beside it. It reaches the
engine's frame loop, so the guard counts it, and that is the guard being right rather than loud.

### `npm run verify` plain — **PASS 20 · FAIL 6 · SKIP 8**

| guard | result | whose red |
|---|---|---|
| `world-fingerprint` | FAIL | ★ **by design** — the race changed |
| `camera-fingerprint` | FAIL | ★ **by design**, §9 |
| `render-fingerprint` | FAIL | ★ **by design**, §9 |
| `client-suite` | FAIL | ★ **by design** — three RECORDED outcomes, see below |
| `check-index` | FAIL | this report, now indexed |
| ★ `check-runin-frame` | ★ **FAIL** | ★ **THIS PIECE'S, and it is a real one — see below** |
| **`golden-races`** | ★ **PASS** | — |
| the other 20, incl. `client-lint`, `script-suite`, `check-standings-invariant` | PASS | — |

**Server suite: 35 files, 836 tests, PASS** (`server/` is untouched by this change).

### ★ THE CLIENT-SUITE RED IS THREE RECORDED OUTCOMES — THE PARITY GUARANTEE HELD

Three assertions moved, and **every one of them is a stored expectation, not a live check**:

- `goldenRealArm.test.js` seeds 1 and 7 — the failure is at **line 57**, `REAL_ARM_WINNERS`. The lines
  above it — `expect(a.hash).toBe(b.hash)` and `expect(finishOrder(a)).toBe(finishOrder(b))` —
  **PASSED**. ★ **Real browser core and sim are still byte-identical**; only the winner moved
  (13→38, 38→17).
- `replay.test.js` — the saved identity's recorded first place moved (`Breeze`→`Surge`). Its own
  comment already says real == sim stays byte-identical, and it did.

★ **So the SIM-BROWSER PARITY RULE IS NOT BROKEN** — checked, not assumed, and this is the check that
mattered most. ★ **Nothing was re-recorded.**

### ★ THE ONE RED THIS PIECE OWNS — `check-runin-frame`, luger-hill at 100 racers

```
luger-hill n=100 LOST  worst -146 px at progress 0.950 (LEADER_ZOOM, zoom 0.928)
  10 of 256 outside the region, 5 OFF CANVAS
  FAIL: the viewer loses the line at progress 0.950, point at (1362, -18) on a 1280x720 canvas
```

★ **VERIFIED AGAINST MASTER IN A WORKTREE RATHER THAN ASSUMED**: on `master` the same case reads
**FINDABLE, worst 111 px, 0 OFF CANVAS** and the guard passes. **So this is new, and it is mine.**

**What it is:** not a camera-code change — the camera is reacting to a race it now runs differently,
and on this one track at this one field size it loses the finish line off the top of the canvas near
the end. **The guard is right to fail**: a camera pointed away from the race is a defect however good
the framing numbers look.

**What was NOT done about it, deliberately:** it is not fixed here. Fixing the camera is a different
piece with its own eye-test, and this branch is **not merged** — he looks first. ★ **It is the
strongest argument against merging this as it stands, and it is stated at the top of the open list
rather than buried in a checks table.**

★ **SIM PARITY HOLDS BY CONSTRUCTION.** `sim-fairness.mjs` imports `createTrajectoryController` from
`racePlanner.js` — the same module the change is in — so the hold and its release are mirrored with
no second copy to drift. Verified at source, not assumed.

**`git stash` was not used. `--no-verify` was not used. Sweep output stayed in the scratchpad.**

---

## 11 · WHAT IS OPEN, AND IT IS HIS

0. ★★ **`check-runin-frame` FAILS on luger-hill at 100 racers, and it did not on master.** The camera
   loses the finish line off the top of the canvas at progress 0.950. It is a consequence of the race
   changing, not of a camera edit, and it is NOT fixed here. **This is the reason not to merge tonight
   even if the comeback itself pleases him.** §10.
1. ★ **Is this the picture he wants?** Held to a third of the field, then racing back — at N=100 a
   median 33rd → 11th. **That is the question the whole chain exists for and only he can answer.**
2. ★ **52–70% cast, not the large majority the brief asked for.** The shape is feasible at the gate
   in 83–100%; the rest is lost to slot competition with the other roles. Raising it means giving the
   held comebacker precedence over another role, which is a design decision.
3. **N=20 gains +1 place and slightly loses top-5 reach.** The minimum field for casting is currently
   twenty; the measurement suggests thirty would be the honest floor.
4. **`holdReleaseProgress` is not UI-configurable.** Every other tunable of this kind reaches the Dev
   Screen; this one does not yet. Named as owed.
5. **The density rate is a two-directional count used as a one-directional rate** (§1). Correcting it
   needs `speedBudgetFrac` re-calibrated and is its own piece.
