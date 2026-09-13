# BREAKAWAY-HISTORY-1 — the race did not get worse; the framing did

**Branch** `night/2026-09-14-history` · **MEASUREMENT ONLY — nothing built, nothing minted, nothing
merged, no lever proposed.** The instruments live in `C:/tmp/hist` and are swept at the end of the
night; every seed, stand SHA and fixture needed to race any of it again is written down below.

★ **READ-ONLY ON HIS DATA.** One read of `server/data/races.sqlite`, opened `readonly`. Nothing was
created, altered or deleted, and no server was started.

---

## ★★ THE ONE LINE

> You said races used to have far fewer runaway leaders than today. **Raced against raced races, the
> race itself has not changed at all.** At five points of master from 2026-08-04 to 2026-09-12, the
> largest lead the leader ever holds is **113.2 world px median and 223.5 at p90 — the same number at
> every point.** Not "close": **all 30 races are bit-identical at all five stands**, same winner, same
> duration, same peak lead to the last digit.
>
> ★★ **What did change is the camera.** Every shipped default that moved in those six weeks is a
> camera key. The same gap now covers **18% more of the screen at p90** than it did on 2026-08-19,
> and the step has one cause: **`contentionWatch`, shipped on 2026-08-22 in `d4bad558`** — which you
> judged on a production build and accepted.

**So the impression is not of the racers running further. It is of the same running looking bigger.**
Whether that is a problem is your call; this chain does not propose touching it.

---

## 1 · THE MEASURE

**THE LEAD** is the distance along the track from the racer in **P1** to the racer in **P2**, sampled
at every step from the start **to the winner's crossing**. The race's score is the **MAXIMUM** over the
whole race — not the gap at the finish, not the final margin.

**WHO IS P1** is the product's own live-standings comparator,
[index.jsx:1169-1174](../../client/src/screens/RaceScreen/index.jsx#L1169-L1174) — finished racers
first in `finishRank` order, then the unfinished. **Never a bare sort by `t`.** Inside the measured
window nobody has finished yet, so the two agree there; the product's rule is used anyway, because a
measure that is only accidentally right is not right.

**TWO UNITS, NEVER BLENDED:**

| | how | what is in it |
|---|---|---|
| **WORLD** | `(t_P1 − t_P2) × pathLengthPx` | the race, and **no camera at all** |
| **SCREEN** | `worldPx / cd.visibleWorldPx` | the race **and** the framing, at the stand's own default camera |

`t` is measured in path lengths ([durationModel.js:22](../../client/src/modules/durationModel.js#L22)),
so the multiplication is the whole conversion. The two maxima are tracked **separately**, because the
zoom moves during a race and the biggest world gap and the biggest screen gap need not fall on the
same step.

★ **WHO leads is not reported.** Splitting one curve by role gives four small ones and none of them
carries a verdict.

---

## 2 · THE FIXTURE, AND THE PROOF THAT IT IS HIS RACE

From `QN3HDP`, read once and pinned: **city-circuit**, closed, **2 laps**, `pathLengthPx` 6129.815,
**40 racers**, **motorbike**, and the 40-name roster (`Turbo … Gale`). A racer's **name is physics** —
`stablePairBit` hashes it — so the roster is part of the fixture, not decoration.

★ **The track is pinned rather than read per stand, and that is load-bearing.** `server/data/**` is
gitignored, so an old checkout has **no track record at all**; taking it from each stand would have
silently swapped the track under the ladder.

★★ **THE HARNESS REPRODUCES HIS STORED RACE: 40 of 40 finishing positions**, replayed on the tree it
was raced on, with its own stored world. It also lands on the same breakaway he photographed —
**Breeze, peak at progress 0.837, reeled in, finished 7th** — which is exactly what
BREAKAWAY-FREQUENCY-1 recorded.

---

## 3 · ★ A CORRECTION OWED TO BREAKAWAY-FREQUENCY-1

That report gives his photographed lead as **0.349 canvas widths**. Measured again tonight it is
**0.698 — exactly 2×, and the 2 is the lap count.** Its canvas-width figures divide the gap by
`finishT` once too often.

★ **The rest of that report is not withdrawn, and was checked rather than assumed.** Its **"1.538 % of
the race"** agrees with tonight **to three decimals**, and the holder, the progress and the 7th place
all reproduce exactly. **It is the canvas-width column only**, and every share keyed to 0.349.

★ **The size of the error is not one constant, and that is stated rather than glossed.** `finishT` is
the **lap count** on a closed track — 2 on all five the game ships — and a **fraction below 1** on an
open one, so a sweep pooling both scales them differently. **How much that moves that report's pooled
shares was not measured here.** Tonight's correction was measured on **his own race only**, on one
closed track, and is claimed no wider than that.

**Tonight's thresholds are therefore his lead, correctly scaled:** **188.55 world px** and
**0.698 screen widths**.

---

## 4 · THE LADDER — 5 points × 30 races

**The 30 seeds are `1 … 30`**, the same thirty at every point, forever. Each stand runs **its own
defaults** — action stage, world and camera from the tree under test, with no saved camera config
present so a stored setting cannot shadow the stand's own.

| stand | merge | date | stage | WORLD med | WORLD p90 | WORLD max | SCREEN med | SCREEN p90 | SCREEN max | reach 188.6 px | reach 0.698 w | never closed |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| −6 wk | `87961ca6` | 2026-08-04 | *none yet* | **113.2** | **223.5** | 248.9 | 0.607 | **1.140** | 1.464 | 17% | 43% | 17% |
| −4 wk | `48c72aee` | 2026-08-17 | *none yet* | **113.2** | **223.5** | 248.9 | 0.661 | **1.142** | 1.465 | 17% | 43% | 17% |
| −2 wk | `4b8b4c1a` | 2026-08-31 | quiet | **113.2** | **223.5** | 248.9 | 0.657 | **1.354** | 1.509 | 17% | 47% | 17% |
| −1 wk | `79fc2b6c` | 2026-09-07 | quiet | **113.2** | **223.5** | 248.9 | 0.657 | **1.354** | 1.509 | 17% | 47% | 17% |
| **today** | `b6d77637` | 2026-09-12 | quiet | **113.2** | **223.5** | 248.9 | 0.607 | **1.354** | 1.509 | 17% | 43% | 17% |

★★ **The WORLD column does not move by one digit.** Per the brief the two share columns are recorded
but **not read as a result at N=30** — their noise is wider than the effect. The median and p90 are
the search signal, and in world units they are flat.

### The −8 week rung does not exist, and why

| stand | date | verdict |
|---|---|---|
| `7883d453` | 2026-07-17 | **NOT MEASURABLE** — `client/src/modules/raceCore.js` does not exist (added 2026-07-24). The engine was a different shape; today's driver cannot drive it. |
| `175a4751` | 2026-07-29 | **NOT MEASURABLE** — `racer-types/index.js` transitively reads `import.meta.env.VITE_API_URL` (`services/api.js:11`), a Vite-only value node cannot supply. |

Per the decision rule the nearest neighbouring merge was taken: **`87961ca6`, 2026-08-04**, the
earliest that loads. **No old code was patched to make anything run.** The ladder therefore spans
**six weeks, not eight**, and says nothing about the race before 2026-08-04.

★ **One thing does reach every day of that span**, and it is cheap: loading only `defaults.js` at the
last merge of each day gives **34 of 42 days** (the same barrier stops the other 8), and across all
34 there are **ZERO changes to the engine-facing defaults** — `raceDynamicsConfig`,
`raceBehaviorConfig`, `rowLayoutConfig`, `baseSpeedConfig`, `autoScaleConfig`. Not sampled: every day.

---

## 5 · THE CONTROLS — why a flat line is a result and not a blind instrument

**THE NOISE FLOOR IS ZERO.** Master raced twice with the same 30 seeds is **bit-identical**. So on
this fixture any difference between two stands is a real difference, and "flat" can be read as flat
rather than as "within noise". It also means every step found below clears the floor by construction.

**THE POSITIVE CONTROL — the instrument moves when the world moves.** Forcing a different Race Action
stage through the product's **own** stage table (a real product value, never a number invented here):

| arm | WORLD med | WORLD p90 | never closed |
|---|---|---|---|
| shipped (`quiet`) | 113.2 | 223.5 | 17% |
| `medium` | **99.3** | 215.0 | **33%** |
| `wild` | **118.5** | 207.0 | 17% |

★ A world change of that size moves this measure plainly. **There was none to move it.**

**THE ADAPTER CONTROL — the harness is not the step.** `camera/cameraSeed.js` arrived 2026-08-22,
inside the span, so stands before it take the pinned constant and stands after derive the seed. That
confound is measured rather than argued: pinning the seed on a stand that would derive moves the
**median** ~4% and the **p90 by 0.3%**. So the p90 is the adapter-insensitive signal, and **the whole
bisect below was run with the seed pinned at every point** — the harness identical, only the product
changing.

---

## 6 · WHERE THE SCREEN CURVE STEPS — two steps, both in August

Bisected on the screen p90, camera seed pinned at every point, 30 races per point:

| | A (before) | B (after) | p90 | what B is |
|---|---|---|---|---|
| small | `fe766a26` 08-18 | **`884d0562`** 08-19 | 1.142 → **1.172** (+2.6%) | START-ONE-WINDOW-1 |
| ★★ **large** | `182fa3ac` 08-19 | **`d4bad558`** 08-22 | 1.172 → **1.350** (+15.2%) | ENDGAME-LAND-CLEAN-1 |

★ **The WORLD column is flat across both steps** — 113.2 / 223.5 on either side of each.

---

## 7 · ★★ WHAT CHANGED THERE (Piece 5 — read only, nothing built)

### The candidates, from the defaults printout

`182fa3ac → d4bad558` changes **no existing default value**. It **adds four camera keys**, each
turning something on:

```
+ contentionWatch: true      + bandFloor: true
+ contentionCheckMs: 250     + runInSchedule: true
```

### Which one it is — attributed by measurement, not by argument

Setting each key back to its pre-merge state (a different config for the same harness; **no code
change, no branch, no build**):

| arm | SCREEN p90 | explains the step? |
|---|---|---|
| B as shipped | 1.350 | — |
| B, `bandFloor` off | 1.350 | **no effect at all** |
| B, `runInSchedule` off | 1.332 | ~10% of it |
| ★★ **B, `contentionWatch` off** | **1.172** | ★★ **all of it — exactly A's value** |
| B, all three off | 1.172 | no more than `contentionWatch` alone |

★★ **`contentionWatch` IS the step.** One key, the whole 15.2%, landing on A's number to the digit.

### (i) WHAT it does

[`defaults.js:596`](../../client/src/modules/storage/defaults.js#L596) gates a check the director runs
on a cadence: *can this racer still win, judged from what is visible on track?* A racer whose
projected gap at the line exceeds one body length is **released** from the framing set. Fewer racers
to hold means a **tighter shot** — and the same world gap then covers more of the screen.

### (ii) WHY it was built — from the record only

[CONTENTION-WATCH-1](CONTENTION-WATCH-1.md), carried in the same merge. The defect was **14 frames of
space-sprint seed 9 with no part of the finish band on the canvas** — the camera was holding racers
the race had already decided, and lost the line doing it. With the watch on, band visibility over
those frames goes **0% → 72.5%**, and the worst single-frame zoom step **improves** (0.0792 → 0.0561
ln) rather than costing.

★ **Why it is ON.** `defaults.js:592-595` says it plainly: *"SHIPPED ON, 2026-08-24. The owner judged
a production build with this and `bandFloor` both on and accepted the picture; the default follows
from that acceptance rather than from a measurement."* **This is your decision, on the record.**

### (iii) WHETHER a revert would be safe today — three things say no

1. **The ship gate's item 7 is built on top of it.** `item7Membership` subtracts a released racer from
   the required set ([item7Membership.test.js:118](../../client/src/modules/camera/item7Membership.test.js#L118)),
   which is ITEM7-MEMBERSHIP-1 of 2026-09-04 — **after** this shipped. Its own sabotage note says that
   without the weight filter *"item 7 would then require a racer the race has already decided"*.
2. **The camera and render fingerprints would move.** Both were minted **2026-09-11** (`1fefc13d`),
   three weeks after this shipped, so both describe a picture with the watch ON. A revert needs a
   re-mint, and **a fingerprint is never minted without your eye first**.
3. **The defect it fixed comes back.** Nothing else in the tree keeps the finish band on canvas in
   that case.

**Ranking:** `contentionWatch` explains the large step **completely and alone**; `runInSchedule`
explains about a tenth of it; `bandFloor` explains none of it. There is no tie to declare.

---

## 8 · WHAT THIS DOES AND DOES NOT SAY

**It says:** on his own track, field, roster and racer, at the shipped defaults, the race a viewer
would see between 2026-08-04 and 2026-09-12 is **the same race, to the last digit** — and the picture
of it got about a fifth tighter at the top end, on 2026-08-22, for a reason you accepted.

**It does not say:**
- anything about the race **before 2026-08-04** — two stands are not measurable and the reason is
  recorded rather than worked around;
- anything about **other tracks or field sizes** — one fixture, chosen because it is his;
- that the framing change is **wrong**. It was built against a real defect, it fixed it, and you
  accepted the picture. That it also makes a gap read larger is a consequence that was not measured
  at the time, and is now.

★ **A note on the screen column, since it decides how §6 is read:** 8 of 30 screen maxima fall at
progress 1.000, where the endgame zoom is tightest — so part of the screen figure is the ending's
zoom rather than the race's gap. **The world column has none of that in it**, which is why it, and
not the screen column, carries the verdict about the race.

---

## 9 · REPRODUCING IT

- **Seeds:** `1 … 30` (ladder, bisect, controls); `1 … 300` (the proof of §6's pair).
- **Fixture:** `QN3HDP` — city-circuit, 40, motorbike, the 40-name roster, 2 laps.
- **Stands:** the SHAs in §4 and §6. Extracted with `git archive <sha> client/src`; **no worktrees,
  no junctions**, and each extraction removed at the end of the night.
- **The rule:** the product comes from the stand under test; **the driver and the measurement are
  always today's**, unchanged at every rung. Every module that does not exist at a stand is recorded
  as an adapter in that run's own output rather than silently substituted.
