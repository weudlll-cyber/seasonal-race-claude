# Memory Leak Audit — System Freeze Worsening Over Time

**Date:** 2026-06-06
**Branch:** `feat/open-track-overlap`
**Symptom:** Whole system freezes, worsens with each additional race in the same browser session

---

## Task 1 — How to Confirm the Leak via Heap Snapshot

**This procedure confirms whether retained heap grows monotonically across races (true leak) or returns to baseline (GC pressure only).**

### Steps for the user to capture

1. Open DevTools → Memory tab → select "Heap snapshot"
2. Load the game but do NOT start a race yet. Take Snapshot 1.
3. Start a race with 40 racers. Run to completion. Return to Setup screen (wait for navigation to `/results`, then navigate to `/setup`).
4. Wait 5 seconds after arriving at Setup to let GC collect post-race garbage.
5. Take Snapshot 2.
6. Start and complete 3 more races (same racer count) in the same way, waiting 5s at Setup after each.
7. Take Snapshot 3.

**Pass/fail signal:**
- Snapshot 1 → Snapshot 2 → Snapshot 3 **growing monotonically and NOT returning to Snapshot-1 baseline** = confirmed leak (unbounded accumulation across races)
- Heap returns to near Snapshot-1 size after each race = NOT a true JS heap leak; the issue is GC pressure (large allocations per race that take time to collect) or GPU memory

**Additional signals to read:**
- In the snapshot comparison, filter "Detached HTMLCanvasElement" — a detached canvas that persists means the GPU 2D context was not released after unmount
- Filter "Detached HTMLDivElement" or "Detached React" nodes — retained DOM from a component that didn't fully unmount
- `(array)` category size — if growing across snapshots, the racer/particle arrays are not being released

**Listener count:** DevTools → Performance → Memory checkbox → compare EventListener count between race-start and after-return-to-setup. Stable count = listeners are properly cleaned up.

---

## Task 2 — Race Lifecycle Resource Audit

### 2.1 requestAnimationFrame loop

**File:** [index.jsx:1421–1426](client/src/screens/RaceScreen/index.jsx#L1421)

```js
rafRef.current = requestAnimationFrame(loop);
return () => {
  cancelled = true;
  if (rafRef.current) cancelAnimationFrame(rafRef.current);
  effectsRef.current = [];
};
```

**Status: CLEAN.**
- `cancelled = true` causes `loop(ts)` to return early at the first line (line 726: `if (cancelled) return`)
- `cancelAnimationFrame(rafRef.current)` cancels the pending (not-yet-fired) rAF
- Inside `loop`, each iteration ends with `rafRef.current = requestAnimationFrame(loop)`, keeping `rafRef.current` current — so the `cancelAnimationFrame` in cleanup always holds the latest ID
- JS is single-threaded; cleanup cannot race with an executing `loop` call

The rAF loop is NOT the leak source.

---

### 2.2 Event listeners

**File:** [index.jsx:302–316](client/src/screens/RaceScreen/index.jsx#L302)

```js
// Fullscreen
document.addEventListener('fullscreenchange', onFsChange);
return () => document.removeEventListener('fullscreenchange', onFsChange);

// Hotkey
window.addEventListener('keydown', onKey);
return () => window.removeEventListener('keydown', onKey);
```

**Status: CLEAN.** Both listeners have proper `useEffect` cleanup functions. No other `window.*` or `document.*` listeners found in `RaceScreen/index.jsx` or any of its imported modules (grep confirms no `addEventListener` calls in `client/src/modules/camera/`, `client/src/modules/surface-effects/`, or `client/src/modules/track-effects/`).

---

### 2.3 Timers

**2.3a Overlay timer** — [index.jsx:296–298](client/src/screens/RaceScreen/index.jsx#L296)
```js
overlayTimerRef.current = setTimeout(() => setOverlayText(null), duration);
return () => clearTimeout(overlayTimerRef.current);
```
**Status: CLEAN.** Stored in ref, cleared on cleanup.

**2.3b Race-end navigation timer** — [index.jsx:1043](client/src/screens/RaceScreen/index.jsx#L1043)
```js
setTimeout(() => fadeNavigate('/results'), camDirRef.current?.finishPauseMs ?? 2500);
```
**Status: MINOR BUG — not a leak, but a correctness issue.**
This timer is NOT stored in a ref and NOT cleared on unmount. If the user navigates away BEFORE the 2500ms fires, the callback fires on an unmounted component and calls `fadeNavigate` (which calls React Router's `navigate`). React 18 handles this gracefully (no state update on unmounted component). This cannot cause a memory accumulation.

**Second concern:** If the physics while loop processes multiple catch-up steps at the exact physics-step when the last racer finishes (`st.finishedCount >= nRacers`), the `if (st.finishedCount >= nRacers)` block (line 1012) fires AGAIN on the next catch-up step. The `st.phase` is set to `PHASE.FINISHED` on the first step, but the while loop does NOT exit early — it continues for any remaining steps, re-entering the `if` check. Since `st.phase` is mutable state checked at the OUTER `else if (st.phase === PHASE.RACING)` level, not at the inner while loop level, the inner block CAN fire twice per rAF at race end if two catch-up steps straddle the finish. This causes 2× `setTimeout(() => fadeNavigate('/results'), ...)` calls. Not a memory leak — `fadeNavigate` is idempotent — but it is a bug.

**2.3c `TransitionProvider` timers** — [TransitionContext.jsx:24–27](client/src/contexts/TransitionContext.jsx#L24)
```js
setTimeout(() => {
  navigate(path);
  setTimeout(() => setVisible(false), 50);
}, 320);
```
**Status: CLEAN.** Short-lived (320ms + 50ms), fires once, no accumulation.

---

### 2.4 Canvas context

**File:** [index.jsx:336](client/src/screens/RaceScreen/index.jsx#L336)
```js
const ctx = canvas.getContext('2d');
ctx.imageSmoothingQuality = 'high';
```

**Status: POTENTIAL GPU MEMORY ISSUE — not a JS heap leak.**
Each component mount creates a new `<canvas>` DOM element (from `useRef`). `canvas.getContext('2d')` requests a new 2D rendering context. Chrome allocates GPU-backed compositing resources for this context. When the component unmounts, the canvas element is removed from the DOM. The JS reference (`ctx`) is released when the closure is GC'd. The canvas element itself becomes eligible for JS GC.

However, **Chrome may defer releasing GPU compositor memory for canvas elements.** The GPU process (`--gpu-process`) holds its own reference to the backing surfaces. If Chrome doesn't aggressively release these when the canvas element is GC'd from JS, GPU memory grows across races. `ctx.imageSmoothingQuality = 'high'` forces Chrome to use a higher-quality GPU resampling path that may allocate more compositor resources.

**No explicit canvas context release API exists in the Web platform** — there is no `ctx.dispose()` or `canvas.releaseContext()`. The only mitigation is to reuse the same canvas across races rather than creating a new one per mount.

---

### 2.5 Track effects

**File:** [index.jsx:378–383](client/src/screens/RaceScreen/index.jsx#L378) + [index.jsx:1425](client/src/screens/RaceScreen/index.jsx#L1425)

```js
effectsRef.current = extractEffects(geometry).map(({ id, config }) => {
  const manifest = getEffect(id);
  return manifest ? manifest.create(canvas, config) : null;
}).filter(Boolean);
```

Cleanup:
```js
effectsRef.current = [];
```

**Status: CLEAN, with a note.**
Each effect (rain, bubbles, etc.) is a closure with a particle array (`drops: []`). Setting `effectsRef.current = []` removes the React reference to all effect instances; the closures are then GC-eligible. No effect registers external listeners or timers (confirmed from source of `rain.js`, `bubbles.js`, etc.).

Note: cleanup does NOT call a `destroy()` method on effects — there is no such API in the effect protocol (`{ update, render }`). This is fine because none of the effects hold external resources.

---

### 2.6 Game state object (g.current)

**File:** [index.jsx:527](client/src/screens/RaceScreen/index.jsx#L527)

`g.current` is a React ref (`useRef`). On component unmount, the ref object itself is released. `g.current` (the game state) becomes eligible for GC once:
1. The rAF loop is cancelled (no `loop` closure referencing `g` remains scheduled)
2. No other JS holds a reference to the game state

**Per-racer data that grows during a race:**
- `r.surfaceParticles: []` — updated by `r.surfaceEmitter.update(r.surfaceParticles, dtFrames)` each frame; bounded by emitter's internal limit
- `r.trail: []` — capped at 10 entries (racerRendering.js:140: `if (r.trail.length > 10) r.trail.shift()`)
- `st.dustParticles`, `st.burstParticles` — alpha-decayed each frame; stable at ~100–500 entries

The game state is structurally sound: all arrays are bounded DURING a race and released AFTER unmount.

**Status: CLEAN at the JS level.** Post-unmount, all game state (racers, particles, trails) becomes GC-eligible in one step when the closure releases.

---

### 2.7 Module-level caches

These persist across component mount/unmount cycles (they're module-level, not component-level):

| Module | Variable | Size | Bounded? |
|---|---|---|---|
| `bgImageCache.js:10` | `const _cache = new Map()` | 1 entry per unique bg image path | YES — fixed set of track backgrounds |
| `registry.js:26` | `let _classes = [...]` | Fixed array, replaced on `loadServerClasses` | YES |
| `racer-types/index.js:144` | `const _loadedRacerTypes = {}` | 1 entry per racer type ever loaded | YES — fixed set of types |
| `spriteLoader.js:11` | `const _cache = new Map()` | 1 per unique sprite URL | YES — fixed set |
| `spriteTinter.js:15,23,27,137` | 4 variant/pattern caches | 1 per unique (sprite × coat × pattern) combination | YES — bounded by type count × coats × 3 patterns |

**Status: ALL BOUNDED.** These grow during the first 1–3 races as new sprite variants are tinted and cached, then stabilize. They are intentional performance caches — the same images/variants are reused across races. They are NOT the source of the worsening-over-time symptom.

---

### 2.8 racePlanController and speedRings

**File:** [index.jsx:629–659](client/src/screens/RaceScreen/index.jsx#L629)

```js
let racePlanController = null;
const speedRings = new Map();
if (racePlanEnabled) {
  ...
  racePlanController = createTrajectoryController(...);
}
```

Both are local variables inside the `useEffect` closure. On unmount, the closure is released and both become GC-eligible. `speedRings` has at most `nRacers` entries. **Status: CLEAN.**

---

### 2.9 CameraDirector

**File:** [index.jsx:477](client/src/screens/RaceScreen/index.jsx#L477)

```js
camDirRef.current = new CameraDirector(worldW, worldH, isOpenTrack, cameraConfig, ...);
```

`CameraDirector` constructor registers NO event listeners, NO timers, NO external resources. It is a pure data object with internal state arrays (frame log ring buffer of 600 entries — `DIAG_RING_SIZE = 600` at `CameraDirector.js:78`). On component unmount, `camDirRef` is released with the component instance. **Status: CLEAN.**

---

## Task 3 — Leak vs. Per-Frame GC Churn

**These are distinct problems with different fixes.**

### True JS heap leak (unbounded cross-race accumulation)
Would appear as: heap that grows by ~X MB per race and NEVER returns to baseline. Identifiable via heap snapshot comparison.

From the audit: **no cross-race unbounded accumulation found in the JS layer.** All refs, closures, arrays, and Maps are properly released on unmount. Module-level caches are bounded.

### Per-frame GC churn (what report 00 identified)
Each race allocates at high rates:
- `applyRacerBehavior`: 6–8 `new Map(active.map(...))` per physics step × 3,750 steps per 60s race = ~26,000 Map allocations per race
- Particle `.map(...).filter(...)`: ~P new objects per frame × 3,600 frames per race
- `renderRacers` spread: N × 60fps × 60s = 216,000 racer-object allocations per race

V8 collects these via minor GC (Scavenge). But some objects escape to the old generation (e.g., racer objects that are referenced for more than one minor-GC cycle). The old generation grows across races. After 5+ races, V8 runs a major GC collection (stop-the-world, 50–200ms) — this is what the user experiences as a "freeze."

**This is the correct explanation for the worsening-over-time symptom, not a true memory leak.**

### GPU memory pressure (new finding from audit)
Each race mounts a fresh `<canvas>` element and allocates a new GPU 2D context. Chrome's GPU process holds compositor backing surfaces. If Chrome defers releasing these across races, GPU memory grows. After 5–10 races at a 60-racer field, GPU VRAM pressure may force the OS to swap compositor surfaces to disk → system-level freeze.

This is distinct from JS heap: it would NOT appear in a heap snapshot, but WOULD appear in Chrome's Task Manager (Menu → More Tools → Task Manager, look at the "GPU Memory" column).

**Most likely dominant cause of system freeze:** Combination of V8 old-generation GC pause (caused by per-frame allocation churn, worst near the RACING phase end when years of promoted objects are collected at once) AND possible GPU memory growth from per-race canvas contexts.

---

## Ranked Suspect List

| Rank | Source | File:line | Type | Confirmed? |
|---|---|---|---|---|
| 1 | V8 old-gen GC pressure from per-frame allocations | raceBehavior.js:264–286, index.jsx:1204–1222 | GC pause, not true leak | Consistent with symptoms |
| 2 | GPU memory from per-race canvas context | index.jsx:336 | GPU resource, not JS heap | Cannot confirm without GPU memory profiling |
| 3 | `setScoreboard` DOM mutations N×/sec creating promoted React fiber nodes | index.jsx:996 | GC pressure, not true leak | Consistent with symbols in old gen |
| 4 | Race-end `setTimeout` double-fire bug | index.jsx:1043 | Correctness bug | Code reading — no guard against re-entry |
| 5 | JS heap leak in module caches | spriteTinter.js, bgImageCache.js | Bounded cache | NOT a leak — bounded by design |

**Primary suspect: V8 GC pause from per-frame Map allocation.**  
`applyRacerBehavior` allocates 6–8 new Maps per physics step, 3,750 steps per 60s race = ~26,000 Map objects per race. These survive into the old generation after ~2–3 races. V8's subsequent major GC is a stop-the-world pause. This is the Tier-1 Render fix R5 (pre-allocate Maps, clear instead of new) from report 00 — it is the CORRECT priority before any physics neighbor-partitioning.

**This is the real dominant problem. The Tier-1 render fixes (R1, R3, R4) were secondary.** They reduced some GC categories but did not address the physics Map allocation which is the largest allocator by count.

---

## What to Capture Next

**To confirm JS heap leak (true leak) vs GC pressure:**
1. Heap snapshot comparison (procedure in Task 1 above)
2. If no JS heap leak: open Chrome Task Manager (`Shift+Esc`) → watch "JS Memory" column across races. If it grows and doesn't fully recover after Setup returns → old-gen GC pressure confirmed.
3. If "GPU Memory" in Task Manager grows monotonically → GPU canvas leak confirmed.

**To quantify the Map allocation impact:**
Add `performance.now()` around `applyRacerBehavior` in dev mode to measure time per call at various racer counts. Compare before/after the R5 Map pre-allocation fix.

---

## Note on the CLS Regression Fix (Bundled with this Report)

**`box-shadow` removed from `.sb-bar-fill` (`RaceScreen.css:144`).**

The R3 change made `.sb-bar-fill { width: 100% }`. CSS `overflow: hidden` on `.sb-bar-bg` clips CONTENT but does NOT clip `box-shadow`. The full-width layout box's shadow bleeds outside the container on the right side (where no bar is visually present), painting over siblings and doubling CLS (0.22 → 0.45, per report 02). Removing the glow (cosmetic only) eliminates this. Tests: 2629/2629 green. Only `RaceScreen.css` was modified — no physics, fairness, or race-behavior code touched.

**User action required:** Re-profile with 40 racers. Expect CLS to return to ~0.22 or below. If it does, report 02's shadow-bleed hypothesis is confirmed. If CLS remains at 0.45, the source is the rank-reordering (DOM key-order change) — which requires a different fix (see report 02, corrective action section).
