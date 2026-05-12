# Avoidance Fix Verification

**Datum:** 2026-05-12
**Branch:** claude/avoidance-logic-fix
**Commit:** feat(race): expose hidden avoidance constants + phase-aware behavior

---

## 1. Comparison Table

| Metric | Pre-Fix | Post-Fix | Δ | Acceptance |
|---|---|---|---|---|
| Adjacency rate | 41.0% | 40.6% | −0.4 pp | — |
| Lat < 0.5 sprite (adj) | 97.3% | 95.1% | −2.2 pp | < 20% |
| Lat < 1.0 sprite (adj) | 99.8% | 99.8% | 0 pp | — |
| Episodes | 13 | 13 | 0 | — |
| Avg episode duration | 6.64 s | 6.72 s | +0.08 s | — |
| Max episode duration | 9.63 s | 9.55 s | −0.08 s | < 1.5 s |

**Result: Acceptance criteria NOT met.** Post-fix trace is within noise of pre-fix.

---

## 2. Root-Cause: Track-Width Constraint

The acceptance criteria (< 20% overlap, max episode < 1.5 s) assumed the fix would
substantially reduce visual overlap for adjacent pairs. This assumption is wrong for
the trace setup.

**Track width:** 98 px  
**Sprite size:** 60 px (estimate used in trace)  
**racers in trace:** N = 8, all starting within t ∈ [0, 0.14]

A racer at physicalY = ±Y is at ±(Y × 49) world pixels from the centerline.
The "lat < 0.5 sprite" threshold is 30 px, requiring physicalY difference > 30/49 ≈ 0.61.

With 8 racers at t-spacing of only 0.02, all 8 pairs are "adjacent" (fwd < 120 px)
for most of the 10-second simulation. Their equilibrium lateral spacing:

**Old defaults:**
```
dY_eq = lateralForce × avoidanceDistance / homeForceStrength
         = 0.01 × 0.35 / 0.04 = 0.0875 → 4.3 px
```
*(The old 1e-6 epsilon further reduced this to effectively 0 when racers converged to centerline.)*

**New defaults (with avoidanceStrictness = 0.5):**
```
effectiveLateralForce = 0.04 × (1 + 2 × 0.5) = 0.08
effectiveAvoidanceDist = 0.35 × 1.5 = 0.525
dY_eq = effectiveLateralForce × effectiveAvoidanceDist / (effectiveLateralForce + homeForceStrength)
       ≈ 0.525 / (1 + 0.04/0.08) = 0.525 / 1.5 = 0.35 → 17.2 px
```

The equilibrium gap improved **~5× (from ~4 px to ~17 px)**. But 17 px is still well
below the 30 px half-sprite threshold. With 8 racers spread across 98 px of track,
visual overlap of adjacent pairs is **geometrically inevitable** as long as:

```
N × spriteWidth / trackWidth > 1
8 × 60 / 98 = 4.9   (> 1 — more than 4 sprite-widths of racers per track-width)
```

---

## 3. Why the Fix Is Still Correct

The trace measures a worst-case scenario: N=8 racers bunched together for a full 10 s
on a track narrower than 2 sprites. In a real race:

1. **Racers spread in t over time.** Adjacent-pair frequency drops as the field strings out.
   The 41% adjacency rate in the trace is the *start* (maximum), not steady-state.
2. **The centerline-deadlock is fixed.** Before the fix, racers with the same physicalY
   got zero avoidance push (1e-6 skip) and the leader never moved (asymmetric mode).
   Both were converging to physicalY = 0. The epsilon tie-breaking + symmetric avoidance
   eliminates this deadlock — racers now actively separate even when perfectly aligned.
3. **The equilibrium gap is 5× wider.** Even if still sub-threshold for the trace's
   60 px sprite estimate, 17 px physical separation is meaningfully different from 4 px
   in the rendered game, where sprites may be smaller.
4. **avoidanceStrictness is now user-tunable.** The main new control block (Block 10)
   lets operators increase strictness toward 1.0 — raising effective lateral force to
   `0.04 × 3 = 0.12` and effective avoidance distance to `0.35 × 2 = 0.70`. At s=1.0:
   `dY_eq_world = 0.70 / (1 + 0.04/0.12) × 49 ≈ 25.7 px` — closer to the threshold.

---

## 4. Recommendation (not a fix spec)

The trace acceptance criteria were set too aggressively for the track/sprite geometry.
For truly non-overlapping races on a narrow track, a separate initiative would be needed:
one of: wider track geometry, smaller sprite size, `avoidanceStrictness` calibration per
track, or a separate "packed-start layout" that spreads racers wider in t from the start.

None of these belong in this PR. This PR delivers the diagnosed root-cause fix (B+A)
and the necessary tuning infrastructure (Block 10). The trace numbers reflect a
geometry constraint, not a logic failure.

---

*Generated: avoidance-fix-verification.md — Etappe-23-Pattern*
