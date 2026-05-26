# Camera System Inventory — 2026-05-14

> Read-only analysis on branch `master` (commit `5088639`). No code changes.

---

## 1. Camera architecture

### Files involved

| File | Lines | Purpose |
|-------|--------|-------|
| `client/src/modules/camera/CameraDirector.js` | ~1100 | Main state machine (TV camera) |
| `client/src/modules/camera/resolveCamera.js` | 118 | Pan+zoom resolver (pure function) |
| `client/src/modules/camera/openTrackCamera.js` | 22 | Open-track zoom utilities |
| `client/src/modules/camera/panTarget.js` | 75 | Pan target identification |
| `client/src/modules/cameraConfig.js` | 210 | Config storage & migration |
| `client/src/screens/RaceScreen/index.jsx` | ~1400 | Canvas integration & render pipeline |
| `client/src/screens/DevScreen/sections/CameraZoomTuningSection.jsx` | 519 | DevPanel UI for camera tuning |
| `client/src/screens/DevScreen/sections/CameraStateHudSection.jsx` | 89 | DevPanel HUD toggles |
| `client/src/components/CameraStateHUD.jsx` | 98 | Runtime HUD (state display) |
| `client/src/components/CameraDiagnosticsHUD.jsx` | 420 | Runtime diagnostics overlay |

### Core functions & modules

**`CameraDirector` (class, main state machine):**

- `constructor(worldW, worldH, isOpenTrack, config, referenceSpriteSize, shape)` — line 87
- `update(racers, ts, raceState, canvasW, canvasH, dt)` — main frame update, line 389
- `updateConfig(config)` — live config reload, line 155
- `_transition(racers, ts, raceState)` — state machine logic, line 517
- `_setTargets(racers, canvasW, canvasH, raceState)` — compute pan/zoom targets, line 764
- `_computeZoomLevels(config)` — derive zoom from sprite sizes, line 209
- `_computeTimingConfig(config)` — load timing parameters, line 242
- `_isPulk(racers)` — pack detection, line 699
- `_focusRacers(racers)` — top-N by position, line 687
- `_computePhasedPanTarget(...)` — lead-in/follow/lead-out observer, line 864
- `_setClosedTrackTargets(...)` — closed-track pan+zoom, line 738
- `_closedOffsetY(...)` — Y-axis offset for non-square worlds, line 718

**Helper functions (separate modules):**

- `resolveCamera()` — adaptive pan/zoom resolver (`resolveCamera.js:53`)
- `getPanTarget()` — pan target by state (`panTarget.js:29`)
- `effectiveZoom()` — combine director zoom + base zoom (`openTrackCamera.js:19`)
- `tcToLerpFactor()` — time constant → per-frame lerp factor (`CameraDirector.js:60`)

### Public state (for external consumers)

```javascript
this.state          // CAM_STATE enum value
this.zoom           // Current zoom (lerps toward targetZoom)
this.offsetX/Y      // Current pan offset (closed tracks)
this.targetZoom     // Target zoom after transition
this.targetOffsetX/Y
this.overviewZoom   // Adaptive overview zoom (world fit)
```

### Render pipeline integration (`RaceScreen/index.jsx`)

**Closed tracks** (lines 1157–1177):
```javascript
const cam = camDirRef.current.update(st.racers, ts, raceState, CANVAS_W, CANVAS_H, dt);
ctx.save();
ctx.translate(cam.offsetX, cam.offsetY);        // Pan in screen space
ctx.scale(cam.zoom * bsX, cam.zoom * bsY);      // Zoom (bsX/bsY scale world coordinates)
// … draw world …
ctx.restore();
```
Effective zoom: `cam.zoom × bsX` (where `bsX = CANVAS_W / worldWidth`)

**Open tracks** (lines 1136–1156):
```javascript
const effZoom = effectiveZoom(cam.zoom, OPEN_TRACK_BASE_ZOOM);  // 1.5 × cam.zoom
ctx.save();
ctx.translate(-(st.camX || 0) * effZoom, -(st.camY || 0) * effZoom);
ctx.scale(effZoom, effZoom);
ctx.restore();
```
Effective zoom: `OPEN_TRACK_BASE_ZOOM (1.5) × cam.zoom`

---

## 2. Camera phases

### Race progress phases (RaceScreen level)

```javascript
// RaceScreen/index.jsx, line 99
const PHASE = { COUNTDOWN: 0, RACING: 1, FINISHED: 2 };
```

| Phase | Duration | Camera behavior |
|-------|-------|-----------------|
| `COUNTDOWN` | 0–4000 ms fixed | CameraDirector inactive; racers at start position |
| `RACING` | 4000 ms – race end | CameraDirector active (state machine) |
| `FINISHED` | ~2000 ms after crossing finish | CameraDirector inactive; fade to results |

### Camera states (CameraDirector level)

```javascript
// CameraDirector.js, lines 14–19
export const CAM_STATE = {
  OVERVIEW:       'OVERVIEW',
  LEADER_ZOOM:    'LEADER_ZOOM',
  BATTLE_ZOOM:    'BATTLE_ZOOM',
  COMEBACK_ZOOM:  'COMEBACK_ZOOM',
};
```

### Phase transitions: trigger conditions

| Transition | Condition | Code line |
|---------|-----------|------------|
| → `OVERVIEW` (start forced) | `raceElapsed < 3000 ms` | Line 557 |
| → `LEADER_ZOOM` (post-start) | `raceElapsed ∈ [3000, 10000]` ms (postStartHoldMs) | Line 563 |
| → `BATTLE_ZOOM` | ≥3 top-10 racers within 200 px + off cooldown | Line 577 |
| → `COMEBACK_ZOOM` | Gap(1→last) > 30 % + Gap(1→2) ≥ 10 % + no pack | Line 583 |
| → `LEADER_ZOOM` (endgame) | Leader progress > `endgameThreshold = 0.85` | Line 568 |
| → `OVERVIEW` (periodic) | Cooldown elapsed (15–25 s jittered) | Line 575 |
| → `LEADER_ZOOM` (default) | No other condition applies | Line 587 |

### Transitions: animation vs. hard cut

- **State switch itself**: hard cut (no blend; new target zoom/pan set immediately, line 603)
- **Zoom/pan approach**: smooth lerp with per-state time constant
- **Entry phase** (slower TC, e.g. 0.8 s) → **tracking phase** (faster TC, e.g. 0.25 s)
- Convergence gates (lines 469–476): switch to tracking when `Δzoom < 0.05` **and** `Δpan < 10 px`

---

## 3. Per-phase detail

### OVERVIEW

| Parameter | Value |
|-----------|------|
| **Zoom factor** | Closed: `1.0` (line 779) / Open: `CANVAS_W / worldW` (adaptive) |
| **Field of view** | Full field (closed: entire track at `zoom=1`; open: full world width) |
| **Follow behavior X** | Centroid of focused racers (top-3) |
| **Follow behavior Y** | `_closedOffsetY()` with world scaling (closed) / `resolveCamera()` (open) |
| **Entry TC** | 1.5 s (line 134) |
| **Tracking TC** | 1.5 s (line 133) |
| **Lerp factor** | `tcToLerpFactor(1.5)` ≈ 0.331 per frame at 60 fps |
| **Phased observer** | No lead-in / lead-out (duration = 0) |
| **Lead-in duration** | 0.0 s |
| **Lead-out duration** | 0.0 s |

Visible world area: `CANVAS_W / effectiveZoom` × `CANVAS_H / effectiveZoom` world pixels.

---

### LEADER_ZOOM

| Parameter | Value |
|-----------|------|
| **Zoom factor** | Inverse of `spritePct = 0.09` (9 % of `CANVAS_H_REF = 720`) → target size 64.8 px; `zoom = 64.8 / (refSprite × scale)` |
| **Clamp** | `[minZoom, MAX_INVERSE_ZOOM = 5.0]` |
| **Field of view** | Leading racer centered |
| **Follow behavior X** | Position of leader (exact, line 804) |
| **Follow behavior Y** | `_closedOffsetY()` (closed) / standard offset (open) |
| **Entry TC** | 0.8 s (line 144) → lerp ≈ 0.594/frame |
| **Tracking TC** | 0.25 s (line 143) → lerp ≈ 0.917/frame (very sticky) |
| **Phased observer** | Lead-in: 1.0 s ahead / follow: pinned / lead-out: 1.5 s EMA decel |
| **Lead-in duration** | 1.0 s (line 145) |
| **Lead-out duration** | 1.5 s (line 146) |

---

### BATTLE_ZOOM

| Parameter | Value |
|-----------|------|
| **Zoom factor** | Inverse of `spritePct = 0.14` (14 %) → target size 100.8 px |
| **Clamp** | `[minZoom, 5.0]` |
| **Field of view** | Midpoint between 1st and 2nd place |
| **Follow behavior X** | Midpoint (Euclidean or arc-length interpolation on curves, `panTarget.js:48`) |
| **Follow behavior Y** | Analogous to LEADER_ZOOM |
| **Entry TC** | 0.8 s (line 154) |
| **Tracking TC** | 0.25 s (line 153) |
| **Phased observer** | Lead-in: 0.5 s / follow: pinned / lead-out: 1.0 s |
| **Min hold** | 3000 ms (stays active even if pack dissolves) |
| **Max duration** | 6000 ms (hard cap, line 282) |
| **Cooldown after exit** | 8000 ms (line 535) |

---

### COMEBACK_ZOOM

| Parameter | Value |
|-----------|------|
| **Zoom factor** | Inverse of `spritePct = 0.07` (7 %) → target size 50.4 px |
| **Clamp** | `[minZoom, 5.0]` |
| **Field of view** | 3rd place (underdog / last in focus group) |
| **Follow behavior X** | Position of `racers[2]` or `racers[last]` (`panTarget.js:61`) |
| **Entry TC** | 0.8 s (line 164) |
| **Tracking TC** | 0.25 s (line 163) |
| **Phased observer** | Lead-in: 1.0 s / follow: pinned / lead-out: 1.5 s |

---

## 4. DevScreen values for camera

### Per-state profiles (`CameraZoomTuningSection.jsx`)

For each state (OVERVIEW, LEADER_ZOOM, BATTLE_ZOOM, COMEBACK_ZOOM):

| Field | Type | Default (per state) | Min | Max | Step | Purpose |
|------|-----|--------------------|-----|-----|------|-------|
| `spritePct` | float | OVERVIEW: 0.05 / LEADER: 0.09 / BATTLE: 0.14 / COMEBACK: 0.07 | 0.01 | 0.3 | 0.005 | Sprite target height as % canvas height; drives inverse zoom |
| `trackingTC` | float | OVERVIEW: 1.5 / all others: 0.25 | 0.05 | 5 | 0.05 | Lerp time constant in stable tracking |
| `entryTC` | float | OVERVIEW: 1.5 / all others: 0.8 | 0.05 | 5 | 0.05 | Slower lerp on state entry until convergence |
| `leadInDuration` | float | OVERVIEW: 0.0 / LEADER: 1.0 / BATTLE: 0.5 / COMEBACK: 1.0 | 0 | 5 | 0.1 | Seconds camera shows track ahead before following |
| `leadOutDuration` | float | OVERVIEW: 0.0 / LEADER: 1.5 / BATTLE: 1.0 / COMEBACK: 1.5 | 0 | 5 | 0.1 | Seconds EMA deceleration before state end |
| `innerFramePct` | float | 0.7 | 0.3 | 1 | 0.05 | Fraction of canvas axis for inner frame boundary |
| `maxStateDuration` | int (ms) | OVERVIEW: 4000 / all others: 8000 | 1000 | 15000 | 500 | Hard cap in this state |
| `minStateHold` | int (ms) | 5000 | 1000 | 10000 | 500 | Minimum time in state before switch |

### Global trigger settings

| Field | Default | Min | Max | Step | Purpose |
|------|---------|-----|-----|------|-------|
| `battlePulkThresholdPx` | 200 | 20 | 500 | 10 | World-pixel radius for pack detection |
| `battleMinDurationMs` | 3000 | 500 | 10000 | 500 | Min dwell time in BATTLE after entry |
| `endgameThreshold` | 0.85 | 0.5 | 1.0 | 0.05 | Leader progress fraction for endgame lock |
| `postStartHoldMs` | 7000 | 0 | 15000 | 500 | LEADER forced after 3 s start phase |
| `battleCooldownMs` | 8000 | 0 | 20000 | 500 | Minimum pause between two BATTLE states |
| `overviewCooldownMin` | 15000 | 5000 | 60000 | 1000 | Min interval for periodic OVERVIEW |
| `overviewCooldownMax` | 25000 | 5000 | 60000 | 1000 | Max interval (jittered) |

### Convergence settings

| Field | Default | Min | Max | Step | Purpose |
|------|---------|-----|-----|------|-------|
| `entryConvergenceZoom` | 0.05 | 0.001 | 0.5 | 0.005 | Entry→Tracking when `Δzoom < this value` |
| `entryConvergencePx` | 10 | 1 | 100 | 1 | Entry→Tracking when `Δpan < this value` (px, per axis) |

### HUD toggles (`CameraStateHudSection.jsx`)

| Toggle | Default | Purpose |
|--------|---------|-------|
| `showCameraStateHud` | `true` | Small state overlay (top left) |
| `showCameraDiagnostics` | `false` | Diagnostics overlay + console logging |

Diagnostics output contains: live `cam.zoom`, computed sprite pixel size, current state + TC, each state transition with reason/gap01/leaderProgress.

### Legacy fields (schema present, no longer read)

| Field | Replaced by | Note |
|------|---------------|-------|
| `spritePctOfCanvas` | Per-state `spritePct` in profiles | v3 migration, `cameraConfig.js:194` |
| `cameraTransitionSeconds` | Per-state `trackingTC` / `entryTC` | v3 migration, `cameraConfig.js:203` |
| `battleMaxDurationMs` (global) | Per-state `maxStateDuration` | Moved into profile |
| `minStateHoldMs` (global) | Per-state `minStateHold` | Moved into profile |
| `battleGapThreshold` | `battlePulkThresholdPx` | World pixels instead of arc-length fraction |

---

## 5. Known zoom factors

### Hardcoded constants

| Constant | Value | File / line | Purpose |
|-----------|------|---------------|-------|
| `OPEN_TRACK_BASE_ZOOM` | `1.5` | `CameraDirector.js:23`, `openTrackCamera.js:11` | Base zoom multiplier for open tracks |
| `MAX_INVERSE_ZOOM` | `5.0` | `CameraDirector.js:43` | Clamp upper bound for inverse zoom |
| `CANVAS_W` | `1280` | `CameraDirector.js:44` | Reference canvas width |
| `CANVAS_H_REF` | `720` | `CameraDirector.js:45` | Reference canvas height |
| `FALLBACK_REFERENCE_SPRITE_SIZE` | `36` | `CameraDirector.js:47` | Fallback when no sprite size is passed |
| `LEAD_OUT_DECAY` | `0.05` | `CameraDirector.js:50` | EMA decay factor per 60-fps frame in lead-out |
| `ZOOM_STEP` | `0.9` | `resolveCamera.js:20` | Zoom reduction per step in resolver (10 %) |
| Open-track cam lerp | `0.05` | `RaceScreen/index.jsx:1132` | Per-frame lerp for `st.camX/camY` (open track, not controllable via config) |

### Computed zoom values (not hardcoded)

**Overview zoom** (adaptive per track):
```
overviewZoom = CANVAS_W / worldW
Examples:
  1280 px world width → 1.0×
  1600 px             → 0.8×
   960 px             → 1.33×
```

**Leader/battle/comeback zoom** (inverted from sprite target size):
```
targetSizePx = spritePct × CANVAS_H_REF
zoom = targetSizePx / (refSpriteSize × scale)
Scales with racer type displaySize and track width.
```

### Last ~20 commits with camera relevance

| Commit | Date | Change |
|--------|-------|----------|
| `cf77972` | 2026-05-12 | Docs update; no zoom change |
| `68ef032` | 2026-05-08 | Schema v5: lead-in/out from pixel to time-based; `leadInDistance`/`followDuration`/`leadOutDistance` → `leadInDuration`/`leadOutDuration`; no zoom values changed |
| `fc7ed46` | 2026-04-30 | `_display*` workaround fields removed (render optimization); no zoom |
| `0e92670` | 2026-04-29 | Lead-out: EMA instead of hard stop; no zoom |
| `395e8d0` | 2026-04-28 | Diagnostics fields added (Δv, follow%, pixel-snap check); no zoom |
| `ca419ed` | 2026-04-23 | Phase-1 foundation: lead-in/follow/lead-out, time-based; no zoom |
| `a36f138` | 2026-04-20 | EditorShape interpolation for BATTLE midpoint on curve tracks; no zoom |
| `5bf3f24` | 2026-04-18 | Pan-target reform (3-layer pipeline); no zoom |
| `8eb16e0` | 2026-04-16 | Pacing tunables, plan-B pan; no hard zoom value changed |
| `769fc05` | 2026-04-10 | OVERVIEW zoom respects track type; `overviewZoom` formula established |
| `750d826` | 2026-02-17 | Feature D7a: proportional sprite scaling; inverse-zoom architecture introduced |
| `7cdde15` | 2026-02-04 | Feature "adaptive zoom": base foundation for per-track `overviewZoom` |

**Largest zoom-relevant changes:**
- **`750d826`** (Feb 2026): inverse-zoom architecture (sprite-size-driven) introduced — previously zoom values were configured directly.
- **`68ef032`** (May 2026): schema migration v4→v5 — phasing times changed, zoom values themselves unchanged.

---

## 6. Open questions

### Magic numbers without explanation

| Magic number | Location | Context |
|---|---|---|
| `0.05` | `resolveCamera.js:20` as `ZOOM_STEP = 0.9^(1/step)` | 10 % zoom reduction per resolver step; no comment on why 10 % |
| `0.05` | `RaceScreen/index.jsx:1132` | Open-track pan lerp; hardcoded, not controllable via config |
| `0.05` | `CameraDirector.js:50` as `LEAD_OUT_DECAY` | EMA decay for lead-out phase; no comment |
| `10` | `entryConvergencePx` default | Pixel threshold for Entry→Tracking; zoom-dependent but value is absolute |

### Inherent inconsistencies

**1. Open-track pan smoothing is decoupled from config**
- Closed tracks: lerp factor from `trackingTC` (configurable via DevPanel)
- Open tracks: fixed `0.05` per frame in `RaceScreen/index.jsx:1132`, ignores `dt`, ignores config
- Consequence: identical TC settings behave differently on open tracks vs. closed tracks

**2. Pack detection uses top-10, camera focuses top-3**
- `_isPulk()` checks racers 1–10 (line 701)
- `_focusRacers()` returns only top-3 (line 688)
- A pack at racers 4–6 triggers BATTLE_ZOOM, but the camera looks at racers 1–2

**3. `innerFramePct` exists per-state in schema, but is set globally**
- `defaults.js:137`: `innerFramePct` is a per-state profile field
- `CameraDirector.js:234`: `this._innerFramePct` is set once globally (not read per-state)
- Per-state configuration is dead code

**4. Lead-out decay not configurable per state**
- `leadOutDuration` is adjustable per state (works)
- `LEAD_OUT_DECAY = 0.05` (smoothness of deceleration) is hardcoded — no DevPanel field
- Cannot be adjusted without a code change

**5. Sprite-size fallback not visible in diagnostics**
- If `referenceSpriteSize ≤ 0`: fallback to `36px` + console warn (line 210)
- DevPanel diagnostics show the computed sprite size but not whether fallback is active
- Incorrect zoom calibration can go unnoticed

**6. No guard against non-monotone `raceElapsed` values**
- `raceElapsed = ts - st.raceStart` (no guards)
- Timing gates (start phase, post-start hold) would break with negative or jumping values

**7. Arc-length interpolation in `panTarget.js` undocumented**
- `shape.getPosition(tMid, 0)` for BATTLE midpoint on curve tracks (line 48)
- Parameter semantics of `t` not explained (0–1, cyclic, linear?)
- Behavior for open-track shapes vs. closed-track shapes not commented

**8. Config reload does not snap zoom**
- `updateConfig()` calls `_computeZoomLevels()` (line 155)
- New target zoom is set, but `this.zoom` stays at the old value
- Camera lerps from old value to new — at large value changes a visible "slide" occurs
