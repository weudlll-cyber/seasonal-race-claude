# Report 32 — True Body Size: Is bodyNarrow Normalized or Per-Type?

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07
**Status:** Analysis only. No code changes.
**Question:** Does bodyNarrow give each racer its TRUE visible body size (type-specific), or a normalized one (collapses plane and rocket to the same value)?

---

## 0. The docstring that raised the concern

[rowLayout.js:215–218](../../client/src/modules/rowLayout.js#L215):
```javascript
 * Identical staircase logic to computeRacerLayout but measures slot widths in
 * VISIBLE BODY NARROW units (min(bodyFillX,bodyFillY) × displaySize) rather than
 * frame units. Returns the body-narrow world-px so every racer type at the same
 * N and W_ref gets the same visible narrow-axis size on screen.
```

The phrase "every racer type… gets the **same** visible narrow-axis size on screen" is the source of concern. If true: plane and rocket collapse to the same width → wrong for overlap. This report proves it is NOT true; the formula is per-type.

---

## 1. What bodyNarrow actually computes

**Formula** ([rowLayout.js:231–243](../../client/src/modules/rowLayout.js#L231)):
```javascript
const narrowDS      = displaySize * bodyFillNarrow;       // per-type: body narrow px at 1× scale
const minBodyNarrow = narrowDS * minScale;                // min = narrowDS × 0.65
const maxBodyNarrow = narrowDS * maxScale;                // max = narrowDS × 2.5
const maxRPRatMin   = floor((2 * W_ref) / minBodyNarrow); // max racers/row at minimum body
const rowCount      = ceil(N / maxRPRatMin);
const racersPerRow  = ceil(N / rowCount);
const targetBodyNarrow = (2 * W_ref) / racersPerRow;     // slot width
return { bodyNarrow: min(targetBodyNarrow, maxBodyNarrow) };
```

`bodyNarrow = (2 × W_REF) / racersPerRow` — it is the **slot width** in the body-narrow row layout. The slot width is shared by all types that happen to produce the same `racersPerRow`. **Different types produce different `racersPerRow`** because `minBodyNarrow = narrowDS × 0.65 = displaySize × bodyFillNarrow × 0.65` differs per type.

### Why the docstring is misleading

The docstring describes what this function does **differently from `computeRacerLayout`**:
- `computeRacerLayout` sizes slots in FRAME units (displaySize) — all types get the same slot, so wide-bodied types appear bigger (bodyFillNarrow × frame) and narrow-bodied types appear smaller.
- `computeBodyNarrowRef` sizes slots in BODY NARROW units (displaySize × bodyFillNarrow) — the slot now represents the BODY, not the frame.

The "same visible narrow-axis size" claim reads as a cross-type invariant. It is not. It is accurate only within the same row structure group. Types with very different `bodyFillNarrow` produce different `racersPerRow` and thus different `bodyNarrow`. The docstring should say "returns the actual visible body narrow width in world px" — which is true without implying cross-type equality.

---

## 2. Exact numbers: N=40, Space Sprint (after track-width fix)

**Parameters:** trackWidthPx=300, startSpreadRange=0.95, effectiveWidth=285, W_REF=min(285,285)=285.  
**autoScaleConfig:** minScale=0.65, maxScale=2.5.  
**Slot arithmetic:** 2×W_REF = 570.

### Step-by-step per type

| Step | Dragon | Plane | Rocket | Giraffe |
|---|---|---|---|---|
| displaySize | 50 | 42 | 47 | 48 |
| bodyFillX / bodyFillY | 0.836 / 0.898 | 0.836 / 0.93 | 0.278 / 0.801 | 0.271 / 0.767 |
| bodyFillNarrow = min(X,Y) | **0.836** | **0.836** | **0.278** | **0.271** |
| bodyFillLong = max(X,Y) | 0.898 | 0.930 | 0.801 | 0.767 |
| narrowDS = ds × bfNarrow | 41.8 | 35.1 | 13.1 | 13.0 |
| minBodyNarrow = nDS × 0.65 | 27.2 | 22.8 | 8.5 | 8.5 |
| maxRPRatMin = ⌊570/min⌋ | **20** | **24** | **67** | **67** |
| rowCount = ⌈40/maxRPRatMin⌉ | **2** | **2** | **1** | **1** |
| racersPerRow = ⌈40/rowCount⌉ | **20** | **20** | **40** | **40** |
| bodyNarrow = 570/rPR | **28.5px** | **28.5px** | **14.25px** | **14.25px** |

### Drawn body sizes

All current sprite types have **square frames** (verified: dragon 128×128, plane 128×128, rocket 151×151, giraffe 129×129) and **silhouetteScale=1.0** (default at [SpriteRacerType.js:77](../../client/src/modules/racer-types/SpriteRacerType.js#L77)). Therefore `drawnBodyLengthPx = bodyNarrow × bodyFillLong / bodyFillNarrow`.

| Type | bodyNarrow (drawn width) | drawnBodyLengthPx | aspect ratio |
|---|---|---|---|
| Dragon | **28.5px** | 28.5 × 0.898/0.836 = **30.6px** | 1.07 (nearly round) |
| Plane | **28.5px** | 28.5 × 0.930/0.836 = **31.7px** | 1.11 (nearly round) |
| Rocket | **14.25px** | 14.25 × 0.801/0.278 = **41.1px** | 2.88 (long and narrow) |
| Giraffe | **14.25px** | 14.25 × 0.767/0.271 = **40.3px** | 2.83 (long and narrow) |

---

## 3. Does bodyNarrow represent the TRUE visible body?

**Yes.** The draw formula ([SpriteRacerType.js:229](../../client/src/modules/racer-types/SpriteRacerType.js#L229)):
```javascript
const scale = (cfg.displaySize * displaySizeScale / cfg.frameHeight / guardedFillNarrow) * cfg.silhouetteScale;
```

where `displaySizeScale = bodyNarrow / displaySize` (from index.jsx:452). Substituting:
```
scale = bodyNarrow / (frameHeight × bodyFillNarrow) × 1.0
visible narrow body = bodyFillNarrow × (frameHeight × scale) = bodyNarrow  ✓
```

The sprite is scaled **so that its narrow body equals bodyNarrow exactly.** bodyNarrow IS the visible lateral body width in world px, with no additional normalization applied.

---

## 4. Answering the user's concern directly

**"A plane has WIDE wings — its visible body is wide. A rocket is NARROW and long. They cannot end up with the same visible width."**

They do NOT end up with the same visible width:
- Plane: **28.5px** wide
- Rocket: **14.25px** wide

**Plane is 2× wider than rocket.** The per-type difference is fully preserved.

**Why do plane and dragon share the same bodyNarrow (28.5px)?**  
Both have `bodyFillNarrow = 0.836`. Their staircase calculation produces the same `racersPerRow = 20`, hence the same slot width. This is correct — both ARE wide-body types with similar lateral extents.

**Why do rocket and giraffe share the same bodyNarrow (14.25px)?**  
Both have `bodyFillNarrow ≈ 0.274`. The 0.007 difference (0.278 vs 0.271) in minBodyNarrow (8.49 vs 8.46) both round to `maxRPRatMin = 67`, giving the same row structure. The effective body-width difference between rocket and giraffe at this N is 0.3px — a distinction the staircase correctly rounds. Both are narrow-body types.

### The "same row structure collapses" effect

Types that differ in `bodyFillNarrow` but produce the same `rowCount` and `racersPerRow` through the staircase will receive the same `bodyNarrow`. This is a **rounding artifact of the staircase, not a normalization bug**. The staircase granularity is proportional to `(2×W_REF / (N×minScale)) = (570/(40×0.65)) = 21.9px` at this parameterization — the step is large enough that small fill-fraction differences don't change the slot count. Overlap physics using bodyNarrow will be accurate to within one staircase step. For the types currently in the game, this rounding is immaterial.

---

## 5. Current formula vs bodyNarrow for rocket (N=40, Space Sprint)

The current `honestBodyWidthPx = physicalSpriteSize × bodyFillX` uses a DIFFERENT scale path:

**physicalSpriteSize** comes from `computeRacerLayout` (frame-based, real track width):
- displaySize=47, minSpriteSize=47×0.65=30.55, maxRPRatMin=⌊570/30.55⌋=18
- rowCount=⌈40/18⌉=3, racersPerRow=⌈40/3⌉=14
- spriteSize = 570/14 = **40.71px** (full frame size in world px)

`honestBodyWidthPx = 40.71 × 0.278 = **11.32px**` (current)  
`bodyNarrow = **14.25px**` (proposed)

**The current value (11.32px) is wrong.** Here is why:

The sprite is rendered using `displaySizeScale = bodyNarrow/displaySize = 0.303` (from `computeBodyNarrowRef`). The actual drawn frame height:
```
dh = frameHeight × scale = 151 × (14.25 / (151 × 0.278)) = 51.3px
visible narrow body = 0.278 × 51.3 = 14.25px  ✓
```

But physicalSpriteSize=40.71px implies a frame size of 40.71px. That would require `displaySizeScale_physical = 40.71/47 = 0.866`. The render does NOT use this scale — it uses `displaySizeScale = 0.303`. So `physicalSpriteSize × bodyFillX` measures the body at a frame size that the renderer never actually uses. It is computing the body from the **layout path** (used for rowGapPx) while the **render path** uses a different scale.

**bodyNarrow is unambiguously the correct source for overlap physics because it is derived from the same scale path that the renderer uses.**

---

## 6. Does using bodyNarrow explain the "flat overlap" mystery?

Partial contributor, not the root cause. At N=40, Space Sprint:

| Metric | Current | After Break 1+2+3 fix | 
|---|---|---|
| trackWidthPx | 449px | 300px |
| honestBodyWidthPx (rocket) | 11.32px | 14.25px |
| sameLaneHH (rocket) | 11.32/449 = 0.0252 | 14.25/150 = 0.0950 |
| sameLaneHH trigger gap (rocket) | 0.0252×449/2 = 5.7px | 0.0950×150 = 14.25px |

The CURRENT trigger fires when the lateral gap < 5.7px (much less than the 14.25px body width). Racers are already heavily overlapping visually before avoidance even engages. The threshold was over 2× too small on TWO separate errors (wrong width source + wrong denominator). After fixes, the threshold correctly equals the body width. The large under-triggering from the compound error is a significant contributor to the overlap persistence on Space Sprint.

---

## 7. Verdict

**Report 31's plan is correct.** Use `bodyNarrow` (= `referenceSpriteSize`, to be renamed `drawnBodyWidthRefPx`) as each racer's `drawnBodyWidthPx` for overlap physics.

- bodyNarrow IS per-type: plane=28.5px, rocket=14.25px (plane 2× wider) ✓
- bodyNarrow IS the true visible body width from the render path ✓  
- The docstring "every racer type gets the same visible size" is misleading but the formula is sound ✓
- The current `physicalSpriteSize × bodyFillX` is wrong because it uses the layout-path frame size, not the render-path body size ✓

**No change to report 31 is needed.** Proceed to build as planned.

---

## 8. One note for the build: verify non-square frames

The body-length formula `bodyNarrow × bodyFillLong / bodyFillNarrow` is exact **only for square frames** (frameWidth = frameHeight). Verified square: dragon (128×128), plane (128×128), rocket (151×151), giraffe (129×129). Before finalizing the `drawnBodyLengthPx` formula in the sim, confirm that all remaining racer types also have square frames. If any are non-square, use `bodyNarrow × bodyFillLong × (frameWidth/frameHeight) / bodyFillNarrow`.
