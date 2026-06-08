# Report 20 — Avoid-First Diagnosis: Why the Slightly-Offset Approacher Doesn't Evade

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-06
**Commit:** `1864180` (current HEAD, Stage B + deadlock fix)
**Context:** User observation — comeback racer approaches slightly-offset leader, brakes, then
drives through. Right side was visually free. This report traces the code path and explains
why evasion fails.

---

## Reference Numbers (dragon × Space Sprint)

Derived from racer config and track geometry. All values are normalized physicalY unless noted.

| Symbol | Value | Source |
|--------|-------|--------|
| `spriteWorldSizePx` | 50 px | `physicalSpriteSize = displaySize × 1.0` ([index.jsx:498,603](../../client/src/screens/RaceScreen/index.jsx#L498)) |
| `honestBodyWidthPx` | 41.8 px | `spriteWorldSizePx × bodyFillX = 50 × 0.836` ([index.jsx:604](../../client/src/screens/RaceScreen/index.jsx#L604)) |
| `pairHH` (Stage A) | 0.0931 | `honestBodyWidthPx / trackWidth = 41.8 / 449` ([raceBehavior.js:389](../../client/src/modules/raceBehavior.js#L389)) |
| `sameLaneHH` (Stage B) | 0.0931 | same formula ([raceBehavior.js:594–596](../../client/src/modules/raceBehavior.js#L594)) |
| Stage A corridor half-width | 0.186 | `2 × pairHH` ([raceBehavior.js:390](../../client/src/modules/raceBehavior.js#L390)) |
| `avoidanceDistance` | 0.18 | [defaults.js:510](../../client/src/modules/storage/defaults.js#L510) |
| `tWeight`, `yWeight` | 2.0, 1.0 | [defaults.js:448–449](../../client/src/modules/storage/defaults.js#L448) |
| `speedBrakeYThreshold` | 0.18 | [defaults.js:517](../../client/src/modules/storage/defaults.js#L517) |
| `speedBrakeTMultiplier` | 1.5 | [defaults.js:516](../../client/src/modules/storage/defaults.js#L516) |
| `brakeMatchActivationYThreshold` | 0.06 | [defaults.js:525](../../client/src/modules/storage/defaults.js#L525) |
| `brakeMatchActivationTMultiplier` | 0.5 | [defaults.js:524](../../client/src/modules/storage/defaults.js#L524) |
| `trackWidthPx` (Space Sprint) | 449 px | `honestBodyWidthPx / pairHH = 41.8 / 0.0931` |
| `pathLengthPx` (Space Sprint) | 19780 px | `renderedBodyH / honestHalfLong = 44.9 / 0.00227` |

---

## Q1 — Code Path for the Slightly-Offset Approacher

**Scenario:** `|dY| ≈ 0.04–0.08` (slightly offset, same lane), trailer approaching from behind.

### Gate-by-gate trace

**Y-rejection** ([raceBehavior.js:409](../../client/src/modules/raceBehavior.js#L409)):
```
|dY| × yWeight = 0.06 × 1.0 = 0.06 < avoidanceDistance (0.18) → PASSES
```
Pair enters the avoidance body for all slightly-offset cases.

**Full anisotropic dist gate** ([raceBehavior.js:411](../../client/src/modules/raceBehavior.js#L411)):
Entry dT for `|dY| = δ`:
```
dT_entry = sqrt(0.18² − δ²) / 2.0
  δ = 0.04 → dT_entry = 0.0894
  δ = 0.06 → dT_entry = 0.0849
  δ = 0.08 → dT_entry = 0.0806
```
Lateral avoidance force fires inside this zone.

**Stage B same-lane detection** ([raceBehavior.js:590–608](../../client/src/modules/raceBehavior.js#L590)):
Fires when `|yDiff| < sameLaneHH (0.0931)` AND inside dist gate. All `|dY| < 0.0931` pairs
qualify. The slightly-offset approacher IS in this range.

**avoidanceActive / floor-brake zone** ([raceBehavior.js:448](../../client/src/modules/raceBehavior.js#L448)):
```
dynamicBrakeT = (50 / 19780) × 1.5 = 0.00380
Fires when: |dY| < 0.18  AND  dT < 0.00380
```

**Brake-to-match sub-zone** ([raceBehavior.js:461–466](../../client/src/modules/raceBehavior.js#L461)):
```
dynamicBrakeMatchT = (50 / 19780) × 0.5 = 0.00127
bmYThreshold = 0.06
Fires when: |dY| < 0.06  AND  dT < 0.00127  (open tracks only)
```
For `|dY| ≥ 0.06`: brake-to-match does NOT fire at all.

**Free-lane separation / geometric overlap** ([raceBehavior.js:517](../../client/src/modules/raceBehavior.js#L517)):
```
lateralHalfSpan = 50 / 449 = 0.1114
tHalfSpan       = 50 / 19780 = 0.00253
Fires when: dT ≤ 0.00253  AND  |dY| ≤ 0.1114
```

---

## Q2 — Distance Ordering: What Fires First?

For the representative case `|dY| = 0.04`, dT decreasing from far (approaching):

| dT threshold | Event | Code location |
|---|---|---|
| **0.0894** | Lateral avoidance force begins; Stage B fires | [raceBehavior.js:410–411, 590–608](../../client/src/modules/raceBehavior.js#L410) |
| 0.00380 | avoidanceActive set → 0.945 floor-brake in index.jsx | [raceBehavior.js:448–449](../../client/src/modules/raceBehavior.js#L448) |
| 0.00253 | Geometric overlap → free-lane separation fires | [raceBehavior.js:517](../../client/src/modules/raceBehavior.js#L517) |
| 0.00127 | Brake-to-match fires (only if `|dY| < 0.06`) | [raceBehavior.js:466](../../client/src/modules/raceBehavior.js#L466) |

**Conclusion: avoidance fires FIRST, braking fires LAST.** Brake-to-match fires at less than 2%
of the avoidance zone radius (0.00127 vs 0.0894). The "brake-first" user perception is NOT about
distance ordering — it is about what the user SEES, which is explained in Q3.

---

## Q3 — Why Isn't the Free Side Taken?

Two compounding failures in Stage B, both in the apply-deltas direction selection
([raceBehavior.js:744–781](../../client/src/modules/raceBehavior.js#L744)):

### Failure A: Approach-corridor false occupancy (dense-field deadlock)

Stage B reads `_approachLeft` / `_approachRight` to assess side occupancy.
These are populated in Stage A ([raceBehavior.js:395–403](../../client/src/modules/raceBehavior.js#L395))
for ALL pairs where `|dY| < 2 × pairHH = 0.186`, with NO t-distance constraint.
Any racer within 0.186 laterally — whether it is 3 frames ahead or 200 frames ahead — counts as
"occupying" that side.

In a 60-racer field with `physicalY ∈ [−0.9, +0.9]`:
```
P(one side clear) = (1 − 0.093 / 1.8)^59 ≈ 4.4%
P(both sides occupied) ≈ 91.5%   (dragon / Space Sprint)
P(both sides occupied) ≈ 97.3%   (dragon / Luger Hill, wider pairHH)
```

In 91.5% of triggers, `leftFree = false` AND `rightFree = false` → deadlock path.
The user's "right side is free" (visual assessment) is overridden by a racer that is far
ahead or far behind but laterally close enough to mark that side occupied.

### Failure B: Forward-tiebreak direction inversion (the force-cancellation root cause)

When the deadlock path fires ([raceBehavior.js:765–781](../../client/src/modules/raceBehavior.js#L765)),
the first resolver is the forward-clearance tiebreak:
```js
const fwdL = _forwardLeft.has(r.index);
const fwdR = _forwardRight.has(r.index);
if (!fwdL && fwdR) desiredDir = -1;      // left forward clear → go left
else if (fwdL && !fwdR) desiredDir = 1;  // right forward clear → go right
```

`_forwardLeft/Right` are also populated globally for ALL pairs, not just the specific
trailer–leader pair. They reflect whether any pair has placed a "forward obstacle" for this
racer's index in each direction.

**Concrete inversion scenario:**

Trailer at physY = +0.04, leader at physY = +0.00.

Natural avoidance direction: `pushDir = +1` (right) — trailer should move right, away from leader.
Stage B: `_approachLeft.has(trailer) = true` (leader is to trailer's left); `_approachRight.has(trailer) = true` (some other racer, e.g., at physY = +0.15, is to trailer's right) → deadlock.

Now suppose an unrelated pair has physY ≈ +0.20 leading some other trailer-with-physY ≈ +0.06:
→ `lateralDelta = +0.20 − +0.06 = +0.14 > pairHH (0.0931)` → `_forwardRight.add(trailer_of_+0.06)`.
Wait, that's not our trailer. But other pairs CAN set `_forwardRight.has(our_trailer)` if there
exists any pair where our trailer's index appears as `back.index` with `lateralDelta > pairHH`.

If `_forwardRight.has(our_trailer) = true` (some forward obstacle to the right from another pair)
AND `_forwardLeft.has(our_trailer) = false`:
→ `desiredDir = -1` (go LEFT — toward the leader at physY = +0.00)

Stage B force: `delta += -1 × fMag` ← pushes trailer LEFT, toward leader.
Natural avoidance from `yAvoidDeltas`: `+1 × forceMag` ← pushes trailer RIGHT, away from leader.

Both forces come from the SAME pair's `forceMag`. They **cancel**. Net lateral delta ≈ 0.

The trailer does not move sideways. avoidanceActive fires when very close → user sees the
0.945 floor-brake (5.5% slowdown) as the only visible effect → perceived as "brakes first,
doesn't avoid." Then the pair enters geometric overlap and free-lane separation fires — but
too late to prevent the pass-through the user sees.

### Summary diagram

```
Stage B fires at dT = 0.089 (early, correct moment)
  │
  ├─ Failure A: both corridors "occupied" (91.5% rate) → deadlock
  │
  └─ Failure B: forward tiebreak picks OPPOSITE direction to natural avoidance
                → Stage B force and avoidance force cancel
                → net lateral Δ ≈ 0
                → no visible evasion

At dT = 0.004: avoidanceActive (0.945 floor brake) fires
  → user sees slight slowing but no lateral movement → "brakes first" perception

At dT = 0.003: geometric overlap → free-lane fires but pair is already touching
  → pass-through
```

---

## Q4 — Avoid-First Fix Outline (no code yet)

### Root change: remove approach-corridor direction logic from Stage B

The `_approachLeft` / `_approachRight` side-occupancy check is the wrong tool for same-lane
avoidance. It was designed for approach signaling (Stage A corridor occupancy) but in Stage B's
direction selector it produces false deadlocks 91.5% of the time and is irrelevant to the
specific leader-trailer pair.

**Replace the entire `leftFree / rightFree / deadlock` block**
([raceBehavior.js:744–781](../../client/src/modules/raceBehavior.js#L744)) with:

```
1. Primary: natural direction = leader-relative (from _sameLaneLeaderPhysY, already stored)
      desiredDir = (trailer.physY >= leader.physY) ? +1 : −1

2. Forward-clearance preference:
   naturalFwdBlocked = _forwardRight.has(r) if naturalDir > 0, else _forwardLeft.has(r)
   oppFwdBlocked     = _forwardLeft.has(r)  if naturalDir > 0, else _forwardRight.has(r)

   if (naturalFwdBlocked && !oppFwdBlocked):
       desiredDir = -naturalDir   ← natural path blocked ahead, opposite is clear → deviate
   else:
       desiredDir = naturalDir    ← keep natural direction (covers: both clear, both blocked,
                                     only opposite blocked — all favor "move away from this leader")

3. Force injection, debounce, and anti-starvation: unchanged from current code.
```

### Why this fixes both failures

**Failure A** (corridor false occupancy): eliminated. The approach corridor check
(`_approachLeft/Right`) is removed from Stage B's direction logic entirely. Dense-field false
positives no longer cause deadlocks.

**Failure B** (direction inversion): eliminated. Stage B's `desiredDir` now always points in
the same direction as the natural avoidance push (`yDiff ≥ 0 → +1`), except in the specific case
where the natural path is forward-blocked AND the opposite is forward-clear. In that case both
forces agree on the new direction.

**Force additivity** (the desired property): `yAvoidDeltas` pushes in `naturalDir`; Stage B
force now also pushes in `naturalDir` → forces ADD instead of canceling → net lateral delta is
larger → visible evasion at dT ≈ 0.089, not just at dT ≈ 0.003.

### Constraint: force magnitude unchanged

The Stage B force is still bounded to `_approachForceMag.get(r.index)` from the same pair.
No new pair loops, no O(N²) addition. The fix is O(1) per racer in the apply-deltas loop.

### Scope: open tracks only

The `config.isOpen !== false` guard ([raceBehavior.js:741](../../client/src/modules/raceBehavior.js#L741))
stays. Closed tracks are untouched.

---

## What This Report Does NOT Cover

- Frame-log measurement (Stage B perf is already known from report 17–19; fix adds no new O)
- Full sim sweep (deferred to end-of-Step-2, as established)
- Stage C (forward clearance activation) and Stage D (honestBodyWidthPx as trigger span)
  remain planned — avoid-first fix is a prerequisite, not a replacement

---

## Next Step

**Build the fix:** replace the direction-selection block in
[raceBehavior.js:744–781](../../client/src/modules/raceBehavior.js#L744)
with the leader-relative-first logic above.

Then screen: 3 tracks × default racer (Space Sprint, Mountainstreet, Dirt Oval).
Gate questions:
1. Does a slightly-offset comeback racer now visibly steer AROUND the leader instead of through?
2. Does the Stage B force still pass the zigzag gate (`< 0.05` absolute)?
3. Do fairness p-values stay above 0.05?
