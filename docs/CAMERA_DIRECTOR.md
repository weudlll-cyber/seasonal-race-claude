# CameraDirector — Technical Reference

**File:** `client/src/modules/camera/CameraDirector.js`
**Last updated:** 2026-05-28 (reflects commit `87e8f1c` forward; covers v14/v15 config schema)

---

## 1. Overview

`CameraDirector` is a TV-style camera state machine for RaceArena. It runs once per
animation frame inside the `RACING` game phase and returns `{ zoom, offsetX, offsetY }`
that is applied as a canvas `ctx.transform` by `RaceScreen`.

Key design goals:

- **Closed and open tracks** share one class; `isOpenTrack` flag controls the zoom and pan formulas.
- **Lerp-smoothed zoom and pan** — no hard cuts except LEAD_CHANGE (intentional snap).
- **T-space pan path** — during the entry phase the camera travels along the track curve
  (via `_camT` + `shape.getPosition`) instead of taking the euclidean shortcut through
  the infield.
- **Weighted-random director** — after mandatory priority rules, eligible state candidates
  are picked by weighted random draw so broadcasts feel varied, not mechanical.
- **Config live-apply** — `updateConfig(config)` recomputes all zoom and timing parameters
  without a race restart.

### Exports

| Name | Kind | Description |
|---|---|---|
| `CAM_STATE` | const object | All 5 state names as string constants |
| `OPEN_TRACK_BASE_ZOOM` | number | `1.5` — base zoom multiplier for open-track rendering |
| `FALLBACK_REFERENCE_SPRITE_SIZE` | number | `36` — fallback sprite size when `referenceSpriteSize` is 0 |
| `tcToLerpFactor(tc)` | function | Converts a time-constant (s) to a per-60fps-frame lerp factor |
| `CameraDirector` | class | Main camera state machine |

---

## 2. State Machine

### 2.1 States

| State | `CAM_STATE` key | Description |
|---|---|---|
| Overview | `OVERVIEW` | Full-field view, adaptive zoom, follows leader + field centroid |
| Leader Zoom | `LEADER_ZOOM` | Tight zoom on current race leader (and immediate followers) |
| Battle Zoom | `BATTLE_ZOOM` | Locked on a detected pulk group (≥3 racers in proximity) |
| Comeback Zoom | `COMEBACK_ZOOM` | Follows a B1-racer who has gained ≥N positions within a time window |
| Lead Change | `LEAD_CHANGE` | Hard-cut to new leader on position swap; zoomed in tight |

Plus two transient **finish-sequence** sub-phases (not discrete states, tracked via flags):

| Phase | Flag | What happens |
|---|---|---|
| `FINISH` drama | `_inFinishDrama = true` | `finishDramaDurationMs` of LEADER_ZOOM on the winner (first-finish detected) |
| `FINISH_OVERVIEW` | `_inFinishMode = true` | Gradual zoom-out; camera pans to `lookbackT` near the finish line |

### 2.2 Transition priority chain (`_pickNextState`)

Priority is evaluated in strict order every time `_transition()` is called:

1. **Finish override** — if any racer has finished:
   - First detection → fire FINISH drama (LEADER_ZOOM for `finishDramaDurationMs`).
   - Drama expired → enter FINISH_OVERVIEW (OVERVIEW); lock `_inFinishMode`, no further transitions.
   - Drama still active → suppress transition (return null).
2. **Start phase** (`raceElapsed < 3000 ms`) → force OVERVIEW.
3. **Post-start hold** (`raceElapsed < 3000 + postStartHoldMs`) → force LEADER_ZOOM.
   Prevents BATTLE triggering on natural clustering at race start.
4. **Endgame** (`leaderProgress > endgameThreshold`, default 0.85) → force LEADER_ZOOM.
   Exception: a LEAD_CHANGE that cleared its cooldown passes through the endgame gate.
5. **Weighted-random candidate pool** — if none of the above applies, build a list of
   eligible candidates and pick one by weighted draw:
   - BATTLE_ZOOM (weight `battleWeight`, default 0.8) — when `_isPulk()` and `battleCooldownMs` cleared.
   - LEAD_CHANGE (weight `leadChangeWeight`, default 0.7) — when `_leadChangePending` and `leadChangeCooldownMs` cleared.
   - COMEBACK_ZOOM (weight `comebackWeight`, default 0.6) — when outcome phase active and `comebackCooldownMs` cleared and a qualifying comeback racer found.
   - OVERVIEW (weight `overviewWeight`, default 0.3) — when `_isOverviewEligible()` (scheduler + cooldown).
   - Default fallback when pool is empty: LEADER_ZOOM.

### 2.3 State lifecycle in `update()`

Each `update()` call (once per frame) follows this sequence:

1. Update rank history and leader-tracking bookkeeping.
2. Compute `stateAge`, `minHold`, `stateCap`.
3. **Early exits** (BATTLE-specific, checked before the general hold gate):
   - If `stateAge ≥ battleMinDurationMs` and original group is no longer cohesive → `_exitBattle()`.
   - If `stateAge ≥ battleMinDurationMs` and a group member has drifted to P1/P2 → `_exitBattle()`.
4. **Interrupt** — LEADER_ZOOM with `_leadChangePending` fires `_transition()` immediately.
5. **General hold gate** — `_transition()` when `stateAge ≥ max(minHold, stateCap)`,
   or when the finish-drama pulse expires, or on first-finish detection.
6. Apply dt-scaled lerp factor.
7. **T-space entry lerp** — if `_lerpPhase === 'entry'` and `_camT !== null`:
   advance `_camT` toward `_transitionTargetT` along the track. Also updates
   `_prevFocusT` and `_entrySpeedEstimate` for the lead-ahead calculation.
8. **Zoom-before-setTargets** — when T-space lerp active, apply zoom lerp first so
   pan is computed at the post-lerp zoom (avoids per-frame mismatch).
9. `_setTargets()` — compute `targetZoom`, `targetOffsetX`, `targetOffsetY`.
10. LEAD_CHANGE snap — if `_leadChangeSnapPending`, instantly assign `offsetX/Y = targetOffsetX/Y`.
11. Apply zoom and pan lerps (pixel space) when T-space lerp is NOT active.
12. **Entry convergence gate** — check whether zoom + T-space deltas are below thresholds;
    promote `_lerpPhase` from `'entry'` to `'tracking'`; start phased observer.
13. `_computePhasedPanTarget()` — phased observer (lead-in / follow / lead-out) advances
    `_camT` so next frame's `_setTargets` tracks the correct world position.
14. Return `{ zoom, offsetX, offsetY }`.

---

## 3. Config Schema (v14 / v15)

Config is passed to the constructor and to `updateConfig()`. All fields are optional;
hardcoded fallbacks apply when omitted.

### 3.1 Top-level fields

| Field | Type | Default | Description |
|---|---|---|---|
| `battlePulkThresholdPx` | number | 200 | World-pixel radius for pulk spatial condition |
| `battlePulkThresholdT` | number | 0.12 | Max T-space gap between pulk members |
| `battleMinDurationMs` | number | 3000 | Minimum ms BATTLE_ZOOM holds after entry |
| `battleIsolationThresholdPx` | number | 0 | Non-group racers must be this far from the group (0 = disabled) |
| `battleMaxGroupSize` | number | 6 | Max racers in a detected pulk (clamped 3–6) |
| `battleMaxGroupRankSpan` | number | 5 | Max rank-span allowed in the pulk group |
| `battleMinTopN` | number | 10 | Frontmost pulk racer must be within top-N |
| `battleCooldownMs` | number | 8000 | Lockout after leaving BATTLE_ZOOM |
| `endgameThreshold` | number | 0.85 | Leader progress fraction that triggers endgame gate |
| `postStartHoldMs` | number | 7000 | ms of forced LEADER after start phase |
| `transitionTConvergence` | number | 0.03 | T-space delta threshold for entry→tracking promotion |
| `entryConvergenceZoom` | number | 0.05 | Zoom delta threshold for entry→tracking promotion |
| `entryConvergencePx` | number | 10 | Pixel delta threshold for entry→tracking promotion |
| `overviewCooldownMs` | number | 15000 | ms after leaving OVERVIEW before it can recur |
| `overviewClosedTrackZoom` | number | 1.3 | Extra zoom-in factor on top of OVERVIEW zoom (closed tracks only) |
| `showCameraDiagnostics` | boolean | false | Emit `console.warn` on every state transition |
| `enableFrameLog` | boolean | false | Record per-frame diagnostics ring buffer |
| `comebackMinPositionsGained` | number | 2 | Positions gained required to qualify as comeback |
| `comebackWindowSec` | number | 4 | Time window (s) over which position gain is measured |
| `comebackMinDuration` | number | 3 | Minimum s COMEBACK_ZOOM holds (also sets minStateHold) |
| `outcomePhaseThreshold` | number | 0.75 | Leader progress fraction for internal outcome-phase flag |
| `comebackMinStartGap` | number | 0.4 | Min starting rank gap fraction for comeback eligibility |
| `comebackMaxCurrentRankPct` | number | 0.1 | Max current rank fraction to trigger comeback |
| `comebackCooldownMs` | number | 10000 | Lockout after leaving COMEBACK_ZOOM |
| `leadChangeMinGap` | number | 0.002 | Min T-delta for a confirmed lead change |
| `leadChangeDebounceMs` | number | 800 | Debounce window for candidate lead-change detection |
| `leadChangeMinDuration` | number | 1.5 | Minimum s LEAD_CHANGE holds (also sets minStateHold) |
| `leadChangeCooldownMs` | number | 5000 | Lockout after leaving LEAD_CHANGE |
| `finishDramaDurationMs` | number | 1500 | ms of LEADER_ZOOM drama pulse on first finish |
| `finishOverviewZoomOutDurationMs` | number | 3000 | Duration (ms) of the smooth zoom-out into FINISH_OVERVIEW |
| `finishPauseMs` | number | 2500 | ms pause after all racers finish before leaderboard shows |
| `finishOverviewLookbackPx` | number | 300 | World-pixel offset before finish line for FINISH_OVERVIEW anchor |
| `battleWeight` | number | 0.8 | Weighted-random draw weight for BATTLE_ZOOM |
| `leadChangeWeight` | number | 0.7 | Weighted-random draw weight for LEAD_CHANGE |
| `comebackWeight` | number | 0.6 | Weighted-random draw weight for COMEBACK_ZOOM |
| `overviewWeight` | number | 0.3 | Weighted-random draw weight for OVERVIEW |
| `overviewTargetCount` | number | 2 | Target number of OVERVIEW visits per race |
| `overviewStartDelay` | number | — | ms after race start before first OVERVIEW is eligible |
| `targetInnerFramePct` | number | 0.7 | Fraction of canvas the focus subject must stay within |
| `countdownStartZoomSpritePx` | number | — | Sprite size (px) at countdown start for zoom animation |

### 3.2 `cameraStateProfiles` (v14+)

Per-state profile object. Each key is a state name (`OVERVIEW`, `LEADER_ZOOM`,
`BATTLE_ZOOM`, `COMEBACK_ZOOM`, `LEAD_CHANGE`).

| Field | Type | Description |
|---|---|---|
| `spriteScale` | number | Relative scale factor for zoom (1.0 = natural size). Replaces legacy `spritePctOfCanvas`. |
| `trackingTC` | number | Lerp time-constant (s) for the **tracking** phase. 90% convergence ≈ 3.45 × TC. |
| `entryTC` | number | Lerp time-constant (s) for the **entry** phase. Falls back to `trackingTC` when omitted. |
| `minStateHold` | number | Minimum ms this state holds before transitioning. |
| `maxStateDuration` | number | Hard cap (ms) after which `_transition()` fires unconditionally. |
| `leadInDuration` | number | Seconds to hold the lead-ahead anchor before switching to follow. |
| `leadOutDuration` | number | Seconds before state end to start lead-out deceleration. |
| `leadAheadEnabled` | boolean | Whether lead-ahead offset is computed for this state. Default true. |
| `leadOutEnabled` | boolean | Whether lead-out phase is active for this state. Default true. |
| `maxEntryDurationMs` | number | Timeout (ms) for entry→tracking promotion regardless of convergence. |
| `overviewOffsetPx` | number | (OVERVIEW only) World-pixel radial shift toward the field. Default 150. |

### 3.3 Legacy path (`spritePctOfCanvas`)

Old configs without `cameraStateProfiles` may supply `spritePctOfCanvas.{leader,battle,comeback}`.
Converted to `spriteScale` equivalents via:

```
spriteScale = pct × 720 / 36
```

### 3.4 Zoom defaults (v14)

When no config is provided, `DEFAULT_SPRITE_SCALE` applies:

| State | spriteScale |
|---|---|
| LEADER_ZOOM | 1.81 |
| BATTLE_ZOOM | 2.81 |
| COMEBACK_ZOOM | 1.39 |
| LEAD_CHANGE | 1.81 (same as LEADER) |

---

## 4. Pan and Zoom Architecture

### 4.1 Zoom levels

**Closed tracks** — `effectiveZoom = cam.zoom × bsX` where `bsX = 1280 / worldW`.
OVERVIEW uses `cam.zoom = 1` (bsX alone fills the canvas). Zoom states use
`cam.zoom = spriteScale / bsX`.

**Open tracks** — `effectiveZoom = cam.zoom × OPEN_TRACK_BASE_ZOOM (1.5)`.
OVERVIEW uses `cam.zoom = overviewZoom = 1280 / worldW`. Zoom states use
`cam.zoom = spriteScale / OPEN_TRACK_BASE_ZOOM`.

Both paths clamp to `[minZoom, MAX_INVERSE_ZOOM (5.0)]`.

`effectiveZoom()` in `openTrackCamera.js` is still imported by the render path for the
canvas transform. CameraDirector's internal zoom (`this.zoom`) is the cam-space value;
the render path multiplies by `bsX` (closed) or `OPEN_TRACK_BASE_ZOOM` (open).

### 4.2 T-space entry lerp

During `_lerpPhase === 'entry'` with a shape available, `_camT` (normalized track
position in [0,1)) is lerped toward `_transitionTargetT` each frame. The pan target
is then derived from `shape.getPosition(_camT, 0)` rather than racer pixel coordinates.
This makes the camera travel along the track curve instead of cutting through the infield.

`_transitionTargetT` is updated every frame during entry:
```
targetT = focusT + entrySpeedEstimate × 60 × leadInDuration
```

The entry phase promotes to `'tracking'` when **all three** convergence criteria are met,
or when `maxEntryDurationMs` is exceeded:
- `|targetZoom − zoom| < entryConvergenceZoom`
- `|_camT − _transitionTargetT| < transitionTConvergence` (or T-lerp not active)
- `|targetOffsetX − offsetX| < entryConvergencePx` (skipped when T-lerp active)

**Zoom-before-setTargets ordering** — when T-space lerp is active, zoom is lerped *before*
`_setTargets()` so pan is computed at the post-lerp zoom. This prevents a per-frame
mismatch (proportional to `camX × Δzoom`) that causes visible jumps on variable dt.

### 4.3 Phased observer (tracking phase)

After entry converges, `_computePhasedPanTarget()` runs each frame:

| Sub-phase | `_observerPhase` | Behavior |
|---|---|---|
| `'lead-in'` | Holds `_camT` at the lead-ahead anchor; transitions to `'follow'` after `leadInDuration` seconds |
| `'follow'` | Sets `_camT = focusT` each frame so `_setTargets` tracks the racer's world position |
| `'lead-out'` | EMA deceleration of `_camT` toward `leadOutStartCamT + leadOutDistanceT`; triggered when remaining state time ≤ `leadOutDuration` |
| `'idle'` | No T-space tracking; pixel-space lerp handles pan |

`_computePhasedPanTarget` does **not** write `targetOffsetX/Y` — those are owned
exclusively by `_setTargets`. It only advances `_camT` so the next frame's `_setTargets`
reads the correct track position.

**`_prevFocusT` write ownership** — first write is in the T-space entry lerp block
(entry phase); second write is in `_computePhasedPanTarget` exits (tracking phase).
The phases are mutually exclusive so there is never a double-write conflict within a
single frame.

### 4.4 OVERVIEW pan

After start phase: follows the leader with a radial offset (`overviewOffsetPx` world
pixels) shifted from the leader toward the track center.
During start phase: centroid of the full field.
In FINISH_OVERVIEW: fixed point `finishOverviewLookbackPx` before the finish line
(stationary anchor — prevents camera drift with the winner's runout movement).

### 4.5 LEAD_CHANGE hard cut

LEAD_CHANGE skips the entry lerp entirely: `_lerpPhase` is forced to `'tracking'`, zoom
snaps to `_leadChangeZoom`, `_camT` snaps to the new leader's T, and
`_leadChangeSnapPending = true` causes `offsetX/Y` to be assigned (not lerped) on the
first update frame.

### 4.6 `resolveCamera` — viewport clamping

`_setClosedTrackTargets` and `_setOpenTrackTargets` call `resolveCamera()` twice per frame:
1. At `stateEffZoom` → final `targetZoom` (may be reduced by world-edge clamping).
2. At current (lerping) `cam.zoom` → pan target for this frame, keeping the subject
   within `targetInnerFramePct` of the canvas as zoom lerps.

---

## 5. Battle Detection

Battle is triggered by `_isPulk(racers)` → `_detectPulkGroup(racers)`.

A group qualifies when it satisfies **all four** conditions simultaneously:

1. **Spatial** — all pairwise euclidean distances `< battlePulkThresholdPx` (world pixels).
2. **Temporal** — all pairwise `|t_i − t_j| < battlePulkThresholdT`.
3. **Positional** — frontmost group racer is at rank ≥ 3 (P1/P2 are LEADER territory);
   seed triple's rank span ≤ 3; frontmost rank ≤ `battleMinTopN`.
4. **Expansion** — greedy: add adjacent-rank racers up to `battleMaxGroupSize`;
   reject any candidate that pushes rank span beyond `battleMaxGroupRankSpan`.

Optional: if `battleIsolationThresholdPx > 0`, no non-group racer may be within that
distance of any group member.

### Camera lock at entry

`_transition()` calls `_detectPulkGroup()` once at BATTLE_ZOOM entry and stores:
- `_battleLockedRacerIndex` — stable `r.index` of the frontmost group member.
- `_battleGroupRacerIndices` — stable indices of all group members.
- `_battleLockT` — centroid T of the group at entry; drives T-space lerp initial target.

During BATTLE the camera follows the **live centroid** of the locked group
(`_findGroupRacers` resolves current positions by index, surviving `renderInterpolation`
spread-copies).

### BATTLE_ZOOM early exits

After `battleMinDurationMs` elapses, `update()` checks two conditions before the
general hold gate:

1. **Group dispersal** — any pair in the locked group exceeds `battlePulkThresholdPx`.
2. **P2 drift** — any group member is now in P1 or P2.

Either calls `_exitBattle()` which records `_lastBattleExitTs` and calls `_transition()`.
`battleCooldownMs` prevents immediate re-entry.

---

## 6. Execution Order

```
RaceScreen (useEffect, [raceData, fadeNavigate])
│
│  let cancelled = false
│
├── new CameraDirector(worldW, worldH, isOpenTrack, config, spriteSize, shape)
│
└── requestAnimationFrame loop (single rAF per frame)
    │
    │  if (cancelled) return          ← StrictMode guard
    │
    ├── [COUNTDOWN phase]
    │     camDir.updateCountdown(racers, ts, elapsed, duration, cW, cH)
    │
    └── [RACING phase]
          camDir.updateRacePlan({ b1Indices })     ← when race plan changes
          result = camDir.update(renderRacers, ts, raceState, CANVAS_W, CANVAS_H, smoothDt)
          ctx.setTransform(result.zoom * bsX, 0, 0, result.zoom * bsY, result.offsetX, result.offsetY)

cleanup:
    cancelled = true
    cancelAnimationFrame(rafRef.current)
```

**Single call site** — `camDir.update()` is called exactly once per frame at
[`RaceScreen/index.jsx:1161`](client/src/screens/RaceScreen/index.jsx#L1161).

**React StrictMode** — `<React.StrictMode>` is active in dev (`client/src/main.jsx:16`).
StrictMode double-invokes `useEffect` in dev. The `cancelled` flag (set before
`cancelAnimationFrame` in the cleanup) ensures the discarded first loop exits immediately
on its first tick and never calls `update()`.

**`updateRacePlan({ b1Indices })`** — injects the B1 racer index set used for COMEBACK
detection. Called whenever the race plan changes; safe to call every frame.

**`updateConfig(config)`** — live-applies a new camera config (recomputes zoom + timing
without re-constructing). Effective on the next `_transition()` call.

---

## 7. Known Issues

- **`openTrackPanTarget()` in `openTrackCamera.js`** is dead code. `effectiveZoom()` from
  the same file is still used by the render path; `openTrackPanTarget` is an orphan and
  should be removed in a cleanup pass.

- **No BATTLE_ZOOM integration test under `renderInterpolation`** — `_findByIndex`
  index-based lookup was introduced to fix object-identity failures under spread-copy
  interpolation, but existing unit tests use direct state assignment without going through
  `_transition()`. A live integration test would provide stronger coverage.

- **OVERVIEW scheduler not unit-tested** — `_isOverviewEligible` and `_scheduleNextOverview`
  are covered only through the fairness sim, not vitest.

---

## 8. Open Items

- Config UI to expose per-state `leadInDuration` / `leadOutDuration` (phased observer timing).
- Expose `battleIsolationThresholdPx` in the camera config UI (currently defaults to 0).
- BATTLE detection does not account for lapping on closed tracks (extreme edge case with
  large field-size gaps).
- `_diagRingBuf` frame-log export (`exportDiagLog()` in the diagnostics mixin) has no UI
  entry point in the Dev Screen — wiring pending.
