# BG-LAYER-RESULT — Separate background compositor layer

**Date:** 2026-06-10  
**Commits:** 134c15d → f19ea5b → 4862673 (Commits 1–3)  
**Tag before:** backup/pre-bglayer  
**Tag after:** backup/bglayer (applied at end of this process)

---

## 1. What was implemented

Three commits on master separate the static background image from the world canvas:

| Commit | Change |
|---|---|
| 134c15d | Rename `_getOrCreateDarkenedBg` → exported `getBgCanvasReady` in trackRendering.js |
| f19ea5b | Add bg `<canvas>` (position:absolute, will-change:transform) + world canvas alpha:true |
| 4862673 | Lazy-draw darkened bg to bg canvas once; update CSS transform per frame; skip `ctx.drawImage(darkened)` on world canvas when ready |

**CSS transform formula (corrected from preflight):**
```
translate(cam.offsetX * 100/1280 %, cam.offsetY * 100/720 %)
scale(effZoom * worldWidth/1280,  effZoom * worldHeight/720)   ← open track
scale(cam.zoom, cam.zoom)                                        ← closed track
```
Animated stars, crowd, dark band, and sun remain on the world canvas unchanged.

---

## 2. DOM / implementation verification (automated — Playwright)

Verified against a live Space Sprint N=8 Dragon race on PROD build (port 4173):

| Check | Result |
|---|---|
| Bg canvas size | 6000 × 4000 ✓ (matches worldWidth × worldHeight) |
| Bg canvas CSS display size | 792.7 × 445.9 px — matches world canvas CSS size ✓ |
| `position` | `absolute` ✓ |
| `will-change` | `transform` ✓ |
| `z-index` | `auto` ✓ (DOM order stacking; world canvas has `position:relative`) |
| CSS transform live value | `translate(-50.10%, -172.89%) scale(7.36, 8.72)` — percentages ✓, non-uniform scale ✓ |
| Bg canvas content | CORS-tainted → **bg image was successfully drawn** ✓ |
| World canvas pixel (0,0) | `rgba(0,0,0,0)` — transparent ✓ (alpha:true + clearRect working) |

Screenshot at [bg-layer-screenshot.png](bg-layer-screenshot.png) — space background visible through transparent world canvas, racers on top, minimap and HUD intact.

**Transform value spot-check (LEADER_ZOOM frame):**  
scaleX = 7.36 → effZoom = 7.36 × 1280/6000 = 1.570; scaleY = 8.72 → effZoom = 8.72 × 720/4000 = 1.570 ✓  
Both axes give the same effZoom — open-track non-uniform scale is correctly compensating for the 3:2 world in 16:9 canvas.

---

## 3. Compositor promotion check

`will-change: transform` is confirmed set on the bg canvas (see §2).  
Per the CSS spec and Chromium implementation, a canvas element with `will-change: transform` is promoted to an **independent GPU compositor layer**. The element's pixels are uploaded to a dedicated GPU texture; subsequent CSS transform changes (translate + scale each frame) are resolved entirely by the GPU's matrix unit — **no re-rasterization of canvas pixels**.

**Manual confirmation required** (cannot be scripted from Playwright):  
Open the PROD preview in Chrome → DevTools → **Layers panel** → look for the bg canvas entry showing "Composited" with its own layer rect. Also try DevTools Rendering → "Layer borders" (orange border = compositing layer).

Expected: bg canvas shows as a promoted compositor layer. If it does NOT appear as a separate layer, the GPU-layer benefit would be reduced — report back if the Layers panel shows it merged.

---

## 4. Performance numbers

### 4a. BEFORE (from PROFILE-STEPS8-9.md, 2026-06-09 traces)

| Metric | OVERVIEW N=8 | LEADER_ZOOM |
|---|---|---|
| CrGpuMain GPUTask per frame | **110–159 ms** | 18–47 ms |
| Mechanism | 24.9% of 6000×4000 sampled per frame | 1.2% sampled |
| Inter-rAF p90 (probe estimate) | **~115 ms** | ~20 ms |

### 4b. AFTER — OWNER MEASUREMENT REQUIRED

**Why automated measurement failed:** Playwright runs the browser tab in background. Chrome throttles `requestAnimationFrame` to ~1 fps in background tabs. The probe recorded gaps of ~1016 ms (throttled), making all timing data invalid.

**Steps for owner to measure (PROD build already running on port 4173):**

1. Open **Chrome** → `http://localhost:4173`
2. On Setup: Space Sprint track · Dragon racer · N = 8 · click Quick Test
3. URL bar: add `?perfprobe=1` before pressing Enter, or navigate to `/race?perfprobe=1` after setting sessionStorage
4. Wait for OVERVIEW phase (~15–20 s into the race, after countdown + early racing)
5. DevTools console: `window.__perfProbeZoom()`  
   → record `overview.p90` (target: ≤ 25 ms; baseline: ~115 ms)  
   → record `nonOverview.p90` for leader-zoom comparison
6. DevTools → Performance tab → Record 5 s during OVERVIEW  
   → CPU lane: check inter-rAF gap (main thread)  
   → CrGpuMain lane: look at `GPUTask` durations (target: ≤ 30 ms; baseline: 110–160 ms)
7. DevTools → Layers panel (or Rendering → Layer borders) → confirm bg canvas is a promoted layer

### 4c. Expected outcome

The bg canvas `ctx.drawImage(darkened, 0, 0)` blit is now completely removed from the hot rAF path. The world canvas draws only: 13 star arcs, dark band, 282 crowd ellipses, sun gradient, effects, track, racers, HUD, minimap. The bg canvas pixels are a static GPU texture moved by CSS transform — zero re-rasterization cost per frame.

Expected GPUTask drop: **110–159 ms → ≤ 25 ms** at OVERVIEW N=8. This should bring inter-rAF p90 below 25 ms (60 fps territory) at OVERVIEW.

---

## 5. Build and unit test results

| Suite | Result |
|---|---|
| `npm run build` (Vite PROD) | ✓ clean (649 kB, no errors) |
| `npx vitest run` | ✓ 2598 tests / 121 files passed |

---

## 6. Deferred items

| Item | Status |
|---|---|
| Crowd + stars baked into bg canvas (Commit 5) | Deferred — 282 ellipses + 13 arcs are still on world canvas; secondary win if needed |
| OVERVIEW zoom-floor slider | Remains in config (default 0 = off) — now redundant as fix, harmless; owner decides removal |
| Firefox compositor promotion | `will-change:transform` may not promote in Firefox; not tested — Chrome is the primary target |

---

## 7. Verdict

Implementation is structurally correct and verified by DOM inspection + screenshot. The 24 MP per-frame background blit has been removed from the world canvas hot path. The bg canvas has been drawn, its CSS transform is being updated correctly each frame, and the `will-change: transform` flag is in place for compositor promotion.

**Actual performance numbers require owner measurement in a foreground Chrome window (§4b).**  
If the numbers confirm the expected drop (p90: 115 ms → ≤25 ms), the fix is complete. If promotion is not confirmed in the Layers panel, investigate whether Chrome is actually promoting the element.
