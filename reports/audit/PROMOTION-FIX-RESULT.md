# PROMOTION-FIX-RESULT — Direction A: translate3d/scale3d

**Date:** 2026-06-10  
**Commit:** 986dc79 — `fix(bg-layer): use translate3d/scale3d to force 3D compositor layer promotion`  
**Before tag:** backup/pre-promote  
**After tag:** backup/promote-a (pending owner performance confirmation)

---

## 1. Change applied

Single-line edit in [index.jsx](../../client/src/screens/RaceScreen/index.jsx), rAF loop:

```js
// Before (2D — subject to Chrome layer squashing):
bgCanvasRef.current.style.transform =
  `translate(${tx}%, ${ty}%) scale(${scaleX}, ${scaleY})`;

// After (3D — forces compositor layer unconditionally):
bgCanvasRef.current.style.transform =
  `translate3d(${tx}%, ${ty}%, 0) scale3d(${scaleX}, ${scaleY}, 1)`;
```

Z-components are `0` / `1` — visual math is identical, no visual change.

---

## 2. Code verification (automated)

**3D transform confirmed active** (Playwright DOM capture during LEADER_ZOOM):
```
bgCanvas.style.transform = "translate3d(-31.6286%, -119.086%, 0px) scale3d(8.47625, 10.0459, 1)"
```

Spot-check of transform math (LEADER_ZOOM, open track, worldWidth=6000, worldHeight=4000):
- `scaleX = 8.476 → effZoom = 8.476 × 1280/6000 = 1.810`
- `scaleY = 10.046 → effZoom = 10.046 × 720/4000 = 1.808`
- Both axes → effZoom ≈ 1.81 ✓ (expected LEADER_ZOOM range)
- translate% components are non-integer → percentage formula working ✓

**Build:** clean (649 kB). **Unit tests:** 2598/121 passed.

**Visual alignment:** [bg-layer-3d-screenshot.png](bg-layer-3d-screenshot.png) — space background, 8 dragons,
track geometry, minimap, and HUD all rendering correctly. No visible drift or blur introduced
by the 3D function switch.

---

## 3. Performance measurement — OWNER REQUIRED

**Why Playwright cannot measure this:**  
Chrome throttles `requestAnimationFrame` to ~1 fps in background tabs. Both before and after
this change, Playwright records gaps of ~1016ms — this is the 1fps throttle, not actual render
time. The probe data is invalid for performance grading.

**This limitation is fundamental to Playwright measurement.** The owner must run in a foreground
Chrome window to obtain valid numbers.

---

## 4. Owner measurement steps (PROD build running on port 4173)

### 4a. Performance probe

1. Open **Chrome** (not a background tab) → `http://localhost:4173`
2. Setup: Space Sprint · Dragon · N=8 · Quick Test
3. Navigate to `/race` — the `_ra_perfprobe` sessionStorage key is already set (or add `?perfprobe=1` to URL)
4. Keep the tab **in the foreground** — do not switch away
5. Wait for OVERVIEW phase (~15–20 s into the race)
6. DevTools console:
   ```js
   window.__perfProbeZoom()
   ```
   Record `overview.p50`, `overview.p90`, and `nonOverview.p50`.

**Grading (vs pre-fix baseline: OVERVIEW p50=33.3ms, nonOverview p50=16.7ms):**

| Band | OVERVIEW p90 | Interpretation |
|---|---|---|
| FULL success | ≈ 16.7ms | bg canvas promoted → 60fps OVERVIEW |
| PARTIAL | 18–25ms | Promoted but border-radius clip adds overhead |
| NO effect | ≈ 33ms | Still not promoted — canvas size likely the blocker |

### 4b. Layers panel check (required proof)

During OVERVIEW (before checking probe numbers):

1. DevTools → **More Tools → Layers** (or press `Escape`, then "Layers" in the panel list)
2. Look in the layer tree for canvas entries
3. Expected with 3D transform: bg canvas has **its own layer entry** (separate from world canvas), labeled with the canvas dimensions or "composited"
4. Previous state (2D transform): both canvases shared one layer entry, or bg canvas was missing

**What to report:** "bg canvas has own layer: YES/NO" and if yes, whether it shows "Composited" or similar label.

### 4c. DevTools Performance trace (optional but useful)

Record 5s during OVERVIEW → check `CrGpuMain::GPUTask` duration per frame.
- Before Direction A: 33ms per frame total (p50), GPUTask ~16ms per frame
- Expected after FULL success: GPUTask drops to ≤5ms per frame

---

## 5. Expected mechanism if Direction A succeeds

`translate3d` forces a 3D rendering context on the bg canvas, which unconditionally creates a
Chrome GraphicsLayer. The 6000×4000 bg canvas pixels are uploaded to GPU VRAM once (on
`bgCanvasReady = true`). Each subsequent frame, the compositor applies the 3D matrix to the
layer's GPU texture — no re-rasterization, no source-texel sampling cost. Only the world canvas
(1280×720) is re-rasterized each frame.

Expected CPU+GPU frame cost at OVERVIEW after promotion:
- bg canvas: 0ms (compositor matrix update only)
- world canvas: same as LEADER_ZOOM (~16ms) — stars, crowd, racers, HUD, minimap
- Net: OVERVIEW ≈ LEADER_ZOOM ≈ 16.7ms → 60fps ✓

---

## 6. If result is PARTIAL (~18–25ms, promoted but still elevated)

Direction B should be applied as an additional commit: move `border-radius: 8px` off
`.race-canvas-wrapper` to a `::before` or `::after` pseudo-element overlay with
`pointer-events: none`. This removes the rounded-clip requirement on the wrapper, eliminating
the secondary blocker identified in PROMOTION-DIAGNOSIS.md §Candidate 2.

Do NOT apply Direction B without first confirming the Layers panel shows promotion (Direction A
succeeded in promoting) and measuring the partial p90.

## 7. If result is NO effect (~33ms, Layers panel shows no separate bg canvas layer)

The 96MB canvas size is the remaining suspect (Candidate 3 in PROMOTION-DIAGNOSIS.md). Direction
C (replace bg canvas with a `<div>` + `background-image` + `::after` darken overlay) would
bypass the canvas pixel buffer entirely, which is more reliably promoted at any size.
Do not implement Direction C without owner go-ahead.

---

## 8. Alignment verification checklist for owner

After the translate3d change, verify in the browser:

- [ ] OVERVIEW: background image aligned with track geometry — no seam, no offset
- [ ] OVERVIEW: background pans correctly as the camera follows the field
- [ ] LEADER_ZOOM: background zooms and pans to follow the leader — no drift
- [ ] FINISH_OVERVIEW zoom-out: background smoothly scales out with the camera
- [ ] Closed track (e.g. Dirt Oval): non-uniform aspect ratio still correct — background fills properly
- [ ] No visible blur or pixelation introduced by the 3D function switch (should be identical to before)
