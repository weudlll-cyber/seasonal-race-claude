# CANVAS-SCALE-1 — a render-scale slider was built, measured, and dropped. The layout coupling it exposed is what ships.

**Branch** `feat/canvas-scale-1`, cut from master `f69f66fb`. **The slider is not in this branch.**
It was built, measured against the finding it existed for, and removed on the owner's decision: it
saved under 1 ms of a 16.7 ms frame, and the mechanism it was built on turned out not to be the cost.

**What ships is two lines and a test.** `RaceScreen/index.jsx` hands `renderRaceFrame` the 1280×720
REFERENCE instead of `canvas.width/height`. That is a **no-op today** — the two are the same number —
and the render fingerprint says so.

**All four fingerprints unchanged:** world `dc4647be0f55ebdb`, world-off `854018ee5d3d83e1`,
camera `d54d6332fb8d36c6`, render `9580ff2e3626b3b9`. The record is
[docs/fingerprints.json](../../docs/fingerprints.json); nothing was minted.

---

## 1. WHAT THE CANVAS ACTUALLY DOES — established first, because it changed the answer

The block was asked to establish, before choosing the shape of a control, which device pixel ratio
the race canvas is sized at. The answer is neither option the question anticipated.

**`devicePixelRatio` appears nowhere in `client/src`.** The race canvas's backing store is a
hard-coded constant — `RaceScreen/index.jsx` declares `CANVAS_W = 1280`, `CANVAS_H = 720` and puts
them on the element — and `.race-canvas` is `width: 100%; height: auto`, so the browser stretches
that fixed store onto whatever box the layout gives it. Same store on every machine, at every window
size, at every DPR.

**So 1280×720 is not "the CSS box" and not "the CSS box times DPR".** Measured in the owner's own
browser: `devicePixelRatio` is **1.5**, the screen is 1280×800 CSS px, and a maximised window gives
the canvas a CSS box of **1058×595 = 1587×893 device pixels**. The store is 1280×720. **The picture is
already being upscaled by about 1.5× in area before anything else happens** — there is no DPR
headroom to cap, only sharpness to spend.

## 2. THE FINDING THAT SURVIVES — layout was being computed in backing-store pixels

`index.jsx` handed `renderRaceFrame` `canvasW: canvas.width` and `canvasH: canvas.height` — the
BACKING STORE — and the renderer spends those on **layout**:

| what reads it | what it decides |
| --- | --- |
| `tagFontScreenPx(nameTagFrameFrac, canvasH)` | the name-tag FONT SIZE |
| `computeRenderDisplayScale(…, canvasH)` | the minimum drawn racer size (the readability floor) |
| `computeTagLayout({ canvasW, canvasH })` | the label layout's screen box, and therefore which labels are drawn at all |
| `renderMinimap(…, canvasW, canvasH)` | where the minimap sits |
| `hudRightColumn(canvasW, canvasH)` | where the HUD's right column sits |

Those reads were only ever correct **because the store happens to equal the reference**. That is a
coincidence, not a rule. The day anything resizes the store — for any reason at all — layout in
backing-store pixels moves the picture's CONTENT: smaller labels, a minimap somewhere else, a
different set of labels surviving decluttering. It would look like a resolution change and would be
visible only to an eye that already knew what the labels used to be.

**That is why this stays after the slider went.** It costs two lines, it is a no-op until the
coincidence breaks, and the failure it prevents is silent.

`cullBounds` in `surface-effects/generators/spriteHelpers.js` also reads `ctx.canvas.width/height`,
for viewport culling. It was checked when the scale existed and found self-consistently correct at
any scale (the point and the bound both carry the factor); **with the scale gone it is simply
correct, and it was left untouched throughout.**

## 3. THE TEST — and both halves are needed

`scripts/render-layout-separation.test.mjs` (5 tests, ~0.6 s). It drives the REAL `renderRaceFrame`
on a real mid-race frame — mountainstreet, 40 racers, real names and race numbers — through the
recording context, and holds two claims that are worthless apart:

1. **`canvasW`/`canvasH` really DO drive layout** — hand the renderer a different size and the draw
   call stream changes. Without this, "the call site passes the reference" would be a claim about a
   value nobody uses.
2. **The call site really DOES pass the reference** — asserted by reading `index.jsx` as text,
   because no behavioural test on `renderRaceFrame` can see what its caller hands it, and the caller
   is where the wrong value was. **Sabotage-proven**: restoring `canvasW: canvas.width` fails this
   test and only this test.

Plus a floor (the frame is real, not an empty canvas), a determinism check, and a guard that
`RaceScreen`'s own `CANVAS_W`/`CANVAS_H` still equal the projection's reference — the text guard
would pass just as happily against a drifted copy.

**Writing the harness produced its own finding: drawing a frame is not read-only.**
`racerRendering.js` appends the racer's current position to `r.trail` while painting it, so the
second draw of "the same" state draws forty more trail dots than the first. The trails are restored
between draws and the determinism test stands in front of the others, so a comparison can never
again be silently invalid.

**WHAT WAS DROPPED WITH THE SLIDER, named rather than quietly deleted.** The file was
`scripts/canvas-scale-invariance.test.mjs`, 430 lines, and it compared the whole draw-call stream at
five render scales in DEVICE pixels through a hand-built matrix-tracking recorder, then asserted two
sabotages. **The recorder, the multi-scale comparison, and the "smaller store with no base transform
crops the picture" sabotage all went**: with no scale there is no device space to convert back from
and no base transform to lose, so all three were testing machinery that no longer exists. The third
sabotage — handing the renderer the backing store instead of the reference — is the surviving claim
and is now stated directly, without a scale to express it through.

## 4. THE MEASUREMENT — the evidence that dropped the slider

**The in-app measurement could not be taken: `/race` is behind a login and the password is the
owner's alone.** So it was taken with a harness that runs **the real draw path, the real physics, the
real camera director and the real sprites in a real browser window on his machine**, laid out exactly
like the game, with the same per-frame brackets `perfLog.js` records. Not the game: no React tree, no
HUD overlays, no surface effects, dev bundle. The harness was temporary and left no file behind.

**100 racers, mountainstreet, mid-race, one run each, same session, DPR 1.5, canvas CSS box
1058×595 = 1587×893 device px. Milliseconds, p50 / p90:**

| render scale | store | total | physics (incl. clear) | camera | render | pace |
| --- | --- | --- | --- | --- | --- | --- |
| 1.00 | 1280×720 | 16.7 / 16.8 | 1.1 / 1.8 | 0.1 / 0.2 | 1.5 / 2.2 | 1006 |
| 0.70 | 896×504 | 16.7 / 16.8 | 1.0 / 1.6 | 0.1 / 0.2 | 1.4 / 1.8 | 1002 |
| 0.50 | 640×360 | 16.7 / 16.8 | 1.0 / 1.4 | 0.1 / 0.2 | 1.4 / 1.7 | 1002 |

**His machine's numbers, and not portable to any other.**

**The saving is real and it is small**: 1.00 → 0.50 takes about 0.4 ms off the physics bracket at p90
and 0.5 ms off the render bracket at p90 — **under 1 ms out of a 16.7 ms budget**, with `total` never
moving because the frame has ~13 ms of headroom. **That is what the owner dropped it for**: code that
earns under 1 ms is not worth a config key, a slider, a validation band and a test.

**And it refutes the mechanism the slider was built on.** Three checks, all pointing the same way:

- **The clear's pixel count cannot be the explanation.** `ctx.clearRect(0, 0, CANVAS_W, CANVAS_H)`
  clears a CONSTANT 1280×720. Shrinking the window does not reduce it by one pixel, so whatever moved
  the owner's `physics` bracket from 2.6 ms to 1.3 ms, it was not the clear getting smaller.
- **His experiment was reproduced with the store held fixed** — backing store 1280×720, CSS box
  halved to 418×235. The brackets moved by the same small amount as halving the store did: physics
  p90 1.8 → 1.4, render p90 2.2 → 1.6. Real, and about 1 ms.
- **The background layer was tested as a suspect and exonerated on this machine.** `index.jsx` sizes
  the background canvas to `worldWidth × worldHeight`, which on mountainstreet is **6144×4096 = 25.2
  megapixels, twenty-seven times the race canvas**, and re-transforms it with `scale3d` every frame.
  Adding exactly that layer to the harness, transforming every frame, changed nothing: 16.7 / 16.8 at
  full window and at half.

**The harness never reproduced a 33 ms frame at all**, at any render scale, at either display size,
with or without the 25 Mpx background layer; pushed to 220 racers the physics bracket triples
(3.5 / 5.5 ms), the render bracket barely moves, and `total` still holds 60 fps. So it cannot say what
a slider would have bought. **What it can say with confidence is where the cost is NOT**: not the
clear's area, and not the whole drawing of a 100-racer frame, which costs under 4 ms on every path it
can measure. The owner's 33 ms frames are ~29 ms that **no bracket in `perfLog` contains** — the
`other` column — and the honest instrument for that is his own perf log in his own session.

## 5. What is left

Nothing in this branch waits for an eye: it draws exactly what master draws, and the render
fingerprint is the proof. The open question the measurement raises — where the ~29 ms in `other`
actually lives — is not this block's and is not answered here.
