# SERVO-FAULT-1 — the noise causes the restarts, the clamp is what saves the large corrections, and delivering everything is not a fix

Branch `feat/gap-leader-brake`. **Read-only on shipped code: no shipped source changed, nothing
minted, nothing merged.** Date: 2026-09-15. The owner's store was not opened.

---

## THE SHORT ANSWER

1. **The restart driver is the NOISE, and it is now separated exactly.** The ±0.0008 noise alone
   could have caused **86.1%** of all target rewrites; the command's own movement only **15.2%**
   (they overlap by 3.0%). For the leader the noise accounts for **95.0%**.
2. **The "small ask is near the threshold" hypothesis is REFUTED.** A 1–2-rank ask is ~0.05 — **50×**
   `TARGET_EPSILON`, not comparable to it. What separates the two groups is **the clamp**: the
   16+-ranks-off group is **100% pinned at a clamp**, which clips the noise away so the command stops
   moving and the ease completes (94.6% arrival). The 1–2-rank group is **1.0% clamped** (56.8%).
3. **The overshoot is the command, not the ease.** Of the steps delivering above 1.05, **47.7%** are
   steps where the command SHRANK under a held value still catching up; 43.1% are the ease still
   travelling. `easeInOutCubic` is monotone on [0,1] and cannot overshoot.
4. **The blunt counterfactual — deliver every command — arrives (69.3% → 99.9%) and is not a
   candidate.** It changes the winner in **198 of 300** races, leaves **0 of 300** byte-identical,
   moves **all four fingerprints**, reddens a golden race, and takes the largest single-step
   multiplier move from **0.0117 to 0.2506 — 21×, on 300 of 300 races**.
5. **The gap brake would still have work.** With the servo arriving it engages in **89 of 300** races
   (down from 137) but takes **more** off the worst race — **−81.5 px (−25.2%)** against **−16.8 px
   (−6.9%)** today, because the arriving servo produces a worse tail for it to cut.

---

## THE INSTRUMENT, AND ITS INERTNESS PROOF

The shipped build never exposes the command the servo **formed** — only the one it **wrote**, which
the epsilon can make stale, and it exposes neither the deterministic part nor the noise separately.
So the measurement runs on an instrumented copy (`C:/tmp/srv`, a worktree of `77680606`) carrying
**flag-gated lines, all default off**: an observer that records `rawTarget`, its deterministic part
and its noise, and a counterfactual that substitutes `_retargetInFlight` for `_setTarget` at the
servo write.

**Proven inert before any number was read**, on 8 races × 2 brake arms = 16 cases, under both the
global and the environment-variable gate:

| | flags off | observer via global | observer via env | counterfactual |
|---|---|---|---|---|
| 16 cases | **16/16 IDENTICAL** | **16/16 IDENTICAL** | **16/16 IDENTICAL** | differs on 16/16, as it must |

"Identical" = full finishing order **and** all 40 finish times to the millisecond.

---

## STEP 1 — WHY THESE TWO CASES

### Where the servo forms, writes and delivers

**Forms** at [racePlanner.js:1372](../../client/src/modules/racePlanner.js#L1372) —
`clamp(1.0 + gain * (error / nActive) + noise, minMult, ceilFor)` — with `gain` 2.0
([racePlanner.js:101](../../client/src/modules/racePlanner.js#L101)), so **one rank of steering error
is exactly `2.0/40 = 0.0500`**, and `noise = (rng() - 0.5) * 2 * plan._stochasticNoise` at
[racePlanner.js:1360](../../client/src/modules/racePlanner.js#L1360), `_stochasticNoise` resolving to
0.0008 ([racePlanner.js:286](../../client/src/modules/racePlanner.js#L286) ←
[racePlanner.js:108](../../client/src/modules/racePlanner.js#L108)).

**Writes** at [racePlanner.js:1391](../../client/src/modules/racePlanner.js#L1391) via `_setTarget`
([racePlanner.js:733-739](../../client/src/modules/racePlanner.js#L733-L739)), gated on
`TARGET_EPSILON` 0.001 ([racePlanner.js:704](../../client/src/modules/racePlanner.js#L704)), which on
firing resets `trajectoryMultPrev` to the value held now
([racePlanner.js:735](../../client/src/modules/racePlanner.js#L735)) and the clock
([racePlanner.js:737](../../client/src/modules/racePlanner.js#L737)).

**Delivers** at [raceCore.js:584-591](../../client/src/modules/raceCore.js#L584-L591) —
`prev + (target - prev) * easeInOutCubic(elapsed / TT_DUR_MS)` — `TT_DUR_MS` being
`trajectoryTransitionDurationMs` ([raceCore.js:583](../../client/src/modules/raceCore.js#L583)),
1000 ms shipped.

### 1a — the two restart drivers, separated exactly

The observer records `det` and `noise` separately, so each write is attributed by two exact
counterfactuals: **DET ALONE** (`|det − previousWritten| > EPS`?) and **NOISE ALONE**
(`|previousDet + noise − previousWritten| > EPS`?). 3 races, N = 286,707 racer-steps.

| slice | steps | writes | BOTH | DET alone | NOISE alone | neither alone |
|---|---|---|---|---|---|---|
| whole field | 286,707 | 9.5% | 3.0% | 12.2% | **83.1%** | 1.7% |
| **the leader (rank 1)** | 7,967 | 9.6% | 0.9% | 2.2% | **95.0%** | 1.8% |
| 1–2 ranks off | 87,178 | 15.2% | 2.7% | **84.6%** | 1.4% | — |

★ **The noise alone could have caused 86.1% of all rewrites; the command's own movement 15.2%.**
SERVO-ARRIVAL-1 could not separate these; with the deterministic part recorded, they separate
cleanly. For the leader it is almost entirely the noise.

### 1b — why small corrections fare worse: the clamp, not the threshold

| slice | N steps | median ask | ask ≤ EPS | **AT a clamp** | median &#124;Δcmd&#124; | &#124;Δcmd&#124; > EPS | arrived |
|---|---|---|---|---|---|---|---|
| whole field | 286,827 | 0.0751 | 17.6% | 35.5% | 0.000205 | 10.0% | 70.1% |
| the leader (rank 1) | 7,970 | 0.0503 | 28.3% | 16.5% | 0.000369 | 12.8% | 51.3% |
| **1–2 ranks off** | 87,188 | 0.0495 | 7.5% | **1.0%** | 0.000476 | 15.8% | **56.8%** |
| **16+ ranks off** | 26,944 | 0.1500 | 0.0% | **100.0%** | **0.000000** | **0.0%** | **94.6%** |

★ **THE HYPOTHESIS AS PUT IS REFUTED.** A 1–2-rank ask is 0.0495 — **50× the epsilon**, nowhere near
it. The separating variable is the clamp at
[racePlanner.js:1372](../../client/src/modules/racePlanner.js#L1372): a racer 16+ ranks off his place
has `gain × error/nActive` ≥ 0.8, far outside `[minMult, ceilFor]`, so his command is **pinned, his
noise is clipped away entirely, his command stops moving (median Δ exactly 0.000000, 0.0% above the
epsilon), the ease completes, and it arrives.** A racer 1–2 ranks off sits well inside the clamp and
jitters every step.

### 1c — the leader against a mid-field racer, same kind of slice

★ Slices, not racers: the population result is about the rank-1 **steps** of whoever leads.
ice-track seed 3.

| | leader Flare, his rank-1 steps | mid-field Hawk, his rank 15–25 steps | Flare, whole race |
|---|---|---|---|
| N steps | 1176 | 1852 | 3958 |
| command, median | 0.95005 | 1.00070 | 1.10000 |
| &#124;ask&#124;, median | 0.04995 | 0.02562 | 0.10000 |
| **AT a clamp** | **0.0%** | 1.7% | **52.7%** |
| median &#124;Δcmd&#124; | 0.000461 | 0.000463 | **0.000000** |
| sign flips of the ask | one every 16.3 steps | one every 11.4 | one every 39.2 |
| **delivered, median** | **−0.275** | 0.467 | **0.997** |
| arrived / wrong side | **13.3% / 57.6%** | 34.1% / 39.5% | 67.0% / 19.4% |

★ **What makes the leader different is not a noisier command — the noise is identical for every
racer by construction.** It is that while leading he is **never clamped** (0.0% against 52.7% over
his own whole race), and his command has **reversed sign**: he was boosted to 1.10 to get to the
front and is now asked for 0.95, so the held value must travel across 1.0 — the longest journey —
while the noise restarts the ease every ~10 steps. He is on the **wrong side of natural speed on
57.6%** of those steps.

### 1d — the overshoot

N = 217,979 steps with an ask ≥ 0.025; delivered above 1.05 on 35,582 (16.3%).

| cause | share |
|---|---|
| the **command shrank** since the previous step (held chasing a bigger, older ask) | **47.7%** |
| the ease still travelling toward the written target | 43.1% |
| neither | 9.2% |

★ **The overshoot is the command moving back under a held value still catching up, not the ease
overshooting** — `easeInOutCubic` is monotone on [0,1] and cannot exceed its target.

---

## STEPS 2 AND 3 — THE BLUNT COUNTERFACTUAL

Sweep fixture: ten tracks, seeds 1–30, 40 racers, the owner's roster, `wild`, N = 30 per track.
Four arms: brake OFF/ON × servo today/arriving.

### It does deliver

| | today | if it arrived |
|---|---|---|
| arrival overall (N = 19,464,218 commanded racer-steps) | 69.3% | **99.9%** |
| **the leader** | 55.8% | **100.0%** |
| **small corrections (1–2 off)** | 57.8% | **100.0%** |
| large corrections (16+ off) | 93.3% | 100.0% |
| wrong side of natural speed | 10.2% | **0.0%** |
| threshold-free: median delivered fraction / p90 | 1.000 / 1.340 | 1.000 / **1.000** |

### What it costs

| | today | if it arrived |
|---|---|---|
| in-window (window→0.95) med / p90 / **max** | 81.4 / 159.3 / **244.4** | 64.5 / 134.0 / **323.3** |
| window→finish med / p90 / max | 121.4 / 178.7 / 279.6 | 102.3 / 166.8 / 323.3 |
| races with a lead above 90 px in-window | 139/300 | **90/300** |
| **rank error against the drawn plan (mean)** | **2.595** | **2.881 — WORSE** |
| exact-place hits | 1558/12000 | 1426/12000 |
| byte-identical | — | **0/300** |
| winner changes | — | **198/300** |

★ **The typical race improves and the worst race gets worse**: the median in-window lead falls 81.4 →
64.5 px while the maximum rises 244.4 → 323.3 px (1.086 → 1.437 canvas widths against the **SETTLED
LEADER_ZOOM value of 225 px/width**, ZOOM-PER-STATE-1 — never a frame zoom).

★★ **And the thing the servo exists to reduce gets WORSE.** The mean finishing-rank error against the
drawn plan goes 2.595 → 2.881. Delivering every command makes the servo *less* accurate, because the
lag is currently acting as a low-pass filter on its own noise.

### Would the brake still be needed? — **it still does work the servo does not**

| | servo today | servo arriving |
|---|---|---|
| brake engages in | 137/300 races | **89/300** |
| median time pulling | 9.18 s | 10.18 s |
| what it takes off the worst in-window race | 244.4 → 227.6 px (**−16.8, −6.9%**) | 323.3 → 241.8 px (**−81.5, −25.2%**) |
| races the brake improves | 50/300 | 36/300 |
| races still above 90 px in-window, brake ON | 139/300 | 90/300 |

**Plainly: the brake does not become unnecessary.** It fires in a third fewer races, but on the races
where it does fire it does **more** work, because an arriving servo produces a worse tail.

---

## STEP 4 — WHAT A FIX WOULD COST

### All four fingerprints move

| role | record | on the counterfactual |
|---|---|---|
| world | `b35cf477c09a1116` | **`7e5d10cf119c8798`** |
| world-off | `19ccb497041a0dae` | **`38d380a6e18fc669`** |
| camera | `3df640a42e934312` | **`8860380feac4677f`** |
| render | `6a84085e79535dd6` | **`d941137110720658`** |

(With the flags off, the same instrumented copy reproduces the world and world-off values exactly —
the baseline check that makes the four above meaningful.)

### Tests and guards, by address

| what | result |
|---|---|
| **client suite** (`C:/tmp/srv/client`, `RA_SERVO_ARRIVES=1`) | **4 failed of 4701; 257 of 259 files passed** |
| `client/src/modules/parity/goldenRealArm.test.js` | 3 failures — searound/manta/40 seeds 1, 7, 42 |
| `client/src/modules/parity/replay.test.js` | 1 failure — "a saved identity replays byte-identically" |
| `scripts/check-golden-races.mjs` | **RED** — `closed-garden-path-12`: Flash (position 1) expected 36.592 s, got 36.640 s (+0.048 s) |

★★ **The four parity failures are a MOVED INPUT, not a broken guarantee, and it matters which.**
Checked directly: with the flag on, `realArm` and `simArm` **both** change and **both land on the
same hash `fe3f4861`** — browser/sim byte-identity **holds**. What fails is the assertion two lines
later, `expect(a.results.find(r => r.finalRank === 1).racerIndex).toBe(REAL_ARM_WINNERS[seed])`
([goldenRealArm.test.js:57](../../client/src/modules/parity/goldenRealArm.test.js#L57)) — the
**pinned shipped winner**. So the cost is a re-baseline of pinned outcomes, not a parity break.

| flag | real | sim | |
|---|---|---|---|
| off | `10cb5111` | `10cb5111` | MATCH |
| on | `fe3f4861` | `fe3f4861` | **MATCH** |

### Visibility — a servo that suddenly arrives is a servo you can see

| | median | p90 | **max** |
|---|---|---|---|
| largest single-step change of any racer's multiplier, today | 0.011722 | 0.011762 | **0.011762** |
| the same, counterfactual | 0.200619 | 0.250000 | **0.250000** |

★ **21.3× today's largest, and larger on 300 of 300 races.** Once the ease completes it tracks the
target exactly, so a rank change — worth 0.05 — lands in a single 16 ms step. **The owner's standing
rule is that nothing may be abrupt; this breaks it on every race.**

### Scope

The change is at the servo write, which runs **for every racer on every step**. Not the leader only:
**300 races × 40 racers = 12,000 racer-slots, all of them.** 0 of 300 races byte-identical.

### Fairness

The project's instrument is **`scripts/sim-fairness.mjs`** (start-row fairness via
`scripts/sim/observers/fairness-stats.mjs`). **It was NOT run to a usable N in this block.** A run at
`--races=5 --racers=40 --track-defaults` was started and killed after **925 s of CPU with zero output
written** — the instrument buffers and the fixture (races × racer configs × tracks × durations) is
far larger than the flag suggests. The pinned methodology is **300 races per track**; nothing
approaching that was reached. **Reported as not run rather than presented as a short run.**

---

## WHAT THIS DOES NOT SETTLE

- **The fairness verdict on the counterfactual is unmeasured** (above). It does not change the
  recommendation — the visibility number alone disqualifies this arm — but it is a gap in the record.
- The instrument **cannot separate** which term inside the blended `error` moves when a racer's own
  rank does not change; the noise/movement split above is exact **for the restart decision**, which is
  the question that was asked.
- N = 300 races for every sweep figure; N = 3 races for the per-step tables; N = 1 race for the Flare
  slices.
