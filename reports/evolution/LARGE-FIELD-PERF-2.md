# LARGE-FIELD-PERF-2 — why frames drop at 80 racers

**2026-10-04/05. Measurement only — no product change, no fingerprint can move.** Follows
[LARGE-FIELD-PERF-1](LARGE-FIELD-PERF-1.md), which found that open tracks at 80 racers drop frames
(Mountainstreet the worst; Luger hill stuttering in the ending's wide shot) and did not say why.

## How it was measured

| | |
| --- | --- |
| **the build** | the production build of master `c104c5b6` (badge clean), built **with source maps** (`vite build --sourcemap`) into a folder outside the repository, served with the API from one origin on port 4620 (a server of its own, isolated data folder, fresh account). Shipped defaults, no setting changed. Exact field size (EXACT-FIELD-SIZE-1) is in this build, so 80 means 80. |
| **the races** | real browser races started with **Quick Test**, the seed set through the Quick Test seed. **30 races in five interleaved rounds**; each round ran Mountainstreet and Luger hill at **80** with the profiler, both at **40** (the baseline), and the same two 80-racer races again **with the profiler off**. |
| **the browser** | Playwright's Chromium, **headed**, maximized on the machine's display (1920×1200, 60 Hz, integrated Intel graphics, Intel Core Ultra 7 165U); occlusion and background throttling off. Nothing else ran on the machine. |
| **frame times and moments** | the project's existing probe **`client/src/modules/rAFProbe.js`** (`?perfprobe=1`), for each frame's camera state, stitched with the harness's own rAF timestamps. **0 frames lost and 0 stitch mismatches in all 30 races.** `enablePerfLog` was **not** used: its phases end at "all canvas drawing" and cannot split drawing into racers, labels, effects and minimap. |
| **which code** | **Chrome's own CPU profiler** (DevTools Protocol, one sample per millisecond), each sample mapped through the build's source maps to its original file and function, and put on its frame by a calibration marker. A sample is given one category from the most specific frame on its stack (the rules are in `analyse.mjs`). |
| **the harness, committed** | [`LARGE-FIELD-PERF-2/run.mjs`](LARGE-FIELD-PERF-2/run.mjs) (the races), [`analyse.mjs`](LARGE-FIELD-PERF-2/analyse.mjs) (the tables), [`plan.json`](LARGE-FIELD-PERF-2/plan.json) (the 30 races and seeds) and [`analysis-output.txt`](LARGE-FIELD-PERF-2/analysis-output.txt) (the unedited output). |
| **the raw data** | outside the repository and outside `C:\tmp`: `C:\Users\weudl\ra-measure\LARGE-FIELD-PERF-2\raw\` — per race a `.frames.json` (30) and, for the 20 profiled races, a `.cpuprofile` — 16 MB in all — and `dist\` with the build and its source maps (8 MB). |

**Two things to read the numbers with.**
- **The profiler costs a little.** With it, the share of frames over 33 ms was 4.4 % (Luger hill, 80)
  and 10.9 % (Mountainstreet, 80); without it, on the same seeds, **4.0 % and 9.5 %**. So the
  profiler adds roughly a tenth to the slow frames; the attribution below is from the profiled runs,
  the rates to quote are the unprofiled ones.
- **The display's cadence changed during the run.** For races 1–16 a normal frame was 17.4–17.7 ms;
  from race 17 on it was 16.7 ms (the machine, not the build). The rounds were interleaved, so every
  arm has races on both sides of the change and the comparisons between arms hold.

**What a "slow frame" is here:** a frame over 33 ms — one missed frame or worse.

## Results

| arm | N races | N frames | frames > 33 ms | > 50 ms | p50 | p95 | p99 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mountainstreet 80, profiler off | 5 | 24,670 | **2,343 (9.5 %)** | 41 | 16.8 | 33.3 | 36.0 |
| Mountainstreet 80 | 5 | 24,058 | 2,611 (10.9 %) | 52 | 17.5 | 34.8 | 36.5 |
| Mountainstreet 40 | 5 | 25,231 | 232 (0.9 %) | 6 | 17.4 | 18.7 | 19.3 |
| Luger hill 80, profiler off | 5 | 25,181 | **999 (4.0 %)** | 82 | 16.7 | 18.3 | 35.6 |
| Luger hill 80 | 5 | 24,612 | 1,080 (4.4 %) | 55 | 17.4 | 18.8 | 35.9 |
| Luger hill 40 | 5 | 24,892 | 223 (0.9 %) | 6 | 17.4 | 18.7 | 19.0 |

**Doubling the field from 40 to 80 multiplies the slow frames by about ten on Mountainstreet and
about four and a half on Luger hill.**

### Where the slow frames fall (profiler off, N = 5 races each)

- **Mountainstreet, 80:** all race long — 1,910 of 2,343 while the race runs, 423 in the ending's
  wide shot, 10 at the start. By camera state: the leader shot 1,194, the wide shot 1,143.
- **Luger hill, 80: the ending's wide shot holds half of them** — 485 of 999 slow frames fall in the
  last tenth of the race, in the wide shot; 502 while the race runs; 12 at the start. That tenth of the
  race carries half of its slow frames, which is the stutter LARGE-FIELD-PERF-1 saw.

### What took the time in the slow frames (profiled runs)

The first finding is about **all** of it: **in two thirds of the slow frames' time the page's main
thread was idle** — 66.5 % on Mountainstreet (N = 59,970 one-millisecond samples inside slow frames),
69.0 % on Luger hill (N = 25,252), and the same at 40 racers (66.0 % and 71.2 %). A frame that is late
while the main thread waits is waiting on **the GPU or the compositor** — the drawing has been
submitted and is not finished. The CPU profiler cannot see inside the GPU, so that part is measured as
"waiting", not explained.

The **working** time inside slow frames, split (share of working samples; N = 20,060 Mountainstreet,
N = 7,840 Luger hill):

| category | Mountainstreet 80 | Luger hill 80 |
| --- | --- | --- |
| browser's own main-thread work (style, layout, paint, compositing) | 22.6 % | 23.9 % |
| physics | 17.6 % | 14.4 % |
| track effects / particles | 15.3 % | 18.9 % |
| drawing racers | 12.2 % | 11.9 % |
| other race drawing (track, background) | 11.0 % | 10.4 % |
| other app code | 9.3 % | 8.7 % |
| name tags / labels | 5.0 % | 4.8 % |
| garbage collection | 2.9 % | 2.8 % |
| camera director | 2.5 % | 2.6 % |
| minimap | 1.2 % | 1.2 % |
| React / DOM updates | 0.2 % | 0.4 % |
| scoreboard | 0.1 % | 0.1 % |

**In Luger hill's ending wide shot** (N = 2,795 working samples): the browser's own work 25.0 %,
**track effects 24.9 %**, drawing racers 11.1 %.
**At the start** (both tracks, both sizes): 85–92 % is the first frame's background preparation,
`getBgCanvasReady` (`client/src/screens/RaceScreen/drawing/trackRendering.js:20`), a one-off.

## The top three causes, per track

Shares are of all sampled time inside slow frames (working + idle). Hot code is named by the line its
function **starts** on: that is what the profiler records. Each is N = 5 profiled races.

**Mountainstreet, 80 racers** (N = 59,970 samples in 2,611 slow frames)
1. **The GPU/compositor — 66.5 %.** The main thread is idle while the frame is late.
2. **The browser's own main-thread rendering work — 7.6 %** (`(program)` in the profile: style,
   layout, paint and compositing set-up).
3. **Physics — 5.9 %**, led by the racers' avoidance pass: `applyRacerBehavior`
   (`client/src/modules/raceBehavior.js:543`) and inside it `tFrac` (`client/src/utils/mathUtils.js:33`)
   — 7.8 % of working time on its own, called once per racer pair compared.
   Close behind: **track effects, 5.1 %** — the line-effect renderer (`client/src/modules/surface-effects/generators/line.js:103`)
   and the track lights (`client/src/modules/trackLights.js:129`).

**Luger hill, 80 racers** (N = 25,252 samples in 1,080 slow frames)
1. **The GPU/compositor — 69.0 %.**
2. **The browser's own main-thread rendering work — 7.4 %.**
3. **Track effects / particles — 5.9 %** — the line-effect renderer (`line.js:103`, 7.4 % of working
   time), `drawParticles` (`client/src/screens/RaceScreen/drawing/particleRendering.js:40`, 5.2 %) and
   the track lights (`trackLights.js:129`, 3.8 %). **In the ending's wide shot they are the largest
   piece of our own code** (24.9 %), level with the browser's own work.
   Then physics, 4.5 %.

## The cheapest fix for each, proposed and NOT built

| cause | the cheapest step | why that one |
| --- | --- | --- |
| **GPU/compositor waiting** | First find out what the GPU is doing, with one Chrome **performance trace** (Tracing, GPU category) of a Luger hill ending — the CPU profiler cannot. The likeliest single culprit to test first is the **canvas blur on the track lights** (`trackLights.js:129` sets `shadowBlur` for every light, every frame), which is expensive on integrated graphics; drawing the glow once into a cached image and stamping it would remove it. A second candidate is the cost of scaling the 1280×720 race canvas up to the window (FRAME-GAP-1 found the browser's share grows with window area). | It is two thirds of the slow time, and nothing in our JavaScript can shorten it until we know which drawing the GPU is stuck on. |
| **The browser's own main-thread work** | The same trace, which splits `(program)` into style, layout, paint and compositing; then look for a DOM element on the race screen that changes size or position every frame. | A quarter of the working time, and the CPU profile cannot divide it further. |
| **Physics: the avoidance pass** | Compute `tFrac(r.t)` once per racer per step and reuse it in the pair comparisons, instead of once per pair. The value is identical, so the race stays the same — but `raceBehavior.js` is inside the race hull, so it would still need the fingerprint check and the measured stamps before it ships. | Its cost grows with the number of pairs, which is why 80 racers cost far more than 40. |
| **Track effects / particles** | Batch `drawParticles`: one path per colour and alpha instead of one `arc` + `fill` per particle; and for the line effect, fewer alpha tiers. The look changes slightly, so it needs the owner's eye. | The largest piece of our own code in Luger hill's ending wide shot, where the stutter is. |

## Limits

- **One machine** with integrated graphics. On a discrete GPU the idle share would likely shrink and
  the ranking of our own code would stay. The ranking is what transfers, not the percentages.
- **The profiler's 1 ms sampling** puts about 35 samples in a slow frame: enough to rank causes over
  thousands of slow frames, not to explain one frame.
- **Functions, not lines.** Source maps give each sample's function, located by the line it starts on.
  `tFrac` is a one-line function, so for it the line is exact.
- **Categories are rules.** They are in `analyse.mjs`. Where the source map gives only a minified
  name, name tags are identified by `drawNameTag`'s line range in `racerRendering.js` (checked on
  master `c104c5b6`).

## Seeds (Quick Test seeds)

From [`plan.json`](LARGE-FIELD-PERF-2/plan.json), in order:
- Mountainstreet 80 (with and without profiler, the same five): 477662, 524497, 906411, 304256, 544859
- Luger hill 80 (the same five in both arms): 170767, 955724, 918686, 625497, 141942
- Mountainstreet 40: 40884, 416737, 223467, 923614, 720655
- Luger hill 40: 942358, 93643, 87869, 239979, 146509

## Lines

New: `run.mjs` 215, `analyse.mjs` 264, `plan.json` and `analysis-output.txt` (data). No source file
changed. Reused: `rAFProbe.js` (frame states), `source-map-js` (already a dependency), Playwright
(already a dependency), the Quick Test seed field.
