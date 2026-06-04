# Sprite-Scale Control vs. OVERVIEW Normalization — Clarification

**Branch:** `feat/closed-track-overview-normalization`
**Date:** 2026-06-05
**Mode:** ANALYSIS ONLY — no code changed

---

## 1. Field Map: Dev Screen slider → config field → camera behavior

### Which sliders exist

The Dev Screen (`CameraZoomTuningSection.jsx`) renders a `StateProfileBlock` for each state in:
```js
const CAM_STATES = ['OVERVIEW', 'LEADER_ZOOM', 'BATTLE_ZOOM', 'COMEBACK_ZOOM'];
```

Each block contains a `spriteScale` input (`PROFILE_FIELDS[0]`). Each slider writes to:

```
config.cameraStateProfiles[STATE].spriteScale
```

| Dev Screen label | State name | Config field | Default value |
|-----------------|------------|-------------|--------------|
| "Overview — Sprite scale (×)" | `OVERVIEW` | `cameraStateProfiles.OVERVIEW.spriteScale` | **1.0** |
| "Leader Zoom — Sprite scale (×)" | `LEADER_ZOOM` | `cameraStateProfiles.LEADER_ZOOM.spriteScale` | **1.81** |
| "Battle Zoom — Sprite scale (×)" | `BATTLE_ZOOM` | `cameraStateProfiles.BATTLE_ZOOM.spriteScale` | **2.81** |
| "Comeback Zoom — Sprite scale (×)" | `COMEBACK_ZOOM` | `cameraStateProfiles.COMEBACK_ZOOM.spriteScale` | **1.39** |
| *(no slider)* | `LEAD_CHANGE` | `cameraStateProfiles.LEAD_CHANGE.spriteScale` | **1.81** (hardcoded fallback, inherits LEADER default) |

`LEAD_CHANGE` has no Dev Screen control. It uses `profiles.LEAD_CHANGE?.spriteScale ?? DEFAULT_SPRITE_SCALE.leader` in `CameraDirector._computeZoomLevels()`.

### How the value enters the camera

`_computeZoomLevels()` (`CameraDirector.js:305`) reads each state's `spriteScale` and converts it to a `cam.zoom` target via `_computeZoomForSpriteScale(spriteScale)`:

```
closed track: cam.zoom = spriteScale / bsX       (bsX = CANVAS_W / worldW)
open track:   cam.zoom = spriteScale / OPEN_BASE  (OPEN_BASE = 1.5)
```

The effective zoom at the render call is `frameEffZoom = cam.zoom × divisor = spriteScale` — for both open and closed, when the camera has converged to the state zoom. So `spriteScale` maps directly to `frameEffZoom`. A sprite drawn at `displaySize × displaySizeScale` world pixels then occupies `displaySize × displaySizeScale × spriteScale = refSprite × spriteScale` screen pixels — **before any render floor.**

---

## 2. OVERVIEW: how the slider value flows (and where it disappears)

### Path for open tracks

1. `OVERVIEW.spriteScale → _overviewStateZoom = computeZoomForSpriteScale(spriteScale)`  
   For open track (1280-wide): `_overviewStateZoom = max(overviewZoom, spriteScale / 1.5)`

2. `_transition()` enters OVERVIEW with `referenceSpriteSize > 0`:  
   ```
   raw     = overviewTargetScreenPx / (refSprite × OPEN_BASE) = 18 / (28.5 × 1.5) = 0.421
   maxZoom = min(MAX_INVERSE_ZOOM, _overviewStateZoom × 0.8)   = min(10, 0.667 × 0.8) = 0.533
   snapZoom = max(overviewZoom, min(maxZoom, raw))              = max(0.208, min(0.533, 0.421)) = 0.421
   ```
   `_overviewSnapZoom = 0.421`. The user's `spriteScale = 1.0` produced `_overviewStateZoom = 0.667` — it appears only as the ceiling factor `0.667 × 0.8 = 0.533`, which doesn't bind here (raw < ceiling).

3. Render floor: `isOverviewOpen = isOpenTrack && state === 'OVERVIEW' = true`.  
   `minFloorPx = overviewTargetScreenPx = 18`. `propPx = 28.5 × 0.632 = 18px`. `actualPx = 18px`.

**Result for open OVERVIEW:** `actualPx = overviewTargetScreenPx = 18px`, regardless of `OVERVIEW.spriteScale`. The slider is **effectively ignored** at default spriteScale (1.0). It would only matter if set so low that `_overviewStateZoom × 0.8 < raw`, suppressing the normalization — but at default values the formula is well below the ceiling.

### Path for closed tracks

1. `OVERVIEW.spriteScale → _overviewStateZoom = max(1.0, spriteScale / bsX)`  
   For 1536-wide: `_overviewStateZoom = max(1.0, 1.0 / 0.833) = 1.2`

2. `_transition()` with `referenceSpriteSize > 0`:  
   ```
   raw     = 18 / (35.3 × 0.833) = 0.613
   maxZoom = MAX_INVERSE_ZOOM = 10.0   (no per-track ceiling for closed)
   snapZoom = max(1.0, min(10.0, 0.613)) = 1.0   ← camera floor at 1.0
   ```
   `_overviewStateZoom` is not consulted at all. `_overviewSnapZoom = 1.0`.

3. Render floor: `isOverviewOpen = isOpenTrack && state === 'OVERVIEW' = false`.  
   `minFloorPx = OVERVIEW.spriteScale × 36 = 1.0 × 36 = 36`. `propPx = 35.3 × 0.833 = 29.4`. `actualPx = 36px`.

**Result for closed OVERVIEW:** `actualPx = 36px`, regardless of `OVERVIEW.spriteScale`. The camera normalization is floor-clamped (cam.zoom=1.0), and the render floor further overrides to 36px. **The slider is completely ignored.**

### Where the override happens — the two layers

| Layer | Location | Effect on OVERVIEW |
|-------|----------|--------------------|
| Camera normalization (`_transition`) | `CameraDirector.js:1103-1128` | Overrides `_overviewStateZoom`; `snapZoom` is formula-driven, not from `spriteScale` |
| Render floor (`isOverviewOpen`) | `RaceScreen/index.jsx:1268-1272` | For closed tracks: `minFloorPx = OVERVIEW.spriteScale × 36` overrides `propPx`; for open tracks: `minFloorPx = overviewTargetScreenPx` matches the formula target |

The OVERVIEW `spriteScale` slider is not honored for sprite size in OVERVIEW on either track type. On open tracks the normalization targets 18px; on closed tracks the camera + render floor together pin sprites at 36px.

---

## 3. Other phases: does the slider work?

For LEADER_ZOOM, BATTLE_ZOOM, COMEBACK_ZOOM: the camera is NOT under normalization override. `targetZoom = _leaderZoom / _battleZoom / _comebackZoom`, each derived directly from `spriteScale`. At convergence:

```
frameEffZoom = cam.zoom × divisor = spriteScale
propPx       = refSprite × spriteScale
actualPx     = max(propPx, minFloorPx)
```

The `minFloorPx` for all non-OVERVIEW (and non-open-OVERVIEW) states is `OVERVIEW.spriteScale × FALLBACK_REFERENCE_SPRITE_SIZE` = `OVERVIEW.spriteScale × 36`.

### Full table at Dirt Oval N=20 (refSprite=35.3, OVERVIEW.spriteScale=1.0, floor=36px)

| State | spriteScale | propPx (=refSprite×sc) | floor | ACTUAL px | Slider honored? |
|-------|-------------|----------------------|-------|-----------|----------------|
| OVERVIEW | 1.0 | 29.4 | 36 | **36** | **NO** — camera floor (1.0) + render floor (36px) |
| LEADER_ZOOM | 1.81 | 63.9 | 36 | **63.9** | YES |
| BATTLE_ZOOM | 2.81 | 99.2 | 36 | **99.2** | YES |
| COMEBACK_ZOOM | 1.39 | 49.1 | 36 | **49.1** | YES |
| LEAD_CHANGE | 1.81 | 63.9 | 36 | **63.9** | YES (no slider; hardcoded 1.81) |

### When does the floor override non-OVERVIEW sliders?

The 36px render floor bites when `refSprite × spriteScale < 36`, i.e., when `spriteScale < 36 / refSprite`. For Dirt Oval N=20 (`refSprite=35.3`), the crossover is at `spriteScale = 36/35.3 = 1.02`. Below 1.02:

| LEADER.spriteScale | propPx | actualPx |
|-------------------|--------|---------|
| 0.5 | 17.6 | **36** ← floor |
| 0.8 | 28.2 | **36** ← floor |
| 1.0 | 35.3 | **36** ← floor |
| 1.02 | 36.0 | 36.0 (floor edge) |
| 1.1 | 38.8 | **38.8** ← honored |
| 1.81 | 63.9 | **63.9** ← honored |

**The user cannot make LEADER/BATTLE/COMEBACK sprites smaller than approximately natural size (spriteScale ≈ 1.0).** The 36px floor enforces a minimum sprite size equal to what a 1× sprite looks like in the camera's reference frame. This is intentional — LEADER zoom should never show *smaller* sprites than OVERVIEW — but it is not documented in the slider tooltip.

---

## 4. The hidden coupling: OVERVIEW.spriteScale → all other states' floor

`RaceScreen/index.jsx:1271`:
```js
(cameraConfigRef.current.cameraStateProfiles?.OVERVIEW?.spriteScale ?? 1.0) *
  FALLBACK_REFERENCE_SPRITE_SIZE;   // = 36
```

`OVERVIEW.spriteScale` is used as the **render floor multiplier for LEADER, BATTLE, COMEBACK, and closed OVERVIEW**. If the user changes OVERVIEW.spriteScale from 1.0 to 2.0, the render floor rises from 36px to 72px across all states:

| OVERVIEW.spriteScale | Floor (all states) | LEADER effect | COMEBACK effect |
|---------------------|-------------------|---------------|----------------|
| 0.5 | 18 px | 64px (unchanged; above floor) | 49px (unchanged) |
| 1.0 | 36 px | 64px | 49px |
| 1.5 | 54 px | 64px | **54px** (floor kicks in) |
| 2.0 | 72 px | **72px** (floor kicks in) | **72px** |
| 2.5 | 90 px | **90px** | **90px** |

The user expects OVERVIEW.spriteScale to change OVERVIEW sprite size. It doesn't (per §2). But it silently changes the minimum sprite size in **all other states**. This coupling is nowhere documented in the UI.

**This is the most surprising behavior in the entire system**: the slider that ostensibly controls OVERVIEW zoom has no effect on OVERVIEW sprites, but has a global side effect on the sprite floor in every other camera state.

---

## 5. Mental model comparison

### User's mental model
> "Each phase has a sprite scale slider. I set the value, sprites appear at that relative size in that phase. The scale is applied uniformly — same on open and closed tracks. Higher value = bigger sprites, lower value = smaller sprites."

### Code's actual model (per phase)

| Phase | What spriteScale controls | Is user's model correct? |
|-------|--------------------------|--------------------------|
| **LEADER_ZOOM** | `cam.zoom` directly → `frameEffZoom = spriteScale` → `propPx = refSprite × spriteScale` | **Mostly YES** — honored when `spriteScale ≳ 1.0`. Floor at `OVERVIEW.spriteScale × 36` prevents going below natural size. |
| **BATTLE_ZOOM** | Same as LEADER | **Mostly YES** (same caveat) |
| **COMEBACK_ZOOM** | Same as LEADER | **Mostly YES** (same caveat) |
| **LEAD_CHANGE** | No slider — hardcoded to 1.81 | N/A |
| **OVERVIEW (open)** | Sets `_overviewStateZoom` = ceiling on normalization (rarely binding). Does NOT set sprite size. | **NO** — normalization formula (`overviewTargetScreenPx / refSprite`) fully determines OVERVIEW zoom on open tracks. spriteScale is a vestigial ceiling. |
| **OVERVIEW (closed)** | Sets `_overviewStateZoom` (not consulted at runtime); sets render floor for all other states. | **NO** — camera floor at cam.zoom=1.0 and render floor at `OVERVIEW.spriteScale × 36` together pin all sprites. The slider has no effect on OVERVIEW sprite size itself. |

### Where they diverge

1. **OVERVIEW is a normalization zone, not a scale zone.** The entire point of L116 (referenceSpriteSize normalization) is to make OVERVIEW racer size *racer-count-independent*. That goal makes the slider irrelevant by design — the zoom is computed from `overviewTargetScreenPx` and `refSprite`, not from the user's scale input. The tooltip saying "1.0 = natural size, 2.0 = twice as large" is **incorrect for OVERVIEW** — that description only holds when the normalization is absent or disabled.

2. **The floor for LEADER/BATTLE/COMEBACK is tied to OVERVIEW.spriteScale, not to a universal minimum.** This is a design choice (LEADER sprites should never be smaller than OVERVIEW sprites), but it creates a hidden coupling the user doesn't see.

---

## 6. Bug vs. design

| Observation | Classification |
|-------------|---------------|
| OVERVIEW.spriteScale has no effect on OVERVIEW sprite size (open tracks) | **Design** — intentional consequence of L116 normalization |
| OVERVIEW.spriteScale has no effect on OVERVIEW sprite size (closed tracks) | **Design + Bug** — the normalization is inert (camera floor), and the `isOverviewOpen` bug adds a 36px render override on top |
| OVERVIEW.spriteScale silently controls the render floor for LEADER/BATTLE/COMEBACK | **Design** (enforce OVERVIEW as minimum), **undocumented** (no tooltip, no Dev Screen label) |
| User cannot make LEADER sprites smaller than spriteScale ≈ 1.0 | **Design** (floor = natural size), **undocumented** |
| OVERVIEW.spriteScale tooltip says "1.0 = natural size, 2.0 = twice as large" | **Bug** — description is only true for the rare ceiling path; in normal gameplay the slider is inert for OVERVIEW |

---

## 7. Proposed fix (identified, not applied)

The `isOverviewOpen` condition at `RaceScreen/index.jsx:1268`:
```js
// Current:
const isOverviewOpen = isOpenTrack && camDirRef.current?.state === 'OVERVIEW';

// Proposed (remove isOpenTrack &&):
const isOverviewOpen = camDirRef.current?.state === 'OVERVIEW';
```

This makes the `overviewTargetScreenPx` render floor apply to closed-track OVERVIEW too, eliminating the 36px override. It does **not** fix the camera floor issue (Layer 2 from the diagnosis), and it does **not** make the OVERVIEW spriteScale slider relevant — the normalization formula still drives the zoom, not the slider. The slider's tooltip description remains incorrect regardless of this fix.

A complete fix for the user's mental model would require one of:
- Making the OVERVIEW slider actually drive the target pixel size (equivalent to setting `overviewTargetScreenPx` via the slider, with the normalization doing the zoom math)
- Updating the tooltip to explain that OVERVIEW zoom is formula-driven and the slider is a ceiling/floor control only
- A separate `overviewTargetScreenPx` slider for closed tracks (the approach from diagnosis option 3)

No code changed. Branch pushed.
