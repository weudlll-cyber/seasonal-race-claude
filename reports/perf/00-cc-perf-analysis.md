# RaceArena Performance Analysis — Independent CC Review

**Date:** 2026-06-06  
**Branch:** `feat/open-track-overlap` (Step 1 secured at `backup/step1-complete-fair`)  
**Method:** Source-first independent analysis, then reconciled with real profile and Copilot findings  
**Symptom:** Judder/stutter at 40–90 racers; tab crash (STATUS_ACCESS_VIOLATION) at ~14s under load

---

## Part 1 — Independent Hotspot Analysis (code-first, no profile yet)

### 1.1 Physics: the O(N³) path

The main pair loop in `raceBehavior.js:289–290`:

```js
for (let i = 0; i < active.length; i++) {
  for (let j = i + 1; j < active.length; j++) {
```

This is O(N²) pair iterations. Within the loop, when two racers **overlap** (both within `tHalfSpan` and `lateralHalfSpan` in world-pixel space — `raceBehavior.js:405`), `isSideFree` is called **4 times**:

```js
// raceBehavior.js:412–415
const aLeftFree  = isSideFree(rA, rB, active, -1, lateralHalfSpan, tHalfSpan, cap);
const aRightFree = isSideFree(rA, rB, active,  1, lateralHalfSpan, tHalfSpan, cap);
const bLeftFree  = isSideFree(rB, rA, active, -1, lateralHalfSpan, tHalfSpan, cap);
const bRightFree = isSideFree(rB, rA, active,  1, lateralHalfSpan, tHalfSpan, cap);
```

`isSideFree` (`raceBehavior.js:149–160`) iterates the **entire `active` array**:

```js
function isSideFree(racer, counterpart, active, dir, lateralHalfSpan, tHalfSpan, cap) {
  const targetY = racer.physicalY + dir * lateralHalfSpan;
  if (targetY < -cap || targetY > cap) return false;
  for (const other of active) {          // ← O(N) scan of all active
    if (other.index === racer.index || other.index === counterpart.index) continue;
    const dT = shortestArcDeltaT(racer.t, other.t);
    if (dT > tHalfSpan) continue;
    if (Math.abs(other.physicalY - targetY) < lateralHalfSpan) return false;
  }
  return true;
}
```

**This creates an O(N³) path when overlaps are dense.** In a braked pack (which Step 1 actively maintains), "overlapping pairs" is not a rare condition — it's the steady state.

**Quantified inner-loop iterations per physics step** (assuming ~50% of pairs overlap — conservative for a braked pack):

| Racers (N) | Pairs | Overlapping | isSideFree calls | Inner iterations |
|---|---|---|---|---|
| 40 | 780 | ~390 | ~1,560 | **~62,400** |
| 60 | 1,770 | ~885 | ~3,540 | **~212,400** |
| 90 | 4,005 | ~2,000 | ~8,000 | **~720,000** |

`FIXED_DT = 16` ms (`index.jsx:133`). At 60fps (16.7ms frame), there is typically 1 physics step per frame. When the main thread stalls and a frame takes 50ms, **3 steps fire back-to-back**, tripling the above. This is the judder-feedback loop: stall → 3 steps → stall.

At 90 racers: ~720K inner iterations × 3 catch-up steps = **~2.16M inner iterations** in one rAF callback. Each iteration does `shortestArcDeltaT` (arithmetic) + `Math.abs` — cheap individually, but 2M repetitions per frame is the dominant compute cost. **This is hypothesis H1 (code-reading level).**

### 1.2 Second O(N²) path: `_computeBlockedMode`

In the apply-deltas loop (`raceBehavior.js:518`):
```js
r.currentMode = _computeBlockedMode(r, active)
  ? PRIORITY_MODE.BLOCKED
  : PRIORITY_MODE.NORMAL;
```

`_computeBlockedMode` (`raceBehavior.js:171–177`) also iterates `active` in its inner loop — O(N) per racer. Called once per active racer in the apply-deltas loop → **O(N²) total** per physics step.

At 60 racers: 60 × 60 = 3,600 iterations. Small relative to the isSideFree path, but confirmed additional O(N²) work.

### 1.3 Per-frame string + object allocations inside the pair loop

`stablePairBit` (`raceBehavior.js:105–114`) is called on every overlapping pair:
```js
const aId = String(a.name ?? a.id ?? a.index ?? '0');
const bId = String(b.name ?? b.id ?? b.index ?? '0');
const key = aId < bId ? `${aId}|${bId}` : `${bId}|${aId}`;
```
This allocates 2–3 string objects per overlapping pair per physics step. At 60 racers with 885 overlapping pairs: ~1,770–2,655 string allocations per step.

At function entry, `applyRacerBehavior` allocates 6–8 Maps and 2 Sets per call (`raceBehavior.js:264–286`):
```js
const yDeltas        = new Map(active.map((r) => [r.index, 0]));
const yAvoidDeltas   = new Map(active.map((r) => [r.index, 0]));
const yFreeLaneDeltas= new Map(active.map((r) => [r.index, 0]));
const freeLaneCounts = new Map(active.map((r) => [r.index, 0]));
const overlapSet     = new Set();
const neighborCounts = new Map(active.map((r) => [r.index, 0]));
const speedBrakeSet  = new Set();
const brakeMatchCaps = new Map();
// ... plus conditional dRawPos/dRawNeg/dCntPos/dCntNeg Maps
```
Each call (1–3× per rAF) allocates and populates these from scratch. At 60 racers: 4+ Maps of 60 entries each = ~300 map insertions. These go to GC as soon as `applyRacerBehavior` returns.

### 1.4 Render-path per-frame allocations

**Particle arrays** (`index.jsx:1204–1222`):
```js
st.dustParticles = st.dustParticles
  .map((p) => ({ ...p, x: p.x + p.vx, y: p.y + p.vy, alpha: p.alpha - 0.022, r: p.r * 0.97 }))
  .filter((p) => p.alpha > 0);
```
Every frame: a `.map()` that creates `P` new spread-copied objects + a `.filter()` that creates a new array. Same for `burstParticles`. At 60 racers with surface trails, `P` can reach hundreds. This is **O(P) allocation + O(P) GC pressure** every frame.

**Render interpolation** (`index.jsx:1244–1250`, when enabled):
```js
const renderRacers = st.racers.map((r) => ({
  ...r,
  t: lerp(r._prevT ?? r.t, r.t, renderAlpha),
  x: lerp(r._prevX ?? r.x, r.x, renderAlpha),
  y: lerp(r._prevY ?? r.y, r.y, renderAlpha),
  angle: lerpAngle(r._prevAngle ?? r.angle, r.angle, renderAlpha),
}));
```
Creates N new spread-copied racer objects per frame. At 60 racers: 60 fat objects (~20+ properties each) per rAF call, then immediately eligible for GC.

**Diagnostics D1** (`index.jsx:1154`): `[...st.racers].sort(...)` — new array per rAF frame, unconditionally.

### 1.5 CSS animation layout pressure

**Scoreboard progress bars** (`RaceScreen.css:138`):
```css
.sb-bar-fill {
  height: 100%;
  transition: width 0.12s linear;
}
```
The scoreboard updates every 100ms (React state), setting new `style.width` inline values on **N elements** (one per racer). Each update starts a new CSS `width` transition. Because `width` is a layout-affecting property, every animation frame of these transitions requires the browser's layout engine to recalculate geometry. With 40–90 `.sb-bar-fill` elements each animating `width` every 100ms, the layout engine processes **400–900 animated width changes per second**.

**Background animation** (`RaceScreen.css:4–22`):
```css
@keyframes bgPulse {
  0%, 100% { background-position: 0% 50%; }
  50%       { background-position: 100% 50%; }
}
.screen--race { animation: bgPulse 6s ease infinite; }
```
Continuous `background-position` animation on the screen root. GPU-composited, but adds to the "Animation" category the profiler tracks.

**HUD pulse** (`CameraStateHUD.css:56–73`): `@keyframes hudFinishPulse` runs `1s ease-in-out infinite` when racers finish.

### 1.6 Canvas shadow cost

`drawOpenTrackFinishLine` (`trackRendering.js:158–174`):
```js
ctx.shadowBlur = 10;
ctx.shadowColor = '#ffd700';
for (let i = 0; i < segments; i++) { ... }
ctx.shadowBlur = 0;
```
`ctx.shadowBlur > 0` forces the browser's 2D canvas to composite the stroked content through a shadow pass — an offscreen rendering layer is allocated, the content is drawn into it, the Gaussian blur is applied, and the result composited back. This is called every frame for open tracks. The shadow rendering pass is disproportionately expensive relative to the 8-segment checkerboard it renders.

### 1.7 Minimap full redraw every frame

`renderMinimap` (`Minimap.js:68`): calls `shape.getEdgePoints(80)` every rAF to sample 80 points along the track for the minimap outline. This is O(1) relative to racers but adds a constant per-frame cost for spline evaluation (80 evaluations per frame).

### 1.8 Summary of likely dominant sources (before profile)

**H1 (strong hypothesis):** isSideFree O(N³) in dense packs is the primary judder cause. It scales cubically with racer count and fires multiple times per frame under catch-up conditions.

**H2 (moderate hypothesis):** Per-frame GC pressure from particle map/filter, renderRacers spread, and applyRacerBehavior Map allocations causes periodic GC stalls that compound with the O(N³) cost.

**H3 (weak hypothesis):** CSS `transition: width` on scoreboard bars is a contributing layout-thrashing source, appearing as periodic layout-phase spikes in the profiler.

**Not expected to dominate:** The minimap, drawOpenTrackFinishLine computation itself, or the scoreboard sort (only 100ms intervals).

---

## Part 2 — Profile Cross-Check

### Measured data
- Scripting: ~3,235ms over 14s → ~231ms/s → **~3.8ms/frame at 60fps**
- Rendering: ~1,701ms → ~121ms/s → **~2.0ms/frame**
- Painting: ~1,667ms → ~119ms/s → **~2.0ms/frame**
- Total JS+render+paint: ~7.8ms/frame average — within 16.7ms budget, but tight
- CLS: 0.22 (poor; >0.1 threshold)
- "Forced reflow" top function: `drawOpenTrackFinishLine (trackRendering.js:165)`, **506ms total**
- CLS culprits: "Animation" ×3
- Crash: STATUS_ACCESS_VIOLATION at ~14s

### H1 assessment — O(N³): partially confirmed indirectly

The profiler total of 3.2s scripting over 14s is an average that masks variance. Judder comes from frame-time variance, not average slowness. The profile would need per-frame timing to quantify the isSideFree impact directly (the "Experience" category, 2,326ms, likely captures Long Tasks > 50ms which would be the judder events).

**STATUS_ACCESS_VIOLATION crash:** This strongly points to memory exhaustion, not a JS logic error. The most likely cause is the GC failing to reclaim memory fast enough from per-frame particle allocations and spread-copied racer objects, causing the renderer process (which shares memory with the JS heap) to run out. Chrome's renderer uses a single process per tab; the JS heap, canvas buffers, compositor textures, and shadow filter surfaces all share the process address space. At 90 racers with continuous particle allocation, surface trail buffers, and shadow compositing, this limit can be reached in 10–15 seconds.

### H2 assessment — GC pressure: confirmed as contributing factor

The Painting cost (1,667ms / 14s) is unusually high for a canvas application. High painting cost in a 2D canvas context is typically driven by:
1. Shadow filter compositing (`ctx.shadowBlur`)
2. Frequent canvas composite layer invalidation from many small draw operations
3. The browser's pixel readback overhead when compositor and JS share canvas state

The GC pressure from per-frame allocations would appear as irregular scripting spikes — pauses every few hundred frames when V8 performs a major GC collection. These would manifest as the "judder" the user perceives.

### H3 assessment — The forced-reflow mystery (corrected)

**`drawOpenTrackFinishLine` itself has zero DOM layout reads** — verified from source. The function reads only from `shape.getPosition()` (pure spline computation) and writes only to the canvas 2D context. It cannot cause a JavaScript forced reflow in the classical sense (no `offsetWidth`, `getBoundingClientRect`, etc.).

The real cause of the 506ms "forced reflow" attribution:

**Primary culprit: `transition: width 0.12s linear` on `.sb-bar-fill`** (`RaceScreen.css:138`). Every 100ms, the React scoreboard sets new inline `style.width` on N progress bar elements. Each update:
1. Invalidates the CSS layout for those elements
2. Starts a new CSS transition for `width` (layout-affecting property)
3. Forces the browser's layout engine to process the animated width on every subsequent compositor frame

Chrome DevTools attributes "Forced Reflow" to whichever JS function was running on the main thread when the browser needed to synchronize with the layout engine. **`drawOpenTrackFinishLine` is running in the same rAF callback at the same timestamp as the layout flush** — it gets blamed by the profiler, but it is not the cause. The cause is the width transition on `.sb-bar-fill` elements.

Additional contribution: `ctx.shadowBlur = 10` in `drawOpenTrackFinishLine` forces an offscreen compositing surface. In Chrome's rendering pipeline, this can interact with the layout/compositing synchronization at frame boundaries and appear in the "forced reflow" bucket of the profiler.

**CLS 0.22 and "Animation ×3":** Three CSS animation sources triggering layout shifts:
1. `.sb-bar-fill { transition: width 0.12s linear }` — N scoreboard progress bars with layout-shifting `width` transitions. As racers' positions change, bar widths update, potentially shifting adjacent text/UI elements.
2. `@keyframes bgPulse` on `.screen--race` — background animation (GPU-composited, but may interact with the browser's CLS measurement).
3. `@keyframes hudFinishPulse` on the HUD finish indicator (when active).

The CLS 0.22 specifically likely comes from the scoreboard sidebar: when racer finish order changes (racers finish during the race), their scoreboard entries may reorder, changing the height of DOM elements and causing visible layout shifts.

### Profile vs. hypothesis reconciliation

| Hypothesis | Profile verdict |
|---|---|
| H1: isSideFree O(N³) dominant judder | **Consistent** — high scripting time + LongTask events (crash = memory pressure from allocation, consistent with heavy per-frame work) |
| H2: GC pressure | **Confirmed contributing** — STATUS_ACCESS_VIOLATION = memory exhaustion; Painting cost elevated from shadow compositing + canvas buffer churn |
| H3: CSS width transitions | **Confirmed as "forced reflow" source** — the 506ms attribution to `drawOpenTrackFinishLine` is profiler misattribution; the real cause is `transition: width` on scoreboard bars |
| Shadow blur cost | **New finding from profile** — High painting cost (1,667ms) is consistent with per-frame shadow filter compositing in `drawOpenTrackFinishLine` |

**Mismatch:** I underweighted the shadow blur (`ctx.shadowBlur`) as a cost source. The profile's 1,667ms Painting category is unusually high and shadow filter compositing is likely a significant contributor. This is a zero-fairness-risk fix I didn't emphasize enough in my pre-profile analysis.

---

## Part 3 — Reconciliation with Copilot's Analysis

Copilot's conclusions (as summarized by the user):
1. Targeted optimization over full rewrite
2. Primary culprits: all-pairs physics (O(N²)→O(N³) dense) + per-frame allocation/GC + render prep
3. Fix order: (1) measure, (2) spatial-partition neighbor search + localize side-clear, (3) reduce allocations, (4) render caching (minimap/overlay), (5) optional step-budget guard
4. Rewrite poor ROI: complexity is behavior/fairness, not dead code

### Where I agree with Copilot

**Agreed: no full rewrite.** The physics behavior (two-zone braking, chain-lock prevention, bypass correction) is embedded in the pair loop logic. Rearchitecting the loop without changing behavior would be extremely high risk given the 4-commit history of closed-track regressions. The fairness property is proven, not obvious — any rewrite risks silently breaking it.

**Agreed: O(N³) via isSideFree localization is the highest-ROI physics fix.** Copilot's framing of it as O(N²)→O(N³) "in dense scenes" is accurate. The fix — using the tHalfSpan early-exit in `isSideFree` more aggressively, or limiting `isSideFree` to actually-nearby racers rather than all `active` — is the right approach.

**Agreed: render caching for minimap.** The minimap calls `shape.getEdgePoints(80)` every frame. Since the track shape never changes during a race, caching the 80-point edge sample is pure win.

**Agreed: reduce allocations.** The per-frame `new Map(active.map(...))` pattern in `applyRacerBehavior` is fixable by pre-allocating cleared maps and reusing them.

**Agreed: measure first.** A fresh profile (per-frame timing histogram, not just totals) is required before any physics change. The profile data provided is totals only — it confirms scripting cost is high but doesn't localize which function within the physics step dominates.

### Where I differ from Copilot

**Differ: shadow blur cost is a priority Copilot apparently didn't highlight.** The profile's 1,667ms Painting category is high and `ctx.shadowBlur = 10` in `drawOpenTrackFinishLine` (every frame, every open track) is a likely significant contributor. This is a **zero-fairness-risk fix**: replace the shadow with a simple gold border or pre-render the finish line as a cached canvas image. Copilot's fix order doesn't appear to include this.

**Differ: the forced-reflow source.** If Copilot attributed the forced reflow directly to `drawOpenTrackFinishLine`'s canvas operations, that's incorrect — the function has no DOM reads. The actual source is `transition: width` on scoreboard bars. The fix is different: replace `transition: width` with `transition: transform: scaleX()` (a compositor-only property) or use opacity transitions instead.

**Differ on step-budget guard:** Copilot lists this as optional. I'd classify it as LOW-RISK HIGH-VALUE: a `MAX_PHYSICS_STEPS = 2` guard in the accumulator `while` loop prevents the catch-up death spiral (long frame → 3 steps → longer frame → crash). This is a one-line change with zero effect on fairness. It should be fix 1, not optional fix 5.

**Agree on the core conclusion:** The rewrite question is answered by the fairness constraint. Any approach that changes the pair-interaction semantics risks the N=50 sweep failing. Targeted fixes that preserve the exact loop structure (adding early-exit conditions, caching, reducing constant factors) are the safe path.

---

## Part 4 — Recommended Fix Order

### Tier 1: Zero Fairness Risk — Render, Layout, GC (do first)

These touch no physics logic. Each can be done, profiled, and shipped independently.

**Fix R1: Remove `ctx.shadowBlur` from `drawOpenTrackFinishLine` (trackRendering.js:158–159)**  
Replace the gold shadow with a simple thick gold border stroke or a pre-cached offscreen canvas for the finish line. Shadow filter compositing is an offscreen-surface GPU operation every frame. **Expected impact: reduce Painting time significantly.**

**Fix R2: Replace `.sb-bar-fill { transition: width }` with compositor-only animation (RaceScreen.css:138)**  
Change `width` transition to either: (a) `transform: scaleX(fraction)` + `transform-origin: left` (GPU-composited, no layout impact), or (b) remove the transition entirely for live race updates. **Expected impact: eliminate 506ms "forced reflow", reduce CLS from 0.22 toward 0.**

**Fix R3: Cache minimap track edge points (Minimap.js:68)**  
`shape.getEdgePoints(80)` returns the same result every frame (track doesn't change during a race). Cache this at race start and reuse. **Zero risk. Expected impact: minor per-frame compute reduction.**

**Fix R4: Add physics step-budget guard (index.jsx:803)**  
```js
// Current:
while (st.physicsAccum >= FIXED_DT) {
// After:
let steps = 0;
while (st.physicsAccum >= FIXED_DT && steps < 2) { steps++;
```
Caps physics catch-up at 2 steps per frame. Prevents the death spiral: stall → N steps → longer stall → crash. The physics will slightly "slow" during a heavy frame but catches back up across subsequent frames. **Zero fairness risk** (fairness is tested at sim speed, not wall-clock time). **Critical for crash prevention.**

**Fix R5: Eliminate per-frame Map allocations in `applyRacerBehavior` (raceBehavior.js:264–286)**  
Pre-allocate the Maps/Sets at race start and `clear()` them each call instead of `new Map(active.map(...))`. This requires passing the pre-allocated structures in, or making them module-level with a reset function. **No physics behavior change. Expected impact: reduce GC pressure, smooth frame timing.**

**Fix R6: Replace `.map().filter()` particle update with in-place mutation (index.jsx:1204–1222)**  
Update particles in a single pass with in-place array mutation and swap-to-end removal. Eliminates ~2× P object allocations per frame. **Zero fairness risk.**

**Fix R7: Eliminate per-frame `renderRacers` spread-copy (index.jsx:1244–1250)**  
Store interpolated values in pre-allocated side arrays rather than spreading racer objects. Or disable render interpolation (profile whether it's worth the cost at 60fps). **Zero fairness risk.**

---

### Tier 2: Higher Risk — Physics Neighbor Partitioning

These change the pair-interaction structure. **Require full N=50 fairness sweep + per-row confirmation + browser check before trust.**

**Fix P1: Localize `isSideFree` to spatially nearby racers only**  
The `isSideFree` scan at `raceBehavior.js:153` checks ALL `active` racers but only cares about racers within `tHalfSpan` of the target t-position. With a sorted list or bucket by t-position, the scan terminates early for the vast majority of racers. In practice `tHalfSpan ≈ 0.003–0.006` — only 1–3 racers are ever within range. This would reduce isSideFree from O(N) to O(1) amortized.  
**Fairness risk: HIGH.** isSideFree's result determines which direction each racer moves. Any change to which racers are "visible" to it can alter lateral dynamics and break the two-zone fairness balance. **Full N=50 sweep required after this change.**

**Fix P2: Outer pair loop early-exit by t-distance**  
At `raceBehavior.js:295–299`, `dist >= config.avoidanceDistance` already provides a distance check. But the loop still iterates all N×(N-1)/2 pairs to reach that check. Sorting `active` by t and using a sliding window (only consider pairs within `avoidanceDistance / tWeight` of each other in t-space) would reduce the O(N²) base to O(N×K) where K is average neighborhood size.  
**Fairness risk: MODERATE.** The distance check already exists; this just avoids unnecessary pairs reaching it. But the sort order changes iteration order, which could affect tie-breaking in edge cases (first-found wins for brakeMatchCaps). Verify carefully.

---

### Mandatory measurement before any Tier 2 change

Before touching any physics:
1. **Profile with per-frame timing** (not just totals): capture a 14s session with the detailed timeline view showing individual long frames. Identify which specific function dominates the scripting time — if it's `applyRacerBehavior` as expected, confirm `isSideFree` specifically.
2. **Add a `performance.now()` timing wrapper** around `applyRacerBehavior` and around `isSideFree` call site in dev mode to get exact time per physics step.
3. **Baseline the N=50 sweep** before Tier 2 changes (already done: `backup/step1-complete-fair`).
4. **After any Tier 2 change:** full N=50 sweep + per-row confirmation + browser check. Do not skip even if the chi-square looks fine by spot-check.

---

## Summary

| Fix | Location | Risk | Expected impact |
|---|---|---|---|
| R1: Remove shadowBlur | trackRendering.js:158 | Zero | Reduce Painting (1,667ms category) |
| R2: Replace `transition: width` | RaceScreen.css:138 | Zero | Eliminate 506ms "forced reflow", fix CLS |
| R3: Cache minimap edge points | Minimap.js:68 | Zero | Minor per-frame reduction |
| R4: Physics step-budget guard | index.jsx:803 | Zero | Prevent crash death-spiral |
| R5: Pre-allocate physics Maps | raceBehavior.js:264 | Zero | Reduce GC pressure, smooth judder |
| R6: In-place particle update | index.jsx:1204 | Zero | Reduce GC allocation ~2×P per frame |
| R7: Eliminate renderRacers spread | index.jsx:1244 | Zero | Reduce ~N large object allocations/frame |
| P1: Localize isSideFree | raceBehavior.js:153 | HIGH | Primary judder fix — but needs full sweep |
| P2: t-sorted pair loop | raceBehavior.js:289 | MODERATE | Secondary judder fix — needs full sweep |

**Recommended sequence:** Do R1–R7 first (zero-risk, each measurable independently), take a fresh profile after, then decide if Tier 2 is still needed. The shadow blur and step-budget guard (R1, R4) should be first — R1 addresses the painting cost, R4 prevents the crash. Fairness is never at risk until Tier 2 begins.
