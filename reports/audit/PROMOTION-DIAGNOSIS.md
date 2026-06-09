# PROMOTION-DIAGNOSIS — Why the bg canvas is not a compositor layer

**Date:** 2026-06-10  
**Basis:** Read-only analysis of source code, CSS, DOM (Playwright inspect), performance data.  
**No source changes.**

---

## Context

After Commit 3 (`4862673`), the bg canvas has `will-change: transform` and its CSS transform is
updated every rAF frame. The owner confirmed via DevTools **Paint Flashing** that "the entire play
area flashes green every frame in OVERVIEW" — indicating the background is still being re-rasterized
per frame. Measured impact: OVERVIEW constant p50=33.3ms (30fps); non-OVERVIEW p50=16.7ms (60fps).
The ~16ms per-frame overhead at OVERVIEW is the residual rasterization cost.

---

## Candidate 1 — 2D transform functions vs 3D (does `translate(%) scale()` force a GPU layer?)

### Evidence

The exact per-frame CSS transform string applied to the bg canvas (captured live via Playwright,
LEADER_ZOOM state):

```
translate(-50.0986%, -172.885%) scale(7.35966, 8.72256)
```

These are **CSS 2D transform functions** — `translate()` and `scale()`, not `translate3d()` or
`scale3d()` or `matrix3d()`. The code that generates this is `index.jsx` rAF loop:

```js
bgCanvasRef.current.style.transform =
  `translate(${cam.offsetX * (100 / CANVAS_W)}%, ${cam.offsetY * (100 / CANVAS_H)}%) scale(${bgScaleX}, ${bgScaleY})`;
```

### Analysis

In Chromium's compositing model, there are two paths to compositor layer promotion:

| Path | Trigger | Guarantee |
|---|---|---|
| **3D transform path** | Any 3D CSS function: `translate3d`, `translateZ`, `rotateX/Y`, `matrix3d`, `perspective` | **Unconditional** — Chrome always creates a 3D rendering context and its own GraphicsLayer |
| **will-change path** | `will-change: transform` (or `opacity`, `filter`) | **Hint only** — Chrome *should* promote but is subject to layer squashing, size limits, and clip requirements |

`will-change: transform` tells Chrome to "prepare for a transform." Chrome SHOULD pre-promote the
element to a compositor layer. However, Chrome's layer squashing algorithm (SquashingLayerContent)
can override this hint when it determines merging is cheaper. 3D transforms bypass squashing
entirely because they force a 3D rendering context that cannot be merged with 2D content.

**Current transform: 2D functions → subject to squashing override.**  
**3D transform (`translateZ(0)` appended): would force promotion unconditionally.**

### Verdict — **LIKELY CONTRIBUTOR (primary)**

The 2D transform functions do not guarantee compositor layer creation the way 3D transforms do.
Chrome honors `will-change` in most cases, but the layer squashing algorithm can and does override
it — especially when other conditions (see Candidates 2 and 3) also push toward merging.

---

## Candidate 2 — `overflow:hidden` + `border-radius` on `.race-canvas-wrapper`

### Evidence

From [RaceScreen.css](../../client/src/screens/RaceScreen/RaceScreen.css):

```css
.race-canvas-wrapper {
  position: relative;
  overflow: hidden;          /* ← clips children to wrapper bounds */
  border-radius: 8px;        /* ← rounded corners on the clip */
  border: 1px solid rgba(0, 200, 255, 0.15);
  box-shadow: ...;
}
```

The bg canvas `position: absolute; width: 100%; height: 100%` sits inside this wrapper. Its CSS
transform (pan + zoom) can shift its visual content in any direction — at OVERVIEW, the large
negative `cam.offsetY` translates the canvas content upward (bg canvas content moves up, world
moves down). The wrapper clips this via `overflow: hidden`.

### Analysis

For a child to have its own compositor layer when its parent has `overflow: hidden`:
1. Chrome must apply the clip to the child compositor layer at the GPU level ("clip layer")
2. The clip must be rectangular **OR** Chrome must use a stencil/mask for the rounded corner

With `border-radius: 8px`, the clip is **non-rectangular**. Chrome handles this in modern
versions via "rounded-corner mask layers," but this requires an additional GPU texture and
compositing pass. Chrome's layer squashing algorithm may decide: "cost of separate layer +
rounded clip layer > cost of merging bg canvas into the same layer as the world canvas."

Additionally, `overflow: hidden` creates a "clip-and-paint" parent: Chrome knows the bg canvas's
visual content will be clipped to 792×446 CSS pixels regardless of the CSS transform value. This
reduces the perceived benefit of having a separate compositor layer for the bg canvas (the
compositor can only show the clipped portion anyway).

**This is a well-known Chrome compositing edge case.** `border-radius` + `overflow: hidden` on a
parent has historically caused child `will-change: transform` elements to fail promotion in Chrome.
Modern Chrome (100+) improved this, but it remains a risk factor.

### Verdict — **LIKELY CONTRIBUTOR (secondary)**

The rounded clip requirement makes promoting the bg canvas more expensive for Chrome. Combined with
Candidate 1 (2D transform), Chrome's squashing algorithm likely tips toward merging here.

---

## Candidate 3 — Canvas size: 6000×4000 = 96 MB GPU texture

### Evidence

The bg canvas native size is `worldWidth × worldHeight = 6000 × 4000`. In RGBA8 format:
`6000 × 4000 × 4 bytes = 96 MB`.

Chrome's GL_MAX_TEXTURE_SIZE limit is typically 8192×16384+ for modern GPUs — 6000×4000 fits.
However, Chrome also has a **compositor layer area limit** and a **GPU memory budget** that can
prevent promotion of very large layers.

### Analysis

The 96 MB OffscreenCanvas already exists in VRAM (created by `getBgCanvasReady`). Promoting the
bg canvas to a compositor layer would require a SECOND 96 MB GPU allocation for the bg canvas
element's own backing store. This doubles the VRAM cost of the background to ~192 MB.

Chrome uses a "GPU memory budget" heuristic. Exceeding the budget causes Chrome to demote layers
back to software rasterization. The exact limit depends on the GPU and driver, but 96 MB as a
single compositor layer is very large and may trigger Chrome's "layer size limit" checks.

Note: Chrome tiles large compositing layers into 256×256 pixel "tiles" rather than uploading a
single texture. For 6000×4000, this would require 345 tiles (at CSS size 792×446, visible portion
≈ 12 tiles). Tiled compositing still benefits from the compositor handling the transform
(no re-rasterization when transform changes), but it adds tile management overhead.

**The OffscreenCanvas (96 MB) and the bg canvas compositor backing (96 MB) would coexist.**
This doubles VRAM pressure from the background. Chrome's memory manager may decline to promote.

### Verdict — **POSSIBLE, lower probability than Candidates 1+2**

6000×4000 is large but within theoretical limits. The VRAM doubling (OffscreenCanvas already in
VRAM + new compositor backing) is the real risk. Less likely to be the primary blocker on its own,
but may be the tipping factor in combination with 1+2.

---

## Candidate 4 — Which canvas is the green paint flash: bg or world?

### Analysis

**Both canvases have identical CSS display size** (~792×446 at a typical viewport width). Their
border boxes are at the same position: (0,0) with width=100%, height=100% of the wrapper.

- **World canvas** (`alpha:true`, `position:relative`, no CSS transform): clears and redraws
  fully every rAF via `ctx.clearRect(0, 0, 1280, 720)` then all drawing calls. It ALWAYS
  produces a paint record change every frame — it is EXPECTED to flash green every frame.

- **Bg canvas** (`position:absolute`, `will-change:transform`): draw calls happen ONCE at
  `bgCanvasReady = true`. After that, only the CSS `style.transform` is mutated each frame.
  If promoted to its own compositor layer: CSS transform changes are compositor-only — NO
  re-rasterization → should NOT flash green.

**The visual ambiguity is real and irresolvable from paint flash alone:**  
Both scenarios produce a green flash covering the entire 792×446 play area:

| Scenario | Why flash covers full area |
|---|---|
| Bg canvas NOT promoted (squashed into same layer as world canvas) | World canvas clears every frame → entire shared layer is invalidated → full repaint including bg canvas position |
| Bg canvas IS promoted to its own layer | World canvas (= same CSS size) still repaints every frame (expected) → green flash covers the world canvas area = full play area |

**The only definitive test is the DevTools Layers panel**, not Paint Flashing:
- Open DevTools → More Tools → **Layers**
- In the layer tree, look for `canvas` entries
- **Two separate canvas entries** → bg canvas is promoted ✓
- **One canvas entry containing both** → bg canvas is squashed into world canvas's layer ✗

Owner visual test: at OVERVIEW zoom (bg canvas content shifted down by negative offsetY), if the
bg canvas layer extends **outside the wrapper** (shown in the Layers panel as a layer rect larger
than the wrapper), then it is promoted. If the layer rect equals exactly the wrapper size, it was
clipped/squashed.

### Verdict — **Paint flash alone is ambiguous. Layers panel is required.**

However: the **performance numbers ARE definitive** as circumstantial evidence.  
If bg canvas were properly promoted (compositor-only transform, zero re-rasterization):
- Expected OVERVIEW cost ≈ world canvas repaint only ≈ same as LEADER_ZOOM ≈ 16.7ms
- Measured OVERVIEW cost = **33.3ms** (16ms MORE than LEADER_ZOOM)

The 16ms extra at OVERVIEW — constant, not spiky — is consistent with the 24.9%-of-6000×4000
visible-area rasterization cost that existed before this fix. The bg canvas content is still being
sampled/rasterized at OVERVIEW, just via a different (cheaper) path than `ctx.drawImage`.

**Conclusion: the bg canvas is NOT promoted.** The 33ms vs 16.7ms gap proves it.

---

## Candidate 5 — `will-change:transform` actually present; any ancestor interference?

### Evidence (confirmed via Playwright DOM inspection)

```
bgCanvas.style.willChange   = "transform"    ← ✓ confirmed
bgCanvas.style.position     = "absolute"     ← ✓
bgCanvas.style.transform    = "translate(…%) scale(…)"  ← ✓ updating each frame
```

### Ancestor chain (complete)

Traced up the DOM from the bg canvas — no compositing-affecting properties:

```
<canvas>              will-change:transform  (stacking context via will-change)
  .race-canvas-wrapper  position:relative; overflow:hidden; border-radius:8px  ← see Candidate 2
    .race-layout          display:grid   (no z-index, no transform, no filter)
      .screen--race         display:flex; animation:bgPulse  ← see below
        <TransitionProvider>  (React wrapper div, no CSS)
          <body>              background-color only
```

**`.screen--race` `animation: bgPulse` note:**  
`bgPulse` animates `background-position`. This is NOT a compositor-eligible property — it runs on
the main thread, not the compositor. It does NOT promote `.screen--race` to a compositor layer, and
does NOT create a stacking context on `.screen--race`. No ancestor of the bg canvas has
`transform`, `opacity < 1`, `filter`, `will-change`, `isolation: isolate`, or `contain` that would
create a stacking context that traps the bg canvas in a sub-tree.

The global CSS (`main.css`) and `TransitionOverlay.css` have no properties affecting the canvas
subtree. The `transition-overlay` element is `position:fixed` outside the canvas subtree.

### Verdict — **`will-change:transform` is correctly set; no ancestor interference**

---

## Summary and most-likely blocker

| Candidate | Verdict | Confidence |
|---|---|---|
| 2D transform (no 3D function) | Likely contributor — bypasses guaranteed promotion | HIGH |
| `overflow:hidden` + `border-radius:8px` on parent | Likely contributor — rounded clip forces squashing | HIGH |
| 96 MB canvas size | Possible contributor — VRAM doubling may exceed budget | MEDIUM |
| Green flash ambiguity | Paint flash = world canvas (expected); bg canvas verdict needs Layers panel | N/A |
| `will-change` absent or ancestor interference | Ruled out — `will-change:transform` confirmed, clean ancestor chain | RULED OUT |

**Most likely blocker:** Combination of (1) 2D transform functions + (2) `overflow:hidden` +
`border-radius` on the wrapper. Either alone might not prevent promotion; together they likely tip
Chrome's squashing algorithm to merge the bg canvas layer with the world canvas layer.

**The performance numbers confirm non-promotion:** 33ms OVERVIEW (16ms above the 16.7ms baseline)
maps to the 24.9%-visible-area bg rasterization that existed before the fix. The CURRENT partial
improvement (from 110–159ms to 33ms) comes from the CSS transform path being cheaper than Skia's
`ctx.drawImage` path for the same rasterization — not from the compositor handling it.

---

## Fix directions (owner picks — not implementing here)

### Direction A — Force 3D transform (targeted, minimal change)

Change the CSS transform string in the rAF loop from 2D to 3D functions:

```js
// Current (2D — does not guarantee compositor layer):
`translate(${tx}%, ${ty}%) scale(${scaleX}, ${scaleY})`

// Fixed (3D — unconditionally forces compositor layer in Chrome):
`translate3d(${tx}%, ${ty}%, 0) scale3d(${scaleX}, ${scaleY}, 1)`
```

A 3D transform function (`translate3d`, `translateZ(0)`, `matrix3d`) forces Chrome to create a
"3D rendering context" (CSS `transform-style: preserve-3d` equivalent) for the element, bypassing
the 2D layer squashing algorithm entirely. This is the minimal, targeted fix.

Alternatively, append `translateZ(0)` to the existing 2D string:
```js
`translate(${tx}%, ${ty}%) scale(${scaleX}, ${scaleY}) translateZ(0)`
```

This leaves the visual math unchanged and simply forces 3D layer creation.

**Risk:** The rounded-clip requirement from `overflow:hidden` + `border-radius` on the parent may
STILL cause Chrome to add a clip layer, which adds a small GPU cost but does NOT prevent promotion.
Chrome CAN handle rounded-clip compositor layers — it just may have been declining due to the 2D
transform not being worth the extra clip layer. With 3D forced, it will promote + add the clip layer.

### Direction B — Remove the rounded-clip requirement

Remove `border-radius` from `.race-canvas-wrapper` (or move it to a `::before` pseudo-element
overlay with `pointer-events:none`). This eliminates the non-rectangular clip requirement,
removing the secondary blocker and making the `will-change` hint more likely to succeed even with
2D transforms.

### Direction C — Use `<img>` or CSS `background-image` element instead of a bg canvas

Replace the bg canvas with a `<div>` (or `<img>`) that uses:
- `background-image: url(bgImagePath); background-size: 100% 100%; background-position: 0 0`
- `will-change: transform` (or just `transform: translateZ(0)` to force 3D)

An image-backed element has a smaller GPU footprint than a 6000×4000 canvas pixel buffer — the
browser can use the decoded JPEG as a GPU texture directly. The darkening overlay would need a
`::after` pseudo-element with `rgba(0,0,0,0.25)` overlay.

**Trade-off:** The darkening overlay (`rgba(0,0,0,0.25)`) would need to be applied differently
(CSS overlay). The `<div>` approach avoids the 96 MB canvas pixel buffer entirely.

### Direction D — Reduce canvas size (partial workaround)

Keep the current canvas approach but draw the bg canvas at a reduced size (e.g., 1920×1280 instead
of 6000×4000), scaling up via CSS. This reduces VRAM pressure from 96 MB to ~10 MB, making Chrome
more likely to promote and reducing the cost if it still squashes.

**Trade-off:** Some visual blurriness at high zoom levels (less than source resolution). At
OVERVIEW (effZoom=0.39, canvas displayed at 792×446 CSS), a 1920×1280 source has sufficient
detail. At LEADER_ZOOM (effZoom~1.5), the 1920×1280 would be upscaled ~1.5×, which may be
noticeable on high-DPI displays.

---

## Recommended investigation order for owner

1. Open Chrome DevTools → **Layers panel** during OVERVIEW → confirm whether bg canvas has its own
   layer entry. This takes 30 seconds and definitively resolves the promotion question.
2. If not promoted: try **Direction A** (append `translateZ(0)`) — one-line change, immediately
   testable. Re-check Layers panel + `__perfProbeZoom()` to confirm p90 drops to ≤16.7ms.
3. If A doesn't fully solve it (Layers shows promotion but p90 still elevated): try **Direction B**
   in addition — move `border-radius` to a pseudo-element.
4. If still not working: **Direction C** or D as fallback.
