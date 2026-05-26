# RaceArena — Mechanics Inventory May 2026

**Purpose:** Complete read documentation of the start phase and all forces acting on a racer.
Foundation for the planned priority-based anti-collision architecture.

**Branch:** `master` @ `be436b5`
**Date:** 2026-05-14
**Scope restriction:** Read-only inventory — no code changes, no refactoring, no proposals.

---

## Question 1 — How does the start phase work?

### 1.1 Technical definition

Three phases, defined as an enum object in [`client/src/screens/RaceScreen/index.jsx:94`](../client/src/screens/RaceScreen/index.jsx#L94):

```
PHASE = { COUNTDOWN: 0, RACING: 1, FINISHED: 2 }
```

The "start phase" corresponds to `PHASE.COUNTDOWN` (value `0`).

Initial state at race start: `phase: PHASE.COUNTDOWN` ([index.jsx:311](../client/src/screens/RaceScreen/index.jsx#L311)).

### 1.2 Duration and exit condition

- **Duration:** 4000 ms (hardcoded, not configurable via DevScreen)
- **Start:** `countdownStart` is set lazily on the first rAF frame (`if (!st.countdownStart) st.countdownStart = ts`)
- **End trigger:** `ts - st.countdownStart >= 4000` ([index.jsx:836](../client/src/screens/RaceScreen/index.jsx#L836))
- **Transition:** `phase` switches to `PHASE.RACING`; `raceStart` is set; `nextRollTime` of all racers is converted from relative offsets to absolute timestamps

### 1.3 Active logic during COUNTDOWN vs. RACING

| Logic | COUNTDOWN | RACING |
|---|---|---|
| `r.t` (race progress) forward | ✗ | ✓ |
| `applyRacerBehavior()` (all forces) | ✗ | ✓ |
| Re-Roll (spreadFactor) | ✗ | ✓ |
| `computePositions()` (Rendering) | ✓ | ✓ |
| CameraDirector | ✓ (passive) | ✓ |
| `runoutDecay` (for finished racers) | ✗ | ✓ |

During COUNTDOWN all racers do **not** move — `computePositions()` renders only the initial `t` values set during race init.

### 1.4 Start position assignment

The start-row calculation is performed once during race init, **before** the first rAF frame ([index.jsx:280–383](../client/src/screens/RaceScreen/index.jsx#L280)).

**Step 1 — racersPerRow** ([rowLayout.js](../client/src/modules/rowLayout.js)):
```
effectiveWidth = geometricTrackWidthPx × startSpreadRange
racersPerRow = floor((2 × effectiveWidth) / spriteSize)
```
`startSpreadRange` is DevScreen-configurable (default `0.95`).

**Step 2 — Row assignment:**
`computeRowLayout(nRacers, racersPerRow)` shuffles all racer indices randomly and distributes them across rows.

**Step 3 — tStart (race progress offset):**
```
deltaT_per_row = rowGapPx / pathLengthPx
rowGapPx = spriteSize × rowGapMultiplier

Open Track:  tStart = (totalRows − rowIndex) × deltaT_per_row   // front row furthest ahead
Closed Track: tStart = −(rowIndex × deltaT_per_row)              // front row at t=0
```
`rowGapMultiplier` is DevScreen-configurable (default `1.5`).

**Step 4 — physicalY (lateral position):**
```
computeRowPhysicalY(indexInRow, rowSize, startSpreadRange)
= −startSpreadRange + (2 × startSpreadRange × indexInRow) / (rowSize − 1)
```
Uniform distribution from `−startSpreadRange` to `+startSpreadRange`.

**Step 5 — speedBonusMult (rear-row compensation):**
```
speedBonus = (rowIndex × rowGapPx / pathLengthPx) × speedBonusFactor
speedBonusMult = 1 + speedBonus
```
`speedBonusFactor` is DevScreen-configurable (default `1.0`).

**Step 6 — spreadFactor (random speed draw):**
```
spreadFactor = (BASE_SPEED_MIN + random() × (BASE_SPEED_MAX − BASE_SPEED_MIN)) / BASE_SPEED_MEAN
baseSpeed = race_baseSpeed × speedMultiplier × spreadFactor × speedBonusMult
```
This value is mutable at runtime via re-rolls (only during RACING).

### 1.5 DevScreen visibility (start phase)

All start parameters are in **Race Tuning**:

| Parameter | DevScreen label | Block |
|---|---|---|
| `startSpreadRange` | Start Spread Range | Block 2: Start Layout |
| `runoutZone` | Runout Zone | Block 2: Start Layout |
| `rowGapMultiplier` | Row Gap Multiplier | Block 3: Row Start |
| `speedBonusFactor` | Speed Bonus Factor | Block 3: Row Start |
| `maxCapacityFactor` | Max Capacity Factor | Block 3: Row Start |

**Not configurable:** Countdown duration (4000 ms) — hardcoded in [`index.jsx:836`](../client/src/screens/RaceScreen/index.jsx#L836).

---

## Question 2 — Which forces act on a racer?

Coordinate system: `physicalY ∈ [−1, +1]`, `0 = center line`, `−1 = inner boundary`, `+1 = outer boundary`. `t ∈ [0, 1)` = race progress along the path.

The forces are defined in two files:
- **Speed:** [`RaceScreen/index.jsx`](../client/src/screens/RaceScreen/index.jsx)
- **Lateral movement:** [`raceBehavior.js`](../client/src/modules/raceBehavior.js) — called as `applyRacerBehavior(racers, config)`, purely in-place, no React/DOM

---

### Force 1 — spreadFactor / Re-Roll

**Code name:** `spreadFactor`, `r.baseSpeed`
**Effect:** Determines the individual base speed of a racer relative to the field average. Varied by periodic re-rolls over the race duration.
**When active:** Initial draw at race init; re-rolls fire during RACING every `rollInterval` ms until `lastRollDeadline` (= `reRollLastPositionPercent`% of target duration).
**Magnitude:**
- Initial value: `BASE_SPEED_MIN / MEAN` to `BASE_SPEED_MAX / MEAN` (defaults: 0.00096–0.00113, mean 0.001045 → factor range ≈ 0.919–1.082)
- Re-roll step: ±`halfWidth = spreadRange × reRollVariationPercent / 100`
- Transition: `easeInOutCubic` over `reRollTransitionDuration × 1000` ms
**DevScreen:** Race Tuning → Speed Re-Roll (4 parameters: Variation Width %, Transition Smoothness s, Re-Roll Frequency Divisor, Last Roll Position %)
**Code:** [`index.jsx:838–877`](../client/src/screens/RaceScreen/index.jsx#L838)

---

### Force 2 — speedBonusMult (rear-row compensation)

**Code name:** `speedBonusMult`, `r.baseSpeed`
**Effect:** Permanent speed bonus for racers that start further back — compensates for the structural disadvantage from the greater starting deficit.
**When active:** Calculated at race init and never changes. Active for the entire race duration.
**Magnitude:** `speedBonus = (rowIndex × rowGapPx / pathLengthPx) × speedBonusFactor`; default `speedBonusFactor = 1.0`. Multiplier `= 1 + speedBonus` (typically < 1–3% deviation).
**DevScreen:** Race Tuning → Row Start → Speed Bonus Factor
**Code:** [`rowLayout.js:computeSpeedBonus`](../client/src/modules/rowLayout.js), [`index.jsx:326–342`](../client/src/screens/RaceScreen/index.jsx#L326)

---

### Force 3 — Drafting (slipstream boost)

**Code name:** `draftingBoostActive`, `draftingBoost`
**Effect:** Racers in the slipstream of a leader receive a speed bonus. Checked in the cone directly behind the leader in world pixel coordinates.
**When active:** RACING phase, every frame after `applyRacerBehavior()`. Leader must have `leader.t > follower.t`.
**Magnitude:** `boost = draftingBoost = 1.04` (+4% speed); cone half-angle `= draftingConeAngle/2 = 15°`; max distance `= draftingMaxDistance = 80` world px.
**Cone geometry:** `behindAngle = leader.angle + π`; check `|followerAngle − behindAngle| ≤ coneHalf`. Note (backlog): On tight corners the cone can miss the slipstream area (known architecture issue, not yet fixed).
**DevScreen:** Race Tuning → Drafting / Slipstream (Max Distance, Cone Angle °, Boost Factor)
**Code:** [`raceBehavior.js:291–319`](../client/src/modules/raceBehavior.js#L291)

---

### Force 4 — Speed Brake (side-by-side slowdown)

**Code name:** `avoidanceActive`, `speedBrakeFactor`
**Effect:** The trailer (rear racer) slows down when truly side-by-side with the leader — prevents overtaking on the same line.
**When active:** RACING phase; when `|dY| < speedBrakeYThreshold` AND `dT < speedBrakeTThreshold`; only the trailer is braked (asymmetric).
**Magnitude:** `brake = speedBrakeFactor = 0.95` (−5% speed); defaults: `speedBrakeYThreshold = 0.2`, `speedBrakeTThreshold = 0.015`.
**DevScreen:** Race Tuning → Speed Brake (Adjacent Y Threshold, Adjacent T Threshold, Speed Brake Factor)
**Code:** [`raceBehavior.js:167–169`](../client/src/modules/raceBehavior.js#L167)

---

### Force 5 — Avoidance (lateral yield: trailer yields to leader)

**Code name:** `yAvoidDeltas`, `lateralForce`, `tWeight`, `yWeight`, `avoidanceDistance`
**Effect:** Pushes the trailer laterally away from the leader's physicalY, when both are within the anisotropic avoidance distance. The leader holds its line.
**When active:** RACING phase, every frame for each racer pair within the distance. Only the trailer is moved.
**Magnitude:**
```
dist = sqrt((dT × tWeight)² + (dY × yWeight)²)
forceMag = lateralForce × (1 − dist / avoidanceDistance)
```
Defaults: `lateralForce = 0.01`, `avoidanceDistance = 0.35`, `tWeight = 2.0`, `yWeight = 1.0`.
Anti-stacking: With multiple neighbors, the accumulated avoidance is normalized by `sqrt(neighborCount)`.
**DevScreen:** Race Tuning → Soft Avoidance (Avoidance Distance, T Weight, Y Weight, Lateral Force, Max Lateral)
**Code:** [`raceBehavior.js:144–251`](../client/src/modules/raceBehavior.js#L144)

---

### Force 6 — Free-Lane Separation (geometric overlap resolution)

**Code name:** `yFreeLaneDeltas`, `overlapSet`, `stablePairBit`
**Effect:** When two racer sprites actually intersect (geometric overlap), checks for free left/right lane gaps and steers each racer into the free lane.
**When active:** RACING phase; only when `dT ≤ tHalfSpan AND |dY| ≤ lateralHalfSpan` (true sprite overlap). `tHalfSpan = spriteSize / pathLength`, `lateralHalfSpan = spriteSize / trackWidth`.
**Magnitude:** Same `forceMag` as avoidance. Direction determined by free-space geometry; tie-break resolved deterministically via `stablePairBit` (FNV-1a hash of racer names). Racers in `overlapSet` simultaneously reduce home-force (see Force 7).
**DevScreen:** No dedicated block — uses `lateralForce` and `maxLateral` from Soft Avoidance; `homeForceReductionOnOverlap` from Home Force.
**Code:** [`raceBehavior.js:171–239`](../client/src/modules/raceBehavior.js#L171)

---

### Force 7 — Home Force (return to center line)

**Code name:** `homeForceStrength`, `homeForceReductionOnOverlap`, `yDeltas`
**Effect:** Spring force back to the center line (`physicalY = 0`). Reduces during active sprite overlap so that free-lane separation has room to disentangle.
**When active:** RACING phase, every frame for all active racers.
**Magnitude:**
```
overlapFactor = overlapSet.has(r) ? homeForceReductionOnOverlap : 1.0
delta = −physicalY × homeForceStrength × overlapFactor
```
Defaults: `homeForceStrength = 0.04`, `homeForceReductionOnOverlap = 0.3`.
**DevScreen:** Race Tuning → Home Force (Home Force Strength, Home Force Reduction On Overlap)
**Code:** [`raceBehavior.js:253–261`](../client/src/modules/raceBehavior.js#L253)

---

### Force 8 — Soft Repulsion (boundary buffer)

**Code name:** `comfortThreshold`, `softRepulsionStrength`
**Effect:** Quadratic repulsion force that grows stronger the closer a racer gets to the track boundary. Creates a soft "bumper" zone before the hard clamp.
**When active:** RACING phase, every frame after summing all delta-Y forces, before the hard clamp is applied.
**Magnitude:**
```
if |newY| ≥ comfortThreshold:
  pen = (|newY| − comfortThreshold) / (1.0 − comfortThreshold)
  newY -= sign(newY) × softRepulsionStrength × pen²
```
Defaults: `comfortThreshold = 0.7`, `softRepulsionStrength = 0.1`.
**DevScreen:** Race Tuning → Comfort Zone (Comfort Threshold, Soft Repulsion Strength)
**Code:** [`raceBehavior.js:278–284`](../client/src/modules/raceBehavior.js#L278)

---

### Force 9 — Hard Clamp (absolute boundary)

**Code name:** `maxLateral`, `cap`
**Effect:** Hard clamp — `physicalY` is clamped to `[−cap, +cap]` after soft repulsion. Absolute last safeguard against boundary escape.
**When active:** RACING phase, every frame, last step in `applyRacerBehavior()`.
**Magnitude:** `cap = min(maxLateral, 1.0)`; default `maxLateral = 0.95`.
**DevScreen:** Race Tuning → Soft Avoidance → Max Lateral
**Code:** [`raceBehavior.js:286–287`](../client/src/modules/raceBehavior.js#L286)

---

### Force 10 — Run-out Decay (post-finish coasting)

**Code name:** `runoutDecay`, `r.finished`
**Effect:** Finished racers continue a short distance further, but with exponentially decaying speed. No abrupt stopping.
**When active:** Per racer, when `r.finished === true`; not for active racers.
**Magnitude:** `runoutDecay *= 0.97` per frame; `r.t += r.baseSpeed × runoutDecay × (dt/16)`. Stops practically after ~100 frames (0.97^100 ≈ 0.048).
**DevScreen:** `runoutZone` (Start Layout) determines `finishT = 1.0 − runoutZone` on open tracks — so it affects where the finish line is, not the decay rate itself. The decay rate `0.97` is hardcoded.
**Code:** [`index.jsx:885–888`](../client/src/screens/RaceScreen/index.jsx#L885)

---

## Overview: Force activation order per frame (RACING phase)

```
1. applyRacerBehavior(racers, config) is called:
   a. Avoidance pair scan → fill yAvoidDeltas, speedBrakeSet
   b. Free-lane check → fill yFreeLaneDeltas, overlapSet
   c. Home Force → fill yDeltas
   d. Anti-stacking → normalize yAvoidDeltas / sqrt(neighborCount)
   e. Apply delta-Y → newY = physicalY + Σ(yDeltas)
   f. Soft Repulsion → correct newY
   g. Hard Clamp → physicalY = clamp(newY, −cap, +cap)
   h. Set r.avoidanceActive = speedBrakeSet.has(r.index)
   i. Scan drafting cone → set r.draftingBoostActive

2. computePositions() → compute world coordinates (r.x, r.y, r.angle)

3. Per-racer loop (speed):
   a. Check re-roll → re-draw spreadFactor if due + easeInOutCubic transition
   b. boost = draftingBoostActive ? draftingBoost : 1.0
   c. brake = avoidanceActive ? speedBrakeFactor : 1.0
   d. r.t += r.baseSpeed × boost × brake × (dt / 16)     ← core movement
```

---

## Configurability — summary

| Force | DevScreen block | Configurable parameters |
|---|---|---|
| Re-Roll | Speed Re-Roll | Variation Width %, Transition s, Freq-Divisor, Last Roll % |
| Back-row Bonus | Row Start | Speed Bonus Factor |
| Drafting | Drafting / Slipstream | Max Distance, Cone Angle, Boost Factor |
| Speed Brake | Speed Brake | Y Threshold, T Threshold, Brake Factor |
| Avoidance | Soft Avoidance | Distance, T Weight, Y Weight, Lateral Force, Max Lateral |
| Free-Lane | (no dedicated block) | via Lateral Force + Max Lateral + homeForceReductionOnOverlap |
| Home Force | Home Force | Strength, Reduction On Overlap |
| Soft Repulsion | Comfort Zone | Threshold, Strength |
| Hard Clamp | Soft Avoidance | Max Lateral |
| Run-out Decay | (hardcoded: 0.97/frame) | `runoutZone` determines only finish position |
| Countdown duration | (hardcoded: 4000 ms) | — |
| Start positions | Start Layout + Row Start | startSpreadRange, rowGapMultiplier, maxCapacityFactor |
| Speed baseline | Speed Range | Min Speed, Max Speed |
