# Force Decomposition Diagnosis

**Datum:** 2026-05-12
**Branch:** claude/avoidance-logic-fix
**Track:** Dirt Oval (98 px wide)
**Setup:** 8 racers · seed 0x5e4501 · 900 frames (14.4 s @ 62.5 fps)
**Core question:** Why does a pack racer stay near physicalY=0 when avoidance should push outward and lateral space is available?

---

## 1. Pulk Racer Selection

Criterion: racer with the lowest fraction of frames where `|physicalY| > 0.3` (= most time in the centerline zone).

| Racer idx | Frames in center zone (≤0.3) | Adj frames | Selected |
|---|---|---|---|
| 2 | 99.8% frames ≤ 0.3 | 100.0% adj | ← **selected** |
| 1 | 99.7% frames ≤ 0.3 | 100.0% adj |  |
| 6 | 99.7% frames ≤ 0.3 | 100.0% adj |  |
| 3 | 96.1% frames ≤ 0.3 | 100.0% adj |  |
| 0 | 95.3% frames ≤ 0.3 | 100.0% adj |  |
| 4 | 90.2% frames ≤ 0.3 | 100.0% adj |  |
| 5 | 77.0% frames ≤ 0.3 | 100.0% adj |  |
| 7 | 18.6% frames ≤ 0.3 | 100.0% adj |  |

**Selected racer: index 2** — 0.2% of frames outside |physicalY|>0.3.

---

## 2. Aggregated Force Contribution Table (Σ|Δy|)

> All 900 frames for racer 2. Split by phase.

| Force Term | Σ|Δy| Start-Phase (287 fr) | Σ|Δy| Race-Phase (613 fr) | Share of total |Δy| |
|---|---|---|---|
| **Home-Force** | 0.454928 | 1.396045 | 10.6% |
| **Avoidance** | 0.963576 | 16.083618 | 97.8% |
| **Soft-Repulsion** | 0.000000 | 0.000000 | 0.0% |
| **Hard-Clamp** | 0.000000 | 0.000000 | 0.0% |
| **Total** | 0.987729 | 16.441602 | 100% |

**Home/Avoidance dominance ratio (race phase):** 0.09×
*(ratio > 1 = home-force larger; >> 1 = home-force strongly dominates)*

---

## 3. Force Balance at Free Space

"Free space" frames: racer has `|physicalY_pre| < 0.2` (near center) AND `neighborCount > 0` (avoidance active).

| Metric | Value |
|---|---|
| Free-space frames | 876 / 900 (97.3%) |
| Avg |Δy_homeForce| per frame | 0.001974 |
| Avg |Δy_avoidance| per frame | 0.019355 |
| Home/Avoidance ratio | **0.10** |
| Avg net Δy (total) | -0.000185 |
| Frames where avoidance > home-force | 805 |
| …of which racer stays in center (< 0.2) | 805 (100.0%) |

**Interpretation:** When avoidance is active in the centerline zone:
- Avoidance is **10× larger** than home-force on average (ratio 0.10 = home/avoidance, avoidance wins)
- Avoidance exceeds home-force in 805/876 frames (92%) — avoidance clearly dominates
- Yet the racer stays near center in 100% of those frames

⚠ **Avoidance wins but racer stays at center in every single case → symmetric force cancellation confirmed.**
Racers on both sides (+Y and -Y) push the racer in opposite directions; the net is near zero.

---

## 4. Re-Roll Correlation (Racer 2)

PhysicalY comparison ±60 frames around each re-roll event.

| Re-Roll time (s) | ΔspreadFactor | physicalY −60fr | physicalY +60fr | ΔphysicalY |
|---|---|---|---|---|
| 4.24 | +0.2191 | 0.0435 | 0.0700 | +0.0265 |
| 9.01 | -0.1422 | 0.0688 | 0.0375 | -0.0312 |
| 12.35 | +0.0945 | 0.0112 | 0.0230 | +0.0119 |

Mean |ΔphysicalY| post-roll: 0.0232

---

## 5. Phase Transition Analysis

Phase transition detected at frame 287 (4.59 s).

| Phase window | Σ|Δy_home| | Σ|Δy_avoid| | Σ|Δy_softRep| | Σ|Δy_hardClamp| |
|---|---|---|---|---|
| Start phase (60 fr) | 0.053717 | 0.197947 | 0.000000 | 0.000000 |
| Race phase (60 fr) | 0.173645 | 1.237558 | 0.000000 | 0.000000 |


**Before → after shift in avoidance:** 6.25× multiplier
(startPhaseAvoidanceFactor = 0.2 → 1.0 after transition)


---

## 6. Additional Force Search

| Suspect | Finding |
|---|---|
| Spline/lateral offset: `getPosition(t, physicalY/2)` | Linear interpolation between inner/outer boundary. No nonlinear effect on physicalY — the mapping is strictly physicalY→world, not world→physicalY. ✓ Not a factor. |
| Hard-clamp fires | 0 frames (0.0% of all frames). Negligible. |
| Soft-repulsion fires | 0 frames (0.0%). Rarely triggered. |
| Signed avg home-force | -0.001920 → net pull toward -Y (racer sits slightly above center, home-force pulls toward 0) |
| Signed avg avoidance | +0.001610 → net push toward +Y (pushed away from racers clustered slightly below center) |
| Re-roll side-effects on physicalY | Re-rolls only change `spreadFactor` → `baseSpeed`. Indirect: faster racer has different t-distance to neighbors → different avoidance. Mean |ΔphysicalY| around re-rolls: 0.0232. |
| Race-pause / applyRacerBehavior skipped | Not applicable in trace (called every frame without condition). |

---

## 7. Hypothesis

**D3 — Two hidden mechanisms working together**

The force decomposition data inverts the initial D1 assumption. Avoidance is **11× stronger** than
home-force in the race phase. Home-force is NOT the problem. Two mechanisms collaborate:

### Mechanism 1 — Start-phase parameter imbalance (primary, causes convergence)

The first 287 frames (4.6 s) are the start phase, where:
- `startPhaseAvoidanceFactor = 0.2` → effective lateral force = 0.08 × 0.2 = **0.016**
- `startPhaseHomeForceFactor = 0.5` → home force = 0.04 × 0.5 = **0.020 per unit physicalY**

At the start, racers are spread to `physicalY = ±0.317 / ±0.95` (via `startSpreadRange = 0.95`).
At `physicalY = 0.317`, home force = 0.317 × 0.020 = **0.00634**.
Maximum avoidance force (at zero distance) = 0.016. But most initial neighbor pairs are at
`|dY| > 0.525` (effectiveAvoidanceDist), so avoidance barely triggers.

Result: Home force is relatively stronger in the start phase. Over 287 frames, **all 8 racers
converge from ±0.95 to |physicalY| < 0.30** — completely collapsing the initial lateral spread.

Measured avg |home|/|avoidance| in start phase: **0.001585 / 0.003357 = 0.47×** (avoidance wins
in start phase too — but at the start, neighbors are far apart so avoidance is near-zero for most
frames, and home-force acts every frame consistently toward 0).

### Mechanism 2 — Symmetric force cancellation in the race phase (secondary, keeps racer trapped)

By frame 287 (phase transition), all 8 racers are clustered within |physicalY| < 0.30.
In the race phase, each racer now has **7 neighbors within avoidance range** (100% adjacency).
Symmetric avoidance pushes every pair apart — but racer 2 has neighbors on **both sides** (+Y
and -Y). The forces from above and below cancel:

| Signed avg home-force (all frames) | -0.001920 | consistently toward -Y (racer above center) |
|---|---|---|
| Signed avg avoidance (all frames) | +0.001610 | pushed toward +Y by racers below |
| Net per frame | ≈ -0.000185 | near-zero oscillation |

The avoidance alternates direction frame-to-frame (sample frames 287-291: ±0.033, ±0.024) because
as the racer's physicalY oscillates, which neighbors are "above" vs "below" changes, flipping
the net force sign each frame. The crowdNormalizationExponent=0.5 reduces force by √7 ≈ 2.65×
but can't fix the cancellation.

**The system reached a wrong equilibrium at physicalY≈0** where symmetric forces from all
neighbors cancel. The equilibrium shifted because mechanism 1 first collapsed all racers to center.

### Two-body equilibrium analysis (shows parameters are sufficient in isolation)

For a single pair (not the full 8-racer crowd):
- effectiveLateralForce = 0.04 × (1 + 2×0.5) = 0.080
- At full proximity: equilibrium physicalY_eq = 0.080 / 0.040 = **2.0** (> maxLateral → clamped)
- Avoidance force is 333% of what's needed for non-overlapping separation

**In isolation, the force parameters are already sufficient.** The problem is not parameter
magnitude — it is the multi-body collapse caused by start-phase imbalance.

---

## 8. Recommendation

**Root cause:** `startPhaseAvoidanceFactor = 0.2` is too weak relative to
`startPhaseHomeForceFactor = 0.5` during the start phase. This causes all racers to converge
to the centerline in the first 4.6 seconds. Once there, symmetric avoidance cancellation
prevents escape in the race phase.

**Fix-1 (primary, minimal surgery):** Increase `startPhaseAvoidanceFactor`.

With `startPhaseAvoidanceFactor = 0.6`:
- Effective lateral force in start phase: 0.08 × 0.6 = **0.048**
- Home force in start phase: 0.04 × 0.5 = 0.020
- Ratio: avoidance is now **2.4× stronger** than home → racers spread instead of collapsing
- Equilibrium during start: physicalY_eq = 0.048 / 0.020 = 2.4 → clamped at maxLateral = 0.95

Racers spread out during start, enter race phase already distributed → race-phase symmetric
cancellation no longer traps everyone at center because positions are asymmetric.

```
startPhaseAvoidanceFactor: 0.2 → 0.6   (only change needed)
```

**Fix-2 (optional, defense-in-depth):** Reduce `crowdNormalizationExponent` from 0.5 to 0.0
(no normalization) so each additional neighbor adds full avoidance force, making the symmetric
cancellation harder to sustain in the race phase.

**Not Fix-A (home-force reduction):** Home-force is already 11× weaker than avoidance in the
race phase. Reducing it further does nothing since the equilibrium is at the SYMMETRIC MEDIAN
of all neighbors' positions, not at a home-force vs avoidance balance point.

**Not Fix-B (avoidance-distance increase):** Distance-2x was tested in the sweep and didn't help.
With all 8 racers already near center, increasing the trigger distance just means more pairs
participate in the symmetric cancellation.

Both tuning changes are available in the DevScreen **Block 10 (Avoidance Advanced)** and
the **Start Phase sub-section** — no code changes needed, only defaults.

---

*Generated by avoidanceForceTrace.js — Etappe-23-Pattern diagnostic tool*
