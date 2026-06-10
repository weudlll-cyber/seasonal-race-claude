# BG-LAYER-PLAN — Separating the static background onto its own GPU layer

**Date:** 2026-06-09  
**Start point:** backup/pre-zoomfloor / master HEAD  
**Status:** Analysis only — zero source changes.

---

## 1. Current render structure

### 1a. Canvas elements

**Single `<canvas>` element** — `client/src/screens/RaceScreen/index.jsx:1548`

```jsx
<canvas ref={canvasRef} width={CW} height={CH} className="race-canvas" />
```

- Dimensions: 1280 × 720 (constants `CANVAS_W` / `CANVAS_H`, index.jsx:106–110)
- Context: `canvas.getContext('2d', { alpha: false })` at index.jsx:352 — **opaque, no alpha layer**
- CSS: `display: block; width: 100%; height: auto;` — no transform, no z-index (RaceScreen.css:48–52)
- Wrapper: `position: relative` (RaceScreen.css:36) to allow absolute-positioned React HUD overlays
- **Minimap:** draws directly into this context at screen-space coords — no second canvas (Minimap.js:28–130)
- **All track effects:** render via `inst.render(ctx)` into this context (index.jsx:1383–1387)

### 1b. Per-frame draw order in the rAF loop

```
index.jsx:773   ctx.clearRect(0, 0, 1280, 720)          ← whole canvas cleared
                [physics + state updates — no drawing]
index.jsx:1374  ctx.save()
index.jsx:1375  ctx.translate(cam.offsetX, cam.offsetY) ← pan
index.jsx:1378  ctx.scale(effZoom, effZoom)             ← zoom (open track)
         :1380  ctx.scale(cam.zoom*bsX, cam.zoom*bsY)   ← zoom (closed track)

  ── world-space block (all in camera transform) ──────────────────────────
  :1382  drawEditorBackground(ctx, ts, bgImagePath, worldW, worldH)
           ↳ trackRendering.js:38  ctx.drawImage(darkenedOffscreenCanvas, 0, 0)  ← BIG cost
           ↳ trackRendering.js:69  ctx.arc(...)  × 13 stars  (animated globalAlpha)
           ↳ trackRendering.js:80  ctx.fillRect(0,0,ww,58)   dark band
           ↳ trackRendering.js:81  ctx.ellipse(...)  × 282 crowd (animated bob)
           ↳ trackRendering.js:97  ctx.arc(...)  sun gradient

  :1383  for inst of effects: ctx.save(); inst.render(ctx); ctx.restore()
  :1388  drawEditorTrackSurface(ctx, shape)         (closed-track finish line)
  :1389  drawTrackLights(ctx, ...)
  :1390  drawOpenTrackFinishLine(ctx, ...)          (open-track only)
  :1392  drawParticles(ctx, dustParticles, burstParticles)
  :1393  drawSurfaceTrails(ctx, racers)
  :1397  drawRacers(ctx, st, racerType, ...)
  :1414  drawBattleDiagMarkers(ctx, ...)
  ──────────────────────────────────────────────────────────────────────────

index.jsx:1426  ctx.restore()

  ── HUD / screen-space block (no camera transform) ────────────────────
  :1427  drawTitleOpen / drawTitle / drawLapInfo / drawFinalLapOverlay
  :1436  drawPriorityModeOverlay
  :1450  drawCountdownOverlay / drawFinishedOverlay
  :1457  Race Plan status badge (direct ctx calls)
  :1468  renderMinimap(ctx, ...)      ← draws into main ctx at screen-space coords
  ──────────────────────────────────────────────────────────────────────────
```

### 1c. The background-specific path

`drawEditorBackground` (`trackRendering.js:33–112`) mixes two distinct layers:

| Sub-draw | Type | Cost | Animated? |
|---|---|---|---|
| `ctx.drawImage(darkenedOffscreenCanvas, 0, 0)` | Static image blit | **HIGH** — samples ~25% of 24 MP texture at N=8 OVERVIEW | No |
| 13 star arcs (`globalAlpha` per frame) | Programmatic | Negligible | Yes (fade) |
| Dark band `fillRect` | Programmatic | Negligible | No |
| 282 crowd ellipses (y±2 bob) | Programmatic | Moderate | Yes (bob) |
| Sun radial gradient | Programmatic | Small | No |

**The OffscreenCanvas** is `new OffscreenCanvas(worldW, worldH)` = **6000×4000 = 24 MP**, cached in `_darkenedBgCache` keyed by `${path}_${ww}x${wh}` (trackRendering.js:10). Created once per (track, world-size) combination; reused every frame.

---

## 2. The camera transform

**Every frame** (index.jsx:1374–1381):

```js
ctx.save();
ctx.translate(cam.offsetX, cam.offsetY);   // pan in screen pixels
if (isOpenTrack) {
  const effZoom = effectiveZoom(cam.zoom, OPEN_TRACK_BASE_ZOOM); // cam.zoom × 1.5
  ctx.scale(effZoom, effZoom);             // uniform scale
} else {
  ctx.scale(cam.zoom * bsX, cam.zoom * bsY); // per-axis scale (closed track)
}
```

`cam.offsetX/Y` and `cam.zoom` come from `CameraDirector.update()` (called at index.jsx:1317–1329). `resolveCamera` already applies world-edge clamping before these values reach the canvas — the transform is always safe.

A separate background layer driven by the **same** `cam.offsetX`, `cam.offsetY`, and `effZoom` values will be perfectly aligned, because those values are the sole source of truth.

---

## 3. Feasibility of each approach

### Approach (a) — Separate `<canvas>` behind world canvas, driven by CSS transform

**Mechanism:** Add a second `<canvas>` of size `worldWidth × worldHeight` (6000×4000), stacked behind the world canvas via CSS `position: absolute`. Each frame update its CSS transform:

```css
transform-origin: 0 0;
transform: translate(Xpx, Ypx) scale(Z);   /* same cam.offsetX/Y + effZoom */
will-change: transform;
```

Chrome promotes a `will-change: transform` canvas to a **GPU compositor layer**. Once promoted, a change to `transform` is resolved entirely by the GPU's matrix unit — **no re-rasterization, no texture re-read** — the existing 24 MP texture is just repositioned.

The world canvas (`alpha: true`, now transparent) redraws only dynamic content: crowd, stars, effects, racers, particles, HUD.

**Pros:**
- Eliminates per-frame background rasterization completely
- Works for pan + zoom + world-edge clamping (all derived from same cam values)
- No change to CameraDirector, physics, or any game logic
- Reversible — adding/removing the second canvas is a localised RaceScreen change

**Cons and risks:**
- World canvas must switch from `alpha: false` to `alpha: true` (index.jsx:352) — adds GPU alpha-compositing step per frame, but far cheaper than reading 24 MP
- Sub-pixel alignment: CSS transform applies independently of canvas2D. Float rounding in `cam.offsetX` may cause 1-subpixel gap on HiDPI screens. Must be tested.
- The background canvas is 6000×4000 — a **96 MB GPU texture** (same as the OffscreenCanvas). VRAM usage is unchanged; the benefit is per-frame COST, not memory.
- `drawEditorBackground` must be split: image-blit stays on bg canvas (draw once), animated crowd + stars stay on world canvas (keep per-frame).
- On hot-reload or track change, the bg canvas must be invalidated and redrawn.

**Alignment with existing systems:**

| System | Impact |
|---|---|
| World-edge clamping (`resolveCamera`) | ✓ None — clamp is inside `cam.offsetX/Y` before CSS transform uses them |
| OVERVIEW radial offset | ✓ None — CameraDirector computes offsetX/Y; CSS gets the already-offset values |
| FINISH_OVERVIEW gradual zoom-out | ✓ None — cam.zoom lerps smoothly; CSS transform follows each frame |
| Minimap | ✓ None — draws in screen space on world canvas; unaffected |
| Track effects (`inst.render(ctx)`) | ✓ None — drawn into world canvas (transparent layer) |
| Particles, racers | ✓ None — world canvas |
| HUD overlays (React components) | ✓ None — `position: absolute` over canvases |
| Screenshot / canvas export | ✓ None — no export feature in RaceScreen (`toDataURL` only exists in spritesheetBuilder.js) |
| Perf probe (`recordFrame`, `recordFrameCamera`) | ✓ None — measures inter-rAF gaps, unaffected |

**Key insight on animated crowd:** The 282 crowd members at world `y=0–58` are off-screen during OVERVIEW on open tracks (camera centered ~y=2000 world, crowd projects to screen y ≈ −400 with effZoom=0.39). Baking them into the static bg canvas would have **zero visual impact in the problematic scenario** and simplify the split. The twinkle animation in stars (±0.4 globalAlpha at 0.001 rad/ms) is subtle enough that a static bake is acceptable for the performance fix.

### Approach (b) — `<img>` or CSS background layer

Equivalent to approach (a) for the image, but uses an `<img>` tag instead of a canvas. The animated crowd and stars cannot be in an `<img>`, so they stay in the world canvas regardless. Offers no advantage over (a) and loses the ability to draw the darkened overlay into the bg layer without a canvas. **Not recommended.**

### Approach (c) — Single canvas, sub-rect blit (no architecture change)

Replace:
```js
ctx.drawImage(darkened, 0, 0)  // full 6000×4000 in scaled context
```
with the 9-argument form:
```js
// before ctx.scale():
const srcX = -cam.offsetX / effZoom;
const srcY = -cam.offsetY / effZoom;
ctx.drawImage(darkened, srcX, srcY, CANVAS_W/effZoom, CANVAS_H/effZoom, 0, 0, CANVAS_W, CANVAS_H);
```

This reads the same ~24.9% of the source texture that the current approach reads. **The GPU work is identical** — the bottleneck is source texel sampling, not the transform math. The only gain is removing the world-space transform from the background draw (minor shader simplification).

**Verdict: partial win at best (<10% GPU saving), high complexity for almost no gain. Not recommended as the primary fix.**

---

## 4. Everything that assumes one canvas

The following would be affected by a two-canvas architecture:

| Location | Assumption | Risk with two-canvas |
|---|---|---|
| index.jsx:352 | `getContext('2d', { alpha: false })` — opaque canvas | Must change to `alpha: true` for compositor to see through |
| index.jsx:773 | `ctx.clearRect(0, 0, CW, CH)` — clears all per frame | Correct — clears transparent world canvas. Bg canvas has no `clearRect` (static). |
| trackRendering.js:38 | `ctx.drawImage(darkened, 0, 0)` — background drawn per frame | Remove from world canvas; replace with one-time draw to bg canvas |
| trackRendering.js:80–90 | Crowd drawn in same call as image | Must stay in world canvas (if kept animated) or be folded into bg canvas (if baked static) |
| `_darkenedBgCache` (trackRendering.js:7) | Keyed by `${path}_${ww}x${wh}` | Now the bg canvas IS the cache target — OffscreenCanvas becomes intermediate, not the end render target |
| RaceScreen.css:.race-canvas | Single canvas with no stacking | Must add second canvas to JSX; CSS wrapper needs stacking context |
| index.jsx:1383–1387 | Effects `render(ctx)` with world transform | No change — effects stay on world canvas |
| index.jsx:1468 | Minimap draws into main ctx | No change — stays on world canvas |

---

## 5. Recommended approach and implementation outline

### Recommendation: **Approach (a) — separate bg canvas, bake crowd into static layer**

**Why it's lowest-risk:**
- Only RaceScreen JSX + `trackRendering.js` change — ≤ 60 lines total
- No physics, camera, or config logic touched
- Default is reversible by removing the bg canvas JSX
- Baking the crowd into the static layer is safe (off-screen in OVERVIEW, barely visible at low zoom)

**Expected GPU impact:**
- Before: GPUTask at OVERVIEW N=8 (effZoom=0.39) ≈ 110–160 ms → vsync stall at ~20 fps
- After: GPUTask ≈ cost of world canvas only (racers + effects + HUD) — should be ~10–25 ms
- Net: inter-rAF p90 gap drops from 115 ms to ≤ 25 ms (measured with `window.__perfProbeZoom()`)

### Step-by-step commits (each reversible, tagged before merging)

**Commit 1 — bg canvas infrastructure, no behavior change**  
`trackRendering.js`: Extract `getBgCanvasReady(bgImg, path, ww, wh)` function that returns the prepared OffscreenCanvas (existing logic, just a rename). No functional change.

**Commit 2 — bg canvas element + CSS stacking**  
`index.jsx`: Add `bgCanvasRef = useRef(null)` and a second `<canvas>` element in JSX:
```jsx
<div style={{ position: 'relative' }}>
  <canvas ref={bgCanvasRef} width={worldWidth} height={worldHeight}
    style={{ position: 'absolute', top: 0, left: 0, transformOrigin: '0 0',
             willChange: 'transform', imageRendering: 'pixelated' }} />
  <canvas ref={canvasRef} width={CW} height={CH} className="race-canvas"
    style={{ position: 'relative', zIndex: 1 }} />
</div>
```
Change world canvas context to `alpha: true`.  
No content drawn to bg canvas yet — world canvas still draws everything as before.  
**Verify:** game looks identical (bg canvas is empty transparent).

**Commit 3 — draw bg to bg canvas once; CSS-transform it each frame**  
`index.jsx` race init (after `initProbe()`):
```js
// Draw static background to bg canvas (one-time)
const bgCtx = bgCanvasRef.current.getContext('2d');
const darkened = getBgCanvasReady(bgImg, bgImagePath, worldWidth, worldHeight);
if (darkened) bgCtx.drawImage(darkened, 0, 0);
```
In the rAF loop, BEFORE world drawing:
```js
// Update bg canvas CSS transform to match camera
if (bgCanvasRef.current) {
  const scaleX = isOpenTrack ? effZoom : cam.zoom * bsX;
  const scaleY = isOpenTrack ? effZoom : cam.zoom * bsY;
  bgCanvasRef.current.style.transform =
    `translate(${cam.offsetX}px,${cam.offsetY}px) scale(${scaleX},${scaleY})`;
}
```
`drawEditorBackground`: skip the `ctx.drawImage(darkened, 0, 0)` call (already composited by bg canvas).  
**Verify:** background visible, racers overlay correctly, no gap at edges, FINISH_OVERVIEW zooms out correctly.

**Commit 4 — measure and document**  
Run `?perfprobe=1` on Space Sprint N=8, OVERVIEW. Record `window.__perfProbeZoom()` gap p90 before and after. Update PROFILE-ANALYSIS.md with measured GPUTask drop.

**Commit 5 (optional) — bake crowd/stars into bg canvas**  
If visual inspection shows crowd and stars are acceptable as static (they are off-screen in OVERVIEW anyway), draw them into `bgCtx` during init as well. Removes 282 ellipse draws + 13 arc draws from the hot rAF path. Small secondary win.

### How to measure success

1. Start Space Sprint, N=8 Dragon racers, `?perfprobe=1`  
2. Wait for OVERVIEW (~15 s)  
3. DevTools console: `window.__perfProbeZoom()`  
4. Check `overview.p90` and `overviewZoomBuckets`:  
   - Before fix: p90 ≈ 115 ms  
   - After fix: p90 should be ≤ 25 ms (target: ~20 ms)  
5. DevTools Performance panel: record 5 s of OVERVIEW; `CrGpuMain::GPUTask` should be ≤ 30 ms per frame vs current 110–160 ms

### How owner verifies alignment visually

1. During OVERVIEW (zoomed out), check background image aligns with track geometry — no visible seam or offset
2. During leader zoom, pan and zoom quickly to stress-test the CSS transform update
3. During FINISH_OVERVIEW (slow zoom-out), verify background smoothly zooms with racers
4. On closed tracks: verify bsX/bsY non-uniform scale produces correct non-square aspect ratio

### Blast radius honestly

| Scope | Lines changed | Risk |
|---|---|---|
| `index.jsx` | ~35 (add canvas, add init, add CSS update, switch `alpha:false→true`) | Medium — core render loop |
| `trackRendering.js` | ~15 (skip image draw when bg canvas active, optional crowd bake) | Low |
| `RaceScreen.css` | ~5 (wrapper stacking context) | Low |
| Everything else | 0 | — |

**Unknown risks:**
- HiDPI / devicePixelRatio: CSS transform + canvas2D must agree on pixel density. The current canvas uses `width=1280 height=720` physical pixels; adding `devicePixelRatio` scaling (if any) must be consistent on both canvases.
- Browser variation: Chrome/Edge compositor promotes `will-change: transform` reliably. Firefox may not promote consistently — test cross-browser.
- Memory: world canvas switches to `alpha:true` — Chrome may allocate a separate compositing buffer (doubles 1280×720×4 = ~3.7 MB), but this is negligible.
- `bgCtx.drawImage(darkened, 0, 0)` draws the 6000×4000 OffscreenCanvas into the 6000×4000 bg canvas — this one-time draw at race init may cause a brief frame spike. Schedule after the first paint.
