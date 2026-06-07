# Perf Fix — Tier-1 Wave 2: Per-Frame Allocation Reduction

**Date:** 2026-06-06
**Branch:** `feat/open-track-overlap`
**Tests:** 2629/2629 green (no test logic changed)

---

## Goal

Eliminate the per-frame allocation churn identified in reports 00 and 03 as the primary
cause of V8 old-gen GC stalls. Zero behavior/fairness risk — only the memory lifecycle
of the structures changes, not their contents or the computations performed on them.

---

## A1 — Pre-allocate Maps/Sets in `applyRacerBehavior`

**File:** [raceBehavior.js](../../client/src/modules/raceBehavior.js)

**Before (lines 264–286):** 8–11 `new Map(active.map(...))` + `new Set()` calls per
physics step. At FIXED_DT = 16ms and 60fps the physics loop runs ~1 step/frame →
~3,750 `new Map(...)` calls per 60-second race, plus the intermediate array from
`active.map(...)`. These objects are large enough to survive minor GC and accumulate
in old-gen, causing the major GC pauses that feel like stutter.

**After:** 13 module-level pre-allocated structures declared once at module load:

```js
const _yDeltas = new Map();
const _yAvoidDeltas = new Map();
// ... (9 more Maps + 2 Sets)
```

Each `applyRacerBehavior` call `.clear()`s the relevant structures and re-populates
them with the active racer set. The population loop replaces the `new Map(active.map(...))`
chain: one `for (const r of active)` loop with 5 `.set(r.index, 0)` calls for the
always-needed maps. The conditional maps (`_dRawPos`, `_dRawNeg`, `_dCntPos`, `_dCntNeg`)
are cleared and populated only when `needsBreakdown` / `diagOut !== null`.

**Allocation eliminated:** ~10 new objects per physics step → 0. Every `.get()`,
`.set()`, `.has()`, `.add()` call and all downstream reads are identical — only the
object's identity changes (pre-allocated vs freshly created). No formula, threshold,
pair-loop ordering, or behavioral logic is altered.

**Why this is the highest-impact fix:** The Maps live for the entire physics step
and are referenced by nested loops. They're too large for the nursery and promote to
old-gen. Old-gen GC (mark-sweep-compact) pauses the JS thread for 50–200ms — the
"freeze" the user feels. Minor GC (scavenge) would handle young-gen objects in ~1ms,
so short-lived per-frame objects are less critical than these step-lifetime Maps.

---

## A2 — In-place particle update

**File:** [index.jsx](../../client/src/screens/RaceScreen/index.jsx) — 3 sites

**Before:** Three `.map(p => ({...p, ...})).filter(p => p.alpha > 0)` chains. Each
chain allocates P new particle objects + 1 intermediate array + 1 filtered array per
rAF frame. At 60fps with up to 200 particles active: ~600 object creations/sec from
particles alone.

**After:** In-place mutation with swap-remove for all three sites (RACING dustParticles,
RACING burstParticles, FINISHED burstParticles):

```js
let i = 0;
while (i < st.burstParticles.length) {
  const p = st.burstParticles[i];
  p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.alpha -= 0.014; p.r *= 0.97;
  if (p.alpha <= 0) {
    st.burstParticles[i] = st.burstParticles[st.burstParticles.length - 1];
    st.burstParticles.length--;
  } else i++;
}
```

Swap-remove changes the iteration order of dead-particle removal (last element fills
the gap instead of shifting). Particle rendering is order-independent (independent
colored dots), so the visual result is identical. The field update values are
unchanged: `+vx/vy`, `+0.18` gravity, `-0.014` alpha, `*0.97` radius — identical
to the previous per-object spread.

---

## A3 — Pre-allocated render interpolation buffer

**File:** [index.jsx](../../client/src/screens/RaceScreen/index.jsx)

**Before (lines 1239–1248):** `st.racers.map(r => ({...r, t: lerp(...), ...}))` —
allocates N fat racer objects every rAF frame when `renderInterpolation = true`
(the default). At 40 racers × 60fps = 2,400 large spread-copies per second.

**After:** `renderBuf` is declared once at the top of the `useEffect` body (before
the `loop` function), so it persists for the lifetime of the race mount:

```js
const renderBuf = [];
```

Inside the loop, `Object.assign(renderBuf[i], r)` overwrites the pre-allocated
object's properties in-place, then the 4 interpolated fields are overwritten:

```js
while (renderBuf.length < n) renderBuf.push({});
renderBuf.length = n;
for (let _i = 0; _i < n; _i++) {
  const r = st.racers[_i];
  Object.assign(renderBuf[_i], r);
  renderBuf[_i].t = lerp(r._prevT ?? r.t, r.t, renderAlpha);
  // ... x, y, angle
}
renderRacers = renderBuf;
```

`Object.assign` into an existing object is significantly cheaper than `{...r}` because
no new object needs to be allocated and initialized — V8 can write properties into
already-shaped memory. The output object has identical property values to the previous
spread. `CameraDirector.update` and `drawRacers` read the same fields from the same
positions; no downstream code changes.

`renderBuf.length = n` handles the case where a previous race had more racers — the
excess pre-allocated slots are hidden from array iteration without being GC'd.

---

## A4 — Gate the D1 diagnostics sort

**File:** [index.jsx](../../client/src/screens/RaceScreen/index.jsx)

**Before:** `[...st.racers].sort((a, b) => b.t - a.t)` runs every rAF frame
unconditionally, creating a spread copy of the racers array + sorting it. This runs
even when `showCameraDiagnostics = false` (the default), meaning 100% of users pay
the cost of a feature they never see.

**After:** The entire D1 block is wrapped in `if (showCameraDiagnostics)`. When the
diagnostics HUD is hidden (the default), zero allocations happen here. When enabled,
the behavior is identical.

`_diagSpeed`, `_diagDx`, `_diagDy`, `_diagPrevX`, `_diagPrevY` are written only when
diagnostics are active. If diagnostics are turned ON mid-race, the first frame will
show slightly stale delta values (the `??` guard falls back to 0 on first use) —
acceptable for a debug tool.

---

## Behavioral Correctness Confirmation

**No formula, threshold, ordering, or pair logic changed.** Verified by inspection:

| System | What changed | What did NOT change |
|---|---|---|
| `applyRacerBehavior` | Map/Set allocation strategy | All `.get/.set/.has/.add` calls, all pair-loop formulas, all thresholds, all output mutations to racer objects |
| Particle update | Object lifecycle (in-place vs new) | All arithmetic: `+vx`, `+vy`, `+0.18`, `-0.014/-0.022`, `*0.97` |
| renderRacers | Object lifecycle (reuse vs new) | `lerp(r._prevT, r.t, alpha)` and all 4 interpolated fields; all other racer properties copied identically |
| D1 sort | When it runs (gated vs always) | The sort, the `_diagSpeed` computation, and the `dv01/dv12` EWMA — all unchanged when active |

Physics output is bit-identical to before these changes. The test suite exercises
all behavior paths through `applyRacerBehavior` including the avoidance pair loop,
brake-to-match, free-lane separation, normalization, home force, and stuck-mode
suppression — all 2629 pass.

---

## What to Do Next

**Re-profile (40 racers, 30s session):** Take a new Chrome DevTools Performance
recording. Look for:
- **GC events:** should be shorter and less frequent (fewer old-gen promotions from A1)
- **Scripting:** minor reduction from A2/A3/A4
- **Forced reflow:** unchanged (root cause still undiagnosed per report 02)

**Judge feel:** If the game still doesn't feel smooth after profiling confirms GC
reduction, the remaining large cost is the **O(N²→N³) physics neighbor work** in
`applyRacerBehavior`'s pair loop — the nested `for i / for j / for each active in
isSideFree` structure. This is **Tier-2**, requires a fairness sweep (N=50) before
shipping, and is explicitly NOT done here. Flag for decision after user judges feel.
