# Perf Diagnosis — Post-Fix Profile Reconciliation

**Date:** 2026-06-06
**Branch:** `feat/open-track-overlap`
**Baseline:** commit after Wave-1 fixes (R4 + R1 + R3)
**Profile:** 47.5s capture, full field, no crash

---

## R4 Success — One Confirmed Win

The crash is gone. The step-budget guard (`_catchupSteps < 2`) capped the catch-up death spiral. **No further diagnosis needed on this point.**

---

## 1. CLS Went UP: 0.22 → 0.45

### What report 00 predicted
The R3 `width→transform` change would reduce the forced layout work on scoreboard bars and lower CLS toward 0.

### What the profile shows
CLS doubled. "Could not detect any layout shift culprits" — Chrome saw shifts but couldn't attribute them to a specific element.

### Source-reading analysis

**Unchanged CLS source — scoreboard row reordering (`index.jsx:1495–1526`):** When `scoreboard` state changes (sorted by rank), React re-renders the list in a new order with `key={r.index}`. When racer A moves from DOM position 3 to position 1, the DOM element for A visually shifts. This was present before R3 and is still present now. CLS 0.22 was already from this. It is the PRIMARY ongoing CLS source.

**New potential CLS source from R3 — `box-shadow` on a `width: 100%` layout box:**

Before R3: `.sb-bar-fill { width: X% }` — the element's layout box was X% of the container. `box-shadow: 0 0 4px currentColor` painted a glow around the X%-wide box.

After R3: `.sb-bar-fill { width: 100%; transform: scaleX(X); transform-origin: left }` — the element's **layout box** is always 100% of the container. `transform: scaleX(X)` scales the visual rendering, but the layout box does not change with the transform. `box-shadow` in CSS is rendered at the element's border box **before** the transform is applied to painting — the shadow then gets transformed with the element. However, the critical detail: `overflow: hidden` on `.sb-bar-bg` clips painted overflow from the **layout box edge**, not the **transformed edge**. A `width: 100%; transform: scaleX(0.3)` element has a 100%-wide layout box occupying the full container; the paint is clipped at the container edge. The box-shadow of the 100%-wide layout box can extend outside `.sb-bar-bg` on all four sides (top, bottom, left, right), because `overflow: hidden` **does not clip `box-shadow`** by default — box-shadow is treated as ink overflow, not content overflow.

With OLD code, the bar at 30% progress had a `width: 30%` layout box. The shadow extended from a 30%-wide element. The right 70% of the `.sb-bar-bg` container had no shadow at all.

With NEW code, the bar at 30% progress has a `width: 100%` layout box with `scaleX(0.3)`. The shadow paints from the full 100%-wide box (in layout coordinates) before the transform collapses it. Depending on how Chrome applies the `box-shadow` in the transform pipeline, this can cause the shadow to paint outside the `.sb-bar-bg` container on the right side (where no bar is supposed to be visible).

**This is the most likely cause of the CLS increase.** The visible shadow bleeding from the right portion of the 100%-wide layout box can paint over sibling elements — including text labels or adjacent rows — and Chrome's CLS API detects the shift of those sibling elements.

**Why "Could not detect any layout shift culprits":** When N scoreboard bars (40–90) all have this shadow-bleed simultaneously, the shifts are small and spread across many elements. Chrome can't attribute CLS to a single element, so it reports "no culprits detected" even though the cumulative shift is 0.45.

**Note on CSS `transition: transform` and CLS:** Chrome's CLS spec (v2) excludes shifts caused by CSS `@keyframes` animations and CSS transitions FROM layout shifts, but ONLY when the element does not shift its paint start position unexpectedly. The `.sb-bar-fill` itself (scaling from left) does not shift its start position. The CLS increase is from **siblings affected by the shadow bleed**, not the bar itself.

### What would confirm this

Open the Experience lane → click a CLS event → expand "Layout shift culprits." If the culprits are `.sb-name` text spans or elements to the right of the progress bar, the shadow-bleed hypothesis is confirmed. If the culprits are the scoreboard rows themselves (changing vertical position), it's the rank-reorder source.

### Corrective action

Two options, after confirming:
1. **Remove `box-shadow` from `.sb-bar-fill`** — the glow is cosmetic; removing it eliminates the shadow-bleed entirely. This is the cleanest fix.
2. **Clip the shadow**: add `overflow: hidden` with `contain: paint` on `.sb-bar-bg`, or add a `clip-path` on `.sb-bar-fill`. `contain: paint` creates a stacking context that also clips box-shadow.

---

## 2. Forced Reflow Still Attributes to `drawOpenTrackFinishLine` at `index.jsx:589` — 3.43s

### What report 00 predicted
The forced reflow blame on `drawOpenTrackFinishLine` was profiler **misattribution** — the real source was `transition: width 0.12s linear` on scoreboard bars. Removing that transition (R3) would fix it.

### What the profile shows
The attribution is unchanged. 3.43s forced reflow, still blaming `drawOpenTrackFinishLine (trackRendering.js)` triggered by `loop @ index.jsx:589`.

### **Report 00 was wrong.** 

The `transition: width` was NOT the forced-reflow source. R3 removed it and the reflow persisted. The earlier hypothesis was plausible but incorrect.

### Source-reading analysis

**`drawOpenTrackFinishLine` has no layout reads (still confirmed):**
The function (`trackRendering.js:137–187`) exclusively does: JS arithmetic (sin, cos), canvas 2D writes (strokeStyle, lineWidth, moveTo, lineTo, stroke, fillText). No `offsetWidth`, `getBoundingClientRect`, `scrollTop`, or any DOM geometry read. This is verified by grep across all of `client/src` — no layout-read API calls exist in `RaceScreen/index.jsx`'s rAF callback.

**`index.jsx:589` is a source-map artifact:**
Line 589 in `index.jsx` is `finishRank: null,` inside the one-time racer initialization `.map()` at line 546, which runs once at race start (inside `useEffect`). It is not in the rAF callback at all. The source map is producing an incorrect attribution for whatever code is executing when Chrome detects the style sync need.

**React 18 batching rules out in-rAF DOM mutation:**
`setScoreboard` is called at line 996, inside the physics `while` loop. React 18's automatic batching means this update is NOT flushed synchronously — it's queued and flushed after the entire rAF callback returns. Therefore, no DOM mutation from `setScoreboard` occurs DURING the rAF callback while canvas drawing is running. The classic "write DOM then read layout" forced-reflow pattern cannot apply here.

**The rAF sequence:**
```
loop(ts) [rAF callback]:
  (1) physics while loop — setScoreboard called but BATCHED, not flushed
  (2) particle update
  (3) drawEditorBackground (canvas only)
  (4) drawTrackLights (canvas only)
  (5) drawOpenTrackFinishLine (canvas only)  ← profiler blames here
  (6) drawParticles, drawRacers, etc. (canvas only)
  (7) renderMinimap (canvas only)
  [rAF callback returns]
  [React flushes setScoreboard batch → DOM update]
```

No DOM read occurs between steps 1–7. The forced reflow cannot be classical JS-triggered synchronous layout.

### What IS causing it — two candidate explanations

**Candidate A — prior-frame React commit cross-frame interaction:**
When React flushes `setScoreboard` from frame N (after the rAF returns), it updates N scoreboard elements. On frame N+1, when the rAF starts, the browser may need to resolve the CSS of those updated elements before the compositor can render them. This resolution (Recalculate Style) fires at the start of frame N+1's rAF. Chrome's profiler records this as a "Forced Reflow" in the context of whatever JS is running at that moment — which happens to be early in the rAF callback. The source-map attribution (`index.jsx:589`) would be from the previous frame's `setScoreboard` call serialized in the bundle near that source location.

This is style recalculation (not layout recomputation) mis-labeled as "Forced Reflow" by the profiler.

**Candidate B — a HUD component reads layout in useLayoutEffect:**
The rAF callback updates `diagDataRef.current` (`index.jsx:1174–1183`). Diagnostic HUD components (`BattleDiagHUD`, `ComebackDiagHUD`, `LeadChangeDiagHUD`, etc.) consume this ref and re-render. If any of these components calls `getBoundingClientRect` or `offsetWidth` in a `useLayoutEffect` (which runs synchronously after React commits), this would be a genuine forced reflow. The commit and `useLayoutEffect` chain would run between frame N's rAF end and frame N+1's rAF start, and Chrome's profiler can incorrectly straddle this boundary and attribute it to `drawOpenTrackFinishLine` in frame N.

### What would confirm the source

**Required:** Open a single long-frame record in the Bottom-up view (Performance → click the heaviest Recalculate Style block → Bottom-up tab). The bottom of the call stack will show the actual function that read a layout property (if Candidate B is correct) — look for `getBoundingClientRect`, `offsetWidth`, or `getComputedStyle`. If the bottom is a browser-internal compositor sync (no JS function), it's Candidate A.

**Also useful:** Filter to "Layout" records in the main thread timeline. Each purple "Layout" block has a call stack. The initiator of the first Layout block in each frame will be the real source.

---

## 3. Painting Barely Moved After R1 (Shadow Blur Removal)

### What report 00 predicted
`ctx.shadowBlur = 10` was a "major contributor" to the 1,667ms Painting category and removing it would "measurably reduce" painting.

### What the profile shows
Painting is still ~113ms/s (5,393ms / 47.5s vs the earlier ~119ms/s / 14s — minor difference, well within session-to-session variance and the longer 47s vs 14s window).

### **Report 00 was wrong.**

The finish-line shadow affected only 8 small checkerboard segments on one portion of the track, once per frame. Its contribution to total painting was small relative to the dominant costs.

### The actual dominant painting cost (from code)

The canvas is fully cleared every frame (`ctx.clearRect(0, 0, 1280, 720)` — 922K pixels). Then repainted:

| Operation | Cost driver |
|---|---|
| `drawEditorBackground` | Full 1280×720 gradient fill or image blit every frame |
| Track outline + lights | ~2,000 path points, stroke, per-light glow |
| `drawSurfaceTrails` (index.jsx:1336) | Per-racer trail: each racer writes canvas strokes for its recent positions |
| `drawParticles` (index.jsx:1335) | dustParticles + burstParticles: each particle = a filled arc; hundreds at any moment |
| `drawRacers` (index.jsx:1340–1356) | 40–90 sprite `drawImage` calls, plus name labels, rank tags |
| `renderMinimap` (index.jsx:1415) | Track outline (80 points) + racer dots |

At 40 racers: `drawImage` alone ≥ 40 sprite draws per frame plus their trail strokes. At 60 racers: 60 sprite draws + 60 trails + particle clouds. The finish-line shadow (8 tiny segments, one location) was perhaps 0.5–1% of total painting work.

### What the 1,667ms / 113ms/s painting cost actually is

**Primary**: Full canvas redraw (`clearRect` + background fill) — intrinsic cost of redrawing a 1280×720 surface every frame.

**Secondary**: Per-racer surface trail (`drawSurfaceTrails`) — each active racer appends to its trail each frame. With 60 racers and trails of length 30–60 segments, this is 1,800–3,600 path segments stroked per frame.

**Tertiary**: Particle system (`drawParticles`) — at peak, hundreds of dust and burst particles each drawing a `ctx.arc` + `ctx.fill`. Arc+fill per particle triggers rasterization.

**Note on canvas compositing budget**: `ctx.imageSmoothingQuality = 'high'` (`index.jsx:337`) applies to all `drawImage` calls. At 60 racers, each `drawImage` at a non-integer sub-pixel position incurs high-quality resampling. This is a real per-racer painting cost.

The `shadowBlur` removal was the right call (avoid unnecessary GPU offscreen surfaces) but its absolute impact on a budget dominated by 60 sprite draws and 3,000+ trail segments is minor.

---

## Summary Table — What Report 00 Got Wrong

| Claim in report 00 | Correct? | Evidence |
|---|---|---|
| "`drawOpenTrackFinishLine` has no DOM layout reads" | **Correct** (still confirmed) | grep: no `getBoundingClientRect/offsetWidth` in rAF |
| "Forced reflow source = `transition: width` on scoreboard bars" | **WRONG** | R3 removed the width transition; forced reflow persists at 3.43s |
| "CLS will improve after R3 width→transform change" | **WRONG** | CLS doubled (0.22→0.45) |
| "`ctx.shadowBlur` is a significant painting contributor" | **WRONG** | Painting unchanged after R1 |
| "Crash death spiral is from step-budget overflow" | **Correct** | 47s session, no crash |

---

## Recommended Next Captures

To diagnose the two unresolved issues:

**For forced reflow source:**
1. Record a 10–15s session in the DevTools Performance panel (full detail, not Summary view)
2. Find the heaviest "Layout" or "Recalculate Style" block in the main thread
3. Bottom-up tab → look for the function at the base of the call stack that caused the sync. If there's a `getBoundingClientRect` or `offsetWidth`, that's the real culprit (likely in a HUD component)
4. Also check: Call Tree → any `useLayoutEffect` frame in the chain

**For CLS source:**
1. Experience lane → click the highest CLS bar
2. Expand "Layout shift culprits" → note which elements are listed
3. If it lists `.sb-name` spans or elements beside the progress bar → shadow bleed from the full-width `.sb-bar-fill` is confirmed
4. If it lists `.scoreboard-row` divs shifting vertically → it's rank reordering (fix: `position: sticky` or CSS `order` instead of DOM reorder)

**Immediate low-risk fix to attempt (no code change spec yet — confirm first):**
Remove `box-shadow` from `.sb-bar-fill` (RaceScreen.css:144). If CLS drops significantly, the full-width shadow bleed was the cause. This is a one-line CSS removal, zero fairness risk.
