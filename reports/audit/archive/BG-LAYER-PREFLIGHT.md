# BG-LAYER-PREFLIGHT — Pre-flight diagnosis before Commits 1–3

**Date:** 2026-06-09  
**Status:** READ-ONLY. No source changes. Owner reviews this before implementation begins.

---

## 1. Device Pixel Ratio / Canvas Sizing

**Exact evidence:**

```
index.jsx:352   const ctx = canvas.getContext('2d', { alpha: false });
index.jsx:353   ctx.imageSmoothingQuality = 'high';
index.jsx:1548  <canvas ref={canvasRef} width={CW} height={CH} className="race-canvas" />
                (CW=1280, CH=720 — constants at index.jsx:106–110)
RaceScreen.css:48–52:  .race-canvas { display: block; width: 100%; height: auto; }
```

No `devicePixelRatio` reference anywhere in the client source tree (confirmed via full-tree grep — zero matches). The world canvas is strictly **1280 × 720 physical canvas pixels**, no DPR scaling applied. CSS makes it fill its container (`width: 100%`), producing a CSS display size of `W_css × H_css` where `W_css` is whatever width the `.race-canvas-wrapper` occupies and `H_css = W_css × 720/1280` (aspect-ratio-preserved `height: auto`).

**CSS → physical pixel mapping:** The browser maps 1280 canvas columns to `W_css` CSS columns, so 1 canvas pixel = `W_css/1280` CSS px — a dynamic ratio that changes when the window is resized.

**Bg canvas recipe (size/CSS):** See §8. The critical constraint is that the bg canvas CSS dimensions must track the world canvas CSS dimensions; the formula is derived in §2 and §7.

---

## 2. The Exact Camera Values Per Frame

**World transform (index.jsx:1374–1381):**

```js
ctx.save();
ctx.translate(cam.offsetX, cam.offsetY);          // index.jsx:1375
if (isOpenTrack) {
  const effZoom = effectiveZoom(cam.zoom, OPEN_TRACK_BASE_ZOOM);  // :1377
  ctx.scale(effZoom, effZoom);                     // :1378  — uniform
} else {
  ctx.scale(cam.zoom * bsX, cam.zoom * bsY);      // :1380  — per-axis
}
```

**Where bsX/bsY come from (index.jsx:383–384):**

```js
const bsX = CANVAS_W / worldWidth;   // 1280 / worldWidth
const bsY = CANVAS_H / worldHeight;  // 720  / worldHeight
```

**Are bsX and bsY ever equal?** NO — never. All 10 server tracks are 3:2 aspect (worldWidth/worldHeight = 1.5). The canvas is 16:9 (1280/720 = 1.778). Therefore `bsX/bsY = (1280/worldWidth) / (720/worldHeight) = (1280 × worldHeight) / (720 × worldWidth) = (16/9) × (2/3) = 32/27 ≈ 1.185` for every track. Measured values for space-sprint (worldWidth=6000, worldHeight=4000): bsX=0.2133, bsY=0.1800. Non-uniform scale applies to ALL closed tracks and matters indirectly for open tracks too (explained in §7).

**Units of cam.offsetX / cam.offsetY:** Canvas pixel units (1280×720 coordinate space). Evidence from CameraDirector.js:

```js
// CameraDirector.js:2080  (open track)
this.offsetX = -camX * effZoom;       // camX in world px, effZoom scalar → result in canvas px

// CameraDirector.js:2094  (closed track)
this.offsetX = -camX * effZoomX;      // effZoomX = targetZoom × bsX → canvas px

// CameraDirector.js:1520–1521  (visibility check, confirms units)
const sx = r.x * effZoom + this.offsetX;   // r.x in world px × effZoom = canvas px; + offsetX = canvas px
```

`offsetX/Y` are always in **canvas px**, not CSS px.

**This is the #1 alignment-break risk** — see §8 for the correct CSS formula.

---

## 3. Background Cache Lifecycle

**Cache location:** `trackRendering.js:7` — `const _darkenedBgCache = new Map()` (module-level, lives for the session).

**Key:** `${path}_${ww}x${wh}` (trackRendering.js:10). Created on first call per (track, world-size) pair; persists until page reload. Invalidation: the key naturally changes if `worldWidth`, `worldHeight`, or `bgImagePath` changes (different track = different raceData → `useEffect([raceData])` re-runs → new race init).

**Image loading lifecycle (bgImageCache.js:20–46):**

```js
export function getBackgroundImage(path) {
  // ...
  img.onload = () => { record.ready = true; };
  img.src = path;
  _cache.set(path, record);
  return null;               // ← returns null until onload fires
}
```

`getBackgroundImage` is asynchronous. At race init (which runs at React mount / raceData change), the image may not yet be loaded — `getBackgroundImage` returns `null`, and `_getOrCreateDarkenedBg` returns `null` when bgImg is null.

**When is it safe to draw to the bg canvas?** Only when `getBackgroundImage(bgImagePath)` returns non-null (image loaded). This cannot be guaranteed at race init. A retry on the first rAF frame where the image is available is required. Typical load time on localhost is 50–200 ms; the image is often not ready at the synchronous init block.

**On track change / hot-reload:** `raceData` changes → `useEffect` re-runs → `cancelled = true` + `cancelAnimationFrame` + new init. The bg canvas ref stays valid (DOM element persists) but its content must be redrawn for the new track. The new init block does this.

---

## 4. What Is Inside `drawEditorBackground` Beyond the Image Blit

Full breakdown of `trackRendering.js:33–112`:

| Sub-draw | Lines | Type | World space? | Animated? | Disposition |
|---|---|---|---|---|---|
| `ctx.drawImage(darkened, 0, 0)` | :38 | Static image blit | Yes (world 0,0) | No | → **bg canvas** |
| Fallback 2-step draw (no OffscreenCanvas) | :41–43 | Static | Yes | No | → bg canvas (or world canvas as fallback) |
| Animated gradient sky | :46–52 | `createLinearGradient` + fillRect | Yes | Yes (pulse) | → world canvas (only runs when `bgPath === null`) |
| 13 star arcs (`globalAlpha` per frame) | :69–75 | `ctx.arc` × 13 | Yes | Yes (fade) | → world canvas |
| Dark band `fillRect(0,0,ww,58)` | :78 | fillRect `rgba(14,7,2,0.92)` | Yes | No | → world canvas |
| Crowd ellipses (y ± 2 bob) | :81–90 | `ctx.ellipse` × ≥60 | Yes | Yes (bob) | → world canvas |
| Separator line | :91–96 | stroke | Yes | No | → world canvas |
| Sun radial gradient | :97–111 | `createRadialGradient` + arc | Yes | No | → world canvas |

**Conclusion:** Removing ONLY `ctx.drawImage(darkened, 0, 0)` (line :38, inside the `if (bgImg && darkened)` guard) leaves all animated parts (stars, crowd, dark band, sun) intact on the world canvas. The gradient sky branch (lines :46–52) only runs when `bgPath === null`, which is the case where no bg canvas is needed — no behavioural change.

The dark band (`rgba(14,7,2,0.92)`) is nearly opaque and drawn in world space at y=0–58. With the world canvas switched to `alpha:true`, this composites correctly over the bg canvas. It's intentional (crowd separator) and unaffected.

---

## 5. Stacking / Overlays

**Wrapper CSS (RaceScreen.css:35–44):** `position: relative; overflow: hidden`. No z-index — does NOT create a stacking context.

**HUD overlays (all `position: absolute` inside the wrapper):**

| Component | z-index | Source |
|---|---|---|
| CameraStateHUD | 10 | CameraStateHUD.css:20 |
| StateOverlay | 15 | StateOverlay.css:28 |
| BattleDiagHUD | auto (none) | inline style |
| CameraDiagnosticsHUD | auto (none) | inline style |
| CameraFrameLogHUD | auto (none) | inline style |
| ComebackDiagHUD | auto (none) | inline style |
| LeadChangeDiagHUD | auto (none) | inline style |
| PerfLogHUD | auto (none) | inline style |
| RacePlanHUD | auto (none) | inline style |

**Plan:** No explicit z-index needed on either canvas. Use DOM order alone:
1. bg canvas (`position: absolute`, first in JSX) — paints first, at the bottom
2. world canvas (normal flow, existing `className="race-canvas"`) — paints above (later in DOM)
3. All HUDs (`position: absolute`, after both canvases in DOM) — paint above by DOM order; those with z-index:10/15 are even higher

The bg canvas with `will-change: transform` creates its own stacking context, but at z-index:auto within the wrapper's containing stacking context. The HUDs at z-index:10 and z-index:15 are above z-index:auto elements regardless. ✓

**Minimap:** `renderMinimap(ctx, shape, ...)` at index.jsx:1472 draws into `ctx` (the world canvas) in screen space, after `ctx.restore()` (no camera transform active). It stays on the world canvas with zero change. ✓

---

## 6. Alpha Change Impact

**Current:** `ctx = canvas.getContext('2d', { alpha: false })` at index.jsx:352. Opaque canvas — the GPU does not need a destination alpha channel.

**Change:** → `{ alpha: true }`. The GPU allocates an alpha channel for the world canvas and composites it over whatever is behind (the bg canvas). This is strictly cheaper than the current `ctx.drawImage(darkened, 0, 0)` 24MP blit.

**`clearRect` behaviour:** `ctx.clearRect(0, 0, CW, CH)` at index.jsx:773 on an `alpha:true` canvas writes `(0,0,0,0)` (fully transparent) to every pixel. This is correct — the world canvas becomes transparent each frame, then drawing functions add only dynamic content. The bg canvas shows through wherever the world canvas is transparent. ✓

**Any fillRect that blocks the bg canvas?** Only one non-overlay fillRect in the rAF loop after `ctx.restore()`:
```
index.jsx:1460  ctx.fillRect(CW - 172, 8, 164, 22)  ← RP status badge, 164×22 px in screen space
```
This covers a tiny corner area and is intentional. ✓

**Dark band in world space** (`fillRect(0,0,ww,58)` in `drawEditorBackground`): draws `rgba(14,7,2,0.92)` in world space under the camera transform. Composites correctly over the bg canvas — the dark band will appear on top of the background image as intended. ✓

**Gradient sky** (`!bgImg` branch of `drawEditorBackground`): fills the full canvas with a gradient when `bgImagePath === null`. In that case, no bg canvas is used — the gradient is on the world canvas alone. With `alpha:true`, this gradient (fully opaque fill) would still cover the whole canvas, hiding the empty bg canvas below. ✓

**No code relies on the opaque backdrop** — confirmed by reading every draw call in the rAF loop. No call assumes the canvas has a pre-existing colour behind it.

---

## 7. Closed-Track Aspect — Non-Uniform Scale

**World canvas (closed track):** `ctx.scale(cam.zoom * bsX, cam.zoom * bsY)` — non-uniform, because bsX ≠ bsY for every track.

**Math proof that `scale(cam.zoom, cam.zoom)` is correct for the bg canvas:**

Given bg canvas CSS `width:100%; height:100%` (inherits W_css × H_css from wrapper):
- 1 bg canvas pixel at position (wx, wy) is displayed at CSS px `(wx × W_css/worldWidth, wy × H_css/worldHeight)` before any transform.

CSS transform `translate(Tx%, Ty%) scale(Sx, Sy)` maps that CSS px to:
```
screen_x = wx × W_css/worldWidth × Sx  +  Tx% × W_css/100
screen_y = wy × H_css/worldHeight × Sy +  Ty% × H_css/100
```

Target (matching world canvas, where H_css/720 = W_css/1280):
```
screen_x = (wx × cam.zoom × bsX + offsetX) × W_css/1280
         = wx × cam.zoom × W_css/worldWidth  +  offsetX × W_css/1280
screen_y = (wy × cam.zoom × bsY + offsetY) × H_css/720
         = wy × cam.zoom × H_css/worldHeight  +  offsetY × H_css/720
```

Solving:
```
Sx = cam.zoom      (W_css/worldWidth cancels)
Sy = cam.zoom      (H_css/worldHeight cancels)
Tx% = offsetX × 100/CANVAS_W   (W_css cancels via percentage)
Ty% = offsetY × 100/CANVAS_H   (H_css cancels via percentage)
```

**For closed tracks: CSS `scale(cam.zoom, cam.zoom)` is correct** — uniform! The per-axis bsX/bsY stretch is already built into the browser's display scaling of the bg canvas (6000×4000 → W_css×H_css maps the 3:2 world into the 16:9 CSS box, exactly replicating the bsX/bsY transform). The CSS `scale(cam.zoom)` adds only the zoom on top. ✓

**For open tracks:** The world canvas uses uniform `scale(effZoom, effZoom)`. But because worldWidth/worldHeight = 3:2 ≠ 16:9, the CSS scale must compensate for the display scaling of the bg canvas:

```
Sx = effZoom × worldWidth / CANVAS_W   (e.g., 0.39 × 6000/1280 = 1.828 for space-sprint OVERVIEW)
Sy = effZoom × worldHeight / CANVAS_H  (e.g., 0.39 × 4000/720  = 2.167)
```

These differ (Sx ≠ Sy), but this does NOT distort the image — it exactly corrects the browser's pre-transform display-scaling distortion. The net screen pixels are correct and match the world canvas. (Verified algebraically — see full derivation in §8.)

---

## 8. Go / No-Go

**GO — the approach is sound.** The algebra confirms perfect alignment for both open and closed tracks. No structural blocker.

**However, the spec's proposed CSS transform formula contains two critical errors** that must be corrected before implementation:

---

### Bug A — `translate` uses wrong units (alignment-break for any W_css ≠ 1280)

**Spec formula:**
```js
bgCanvas.style.transform = `translate(${cam.offsetX}px, ${cam.offsetY}px) scale(...)`;
```

`cam.offsetX` is in canvas pixels. CSS `translate(Xpx)` uses CSS pixels. They only match when `W_css = 1280`. At typical window widths (e.g., W_css = 900 CSS px), offsetX = −530 canvas px should produce −372 CSS px of shift, but the spec formula gives −530 CSS px — a **43% misalignment of the background**.

**Correct formula (percentage-based, W_css-independent):**
```js
bgCanvas.style.transform =
  `translate(${cam.offsetX * 100/CANVAS_W}%, ${cam.offsetY * 100/CANVAS_H}%) scale(${scaleX}, ${scaleY})`;
```
CSS `translate(X%)` uses the element's own CSS width/height (= W_css for `width:100%`), so the percentage mathematically cancels the W_css factor. No DOM reads, no ResizeObserver needed.

---

### Bug B — `scale` values assume wrong bg canvas CSS size

**Spec formula:**
```js
// open:   scaleX = scaleY = effZoom
// closed: scaleX = cam.zoom * bsX,  scaleY = cam.zoom * bsY
```

These values are correct only if the bg canvas CSS pixel = canvas pixel (i.e., CSS size = 1280×720). With the proper CSS size (`width:100%; height:100%`), the display scaling from worldWidth×worldHeight → W_css×H_css must be absorbed into the scale values.

**Correct values:**
```js
// open track:
const scaleX = effZoom * worldWidth  / CANVAS_W;   // e.g. effZoom × 6000/1280
const scaleY = effZoom * worldHeight / CANVAS_H;   // e.g. effZoom × 4000/720

// closed track:
const scaleX = cam.zoom;
const scaleY = cam.zoom;
```

---

### Bug C — `imageRendering: 'pixelated'` is wrong for this use case

The spec suggests `imageRendering: 'pixelated'` on the bg canvas. Pixelated = nearest-neighbour sampling. The background images are photographs/artwork, not pixel art. At any non-1:1 CSS display scale, nearest-neighbour produces visibly blocky output. **Use the default (`auto`) or omit the property entirely.**

---

### The corrected bg canvas recipe

**HTML attributes:** `width={worldWidth} height={worldHeight}`

**CSS (inline style, no CSS class needed):**
```js
{
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  transformOrigin: '0 0',
  willChange: 'transform',
  // imageRendering: 'auto'  ← default, omit
}
```

**World canvas context (change):** `{ alpha: true }` (was `alpha: false`)

**CSS transform per frame (in rAF loop, after cam is computed):**
```js
if (bgCanvasRef.current && bgImagePath && bgCanvasReady) {
  const effZoom = isOpenTrack ? effectiveZoom(cam.zoom, OPEN_TRACK_BASE_ZOOM) : null;
  const scaleX = isOpenTrack ? effZoom * worldWidth  / CANVAS_W : cam.zoom;
  const scaleY = isOpenTrack ? effZoom * worldHeight / CANVAS_H : cam.zoom;
  bgCanvasRef.current.style.transform =
    `translate(${cam.offsetX * 100/CANVAS_W}%, ${cam.offsetY * 100/CANVAS_H}%) scale(${scaleX}, ${scaleY})`;
}
```

**Image async loading — draw bg canvas lazily, not only at init:**
```js
// Local variable in the useEffect closure, initialised false:
let bgCanvasReady = false;

// In the rAF loop (every frame until ready):
if (!bgCanvasReady && bgCanvasRef.current && bgImagePath) {
  const bgImg = getBackgroundImage(bgImagePath);   // returns null until loaded
  if (bgImg) {
    const darkened = getBgCanvasReady(bgImg, bgImagePath, worldWidth, worldHeight);
    if (darkened) {
      bgCanvasRef.current.getContext('2d').drawImage(darkened, 0, 0);
      bgCanvasReady = true;
    }
  }
}
```

While `bgCanvasReady` is false, `drawEditorBackground` continues to draw the image on the world canvas as a fallback (no skip yet). Once true, the skip flag is activated.

**`drawEditorBackground` skip mechanism — add one parameter:**
```js
// trackRendering.js
export function drawEditorBackground(ctx, frame, bgPath, ww, wh, skipImageBlit = false) {
  const bgImg = bgPath ? getBackgroundImage(bgPath) : null;
  if (bgImg) {
    const darkened = getBgCanvasReady(bgImg, bgPath, ww, wh);  // renamed from _getOrCreateDarkenedBg
    if (darkened && !skipImageBlit) {
      ctx.drawImage(darkened, 0, 0);
    } else if (!darkened) {
      // OffscreenCanvas unavailable — two-step fallback
      ctx.drawImage(bgImg, 0, 0, ww, wh);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 0, ww, wh);
    }
  } else { /* gradient sky — unchanged */ }
  // ... stars, crowd, sun — unchanged
}
```

Call site in index.jsx:
```js
drawEditorBackground(ctx, ts, bgImagePath, worldWidth, worldHeight, bgCanvasReady);
```

**DOM order (no z-index needed):**
```jsx
<div className="race-canvas-wrapper">
  {/* bg canvas FIRST — paints below world canvas via DOM order */}
  <canvas ref={bgCanvasRef} width={worldWidth} height={worldHeight} style={BG_CANVAS_STYLE} />
  {/* world canvas SECOND — transparent, paints above bg canvas */}
  <canvas ref={canvasRef} width={CW} height={CH} className="race-canvas" />
  {/* HUDs — all position:absolute, after both canvases in DOM → on top */}
  <CameraStateHUD ... />
  ...
</div>
```

**`bgImagePath === null` case:** The bg canvas is in the DOM (always, for simplicity). `bgCanvasReady` stays false. The CSS transform update is skipped (guarded by `bgCanvasReady`). `drawEditorBackground` draws the gradient sky on the world canvas as before. No visible difference. ✓

**Track change / invalidation:** `useEffect([raceData])` re-runs on track change → `bgCanvasReady = false` → the new track's bg image is drawn to the bg canvas on the first available rAF. ✓

---

### Open questions that need browser verification (not blocking, but flag for owner-verify phase)

1. **`will-change: transform` stacking context**: Confirmed by CSS spec — a `will-change: transform` element creates a stacking context. Verify in DevTools Layers panel that the bg canvas shows as a compositor layer (should display "Composited" in the Layers panel).

2. **Firefox compositor layer promotion**: Firefox does not always promote `will-change: transform` to a GPU layer the same way Chrome does. The CSS transform will be correct in Firefox (no alignment bug), but the GPU-layer performance gain may not materialise. Test in Chrome for the perf measurement (§COMMIT 4).

3. **Sub-pixel alignment at HiDPI (devicePixelRatio > 1)**: Because neither canvas uses DPR scaling (§1), the world canvas renders at 1280 physical pixels regardless of display DPR. On a 2× Retina display, the canvas content is upscaled 2× by the browser — blurry by design. The bg canvas CSS transform is applied in CSS px units, which are DPR-independent. **No additional DPR concern** introduced by this change. ✓

---

### Summary table

| Question | Finding | Risk |
|---|---|---|
| DPR | None — strictly 1280×720, no DPR anywhere | None |
| offsetX/Y units | Canvas pixels (NOT CSS px) — **spec formula wrong** | CRITICAL (corrected above) |
| bsX ≠ bsY | Always non-uniform (all tracks 3:2, canvas 16:9) | Handled by corrected formula |
| Cache lifecycle | Async image load — must retry in rAF | Medium — must use `bgCanvasReady` flag |
| Sub-draws | Only `ctx.drawImage(darkened)` goes to bg canvas; animated parts stay on world canvas | None |
| HUD overlays | DOM order sufficient; no z-index on canvases needed | None |
| alpha:true | clearRect → transparent; no canvas-wide opaque fills blocked | None |
| imageRendering | Spec suggests 'pixelated' — **wrong for photos** | Visual quality — corrected above |
| Closed-track | CSS `scale(cam.zoom)` correct; bsX/bsY absorbed by display scaling | None (verified algebraically) |
| Overall | GO — approach valid with formula corrections | — |
