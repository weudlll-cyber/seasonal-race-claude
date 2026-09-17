# GAP-BRAKE-SWEEP-1 — the gap brake at the owner's settings, ten tracks

**Read-only.** No source file was changed, nothing built, nothing minted, nothing merged. Measured on
`feat/gap-leader-brake` at `249b61df`. Date: 2026-09-14. **The owner's store was not opened at all.**

**Settings, used verbatim:** `gapBrakeEnabled: true`, `gapBrakeAllowedGapPx: 124`,
`gapBrakeWindowEnd: 0.95`. The window start is not a setting — it is bound to the outcome-phase
boundary at [racePlanner.js:174-176](../../client/src/modules/racePlanner.js#L174-L176), and the
engine resolved it to **0.600** in every one of the 600 races.

**Fixture:** ten tracks × 30 races × two arms = **600 races, 0 failed**. 40 racers, the owner's
roster, `wild`. The same 30 seeds on every track: **1–30**.

**Method.** Five independent checkouts of `249b61df` in scratch, each running its own tracks
strictly sequentially — parallelism never shares a tree. 14 logical cores, 5 workers, 9 left free.
"Did the brake fire this frame" is never re-derived: the mechanism's own read-only counter
(`getGapBrakeStats`, [racePlanner.js:1594](../../client/src/modules/racePlanner.js#L1594)) is read
each frame and diffed, so the thing under test reports its own actions.

---

## THE SHORT ANSWERS

1. **It is a fallback on every track** — 0.69% to 6.41% of in-window leader frames, nowhere near the
   one-third threshold.
2. **A viewer would not see a braking event.** The largest single-frame move of the leader's
   multiplier inside the window is **identical with the brake on and off, on all ten tracks**.
3. **It barely moves the worst gaps**, because on 4 of 10 tracks the worst race peaks *before* the
   window starts. Seven tracks' worst race is unchanged to the pixel; three got slightly worse.
4. **The fairness gate passes on all ten tracks, both arms** — but at N=30, not the pinned N=300.

---

## Q1 — HOW OFTEN DOES IT PULL (N=30 races per track)

| track | races firing | in-window frames acted on | frames per firing race: med / max | verdict |
|---|---|---|---|---|
| city-circuit | 11 of 30 | 2661 of 52261 (**5.09%**) | 217 / 478 | fallback |
| dirt-oval | 9 of 30 | 3660 of 58439 (**6.26%**) | 430 / 741 | fallback |
| garden-path | 7 of 30 | 1532 of 47117 (**3.25%**) | 203 / 396 | fallback |
| ice-track | 7 of 30 | 2014 of 49066 (**4.10%**) | 270 / 535 | fallback |
| luger-hill | 11 of 30 | 2388 of 38583 (**6.19%**) | 221 / 570 | fallback |
| mountainstreet | 3 of 30 | 269 of 38864 (**0.69%**) | 80 / 129 | fallback |
| river-run | 3 of 30 | 1117 of 39139 (**2.85%**) | 351 / 419 | fallback |
| searound | 9 of 30 | 2048 of 41669 (**4.91%**) | 141 / 554 | fallback |
| seatrack | 9 of 30 | 2020 of 38864 (**5.20%**) | 220 / 464 | fallback |
| space-sprint | 10 of 30 | 2483 of 38741 (**6.41%**) | 173 / 592 | fallback |

**No track exceeds a third of in-window frames.** The highest is space-sprint at 6.41%, an order of
magnitude below the threshold. A firing race sees a median 80–430 frames of pull, i.e. **1.3 s to
6.9 s** at the 16 ms step.

---

## Q2 — GENTLE OR ABRUPT

An **episode** is a maximal run of consecutive frames on which the brake pulled the same racer.
80 episodes across the ten tracks.

| track | episodes | largest single-frame move: med / max | ramp to deepest: med | half-recovery: med | deepest multiplier: med / min |
|---|---|---|---|---|---|
| city-circuit | 11 | 0.0024 / 0.0113 | 166 fr / 2.66 s | 200 fr / 3.20 s | 0.9497 / **0.8500** |
| dirt-oval | 9 | 0.0020 / 0.0087 | 263 fr / 4.21 s | 526 fr / 8.42 s | 0.9472 / **0.8500** |
| garden-path | 7 | 0.0001 / 0.0084 | 169 fr / 2.70 s | 521 fr / 8.34 s | 0.9535 / 0.9478 |
| ice-track | 7 | 0.0024 / 0.0129 | 259 fr / 4.14 s | 515 fr / 8.24 s | 0.9504 / **0.8500** |
| luger-hill | 12 | 0.0002 / 0.0071 | 38 fr / 0.61 s | 0 fr | 0.9501 / 0.9255 |
| mountainstreet | 3 | 0.0001 / 0.0002 | 76 fr / 1.22 s | 0 fr | 0.9581 / 0.9498 |
| river-run | 3 | 0.0032 / 0.0087 | 242 fr / 3.87 s | 466 fr / 7.46 s | 0.9497 / 0.9246 |
| searound | 9 | 0.0005 / 0.0137 | 135 fr / 2.16 s | 326 fr / 5.22 s | 0.9498 / **0.8500** |
| seatrack | 9 | 0.0011 / 0.0122 | 68 fr / 1.09 s | 297 fr / 4.75 s | 0.9501 / 0.9249 |
| space-sprint | 10 | 0.0017 / 0.0061 | 149 fr / 2.38 s | 238 fr / 3.81 s | 0.9508 / 0.8997 |

**Strongest correction:** the median episode bottoms out at **0.950** — a 5% slowdown. Four tracks
reach the floor **0.8500**, which is `minMult`, the servo's own existing clamp
([racePlanner.js:99-104](../../client/src/modules/racePlanner.js#L99-L104)) — the brake cannot
command anything the steering could not already produce.

**Timing:** a correction takes a median **0.6 s to 4.2 s** to reach its deepest point and a median
**0 s to 8.4 s** to recover half its depth. Nothing arrives or leaves instantly.

### Does it ever step rather than ramp?

**No — and the proof is the OFF arm, not a threshold I chose.** The realized multiplier moves for two
reasons, the servo's steering and the brake, so the honest test is whether the brake makes the
movement *larger* than it already was. The same measurement, on the same window, on both arms:

| track | biggest single-frame move OFF: med / max | ON: med / max | ON worse? |
|---|---|---|---|
| city-circuit | 0.0100 / 0.0139 | 0.0100 / 0.0139 | no |
| dirt-oval | 0.0096 / 0.0197 | 0.0096 / 0.0197 | no |
| garden-path | 0.0114 / 0.0197 | 0.0114 / 0.0197 | no |
| ice-track | 0.0112 / 0.0166 | 0.0113 / 0.0166 | no |
| luger-hill | 0.0108 / 0.0197 | 0.0108 / 0.0197 | no |
| mountainstreet | 0.0112 / 0.0176 | 0.0112 / 0.0176 | no |
| river-run | 0.0096 / 0.0183 | 0.0096 / 0.0183 | no |
| searound | 0.0100 / 0.0204 | 0.0100 / 0.0204 | no |
| seatrack | 0.0092 / 0.0180 | 0.0092 / 0.0180 | no |
| space-sprint | 0.0085 / 0.0211 | 0.0081 / 0.0211 | no |

**Pooled over 300 races per arm: OFF max 0.0211, ON max 0.0211. 0 of 10 tracks are worse with the
brake on.** The brake's own largest move anywhere (0.0137) is *smaller* than the median move the
servo already makes every race (≈0.010), and the ease's ceiling for the deepest correction it can
command is 0.15 × 4.8% = **0.0072 per frame** — `easeInOutCubic`
([mathUtils.js:12](../../client/src/utils/mathUtils.js#L12)) has max slope 3, the transition is
1.0 s ([defaults.js:983](../../client/src/modules/storage/defaults.js#L983)) and the step is
`FIXED_DT` 16 ms ([raceCore.js:51](../../client/src/modules/raceCore.js#L51)).

**In plain words:** a viewer would see a race that stays together, not a braking event. The
correction is slower and smaller than steering movements already present in every race at these
settings.

★ **What this instrument cannot answer:** it measures the multiplier, not the picture. Whether the
*camera* makes a 5% slowdown legible — by being zoomed in on the leader at that moment — is an
eye-test question, and I have not answered it here.

---

## Q3 — THE MAXIMUM GAP PER TRACK, AND WHEN

| track | px per canvas width **at the peak**: med (range) | worst race px OFF → ON | worst race widths OFF → ON | per-race max px med OFF→ON | p90 OFF→ON | progress at peak med OFF→ON |
|---|---|---|---|---|---|---|
| city-circuit | 165.0 (120–503) | 244.4 → 244.4 | 1.481 → 1.481 | 145.4 → 145.4 | 222.1 → 222.1 | 0.734 → 0.734 |
| dirt-oval | 165.0 (120–848) | 277.0 → 277.0 | 1.679 → 1.679 | 125.0 → 125.0 | 209.9 → **225.7** | 0.733 → 0.733 |
| garden-path | 225.0 (120–851) | 182.3 → 182.3 | 1.330 → 1.330 | 107.7 → 107.7 | 159.7 → 159.7 | 0.785 → 0.785 |
| ice-track | 260.9 (120–422) | 303.3 → 303.3 | 1.588 → 1.588 | 121.9 → 121.9 | 236.2 → 236.2 | 0.726 → 0.726 |
| luger-hill | 222.9 (126–415) | 244.4 → **246.2** | 1.481 → 1.492 | 125.3 → 125.3 | 164.5 → 164.5 | 0.793 → 0.793 |
| mountainstreet | 225.0 (120–489) | 160.2 → 160.2 | 1.334 → 1.334 | 73.9 → 73.9 | 133.0 → 133.0 | 0.782 → 0.782 |
| river-run | 165.0 (120–450) | 157.5 → 157.5 | 1.118 → 1.118 | 67.9 → 67.9 | 150.3 → 150.3 | 0.806 → 0.806 |
| searound | 225.0 (120–543) | 269.3 → 269.3 | 1.311 → 1.311 | 138.3 → 138.3 | 232.7 → 232.7 | 0.755 → 0.755 |
| seatrack | 218.1 (120–1278) | 207.1 → **210.3** | 1.256 → 1.275 | 92.8 → 92.8 | 184.7 → **186.2** | 0.793 → 0.793 |
| space-sprint | 179.2 (120–662) | 196.5 → **227.3** | 1.358 → 1.358 | 112.9 → 112.9 | 170.3 → **172.2** | 0.782 → 0.782 |

★ **World px is the primary column, and the canvas-width column is not a second opinion — it is a
different question.** The px per canvas width AT THE MOMENT OF THE PEAK ranges from **120 to 1278**
across these races (seatrack's worst case is a 10× spread on one track alone). The medians differ per
track: 165 on city-circuit, dirt-oval and river-run; 225 on garden-path, mountainstreet and searound;
261 on ice-track. A gap that reads as 1.3 canvas widths on one track is not the same distance as 1.3
on another, because the camera was at a different zoom.

### Where the peaks sit, relative to the window [0.600, 0.95]

| track | before the start | inside | after the end | reachable |
|---|---|---|---|---|
| city-circuit | 10 | 17 | 3 | 56.7% |
| dirt-oval | 10 | 18 | 2 | 60.0% |
| garden-path | 6 | 17 | 7 | 56.7% |
| ice-track | **13** | 14 | 3 | **46.7%** |
| luger-hill | 8 | 19 | 3 | 63.3% |
| mountainstreet | 5 | 21 | 4 | 70.0% |
| river-run | 4 | 20 | 6 | 66.7% |
| searound | 10 | 15 | 5 | 50.0% |
| seatrack | 6 | 21 | 3 | 70.0% |
| space-sprint | 7 | 17 | 6 | 56.7% |

**Between 30% and 53% of races reach their biggest lead where this brake cannot act.**

### Tracks ranked by worst remaining gap (ON arm)

| rank | track | worst px ON | (OFF) | worst race | peaks at | can the brake reach it? |
|---|---|---|---|---|---|---|
| 1 | ice-track | **303.3** | 303.3 | seed 15 | p=0.165 | **no — before the window** |
| 2 | dirt-oval | **277.0** | 277.0 | seed 15 | p=0.160 | **no — before the window** |
| 3 | searound | **269.3** | 269.3 | seed 15 | p=0.158 | **no — before the window** |
| 4 | luger-hill | 246.2 | 244.4 | seed 24 | p=0.847 | yes — and it fired, 570 frames |
| 5 | city-circuit | **244.4** | 244.4 | seed 15 | p=0.150 | **no — before the window** |
| 6 | space-sprint | 227.3 | 196.5 | seed 2 | p=0.858 | yes — and it fired, 592 frames |
| 7 | seatrack | 210.3 | 207.1 | seed 2 | p=0.809 | yes — and it fired, 440 frames |
| 8 | garden-path | 182.3 | 182.3 | seed 20 | p=0.729 | inside, but under the allowance |
| 9 | mountainstreet | 160.2 | 160.2 | seed 17 | p=1.000 | **no — after the window** |
| 10 | river-run | 157.5 | 157.5 | seed 18 | p=0.781 | inside, but under the allowance |

★ **The four worst tracks all lose their worst race to the same cause, and it is the same seed.**
`seed 15` peaks at **p=0.150–0.165** on ice-track, dirt-oval, searound and city-circuit — at or just
past the chaos boundary (`pulkStart` 0.15), four tenths of a race before this brake's window opens.
It is unreachable by construction. **mountainstreet**'s worst peaks at p=1.000, in the run-out past
the window end — also unreachable, and deliberately so.

---

## Q4 — ARE THE RACES STILL FAIR

**Instrument:** `scripts/sim/observers/fairness-stats.mjs` — `computeZoneSuccessRate` (`:78`) for
band-reach and `computeExtendedFairnessStats` (`:278`) for the Holm-corrected per-start-row tests,
both called **unmodified**. The gate they form is stated at
[docs/FAIRNESS.md:21-22](../../docs/FAIRNESS.md) and `:77-78`: **band-reach ≥ 70% AND zero
Holm-flagged start rows, per track.**

| track | band-reach OFF | band-reach ON | Holm-flagged OFF | Holm-flagged ON | gate ON |
|---|---|---|---|---|---|
| city-circuit | 90.3% | 90.7% | 0 of 6 | 0 of 6 | PASS |
| dirt-oval | 90.0% | 89.5% | 0 of 6 | 0 of 6 | PASS |
| garden-path | 89.2% | 89.2% | 0 of 6 | 0 of 6 | PASS |
| ice-track | 90.2% | 89.8% | 0 of 6 | 0 of 6 | PASS |
| luger-hill | 93.5% | 93.5% | 0 of 6 | 0 of 6 | PASS |
| mountainstreet | 90.5% | 90.5% | 0 of 6 | 0 of 6 | PASS |
| river-run | 88.8% | 88.8% | 0 of 6 | 0 of 6 | PASS |
| searound | 90.8% | 90.6% | 0 of 6 | 0 of 6 | PASS |
| seatrack | 88.3% | 88.3% | 0 of 6 | 0 of 6 | PASS |
| space-sprint | 93.5% | 93.3% | 0 of 6 | 0 of 6 | PASS |

**Every track passes on both arms.** The largest band-reach movement is **−0.5 pp** (dirt-oval).

★ **THIS IS NOT THE DEFINITIVE GATE, AND MUST NOT BE READ AS ONE.** The pinned methodology is
**N=300 races per track** ([docs/FAIRNESS.md:125](../../docs/FAIRNESS.md)); this sweep is N=30. The
Holm tests are correspondingly underpowered — "0 flagged" at N=30 is much weaker evidence than "0
flagged" at N=300. What this run supports is that the brake does not *visibly* move the fairness
picture at these settings; it does not clear the gate at its own N.

### Outcome changes, and start-row systematics

| track | winner changed | byte-identical to OFF | peak grew under ON |
|---|---|---|---|
| city-circuit | 1 | 24 | 1 |
| dirt-oval | 2 | 23 | 2 |
| garden-path | 0 | 28 | 0 |
| ice-track | 1 | 26 | 2 |
| luger-hill | 1 | 29 | 1 |
| mountainstreet | 0 | 30 | 0 |
| river-run | 0 | 30 | 0 |
| searound | 1 | 26 | 0 |
| seatrack | 0 | 27 | 2 |
| space-sprint | 0 | 27 | 2 |

**Over 300 race pairs: winner changed in 6 (2.0%), byte-identical in 270 (90.0%).**

**Start rows** (`computeFairnessStats`, pooled over all ten tracks, N=300 races per arm):

| arm | win-count χ² | df | p | average finishing rank by row (0→3) |
|---|---|---|---|---|
| OFF | 50.71 | 3 | 0.000 | 20.7 · 20.5 · 20.4 · 20.4 |
| ON | 49.56 | 3 | 0.000 | 20.7 · 20.5 · 20.4 · 20.4 |

The pooled win-count χ² is significant **on both arms**, and the per-row average finishing ranks are
identical to a tenth of a rank. Per the decision rule this is **not attributable to the brake** — the
OFF arm fails the same test on the same races. It is the pre-existing start-row gradient the project
already records at [docs/FAIRNESS.md:138](../../docs/FAIRNESS.md) ("It is PRE-EXISTING"). **No racer
type or start row gains or loses from the brake.**

---

## THE HAND-OVER — it did not happen at these settings

At the previous setting one case was recorded where braking the leader let the gap end up larger
(seed 72, 312 → 343 px). Counted across all ten tracks at 124 px / 0.95:

**10 of 300 races (3.3%) had the brake fire and still finish with a larger peak lead. In all ten, the
biggest lead was held by the SAME racer as in the OFF arm — none was handed to anyone.**

| track | seed | peak OFF → ON | peak holder | where the peak sits | brake |
|---|---|---|---|---|---|
| space-sprint | 2 | 170.3 → **227.3** px (+57.0) | 20 → 20 | p=0.858, inside | fired 592 frames |
| dirt-oval | 2 | 181.4 → **225.7** px (+44.2) | 20 → 20 | p=0.905, inside | fired 741 frames |
| ice-track | 3 | 196.6 → 211.9 px (+15.3) | 16 → 16 | p=0.927, inside | fired 535 frames |
| space-sprint | 14 | 196.5 → 199.8 px (+3.3) | 32 → 32 | p=0.762, inside | fired 559 frames |
| seatrack | 2 | 207.1 → 210.3 px (+3.3) | 17 → 17 | p=0.809, inside | fired 440 frames |
| luger-hill | 24 | 244.4 → 246.2 px (+1.8) | 3 → 3 | p=0.847, inside | fired 570 frames |
| seatrack | 13 | 184.7 → 186.2 px (+1.5) | 34 → 34 | p=0.857, inside | fired 433 frames |
| dirt-oval | 13 | 178.7 → 179.7 px (+1.0) | 37 → 37 | p=0.864, inside | fired 430 frames |
| ice-track | 26 | 177.5 → 178.4 px (+0.9) | 36 → 36 | p=0.729, inside | fired 270 frames |
| city-circuit | 19 | 173.8 → 174.5 px (+0.7) | 17 → 17 | p=0.925, inside | fired 326 frames |

★ **All ten peaks are INSIDE the window, held by the racer the brake was pulling, while it pulled for
hundreds of frames.** So this is not the hand-over effect — it is the brake being **outrun**. On the
two that matter (space-sprint seed 2, +57 px; dirt-oval seed 2, +44 px) the brake pulled for 592 and
741 frames — 9.5 s and 11.9 s — and the gap grew anyway, because its deepest authority is −15% and
the racer's own draw plus steering exceeded that. The previous block's hand-over case does not
reproduce at these settings; a different limit does.

---

## IF THE SWEEP POINTS AT A LEVER

**The window START, not the allowance:** four of the five worst remaining gaps peak at p=0.150–0.165,
before `corrStartFrac` 0.600 opens the window, so no value of `gapBrakeAllowedGapPx` or
`gapBrakeWindowEnd` can reach them. The value is the owner's to choose; no change was made.

---

## WHAT I NOTICED AND DELIBERATELY LEFT ALONE

- **Two flaws in my own first analysis, found and corrected before reporting.** The step test divided
  the observed move by the episode amplitude, which is near zero whenever the servo already held the
  racer low — it produced 62 "violations of the ease ceiling" with ratios of `Infinity` that meant
  nothing. It was replaced with the OFF-arm control, which answers the question directly. And the
  px-per-canvas-width column first reported the race-wide median shot (a flat 225 everywhere), hiding
  the zoom-in at the moment of the peak; it now reports the shot at the peak, where the spread is
  120–1278.
- **The OFF arm would have used its own 0.92 window** for the abruptness control, because the
  committed default is still 0.92 while the owner's setting is 0.95. Comparing a 0.92 window against
  a 0.95 one would have made the control answer a different question from the thing it controls; the
  sweep pins both arms to the owner's 0.95.
- **`scripts/sim-fairness.mjs` cannot exercise this brake.** It reaches the mechanism through
  `createRacePlan`, but never passes `pathLengthPx`, so `_computeGapLeaderBrake` returns before it
  reads anything. That is why the fairness numbers above come from the real engine through
  `scripts/lib/raceDriver.mjs` with the project's fairness *functions* applied to the results, rather
  than from a `sim-fairness` run. Wiring the sim is a source change and was not made.
- The stale comments recorded in BRAKE-CENSUS-1 (`racePlanner.js:1235` "SIM-ONLY",
  `raceCore.js:578` "default OFF", the four stale windows in `docs/FORCE-MAP.md`) are still there.
  Untouched.
