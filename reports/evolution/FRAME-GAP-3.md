# FRAME-GAP-3 — it is the standings list. The background layer costs nothing, and the prediction was wrong.

**Branch** `feat/frame-gap-3`, cut from `feat/frame-gap-2` (`80f772fe`). **Diagnosis only — no source
file changed, React untouched, nothing fixed.** All four fingerprints re-run and unchanged;
`engine-reach --check` clears every changed path.

**THE OWNER PREDICTED THE BACKGROUND LAYER, AND IT IS REFUTED — cleanly, and in the strongest form
the design allows.** Across **eight batches of 900 frames at the large window and three at the
small**, the arm with the 6144×4096 background layer present and the standings list hidden is
**indistinguishable from the arm with both hidden**: `rafLate` p90 **0.6 ms in every single batch**,
and **zero missed frames in 7200**. The arm with the list present and the background layer hidden is
**elevated in every batch** — `rafLate` p90 1.4–4.0 against a 0.6 floor.

**It is the standings list.**

---

## The four arms

Production bundle, 100 racers, mountainstreet, mid-race, 900 measured frames per arm after a
90-frame warm-up, four arms interleaved in a fixed order inside every batch, each arm rebuilding the
race so all four start from the identical state.

**The `aside` is never hidden — only the `.scoreboard` inside it.** FRAME-GAP-2 hid the whole
sidebar, which took the 210 px column out of the grid and moved the canvas box from 1021×575 to
1037×583. Here **`cssBox` is reported per arm and is identical (1023×575 large, 605×340 small) in all
four**, so the canvas the browser composites is the same in every arm and only the two suspects vary.

The instrument is the shipped one: this drives `perfLog.js`'s `createPerfLog` /
`startLongTaskObserver` / `recordPerfFrame` / `getPerfStats`, so the numbers come from the code the
owner's HUD runs — and the long-task observer got exercised end to end in a production bundle.

### LARGE window (canvas 1023×575) — 8 batches, 7200 frames per arm

| arm | missed vsync | rate | rafLate p90, per batch | render p50 | pace |
| --- | --- | --- | --- | --- | --- |
| **1 list + bg** (the baseline) | **56 / 7200** | **0.78 %** | 12.0, 5.6, 5.4, 4.0, 3.8, 4.0, 3.7, 4.8 | 3.9–5.5 | 1001–1002 |
| **2 bg only** (list hidden) | **0 / 7200** | **0 %** | **0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6, 0.6** | 3.1–4.0 | 1001 |
| **3 list only** (bg hidden) | **6 / 7200** | 0.08 % | 1.7, 3.3, 2.4, 4.0, 2.0, 4.0, 3.3, 3.5 | 3.5–4.0 | 1001 |
| **4 neither** (floor) | **0 / 7200** | **0 %** | 0.6, 0.6, 0.6, 0.7, 0.6, 0.8, 0.6, 0.6 | 2.9–3.5 | 1001 |

### SMALL window (canvas 605×340) — 3 batches, 2700 frames per arm

| arm | missed vsync | rate | rafLate p90, per batch |
| --- | --- | --- | --- |
| 1 list + bg | 4 / 2700 | 0.15 % | 6.4, 1.6, 1.6 |
| 2 bg only | **0 / 2700** | 0 % | **0.6, 0.6, 0.6** |
| 3 list only | 1 / 2700 | 0.04 % | 2.2, 1.4, 1.6 |
| 4 neither | **0 / 2700** | 0 % | 0.6, 0.6, 0.6 |

`total` p50 is 16.7 and p90 16.8 in **every arm of every batch** — the missed frames are a tail, not a
shift, and `max` is 33.2–33.4 (one missed vsync) wherever they occur. Pace is 1001–1002 throughout:
the race keeps real time in all four arms.

## Reading it honestly

- **Arm 2 is the result.** The background layer, present and re-transformed on every frame, is
  **exactly the floor**: `rafLate` p90 0.6 in eleven batches out of eleven, zero missed frames in
  9900. Not "small" — indistinguishable. **The prediction is refuted.**
- **Arm 3 is the cause.** The list alone lifts `rafLate` p90 off the 0.6 floor in every batch and
  produces missed frames where arms 2 and 4 produce none.
- **Arm 1 versus arm 3 is where I must not overclaim.** Arm 1's 56 misses are dominated by ONE batch
  that produced 48; the other seven produced 0, 5, 0, 2, 0, 1, 0. Excluding that batch, arm 1 is
  8/6300 against arm 3's 6/6300 — **the same**. So the defensible statement is: **the list reproduces
  essentially the whole effect on its own, and adding the background layer occasionally makes it much
  worse** (that batch, and arm 1's 12.0 ms `rafLate` tail against arm 3's 4.0 ceiling). The
  combination is worse than either; the background layer alone is nothing.
- **Window area still multiplies it**, and it multiplies the LIST's effect: arm 1 goes 0.78 % → 0.15 %
  and arm 3 0.08 % → 0.04 % when the canvas drops to a third of the area. This is why the owner's
  window-shrink worked, and it is not evidence for the background layer.

## THE RATE IS STILL NOT REPRODUCED, and that is the honest limit

The owner sees **40 % of frames at 33.3 ms**. The worst single arm here was **5.33 %**; the pooled
baseline rate is **0.78 %**. **Fifty times short.** The MODE is reproduced reliably now — it appears
in most batches — but the RATE is not, across 11 batches × 4 arms × 900 frames ≈ **40 000 measured
frames, about eleven minutes of running**. Something in his session sustains what this harness only
flickers into, and this block does not know what. The three untested differences remain the ones
FRAME-GAP-2 named: **React** (this list is hand-rolled DOM; his goes through the reconciler), the real
decoded JPEG background, and his browser profile.

**A long-task finding worth recording**: every arm reports `longTasks.count` of 0 or 1, and where it
is 1 the single entry is **~3.7–4.2 s** — that is the harness's own synchronous scene build and
20-second race advance, which happens in the same task that registers the observer. **Inside the
measured frames there are no long tasks at all in any arm.** So the missed vsyncs are **not** caused
by ≥50 ms JavaScript blocks; whatever costs the time is not a script we could break up.

## What the standings list actually is, and the four setState calls

`RaceScreen/index.jsx` renders `aside.race-hud` → `.scoreboard` → **one `.scoreboard-row` per racer**,
each a 4-column CSS grid of four `<span>`s with inline `color` / `borderColor`. At 100 racers that is
**100 keyed rows and ~400 elements**, and rank order changes constantly, so React **moves** keyed DOM
nodes rather than only re-texting them.

The `setState` calls made from inside the rAF loop, and what each updates:

| line | call | when | what it costs |
| --- | --- | --- | --- |
| ~904 | **`setScoreboard(...)`** | **every 250 ms** while racing, on a physics-time bucket boundary | **the whole list.** It builds a fresh 100-element array — `[...st.racers].sort(...).map((r, i) => ({ ...r, rank: i + 1 }))` — so **every row gets a new object identity every tick** and React re-renders and re-orders all 100 |
| ~1219 | `setCamState(newHudState)` | only when the director's HUD state changes | one small badge |
| ~1225 | `setCamAnchor(newAnchor)` | only when the anchor racer changes | one small label |
| ~1346 | `setCountdown(...)` | countdown only, not during the race | one digit |

Plus three one-shots: `setPhase(RACING)` at the gun, `setPhase(FINISHED)`, `setWinnerOverlayText`.

**Only `setScoreboard` is load-bearing.** The other three are already guarded by change checks or fire
once; `setScoreboard` fires four times a second and hands React 100 brand-new objects each time.

## The cheapest fix — named, not built

**Nothing here is implemented, and choosing among these is the owner's call.**

1. **Cheapest by far: cut the cadence.** The 250 ms bucket is a constant in the loop. At 500 ms or
   1 s the list still reads as live and the work halves or quarters. One number, no structural change.
2. **Stop handing React 100 new objects.** `map((r, i) => ({ ...r, rank: i + 1 }))` guarantees every
   row re-renders even when nothing a row displays has changed. Emitting a small flat record per row
   (index, rank, name, number, finished, finishTime) and memoising the row component would let React
   skip the rows that did not move.
3. **Only if those are not enough**: virtualise the list, or take it out of React's per-tick path
   entirely. Much larger, and not justified by anything measured here.

**For completeness, since the brief asked what forces the background layer to be re-transformed:** it
is a second `<canvas>` (`bgCanvasRef`), absolutely positioned behind the race canvas, sized to
`worldWidth × worldHeight` — **6144×4096 = 25.2 Mpx on mountainstreet** — drawn ONCE when the image
loads, after which the rAF loop writes `bgCanvasRef.current.style.transform = translate3d(…)
scale3d(…)` on every frame to pan and zoom it with the camera. **It measured as free, so there is
nothing to fix there**, and that is the useful part of this finding: a change to it would have cost
effort and bought nothing.
