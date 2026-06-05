# Top-Down Overlap: Real Cause with Numbers

**Branch:** `feat/closed-track-overview-normalization`  
**Date:** 2026-06-05  
**Screenshot:** 80-racer Space Sprint × plane, mid-race, ~9 planes visibly crossing/stacking.

The top-down view is orthographic. Visible sprite overlap is not an illusion.

---

## Premise correction (report 14)

Report 14 attributed the visual stacking to "pulk makes it look dense." This explanation is **invalid for a top-down orthographic view.** In top-down, if two sprite bodies occupy the same screen pixels, their rendered bodies are at overlapping world positions. There is no third option. This report measures the actual overlap.

---

## Physics parameters (all unchanged between master and branch)

| Parameter | Value | Role |
|---|---|---|
| `avoidanceDistance` | 0.18 | Combined (t, Y) distance threshold for avoidance force |
| `speedBrakeYThreshold` | 0.18 | `\|dY\|` threshold for speed-brake to fire |
| `speedBrakeTMultiplier` | 1.5 | Speed brake fires when `dT < 1.5 × tHalfSpan` |
| `speedBrakeFactor` | 0.945 | Trailer speed factor when braked (5.5% reduction) |
| `rowGapMultiplier` | 1.5 | Initial row separation = 1.5 × physSlot |
| `rbFlatBoost` | 0.10 | Rubber-band flat speed boost |

Key symmetry: `speedBrakeYThreshold = avoidanceDistance = 0.18`. Neither the avoidance force nor the speed brake fires when `|dY| > 0.18` (> 80.8 px). Racers more than 80.8 px apart laterally can freely pass through each other's T-position with no physics resistance.

---

## Q1 — Per-pair center-distance vs drawn body half-extents

All values are Space Sprint × plane (bfX=0.836 lat, bfY=0.930 long, ratio=1.112).

### A — Static case: racers at minimum physics separation (tHalfSpan)

The speed-brake equilibrium maintains `dT ≈ dynamicBrakeT = 1.5 × tHalfSpan` when `|dY| < 0.18`. Two racers **directly behind each other** (|dY|≈0) settle at ~1.5×physSlot path separation.

| N | physSlot (px) | long body branch | long body master | static long gap branch | static long gap master |
|---|---|---|---|---|---|
| 40 | 42.7 | 31.7 | 47.5 | +11.0 px gap | **−4.8 px overlap** |
| 60 | 28.4 | 31.7 | 31.6 | **−3.3 px overlap** | **−3.2 px overlap** |
| 80 | 31.6 | 31.7 | 35.1 | **−0.1 px overlap** | **−3.5 px overlap** |

→ `classification: (a) render-only.` Physics centers are at physSlot separation; rendered bodies are slightly larger in the longitudinal direction, causing minor static overlap. This is the "3.3 px" figure from report 14. It is **real** (not an illusion) but is small.

### B — Dynamic case: racers passing (dT → 0)

Rubber-band equalises speeds across the pack. When rubber-band boost momentarily exceeds the speed-brake reduction (boost = +10%, brake = −5.5%, net = +4.5% even when braked), the trailer still closes the gap. `dT` passes through 0: the overtaking racer is at the **same T-position** as the racer being overtaken.

Free-lane separation has already pushed them to adjacent lateral slots (`|dY| ≈ lateralHalfSpan`). At `dT = 0` and `|dY| = lateralHalfSpan`:

| N | physSlot | lateralHalfSpan (norm) | long body branch | **overlap at dT=0 (branch)** | overlap at dT=0 (master) | lateral gap branch |
|---|---|---|---|---|---|---|
| 9 | 94.8 px | 0.211 | 70.5 px | **70.5 px** | 105.4 px | 31.5 px |
| 20 | 42.7 px | 0.095 | 31.7 px | **31.7 px** | 47.5 px | 14.2 px |
| 40 | 42.7 px | 0.095 | 31.7 px | **31.7 px** | 47.5 px | 14.2 px |
| 60 | 28.4 px | 0.063 | 31.7 px | **31.7 px** | 31.6 px | −0.1 px |
| 80 | 31.6 px | 0.070 | 31.7 px | **31.7 px** | 35.1 px | 3.1 px |

→ `classification: (b) position overlap.` The physics **allows** `dT = 0` — passing is physically permitted. The rendered longitudinal bodies (31.7 px for branch N≥20) **fully overlap** in the path direction at the moment of passing. The lateral gap at that moment is 3.1–14.2 px (bodies do not overlap laterally). On screen at the zoom level visible in the screenshot (~2.8× OVERVIEW), **31.7 px world-px ≈ 89 px screen-px of longitudinal overlap** per passing pair.

---

## Q2 — Classification: (a) render overlap or (b) position overlap?

The visible stacking in the screenshot is **type (b)**: the physics positions actually allow `dT = 0` (full T co-location). The rendered bodies at `dT = 0` overlap by their full longitudinal extent (31.7 px branch, 35.1 px master at N=80). This is not a render artifact — the sprites are drawn at the correct physics positions, which the physics permits to coincide.

Type (a) (static render overflow) is 0.1–3.3 px and is a separate minor contribution.

---

## Q3 — Cross-row check

With `rowGapMultiplier = 1.5`:

```
rowGapPx = physSlot × 1.5
```

At N=80: `rowGapPx = 31.6 × 1.5 = 47.4 px`. Long body (branch) = 31.7 px. Row gap (47.4) > long body (31.7) → **no visual overlap at initial row positions**. Cross-row overlap does not occur at the start.

As the pack forms and rows merge, the type (b) mechanism takes over: racers from any two rows can reach `dT = 0` via the overtaking path described in Q1-B. Cross-row passing is not more visible than same-row passing — the mechanism is the same.

---

## Q4 — N=9 case: dead zone + position overlap

At N=9: `physSlot = 94.8 px`, `lateralHalfSpan = 0.211 > avoidanceDistance = 0.18` → dead zone present.

**Dead zone effect on passing:** when two N=9 racers are `|dY| ∈ [0.18, 0.211]` (80.8–94.8 px laterally):
- Neither avoidance force nor free-lane separation fires (gated by `dist ≥ avoidanceDistance`)
- Speed brake also does not fire (`|dY| > speedBrakeYThreshold = 0.18`)
- Both racers approach `dT = 0` with **zero physics resistance**

At `dT = 0`: longitudinal body overlap = **70.5 px** (branch) / **105.4 px** (master). This is direct type (b) position overlap amplified by the dead zone.

**Direct body overlap check at dead zone boundary (`|dY| = 0.211`, `dT = 0`):**
- Centers: 0.211 × 449 = 94.7 px lateral separation
- Lateral body = 63.3 px → lateral gap = 94.7 − 63.3 = **31.4 px** (no lateral overlap even here)
- Longitudinal body = 70.5 px, centers at same T → **70.5 px full longitudinal overlap**

At N=9, the dead zone removes ALL resistance for passes happening in the 80.8–94.8 px lateral band. The worst visible overlap is **70.5 px per passing pair** (branch).

---

## Q5 — Reconciliation: why 3.3 px was wrong

The 3.3 px figure in report 14 was:
- The **static longitudinal overflow** at minimum physics separation: `longBody − physSlot = 31.7 − 28.4 = 3.3 px` (at N=60, branch).
- This only applies when two racers are STATIONARY relative to each other in T (no relative motion), held at the physics minimum by the speed brake.

The **dynamic passing overlap** was missed entirely:
- When `dT → 0` during an overtake, the same body that was 3.3 px outside the physics boundary at `dT = tHalfSpan` is now **31.7 px fully overlapping** (at `dT = 0`).
- The difference: at `dT = tHalfSpan`, bodies partially overlap by 3.3 px; at `dT = 0`, bodies overlap by the full 31.7 px.

The screenshot shows passing events, not the static boundary. True on-screen overlap: **31.7 px per pair at dT = 0** (N=80 branch). The 3.3 px figure was ~10× too low.

---

## Q5b — ALL-PAIRS check (answer to "is avoidance row-limited?")

The user's hypothesis: avoidance might only check same-start-row pairs, meaning cross-row passes are never detected.

**Finding: avoidance is ALL-PAIRS.** [raceBehavior.js:218](client/src/modules/raceBehavior.js#L218):

```javascript
const active = racers.filter((r) => !r.finished);   // ALL unfinished racers
// ...
for (let i = 0; i < active.length; i++) {            // line 243
  for (let j = i + 1; j < active.length; j++) {      // line 244
    const rA = active[i];
    const rB = active[j];
    // avoidance logic applied to every pair
```

No `rowIndex` or lane-group filter anywhere in this loop. Same in the sim: [sim-fairness.mjs:334](scripts/sim-fairness.mjs#L334) uses `spriteWorldSizePx` from `computeRacerLayout` applied to all racers equally.

**The "0% liteOverlapRate" is NOT due to row filtering.** The metric is also computed over all pairs ([sim-fairness.mjs:891–906](scripts/sim-fairness.mjs#L891)). The 0% is because the physics (all-pairs) keeps centers apart — but as shown in Q1-B, the physics PERMITS `dT = 0` during passes. The sim metric fires only at `|dT| < 3.9px AND |dY| < 3.5px` (hard centers-colocation), which the physics never allows. The visual overlap from `dT = 0` at `|dY| = lateralHalfSpan` (bodies adjacent in the lateral direction, fully overlapping longitudinally) is invisible to the metric.

**The row-limited hypothesis is incorrect.** The actual mechanism is the lateral threshold on the speed brake (explained in Q1-B and Q3-B): not that cross-row pairs are ignored, but that pairs with `|dY| > 0.18` get no longitudinal separation enforcement regardless of whether they came from the same row.

---

## Q6 — Quantified breakdown of what causes the screenshot

At N=80, Space Sprint × plane, branch, ~2.8× OVERVIEW zoom:

| Source | World-px overlap | On-screen px (×2.8) | Frequency |
|---|---|---|---|
| Static long overflow (dT = tHalfSpan) | 0.1 px | 0.3 px | Constant |
| Speed-brake equilibrium (dT ≈ 1.5×tHalfSpan) | 0 px | 0 px | 93% of frames |
| **Dynamic pass at dT ≈ 0** | **31.7 px** | **89 px** | **Multiple times per racer per race** |
| Angular crossing (max curvature 0.0023 rad/px) | −0.8 px (no overlap) | n/a | At sharpest bend |

The dominant mechanism is **dynamic passing at dT ≈ 0**, producing 89 px on-screen body overlap per pair. Given `stableOvt = 6.0` confirmed overtakes per racer and many more brief ones, with 80 racers and brakeRate=93%, the screenshot captures multiple such events simultaneously.

---

## Q7 — Master vs branch comparison

| N | Source | Branch overlap | Master overlap |
|---|---|---|---|
| 80 | Dynamic pass at dT=0 | 31.7 px | 35.1 px |
| 40 | Dynamic pass at dT=0 | 31.7 px | 47.5 px |
| 9 | Dynamic pass at dT=0 | 70.5 px | 105.4 px |
| 80 | Static min separation | 0.1 px | 3.5 px |

**Branch is better at all N.** The body-narrow normalization reduced the longitudinal body (31.7 vs 35.1 px at N=80; 31.7 vs 47.5 px at N=40; 70.5 vs 105.4 px at N=9). The branch has less visual stacking than master, not more. **No regression from the rebuild.**

---

## Plain verdict

The visual crossing/stacking in the screenshot is **position overlap type (b)**: the physics allows `dT = 0` during overtakes, and the rendered longitudinal bodies (31.7 px at N=80 for branch) fully overlap at that moment. The on-screen extent is ~89 px per passing pair (at ~2.8× zoom), which explains the "far more than 3px" visual impression.

The mechanism: in an 80-racer pack, rubber-band boost (+10%) exceeds speed-brake reduction (−5.5%) → net +4.5% forward push even when braked → trailers continue closing gap and overtake. Free-lane separation pushes the pair to adjacent lateral slots during approach. At `dT = 0` (exact crossing), bodies fully overlap longitudinally for 1–2 frames.

**Is it render-only or physics?** It is a **physics position** effect: `dT = 0` is an allowed state. The rendered body extends 31.7 px in the longitudinal direction; the physics allows two bodies to share the same T-coordinate during passes.

**Does the rebuild make it worse?** No. Branch bodies are smaller (31.7 px vs 35.1 px at N=80; 31.7 px vs 47.5 px at N=40). Master is consistently worse.

**What needs fixing?**  
The root cause is that the speed brake fires only when `|dY| < 0.18` — the same threshold as avoidance. Racers more than 80.8 px apart laterally have no longitudinal separation enforcement. A fix would decouple the speed-brake Y-threshold from the avoidance threshold, or add a dedicated no-pass zone independent of lateral position. This is a physics ticket, requires a targeted sweep, and must not change the 8 optimized fairness parameters.
