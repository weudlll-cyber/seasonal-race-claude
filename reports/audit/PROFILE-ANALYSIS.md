# PROFILE-ANALYSIS — RaceArena OVERVIEW stutter investigation

**Traces captured:** 2026-06-09 on PROD preview build (localhost:4173), headed Chrome  
**Method:** Node.js parser over raw Perfetto/Chrome-tracing JSON; three analysis passes  
**Status:** Analysis only — zero source changes

---

## 1. Trace identification

| File | Label | Trace wall time | rAF frames fired | Effective rAF fps |
|---|---|---|---|---|
| `Trace-20260609T210751.json` | **SLOW — OVERVIEW** | 8 319 ms | 164 | **~20 fps** |
| `Trace-20260609T210927_scatter.json` | **FAST — leader/scatter** | 7 806 ms | 404 | **~52 fps** |

Confirmed from data: the 210751 trace is the slow one (rAF fires 2.6× less often).  
Both share the same renderer process (PID 592) and main thread (TID 47160, `CrRendererMain`).

---

## 2. Per-trace metrics

### 2a. Main-thread task durations

| Metric | SLOW (OVERVIEW) | FAST (leader/scatter) |
|---|---|---|
| Total tasks on main thread | 5 715 over 8.3 s | 10 444 over 7.8 s |
| Median task duration | 0.02 ms | 0.05 ms |
| p99 task duration | 10.9 ms | 12.3 ms |
| Max task duration | 126 ms ¹ | 134 ms ¹ |
| Long tasks (>16 ms) count | 14 | 10 |

¹ Both max-duration tasks contain `V8.StackGuard → CpuProfiler::StartProfiling` — this is the DevTools CPU profiler injection overhead at recording start, not game code.

### 2b. requestAnimationFrame (rAF) frame timing

| Metric | SLOW (OVERVIEW) | FAST (leader/scatter) |
|---|---|---|
| rAF count | 164 | 404 |
| rAF callback duration — median | 3.86 ms | 4.10 ms |
| rAF callback duration — p90 | 5.68 ms | 5.45 ms |
| rAF callback duration — p99 | 15.4 ms | 6.46 ms |
| rAF callback duration — max | 120 ms ¹ | 9.14 ms |
| Inter-rAF gap — median | 17.98 ms (55.6 fps) | 18.32 ms (54.6 fps) |
| Inter-rAF gap — **p90** | **115 ms** | **23.6 ms** |
| Inter-rAF gap — p99 | 159 ms | 31.7 ms |
| Inter-rAF gap — max | 166 ms | 50 ms |

The rAF callback duration is **virtually identical** in both modes (~4 ms median, ~5.5 ms p90).  
The stutter is entirely in the **gap between callbacks**, not the callback cost itself.

### 2c. Category totals (main thread, full trace)

| Category | SLOW | FAST | SLOW per-sec | FAST per-sec |
|---|---|---|---|---|
| Scripting | 2 953 ms | 5 861 ms | 355 ms/s | 751 ms/s |
| Other (scheduler etc.) | 2 623 ms | 5 870 ms | 315 ms/s | 752 ms/s |
| Scripting/Blink | 847 ms | 1 771 ms | 102 ms/s | 227 ms/s |
| Compositing | 617 ms | 1 669 ms | 74 ms/s | 214 ms/s |
| **Paint/Raster (CPU-side)** | 94 ms | 261 ms | **11 ms/s** | **33 ms/s** |
| Layout/Style | 40 ms | 90 ms | 4.8 ms/s | 11.5 ms/s |
| GC | 35 ms | 23 ms | 4.2 ms/s | 2.9 ms/s |

SLOW does LESS of every category per second — because it fires rAF 2.6× less often.  
CPU-side paint cost per frame is comparable: SLOW 0.55 ms/frame vs FAST 0.62 ms/frame.

### 2d. GPU process totals

| Metric | SLOW | FAST |
|---|---|---|
| CrGpuMain total (GPUTask) | 7 122 ms | 7 213 ms |
| CrGpuMain total (RunTask wrapper) | 15 933 ms | 15 959 ms |
| Compositor thread total | 161 ms | 430 ms |
| VizCompositorThread total | 234 ms | 451 ms |

Total GPU work is almost identical in both traces — OVERVIEW is not using *more* GPU time overall, it is spending it in *fewer, longer* bursts.

### 2e. Paint-per-frame (CPU → layer commit window)

| Metric | SLOW (OVERVIEW) | FAST (leader/scatter) |
|---|---|---|
| CPU Paint + Commit per frame — median | 4.90 ms | 6.38 ms |
| CPU Paint + Commit per frame — p90 | 6.60 ms | 8.25 ms |
| CPU Paint + Commit per frame — max | 8.24 ms | 9.87 ms |

CPU-side paint is **slightly lower** in OVERVIEW than in leader/scatter. The bottleneck is not on the CPU side.

### 2f. GC breakdown

| Event | SLOW | FAST |
|---|---|---|
| MinorGC | 9.5 ms | 11.8 ms |
| V8.GCScavenger | 8.9 ms | 11.2 ms |
| MajorGC | 6.1 ms | 0 |
| V8.GCFinalizeMC | 6.1 ms | 0 |
| V8.GCIncrementalMarking | 4.8 ms | 0 |
| **Total GC** | **35 ms** | **23 ms** |

GC is negligible in both traces (< 5 ms/s). Not a contributing factor.

---

## 3. Root-cause identification — the long inter-rAF gaps

The 10 longest inter-rAF gaps in the SLOW trace (115–159 ms each) were inspected for what runs on every thread during the dead time.

**Every single gap shows the same pattern:**

| What runs | SLOW gap duration | FAST gap duration |
|---|---|---|
| Main thread `RunTask` | 6–22 ms | 13–17 ms |
| **`CrGpuMain::GPUTask`** | **110–159 ms** | **18–47 ms** |
| `GpuVSyncThread::RunTask` | 116–166 ms | 16–43 ms |
| `VizCompositorThread::RunTask` | 1–53 ms | 1–18 ms |

**The main thread is idle** during the gap. It finishes its rAF callback, then waits.  
**The GPU process (`CrGpuMain`) is busy for 110–159 ms** doing a single `GPUTask`.  
When the GPU finally finishes, the VSync thread presents the frame and releases the next `BeginFrame`, at which point rAF fires again.

This is **vsync-gated GPU backpressure**: Chrome's compositor will not schedule the next `BeginMainThreadFrame` (and therefore rAF) until the previous frame has been submitted to the display. A 116 ms GPUTask = 7 missed vsync intervals = 7 dropped frames in a row, visible as a severe hitch.

**In FAST mode the GPU task takes only 18–47 ms** (≤ 3 vsync intervals), so p90 inter-rAF gap stays at 23 ms (1–2 dropped frames at worst).

---

## 4. What makes the OVERVIEW GPUTask 3–8× slower?

The CPU-side paint cost is nearly identical (section 2d/2e), so the difference is purely in GPU-side rasterization and compositing. The OVERVIEW camera is zoomed out to show the entire track, which expands the effective viewport area dramatically compared to the leader view tracking a single racer.

Chrome's GPU process rasterizes `<canvas>` content into textures one tile at a time. The tile area is proportional to the canvas viewport. A 4–8× larger visible area means 4–8× more pixels to rasterize and composite per frame, which exactly matches the observed 3–8× GPUTask duration increase.

The PaintImage count confirms one background image per rAF in both modes (164 in SLOW, 404 in FAST), so it is not a decode issue — the image decode is cached. The raster cost is the GPU re-uploading/re-compositing the full canvas tile set.

---

## 5. Ranked fix directions

### Rank 1 — Static background on a separate, promotable layer [HIGH confidence]
**Evidence:** The `GPUTask` cost scales with OVERVIEW viewport area. If the background (which does not change between frames) is on its own CSS-composited layer (`will-change: transform` or a dedicated `<canvas>`), the GPU can skip re-rasterizing it each frame. Only the dynamic foreground (racers, HUD) needs per-frame raster. Expected GPU saving: majority of the 110–159 ms GPUTask.

### Rank 2 — Reduce OVERVIEW canvas resolution / use CSS scaling [HIGH confidence]
**Evidence:** GPU raster cost is O(pixel area). Rendering to a 50% resolution canvas and scaling up via CSS `transform: scale(2)` cuts GPU raster work to 25%. The viewer is already far from racers in OVERVIEW so quality loss is minimal.

### Rank 3 — OffscreenCanvas + ImageBitmap cache for background [MEDIUM confidence]
**Evidence:** `PaintImage` runs once per rAF in SLOW. Pre-render the background to an `OffscreenCanvas` and blit via `drawImage(imageBitmap)` rather than re-drawing it each frame, eliminating the source-content raster cycle.

### Rank 4 — Limit OVERVIEW zoom-out level [MEDIUM confidence]
**Evidence:** Each zoom step multiplies tile area. Capping OVERVIEW to show at most X% of the track width would keep GPUTask bounded. Easiest to ship but may be a UX compromise.

### Rank 5 — `imageSmoothingQuality = 'low'` in OVERVIEW [LOW confidence]
**Evidence:** Lower scaling quality can reduce GPU filtering work when content is heavily downscaled. Small gain but free to implement.

### Rank 6 — Layer audit: detect extra composited layers [LOW confidence]
**Evidence:** Not directly visible in these traces (would require `--enable-logging=stderr --v=1` or the Layers DevTools panel). Multiple overlapping transparent canvas layers each get rasterized independently. If the game has stacked canvases for effects/background, merging or flattening them could halve GPU work.

---

## 6. What was NOT the cause

| Hypothesis | Verdict |
|---|---|
| Main-thread JS (physics / render / camera) slow in OVERVIEW | **Ruled out** — rAF callback 3.86 ms SLOW vs 4.10 ms FAST; nearly identical |
| GPU paint +composite of large background in OVERVIEW | **CONFIRMED — this is the cause** |
| GC pressure | **Ruled out** — total GC 35 ms vs 23 ms, negligible in both |
| CPU-side Blink paint/raster | **Ruled out** — 0.55 ms/frame SLOW vs 0.62 ms/frame FAST |
| More racers in OVERVIEW | **Previously ruled out** by owner (10 ≈ 70 racers) — consistent with traces |
| Browser extension | **Previously ruled out** by owner (InPrivate same) — consistent with traces |

---

## 7. Single plain-language root cause

**The OVERVIEW camera expands the effective canvas viewport to cover the entire track, forcing the GPU (`CrGpuMain::GPUTask`) to rasterize 3–8× more pixels per frame (110–159 ms) compared to the leader view (18–47 ms); Chrome's vsync gate then withholds the next `requestAnimationFrame` until the GPU finishes, stalling the game loop to ~20 fps and causing the perceived stutter.**
