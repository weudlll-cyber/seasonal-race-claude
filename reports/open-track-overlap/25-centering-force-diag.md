# Report 25 — Centering-Force Hypothesis Diagnosis

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07
**Commit:** Stage D reverted; HEAD = `dca7e47` (Stage C)
**Method:** code trace with file:line references + arithmetic; no build of fix yet.

---

## 0. Stage D Revert

Stage D was a one-line change: `Math.abs(yDiff) < sameLaneHH` → `Math.abs(yDiff) < 2 * sameLaneHH`
([raceBehavior.js:598](../../client/src/modules/raceBehavior.js#L598)).
Reverted. Stage C comment and trigger restored. 2629/2629 tests green.

---

## 1. Does a Centering Force Exist?

**Yes.** There is a spring-toward-centerline force called the **Home Force**,
applied in every physics frame at
[raceBehavior.js:666–696](../../client/src/modules/raceBehavior.js#L666):

```js
// ── Home force — spring toward centerline ─────────────────────────────────
if (priorityExtras) {
  for (const r of active) {
    let homeContrib = 0;
    if (r.currentMode === PRIORITY_MODE.NORMAL) {
      homeContrib = -r.physicalY * config.homeForceStrength;    // line 676
    } else if (r.currentMode === PRIORITY_MODE.BLOCKED && ...) {
      homeContrib = -r.physicalY * config.homeForceStrength * blockedEscapeForce;
    }
    yDeltas.set(r.index, homeContrib);    // line 685
  }
}
```

Formula: `homeContrib = −physicalY × 0.03` ([defaults.js:506](../../client/src/modules/storage/defaults.js#L506)).

Direction: always toward `physicalY = 0` (track centerline). When the racer is pushed
outward (positive physicalY), homeContrib is negative — opposing the outward motion.

So the user's hypothesis is correct in one sense: **the force exists and does oppose
outward motion when it is active.**

---

## 2. When Is the Home Force Active? Priority-Mode Gate

The Home Force is gated by the racer's **priority mode**
([raceBehavior.js:630–664](../../client/src/modules/raceBehavior.js#L630)):

| Mode | Home Force |
|------|-----------|
| `NORMAL` | full: `−physicalY × 0.03` |
| `COOLDOWN` | **0** |
| `BLOCKED` (short) | **0** |
| `BLOCKED` (timeout escape) | reduced fraction |
| `OVERLAP` | **0** |

`OVERLAP` mode fires when a racer is in the `overlapSet`
([raceBehavior.js:639–643](../../client/src/modules/raceBehavior.js#L639)):

```js
const inOverlapNow = overlapSet.has(r.index);
if (inOverlapNow) r.currentMode = PRIORITY_MODE.OVERLAP;
```

`overlapSet` is populated at [raceBehavior.js:514–521](../../client/src/modules/raceBehavior.js#L514):

```js
const lateralHalfSpan = spriteWorldSize / trackWidth;    // = 44.9/449 = 0.100 (dragon×Space Sprint)
const tHalfSpan       = spriteWorldSize / pathLength;    // = 44.9/1280 = 0.035
const overlaps = dT <= tHalfSpan && Math.abs(dY) <= lateralHalfSpan;
if (overlaps) {
  overlapSet.add(rA.index);
  overlapSet.add(rB.index);
}
```

Thresholds (dragon × Space Sprint, pathLength ≈ 1280 px, trackWidth = 449 px):

| Threshold | Value | Note |
|-----------|-------|------|
| `tHalfSpan` | 0.0351 | T-overlap trigger |
| `lateralHalfSpan` | 0.100 | Y-overlap trigger (sprite, not honest body) |
| `dynamicBrakeMatchT` | 0.5 × 0.0351 = 0.0176 | brake-to-match T zone |
| `bmYThreshold` | 0.060 | brake-to-match Y zone |
| `sameLaneHH` (honest) | 0.093 | clearance threshold |

---

## 3. Phase-by-Phase Analysis of the Dragon Direct-Behind Overtake

### Phase 1 — Far approach (dT ∈ [0.035, 0.09], NORMAL mode)

The pair is within avoidance distance (dist < 0.18) but **T separation exceeds tHalfSpan**
(0.035). The pair is NOT in `overlapSet` → **NORMAL mode** → home force is ACTIVE.

However, in this phase `|yDiff| ≈ 0` → natural avoidance delta = 0 (line 610: `if
(Math.abs(yDiff) < 1e-6) continue`). The only outward force is the Stage B committed force
(`_approachForceMag × commitDir`, [raceBehavior.js:803–806](../../client/src/modules/raceBehavior.js#L803)):

At dT = 0.035, dist ≈ 0.035 × 2 = 0.070:

```
forceMag = 0.0114 × (1 − 0.070/0.18) = 0.0114 × 0.611 = 0.00697
committed force (outward) = +0.00697   (no lateralScale — direct delta injection)
home force (inward)       = −physicalY × 0.03
```

Equilibrium (net force = 0): `physicalY_eq = 0.00697/0.03 = 0.232`

Since `physicalY_eq = 0.232 >> sameLaneHH = 0.093`, the home force cannot contain the
trailer in this phase — the committed force is strong enough to push the racer past the
honest clearance threshold even against the full home force. The home force does slow the
approach (reduces net outward force by ~30% at physicalY = 0.07), but equilibrium is at
0.23, not inside the gap zone.

### Phase 2 — Near approach (dT ∈ [0.018, 0.035], OVERLAP mode)

The pair enters the free-lane overlap zone (dT < tHalfSpan = 0.035, |yDiff| < 0.100) →
added to `overlapSet` → **OVERLAP mode** → **home force = 0**.

The pair is not yet in brake-match (dT > dynamicBrakeMatchT = 0.018). Outward forces:
natural avoidance + Stage B committed force. Home force: **gone**.

### Phase 3 — Brake-match (dT < 0.018, |yDiff| < 0.06, OVERLAP mode)

Brake-match fires (`dT < dynamicBrakeMatchT = 0.018`). The brake-match zone is a strict
SUBSET of the free-lane overlap zone (since 0.018 < 0.035). So the trailer is still in
`overlapSet` → **OVERLAP mode** → **home force = 0**.

Trailer speed is capped to leader speed. `dT ≈ constant ≈ small positive`. Outward
force: Stage B committed force only (natural avoidance ≈ 0 when |yDiff| < 1e-6).

This is the critical phase from report 24. The gap arithmetic is unchanged:
```
forceMag at |yDiff|=0.03, dT=0.001: ≈ 0.00950
v_ss = 0.00950 × 0.16/0.84 = 0.00181/step
frames to |yDiff|=0.060: 0.060/0.00181 ≈ 33 frames  (brake-match exits)
```

Home force contribution to this calculation: **zero** (OVERLAP mode throughout).

### Phase 4 — Post-release passing window (~15 frames, OVERLAP mode)

After brake-match exits at |yDiff| ≈ 0.060, the trailer starts pulling ahead. From
report 24: dT ≈ 0.005 at this moment. The pair exits brake-match (dT grew past 0.018),
but **the pair is still inside the free-lane overlap zone** (dT = 0.005 << tHalfSpan =
0.035) → **OVERLAP mode persists** → **home force = 0**.

Even if dT were to reach tHalfSpan during the 15-frame window (it won't — dT starts at
0.005 and can only grow by a few × 0.001/frame before the pass is complete), the
transition would add home force = `−0.07 × 0.03 = −0.0021` against a committed force
of ≈ 0.0047. Net outward push would still be 0.0026 vs 0.0047 — a 44% reduction, but
the pair is already exiting the interaction zone, so this 15-frame window is almost
certainly spent entirely in OVERLAP mode based on dT = 0.005.

---

## 4. Measured Magnitudes vs the Hypothesis

Summary of actual force magnitudes during the gap-problem scenario:

| Phase | Home Force Active? | Home force (at physicalY=0.07) | Committed force | Ratio |
|-------|-------------------|-------------------------------|-----------------|-------|
| Far approach (NORMAL) | YES | −0.0021 | +0.0070 | 3.3:1 (committed wins) |
| Near approach (OVERLAP) | **NO** | 0 | +0.0070 | — |
| Brake-match (OVERLAP) | **NO** | 0 | +0.0095 | — |
| Post-release (OVERLAP) | **NO** | 0 | +0.0047 | — |

---

## 5. Verdict

**The user's hypothesis does not hold for the gap-problem scenario.**

The centering force (Home Force) exists and does oppose outward motion when active, but
it is **fully suppressed** during all three critical phases (near approach, brake-match,
post-release) because the pair is in OVERLAP mode for all of them. The gap problem
occurs entirely within the `overlapSet` zone, where home force is zero.

The only phase where home force fires against the outward avoidance push (Phase 1, far
approach) is not the constraint — its equilibrium is physicalY = 0.23, well beyond honest
clearance (0.093), so the racer passes through clearance in Phase 1 without trouble. The
bottleneck is Phase 3 (brake-match), which the home force cannot touch.

**Suppressing or zeroing the home force during the overtake would have no effect on the
gap problem.** The user's proposed fix (suppress centering while approachCommitDir is set)
would only modify Phase 1, where the home force is already losing to committed force by
3.3:1. The fix is architecturally clean, but it targets the wrong phase.

**Report 24's conclusion stands: the gap is force-magnitude-bound.** The binding
constraint is that the committed lateral force (`lateralForce = 0.0114`, `lateralDamping
= 0.16`) can only move the trailer from |yDiff| = 0 to |yDiff| ≈ 0.081 before the pass
completes — 5 px short of honest clearance (0.093). No opposing centering force is
causing this; the avoidance push itself is too weak during brake-match.

---

## 6. Soft Repulsion — Also Not Contributing

For completeness: there is a second restoring force, soft repulsion
([raceBehavior.js:813–818](../../client/src/modules/raceBehavior.js#L813)):

```js
if (absY >= config.comfortThreshold && absY < 1.0) {    // comfortThreshold = 0.70
  const pen = (absY - 0.70) / 0.30;
  newY -= Math.sign(newY) * 0.1 * pen * pen;
}
```

This fires only at |physicalY| ≥ 0.70 (defaults.js:445). During a dragon overtake,
physicalY peaks at ~0.08 — 8.8× below the soft-repulsion threshold. **Not a factor.**

---

## 7. Recommendation

**Implement Lever B** (dedicated gap-clearing force from report 24, section 4).

The fix must act IN the brake-match phase (Phase 3), where the gap problem lives.
Lever B inserts a proportional outward force into Stage B's force injection block:

```
gapForce = lateralForce × max(0, 2×sameLaneHH − |yDiff|) / (2×sameLaneHH)
```

This is self-limiting (scales to zero at |yDiff| = 2×sameLaneHH), racer-size-proportional,
and does not depend on removing any existing force. It adds to the committed-force delta in
the apply-deltas block where home force is already zero, so there is no cancellation risk
from any existing restoring term.

Suppress-centering is **not worth pursuing**: the centering force is already zero in the
phases that matter, so suppressing it would be a no-op for the gap problem.

**Fairness sweep required** after Lever B implementation (same recommendation as report 24).
