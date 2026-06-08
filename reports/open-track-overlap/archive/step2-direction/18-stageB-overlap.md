# Stage B — Honest Overlap Before/After (Overlap Objective Assessment)

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-06
**Commit compared:** `7119f9b` (Stage B) vs baseline `8bd7180` (pre-Step-2 behavior)
**Method:** N=50, seed=1, identical params for both. Baseline from `full-sweep-8bd7180.txt`.

---

## Result Table — Dragon Honest Overlap (Open Tracks)

| Track | Baseline honest% | Stage B honest% | Δ | Verdict |
|-------|-----------------|-----------------|---|---------|
| Space Sprint | **4.0%** | 4.0% | 0.0 pp | FLAT |
| River Run | **3.6%** | 3.6% | 0.0 pp | FLAT |
| Luger Hill | **4.5%** | 4.6% | +0.1 pp | FLAT (noise) |
| Mountainstreet | **3.4%** | 3.4% | 0.0 pp | FLAT |
| Seatrack | **3.6%** | 3.7% | +0.1 pp | FLAT (noise) |

**Also: Space Sprint × rocket (slim racer control):** Stage B honest = 0.8% — consistent
with rocket's normal low overlap; Stage B neither helps nor hurts slim racers.

---

## Verdict: FLAT. Objective NOT met.

Dragon honest overlap is unchanged within measurement noise at every open track. Stage B
changed behavior (the side-commitment code runs) but did not reduce the overlap it was
designed to fix.

---

## Root Cause Diagnosis

### The `desiredDir=0` trap: 91.5% of commits suppressed

When Stage B consumes the accumulators in the apply-deltas loop, it checks:

```js
const leftFree  = !_approachLeft.has(r.index);
const rightFree = !_approachRight.has(r.index);
```

`_approachLeft` / `_approachRight` (Stage A) accumulate **all** pairs where
`|dY| < 2 × pairHH`. For dragon on Space Sprint, `pairHH = 41.8/449 = 0.093`,
so the corridor width is `2 × 0.093 = 0.186` in normalized physicalY units.

In a 60-racer field with `physicalY ∈ [−0.9, +0.9]` (range 1.8, approximately uniform):
```
P(no racer in left corridor)  = (1 − 0.093/1.8)^59 ≈ 4.4%
P(both sides occupied)        = (1 − 0.044)² ≈ 91.5%
```

**In 91.5% of cases, `desiredDir = 0` — no commit, no force.** For Luger Hill
(dragon pairHH = 0.127), the "both occupied" rate is 97.3%.

The wide corridor made sense for the original design (it catches all neighbors that COULD
be in your path). But in a dense 60-racer field, every racer has neighbors on both sides
within any 0.186-wide band — making the side-selection logic permanently indecisive.

### What DOES fire (the 8.5%)

In the rare case where one side is clear (`leftFree || rightFree`), Stage B does commit
and applies the force. But 8.5% of triggers is too infrequent to move the aggregate
honest-overlap metric by more than noise.

### Secondary: force magnitude would suffice IF the commit fired

When the commit DOES fire, the force magnitude `lateralForce × (1 − dist/avoidanceDistance)`
is sufficient in theory. At the midpoint of the avoidance zone (dist = 0.09):
```
forceMag = 0.0228 × 0.5 = 0.0114
steady-state velocity = 0.0114 × 0.35/0.65 ≈ 0.0061/step
```
To move dragon's honest half-span (0.093): ~15 steps ≈ 0.25 s.

With the brake-to-match holding the pair in position, 15 steps is ample. Force magnitude
is NOT the limiting factor — the side-selection deadlock is.

---

## Recommended Knob (not implementing here)

### Option A (minimal): Geometric fallback when both sides occupied

When `leftFree = false && rightFree = false`, instead of `desiredDir = 0`, fall back to
**leader-relative direction**: "move away from whichever direction the leader is."

This requires knowing the same-lane leader's `physicalY`. Add a companion Map to the
same-lane detection:

**In pair loop body (alongside `_sameLaneApproach.add(trailer.index)`):**
```js
// Store leader physicalY for fallback direction in apply-deltas
_sameLaneLeaderPhysY.set(trailer.index, leader.physicalY);
```

**In apply-deltas, after `desiredDir = 0` (both occupied):**
```js
if (desiredDir === 0 && _sameLaneLeaderPhysY.has(r.index)) {
  const lpy = _sameLaneLeaderPhysY.get(r.index);
  desiredDir = r.physicalY >= lpy ? 1 : -1;
  if (Math.abs(r.physicalY - lpy) < 1e-6)
    desiredDir = (r.index & 1) === 0 ? 1 : -1;
}
```

This bypasses the "both sides occupied" deadlock by using the SPECIFIC leader's position
rather than the broad corridor occupancy check. The force is still bounded to `forceMag`
from the same pair. Other neighbors in the way are handled by the existing avoidance system.

### Option B (riskier): Replace corridor-check with leader-relative direction always

Skip the `_approachLeft/Right` check entirely for the same-lane case. Use only
`_forwardLeft/_forwardRight` to prefer the side with more forward clearance, and always
commit to the leader-relative direction.

The risk: ignoring `_approachLeft/Right` could push the racer toward an occupied adjacent
space. The existing avoidance system would push back, but it might create brief secondary
overlaps or oscillation. Option A is safer.

### Not recommended: Reducing corridor width

Reducing `pairHH` to make corridors narrower would let more commits happen but would
make the adjacent-clearance check meaningless (a 0.01-wide corridor rarely has a neighbor
and would almost always report "clear" on both sides — same outcome as Option A but less
principled).

---

## Summary

Stage B is structurally correct (code runs, state updates, force fires when commits
are allowed) but the **_approachLeft/Right side-detection deadlocks in dense fields**
91.5% of the time. The overlap objective was not met.

**Fix required:** Add `_sameLaneLeaderPhysY` Map (one extra Map entry per same-lane pair
in the pair loop) and a geometric fallback in the apply-deltas commit logic. This converts
the "both sides occupied → give up" behavior into "both sides occupied → still move away
from this specific leader." Tests would remain green (data field addition + logic change);
a new N=20 screening would confirm the overlap drop before running N=50.
