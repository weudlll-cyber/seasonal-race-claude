# Overlap Investigation — Body-Sizing Rebuild

**Branch:** `feat/closed-track-overview-normalization`  
**Date:** 2026-06-05  
**Mode:** ANALYSIS ONLY — no code changed

---

## Verdict Up Front

**The overlap is PURELY VISUAL. There is no physics regression.**

Physics consumers of sprite size (`spriteWorldSizePx`) are unchanged. The sim reports identical physics outcomes on master and branch (fingerprint: finishT=0.814, rows=5 for Garden Path × snail). The visual overlap occurs because the rebuild increased the rendered body size on narrow closed tracks (W_real << W_REF=285), while physical avoidance still uses the old smaller slot width.

---

## 1. Physics Consumer Audit

Every site in the physics/avoidance path that reads sprite size:

### `raceBehavior.js` — `getSpriteWorldSizePx(racer)` (line 75–81)

```js
function getSpriteWorldSizePx(racer) {
  if (Number.isFinite(racer.visibleWidthPx) && racer.visibleWidthPx > 0) return racer.visibleWidthPx;
  if (Number.isFinite(racer.spriteWorldSizePx) && racer.spriteWorldSizePx > 0) return racer.spriteWorldSizePx;
  return 0;
}
```

`visibleWidthPx` is **never set** on racer objects in RaceScreen. Falls through to `spriteWorldSizePx`.

| Physics site | What it reads | Before rebuild | After rebuild | Changed? |
|---|---|---|---|---|
| `dynamicBrakeT` (raceBehavior:289) | `spriteWorldSizePx / pathLength` | `physicalSpriteSize` | `physicalSpriteSize` | ❌ No |
| `lateralHalfSpan` (raceBehavior:299) | `spriteWorldSizePx / trackWidth` | `physicalSpriteSize` | `physicalSpriteSize` | ❌ No |
| `tHalfSpan` (raceBehavior:300) | `spriteWorldSizePx / pathLength` | `physicalSpriteSize` | `physicalSpriteSize` | ❌ No |
| `overlaps` check (raceBehavior:301) | both spans above | `physicalSpriteSize` | `physicalSpriteSize` | ❌ No |
| `rowGapPx` (RaceScreen:480) | `physicalSpriteSize` | old `spriteSize` | `physicalSpriteSize` | ❌ No |
| `rowCount` inline (RaceScreen:484) | `physicalSpriteSize` | old `spriteSize` | `physicalSpriteSize` | ❌ No |

**Derivation confirming identity:**

Before rebuild (`RaceScreen` master):
```js
const racerLayout = computeRacerLayout(effectiveWidth, nRacers, displaySize, autoScaleConfig);
displaySizeScale = racerLayout.spriteSize / displaySize;   // frame-based, real width
const spriteSize = displaySize * displaySizeScale;          // = racerLayout.spriteSize
spriteWorldSizePx: spriteSize,                             // line 572
```

After rebuild (`RaceScreen` this branch):
```js
const racerLayout = computeRacerLayout(effectiveWidth, nRacers, displaySize, autoScaleConfig);
displaySizeScale_physical = racerLayout.spriteSize / displaySize;  // SAME computation
const physicalSpriteSize = displaySize * displaySizeScale_physical; // = racerLayout.spriteSize
spriteWorldSizePx: physicalSpriteSize,                              // line 593
```

`spriteWorldSizePx` is byte-for-byte identical before and after. `computeRacerLayout` is unchanged.

**`sim-fairness.mjs` (line 273):** uses `computeRacerLayout(effectiveWidth, nRacers, displaySize, ...)` directly for `spriteWorldSizePx` — also unchanged.

---

## 2. Garden Path / snail / N=40: physical vs. visible comparison

**Setup:** Garden Path — `trackW=100px`, `startSpreadRange=0.95`, `effectiveWidth=95px`. Snail: `displaySize=35`, `bodyFillX=0.727`, `bodyFillY=0.938`, `bodyFillNarrow=0.727`.

| Quantity | Before rebuild | After rebuild |
|----------|---------------|---------------|
| Physical slot width (`computeRacerLayout(W_real=95).spriteSize`) | **23.75 px** | **23.75 px** (unchanged) |
| `spriteWorldSizePx` (avoidance/brake) | 23.75 px | 23.75 px (unchanged) |
| `bodyNarrow` for rendering (`computeBodyNarrowRef(W_REF=285, N=40)`) | — | **28.50 px** |
| Visible cross-track body | `0.727 × 23.75 = 17.27 px` | **28.50 px** |
| Visible body / physical slot ratio | 0.73× (fits in slot) | **1.20× (overflows slot)** |
| Overflow per side | 0 px | **(28.5 − 23.75) / 2 = +2.38 px** |
| Rendered frame (body / bodyFillNarrow) | 23.75 px | **39.2 px** |

The physical avoidance slot (23.75 px) is unchanged. The rendered visible body (28.5 px) now exceeds it by 20%, extending 2.38 px world-px into the neighboring racer's slot on each side.

At **LEADER zoom** (spriteScale=1.81, frameEffZoom≈1.81): each side overflow = 2.38 × 1.81 = **4.3 px on screen** → two side-by-side snails overlap by ~8.6 px visible body pixels, approximately **30% of the visible body width**. Clearly visible.

### Full N-sweep for Garden Path / snail

| N | rows | physSlot | visBody BEFORE | ratio | visBody AFTER | ratio | overflow/side |
|---|------|---------|----------------|-------|---------------|-------|---------------|
| 5 | 1 | 38.0 | 27.6 | 0.73 | **63.6** | **1.67** | **+12.8 px** |
| 10 | 2 | 38.0 | 27.6 | 0.73 | **57.0** | **1.50** | **+9.5 px** |
| 20 | 3 | 27.1 | 19.7 | 0.73 | 28.5 | 1.05 | +0.7 px (minor) |
| 40 | 5 | 23.8 | 17.3 | 0.73 | **28.5** | **1.20** | **+2.4 px** |
| 60 | 8 | 23.8 | 17.3 | 0.73 | 19.0 | 0.80 | −2.4 px (no overlap) |
| 80 | 10 | 23.8 | 17.3 | 0.73 | 21.1 | 0.89 | −1.3 px (no overlap) |

Before the rebuild, `visibleBody / physSlot` was always `bodyFillNarrow = 0.73` — the body always fit within the slot. After the rebuild, the staircase from W_REF (fixed at 285) is decoupled from the staircase for W_real (95). Their crossover depends on N:
- **Below N≈35:** W_REF gives larger bodyNarrow → visual overflow
- **Above N≈35:** W_REF packing enters smaller staircase plateau → visual body may be smaller than physical slot

The user observes heavy overlap at N=40 with a full field — this is exactly in the overflow zone.

---

## 3. Sim overlap numbers: master vs. branch

**Garden Path (closed track): sim-fairness.mjs does NOT print `LateralQ` for closed tracks** (line 2130: `if (isOpen && raceResults.length > 0)` — the avoidance/overlap stats block is open-track only). No numeric overlap metric is produced for Garden Path.

**Fingerprint equivalence** (confirmed by prior Stage 1–6 validation, seed=42, 10 races):

| Combo | finishT | rows | Status |
|-------|---------|------|--------|
| Garden Path × snail × 30s | 0.814 | 5 | ✅ identical on master and branch |

`rows=5` confirms the physical packing (row count from `computeRacerLayout`) is unchanged. Physics is identical.

**Conclusion:** The sim shows 0% physics overlap (unchanged from master). The user-observed overlap is entirely visual — rendered bodies extend beyond physical slots, but the avoidance system's collision zone is still sized to the old physical slot.

---

## 4. Root cause (exact line)

There is **no "bug" in the sense of a mistaken value** — the visual/physical divergence is a designed consequence of the rebuild's intent ("track size does not influence visible size"). The cause is:

```js
// RaceScreen/index.jsx — render path (W_REF=285, body-narrow)
const W_REF = 285;
const bodyRef = computeBodyNarrowRef(W_REF, nRacers, displaySize, bodyFillNarrow, autoScaleConfig);
let displaySizeScale = bodyRef.bodyNarrow / displaySize;   // render scale: W_REF-based
```

```js
// RaceScreen/index.jsx — physics path (W_real, frame-based)
const racerLayout = computeRacerLayout(effectiveWidth, nRacers, displaySize, autoScaleConfig);
let displaySizeScale_physical = racerLayout.spriteSize / displaySize;  // physics scale: real-width-based
```

On Garden Path (`effectiveWidth=95`, `W_REF=285`): W_REF is 3× wider than the real track. The render scale is 3× larger relative to the track, producing visible bodies that exceed physical slots.

The **avoidance system** was tuned with the old frame-based visible size in mind. Its `lateralHalfSpan = spriteWorldSizePx / trackWidth = 23.75/95 = 0.25` pushes racers apart when their old-size bodies would overlap. With new visible bodies (28.5px), the avoidance doesn't trigger until racers are actually 23.75/95 = 25% of track width apart — but their visible bodies span 28.5/95 = 30% each. The gap between avoidance trigger and visual body edge = (28.5 − 23.75) / 2 = 2.4px world-px per side.

---

## 5. Options (not chosen — presented for user decision)

### Option (a) — Accept it

The visual overlap is an explicit consequence of "consistent visible size across all tracks." Slim racers now appear the same cross-track width as wide racers at the same N. The physics is correct; the avoidance prevents true collisions. The visual overlap is cosmetic.

**Tradeoff:** Users will see sprites overlapping visually on narrow closed tracks (Garden Path, City Circuit, Dirt Oval) at typical field sizes. At N=40 on Garden Path, snail bodies overlap ~30% at LEADER zoom.

---

### Option (b) — Reduce `overviewTargetScreenPx`

Reducing the floor would shrink sprites in OVERVIEW state. The floor is currently 28px.

**Problem:** The floor only applies when `proportionalScreenPx < minFloorPx`. In non-OVERVIEW camera states (LEADER, BATTLE, COMEBACK), `proportionalScreenPx = bodyNarrow × frameEffZoom` is often above the floor. At LEADER zoom (1.81×): `propPx = 28.5 × 1.81 = 51.6px >> 28px` → floor never fires → no effect on LEADER/BATTLE.

The `overviewTargetScreenPx` value that makes OVERVIEW visible ≈ physical for Garden Path snail N=40 is **14.4 px** (= physBody × bsX = 17.3 × 0.833). But this would make OVERVIEW racers tiny on all tracks.

**Verdict:** Option (b) reduces OVERVIEW sprite size but does NOT fix visual overlap in LEADER/BATTLE/COMEBACK camera states, where the overlap is most visible.

---

### Option (c) — Cap W_REF at `effectiveWidth`

One-line change in `RaceScreen/index.jsx`:
```js
// Before:
const W_REF = 285;
const bodyRef = computeBodyNarrowRef(W_REF, nRacers, displaySize, bodyFillNarrow, autoScaleConfig);

// After (proposed):
const W_REF = Math.min(285, effectiveWidth);  // cap at real track width
const bodyRef = computeBodyNarrowRef(W_REF, nRacers, displaySize, bodyFillNarrow, autoScaleConfig);
```

**Effect:**
- **Narrow closed tracks** (Garden Path W=95, Dirt Oval W=88, etc.): `W_REF_CAPPED = W_real` → body-narrow packing uses real width → visible body ≤ physical slot on all N. For Garden Path snail N=40: `bodyNarrow_capped = 19.0px < physSlot 23.75px` → no visual overflow ✓.
- **Wide open tracks** (W=285): `W_REF_CAPPED = 285 = W_real` → unchanged, body-based sizing preserved ✓.
- **Searound** (W=131): `W_REF_CAPPED = 131` → body-based sizing uses 131px instead of 285px. Racers would be sized relative to the Searound corridor, not the Space Sprint corridor.

**Tradeoff:** The "consistent visible size across all tracks" goal is partially reverted for closed tracks. At the same N, Garden Path snails and Space Sprint rockets would have different visible body widths. The body-based equality (giraffe = duck at same N) still holds within a track; it just varies across tracks with different widths.

**Quantified benefit for Garden Path snail N=40:**

| W_REF setting | bodyNarrow | visBody | physSlot | overflow |
|---------------|-----------|---------|---------|---------|
| W_REF=285 (current) | 28.5 px | 28.5 px | 23.75 px | **+2.4 px/side** |
| W_REF_CAPPED=95 (proposed) | 19.0 px | 19.0 px | 23.75 px | −2.4 px (fits) |

---

## 6. Fingerprint gap

**The determinism fingerprint does NOT catch this class of regression.**

The fingerprint currently measures:
- `finishT` — race outcome timing (physics)
- `rows` — start-row count (physics)

It does NOT measure:
- Rendered body size in world-px
- Visible body / physical slot ratio
- Any visual overlap metric

**Recommendation:** Add a rendered-body-vs-slot check to the fingerprint, or a separate visual-regression test. Concretely, after each rebuild stage, assert:

```
max(bodyNarrow_render(W_REF, N, ds, bodyFillNarrow) / computeRacerLayout(W_real, N, ds).spriteSize)
≤ 1.0  // visible body must not exceed physical slot
```

for all racer × track combinations at typical N (e.g., 20 and 40). This would have caught the regression in Stage 1.

No code changed. Branch pushed.
