# CANVAS-SCALE-1 — the drawing surface gets a size control, and the measurement disagrees with the hope

**Branch** `feat/canvas-scale-1`, cut from master `f69f66fb`. **Not merged, nothing minted.**
This is a picture change and it waits for the owner's eye.

**The three fingerprints and the OFF world were all re-measured on this branch and NONE moved:**
world `dc4647be0f55ebdb`, world-off `854018ee5d3d83e1`, camera `d54d6332fb8d36c6`, render
`9580ff2e3626b3b9` — the values in [docs/fingerprints.json](../../docs/fingerprints.json), which is
their one home. Nothing was written into that file; the shipped default of the new key is 1.0 and
1.0 is byte-identical to the state before the key existed.

---

## 1. WHAT THE CANVAS ACTUALLY DOES TODAY — established first, because it changes the answer

The block was asked to establish, before choosing the shape of the control, which device pixel ratio
the race canvas is sized at. The answer is not one of the two the question anticipated.

**`devicePixelRatio` appears nowhere in `client/src`.** Not in the race screen, not in the camera, not
anywhere. The race canvas's backing store is a hard-coded constant:

- `RaceScreen/index.jsx` declares `CANVAS_W = 1280`, `CANVAS_H = 720` and puts them on the element as
  its `width`/`height` attributes. The store is 1280×720 on every machine, at every window size, at
  every DPR.
- `.race-canvas` is `width: 100%; height: auto`, so the browser stretches that fixed store onto
  whatever box the layout gives it. The wrapper is the `1fr` column of a `1fr 210px` grid that fills
  the viewport.

**So 1.0 does not mean "the CSS box" and it does not mean "the CSS box times DPR". It means 1280×720,
full stop — and on the owner's machine that is already LESS than the CSS box.** Measured in his own
browser during this block: `devicePixelRatio` is **1.5**, the screen is 1280×800 CSS px, and a
maximised window gives the race canvas a CSS box of **1058×595**, which is **1587×893 device pixels**.
The store is 1280×720. The picture is being **upscaled by about 1.5× in area before anything else
happens**.

**Therefore the control is a FRACTION of the reference, not a DPR cap.** A DPR cap presumes there is
DPR headroom to give away; here there is none — the canvas is already coarser than the display it is
stretched onto. Every step below 1.0 spends real sharpness. That is why the slider's shipped default
is 1.0 and why the owner's eye, not a measurement, has to pick the number.

### What was built

- **`renderScale` in `DEFAULT_FRAME_TIMING_CONFIG`** (`defaults.js`), with `RENDER_SCALE_MIN` /
  `RENDER_SCALE_MAX` and validation in `frameTimingConfig.js` — one home for the range, so the slider
  cannot offer a value the loader would reject and silently snap back from.
- **The store is sized `round(1280·s) × round(720·s)`** at race init, and **a base transform of
  exactly `s` is re-applied at the top of every frame**, immediately before the clear. Re-applied per
  frame rather than set once, so no save/restore imbalance anywhere in the draw path can quietly lose
  it. At `s = 1` it is the identity matrix the context already had.
- **A Dev Screen slider** in the Frame Timing card, showing the store size and the percentage of the
  pixels drawn at 1.00 — the AREA, because the area is what the drawing costs.

## 2. THE FINDING THE BLOCK WAS TOLD TO LOOK FOR — and it was there

> _"If any of them reads the backing store size, that is a FINDING — report it, because it would mean
> the slider changes the picture's CONTENT rather than only its sharpness."_

**It did.** `RaceScreen/index.jsx` handed `renderRaceFrame` `canvasW: canvas.width` and
`canvasH: canvas.height` — the BACKING STORE — and the renderer spends those on **layout**:

| what reads it | what it decides |
| --- | --- |
| `tagFontScreenPx(nameTagFrameFrac, canvasH)` | the name-tag FONT SIZE |
| `computeRenderDisplayScale(…, canvasH)` | the minimum drawn racer size (the readability floor) |
| `computeTagLayout({ canvasW, canvasH })` | the label layout's screen box, and therefore which labels are drawn at all |
| `renderMinimap(…, canvasW, canvasH)` | where the minimap sits |
| `hudRightColumn(canvasW, canvasH)` | where the HUD column sits |

Those reads were only ever correct because the store happened to equal the reference. Left alone, the
first move of the slider would have shrunk every label, moved the minimap and the HUD, and changed
which labels the decluttering rule grants — a **content** change wearing a sharpness control's
clothes. They now read the reference constants. **At 1.0 that is a no-op, which is why the render
fingerprint did not move.**

One further read was found and left alone, deliberately: `cullBounds` in
`surface-effects/generators/spriteHelpers.js` takes `ctx.canvas.width/height` for viewport culling.
That one is **self-consistently correct at any scale** — it compares a point transformed by the
current matrix (which now carries the factor `s`) against a canvas size that carries the same `s`, so
both sides scale together and the cull decides identically. Noticed, checked, not touched.

## 3. THE TEST, AND ITS TWO SABOTAGES

`scripts/canvas-scale-invariance.test.mjs`. It reproduces exactly what the rAF loop does — size the
store, apply the base transform, call the REAL `renderRaceFrame` with the reference size — against a
recording context extended to track the full current transformation matrix, and captures every
coordinate-bearing operation's anchor **in device pixels**. Divided back by `s`, the streams at
1.0 / 0.85 / 0.7 / 0.5 / 0.4 are identical to float tolerance: **~2900 marks, same op, same place,
same size, same order.** The CSS box does not depend on the store, so "same reference pixel" and
"same CSS pixel" are the same statement.

It rejects two wirings, and both rejections are asserted rather than described:

1. **the store handed to the renderer as the reference** — the pre-block wiring above;
2. **a smaller store with no base transform** — the obvious cheap version, which does not rescale the
   picture, it crops it.

**Writing the test produced its own finding: drawing a frame is not read-only.** `racerRendering.js`
appends the racer's current position to `r.trail` while painting it, so the second draw of "the same"
state draws forty more trail dots than the first. A harness that did not know this would have
reported a difference at every scale and blamed the scale. The trails are restored between arms, and
a **determinism test now stands in front of the invariance tests** so the comparison can never again
be silently invalid.

## 4. THE MEASUREMENT — and it does not support the hope

**The in-app measurement could not be taken: `/race` is behind a login and the password is the
owner's alone** (the dev-start skill says so: `users.json` is local and gitignored). So the
measurement was taken with a harness that runs **the real draw path, the real physics, the real
camera director and the real sprites in a real browser window on his machine**, laid out exactly like
the game (a `1fr 210px` grid, canvas `width:100%`), with the same per-frame brackets `perfLog.js`
records. It is not the game: no React tree, no HUD overlays, no surface effects, dev bundle. The
harness was temporary and has been deleted; it left no file in the repository.

**100 racers, mountainstreet, mid-race, one run each, same session, DPR 1.5, canvas CSS box
1058×595 = 1587×893 device px. Milliseconds, p50 / p90:**

| render scale | store | total | physics (incl. clear) | camera | render | pace |
| --- | --- | --- | --- | --- | --- | --- |
| 1.00 | 1280×720 | 16.7 / 16.8 | 1.1 / 1.8 | 0.1 / 0.2 | 1.5 / 2.2 | 1006 |
| 0.70 | 896×504 | 16.7 / 16.8 | 1.0 / 1.6 | 0.1 / 0.2 | 1.4 / 1.8 | 1002 |
| 0.50 | 640×360 | 16.7 / 16.8 | 1.0 / 1.4 | 0.1 / 0.2 | 1.4 / 1.7 | 1002 |

**These are his machine's numbers and they are not portable to any other.**

**What they say.** The saving is real and it is small: from 1.00 to 0.50, about **0.4 ms off the
physics bracket at p90 and 0.5 ms off the render bracket at p90 — under 1 ms out of a 16.7 ms
budget.** `total` never moves, because in this harness the frame has about 13 ms of headroom and
every scale hits vsync.

**What they say about his own finding, which is the more important half.** Three things were checked
and all three point the same way:

- **The clear's pixel count cannot be the explanation.** `ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)`
  clears a CONSTANT 1280×720. Shrinking the window does not reduce it by one pixel. Whatever moved his
  `physics` bracket from 2.6 ms to 1.3 ms, it was not the clear getting smaller.
- **His experiment was reproduced with the store held fixed** — backing store 1280×720, CSS box
  halved to 418×235. The brackets moved by the same small amount as halving the store did:
  physics p90 1.8 → 1.4, render p90 2.2 → 1.6. Real, and about 1 ms.
- **The background layer was tested as a suspect and exonerated on this machine.** `index.jsx` sizes
  the background canvas to `worldWidth × worldHeight`, which on mountainstreet is **6144×4096 = 25.2
  megapixels, twenty-seven times the race canvas**, and re-transforms it with `scale3d` every frame.
  Adding exactly that layer to the harness, transforming every frame, changed nothing: 16.7 / 16.8 at
  full window and at half.

**The harness never reproduced a 33 ms frame at all.** At 100 racers it holds 60 fps at every render
scale, at both display sizes, with and without the 25 Mpx background layer; pushed to 220 racers the
physics bracket triples (3.5 / 5.5 ms) and the render bracket barely moves, and `total` still holds.
So the harness cannot tell him what the slider will buy, and saying otherwise would be inventing a
number. **What it can say with confidence is where the cost is NOT:** it is not the clear's area, and
on the paths that can be measured the whole drawing of a 100-racer frame costs under 4 ms. His 33 ms
frames are ~29 ms that no bracket in `perfLog` contains — the `other` column — and the honest next
instrument for that is his own PERF LOG in his own session, with the slider to move.

## 5. What is still owed

- **The owner's eye.** Nothing here has been seen in the real app.
- **The in-app numbers.** Needs his login; the branch ships the perf log's existing `enablePerfLog`
  toggle unchanged, so his own HUD is the instrument.
- **Noticed and left:** `RaceTuningSection.test.jsx` emits one `Received NaN for the value attribute`
  React warning. Verified present on `master` before this branch touched anything — pre-existing, and
  not this block's to fix.
