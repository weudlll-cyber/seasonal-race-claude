# Camera Tuning Effectiveness — Diagnosis Report

**Branch:** `diagnosis/camera-tuning-effectiveness`  
**Date:** 2026-05-04  
**Scope:** Read-only analysis. No code changes. Verifies/refutes four hypotheses (H1–H4) raised after PR-C browser testing.

---

## Executive Summary

| # | Hypothesis | Verdict | Severity |
|---|---|---|---|
| H1 | Closed-track state multipliers never fire | **Refuted** | — |
| H2 | Open-track BATTLE over-zoom (double-multiplication) | **Confirmed** | Critical |
| H3 | `maxTargetScreenPx` ceiling not applied | **Refuted** | — |
| H4 | Pan target loses leader at N=20 | **Partially confirmed** | Low (design trade-off) |

**Critical finding:** H2 is a genuine bug. `openTrackBaseZoom` is baked into `cam.zoom` inside `CameraDirector._computeZoomLevels()`, then the render path multiplies `cam.zoom` by the hardcoded `OPEN_TRACK_BASE_ZOOM = 1.5` constant a second time. On a standard 1280 px world with default config (`openTrackBaseZoom=1.5`, `battleZoomMultiplier=2.5`), the effective render scale hits `1.5 × 2.5 = 3.75` — the world is magnified ≈2.5× more than intended.

H1 and H3 are correct as implemented. H4 is a known design trade-off (centroid-of-top-3 lagging leader), not a defect.

---

## H1 — Closed-track state multipliers never fire

### Claim
Configuring `leaderZoomMultiplier=1.8` on a closed track produces no visible zoom change; the camera appears stuck at 1.0.

### Code path

`CameraDirector._computeZoomLevels` ([CameraDirector.js:97–113](../client/src/modules/camera/CameraDirector.js)):
```js
const openBase = this._isOpenTrack && config ? (config.openTrackBaseZoom ?? 1.0) : 1.0;
const leaderRatio = config?.leaderZoomMultiplier ?? LEADER_ZOOM_RATIO;
this._leaderZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.overviewZoom * openBase * leaderRatio));
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
const openBase = this._isOpenTrack && config ? (config.openTrackBaseZoom ?? 1.0) : 1.0;
this._battleZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.overviewZoom * openBase * battleRatio));
//                                                                           ^^^^^^^^ first application
```

With `overviewZoom=1.0`, `openBase=1.5`, `battleRatio=2.5`:
- `_battleZoom = clamp(1.0 × 1.5 × 2.5, 0.15, 2.5) = clamp(3.75, …) = 2.5` (hits MAX_ZOOM ceiling)

**Place 2 — open-track render path** ([index.jsx:916, 966–969](../client/src/screens/RaceScreen/index.jsx) and [openTrackCamera.js:19–21](../client/src/modules/camera/openTrackCamera.js)):
```js
// effectiveZoom always multiplies cam.zoom by the hardcoded constant:
export const OPEN_TRACK_BASE_ZOOM = 1.5;
export function effectiveZoom(directorZoom, baseZoom = OPEN_TRACK_BASE_ZOOM) {
  return baseZoom * (directorZoom || 1);  // ^^^^^^^^ second application
}
// Render:
const effZoom = effectiveZoom(cam.zoom);  // 1.5 * 2.5 = 3.75
ctx.scale(effZoom, effZoom);
```

### Numeric example (1280 px open track, default config)

| Parameter | Value |
|---|---|
| `overviewZoom` | 1.0 |
| `config.openTrackBaseZoom` | 1.5 |
| `config.battleZoomMultiplier` | 2.5 |
| `_battleZoom` (after `_computeZoomLevels`) | 2.5 (clamped from 3.75) |
| `cam.zoom` at BATTLE_ZOOM state | lerps to 2.5 |
| `effectiveZoom(2.5)` at render | **3.75** |
| Canvas scale applied | **3.75×** |
| Visible world width | 1280 / 3.75 = **341 px** of the world |

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
this._battleZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.overviewZoom * battleRatio));
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
    cameraConfig.minTargetScreenPx
  ),
  getEffectiveMaxTargetScreenPx(          // ← 5th param: ceiling passed
    racerTypeRef.current?.config?.maxTargetScreenPx,
    cameraConfig.maxTargetScreenPx
  )
);
```

`computeRenderDisplayScale` ([autoSpriteScale.js:78–82](../client/src/modules/autoSpriteScale.js)):
```js
const applyMax = maxTargetScreenPx != null && maxTargetScreenPx > minTargetScreenPx;
const targetScreenPx = applyMax ? Math.min(flooredScreenPx, maxTargetScreenPx) : flooredScreenPx;
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
const FOCUS_GROUP_SIZE = 3;  // line 72
const focusRacers = [...st.racers].sort((a, b) => b.t - a.t).slice(0, FOCUS_GROUP_SIZE);
const { targetX, targetY } = openTrackPanTarget(focusRacers, CW, CH, effZoom, camXMax, camYMax);
```

`openTrackPanTarget` returns the centroid of those 3 racers, centered in the viewport ([openTrackCamera.js:57–65](../client/src/modules/camera/openTrackCamera.js)).

### Numeric example

Scenario: leader at world x=1800, 2nd at x=1200, 3rd at x=1000 (N=20, effZoom=2.1 without config):

| | Value |
|---|---|
| Pan centroid x | (1800 + 1200 + 1000) / 3 = **1333** |
| Visible world width at effZoom=2.1 | 1280 / 2.1 = **610 px** |
| Camera window: `[centroid - visW/2, centroid + visW/2]` | [1028, 1638] |
| Leader at x=1800 | **162 px outside right edge** |

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

## Empfehlung

**Priorität 1 — H2 beheben (Critical):**

Der Bug liegt in `CameraDirector._computeZoomLevels`: `openTrackBaseZoom` wird dort als Faktor in `cam.zoom` eingebacken, aber der Render-Pfad multipliziert `cam.zoom` dann erneut mit dem hardkodierten `OPEN_TRACK_BASE_ZOOM = 1.5`. Das ergibt eine Doppelmultiplikation.

Empfohlene Lösung (minimale Änderung, kein Bruch bestehender Tests):

1. **`_computeZoomLevels` aufräumen**: `openBase` entfernen. Zoom-Ratios werden nur noch auf `overviewZoom` angewendet, unabhängig vom Track-Typ.
2. **`effectiveZoom()` konfigurierbar machen**: `config.openTrackBaseZoom ?? OPEN_TRACK_BASE_ZOOM` an den drei Render-Callsites in `index.jsx` übergeben (Zeilen 916, 949, 966).
3. **Default `battleZoomMultiplier` korrigieren**: Der bisherige Default `2.5` wurde fälschlicherweise für die bereits-gedoppelte Formel eingestellt. Korrekte Defaults mit einer einmaligen Multiplikation: `leaderZoomMultiplier: 1.4`, `battleZoomMultiplier: 1.6`, `comebackZoomMultiplier: 1.3` (die ursprünglichen Hardcode-Ratios). `openTrackBaseZoom: 1.5` bleibt.

**Priorität 2 — H4 optional verbessern (Low):**

Für LEADER_ZOOM-State den Pan-Target auf nur den Leader (`focusRacers[0]`) setzen statt Centroid-of-top-3. Dies ist eine 2-Zeilen-Änderung im Open-Track-Block von `index.jsx`. Kein Einfluss auf BATTLE/COMEBACK.

**H1 und H3 brauchen keine Aktion.**

---

## Datei-Referenzen

| Datei | Relevant für |
|---|---|
| [CameraDirector.js:97–113](../client/src/modules/camera/CameraDirector.js) | H1, H2 — `_computeZoomLevels`, `openBase` |
| [CameraDirector.js:215](../client/src/modules/camera/CameraDirector.js) | H1 — OVERVIEW targetZoom |
| [openTrackCamera.js:11–21](../client/src/modules/camera/openTrackCamera.js) | H2 — `OPEN_TRACK_BASE_ZOOM`, `effectiveZoom()` |
| [index.jsx:916, 949, 966–969](../client/src/screens/RaceScreen/index.jsx) | H2 — render effZoom callsites |
| [index.jsx:950–962](../client/src/screens/RaceScreen/index.jsx) | H3 — `computeRenderDisplayScale` with ceiling |
| [autoSpriteScale.js:78–82](../client/src/modules/autoSpriteScale.js) | H3 — ceiling clamp logic |
| [index.jsx:72, 924–931](../client/src/screens/RaceScreen/index.jsx) | H4 — `FOCUS_GROUP_SIZE`, pan centroid |
