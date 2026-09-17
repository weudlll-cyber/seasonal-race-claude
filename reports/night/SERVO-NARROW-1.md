# SERVO-NARROW-1 — the servo CAN be fixed narrowly: V1 buys the leader 24 points and is invisible

Branch `feat/gap-leader-brake`. **Read-only on shipped code: every variant lives in an instrumented
copy only. No shipped source changed, nothing minted, nothing merged.** Date: 2026-09-15.

---

## ★ THE ONE SENTENCE

**Yes — narrowly.** All four variants take the leader's arrival from **55.8% to 79–81%** and small
corrections from **57.8% to ~74%**, halve the wrong-side share (**10.2% → ~5%**), and — unlike the
blunt counterfactual's 21× — **leave the largest single-step multiplier move essentially where it is
(1.00×–1.04×)**. **V1 is the best of them**: it is the only variant that improves the in-window lead
at **both** the median (81.4 → 70.9 px) **and** the maximum (244.4 → 239.3 px), at **1.01×**
visibility.

**What none of them does is improve the rank error against the drawn plan.** All four are a few
thousandths worse in the point estimate — **and none of the four differences is distinguishable from
zero** (V1: +0.0058, t = **0.19**, 143 races worse against 138 better). By the other reading of the
same thing, **exact-place hits go UP** on every variant (1558 → 1600 for V1, 1640 for V4). The two
measures disagree and I am not choosing between them.

---

## THE VARIANTS, AND WHAT EACH ONE CHANGES

All three attack **the restart driver** — the noise, which SERVO-FAULT-1 measured as the cause of
86.1% of all target rewrites — and **none of them changes what the servo commands.**

| | what it does | new number? |
|---|---|---|
| **V1** | The restart decision **ignores the noise**: the setter compares the DETERMINISTIC part of the command against the deterministic part it last acted on. The noise still reaches the speed — the target itself is written every step — it just stops triggering rewrites. | **none** |
| **V2** | The noise is **slow-varying**: redrawn on the re-roll cadence the plan already carries (`_reRollTransitionDurationMs`) instead of every 16 ms. ★ The rng is still drawn every step, so the random stream is bit-identical; only *which* draw is used changes. | **none** (but see the decision below) |
| **V3** | The rewrite threshold sits **above the noise band**: `2 × plan._stochasticNoise`. Two draws from U(−a,+a) differ by at most 2a, so the noise can never cross it alone. | **none** — derived from an existing quantity |
| **V4** | V1 + V2 together. | none |

★ **A DECISION I TOOK WITHOUT ASKING (V2).** The plan carries the re-roll **transition duration**
(`_reRollTransitionDurationMs`), not the re-roll **interval** (`rollInterval`, which lives in
`raceCore.js:161-162` and is never handed to the planner). Using the field the plan already has
changes less than threading a new one through, so that is what V2 uses. **V2 therefore holds the
noise for the transition duration rather than the true roll interval** — a faithful "slow-varying"
arm for measurement, but not literally the re-roll cadence. Named here so it is not mistaken for one.

### Inertness, proved before anything was measured

| | result |
|---|---|
| all variants switched off, 10 races | **10/10 IDENTICAL** to the shipped tree |
| each variant switched on | V1, V2, V3, V4 each differ on **10/10** races |

"Identical" = finishing order **and** all 40 finish times to the millisecond.

---

## THE MEASUREMENT

Ten tracks, seeds 1–30, 40 racers, the owner's roster, `wild`, **gap brake OFF** so only the servo is
in play. **N = 300 races per arm; 19,464,218 commanded racer-steps on the shipped arm.**
"Arrived" = delivered fraction ≥ 0.9 on an ask ≥ 0.025 — **both thresholds are mine**; a
threshold-free column is given underneath.

### Arrival

| arm | overall | **LEADER** | **small (1–2 off)** | large (16+ off) | wrong side |
|---|---|---|---|---|---|
| shipped (today) | 69.3% | **55.8%** | **57.8%** | 93.3% | 10.2% |
| **V1** noise-blind restart | 76.7% | **79.7%** | 74.1% | 92.8% | **5.1%** |
| V2 slow noise | 76.9% | 79.2% | 74.2% | 93.0% | 5.0% |
| V3 threshold above band | 76.8% | **80.5%** | 73.9% | 92.9% | 4.9% |
| V4 = V1 + V2 | 76.8% | 79.3% | 74.0% | 92.9% | 5.0% |

**Threshold-free** (median delivered fraction per race, then the median over races; and the p90,
which is the overshoot):

| arm | median | **p90 (overshoot)** |
|---|---|---|
| shipped | 1.000 | **1.340** |
| V1 | 1.000 | **1.174** |
| V2 | 1.000 | 1.180 |
| V3 | 1.000 | **1.165** |
| V4 | 1.000 | 1.174 |

★ **Every variant also cuts the overshoot** — the p90 delivered fraction falls from 1.340 to ~1.17.
That is the mechanism SERVO-FAULT-1 identified (the command shrinking under a held value still
catching up) being damped, not a separate effect.

### The largest lead, WORLD PX

| arm | window→0.95 med / p90 / **max** | window→finish med / p90 / max |
|---|---|---|
| shipped (today) | 81.4 / 159.3 / **244.4** | 121.4 / 178.7 / 279.6 |
| **V1** | **70.9** / 156.0 / **239.3** | 107.1 / 174.8 / **247.2** |
| V2 | 64.8 / 142.7 / **294.9** | 100.5 / 161.7 / 376.6 |
| V3 | 62.2 / 143.4 / **249.9** | 99.6 / 162.7 / 275.0 |
| V4 | 68.1 / 163.5 / **293.4** | 108.1 / 179.3 / 293.4 |

★ **V1 is the only variant that improves BOTH ends.** V2, V3 and V4 all pull the median down harder
than V1 but make the **worst race worse** — V2 by 50 px. In canvas widths against the **SETTLED
LEADER_ZOOM value of 225 px/width** (ZOOM-PER-STATE-1, never a frame zoom), V1's worst in-window race
is **1.064 widths** against today's **1.086**.

### Rank error against the drawn plan — what the servo exists to reduce

| arm | mean &#124;finish − drawn&#124; | exact-place hits | paired difference vs shipped |
|---|---|---|---|
| shipped | 2.595 | 1558 / 12000 | — |
| **V1** | 2.601 | **1600** | **+0.0058, t = 0.19** — not distinguishable from zero |
| V2 | 2.636 | 1576 | +0.0408, t = 1.37 — not distinguishable |
| V3 | 2.622 | 1564 | +0.0268, t = 0.87 — not distinguishable |
| V4 | 2.615 | **1640** | +0.0198, t = 0.63 — not distinguishable |

★★ **Read this carefully, because the two measures disagree.** The mean absolute rank error is a few
thousandths **worse** on every variant — and paired per race (N = 300, SD ≈ 0.52, SE ≈ 0.030) **not
one of the four differences is distinguishable from zero.** V1 is worse on 143 races, better on 138,
equal on 19. Meanwhile the count of racers finishing **exactly** on their drawn place goes **up** on
all four. **Neither "it improves the rank error" nor "it worsens it" is supported. It does not
measurably move it.**

### How much the race moves

| arm | byte-identical | winner changes |
|---|---|---|
| V1 | 0/300 | 190/300 |
| V2 | 0/300 | 182/300 |
| V3 | 0/300 | 182/300 |
| V4 | 0/300 | 190/300 |

**Every variant is a full re-baseline.** None is byte-identical on any race, and roughly two thirds
change the winner. That is not a defect of the variants — it is what touching a per-step servo write
does — but it means any of them costs the four fingerprints and the pinned outcomes.

### ★ VISIBILITY — the number that killed the blunt counterfactual

| arm | median | p90 | **max** | **vs shipped max** |
|---|---|---|---|---|
| shipped | 0.011722 | 0.011762 | 0.011762 | 1.00× |
| **V1** | 0.011734 | 0.011762 | 0.011855 | **1.01×** |
| V2 | 0.011730 | 0.011762 | 0.011762 | **1.00×** |
| V3 | 0.011693 | 0.011762 | 0.011762 | **1.00×** |
| V4 | 0.011730 | 0.011762 | 0.012203 | 1.04× |
| *(the blunt counterfactual, for contrast)* | *0.200619* | *0.250000* | *0.250000* | ***21.3×*** |

★★ **This is the night's real finding.** Delivering every command was visible on 300 of 300 races at
21×. **Attacking the restart driver instead buys most of the arrival and is invisible** — V2 and V3
do not move the largest single-step change at all, and V1 moves it by 0.8%.

---

## THE RANKING

Bar: **arrives better for the leader AND the rank error no worse AND the visibility no worse than
today.**

| rank | arm | leader | rank error | visibility | in-window max / med | verdict |
|---|---|---|---|---|---|---|
| 1 | **V1** | 79.7% (**+23.9**) | +0.006 (t = 0.19) | **1.01×** | **239.3 / 70.9** | misses the literal bar by two hairs |
| 2 | V3 | **80.5%** (+24.7) | +0.027 (t = 0.87) | **1.00×** | 249.9 **worse** / 62.2 | fails the in-window max |
| 3 | V4 | 79.3% (+23.4) | +0.020 (t = 0.63) | 1.04× | 293.4 **worse** / 68.1 | fails the in-window max |
| 4 | V2 | 79.2% (+23.3) | +0.041 (t = 1.37) | 1.00× | 294.9 **worse** / 64.8 | fails the in-window max |

**Applied literally, no variant clears the bar**, and that is the honest reading:

- **V1** is better than today on the in-window maximum (239.3 vs 244.4 px) and the median
  (70.9 vs 81.4), buys the leader **+23.9 points** of arrival, and is **1.01×** on visibility. It
  misses only because (a) its rank-error point estimate is **+0.006 worse** — a difference with
  **t = 0.19**, i.e. indistinguishable from zero, whose exact-place-hit count *improves* — and (b)
  its largest single-step move is **0.8% larger** than today's.
- **V3** has the best leader arrival and **exactly today's visibility**, but makes the worst
  in-window race worse.

**So the answer to "can the servo be fixed narrowly" is: yes for arrival and for visibility, and
no for the rank error, which does not move either way.** Whether a 0.8% visibility increase and a
statistically invisible rank-error change are acceptable in exchange for +24 points of leader arrival
is **his call, not a measurement**, which is why the literal bar is reported as missed rather than
argued around.

---

## WHAT THIS DOES NOT SETTLE

- **Fairness is not measured on any variant.** The project's instrument (`scripts/sim-fairness.mjs`)
  could not be run to a usable N tonight — see SERVO-FAULT-1.
- The **arrival thresholds are mine** (delivered ≥ 0.9, ask ≥ 0.025); the threshold-free delivered
  medians and p90s are given beside them.
- Every variant is measured **with the gap brake OFF**, so none of these numbers says anything about
  how a variant would interact with the brake.
- V2's cadence is the re-roll **transition duration**, not the re-roll interval — named above.
- N = 300 races per arm.
