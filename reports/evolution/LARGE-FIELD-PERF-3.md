# LARGE-FIELD-PERF-3 — where the GPU time goes at 80 racers, and cheap fixes measured

**2026-10-05, branch `perf/frame-drops-80` (not merged).** Follows
[LARGE-FIELD-PERF-2](LARGE-FIELD-PERF-2.md), which found that in two thirds of the slow frames'
time at 80 racers the page's main thread waits on the GPU or compositor. Stage 1 measures what the
GPU side is doing; stage 2 builds the cheapest fixes and measures them against master.

**Status:** stage 1 done; stage 2 running.

## Stage 1 — where the GPU time goes (measurement only)

### How it was measured

| | |
| --- | --- |
| **the build** | the production build of master `3d1efa60` (badge clean), with source maps, served with the API from one origin on port 4621 (a server of its own, isolated data folder, fresh account). Shipped defaults. |
| **the GPU** | **`ANGLE (Intel, Intel(R) Graphics (0x00007D45) Direct3D11 vs_5_0 ps_5_0, D3D11)`** — the real GPU through ANGLE/Direct3D 11, not SwiftShader (WebGL's unmasked renderer string; chrome://gpu's text was captured too, in `gpu.json` beside the raw data). |
| **the browser** | Playwright's Chromium, headed, maximized: 1280×665 CSS pixels at **devicePixelRatio 1.5** (about 1920×1000 device pixels) — the same set-up as LARGE-FIELD-PERF-2. |
| **the races** | Quick Test, **the same seeds as LARGE-FIELD-PERF-2**: Luger hill and Mountainstreet at **80**, both at **40** as the baseline. **5 traced races per arm** (20), interleaved round by round, and **2 census races per arm** (8). Each race runs to the result screen, so the ending's wide shot is covered in full. |
| **the trace** | a Chrome performance trace of every traced race (Playwright's `startTracing`, categories `gpu`, `viz`, `cc`, `toplevel`, `devtools.timeline`, `disabled-by-default-devtools.timeline.frame`). A `console.timeStamp('ra-calib')` at a recorded page time puts the trace on the frame clock. **About 600 MB per race**, 13 GB in all. |
| **the census** | a separate race per seed with the page's 2D context wrapped: every call counted by kind, per frame, and every 97th expensive call's stack recorded and mapped through the source maps to the CALL's line. The wrapper costs time, so census races are never timed — their frame rates are not used. |
| **the harness** | extended in place, not rebuilt: [`LARGE-FIELD-PERF-2/run.mjs`](LARGE-FIELD-PERF-2/run.mjs) gained the `trace`, `census` and `port` options, all off by default; the analysis is [`LARGE-FIELD-PERF-3/trace-analyse.mjs`](LARGE-FIELD-PERF-3/trace-analyse.mjs), which streams the traces line by line. |
| **the raw data** | `C:\Users\weudl\ra-measure\LARGE-FIELD-PERF-3\stage1\` (traces, frames, censuses, `gpu.json`); the unedited analysis output is [`LARGE-FIELD-PERF-3/stage1-analysis.txt`](LARGE-FIELD-PERF-3/stage1-analysis.txt). |

**Tracing costs frames too:** the traced races dropped 9.2 % (Mountainstreet 80, N = 25,367 frames)
and 3.6 % (Luger hill 80, N = 25,768) against 9.5 % and 4.0 % untraced in LARGE-FIELD-PERF-2 — close
enough that the traced slow frames are the same kind of frame.

### What a slow frame is made of

Milliseconds per frame, **N = 5 traced races per arm**; a slow frame is one over 33 ms. "Busy" is
the thread's top-level task time inside the frame; the named rows are parts of those tasks.

| per frame, ms | Mountainstreet 80, slow (N = 2,333 frames) | Mountainstreet 80, normal (N = 23,034) | Luger hill 80, slow (N = 924) | Luger hill 80, normal (N = 24,844) | Luger hill 80, slow in the ending wide shot (N = 513) |
| --- | --- | --- | --- | --- | --- |
| **GPU process main thread: busy** | **34.5** | 12.3 | **35.5** | 11.6 | **36.4** |
| — canvas raster (the 2D draw calls executed) | 19.7 | 6.1 | 19.2 | 5.4 | 18.0 |
| — canvas raster flush | 12.5 | 4.2 | 14.3 | 3.6 | 16.6 |
| page main thread: busy | 10.5 | 6.3 | 10.7 | 6.1 | 8.5 |
| — our rAF callback (JavaScript) | 7.1 | 4.6 | 7.2 | 4.4 | 5.6 |
| page compositor thread: busy | 2.0 | 1.5 | 2.0 | 1.5 | 1.7 |
| display compositor (viz): busy | 1.3 | 0.9 | 1.3 | 0.9 | 1.2 |
| — compositing: drawing the layers | 1.1 | 0.6 | 1.2 | 0.6 | 1.1 |
| — compositing: present | 0.4 | 1.0 | 0.2 | 1.5 | 0.2 |

At 40 racers the slow frames (N = 142 Mountainstreet, N = 166 Luger hill) look the same — GPU main
thread 34.2 and 33.7 ms — there are just far fewer of them (0.5 % and 0.6 % of frames).

**What this says.**
- **GPU time against main-thread time:** in a slow frame the GPU process's main thread is busy for
  **34–36 ms — the whole frame** — while the page's main thread is busy for 10–11 ms. The frame is
  late because the GPU process is still executing the previous frames' canvas.
- **Raster against compositing:** **32–35 ms of it is the race canvas's 2D drawing being executed
  (raster) and flushed**; compositing the page's layers, including the large background, is about
  1 ms. **The background canvas is not the bottleneck** — its size is a fact worth knowing, not the
  cause.
- **The canvas sizes:** the race canvas is backed at **1280×720**, the background canvas at the
  **track's world size — 4096×2728 on Luger hill, 6144×4096 on Mountainstreet** — both shown at
  1037×583 CSS pixels, devicePixelRatio 1.5.
- **Layers:** **55 at 40 racers, 96 at 80** (CDP LayerTree, twice per census race, N = 2 races per
  arm): the count grows with the field, and compositing them costs about 1 ms.

### Which 2D calls, and where they come from

Calls per frame, mean over all frames of the census races (N = 2 races per arm; Luger hill 80
N = 8,862 frames, Mountainstreet 80 N = 8,456). The second figure is the last tenth of the race.

| per frame | Mountainstreet 80 | Luger hill 80 | Mountainstreet 40 | Luger hill 40 |
| --- | --- | --- | --- | --- |
| fill | 3,378 · 3,926 | 2,568 · 3,063 | 2,929 · 3,135 | 2,119 · 2,348 |
| arc | 3,007 · 3,563 | 2,304 · 2,805 | 2,557 · 2,773 | 1,850 · 2,090 |
| save / restore | 266 · 243 | 258 · 242 | 134 · 130 | 131 · 128 |
| drawImage | 90 · 80 | 90 · 80 | 43 · 40 | 43 · 40 |
| stroke | 85 · 50 | 59 · 64 | 66 · 31 | 52 · 39 |
| **shadowBlur switched on** | **66 · 577** | **63 · 529** | 34 · 227 | 33 · 254 |
| gradient created | 1 · 1 | 1 · 1 | 1 · 1 | 1 · 1 |
| filter / composite-mode change | 0 | 0 | 0 | 0 |

**The expensive calls by source line** (sampled every 97th call; share of the samples):

| call | what it draws | Mountainstreet 80 (N = 318,973) | Luger hill 80 (N = 255,946) |
| --- | --- | --- | --- |
| `fill` at `client/src/modules/trackLights.js:147` and `:152` (`drawTrackLights`) | the track lights: a halo and a core, **two circle fills for every light on both boundaries, every frame, on screen or not** | **57.4 %** | **49.4 %** |
| `fill` at `client/src/screens/RaceScreen/drawing/racerRendering.js:173` (`paintRacer`) | the racer trails: ten fading dots per racer | **21.9 %** | **28.6 %** |
| `fill` at `client/src/screens/RaceScreen/drawing/trackRendering.js:109` | the crowd strip, across the whole world width | 7.9 % | 6.9 % |
| `drawImage` at `client/src/racer-types/SpriteRacerType.js:238` | the racer sprites | 2.5 % | 3.2 % |
| `shadowBlur` + `fill` at `client/src/screens/RaceScreen/drawing/particleRendering.js:50`, `:55` (`drawParticles`) | the finish bursts: **a blur switched on for every burst particle** | 3.3 % | 4.2 % |

### The top GPU-side causes

1. **The track lights — about half of the canvas work** (57 % of the sampled expensive calls on
   Mountainstreet, 49 % on Luger hill). Every light on both boundaries is drawn as two antialiased
   circles every frame, including the ones far outside the shot. Mountainstreet's world is larger, so
   it has more lights — which is why it drops more frames than Luger hill.
2. **The racer trails — about a quarter** (22 % and 29 %): ten circles per racer, so the cost doubles
   with the field, which is the step from 40 to 80.
3. **The finish bursts' blur — the ending.** `shadowBlur` is switched on about 550 times per frame in
   the last tenth of the race, against about 65 overall, one blur per burst particle. A blur is an
   off-screen pass on the GPU for each particle. On Luger hill's ending wide shot the raster flush
   rises from 14.3 to 16.6 ms per slow frame (N = 513 against 924), the clearest difference between
   that moment and the rest of the race.

**Seeds (Quick Test seeds).** Traced: Mountainstreet 80 — 477662, 524497, 906411, 304256, 544859;
Luger hill 80 — 170767, 955724, 918686, 625497, 141942; Mountainstreet 40 — 40884, 416737, 223467,
923614, 720655; Luger hill 40 — 942358, 93643, 87869, 239979, 146509. Census: the first two of each.
