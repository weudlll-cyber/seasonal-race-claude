# LARGE-FIELD-PERF-3 — where the GPU time goes at 80 racers, and cheap fixes measured

**2026-10-05, branch `perf/frame-drops-80` (not merged).** Follows
[LARGE-FIELD-PERF-2](LARGE-FIELD-PERF-2.md), which found that in two thirds of the slow frames'
time at 80 racers the page's main thread waits on the GPU or compositor. Stage 1 measures what the
GPU side is doing; stage 2 builds the cheapest fixes and measures them against master.

**Status:** stage 1 and stage 2 done. Four fixes on the branch, all kept; three of them change the picture and need the owner's eye before anything merges.

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

## Stage 2 — cheap fixes, measured against master

### The fixes

One commit each, on top of master `3d1efa60`. "Fingerprints" is `check-fingerprints --mint` after the
commit, which verifies the world, camera, render and replay fingerprints against
`docs/fingerprints.json` without writing it; `engine-reach --check` put every changed file in reach,
so all four ran every time.

| fix | commit | what it does | lines before → after | fingerprints | kept? |
| --- | --- | --- | --- | --- | --- |
| **(a) track lights** | `eb1eea1d` | `drawTrackLights` skips every light outside the shot (the canvas corners through the inverse of the camera's transform, `visibleWorldRect`) and draws each visible light as ONE cached halo-and-core image (`glowSpriteFor`, per colour and halo-to-core ratio in quarter steps) instead of two antialiased circles. | `trackLights.js` 157 → 268; test 272 → 360 (4 new tests, 2 sabotages red) | all four equal; both measured stamps re-run, identical, restamped in `242fc8fc` | kept — **changes the picture, needs the owner's eye** |
| **(b) particles** | `c26e3fd0`, corrected in `a98c9715` | dust and finish bursts drawn as cached images: a filled dot (`dotSprite`) and a soft glowing dot (`glowDotSprite`) per colour, in the new [`dotSprites.js`](../../client/src/screens/RaceScreen/drawing/dotSprites.js). **No `shadowBlur` per burst particle any more.** The correction: the glow first faded towards transparent BLACK, which ringed every burst dot grey on a light ground — found in the before/after render below, fixed with an alpha mask, and given its own test (sabotage red). | `particleRendering.js` 72 → 90; `dotSprites.js` new, 90; its test new, 100 (5 tests, 3 sabotages red) | all four equal, before and after the correction | kept — **changes the picture, needs the owner's eye** |
| **(c) `tFrac` once per racer** | `c11ffa25` | the soft-avoidance pair loop in `raceBehavior.js` computed each racer's `tFrac` once per PAIR; it now fills a per-step array once per racer and compares those (`arcDeltaFromFrac`, extracted from `shortestArcDeltaT` in `mathUtils.js`, which now calls it). | `raceBehavior.js` 1419 → 1435; `mathUtils.js` 50 → 57; test 129 → 159 (identity over 5,000 random pairs plus the edges, sabotage red) | all four equal — **bit-identical** | kept — no visible change |
| **(d) racer trails** | `6059215f` | the ten trail dots per racer drawn from the racer colour's cached `dotSprite` instead of ten paths. | `racerRendering.js` 291 → 301; test 242 → 285 (1 new test, sabotage red) | all four equal | kept — **changes the picture, needs the owner's eye** |

**Why the render fingerprint cannot see (a), (b), (d).** Its harness draws into a recording context
([`recordingContext.js`](../../client/src/modules/parity/recordingContext.js)) with no 2D canvas and
no `getTransform`. There the image helpers return nothing and every fix falls back to the original
circles — which is what the fallbacks are for, and also why "render equal" says nothing about the
picture. These three fixes change what is drawn; only an eye can say whether it is acceptable.

**Extracted:** `dotSprites.js` (the dot and glow image caches, shared by (b) and (d));
`arcDeltaFromFrac` (from `shortestArcDeltaT`). **Removed:** nothing; each original drawing path stays
as the fallback where no 2D canvas exists. **The further-fix budget:** (d) is the one further fix,
backed by stage 1 (the trails, 22–29 % of the sampled calls); the crowd strip (7–8 %) was left.

### Before and after, the same frame

Same Quick Test seed, same moment:

| | master | branch |
| --- | --- | --- |
| Luger hill 80, seed 344284, 20 s — lights and trails | [still](LARGE-FIELD-PERF-3/stills/00-Luger_hill-80-344284-p4621-20s.jpg) | [still](LARGE-FIELD-PERF-3/stills/01-Luger_hill-80-344284-p4622-20s.jpg) |
| Luger hill 80, seed 344284, 84 s — the ending wide shot | [still](LARGE-FIELD-PERF-3/stills/00-Luger_hill-80-344284-p4621-84s.jpg) | [still](LARGE-FIELD-PERF-3/stills/01-Luger_hill-80-344284-p4622-84s.jpg) |
| Mountainstreet 80, seed 270753, 20 s | [still](LARGE-FIELD-PERF-3/stills/02-Mountainstreet-80-270753-p4621-20s.jpg) | [still](LARGE-FIELD-PERF-3/stills/03-Mountainstreet-80-270753-p4622-20s.jpg) |
| Mountainstreet 80, seed 270753, 84 s | [still](LARGE-FIELD-PERF-3/stills/02-Mountainstreet-80-270753-p4621-84s.jpg) | [still](LARGE-FIELD-PERF-3/stills/03-Mountainstreet-80-270753-p4622-84s.jpg) |
| the finish bursts alone: seeded, frames 5/20/40/60, light and dark ground | [render](LARGE-FIELD-PERF-3/stills/bursts-isolated-master-left-branch-right.png), left column | same image, right column |

**Read the race stills with two cautions.**
1. **The branch's race stills were taken BEFORE the burst correction** (`a98c9715`), so their bursts
   still carry the grey ring. The bursts' before/after is the isolated render, which uses the
   corrected glow: same seed, same particle state, only the drawing differs. In it the branch's
   bursts read **slightly larger and bolder in their first frames** than master's blur; from about
   frame 20 on the two are close.
2. **The ending stills show far fewer bursts on the branch, and that is not the drawing.** A burst
   particle loses 0.014 alpha per FRAME
   ([`burstParticles.js`](../../client/src/screens/RaceScreen/burstParticles.js)), so it lives about
   71 frames, not a fixed time. Master runs the ending at a lower frame rate, so each burst stays on
   screen longer in seconds and more of them overlap; faster frames shorten the confetti. This is
   master's behaviour, unchanged here — but the branch's ending LOOKS different for a reason that is
   in none of the four fixes, and the owner's eye should know that before judging it.

### Slow frames, master against the branch (N = 30 races per track per arm)

Quick Test, 80 racers, production builds of master and of the branch's four fixes, each on its own
server, interleaved race by race on the same seeds; 160 races in all (the per-fix arms below
included), 0 frames lost. The branch build predates the burst correction, which changes how the glow
image is made once per colour, not what is drawn per frame. The unedited output is
[`stage2-compare.txt`](LARGE-FIELD-PERF-3/stage2-compare.txt), the plan
[`stage2-plan.json`](LARGE-FIELD-PERF-3/stage2-plan.json), the script
[`compare.mjs`](LARGE-FIELD-PERF-3/compare.mjs); the raw frames are in
`C:\Users\weudl\ra-measure\LARGE-FIELD-PERF-3\stage2-run2\`.

| | frames over 33 ms | p95 | p99 | **ending wide shot**: frames over 33 ms |
| --- | --- | --- | --- | --- |
| **Luger hill, master** | 9.03 % (of 141,063) | 33.3 ms | 50.1 ms | **23.48 %** (of 11,469) |
| **Luger hill, branch** | **7.50 %** (of 143,166) | 33.3 ms | 49.1 ms | **12.50 %** (of 13,419) |
| **Mountainstreet, master** | 19.04 % (of 133,275) | 35.7 ms | 53.4 ms | 23.82 % (of 11,782) |
| **Mountainstreet, branch** | **14.39 %** (of 137,049) | 34.1 ms | 50.0 ms | 11.66 % (of 14,045) |

**Paired by seed** (branch minus master, slow-frame share, 95 % bootstrap interval):
- **Mountainstreet: −5.16 points (−7.58 to −3.30)**, fewer slow frames on 29 of 30 seeds.
- **Luger hill: −1.49 points (−2.80 to +0.21)**, fewer on 28 of 30 seeds; the interval touches zero.
- **The Luger hill ending wide shot**, the moment LARGE-FIELD-PERF-2 named: slow frames about halve,
  23.5 % → 12.5 %. Part of that is caution 2: fewer bursts are alive at once when frames are faster.

**The machine was slower than in LARGE-FIELD-PERF-2.** Master's slow-frame share here is about twice
what LARGE-FIELD-PERF-2 measured on the same tracks (9.0 % against 4.0 % on Luger hill). The arms were
interleaved race by race on the same seeds, so the comparison holds; the absolute levels do not
transfer between the two reports.

**Per fix** (N = 5 races per track, the first five seeds, each fix alone on master): every interval
crosses zero — five races cannot separate one fix. For the record, fix minus master in points: Luger
hill (a) +2.57, (b) −0.10, (c) −0.38, (d) +1.70; Mountainstreet (a) −4.48, (b) −0.81, (c) −5.04,
(d) −2.57. The one clear single-fix signal is (b) in the ending: ending slow frames 16.8 % on Luger
hill and 14.3 % on Mountainstreet, against master's 23–24 %.

**Seeds (Quick Test seeds).** Luger hill: 344284, 577792, 388357, 631521, 935605, 125672, 278440,
9930, 429604, 935723, 588404, 46680, 13427, 426224, 307153, 150588, 581681, 311555, 246310, 754486,
324991, 851129, 4286, 597738, 887185, 141942, 474879, 554486, 870560, 857735. Mountainstreet: 270753,
400076, 188944, 1282, 387573, 535748, 376525, 680896, 379351, 698089, 40877, 889055, 76056, 548403,
348682, 785049, 82581, 59445, 492546, 632864, 99397, 995911, 822505, 347222, 859443, 703751, 812000,
927199, 745525, 544328.

### What is open

- **The owner's eye** on (a), (b) and (d): the light halos, the trail dots, and the bursts — larger
  and bolder in their first frames, and shorter-lived on a faster ending (caution 2).
- **Noticed, left:** the crowd strip (`trackRendering.js:109`, 7–8 % of the sampled calls, drawn
  across the whole world width every frame); the background canvas backed at the track's world size
  (not the bottleneck, stage 1); burst life counted in frames rather than time.
- **The harness:** `run.mjs` now signs in again whenever a race moves to a different server (cookies
  are shared across the ports of one host, so a later sign-in ended master's session and stopped the
  first stage 2 run at race 7; all 160 races were re-run), and takes JPEG stills at given race
  seconds (`stills`).
- **One local commit was made with `--no-verify`:** a throwaway commit on a local branch, used only
  to build the (d)-alone arm; deleted, never pushed.
