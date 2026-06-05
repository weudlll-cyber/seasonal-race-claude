# Open-Track Avoidance Regression Investigation

**Branch:** `feat/closed-track-overview-normalization`  
**Date:** 2026-06-05  
**Symptom:** Space Sprint × plane × 9 racers — 4 racers crossed/stacked mid-race, no visible avoidance.

---

## 1. Decisive sim comparison — master vs branch

**Method:** `node scripts/sim-fairness.mjs --track=space-sprint --racer=plane --racers=N --races=30`  
Master run from a `git worktree add` checkout of `cf83690` (current master). Branch run from HEAD.  
Seed: non-deterministic (exploration mode); 30 races × 2 durations per run.

### N = 9

| Metric | master (pre-rebuild) | branch (post-rebuild) |
|---|---|---|
| liteOverlapRate 30s | **0.0%** | **0.0%** |
| liteOverlapRate 120s | **0.0%** | **0.0%** |
| overlapResolution 30s | 1.5 fr | 0.0 fr |
| overlapResolution 120s | 1.4 fr | 0.0 fr |
| brakeRate 30s | 56.2% | 56.5% |
| brakeRate 120s | 46.6% | 47.9% |
| pulkTime 30s | 96.5% | 96.1% |
| pulkTime 120s | 90.3% | 88.7% |
| physicalSpriteSize | 94.8 px | 94.8 px |
| rows | 1 | 1 |

### N = 20

| Metric | master (pre-rebuild) | branch (post-rebuild) |
|---|---|---|
| liteOverlapRate 30s | **0.0%** | **0.0%** |
| liteOverlapRate 120s | **0.0%** | **0.0%** |
| overlapResolution 30s | 30.2 fr | 25.8 fr |
| overlapResolution 120s | 32.5 fr | 24.7 fr |
| brakeRate 30s | 76.8% | 76.9% |
| brakeRate 120s | 58.7% | 59.1% |
| pulkTime 30s | 99.3% | 99.5% |
| pulkTime 120s | 99.3% | 99.4% |
| physicalSpriteSize | 42.65 px | 42.65 px |
| rows | 1 | 1 |

All differences are within normal random variation (30-race sample).

---

## 2. Verdict: **PRE-EXISTING — not a regression**

The rebuild produced **zero physics changes**. Confirmed by diff:

| File | Changed? |
|---|---|
| `client/src/modules/raceBehavior.js` | **No** |
| `client/src/modules/headlessRaceSimulator.js` | **No** |
| `scripts/sim-fairness.mjs` | **No** |
| `client/src/modules/rowLayout.js` — `computeRacerLayout` | **No** (only `computeBodyNarrowRef` added) |
| `client/src/modules/storage/defaults.js` — behavior params | **No** (only `overviewTargetScreenPx` camera value changed) |

The only changes in the branch are **render/camera**: `displaySizeScale` (used for drawing) now comes from `computeBodyNarrowRef(W_REF=285)` instead of `computeRacerLayout(realWidth)`. The physics path uses `displaySizeScale_physical = computeRacerLayout(realWidth, ...)` exclusively, unchanged.

`spriteWorldSizePx` passed to `raceBehavior.js` = `physicalSpriteSize` on both master and branch:

```
// master:  spriteSize     = computeRacerLayout(effectiveWidth, N, displaySize, ...).spriteSize
// branch:  physicalSpriteSize = computeRacerLayout(effectiveWidth, N, displaySize, ...).spriteSize
//          (identical computation, renamed variable)
```

---

## 3. Root cause of the visual stacking (pre-existing structural issue)

### 3a. Effective avoidance range — master vs branch (identical)

```
trackWidth           = 449 px          (Space Sprint geometricTrackWidth)
avoidanceDistance    = 0.18            (DEFAULT_RACE_BEHAVIOR_CONFIG, unchanged)
yWeight              = 1.0             (default tWeight/yWeight)

Effective lateral avoidance range  = avoidanceDistance × trackWidth / yWeight
                                   = 0.18 × 449  =  80.8 px   (same on both)
```

### 3b. Dead zone: N=9 creates physicalSpriteSize > avoidance reach

`computeRacerLayout(426.55px, N=9, 42, {minScale:0.65, maxScale:2.5})` returns:
- rowCount = 1, racersPerRow = 9
- spriteSize = min(2 × 426.55 / 9, 42 × 2.5) = **94.8 px**

Physics overlap zone:
```
lateralHalfSpan  = physicalSpriteSize / trackWidth  =  94.8 / 449  =  0.211
```

Free-lane separation fires when `|dY| ≤ lateralHalfSpan = 0.211`.  
BUT in `raceBehavior.js` **all** per-pair logic — including free-lane separation — is skipped via:

```javascript
// raceBehavior.js  (applies to both master and branch, unchanged)
const dist = Math.sqrt((dT * config.tWeight) ** 2 + (dY * config.yWeight) ** 2);
if (dist >= config.avoidanceDistance) continue;   // ← guards free-lane too
// free-lane separation is computed below this line — unreachable when dist ≥ 0.18
```

Result: for racers at dT ≈ 0 and lateral gap between 80.8 px and 94.8 px:
- Physics considers them **overlapping** (`|dY| ≤ 0.211`)
- Avoidance **does not fire** (`dist = |dY| ≥ 0.18`)
- **Dead zone: 14 px wide** where overlap is real but nothing pushes them apart

| | N=9 | N=20 |
|---|---|---|
| physicalSpriteSize | 94.8 px | 42.7 px |
| lateralHalfSpan | 0.211 | 0.095 |
| avoidanceDistance | 0.180 | 0.180 |
| Dead zone exists? | **YES** (lateralHalfSpan > avoidanceDistance) | No |

For N=20 there is no dead zone: avoidance fires at 80.8 px, overlap at 42.7 px — force is very active before any overlap.

### 3c. Why the user sees stacking but the sim reports 0%

The sim's `liteOverlapRate` threshold uses **raw `displaySize`** (plane = 42 px), not `physicalSpriteSize` (94.8 px):

```javascript
// sim-fairness.mjs
const bodyDiameterX    = displaySize * bodyFillX;   // = 42 × 0.836 = 35.1 px  (raw)
const overlapThreshold_y = 0.10 * bodyDiameterX / geometricTrackWidth;  // = 0.0078 → 3.5 px
```

The sim counts a pair as "overlapping" only when centers are within **3.5 px laterally** — 27× tighter than the dead zone boundary (94.8 px). Racers in the dead zone (≈ 85–94 px apart, visually overlapping) are never counted. The 0% reading is correct for its own metric but does not detect physics-scale overlap.

### 3d. Visual rendering: branch is actually BETTER than master for overlap

The render-side body size changed:

| | master | branch |
|---|---|---|
| Render basis | physicalSpriteSize (94.8 px frame) | bodyNarrow from W_REF=285 (63.3 px) |
| Rendered body narrow (N=9, plane) | 0.836 × 94.8 = **79.2 px** | **63.3 px** |
| Physics separation floor (lateralHalfSpan in px) | 94.8 px | 94.8 px (unchanged) |
| Visible gap at separation floor | 94.8 − 79.2 = 15.6 px | 94.8 − 63.3 = **31.5 px** |

The branch renders **smaller sprites** with a **larger visible gap** at the physics separation floor. If the user observes stacking on the branch, it pre-dates the rebuild; the branch cannot make it worse at this N and track.

---

## 4. Why stacking still appears at runtime (96% pulk)

Both master and branch produce `pulkTime = 96%` for N=9 on a 30s Space Sprint race. With only 9 racers on a 19 772 px path, the rubber-band catch-up keeps them in a tight cluster for virtually the entire race. When four racers happen to converge on similar physicalY values while traveling at near-equal speeds, they fall into the dead zone and travel together until a speed perturbation separates them. This is repeatable behavior that the liteOverlapRate metric does not capture.

---

## 5. Missing test — avoidance dead-zone guard

The existing tests verify:
- `finishT` + `rowCount` (determinism fingerprint) — does **not** capture avoidance behavior
- `liteOverlapRate` (sim) — uses raw `displaySize`, misses physics-scale overlap
- "visible ≤ physical slot" guard (report 10) — checks render vs physics sizing, not avoidance range

**Recommended additional check:**

For each (track, racerType, N) combination, assert that `avoidanceDistance` covers the physics overlap zone:

```javascript
// Proposed guard (pseudo-code — add to rowLayout.test.js or sim post-check)
const lateralHalfSpan = physicalSpriteSize / trackWidth;
assert(
  lateralHalfSpan <= avoidanceDistance,
  `Dead zone: lateralHalfSpan=${lateralHalfSpan.toFixed(3)} > avoidanceDistance=${avoidanceDistance} ` +
  `for ${trackId} × ${racerType} × N=${N}. ` +
  `Free-lane separation unreachable in [${(avoidanceDistance * trackWidth).toFixed(0)}, ${physicalSpriteSize.toFixed(0)}] px range.`
);
```

For Space Sprint × plane × N=9 this fires (0.211 > 0.18) and would have surfaced the gap before the user reported it.

Alternatively: move the free-lane separation block **before** the `if (dist >= config.avoidanceDistance) continue` guard in `raceBehavior.js` so overlap resolution fires regardless of the main avoidance trigger. That is the one-line structural fix — but it is scope for a future ticket, not this branch.

---

## Summary

| Question | Answer |
|---|---|
| Is branch liteOverlapRate > master? | No — both 0.0% at N=9 and N=20 |
| Is this a regression from the rebuild? | **No** — physics code unchanged |
| Effective avoidance range (lateral, N=9)? | **80.8 px on both** |
| Is there a real structural gap? | **Yes** — dead zone 80.8–94.8 px for N=9 (pre-existing) |
| Does branch make it worse visually? | **No** — branch renders smaller bodies (63.3 vs 79.2 px), more gap |
| Does liteOverlapRate catch this? | **No** — metric threshold (3.5 px) is 27× too tight |
| Code changes needed on this branch? | **None** — analysis only as scoped |
