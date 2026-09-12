# COMEBACK-BRAKE-EARLY-1 — the brake started sooner, bought less than it cost, and was REMOVED

2026-09-12 · branch `night/2026-09-12b` · **BUILT AND MEASURED. The race CHANGES. Nothing minted, no
golden race re-recorded, not merged.**

---

## ★★ 0 · THE CODE WAS TAKEN BACK OUT, 2026-09-12 — THE FINDINGS BELOW STAND

**The owner's decision on reading this report: remove it.** `approachTaper` and its use site are gone
from `racePlanner.js`, and `approachTaper.test.js` is deleted — nothing dead is left behind.

**Proved two ways, not asserted:**

- `git diff 331d997a -- client/src/modules/racePlanner.js` is **empty** — the file is byte-identical
  to its state before the taper existed;
- and the fingerprints came back: **world `bdf4a3c8ce6e0316`** and **world-off `cadd1d4b2391a2a6`**,
  exactly the values DIRECTION-AUTHORITY-1 measured. **The before-numbers returned.**

★ **EVERYTHING BELOW IS KEPT AS THE RECORD**, because three of its measurements are load-bearing for
what comes next and must not be re-derived:

1. ★ **The comebacker is NEVER drawn first** — 0 of 82 — because `heroCurveGenerator.js:654` excludes
   the drawn winner from the pool. He draws 2nd–5th, and the median MOVES with the field: 2nd at forty
   racers, 4th at a hundred.
2. ★ **The drive sits at `maxMult` right up to his drawn place** — at twenty racers the servo commands
   the full 1.100 one rank out. **That is the cause the next piece works on.**
3. ★ **The lead-in is a time argument**: the ease needs 0.60 s for three quarters, the last two ranks
   take only 0.38 s at p10.

---

★★ **THE STOP CONDITION YOU NAMED HAS FIRED, SO READ THIS FIRST.** The lead-in works — the
deceleration starts before he arrives and the gap settles faster — but **he now falls short of his
drawn place more often: 94% → 89%**, and the gain in peak gap is **not statistically distinguishable
from noise**. The brief said earlier-but-short against later-but-arriving is your choice. **This is
that choice, with the numbers.**

---

## 1 · ★ STEP 1, TABLE ONE — WHAT PLACE A CAST COMEBACKER ACTUALLY DRAWS

**Measured, 82 cast held comebackers, 10 tracks × 4 field sizes × 3 seeds on the shipped build.**

| N | n | drawn 1st | 2nd | 3rd | 4th | 5th | 6th+ | median |
|---|---|---|---|---|---|---|---|---|
| 20 | 27 | **0** | 9 | 14 | 3 | 1 | 0 | 3 |
| 40 | 17 | **0** | 9 | 2 | 6 | 0 | 0 | **2** |
| 60 | 18 | **0** | 2 | 9 | 4 | 3 | 0 | 3 |
| 100 | 20 | **0** | 4 | 5 | 4 | 7 | 0 | **4** |
| **all** | **82** | ★ **0** | **24** | **30** | **17** | **11** | 0 | 3 |

★★ **HE IS NEVER DRAWN FIRST — 0 of 82 — AND HE DRAWS ANYWHERE FROM 2nd TO 5th.** The median even
MOVES with the field: 2nd at forty racers, 4th at a hundred.

**At source, so the answer does not have to be trusted:** `heroCurveGenerator.js:642-643` draws the
pool from racers whose drawn rank is `<= BAND_EDGES[0]` (five), and `:654` requires
`p.index !== winnerIdx`, where `winnerIdx` is the racer drawn 1st (`:562`). **So 1st is excluded by
construction and 2nd–5th are all reachable.**

★ **YOU WERE RIGHT AND THE TRIGGER HAD TO BE HIS DRAWN PLACE, NOT A FIXED "3rd".** `racePlanner.js`
makes `plan._racerTargetRank` his target after the release, and that is what the lead-in is measured
against.

---

## 2 · ★ STEP 1, TABLE TWO — THE LEAD-IN IN SECONDS, AGAINST RANKS

**How long the last ranks of the climb actually take**, from first reaching `drawn + N` to first
reaching the drawn place:

| N | last 5 ranks | last 3 | last 2 | last 1 |
|---|---|---|---|---|
| 20 | 2.70 s | 1.43 | **1.12** | 0.40 |
| 40 | 4.42 s | 2.58 | **1.80** | 1.12 |
| 60 | 3.17 s | 1.68 | **0.97** | 0.38 |
| 100 | 5.08 s | 3.05 | **2.08** | 1.13 |
| **pooled median** | **3.48 s** | **2.42 s** | **1.43 s** | — |
| ★ **pooled p10** | ★ **1.17 s** | ★ **0.60 s** | ★ **0.38 s** | — |

**And what the ease needs** — `easeInOutCubic` over `trajectoryTransitionDuration`
(`raceCore.js:552-559`, `defaults.js:983`), computed from the shipped curve:

| delivered | at | at a 1 s ease |
|---|---|---|
| 50% | t = 0.500 | 0.50 s |
| **75%** | t = 0.603 | ★ **0.60 s** |
| 90% | t = 0.708 | 0.71 s |

★★ **THE COMPARISON THAT DECIDED THE LEAD-IN.** Two ranks buys a median 1.43 s but only **0.38 s** in
the fastest tenth — **less than the ease needs**, exactly the dense-field case you asked about, so two
ranks buys nothing there. Three ranks gives **0.60 s** at p10 — the ease's own figure, with no margin.
**Five ranks gives 1.17 s at p10 and 3.48 s at the median**, clearing the ease at every field size.
**The span is five.**

### ★ STEP 1, QUESTION THREE — THE RACER DRAWN 2nd

**24 of the 82 are drawn 2nd.** The lead-in itself fits: it starts BELOW his drawn place, where there
is always runway. What is tight is the room ABOVE — one rank — and the measurement shows it matters:
**13 of those 24 finished FIRST**, i.e. went straight past the only place they had. ★ **That is the
picture you watched, and it is the drawn-2nd case.** No fallback was invented.

---

## 3 · THE TRIGGER, BEFORE AND AFTER

★ **WHAT THE MEASUREMENT FOUND, AND IT IS SHARPER THAN "THE BRAKE IS LATE".** The drive is
`1 + gain × (error / nActive)` clamped at `maxMult` (`racePlanner.js:913`), and **the clamp BINDS for
the whole approach**:

| commanded multiplier while approaching | +5 ranks | +4 | +3 | +2 | +1 |
|---|---|---|---|---|---|
| N=20 **before** | 1.100 | 1.100 | 1.100 | 1.100 | ★ **1.100** |
| N=20 **after** | 1.100 | 1.100 | 1.100 | 1.080 | ★ **1.020** |
| N=40 before | 1.100 | 1.100 | 1.100 | 1.100 | 1.050 |
| N=40 after | 1.100 | 1.100 | 1.090 | 1.040 | 1.010 |
| N=100 before | 1.100 | 1.080 | 1.060 | 1.040 | 1.020 |
| N=100 after | 1.100 | 1.064 | 1.036 | 1.016 | 1.004 |

★★ **AT TWENTY RACERS THE SERVO COMMANDED THE CEILING AT ONE RANK OUT.** He crossed his drawn place
still asked for ten percent fast, and only then did a braking target appear — with the ease's 0.6 s
still to run. **That is the overshoot, and it explains why N=100 was always the mildest case: there
the drive already tapered.**

**What was built** — `approachTaper`, `racePlanner.js`, beside the release logic it belongs to:
inside the last five ranks the positive error is multiplied by the fraction of the lead-in still
remaining. ★ **It never reverses the drive** (the factor is in [0,1]) and ★ **it returns a braking
error untouched** — `minMult`, the gain and the ease duration are exactly what they were, and no role
is named.

---

## 4 · ★ THE PEAK GAP — PAIRED, AND IT IS A COIN FLIP

**48 races that took the lead in BOTH arms**, so the comparison is matched rather than two different
race sets.

| | median % of race | p90 % | max % | median widths | p90 widths | max widths |
|---|---|---|---|---|---|---|
| **before** | 0.298 | 0.949 | 1.338 | 0.077 | 0.319 | 0.655 |
| **after** | ★ **0.247** | 0.990 | ★ **1.297** | 0.076 | ★ **0.388** | ★ **0.455** |

★★ **PER RACE THE PEAK IS SMALLER IN 29 OF 48 — a coin flip.** Two-sided binomial **p ≈ 0.19**: **not
distinguishable from noise.** The median falls 17% and the worst case on screen falls 31%
(0.655 → 0.455 canvas widths), **but the p90 on screen RISES 22%** (0.319 → 0.388). ★ **The tail is
what you saw, and the tail did not reliably improve.**

**What did improve, and clearly:**

| | before | after |
|---|---|---|
| time to the peak | 2.9 s | **2.6 s** |
| time to halve it | 0.9 s | ★ **0.6 s** |
| came back down | 53/55 | 51/52 |

★ **AND HE STILL ARRIVES AT +7.4%.** His multiplier in the first second after reaching his drawn
place is **1.0741** — the ease still has not unwound the ceiling. **The lead-in did not buy enough.**

### ★ WHY IT CANNOT BUY MORE WITHOUT TOUCHING THE STRENGTH

Where the command leaves the ceiling, by lead-in span:

| lead-in | N=20 | N=40 | N=100 |
|---|---|---|---|
| 5 ranks | 2.2 ranks out | 3.2 | 5.0 |
| 8 ranks | 2.8 | 4.0 | 6.3 |
| 12 ranks | 3.4 | 4.8 | 7.7 |
| 20 ranks | 4.4 | 6.3 | 9.9 |

★★ **IT SCALES AS THE SQUARE ROOT OF THE SPAN.** Quadrupling the lead-in from 5 to 20 moves the exit
only from 2.2 to 4.4 ranks out — and a twenty-rank lead-in would start tapering a racer drawn 2nd
from rank 22. **The lever you chose is BOUNDED BY THE `maxMult` CLAMP.** Getting the command off the
ceiling appreciably earlier means reducing the drive's strength, which this piece was forbidden to do
and which you have so far declined.

---

## 5 · ★★ DOES HE STILL REACH HIS DRAWN PLACE? — NO, IN FIVE RACES HE DOES NOT

**82 paired races, unbiased** (every cast comebacker, not only those who reached the front — that
subset would beg the question):

| | reached his drawn place |
|---|---|
| before | **77 / 82 (94%)** |
| after | ★ **73 / 82 (89%)** |

**Paired, race by race:** ★ **5 lost it, 1 gained it**, 76 unchanged. McNemar two-sided on 6
discordant pairs gives **p ≈ 0.22 — also not significant**, so the cost is suggestive rather than
proven. ★ **BUT ITS SHAPE IS NOT RANDOM: FOUR OF THE FIVE LOSSES ARE RACERS DRAWN 2nd** —

```
dirt-oval      N=20  seed 41002  drawn 3
dirt-oval      N=100 seed 41001  drawn 2
mountainstreet N=40  seed 41001  drawn 2
searound       N=40  seed 41002  drawn 2
searound       N=100 seed 41002  drawn 2
```

★★ **THAT IS EXACTLY THE CASE STEP 1 QUESTION 3 FLAGGED.** A racer drawn 2nd has to take the last,
hardest rank, and the taper is weakest precisely there — it has scaled his drive down to a fifth by
the time he is one rank out. **`docs/FAIRNESS.md`'s rule is that a drawn place is REACHED, and this
makes that happen less often.**

★ **SO THE TRADE IS REAL AND IT IS YOURS: earlier-but-short against later-but-arriving.** Neither
effect is statistically significant on its own; what is clear is that the intended benefit is a coin
flip and the cost has a mechanism.

---

## 6 · WHAT MUST NOT REGRESS

| | before | after |
|---|---|---|
| cast in a race | **82/120 (68%)** | ★ **82/120 (68%) — unchanged** |
| ★ top-5 reach (by `finishRank`) | **69/82 (84%)** | ★ **69/82 (84%) — unchanged** |
| reached his drawn place | 77/82 (94%) | ★ **73/82 (89%)** — §5 |
| zero Holm-unfair tracks | 10/10 fair | ★ **10/10 fair — unchanged** (smallest p 0.110) |
| band-reach, every band every track | 83–95% | ★ **82–95%** — the floor moved one point |

★ **Top-5 reach is the CORRECTED 84% figure** — computed from `finishRank` (`raceCore.js:671`), never
a post-race sort by `t`, which is overshoot past the line and disagreed in 90% of cases.

---

## 7 · SABOTAGE — BOTH, AND BOTH BIT

| # | the sabotage | result |
|---|---|---|
| a | **undo the lead-in** — set the span to 0 ranks | ★ **RED** — 2 tests, including the ceiling one |
| b | **start the brake before the climb** — let the taper touch a braking error | ★ **RED** — the brake-protection test |

Both reverted. ★ **And sabotage (a) is also confirmed at RACE level**: the before-arm in §4 IS the
lead-in-off build, measured on the same 48 races with the same instrument, and the larger median peak
and slower settling come back.

---

## 8 · THE BROWSER — WHAT A PERSON SEES

`client/e2e/held-comebacker.spec.js`, Dirt Oval, Quick Test seed 41003, real Chromium — **passes**:

```
racer 0: hold starts at rank 6, deepest 11, at release 8, best after release 1 (release 0.7)
```

He is held back from 6th to 11th, released at 0.70 in 8th, and climbs. ★ **AND IN THIS PARTICULAR
RACE HE NOW GOES TO FIRST WHERE BEFORE HE REACHED SECOND** — the same spec on the previous build
logged `best after release 2`. **One race, and the browser roster is not the harness's, so it is not
evidence of a trend — but it is what a person watching this race would see, and it is the opposite of
the intended effect.**

**He settles into the group rather than pulling away**: the gap halves in 0.6 s (§4).

---

## 9 · FINGERPRINTS

| role | before this piece | ★ after |
|---|---|---|
| world | `bdf4a3c8ce6e0316` | ★ `22a592f45470ac55` |
| world-off | `cadd1d4b2391a2a6` | ★ `a42141464070326f` |
| camera | `3df640a42e934312` | ★ **unchanged** |
| render | `6a84085e79535dd6` | ★ **unchanged** |

★ **CAMERA AND RENDER DID NOT MOVE**, reported separately as asked: this changes which race is run,
and on the fixed identity those two instruments film, it did not change what is drawn.
**Nothing minted, no golden race re-recorded.**

---

## 10 · CHECKS

### `npm run verify` plain

**PASS 18 · FAIL 7** on the run below, of which **two were mine and both are fixed**:

- `check-index` — this report, now indexed.
- ★ `engine-reach-doc` — `docs/SIM.md`'s generated closure block read 193 files and the closure holds
  **194**. ★ **That is HISTORY-MISSING-2's debt surfacing here, not this piece's**: the file that
  joined was `modules/raceOverrun.test.js`. Regenerated with the command the guard names, and
  `script-suite` — which fails whenever a guard's own test runs that guard against a stale tree — went
  green with it (**411 pass, 0 fail**).

The rest are carried forward: the world / camera / render fingerprints differ from the RECORD (camera
and render have not moved since DIRECTION-AUTHORITY-1 — §9), `check-runin-frame` on luger-hill, and
the three client-suite recorded outcomes.

| check | result |
|---|---|
| **server suite** | ★ **35 files, 836 tests PASS** |
| **client suite** | **258 files, 4680 tests — 3 fail** |
| `approachTaper.test.js` | ★ **7 pass**, both sabotages RED |
| world / world-off fingerprints | **moved, by design** (§9) |
| camera / render fingerprints | ★ **unmoved** (§9) |

★ **THE THREE CLIENT-SUITE FAILURES ARE RECORDED OUTCOMES, NOT A PARITY BREAK — CHECKED, NOT
ASSUMED.** Both `goldenRealArm` failures are at **line 57**, the `REAL_ARM_WINNERS` constant; line 55's
`finishOrder(a) === finishOrder(b)` and the hash equality above it **passed**. `replay.test.js` is the
same shape. ★ **Real browser core and sim are still byte-identical**; only the recorded winners moved,
which is what a changed race does. **Nothing was re-recorded.**

★ **FAIRNESS METHOD**: `sim-fairness.mjs`, ten tracks each at ITS OWN `defaultRacerTypeId`, 30 races ×
40 racers at the track's shipped default duration, `--seed=1` — **300 races, 12 000 finishes**. Smaller
than `docs/FAIRNESS.md`'s 300-per-track methodology and stated as such; it has the power to see a gross
start-row effect and not a subtle one.

★ **THE BAND-REACH FLOOR MOVED ONE POINT**, 83% → 82% (garden-path B1). At 30 races per track that is
well inside noise, and it is reported as a number rather than waved through as "unchanged".

★ **CARRIED FORWARD, CONFIRMED STILL STANDING, FIXED BY NOBODY HERE:** `check-runin-frame` fails on
`luger-hill` at 100 racers · the browser race has **no upper bound** (`RaceScreen/index.jsx` ends only
at `finishedCount >= nRacers`) · `/api/health` reports an unknown build.

**`git stash` was not used. `--no-verify` was not used.**

---

## 11 · WHAT IS OPEN, AND IT IS YOURS

1. ★★ **Keep this or revert it?** It does what you asked — the deceleration starts sooner and the gap
   settles in 0.6 s instead of 0.9 — but the peak is smaller in only 29 of 48 races and he reaches his
   drawn place 5 times fewer. **Neither is significant; the cost has a mechanism and the benefit does
   not.**
2. ★ **The lever is bounded by `maxMult`** (§4). Going further means letting the drive be weaker in
   the approach, which is a strength change.
3. **The drawn-2nd case** is where both the overshoot and the cost concentrate — 24 of 82 casts, 13 of
   which finish first, and 4 of the 5 arrival losses.
