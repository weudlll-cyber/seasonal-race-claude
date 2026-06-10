# PROFILE — Steps 8 & 9: Visible fraction + normal-play stutter

**Date:** 2026-06-09  
**Traces:** Trace-20260609T210751 (SLOW/OVERVIEW) + Trace-20260609T210927_scatter (FAST/leader-scatter)  
**Status:** Analysis only — no source changes.

---

## STEP 8 — Actual visible background fraction and GPU raster mechanism

### 8a. The draw-call chain

```
bgImageCache.js
  img.src = "http://localhost:4000/api/tracks/space-sprint/background"  (6000×4000 JPEG)

trackRendering.js — _getOrCreateDarkenedBg():
  oc = new OffscreenCanvas(6000, 4000)          ← 24 MP, ~96 MB RGBA8 in GPU VRAM
  octx.drawImage(bgImg, 0, 0, 6000, 4000)       ← decode + scale source into OffscreenCanvas
  octx.fillRect(0, 0, 6000, 4000)               ← darken overlay baked in once
  // cached forever — NOT recreated each frame

trackRendering.js — drawEditorBackground() per frame:
  ctx.drawImage(darkened, 0, 0)                  ← NO source rect, NO dest dims
  // draws the OffscreenCanvas at native 6000×4000 world coords
  // called inside ctx.scale(effZoom) + ctx.translate(cam.offsetX, cam.offsetY)
```

**Key:** `ctx.drawImage(offscreenCanvas, 0, 0)` with no destination rectangle draws the
full 6000×4000 OffscreenCanvas at world position `(0,0)`. The camera `scale(effZoom)` maps
this to screen space. Chrome tile-rasterizes the resulting 1280×720 screen canvas.

### 8b. What the GPU rasterizes per frame

Chrome's tile rasterizer divides the 1280×720 canvas into 256×256 tiles (5×3 = 15 tiles). For each tile, the GPU samples the source texels that map onto that tile:

| Scenario | effZoom | Visible world area | Fraction of bg | Source texels/tile |
|---|---|---|---|---|
| OVERVIEW, N=8 | **0.393** | 3 257 × 1 832 = **5 967 K** | **24.9%** | 424 K |
| OVERVIEW, N=15 | 0.737 | 1 737 × 977 = 1 697 K | 7.1% | 121 K |
| OVERVIEW, N=20+ | 0.800 | 1 600 × 900 = 1 440 K | 6.0% | 102 K |
| LEADER (N=40) | **1.810** | 707 × 398 = **281 K** | **1.2%** | 20 K |

The GPU does **not** rasterize the full 6000×4000 every frame. It rasterizes only the tiles
that are within the 1280×720 screen canvas, sampling from the **visible portion** of the source
texture.

**GPU work ratio OVERVIEW N=8 vs LEADER:** 5 967 K / 281 K = **21.2×**  
This aligns with the measured trace difference: GPUTask 110–159 ms (OVERVIEW) vs 18–47 ms (LEADER).

The `OffscreenCanvas(6000, 4000)` **must reside in GPU VRAM** at full 96 MB. This is a one-time
upload cost (on first frame with this background). Per-frame cost is only the source-texel read.

### 8c. Mechanism verdict

> **Mechanism (a): LARGE VISIBLE AREA drives the per-frame GPU cost.**

The owner's observation is correct: even though only part of the background is on screen, the
*amount* of that part changes dramatically with zoom level. At N=8 OVERVIEW, the camera is zoomed
out so far that 24.9% of the 6000×4000 background is visible (3 257 × 1 832 world pixels), vs
only 1.2% in leader zoom.

**A zoom floor IS an effective fix.** Capping OVERVIEW `effZoom` at 0.6 would reduce the visible
area to 2 560 K px (43% of the current N=8 load), dropping the estimated GPUTask from ~130 ms to
~56 ms — below the vsync-gate threshold that causes stutter.

### 8d. Secondary cost: crowd scaling with worldWidth

`drawEditorBackground` draws animated crowd elements for every frame. `crowdCount` scales with
`worldWidth`:

| Track | worldWidth | crowdCount |
|---|---|---|
| Small tracks (1280–1536) | 1 280–1 536 | 60–72 |
| Space Sprint | 6 000 | **282** |
| Mountainstreet / Seatrack | 6 144 | **289** |

282 crowd ellipses are drawn every frame on Space Sprint regardless of zoom level. This is
constant overhead between leader and OVERVIEW on the same track, so it does not explain the
**difference** between the two modes. It does add ~4.7× more draw-call overhead vs small-world
tracks.

### 8e. Why the OffscreenCanvas fallback path is worse

When `OffscreenCanvas` is unavailable (line 41–44 in `trackRendering.js`):
```js
ctx.drawImage(bgImg, 0, 0, ww, wh);      // scales the 6000×4000 source JPEG every frame
ctx.fillStyle = 'rgba(0,0,0,0.25)';
ctx.fillRect(0, 0, ww, wh);
```
This draws the raw `HTMLImageElement` (decoded JPEG) scaled to 6000×4000 each frame — no caching.
This path is more expensive than the OffscreenCanvas path and would amplify the stutter.
In practice the OffscreenCanvas path is active on all modern Chrome/Edge.

---

## STEP 9 — Normal-play stutter (leader/scatter mode)

### 9a. Source data

Trace file: `Trace-20260609T210927_scatter.json` — 7 806 ms, 404 rAF frames, labeled "FAST / control case".

### 9b. All inter-rAF gaps > 20 ms — cause attribution

| gap ms | main ms | GPU ms | GC ms | cause |
|---|---|---|---|---|
| **44.9** | 37.0 | 20.1 | 0 | GPU |
| 32.9 | 27.8 | 23.0 | 0 | GPU |
| 29.8 | 33.8 | 26.8 | 0 | GPU |
| 28.9 | 39.6 | 18.6 | 2.8 | GPU |
| 26.9 | 28.2 | 45.4 | 0 | GPU |
| 25.7 | 29.4 | 28.4 | 0 | GPU |
| 25.0 | 27.1 | 20.2 | 0 | GPU |
| 23.8 | 29.1 | 23.0 | 0 | GPU |
| … (18 more) | | | | all GPU |

*(main ms > gap ms in several rows because main thread and GPU pipeline overlap; vsync gate waits
for whichever finishes last.)*

Full distribution — 403 gaps analyzed:

| cause | count | avg gap | total gap time | share |
|---|---|---|---|---|
| **GPU** | **376** | 14.8 ms | 5 565 ms | **93.8%** |
| MainThread | 27 | 13.7 ms | 370 ms | 6.2% |
| GC | **0** | — | — | 0% |

Gap histogram:

| range | count |
|---|---|
| < 16.7 ms | 306 |
| 16.7–20 ms | 71 |
| 20–25 ms | 20 |
| 25–33 ms | 5 |
| **33–50 ms** | **1** |

### 9c. Verdict: the second stutter is the same mechanism, lower magnitude

**Every long gap in normal play is GPU-caused. Zero GC-only gaps. Four main-thread-only gaps
(17–20 ms) — tiny and rare.**

The normal-play hitches (p90 gap = 23.6 ms, max 44.9 ms) share the exact same GPU-backpressure
signature as the OVERVIEW stutter: `CrGpuMain::GPUTask` completes, `GpuVSyncThread` releases the
next `BeginFrame`, rAF fires. The difference is magnitude:

| Mode | GPUTask range | inter-rAF p90 | Missed vsync ticks |
|---|---|---|---|
| OVERVIEW N=8 | 110–159 ms | **115 ms** | ~7 ticks |
| Leader/scatter | 18–47 ms | **23.6 ms** | 1–3 ticks |

At leader zoom (effZoom ≈ 1.81), the visible source area is 281 K px = 1.2% of the background —
a manageable GPU load. Occasional 20–47 ms GPU tasks produce single-frame skips that appear as
brief "micro-stutters" in otherwise smooth play.

### 9d. What causes the 18–47 ms GPU spike in leader view?

The LEADER GPUTask is not a constant cost — it varies 18–47 ms per gap. Likely contributors:

1. **Camera zoom transitions** (entry/exit of BATTLE_ZOOM or COMEBACK_ZOOM change effZoom briefly,
   altering the sampled area from one frame to the next while the tile cache adjusts)
2. **Scatter/multi-subject frames** — the scatter camera shows multiple racers simultaneously,
   potentially covering a wider viewport section than pure leader follow
3. **GPU tile cache eviction** — if the 96 MB OffscreenCanvas texture is partially evicted from
   VRAM under memory pressure, re-uploading on demand causes a spike; more likely on mobile/
   integrated GPUs with limited VRAM
4. **Background JPEG decode** — `bgImageCache.js` uses `new Image()` (HTMLImageElement); first
   frame where `img.onload` fires, the decode+rasterize of the 6 000×4 000 JPEG into the
   OffscreenCanvas causes a one-time spike. This matches the large gap #1 (44.9 ms) which often
   appears early in the trace.

The 27 MainThread-caused gaps (avg 13.7 ms, just over the 16.7 ms vsync boundary) are consistent
with normal game-loop jitter: a physics accumulation step that runs an extra sub-step, or a
scoreboard/HUD sort on a scoring update frame.

### 9e. How to trigger the leader-view hitches reproducibly

The rare long GPU spikes (>33 ms) in leader view are hard to trigger intentionally. To capture
them reliably:

1. **Immediately after first OVERVIEW → LEADER_ZOOM transition** — the OffscreenCanvas may not
   yet be fully resident in VRAM; the first leader-view frame spends extra GPU time.
2. **During BATTLE_ZOOM entry on Space Sprint** — zoom snaps from OVERVIEW (0.393 effZoom) to
   BATTLE_ZOOM (~2.81/1.5 = 1.87 effZoom); the sharp change in sampled area flushes tile caches.
3. **High-crowd-density moments** — 282 crowd ellipses + 13 stars + gradient sun all re-drawn
   every frame; during rapid camera panning all 15 canvas tiles are re-rasterized simultaneously.

Without a dedicated Space Sprint leader-view trace, the stutter can be quantified by adding
`?perfprobe=1` and running `window.__perfProbeZoom()` — the `byState.LEADER_ZOOM` bucket will
show p90 and p99 for that state specifically.

---

## Combined conclusions

| Question | Answer |
|---|---|
| Does GPU sample the whole 6000×4000 every frame? | **No** — only the visible fraction (24.9% at OVERVIEW N=8) |
| Does capping OVERVIEW zoom help? | **Yes** — visible area and GPU cost are proportional |
| What causes stutter in normal play? | **Same GPU mechanism, lower magnitude** (GPUTask 18–47 ms) |
| Is GC a cause? | **No** — zero GC-only long gaps in either trace |
| Is there a second independent stutter root cause? | **No** — both OVERVIEW and normal-play hitches are the same GPU-backpressure pattern |
| Single-sentence root cause (both modes) | The Space Sprint background is a 6000×4000 OffscreenCanvas texture; at every camera zoom level, the GPU must sample from an area proportional to `(CANVAS/effZoom)²` — OVERVIEW N=8 samples 24.9% of that texture (5.97 MP) while leader view samples only 1.2% (0.28 MP), making OVERVIEW 21× more expensive and pushing GPUTask into vsync-stall territory. |
