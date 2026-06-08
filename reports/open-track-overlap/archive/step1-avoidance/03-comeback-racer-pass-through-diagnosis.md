# Diagnosis: Why Does a Comeback Racer Pass Through Others Unbraked?

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-05
**Sim:** `scripts/sim-fairness.mjs` + custom diagnostic `scripts/diag-comeback-overlap.mjs`
**Setup:** Space Sprint × dragon, 60 racers, 60 s, seed=1, race-plan=true
**Purpose:** Ground-truth investigation of the visual "comeback racer drives through the pack
unbraked" observation. Code-reading + live diagnostic run.
**Note:** Read-only investigation. No default changes.

---

## 1. Speed-Brake Engagement Logic — Every Gate

The speed brake is applied in `raceBehavior.js` inside `applyRacerBehavior`.

```
For every pair (rA, rB) within avoidanceDistance:
  Gate 0:  anisotropic distance: sqrt((|dT| × 2.0)² + (|dY| × 1.0)²) < 0.18
           ↳ if outside this, pair is skipped entirely
  Gate 1:  |dY| < speedBrakeYThreshold (0.18)    ← lateral proximity gate
  Gate 2:  dT < dynamicBrakeT (= spriteSize/pathLen × 1.5 = 0.002883)
           ↳ longitudinal proximity gate
  Target:  only the TRAILER (lower t) is braked; the leader is never touched
  Effect:  speed × speedBrakeFactor (0.945) = 5.5% reduction per frame
```

On open tracks, the brake eases in over `avoidanceWarmupMs = 3000 ms` via easeInOutCubic.
At t=0 the brake factor is 1.0 (no brake); full 5.5% reduction applies only after 3 s.

**Critical lateral dependence:** The brake stops firing when `|dY| ≥ 0.18`. This is important
because dragon's honest-overlap zone extends to `|dY| < 0.212` — a 15% wider lateral window
than the brake gate. Details in section 2.

**Rubber-band interaction:** The brake is not suppressed by rubber-band. Both are independent
multipliers: `net = speedBrakeFactor × rubberBandMult = 0.945 × 1.10 = 1.0395`. However,
rubber-band is rarely active during overlap — see section 3.

---

## 2. Force Decomposition During Honest-Overlap Events (Live Diagnostic)

**Diagnostic run:** `node scripts/diag-comeback-overlap.mjs`
Space Sprint × dragon, 60 racers, 60 s, seed=1, `lateralForce=0.0228` (current probe default).

### Threshold geometry for dragon on Space Sprint

| Dimension | Honest-overlap fires at | Speed-brake fires at | Gap zone |
|-----------|:-----------------------:|:--------------------:|:--------:|
| Lateral `\|dY\|` | < **0.212** physicalY | < **0.180** physicalY | 0.180–0.212 |
| Longitudinal `dT` | < **0.001726** t-units | < **0.002883** t-units | (brake wider) |

The **lateral gap zone** (0.180–0.212) is a band where honest overlap fires but the speed
brake does NOT. This covers the outer **15% of dragon's full lateral body extent**. In
this zone, a wider pass fires overlap frames without any braking.

### Per-overlap-frame breakdown (169,055 honest overlap pair-frames after 4 s warmup)

| Metric | Value |
|--------|:-----:|
| Global brakeRate (all racer-frames after 4 s) | **74.1%** |
| Trailer braked during overlap (`avoidanceActive=true`) | **95.7%** (161,864/169,055) |
| Trailer has rubber-band boost during overlap | **5.2%** (8,847/169,055) |
| Trailer has BOTH brake AND boost | **5.0%** (8,479/169,055) |
| Boost net > 1.0 (boost overpowers brake) | **1.2%** (1,952/169,055) |
| Avg brake factor during overlap | **0.9473** (5.27% reduction) |
| Avg rubber-band mult during overlap | **1.0014** (minimal) |
| **Avg net speed factor during overlap** | **0.9486** |

**The net speed during overlap is 0.9486 — the trailer IS slowing down, not accelerating through.
Rubber-band is not the cause.**

### The actual mechanism: brake is longitudinal, overlap is lateral

The speed brake reduces the trailer's t-advance by 5.5%. It has zero effect on `physicalY`
(lane position). Dragon's honest overlap fires when two bodies are simultaneously within:
- `dT < 0.001726` (longitudinal — 1 body length)
- `|dY| < 0.212` (lateral — dragon's wide body, `bfX = 0.836`)

Even when braked, the trailer is still at nearly the same physicalY as the racer ahead. The
brake slows the approach but cannot displace the racer sideways. Once the trailer enters the
lateral overlap zone and is alongside the leader, the overlap persists for however many frames
they remain co-located in the lateral axis — regardless of longitudinal speed.

**Paradox: stronger braking makes overlap worse, not better.** When the trailer brakes, it
traverses the longitudinal overlap zone more slowly. An overlap that would have lasted 10 frames
at full speed lasts ~11 frames at 0.945×. This is why the brake-strength probe (report 01)
found that doubling brake strength moved honest overlap by only 0.2 pp — stronger braking
increases the duration of each overlap event.

---

## 3. Comeback-Racer Finding

**Definition used:** "comeback" = trailer whose `t` is more than 4% of `finishT` below the
current mean `t` of active racers.

| Metric | Comeback racer | All racers |
|--------|:--------------:|:----------:|
| Overlap pair-frames | 8,559 (5.1% of total) | 169,055 (100%) |
| Trailer braked during overlap | **98.7%** | 95.7% |
| Trailer has rubber-band boost | **3.6%** | 5.2% |
| Boost net > 1.0 (overpowers brake) | **0.1%** | 1.2% |

**Comeback racers are NOT special cases for overlap.** They:
- Are braked MORE, not less (98.7% vs 95.7%)
- Have LESS rubber-band boost during overlap (3.6% vs 5.2%)
- Almost never have boost-overpower-brake (0.1% vs 1.2%)

The visual impression of a "comeback racer driving through unbraked" is technically accurate
in that the racer traverses the pack — but the cause is NOT absent braking and NOT the
rubber-band boost. The comeback racer overlap is just the same lateral-adjacency problem
described above, observed on a racer that is closing the gap (higher relative t-advance due
to a new fast re-roll).

**What makes a comeback visible:** A comeback racer gets a fast re-roll (higher `spreadFactor`),
so its approach speed is above-average. The brake fires (98.7% of overlap frames) and reduces
speed by 5.5%. But 5.5% is visually imperceptible at game speed. The racer closes in, the
lateral avoidance forces push sideways, but dragon's body is so wide that the lateral push
takes many frames to escape the overlap zone. The racer appears to fly through the pack without
any visible obstacle effect — because there IS no lateral obstacle effect from braking.

---

## 4. Reconciliation of the 86% brakeRate Number

The brake-strength probe (report 01) reported 86% brakeRate on Space Sprint × dragon with
baseline `lateralForce = 0.0114`. The current diagnostic shows 74.1% with `lateralForce = 0.0228`.

**Why the difference:** Higher `lateralForce` pushes racers further apart laterally. This
increases the `|dY|` component of the anisotropic avoidance distance, causing some pairs to
exit the avoidanceDistance cone (`sqrt((dT×2)² + dY²) < 0.18`). With more lateral spread, fewer
pairs qualify for processing, so fewer trailers enter `speedBrakeSet`. The brake fires less
often — but overlap also decreases (as the grid probe confirmed).

**What the 86% actually counted:** All racer-frames (after 4 s) where `avoidanceActive=true`,
regardless of whether the racer was simultaneously in honest overlap with another racer.

**Was it misleading?** Partially. It correctly shows the brake is "not sleeping" — it fires
on a massive fraction of frames. But it creates a false impression that the brake is engaged
*during* the specific moments that produce honest overlap. The more precise number:

- **Global brakeRate (all frames):** 74%–86% depending on lateralForce
- **Trailer brakeRate during honest-overlap frames specifically:** **95.7%**

The brake fires even more during overlap than on average. The brake is not "missing" the
overtaking moments — it is present. It just cannot prevent lateral adjacency.

The 86% number was accurate for its stated purpose (measuring brake engagement intensity)
but it implicitly suggested that a brake-engagement problem caused the overlap. That framing
was wrong. The overlap is not a brake-engagement failure; it is a lateral-extent problem.

---

## 5. Plain Conclusion

**Why does the comeback racer pass through others?**

1. **The brake fires.** In 98.7% of comeback-racer honest-overlap frames, the speed brake
   is active. It reduces the trailer's t-advance by 5.5%. The brake is not absent or skipping
   the overtaking moment.

2. **The brake is a longitudinal tool for a lateral problem.** Dragon's wide body (`bfX = 0.836`)
   creates a lateral overlap zone of ±0.212 physicalY. The speed brake reduces forward speed;
   it does not move the racer sideways. Two racers at the same lane position, braked or not,
   remain in honest overlap until lateral avoidance pushes them apart.

3. **15% of dragon's lateral body is outside the brake gate.** The speed brake's lateral gate
   (`|dY| < 0.18`) is narrower than dragon's honest-overlap zone (`|dY| < 0.212`). In the outer
   15% of the body, overlap fires with zero braking.

4. **Rubber-band boost is not the cause.** During comeback-racer overlap, rubber-band is active
   in only 3.6% of frames, and net-overpowers the brake in only 0.1% of frames.

5. **The visual "unbraked" perception is correct but incomplete.** The racer does traverse the
   pack. The brake is present but visually imperceptible (5.5% at 60 fps looks like nothing). The
   absence of a lateral evasion response is what the eye actually sees: the racer doesn't swerve
   to avoid, it just plows through slowly.

**Which knob governs this:**

- `lateralForce` — governs how quickly the avoidance system pushes racers sideways. This is
  the correct probe direction (already confirmed in report 02). The brake is not the knob.
- `speedBrakeYThreshold` — currently 0.18, narrower than dragon's 0.212 overlap zone. Raising
  this to ≥ 0.212 would close the unbraked outer lateral band. But this is secondary: it
  closes the 15% gap but doesn't address the root cause (the brake is still longitudinal).
- `avoidanceDistance` / approach trigger — the brake fires at 74–86% of all racer-frames
  already (field-wide, not targeted). Tightening `avoidanceDistance` would make it more
  selective but would not help with lateral overlap (same reason).

**The overlap is a lateral-extent problem, not a brake-engagement problem. The right fix is
`lateralForce`, not `speedBrakeFactor`. The previous probe direction was correct.**

---

## Appendix: Diagnostic Script

`scripts/diag-comeback-overlap.mjs` — read-only, deletable after this investigation.

Runs one 60 s race and classifies all honest-overlap pair-frames (after 4 s warmup) by:
- trailer `avoidanceActive`, `rubberBandMult`, net speed factor
- "comeback" = trailer t is more than 4% finishT below mean active t

Key outputs cross-referenced above.

```
Global brakeRate (after 4s warmup): 74.1%  (153,819/207,565 racer-frames)

Honest overlap pair-frames: 169,055
  Trailer braked:       95.7%
  Trailer boosted:       5.2%
  Both brake+boost:      5.0%
  Net > 1.0 (overpowered):  1.2%
  Avg net speed:         0.9486

Comeback-racer overlap: 8,559 (5.1% of total)
  Trailer braked:       98.7%
  Trailer boosted:       3.6%
  Net > 1.0:             0.1%
```
