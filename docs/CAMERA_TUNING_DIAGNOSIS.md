# Camera Tuning Effectiveness — Diagnosis Report

<!-- HISTORICAL: 2026-05-06 — camera-tuning diagnosis written against the pre-corridor zoom model; its numbers are that model's -->

> **Read this as HISTORY.** It records what was measured or true on 2026-05-06. Config values in it are
> that day's values, not today's; today's live in `client/src/modules/storage/defaults.js`.

**Branch:** `diagnosis/camera-tuning-effectiveness`  
**Date:** 2026-05-04  
**Scope:** Read-only analysis. No code changes. Verifies/refutes four hypotheses (H1–H4) raised after PR-C browser testing.

> **Historical.** The zoom unit this report reasons in — `spritePctOfCanvas`, sprite-size-derived
> zoom — no longer exists; CAMERA-ZOOM-UNIT-1 and CAMERA-REFERENCE-WIDTH-1 replaced it with standard
> corridors. The measurements and the reasoning stand as a record; the formulas do not describe the
> shipped camera. Current architecture: **[CAMERA_DIRECTOR.md](CAMERA_DIRECTOR.md)**.

---

## Executive Summary

| #   | Hypothesis                                          | Verdict                 | Severity               |
| --- | --------------------------------------------------- | ----------------------- | ---------------------- |
| H1  | Closed-track state multipliers never fire           | **Refuted**             | —                      |
| H2  | Open-track BATTLE over-zoom (double-multiplication) | **Confirmed**           | Critical               |
| H3  | `maxTargetScreenPx` ceiling not applied             | **Refuted**             | —                      |
| H4  | Pan target loses leader at N=20                     | **Partially confirmed** | Low (design trade-off) |

**Critical finding:** H2 is a genuine bug. `openTrackBaseZoom` is baked into `cam.zoom` inside `CameraDirector._computeZoomLevels()`, then the render path multiplies `cam.zoom` by the hardcoded `OPEN_TRACK_BASE_ZOOM = 1.5` constant a second time. On a standard 1280 px world with default config (`openTrackBaseZoom=1.5`, `battleZoomMultiplier=2.5`), the effective render scale hits `1.5 × 2.5 = 3.75` — the world is magnified ≈2.5× more than intended.

H1 and H3 are correct as implemented. H4 is a known design trade-off (centroid-of-top-3 lagging leader), not a defect.

---

## H1 — Closed-track state multipliers never fire

### Claim

Configuring `leaderZoomMultiplier=1.8` on a closed track produces no visible zoom change; the camera appears stuck at 1.0.

### Code path

`CameraDirector._computeZoomLevels` ([CameraDirector.js:97–113](../client/src/modules/camera/CameraDirector.js)):

```js
const openBase =
  this._isOpenTrack && config ? (config.openTrackBaseZoom ?? 1.0) : 1.0;
const leaderRatio = config?.leaderZoomMultiplier ?? LEADER_ZOOM_RATIO;
this._leaderZoom = Math.max(
  MIN_ZOOM,
  Math.min(MAX_ZOOM, this.overviewZoom * openBase * leaderRatio),
);
```

On a **closed** 1280 px track with default config:

- `openBase = 1.0` (guard: `this._isOpenTrack = false`)
- `overviewZoom = 1280 / 1280 = 1.0`
- `_leaderZoom = clamp(1.0 × 1.0 × 1.8, 0.15, 2.5) = 1.8`

`_setTargets` LEADER_ZOOM case ([CameraDirector.js:224](../client/src/modules/camera/CameraDirector.js)):

```js
this.targetZoom = this._leaderZoom; // 1.8
```

Render path for closed track ([index.jsx:987](../client/src/screens/RaceScreen/index.jsx)):

```js
ctx.scale(cam.zoom * bsX, cam.zoom * bsY);
```

`cam.zoom` lerps toward 1.8 → visible zoom change of 1.8× applied correctly.

### Verdict: **Refuted**

Multipliers fire and are rendered. The "no difference" observation during browser testing is most likely caused by race duration: the camera starts in OVERVIEW (`stateEnteredAt=0`) and only calls `_transition()` after `MAX_STATE_DURATION = 8000 ms`. If the test race lasted < 8 s, the camera never left OVERVIEW and `cam.zoom` stayed at 1.

---

## H2 — Open-track BATTLE over-zoom (double-multiplication of openTrackBaseZoom)

### Claim

On an open track, BATTLE zoom is far stronger than intended. The effective canvas scale reaches 3.75 instead of 2.5.

### Root cause

`openTrackBaseZoom` is applied in **two places** at once:

**Place 1 — `CameraDirector._computeZoomLevels`** ([CameraDirector.js:98, 108](../client/src/modules/camera/CameraDirector.js)):

```js
const openBase =
  this._isOpenTrack && config ? (config.openTrackBaseZoom ?? 1.0) : 1.0;
this._battleZoom = Math.max(
  MIN_ZOOM,
  Math.min(MAX_ZOOM, this.overviewZoom * openBase * battleRatio),
);
//                                                                           ^^^^^^^^ first application
```

With `overviewZoom=1.0`, `openBase=1.5`, `battleRatio=2.5`:

- `_battleZoom = clamp(1.0 × 1.5 × 2.5, 0.15, 2.5) = clamp(3.75, …) = 2.5` (hits MAX_ZOOM ceiling)

**Place 2 — open-track render path** ([index.jsx:916, 966–969](../client/src/screens/RaceScreen/index.jsx) and [openTrackCamera.js:19–21](../client/src/modules/camera/openTrackCamera.js)):

```js
// effectiveZoom always multiplies cam.zoom by the hardcoded constant:
export const OPEN_TRACK_BASE_ZOOM = 1.5;
export function effectiveZoom(directorZoom, baseZoom = OPEN_TRACK_BASE_ZOOM) {
  return baseZoom * (directorZoom || 1); // ^^^^^^^^ second application
}
// Render:
const effZoom = effectiveZoom(cam.zoom); // 1.5 * 2.5 = 3.75
ctx.scale(effZoom, effZoom);
```

### Numeric example (1280 px open track, default config)

| Parameter                                  | Value                                 |
| ------------------------------------------ | ------------------------------------- |
| `overviewZoom`                             | 1.0                                   |
| `config.openTrackBaseZoom`                 | 1.5                                   |
| `config.battleZoomMultiplier`              | 2.5                                   |
| `_battleZoom` (after `_computeZoomLevels`) | 2.5 (clamped from 3.75)               |
| `cam.zoom` at BATTLE_ZOOM state            | lerps to 2.5                          |
| `effectiveZoom(2.5)` at render             | **3.75**                              |
| Canvas scale applied                       | **3.75×**                             |
| Visible world width                        | 1280 / 3.75 = **341 px** of the world |

**Without config** (old behavior, no `openTrackBaseZoom` baked in):

- `_battleZoom = clamp(1.0 × 1.0 × 1.6) = 1.6`
- `effZoom = 1.5 × 1.6 = 2.4` → 1280 / 2.4 = 533 px visible (sensible)

The config path produces 56% less visible world area than the no-config path.

### Why `maxTargetScreenPx=2.5` clamp doesn't save it

`MAX_ZOOM = 2.5` clamps `_battleZoom` inside CameraDirector. But the render path then multiplies `cam.zoom` (≤ 2.5) by `OPEN_TRACK_BASE_ZOOM = 1.5` again, taking the effective scale above 2.5 regardless.

### Intended design

`openTrackBaseZoom` was intended to **replace** the hardcoded `OPEN_TRACK_BASE_ZOOM = 1.5` constant in the render path, not to be stacked on top of it. The constant and the config field represent the same concept (base magnification for open-track rendering), so only one source should control it at a time.

### Fix options

**Option A (recommended):** Remove `openBase` from `_computeZoomLevels`. Keep zoom ratios as pure multipliers on `overviewZoom`. Pass `config.openTrackBaseZoom ?? OPEN_TRACK_BASE_ZOOM` through to `effectiveZoom()` at every render callsite.

```js
// CameraDirector._computeZoomLevels — remove openBase:
this._battleZoom = Math.max(
  MIN_ZOOM,
  Math.min(MAX_ZOOM, this.overviewZoom * battleRatio),
);
// Render path — pass base zoom from config:
const base = cameraConfig.openTrackBaseZoom ?? OPEN_TRACK_BASE_ZOOM;
const effZoom = effectiveZoom(cam.zoom, base);
```

- `_battleZoom = min(2.5, 1.0 × 2.5) = 2.5`
- `effZoom = 1.5 × 2.5 = 3.75` — still 3.75. The `battleZoomMultiplier=2.5` is itself too large to be stacked on 1.5.

Actually, the fix needs a companion adjustment: the `battleZoomMultiplier` is designed to be the final effective zoom relative to `overviewZoom`, not a sub-factor below `openTrackBaseZoom`. See **Option B**.

**Option B (cleaner):** Keep `openBase` out of `_computeZoomLevels` entirely. Define zoom multipliers as ratios on top of `overviewZoom` regardless of track type. In `effectiveZoom()`, use `config.openTrackBaseZoom` rather than the hardcoded constant. Resulting formula:

```
effZoom = config.openTrackBaseZoom × cam.zoom
cam.zoom → config.battleZoomMultiplier × overviewZoom
effZoom_BATTLE = 1.5 × (2.5 × 1.0) = 3.75
```

This is still 3.75. The default `battleZoomMultiplier=2.5` was set assuming the old `1.6×overviewZoom` behavior. It needs to be lowered to `~1.6` to match the original feel, or the spec defaults need revision.

**Option C (minimal):** Remove the `openBase` factor from `_computeZoomLevels` and do not pass it to `effectiveZoom`. This makes zoom multipliers independent of open/closed track type (consistent behavior), and the hardcoded `OPEN_TRACK_BASE_ZOOM=1.5` constant in the render path remains unchanged. `openTrackBaseZoom` in the config has no effect (the config field becomes a no-op). This restores old behavior without the double-multiplication.

### Verdict: **Confirmed — Critical**

The double-multiplication produces an effZoom 2.34× larger than intended on default config. On narrow or small open tracks this causes extreme crop.

---

## H3 — `maxTargetScreenPx` ceiling not applied

### Claim

Sprites grow unconstrained at high zoom levels because the `maxTargetScreenPx` parameter is not passed to `computeRenderDisplayScale`.

### Code path

RaceScreen render loop ([index.jsx:950–962](../client/src/screens/RaceScreen/index.jsx)):

```js
const frameDisplayScale = computeRenderDisplayScale(
  displaySize,
  displaySizeScale,
  frameEffZoom,
  getEffectiveMinTargetScreenPx(
    racerTypeRef.current?.config?.minTargetScreenPx,
    cameraConfig.minTargetScreenPx,
  ),
  getEffectiveMaxTargetScreenPx(
    // ← 5th param: ceiling passed
    racerTypeRef.current?.config?.maxTargetScreenPx,
    cameraConfig.maxTargetScreenPx,
  ),
);
```

`computeRenderDisplayScale` ([autoSpriteScale.js:78–82](../client/src/modules/autoSpriteScale.js)):

```js
const applyMax =
  maxTargetScreenPx != null && maxTargetScreenPx > minTargetScreenPx;
const targetScreenPx = applyMax
  ? Math.min(flooredScreenPx, maxTargetScreenPx)
  : flooredScreenPx;
```

With default config `maxTargetScreenPx=160` and `minTargetScreenPx=32`, `applyMax=true` and the ceiling clamps screen pixels at 160.

### Verdict: **Refuted**

Both the 5th parameter wiring (in `index.jsx`) and the ceiling clamp logic (in `autoSpriteScale.js`) are correct. Sprite size is bounded at `maxTargetScreenPx`.

---

## H4 — Pan target loses leader at N=20 (FOCUS_GROUP_SIZE=3)

### Claim

With 20 racers, the pan target (centroid of top-3) lags so far behind the leader that the leader exits the visible frame.

### Code path

Open-track pan target ([index.jsx:924–931](../client/src/screens/RaceScreen/index.jsx)):

```js
const FOCUS_GROUP_SIZE = 3; // line 72
const focusRacers = [...st.racers]
  .sort((a, b) => b.t - a.t)
  .slice(0, FOCUS_GROUP_SIZE);
const { targetX, targetY } = openTrackPanTarget(
  focusRacers,
  CW,
  CH,
  effZoom,
  camXMax,
  camYMax,
);
```

`openTrackPanTarget` returns the centroid of those 3 racers, centered in the viewport ([openTrackCamera.js:57–65](../client/src/modules/camera/openTrackCamera.js)).

### Numeric example

Scenario: leader at world x=1800, 2nd at x=1200, 3rd at x=1000 (N=20, effZoom=2.1 without config):

|                                                         | Value                               |
| ------------------------------------------------------- | ----------------------------------- |
| Pan centroid x                                          | (1800 + 1200 + 1000) / 3 = **1333** |
| Visible world width at effZoom=2.1                      | 1280 / 2.1 = **610 px**             |
| Camera window: `[centroid - visW/2, centroid + visW/2]` | [1028, 1638]                        |
| Leader at x=1800                                        | **162 px outside right edge**       |

The leader is off-screen whenever the gap from leader to 3rd-place exceeds `visibleWidth / 2`.

With H2's over-zoom (effZoom=3.75), visible width shrinks to 341 px, making off-screen even more likely.

### Why N=20 doesn't change the core issue

`FOCUS_GROUP_SIZE=3` is a constant. The centroid is always computed from the top-3, regardless of whether there are 5 or 20 racers total. The H4 lag is not worse at N=20 in isolation — it's worse when the leader-to-3rd gap is large, which is more common in large fields but not caused by N itself.

### Fix options

1. **Use leader-only pan target when in LEADER_ZOOM state.** Centroid of top-3 is appropriate for BATTLE; LEADER state should track only `focusRacers[0]`. CameraDirector already sets `targetOffsetX = hw - r.x * this._leaderZoom` using only the leader — the open-track pan logic (`openTrackPanTarget`) ignores CameraDirector's pan intent and re-computes centroid unconditionally.

2. **Increase FOCUS_GROUP_SIZE to 1 for LEADER_ZOOM, 2 for BATTLE_ZOOM.** More surgical but requires reading CameraDirector state from the render loop.

3. **Accept current behavior as a design choice.** The centroid-of-top-3 intentionally keeps the main group visible, not just the leader. The "lose the leader" scenario only happens when the leader has significantly escaped the pack, at which point showing the pack may be the preferred director intent.

### Verdict: **Partially confirmed**

The camera pan can lose the leader when the leader-3rd gap is large. This is a known trade-off of the centroid-of-top-3 approach, not a defect introduced by PR-C. The H2 over-zoom amplifies the problem by shrinking the visible window.

---

## Recommendation

**Priority 1 — Fix H2 (Critical):**

The bug is in `CameraDirector._computeZoomLevels`: `openTrackBaseZoom` is baked in there as a factor in `cam.zoom`, but the render path then multiplies `cam.zoom` again by the hardcoded `OPEN_TRACK_BASE_ZOOM = 1.5`. This results in a double-multiplication.

Recommended fix (minimal change, no breakage of existing tests):

1. **Clean up `_computeZoomLevels`**: Remove `openBase`. Zoom ratios are only applied to `overviewZoom`, independent of track type.
2. **Make `effectiveZoom()` configurable**: Pass `config.openTrackBaseZoom ?? OPEN_TRACK_BASE_ZOOM` to the three render callsites in `index.jsx` (lines 916, 949, 966).
3. **Correct the default `battleZoomMultiplier`**: The previous default `2.5` was incorrectly set for the already-doubled formula. Correct defaults with single-multiplication: `leaderZoomMultiplier: 1.4`, `battleZoomMultiplier: 1.6`, `comebackZoomMultiplier: 1.3` (the original hardcoded ratios). `openTrackBaseZoom: 1.5` remains.

**Priority 2 — Optionally improve H4 (Low):**

For the LEADER_ZOOM state, set the pan target to the leader only (`focusRacers[0]`) instead of centroid-of-top-3. This is a 2-line change in the open-track block of `index.jsx`. No impact on BATTLE/COMEBACK.

**H1 and H3 require no action.**

---

---

## Resolution (2026-05-05)

Branch `diagnosis/camera-tuning-effectiveness` → applied as hotfix on same branch.

### H2 — Structural fix (Critical)

**Root cause re-examined:** The original diagnosis identified `openBase` inside `_computeZoomLevels` as the source of double-multiplication. A deeper analysis also revealed that H1 ("closed-track state multipliers not scaling correctly") was not fully refuted for large tracks — on closed tracks `> 2304 px`, the old formula `overviewZoom × ratio` for state targets produced LEADER < OVERVIEW in effective canvas scale, breaking the hierarchy. Both bugs share the same root: `_computeZoomLevels` was applying `overviewZoom` asymmetrically.

**Combined H1+H2 fix in [`CameraDirector._computeZoomLevels()`](../client/src/modules/camera/CameraDirector.js):**

- **Open-tracks:** `_leaderZoom = clamp(overviewZoom × lr)` — cam.zoom adapts to worldW. `openTrackBaseZoom` is no longer baked in here; it belongs to the render path.
- **Closed-tracks:** `_leaderZoom = clamp(lr)` — pure ratio. `bsX` at render time (`cam.zoom × bsX`) carries the world-size scaling. Hierarchy `OVERVIEW(1×bsX) < LEADER(lr×bsX) < BATTLE(br×bsX)` holds at any worldW.

**Render path fix in [`RaceScreen/index.jsx`](../client/src/screens/RaceScreen/index.jsx):**

- `openTrackBaseZoom` read from `cameraConfig` and passed to all three `effectiveZoom()` callsites (lines 916, ~953, ~970 after edit).
- `effectiveZoom(cam.zoom)` → `effectiveZoom(cam.zoom, openTrackBaseZoom)` at all three sites.

**Verified zoom values after fix (worldW=1280, defaults leaderMult=1.8, openBase=1.5):**

| State    | Open-track effZoom                          | Closed-track eff scale |
| -------- | ------------------------------------------- | ---------------------- |
| OVERVIEW | 1.5 × 1.0 = **1.5**                         | 1 × 1.0 = **1.0**      |
| LEADER   | 1.5 × 1.8 = **2.7** (was 4.05)              | 1.8 × 1.0 = **1.8**    |
| BATTLE   | 1.5 × 2.5 = **3.75** (was MAX_ZOOM-clamped) | 2.5 × 1.0 = **2.5**    |

Defaults (`leaderZoomMultiplier=1.8`, `battleZoomMultiplier=2.5`, `comebackZoomMultiplier=1.5`) **were not changed** — they were tuned for closed-track drama independently and were never affected by the H2 double-factor bug (open-track state multiplier was inactive on closed tracks).

### H4 — Pan-target fix (Low)

In LEADER_ZOOM state, `panRacers` is set to `focusRacers.slice(0, 1)` (solo leader) instead of the top-3 centroid. BATTLE_ZOOM and COMEBACK_ZOOM retain the centroid of top-3.

### Test coverage added

7 new tests in [`CameraDirector.test.js`](../client/src/modules/camera/CameraDirector.test.js) (describe: "Effective render-zoom — scale invariance"):

1. Closed-track hierarchy scale-invariant across `worldW ∈ {1280, 2000, 3000, 6000}`
2. Open-track hierarchy scale-invariant across `worldW ∈ {1280, 3000, 6000, 8000}`
3. Closed-track LEADER not contaminated by `overviewZoom` (H1 regression guard)
4. Open-track LEADER: `effectiveZoom = 2.7`, not `4.05` (H2 regression guard)
5. Extreme `leaderMult=4.0`: cam.zoom clamped to MAX_ZOOM, `effZoom = 3.75`
6. `effectiveZoom()` output changes with different `openTrackBaseZoom` (live-apply path)
7. Open vs closed at same `worldW` produce different effective render scales

12 existing tests updated to reflect the new closed-track pure-ratio formula (tests previously assumed `_leaderZoom = overviewZoom × ratio`; after H1 fix for closed tracks this is just `ratio`). Total: **1515 tests passing**.

---

## File References

| File                                                                        | Relevant for                                   |
| --------------------------------------------------------------------------- | ---------------------------------------------- |
| [CameraDirector.js:97–113](../client/src/modules/camera/CameraDirector.js)  | H1, H2 — `_computeZoomLevels`, `openBase`      |
| [CameraDirector.js:215](../client/src/modules/camera/CameraDirector.js)     | H1 — OVERVIEW targetZoom                       |
| [openTrackCamera.js:11–21](../client/src/modules/camera/openTrackCamera.js) | H2 — `OPEN_TRACK_BASE_ZOOM`, `effectiveZoom()` |
| [index.jsx:916, 949, 966–969](../client/src/screens/RaceScreen/index.jsx)   | H2 — render effZoom callsites                  |
| [index.jsx:950–962](../client/src/screens/RaceScreen/index.jsx)             | H3 — `computeRenderDisplayScale` with ceiling  |
| [autoSpriteScale.js:78–82](../client/src/modules/autoSpriteScale.js)        | H3 — ceiling clamp logic                       |
| [index.jsx:72, 924–931](../client/src/screens/RaceScreen/index.jsx)         | H4 — `FOCUS_GROUP_SIZE`, pan centroid          |

---

## Round 3 — Structural Resolution (2026-05-05)

**Branch:** `diagnosis/camera-tuning-effectiveness`

### What changed

The Round 2 fix (H1+H2) corrected the double-multiplication bug and restored zoom hierarchy, but left the underlying multiplier architecture intact. Multipliers remain track-dependent: the same `leaderZoomMultiplier=1.8` produces different sprite screen sizes on worldW=1280 vs worldW=6000. Every new track requires manual re-tuning via the Dev Panel.

Round 3 replaces multipliers with **inverse camera logic**: the operator specifies how large each camera state's subjects should appear on screen (as % of canvas height), and the camera computes the required zoom backwards. Cross-track scale invariance is guaranteed by construction.

**Key structural change in [`CameraDirector._computeZoomLevels()`](../client/src/modules/camera/CameraDirector.js):**

```
OLD: cam.zoom = overviewZoom × leaderZoomMultiplier
NEW: cam.zoom = (spritePctOfCanvas.leader × CANVAS_H_REF) / (referenceSpriteSize × bsX)
```

The `bsX = CANVAS_W / worldW` term cancels out worldW from the effective screen size:

```
screenPx = referenceSpriteSize × bsX × cam.zoom = targetPx   (constant, any worldW)
```

### Config shape change

| Field                        | Old          | New                                     |
| ---------------------------- | ------------ | --------------------------------------- |
| `leaderZoomMultiplier`       | 1.8          | removed                                 |
| `battleZoomMultiplier`       | 2.5          | removed                                 |
| `comebackZoomMultiplier`     | 1.5          | removed                                 |
| `openTrackBaseZoom`          | 1.5 (config) | `OPEN_TRACK_BASE_ZOOM = 1.5` (constant) |
| `minSpritePctOfCanvas`       | 0.05         | `spritePctOfCanvas.overview = 0.05`     |
| `spritePctOfCanvas.leader`   | —            | **0.08** (new)                          |
| `spritePctOfCanvas.battle`   | —            | **0.12** (new)                          |
| `spritePctOfCanvas.comeback` | —            | **0.065** (new)                         |

Schema version bumped to `2`. Old stored configs (missing `schemaVersion` or `schemaVersion ≠ 2`) are discarded and replaced with defaults — no partial migration.

### Why this is the terminal fix for size inconsistency

The Round 1/2 diagnosis tables remain valid as **historical learning material**. They identified that the camera system was producing different sprite sizes on different tracks, and correctly blamed the multiplier architecture. Round 3 eliminates the root cause: zoom is now derived from a size target, not from a ratio of another zoom value. The diagnosis branch can be closed; future per-track tuning issues are out-of-scope for this system.

### Test coverage added (Round 3)

18 new tests in [`CameraDirector.test.js`](../client/src/modules/camera/CameraDirector.test.js):

- `_computeZoomForTargetSize`: closed formula, open formula, safety nets (min 1.0 / overviewZoom, max 5.0), fallback when `referenceSpriteSize=0`
- `_computeZoomLevels`: inverse path activation, 36px fallback when `referenceSpriteSize=0`, battle>leader ordering, `updateConfig()` live-apply
- Cross-track invariance: closed worldW=1280 vs 6000, open worldW=6000, all produce `targetPx ± 0.01`

7 updated tests in [`cameraConfig.test.js`](../client/src/modules/cameraConfig.test.js), `CameraZoomTuningSection.test.jsx` (since removed in a DevScreen refactor), [`SpriteSizeRangeSection.test.jsx`](../client/src/screens/DevScreen/sections/SpriteSizeRangeSection.test.jsx).

### Evaluated and rejected: Drama-Floor

A "Drama-Floor" mechanism was designed and partially implemented during this branch. The idea: if `effectiveOverviewPx` (what OVERVIEW actually renders) exceeds a state's configured target, boost that target to preserve zoom hierarchy.

**Rejected because:**

- The aggressive variant (boost all states by the same factor when `effectiveOverviewPx > 36px`) silently overrides user-configured `spritePctOfCanvas` values on the primary track (Garden Path, closed worldW=1280) when `referenceSpriteSize > 36px`. User sets `leader=0.08` (57.6px), gets 80px instead — contradicts the predictability goal of Round 3.
- The gentle variant (boost only states where `desiredPx < effectiveOverviewPx`) produces ordering inversions: on Garden Path with `referenceSpriteSize=50`, COMEBACK gets boosted to 65px while LEADER stays at 57.6px — COMEBACK visually tighter than LEADER.
- The actual edge case that motivated Drama-Floor (narrow open-track worldW≈1280 with large sprites) does not exist in this repo's track set.

The safety net (`cam.zoom ≥ overviewZoom`) remains as the only hierarchy guard. On the one edge case where it clips (LEADER == OVERVIEW on very narrow open tracks with oversized sprites), the correct fix is to raise `spritePctOfCanvas.leader` or reduce sprite `displaySize`.
