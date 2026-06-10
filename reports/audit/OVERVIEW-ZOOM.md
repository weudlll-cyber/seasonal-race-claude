# OVERVIEW-ZOOM — Camera zoom↔GPU stutter correlation + sec2 comparison

**Date:** 2026-06-09  
**Branch:** master  
**Status:** Analysis only — source changed only to add the probe instrument (rAFProbe extension), zero behavior change.

---

## 0. Instrument added

`rAFProbe.js` extended with three new parallel ring buffers (zero per-frame allocation):

| New export | Purpose |
|---|---|
| `recordFrameCamera(state, zoom)` | Writes camera state + `cam.zoom` into the same ring-buffer slot as the gap recorded by `recordFrame(ts)` |
| `window.__perfProbeZoom()` | Returns zoom-vs-gap correlation table: per-state gap stats + OVERVIEW bucketed by zoom |
| `window.__perfProbeRaw()` | Returns raw `[{gap, zoom, state}]` array for offline analysis |

Wired in `RaceScreen/index.jsx` immediately after `camDirRef.current.update()`, behind the existing `?perfprobe=1` flag. Build green, 2598/2598 tests pass.

---

## 1. Track geometry verification

Read from `racearena:tracks` in the game's localStorage (Playwright clean session, identical to code defaults):

| Track | Type | worldW | worldH | overviewZoom |
|---|---|---|---|---|
| Dirt Oval | CLOSED | 1 280 | 720 | 1.0 (= bsX) |
| Space Sprint | OPEN | 1 280 | 720 | 1.0 |
| River Run | OPEN | 1 280 | 720 | 1.0 |
| Garden Path | OPEN | 1 280 | 720 | 1.0 |
| City Circuit | OPEN | 1 280 | 720 | 1.0 |
| **Mountainstreet** | **OPEN** | **6 144** | **4 096** | **0.208** |
| Ice Track | OPEN | 1 536 | 1 024 | 0.833 |
| **Seatrack** | **OPEN** | **6 144** | **4 096** | **0.208** |
| Searound | CLOSED | 3 072 | 2 048 | 1.0 (bsX) |

`overviewZoom = CANVAS_W (1280) / worldW` — the "show full world" zoom floor for open tracks.

**Note:** If the user's real-browser session has a custom Space Sprint with a larger worldWidth (e.g., 6 000+), it would behave identically to Mountainstreet in the analysis below. The default stored value is 1 280.

---

## 2. The OVERVIEW snap-zoom formula (open tracks)

From `CameraDirector.js` line 1119–1134, at every OVERVIEW transition:

```
raw       = overviewTargetScreenPx (28px) / (drawnBodyWidthRefPx × OPEN_TRACK_BASE_ZOOM)
ceiling   = min(MAX_INVERSE_ZOOM=10.0, overviewStateZoom × 0.8)  = 0.533
snapZoom  = clamp(raw, overviewZoom, ceiling)
effZoom   = snapZoom × OPEN_TRACK_BASE_ZOOM (1.5)
```

`drawnBodyWidthRefPx = bodyNarrow` — the racer body's narrow-axis world-pixel size after auto-sprite-scale. This is the ONLY term that varies with racer count:

```
bodyNarrow = min(2 × W_REF / racersPerRow,  maxBodyNarrow)
W_REF      = 285  (from trackWidthPx=300 × startSpreadRange=0.95)
```

Fewer racers → larger bodyNarrow → smaller `raw` → lower `snapZoom` → further zoom-out → heavier GPU rasterization.

---

## 3. Q1 — Does GPU cost correlate with OVERVIEW zoom?

### Dragon racer, worldW=6 144 (Mountainstreet / wide tracks)

| N racers | bodyNarrow | snapZoom | effZoom | GPU vs leader | note |
|---|---|---|---|---|---|
| 8 | 71.25 px | 0.262 | **0.393** | **21.2×** | raw wins (< ceiling, > floor) |
| 10 | 57.00 | 0.328 | 0.491 | 13.6× | raw wins |
| 15 | 38.00 | 0.491 | 0.737 | 6.0× | raw wins |
| 20 | 28.50 | 0.533 | 0.800 | 5.1× | ⬆ ratchet cap hit |
| 30 | 38.00 | 0.491 | 0.737 | 6.0× | raw wins (multi-row resets bodyNarrow) |
| 40+ | 28.50 | 0.533 | 0.800 | 5.1× | ⬆ ratchet cap hit |

GPU cost proxy = 1/(effZoom²). Leader LEADER_ZOOM: effZoom=1.81, GPU=1.00×.

**Q1 answer: YES — confirmed analytically.** The inter-rAF gap p90 (measured in PROFILE-ANALYSIS.md as 115ms for the SLOW trace) directly corresponds to the GPU backpressure from a low effZoom. The correlation is:

- 8 racers: effZoom=0.393 → CrGpuMain GPUTask ≈ 110–159 ms (observed in traces)
- 40+ racers: effZoom=0.800 → GPUTask ≈ 18–47 ms (FAST traces)
- Ratio: 0.800² / 0.393² ≈ **4.1×** — matches the 3–8× range observed in DevTools

### Dirt Oval (worldW=1 280, closed) — constant zoom

| N racers | snapZoom | effScale | GPU vs leader |
|---|---|---|---|
| 8–70 | **1.0** (floored) | 1.0 | **3.3× constant** |

Dirt Oval OVERVIEW zoom is **racer-count-independent** — the snap zoom is always floored at `minZoom=1.0` for closed tracks.

### Space Sprint default (worldW=1 280, open) — constant zoom

| N racers | snapZoom | effZoom | GPU vs leader |
|---|---|---|---|
| 8–70 | **1.0** (floored) | 1.5 | **1.5× constant** |

The `overviewZoom = 1280/1280 = 1.0` equals the ratchet ceiling (0.533) floor — so ALL racer counts snap to 1.0. Space Sprint default has **no zoom variation with racer count**.

---

## 4. Zoom-cap values (current master = sec2)

| Constant | Value | Location | Notes |
|---|---|---|---|
| `MAX_INVERSE_ZOOM` | **10.0** | CameraDirector.js:51 | Raised from 5.0 in ee9b664 (before sec2) |
| `OPEN_TRACK_BASE_ZOOM` | **1.5** | CameraDirector.js:30 | |
| Ratchet stop (open OVERVIEW ceiling) | **0.533** | CameraDirector.js:1131 | = overviewStateZoom × 0.8 = (1.0/1.5) × 0.8 |
| `overviewStateZoom` (default config) | **0.667** | from spriteScale=1.0, open: 1.0/1.5 | |
| `overviewTargetScreenPx` | **28** | cameraTimingComputation.js:77 | Target racer body px in OVERVIEW |
| `W_REF` (auto-scale) | **285** | RaceScreen/index.jsx:453 | = min(285, trackWidthPx × startSpreadRange) |

The effective OVERVIEW zoom floor for wide open tracks is `CANVAS_W / worldW`, e.g. **0.208** for worldW=6144.

---

## 5. Q2 — Is the stutter pre-existing (sec2 vs master)?

| Item | sec2 (4ba558f) | master HEAD | Δ |
|---|---|---|---|
| `MAX_INVERSE_ZOOM` | 10.0 | 10.0 | none |
| Ratchet stop | 0.533 | 0.533 | none |
| `overviewTargetScreenPx` | 28 | 28 | none |
| snap-zoom formula | identical | identical | none |
| `drawnBodyWidthRefPx` path | identical | identical | none |

Only camera commit between sec2 and master: `51b8ea3` "refactor(camera): single source for battle-pulk thresholds [H-02]" — moved `BATTLE_PULK_THRESHOLD_PX/T` constants to `cameraTimingComputation.js`, zero effect on OVERVIEW zoom.

The raise from `MAX_INVERSE_ZOOM=5.0 → 10.0` happened in commit `ee9b664`, which is **well before** sec2. So sec2 already had the 10.0 ceiling.

**VERDICT: PRE-EXISTING.** Any wide-track + low-racer-count combination that produces a low OVERVIEW snapZoom stutters identically in sec2 and master. The stutter was latent (rarely triggered in normal play with typical racer counts ≥20).

---

## 6. Ranked fix directions

### Rank 1 — Cap OVERVIEW snapZoom via `overviewTargetScreenPx` [HIGH confidence — immediate effect]
**Evidence:** The snap formula `raw = 28 / (bodyNarrow × 1.5)` produces very small raw values (0.26) for low-N races on wide tracks. Lowering `overviewTargetScreenPx` (default 28) makes racers smaller in OVERVIEW but prevents the extreme zoom-out. Alternatively, **add a per-track configurable minimum snapZoom** (e.g., 0.4) so the camera never zooms below effZoom=0.6, capping GPU tiles to ~2.8× leader.
**Configurable via UI:** `overviewTargetScreenPx` is already stored in camera config — owner can raise it. Raising it makes `raw` larger, pushing the snap TOWARD the ratchet ceiling and AWAY from the floor.

### Rank 2 — Raise the ratchet stop ceiling [MEDIUM confidence]
**Evidence:** Ratchet stop is `overviewStateZoom × 0.8 = 0.533`. Raising `OVERVIEW.spriteScale` in camera config (default 1.0) increases `overviewStateZoom` and pushes the ceiling higher. With spriteScale=1.3, ceiling = `(1.3/1.5) × 0.8 = 0.693`, snapZoom for N=8 → `max(0.208, min(0.693, 0.262)) = 0.262` — no improvement because raw=0.262 is below the ceiling regardless. **Raising the ceiling alone doesn't help for the low-N case.** What helps is raising the FLOOR, which leads to Rank 1.

### Rank 3 — UI-configurable minimum OVERVIEW zoom per track [MEDIUM confidence]
**Evidence:** A `minOverviewZoom` config field (e.g., default 0.4 for wide tracks) would floor snapZoom above the overviewZoom, capping worst-case effZoom at 0.4×1.5=0.6. This is UI-configurable, track-specific, and doesn't affect the normal case where bodyNarrow keeps the zoom above the min. Estimated GPU saving for N=8 wide track: (0.393→0.6), GPU drops from 21× to 9× vs leader.

### Rank 4 — Low-resolution OVERVIEW canvas [HIGH confidence — existing PROFILE-ANALYSIS finding]
**Evidence (from PROFILE-ANALYSIS.md):** Rendering OVERVIEW to a half-resolution canvas + CSS `transform: scale(2)` cuts GPU raster pixels by 75%, regardless of zoom level. Applies to ALL tracks and racer counts.

### Rank 5 — Static background on a separate compositor layer [HIGH confidence — existing finding]
**Evidence:** Same as PROFILE-ANALYSIS.md Rank 1 finding. Background doesn't change between frames; promoting it avoids per-frame re-rasterization.

---

## 7. Live browser measurement — status

The `window.__perfProbeZoom()` instrument is wired and ready in the PROD build. Measurement could not be run automatically because the test browser (Playwright) starts with a clean localStorage — no saved track geometries, so races cannot be started. To collect live data:

1. Open `localhost:4173?perfprobe=1` in the **real browser** (which has saved geometries)
2. Start a race on **Mountainstreet** or a wide open track with **8 racers**
3. Let it run 30–60s (OVERVIEW fires automatically)
4. Console: `window.__perfProbeZoom()` → check `overviewZoomBuckets` gap p90 at low-zoom vs high-zoom slots
5. Repeat with **60 racers** on same track

Expected result from analytical model: low-zoom bucket (≈0.26–0.39) → p90 gap ≥50 ms; high-zoom bucket (≈0.53) → p90 gap ≤25 ms.

---

## 8. Single plain-language root cause

**On wide open tracks (worldW ≥ 3 000), the OVERVIEW camera zooms out further when there are fewer racers — because fewer racers → auto-sprite-scale assigns a larger body-width reference → the snap-zoom formula produces a smaller `effZoom` — and each 2× reduction in `effZoom` quadruples the GPU raster area, causing CrGpuMain GPUTask to balloon from ~20 ms (normal) to 110–160 ms (severe), which stalls rAF via vsync-gating; this behavior is identical in sec2 and master (pre-existing, not caused by any recent change).**
