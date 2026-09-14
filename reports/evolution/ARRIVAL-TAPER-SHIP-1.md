# ARRIVAL-TAPER-SHIP-1 — the servo is reverted, one shape remains, and the trade is not the one he agreed to

**Branch** `night/2026-09-12b` · **not merged** · **nothing minted** · **no golden race re-recorded**.

★★ **READ §4 BEFORE TREATING THIS BRANCH AS MERGEABLE.** The owner chose this shape on "1.042 at
arrival for about 0.6 points of band-reach". That part holds. What was not part of the trade is that
**the comebacker's gap on screen roughly triples at small fields** — and it comes from a half of the
shape he was not choosing between. The recommendation is held, as instructed.

---

## 1 · WHAT THE REVERT RESTORED

`ec7130a0` is undone. **It was not a `git revert`**: `876fd2da` had corrected its claim that the arm
was a no-op at a hundred racers, and `1997498a` had deleted its `SERVO_RESPONSE` switch and made the
ranks response unconditional. A plain revert would have conflicted with both, so the change was
undone surgically and all three went with it.

★ **WHAT ELSE CAME IN WITH `ec7130a0`, NAMED:** only `client/src/modules/servoResponse.test.js` (121
lines), which existed solely to pin the response curve. **Deleted**, rather than left pinning a curve
that no longer exists. Nothing else was in that commit.

★ **THE REVERT IS PROVEN COMPLETE, TWO WAYS.**

**At source** — the servo expression is byte-identical to the pre-servo tree:

    const rawTarget = clamp(1.0 + gain * (error / nActive) + noise, minMult, maxMult);

**By measurement** — same instrument, same seeds, same ten tracks, 60 races per cell, split by whether
the comebacker was ever in front:

| N | comebacker led? | leader braked (before → after) | leader servo cost (before → after) |
|---|---|---|---|
| 20 | **did not** | 86.8% → **86.8%** | −4.87% → **−4.87%** |
| 40 | **did not** | 87.2% → **87.2%** | −4.15% → **−4.15%** |
| 100 | **did not** | 85.3% → **85.3%** | −1.84% → **−1.84%** |
| 20 | HE LED | 89.8% → 53.7% | −6.31% → −3.95% |
| 40 | HE LED | 81.1% → 69.3% | −2.47% → −2.12% |
| 100 | HE LED | 83.9% → 75.5% | −1.65% → −1.42% |

★★ **AN ORDINARY LEADER IS IDENTICAL TO EVERY DECIMAL.** Every remaining difference is the comebacker
himself, when he is the one in front. That is the arrival shape, not the servo — and it is the whole
of §4.

The leader's traffic term is **0.00% in every cell of both arms**, as LEADER-GAP-1 found: a racer at
the front has nobody to avoid.

---

## 2 · ONE SHAPE IN THE TREE

**Kept: the taper at FOUR ranks** (`ARRIVAL_TAPER_START_RANKS = 4`). The sweep behind that choice:
two ranks gives the taper a median 864 ms and still arrives at 1.070; four gives it 2 480 ms, the
best worst-case gap of the arms measured, and the block rate up. Five reaches a better pace but is
unreachable for three comebackers in four at twenty racers.

★ **SABOTAGE CONFIRMS THE DISTANCE IS LOAD-BEARING**, and one result is worth keeping:

| arm | arrival pace N=20 | N=40 | taper fired |
|---|---|---|---|
| **shipped (4 ranks)** | **1.051** | **1.076** | yes |
| (a) taper removed | 1.100 | 1.092 | never |
| (b) distance set to 1 rank | 1.100 | 1.092 | **never** |

★ **AT ONE RANK THE TAPER IS A NO-OP, NOT MERELY SHORT.** `rankError` is an integer, so the span
`[0,1)` is never entered and `approachDrive` always returns 1. (b) is therefore identical to (a) —
the pace worsens exactly as predicted, and the reason is that the taper vanishes. That is also why
the sweep called two ranks "too short": one rank is not short, it is absent.

**Deleted** (all in `1997498a`, confirmed still gone): `ARRIVAL_VARIANT` and its four arms — A
(today), B (free on arrival), C (B + taper), D (C + runaway guard) — the five `E<digit>` distances,
`arrivalTaper`, `ARRIVAL_TAPER_RANKS`, `RUNAWAY_LEAD_RANKS`, the switching mechanism itself, and
`client/e2e/arrival-variant.spec.js`. **Zero references remain** in client, e2e, scripts or docs.

★ **THE EXCEPT-THE-LEADER ARM WAS WITHDRAWN ON HIS INSTRUCTION AND WAS NEVER BUILT.**

Neither clamp number changed. No other role was touched.

---

## 3 · THE SHIPPED SHAPE — every figure with its n

**Method.** `sim-fairness --arrival-shape` via `exp-arrival-shape.mjs`: ten tracks at their own
`defaultRacerTypeId`, N ∈ {20,40,60,100}, **30 races per cell — 1 200 races, 717 comebackers**. Order
is `finishRank`.

| N | comebackers | arrival pace | at ≤1.06 | ★ lands in block | drift med | drift max |
|---|---|---|---|---|---|---|
| 20 | 189 | 1.051 | 33.9% | 91.0% | 0 | 5 |
| 40 | 207 | 1.076 | 16.9% | 88.9% | 0 | — |
| 60 | 166 | 1.053 | 12.0% | 90.4% | 0 | — |
| 100 | 155 | 1.029 | 23.2% | **76.1%** | 0 | — |

★ **POOLED BLOCK RATE 87.0% (n=717), above the 84% baseline.** Arrival pace 1.029–1.076 against
**1.100 / 1.092** with no taper (sabotage a) — the taper does what it was kept for.

★ **A CORRECTION TO THIS PIECE'S OWN EARLIER FIGURES.** A first pass at six seeds per cell reported a
cast rate of 37/68/37/57% and a block rate of **62% at N=100**. Both were the sample. At 30 races per
cell the cast rate is **63 / 69 / 55 / 52%** and the N=100 block rate is **76.1% at n=155**. The 62%
rested on about 34 cast races and is **withdrawn**.

★ **THE CAST RATE DOES DECLINE WITH FIELD SIZE, AND THE MECHANISM IS AT SOURCE.**
`stagedComebackRank(n)` stages the comebacker at `0.4 × n` — rank **8 / 16 / 24 / 40** at N =
20/40/60/100 — while `heldTiming` must fit that descent into a FIXED window (anchor 0.15 → release
0.70). A bigger field is a longer descent in the same runway, so more castings are refused as
infeasible. The decline is real; the 37% figures were not.

---

## 4 · ★★ THE ON-SCREEN GAP — AND THIS IS THE PART THAT CHANGES THE TRADE

**Method.** The camera-equipped instrument, **the same one on both arms, frozen before either ran**,
same seeds and same ten tracks. Canvas widths are the camera's own `visibleWorldPx`.

★ **FIRST, THE RECORDED BASELINE WAS NEVER COMPARABLE.** The 0.066 widths on record came from an
instrument whose definition of "leading" was narrower — a smoke test on this piece's instrument found
the same mismatch and it was corrected *before* any arm ran. Re-measured like for like, the
before-arm median is **0.107–0.172 widths, not 0.066**. Any comparison against 0.066 was invalid,
and that is a finding in itself.

★★ **BUT AGAINST THE CORRECT BASELINE THE PICTURE STILL GETS WORSE AT SMALL FIELDS:**

| N | races where he led | before, widths med | after, widths med | before MAX | after MAX |
|---|---|---|---|---|---|
| 20 | 22 | 0.107 | ★ **0.368** (3.4×) | 1.164 | ★ **2.116** |
| 40 | 41 | 0.126 | ★ **0.307** (2.4×) | 1.210 | 0.823 |
| 60 | 21/22 | 0.172 | 0.139 | 1.375 | 0.900 |
| 100 | 33 | 0.163 | 0.204 | 0.631 | 1.174 |

★★ **AND IT IS NOT THE TAPER.** The split in §1 settles it: in races where the comebacker never
leads, the two arms are identical to every decimal. The entire difference lives in races where he is
in front — because the shipped shape leaves an **arrived comebacker UNSTEERED inside his block**
(band steering, `strictness = 0`) instead of braking him toward his exact drawn rank. That is the
brake ARRIVAL-VARIANTS-1 measured at a median 0.977 while leading, and whose removal it costed at
**2.7× the on-screen gap** for variant B. This measures **3.4× at twenty racers** — the same effect,
independently reproduced.

★ **NOT MEASURED, AND NOT CLAIMED:** where in the race the peak now falls against where it fell
before. The controller records `maxLeadGapProgress`, but the pre-taper tree has no arrival
observation at all, so there is no before-figure to compare it to; a camera-side measurement would
have needed an instrument change mid-report, which the piece's own rule forbids. The competing
"the taper moves the break-away earlier" hypothesis is **not excluded by measurement** — it is simply
no longer needed, because the leading/not-leading split explains the whole difference.

★★ **WHAT THIS MEANS FOR THE DECISION.** The trade he accepted was *the taper's* price: 1.042 at
arrival for ~0.6 points of band-reach. That price is real and it is paid. **The tripled on-screen gap
is the price of a different half of the shape — "free inside his block" — which was never put to him
as a choice.** He may still want it: it is the half that produces the feel he asked for, and the
worst case at forty, sixty and a hundred racers is no worse than before. But it is his to accept.

---

## 5 · THE CAMERA, AND WHAT A CLEAN MERGE STILL NEEDS

★ **THE REVERT CLEARED THE CASE IT CAUSED.** `check-runin-frame` is down from **two** failures to
**one**:

| commit | failures |
|---|---|
| master | **PASS** |
| `983d9201` the comebacker is held and released | 1 — luger-hill n=100 |
| before this piece (servo shipped) | 2 — **+ garden-path n=40** |
| **now** | **1 — luger-hill n=100** |

garden-path n=40 was the servo change's doing and it is gone with it. **The original stands**: at
progress 0.950 in `LEADER_ZOOM`, `_lineCeiling` returns `Infinity` when the line cannot be framed
from the anchor, and an infinite ceiling never binds — so the shot zooms to its own preference and
the line leaves the canvas, with the probe truthfully naming `state`.

★★ **STOPPED, NOT FIXED.** Making an unframeable line do something else changes the camera on every
track and every race. The rule is that he judges the picture. **This is the one thing still blocking
a clean merge.**

---

## 6 · WHAT THE MERGE WILL NEED

`verify` plain: **PASS 24 · FAIL 6 · SKIP 4.**

| guard | why |
|---|---|
| `world-fingerprint`, `camera-fingerprint`, `render-fingerprint` | ★ red **BY DESIGN** — the race changed |
| `client-suite` | the golden parity pins inside it |
| `check-runin-frame` | §5 — the one real defect |
| `check-index` | this report, not yet indexed when the run started |

**New world fingerprint `defbce50092d965c`** (it was `bdf4a3c8ce6e0316` before any of this work and
`815b36cd5a9149ce` with the servo shipped). Per track: city-circuit `a6892177f475` · dirt-oval
`ab94bd3b6d88` · garden-path `9f86a644c95c` · ice-track `0246ecbe7a35` · luger-hill `41ba46864505` ·
mountainstreet `8a6bf377bcfe` · river-run `29742c451ffa` · searound `1fe4a8074974` · seatrack
`8b3f023f86d0` · space-sprint `edc1069a4dda`. **Nothing is minted.**

★★ **THE GOLDEN RACES NEED NO RE-RECORDING, AND THAT IS MEASURED RATHER THAN HOPED.**
`check-golden-races` **PASSES** — "every finishing position and time as recorded". The reason is in
the guard's own output: its two races are **12 racers and 6 racers**, and `stagedComebackRank`
returns `null` below `STAGED_COMEBACK.MIN_FIELD` (20). No comebacker is staged at those field sizes,
so the shape never fires and both races are byte-identical to master. `script-suite`, which carries
that guard's test, passes with it. **An earlier draft of this report said they would need
re-recording; that was wrong and is corrected here.**

**When he approves**, the merge needs exactly: the world / camera / render fingerprints minted, and
`check-runin-frame`'s remaining case either fixed or accepted. **No golden race is touched.** Until
then the branch stays as it is.
