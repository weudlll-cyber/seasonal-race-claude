# Step-1 Pre-Implementation Operationalization

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-05
**Status:** Proposals only — no behavior change, no defaults change
**Purpose:** Resolve all open operationalizations in the design spec (report 05) from real
source before writing behavior code. Every item below cites file:line. Anything that
cannot be confirmed from source is explicitly flagged.

---

## 1. Defaults File Path

### Which file supplies `lateralForce` / `speedBrakeFactor` to the running game

**Single source of truth:**

```
client/src/modules/storage/defaults.js:438–505
  export const DEFAULT_RACE_BEHAVIOR_CONFIG = { ... }
```

Specifically:
- `lateralForce` → `client/src/modules/storage/defaults.js:494`
- `speedBrakeFactor` → `client/src/modules/storage/defaults.js:502`

This is the file the probe already edited. The comment at line 494 confirms it:
```js
lateralForce: 0.0228, // probe value (+100% vs 0.0114 baseline) — feat/open-track-overlap
```

**How it reaches the runtime:**
- `client/src/modules/raceBehaviorConfig.js:11` imports `DEFAULT_RACE_BEHAVIOR_CONFIG` from `./storage/defaults.js`
- `client/src/modules/raceBehaviorConfig.js:46` `loadRaceBehaviorConfig()` reads from localStorage via `storageGet(KEYS.RACE_BEHAVIOR_CONFIG)` and merges with `DEFAULT_RACE_BEHAVIOR_CONFIG`. When no localStorage value exists, the defaults file governs directly.
- `client/src/screens/RaceScreen/index.jsx:52` imports `loadRaceBehaviorConfig`, which is called once at race start and supplies `behaviorConfig` to the entire physics loop.

**The other defaults file and why it is NOT the target:**
- `client/src/modules/surface-effects/defaults.js` — defines nine visual surface classes (asphalt, earth, water, etc.) for trail rendering. Contains no physics parameters at all. It is structurally unrelated to race physics.

**Reset target for Step 1:**
`client/src/modules/storage/defaults.js:494` must be changed from `0.0228` back to `0.011400` (the Phase-5 validated baseline) as part of the Step-1 build. The `speedBrakeFactor` at line 502 (`0.945`) remains as-is for now (the new per-pair leader-speed cap replaces its role as a hard cutoff, but the constant stays as a fallback floor).

---

## 2. Leader Effective Speed — Exact Formula

### Per-frame forward speed applied to each racer

From `client/src/screens/RaceScreen/index.jsx:916–924`:

```
r.t += r.baseSpeed × boost × brake × r.trajectoryMult × r.areaBonusMult × r.rubberBandMult
```

(capped at `st.finishT + 0.001`)

**Each factor, its source, and its file:line:**

| Factor | Description | File:Line | Range / Notes |
|---|---|---|---|
| `r.baseSpeed` | Per-racer speed base, updated each re-roll | `index.jsx:902` | = `race_baseSpeed × speedMultiplier × r.spreadFactor × r.speedBonusMult` |
| `race_baseSpeed` | Track-speed scalar (finishT / targetDuration) | `index.jsx:470–473` | Constant for the race; same for all racers |
| `speedMultiplier` | Racer-type speed factor (e.g. rocket=1.25) | `index.jsx:389` | `racerType.getSpeedMultiplier()` — constant |
| `r.spreadFactor` | Stochastic luck draw, re-rolled during race | `index.jsx:875–901` | Clamped to `[BASE_SPEED_MIN / BASE_SPEED_MEAN, BASE_SPEED_MAX / BASE_SPEED_MEAN]` |
| `r.speedBonusMult` | Row-position back-row compensation | `index.jsx:567,578` | `1 + speedBonus`, constant for the whole race |
| `boost` | Drafting slipstream bonus | `index.jsx:907–908` | `draftingBoost` (1.04) if `r.draftingBoostActive`, else 1.0 |
| `brake` | Current avoidance brake factor | `index.jsx:908–913` | `computeEffectiveBrakeFactor(...)` if `r.avoidanceActive`, else 1.0; see below |
| `r.trajectoryMult` | Race-plan P-controller multiplier | `racePlanner.js:272–286`, `index.jsx:820–831` | 1.0 when race-plan inactive; easeInOutCubic transition |
| `r.areaBonusMult` | Race-plan row-area bonus | `racePlanner.js:275,284`, `index.jsx:604` | Fades from bonus value to 1.0 at OUTCOME phase |
| `r.rubberBandMult` | Rubber-band catch-up boost | `index.jsx:861–866` | Ramps from 1.0 to `1 + flatBoost` (1.10) for non-leaders when gap exceeds threshold |

### `r.baseSpeed` in full

```
r.baseSpeed = race_baseSpeed × speedMultiplier × r.spreadFactor × r.speedBonusMult
```

`race_baseSpeed` is computed at `index.jsx:470–473`:
```
race_baseSpeed = computeRaceBaseSpeed(
  finishT,
  targetDuration × expectedMinSpreadFactor × speedMultiplier × closedSsf
)
```

`BASE_SPEED_MEAN = (BASE_SPEED_MIN + BASE_SPEED_MAX) / 2 = (0.00096 + 0.00113) / 2 = 0.001045`
(`client/src/modules/storage/defaults.js:184–187`)

### `computeEffectiveBrakeFactor`

From `client/src/modules/raceBehaviorConfig.js:37–41`:

```
if (!isOpen || !(avoidanceWarmupMs > 0)) return speedBrakeFactor;
const brakeScale = easeInOutCubic(min(1, raceElapsedMs / avoidanceWarmupMs));
return 1.0 - brakeScale × (1.0 - speedBrakeFactor);
```

After warmup completes (raceElapsedMs ≥ avoidanceWarmupMs = 3000ms on open tracks), returns `speedBrakeFactor` = 0.945 exactly.

### Exact formula for the new per-pair leader-speed cap

The new brake factor for a trailer–leader pair replaces `effectiveBrakeFactor` with:

```
leaderForwardSpeed = leader.baseSpeed × boostL × leader.trajectoryMult × leader.areaBonusMult × leader.rubberBandMult

trailerDenominator = trailer.baseSpeed × boostT × trailer.trajectoryMult × trailer.areaBonusMult × trailer.rubberBandMult

requiredBrakeFactor = leaderForwardSpeed / trailerDenominator
```

Notes:
- `boostL` = leader's `draftingBoost` if `leader.draftingBoostActive`, else 1.0
- `boostT` = trailer's `draftingBoost` if `trailer.draftingBoostActive`, else 1.0
- The leader never has `avoidanceActive` (only trailers are braked), so `brakeL = 1.0` by existing design
- The final applied brake = `min(effectiveBrakeFactor, requiredBrakeFactor × (1 - safetyMargin))` so the constant brake still floors the cap when the computed leader speed would allow MORE than the fixed brake

All factors are on the racer object at the time of the brake computation in `index.jsx:908–913`. No new racer-object reads are needed — the values are already available in the per-racer state for the pair.

---

## 3. Hold / Release State Model

### Where the brake-hold state lives

Following the pattern of the existing per-racer priority-mode state (`currentMode`, `lastOverlapEndTime`, `currentModeFrameCount` — initialized in `raceBehavior.js:36–46`, mutated in the priority-mode block at `raceBehavior.js:389–423`):

**Proposed new per-racer fields (added in `initRacerBehavior`):**

| Field | Type | Description |
|---|---|---|
| `brakeMatchLeaderIndex` | `number` | Index of the leader being speed-matched, or `-1` if no match active |
| `brakeMatchFactor` | `number` | Computed cap (0–1) for this frame; used by the t-update in `index.jsx:913` |
| `brakeMatchFrames` | `number` | Consecutive frames in brake-match-hold state (for anti-trap timeout) |
| `brakeReleaseFrames` | `number` | Consecutive frames the committed side has been clear (for debounced release) |

These follow the established single-value per-racer state pattern. They do not require new data structures.

### Multi-leader switch

When multiple leaders are in the approach zone simultaneously, `brakeMatchLeaderIndex` is set to the index of the leader producing the **lowest** `requiredBrakeFactor` (i.e., the slowest effective speed — the most conservative cap). This is the same "most-constraining-leader" rule from the design doc.

If the currently locked leader's index is no longer in `active` (finished or removed), `brakeMatchLeaderIndex` is reset to `-1` immediately that frame — validated on every frame before the cap is applied.

### When state is cleared

| Event | Clearing action | Source note |
|---|---|---|
| Leader finishes (`r.finished = true`) | `brakeMatchLeaderIndex` reset to -1 at next frame validation | `index.jsx:974–976` sets `r.finished` |
| Race ends / reinit | `initRacerBehavior` resets all fields | `raceBehavior.js:36–46` called at race start |
| Trailer finishes | Trailer exits `active` filter (`!r.finished`); state no longer processed | `raceBehavior.js:218` |
| Lateral gap opens (debounced) | `brakeMatchLeaderIndex` reset to -1 after `brakeReleaseFrames >= debounceFrames` | New release path |
| Leader speed rises to meet trailer | `requiredBrakeFactor >= 1.0 - minimumDifferential`; state resets naturally | |

### Sticky-state risk

**Risk:** If `brakeMatchLeaderIndex` is not validated each frame, a stale index pointing to a finished racer could erroneously apply its last-known `brakeMatchFactor`. **Mitigation:** The state must verify `brakeMatchLeaderIndex !== -1` and that the indexed racer is still in `active` every frame before applying the cap. This is a single `.find()` or Map lookup, consistent with how `_computeBlockedMode` scans `active` at `raceBehavior.js:151`.

---

## 4. Anti-Trap Concrete Constants

**Scale context:**
- 60 fps, 60s race = 3600 frames total
- From Report 03: average overlap resolution at LF=0.0228 is 25.3 frames
- A genuine "blocked both sides" state lasts until a neighbor moves, typically < 30 frames at normal racing density

**Proposed values:**

| Constant | Value | Derivation |
|---|---|---|
| `brakeHoldTimeoutFrames` | 90 | 1.5s at 60fps — 3× the average overlap-resolution time; long enough to be sure the block is structural, short enough to avoid starvation visible to the viewer |
| `brakeHoldEscapeReleaseDurationFrames` | 15 | 0.25s — one "breath" of normal speed; enough for the racer to shift slightly and trigger a side-clear check, not enough to shoot through |
| `brakeHoldEscapeCooldownFrames` | 60 | 1.0s — prevents oscillating escape/re-lock within a single cluster |
| Gap-open debounce (`brakeReleaseDebounceFrames`) | 3 | 50ms — enough to reject a single-frame gap (one neighbor crossing), short enough not to delay a genuine release |

**Config source:** These four constants should be added to `DEFAULT_RACE_BEHAVIOR_CONFIG` in `client/src/modules/storage/defaults.js` (the same PHYSICS PARAMETERS block, with a note that they govern the anti-trap behavior). Rationale: they may need tuning after a fairness sweep, and the project principle requires all behavior to be UI-configurable.

---

## 5. Jitter Guard Concrete Values

**Near-speed threshold (no brake applied below this):**

```
minimumDifferential = 0.005   (0.5%)
```

Derivation: `BASE_SPEED_MAX / BASE_SPEED_MIN = 0.00113 / 0.00096 = 1.177`. Two racers at the same re-roll step would differ by zero. Two at adjacent re-rolls within a 5s transition would differ by less than 0.5% during overlap. The spread range center-to-edge is ±8.3% (`storage/defaults.js:184–187`), so 0.5% is well inside the noise band. Brake-to-match activates only when the trailer's computed effective speed exceeds the leader's by more than 0.5%.

**Safety margin (cap set slightly below leader speed):**

```
safetyMargin = 0.001   (0.1%)
```

Applied as: `appliedBrakeFactor = requiredBrakeFactor × (1 - safetyMargin)`. This prevents the computed cap from sitting exactly at the threshold where rounding causes frame-to-frame oscillation.

**Config source:** Both values added to `DEFAULT_RACE_BEHAVIOR_CONFIG` in `client/src/modules/storage/defaults.js` as `speedMatchMinDifferential: 0.005` and `speedMatchSafetyMargin: 0.001`. These live in the same PHYSICS PARAMETERS block as `speedBrakeFactor`. They must be named distinctly so the existing validation in `loadRaceBehaviorConfig` (at `raceBehaviorConfig.js:62–93`) can guard them.

---

## 6. "Gap Ahead Opens" — Measurable Definition

### Geometric basis

The existing side-clear check is `isSideFree` in `raceBehavior.js:107–119`:

```js
function isSideFree(racer, counterpart, active, dir, lateralHalfSpan, tHalfSpan, cap) {
  const targetY = racer.physicalY + dir * lateralHalfSpan;
  if (targetY < -cap || targetY > cap) return false;
  for (const other of active) {
    if (other.index === racer.index || other.index === counterpart.index) continue;
    const dT = shortestArcDeltaT(racer.t, other.t);
    if (dT > tHalfSpan) continue;
    if (Math.abs(other.physicalY - targetY) < lateralHalfSpan) return false;
  }
  return true;
}
```

Where:
- `lateralHalfSpan = spriteWorldSize / trackWidth` (`raceBehavior.js:299`)
- `tHalfSpan = spriteWorldSize / pathLength` (`raceBehavior.js:300`)

**For the brake-hold release (adjacent clearance, Part 1 of Phase 0), the same geometric check applies**, extended to use the leader's **honest body width** rather than just the sprite-box width — specifically `effectiveDisplaySize × bodyFillX / trackWidth` as used in the honest-overlap metric in `sim-fairness.mjs`. For the engine, `lateralHalfSpan` should be replaced with `max(spriteWorldSize / trackWidth, leader.bodyFillX × spriteWorldSize / trackWidth)` if `leader.bodyFillX` is available on the racer object.

**Release condition (precise):**

`isSideFree(trailer, leader, active, committedDir, extendedLateralHalfSpan, tHalfSpan, cap)` returns `true`

AND this condition has been true for `brakeReleaseDebounceFrames` (= 3) consecutive frames (tracked in `brakeReleaseFrames`).

### Lane-band definition

"The target lane band" is a strip of width `2 × lateralHalfSpan` (or `2 × extendedLateralHalfSpan`) centered at `trailer.physicalY + dir × lateralHalfSpan`. Any racer whose `physicalY` is within that band and within `tHalfSpan` of the trailer's `t` causes the side to be considered blocked.

This is the same definition used by the existing `isSideFree` function — no new geometry is introduced.

---

## 7. Pass-Through Telemetry Metric

### Definition of an "unbraked pass-through" event

An event occurs when all of the following hold simultaneously for F = 5 consecutive frames:

1. Trailer has `brakeMatchLeaderIndex` set and `brakeMatchFactor < 1.0` (brake-to-match is engaged)
2. `trailer.t_now - trailer.t_(now-5) > leader.t_now - leader.t_(now-5)` — the trailer's t-advance over 5 frames exceeds the leader's (the trailer is still closing in despite the brake)
3. Both racer pair is within `dynamicBrakeT` longitudinally (still inside the zone where the brake should be active)

### What to log

In `sim-fairness.mjs`, add per-race counter `brakeMatchFailureCount`:
- Incremented once per event (when all three conditions first hold for a given pair — not once per frame of the event)
- Reported in the per-combo `avgNaturalness` block alongside `honestOverlapRate`

### Pass/fail threshold

| Metric | Target | Failure |
|---|---|---|
| `brakeMatchFailureCount` per combo (10 races, 60s) | 0 events | Any event per combo |

This is the strictest possible gate: the brake-to-match has failed if a single pair closes in on each other while the brake is engaged, at any point in any race in the sweep.

If 0 is too tight in practice (e.g. rubber-band edge cases at race end where the leader is decelerating), an alternative pass threshold is: ≤ 1 event per race averaged over 10 races (≤ 10 total per combo). This should be determined from the first post-implementation sim run.

---

## 8. Test File Split

### Existing file: `client/src/modules/raceBehavior.test.js`

Tests the behavioral contract of the existing `applyRacerBehavior` function (what `avoidanceActive`, `physicalY`, `physicalYVelocity`, `draftingBoostActive` are after the function runs). This file tests structure and contracts, not the new computation logic.

**Add to this file:**
- A test that the brake's `avoidanceActive` flag still fires correctly when `brakeMatchFactor` is below the existing `speedBrakeFactor` (regression guard for the flag — the flag must remain set even under the new cap)
- A test that `avoidanceActive` is NOT set for a trailer within the brake zone when the trailer is slower than the leader (the minimumDifferential guard)

### New file: `client/src/modules/raceBehaviorBrakeMatch.test.js`

Narrow, isolated tests for the new behavior. This file should NOT test the full `applyRacerBehavior` pipeline (that's `raceBehavior.test.js`'s job). It tests the pure computation functions added for Step 1:

- **Cap computation:** Given `leaderBaseSpeed`, `leaderTrajectoryMult`, `leaderAreaBonusMult`, `leaderRubberBandMult`, `trailerBaseSpeed`, etc., the computed `requiredBrakeFactor` matches the exact formula from Section 2.
- **Jitter guard:** When `trailerEffectiveSpeed / leaderEffectiveSpeed ≤ 1 + minimumDifferential`, the returned cap is 1.0 (no braking).
- **Safety margin:** The applied cap is `requiredBrakeFactor × (1 - safetyMargin)`, not `requiredBrakeFactor` exactly.
- **State lifecycle:** `brakeMatchLeaderIndex` transitions from -1 → leaderIndex when approach condition is met, resets to -1 when gap opens after `brakeReleaseDebounceFrames` frames.
- **Anti-trap timeout:** After `brakeHoldTimeoutFrames` frames with `brakeMatchLeaderIndex` set and both sides blocked, `brakeReleaseFrames` resets to trigger escape.
- **Adjacent-collision prevention:** The side-clear check returns false when the target band is occupied; the lateral commitment does not fire in that direction.
- **Stale-index guard:** When the locked leader's index is not in `active`, `brakeMatchLeaderIndex` resets to -1.

Pattern for the test file follows `raceBehavior.test.js`: plain functions, no React, no DOM, pure logic.

---

## 9. Exact Commands

### Full test suite

From `client/package.json:38`:
```
"test": "vitest run"
```

Must be run from the `client/` directory (project memory: run vitest from `client/` dir):
```powershell
cd client; vitest run
```

### Validation sim run (standard Phase-1 sweep)

From `client/package.json:43`:
```
"fairness-sim": "node ../scripts/sim-fairness.mjs"
```

Exact command to reproduce the Phase-1 matrix (all 66 combos):
```powershell
cd client; node ../scripts/sim-fairness.mjs --openRacers=60 --closedRacers=40 --dur=60 --races=10 --race-plan=true --seed=1
```

For the N=50 Tier-1 re-run (Gate 3 and Gate 5):
```powershell
cd client; node ../scripts/sim-fairness.mjs --openRacers=60 --closedRacers=40 --dur=60 --races=50 --race-plan=true --seed=1
```

Note: `--dur` (not `--duration`), `--races` (not `--runs`), `--race-plan=true` (not `--race-plan`) — confirmed from project memory (sim-fairness.mjs CLI-Flag reference).

---

## 10. Rollback Tag Verification

### Procedure

Before any code change in the Step-1 build, set the tag and record the hash:

```powershell
git tag backup/pre-overtaking-rebuild HEAD
git log -1 --format="%H %ai %s" backup/pre-overtaking-rebuild
```

The report for the Step-1 build must include:
1. The full 40-character commit hash
2. The commit date/time
3. The commit subject line
4. Confirmation that `git show backup/pre-overtaking-rebuild:client/src/modules/storage/defaults.js | grep lateralForce` returns `0.0228` (the probe value — confirming the tag points at the pre-reset baseline)

### Existing backup tags

Current backup tags exist for earlier phases (from `git tag --list "backup/*"`), including:
- `backup/pre-lateral-force-probe` — the tag before the probe that set `lateralForce: 0.0228`
- `backup/pre-overlap-fix` — the tag before the overlap investigation

The new tag `backup/pre-overtaking-rebuild` is distinct and marks the clean state immediately before Step-1 behavior code lands.

---

## Definition of Done — Step 1

Step 1 is complete when all of the following are simultaneously true, with evidence:

| Gate | Criterion | Evidence |
|---|---|---|
| **Pass-through eliminated** | `brakeMatchFailureCount = 0` on all 27 open combos (10 races, 60s, seed=1) | Sim run output |
| **Honest overlap reduced** | Dragon honest overlap < 2.0% on all 5 open tracks (down from 3.2–4.3%) | Sim run output |
| **Adjacent-collision rate** | 0 events where lateral commit moves a racer into an occupied adjacent space | Sim run output (new counter) |
| **Chi-square fairness** | p ≥ 0.05 on all 66 combos (open + closed); closed-track minimum ≥ Phase-1 minimum of 0.051 | Sim run output |
| **Back-row fair chance** | B1top5 rate per row ≥ Phase-1 baseline on every open combo (N=50 run) | N=50 sim run output |
| **No zigzag increase** | `liteZigzagScore` not increased vs Phase-1 baseline per combo (< +0.05) | Sim run output |
| **Tests green** | `vitest run` exits 0 with 0 failures, including the new `raceBehaviorBrakeMatch.test.js` | Test output |
| **Defaults reset confirmed** | `lateralForce` in `defaults.js` = 0.0114 (Phase-5 validated baseline) | `grep lateralForce client/src/modules/storage/defaults.js` |
| **Rollback tag set** | `backup/pre-overtaking-rebuild` exists and points at pre-change HEAD | `git log -1 backup/pre-overtaking-rebuild` records committed |
| **Browser confirmation** | User visual sign-off: dragon on Space Sprint or Luger Hill shows lateral evasion before body overlap; no visible pass-through | User observation |

---

## Summary of Open Questions (Flagged Items)

The following items could not be confirmed from static source analysis and must be resolved before or during implementation:

1. **`bodyFillX` on the racer object in the engine:** `honestBodyLat = effectiveDisplaySize × bodyFillX` is computed in `sim-fairness.mjs` but it is not clear whether `bodyFillX` is present on the racer object at runtime in `raceBehavior.js`. It may only be available in the sim. The extended `lateralHalfSpan` (for wide bodies) may need to be derived differently in the engine — either by reading `bodyFillX` from the racer type (if accessible), or by reading `visibleWidthPx` (which is the scaled effective display size, already on the racer) and multiplying by the type's fill ratio. **Needs verification before coding the Part 1 extended check.**

2. **`brakeMatchFactor` delivery to `index.jsx`:** The brake cap is computed in `raceBehavior.js` (inside the pair loop), but `effectiveBrakeFactor` is applied in `index.jsx:913`. The per-racer `brakeMatchFactor` field proposed in Section 3 bridges this gap — `raceBehavior.js` writes it, `index.jsx` reads it. This is a new read/write path between the two files that must be explicitly coordinated. The existing `avoidanceActive` flag already crosses this boundary (set in `raceBehavior.js:514`, read in `index.jsx:913`), so the pattern is established.

3. **`brakeMatchFactor` vs `effectiveBrakeFactor`:** The final applied brake must be `min(effectiveBrakeFactor, brakeMatchFactor)` — neither is a strict replacement for the other. The warmup ramp in `computeEffectiveBrakeFactor` (which returns values > 0.945 during the first 3s) interacts with the cap: early in the race the warmup ramp may already be weaker than the computed cap, making the cap redundant. Implementation must preserve the `min()` semantics.
