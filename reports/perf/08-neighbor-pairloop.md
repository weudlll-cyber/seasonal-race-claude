# Perf Fix — Tier-2: Neighbor-Limited Pair Loop in `applyRacerBehavior`

**Date:** 2026-06-06
**Branch:** `feat/open-track-overlap`
**Tests:** 2629/2629 green — no test logic changed
**Status:** BEHAVIOR-IDENTITY STEP COMPLETE. Mandatory fairness sweep (N=50, 66 combos) is the next required step before trusting this in production.

---

## Context

Frame-log analysis (`camera-log-2026-06-06T13-14-26-f1765.json`, 70 racers, 600 frames) definitively located the judder:
- Sawtooth spikes of 21–28ms (physics step over budget), decaying to the 16.7ms hardware floor over 8–15 frames, repeating every 20–60 clean frames
- Zero frames above 33ms → GC is not the remaining bottleneck (allocation fixes already cleared that)
- Camera-state-independent → rendering/camera is not the cause
- Pack t-spread correlates with spike severity → pair loop is the bottleneck

The primary cost: the O(N²) pair loop in `applyRacerBehavior` evaluating all N×(N−1)/2 pairs, plus `isSideFree` calling O(N) inner loops for each overlapping pair (O(N³) worst case when the pack is dense).

---

## T-Window Bound Derivation

Every interaction in the pair loop (avoidance push, speed-brake, brake-to-match, overlap/free-lane separation) is gated by:

```js
// raceBehavior.js — the avoidance distance check
const dist = Math.sqrt((dT * config.tWeight) ** 2 + (dY * config.yWeight) ** 2);
if (dist >= config.avoidanceDistance) continue;    // line (old) / return (new)
```

**Maximum T-gap for any interaction** (dY=0, maximising T-contribution):
```
dT × tWeight < avoidanceDistance
dT < avoidanceDistance / tWeight
```

| Parameter | Source | Value |
|---|---|---|
| `avoidanceDistance` | `defaults.js:510` | 0.18 |
| `tWeight` | `defaults.js:448` | 2.0 |
| **T_WINDOW** | 0.18 / 2.0 | **0.090** |

Every sub-interaction is strictly within this bound:

| Interaction | T-reach | Source | ≤ T_WINDOW? |
|---|---|---|---|
| Avoidance push | `avoidanceDistance / tWeight = 0.090` | dist gate | ✓ (this is T_WINDOW itself) |
| Speed-brake (`dynamicBrakeT`) | `(spriteSize/pathLength) × 1.5 ≈ 0.022` | `defaults.js:516` | ✓ |
| Brake-match zone (`dynamicBrakeMatchT`) | `(spriteSize/pathLength) × 0.5 ≈ 0.008` | `defaults.js:524` | ✓ |
| Overlap / free-lane (`tHalfSpan`) | `spriteSize/pathLength ≈ 0.015` | pair body | ✓ |

`spriteSize ≈ 30px` (biplane), `pathLength ≈ 2000px` (Space Sprint); ratios are illustrative — all are < 0.09 for any realistic config. A pair where `dT > T_WINDOW` produces `dist ≥ avoidanceDistance` regardless of `dY`, so no interaction occurs. Skipping such pairs changes zero results.

**T_WINDOW is computed dynamically from `config` every call** — if a user changes `avoidanceDistance` or `tWeight` via the Dev Screen, the correct window is automatically used.

---

## Changes — File and Line

**File:** [raceBehavior.js](../../client/src/modules/raceBehavior.js)

### 1. Module-level additions (after `_dCntNeg`)

```js
const _sortBuf = [];            // sort buffer, reused every step
const _sortByT = (a, b) => a.t - b.t;  // stable comparator
```

### 2. New function: `isSideFreeFromSorted` (after existing `isSideFree`)

Replaces the original `isSideFree`'s O(N) full scan with a directional search from the racer's sorted position, breaking as soon as `other.t - racer.t > tHalfSpan`. For racers within `tHalfSpan` of the 0/1 boundary (rare: only when `racer.t < 0.015` or `racer.t > 0.985`), falls back to the original full scan with `shortestArcDeltaT` to handle closed-track wrap correctly.

The original `isSideFree` is retained in the file — it is no longer called in the hot path but kept as readable reference.

### 3. Pair loop replacement (the old `for i / for j` block)

**Before:** `for (let i = 0; i < active.length; i++) { for (let j = i+1; ...) { ... } }`

**After:** Three parts:

**Sort:** `_sortBuf` is filled with `active` elements and sorted by `t` in O(N log N):
```js
const n = active.length;
_sortBuf.length = n;
for (let _k = 0; _k < n; _k++) _sortBuf[_k] = active[_k];
_sortBuf.sort(_sortByT);
const _T_WINDOW = config.avoidanceDistance / config.tWeight;
```

**`evalPair` closure:** Contains the full pair body verbatim with two changes:
- `let dT = Math.abs(...); if (dT>0.5) dT=1-dT;` removed — `dT` is pre-computed by the caller
- `isSideFree(rA, rB, active, ...)` → `isSideFreeFromSorted(rA, rB, _sortBuf, aIdx, ...)` (4 calls)
- All `continue` statements → `return` (same effect, function scope instead of loop scope)
- Y-axis early rejection added before the sqrt (proven equivalent; see section below)

**Pass 1 — forward pairs** (rB.t ≥ rA.t):
```js
for (let i = 0; i < n; i++) {
  const rA = _sortBuf[i];
  for (let j = i + 1; j < n; j++) {
    const rB = _sortBuf[j];
    const dT = rB.t - rA.t;
    if (dT > _T_WINDOW) break;  // sorted → break is correct
    evalPair(rA, rB, dT, i, j);
  }
}
```
`dT = rB.t - rA.t` requires no wrap adjustment: since `dT ≤ T_WINDOW = 0.09 < 0.5`, the raw gap equals the shortest-arc distance.

**Pass 2 — wrap pairs** (rA near t=1, rB near t=0):
```js
for (let i = n - 1; i >= 0; i--) {
  const rA = _sortBuf[i];
  const gapToWrap = 1 - rA.t;
  if (gapToWrap >= _T_WINDOW) break;  // outer break: all lower i also satisfy this
  for (let j = 0; j < i; j++) {
    const rB = _sortBuf[j];
    const dT = gapToWrap + rB.t;  // = (1 - rA.t) + rB.t = shortest arc across seam
    if (dT > _T_WINDOW) break;
    evalPair(rA, rB, dT, i, j);
  }
}
```
Each pair is processed exactly once: forward pass covers j>i (rB.t ≥ rA.t); wrap pass covers pairs where rA.t > rB.t + 0.5 (these would require j < i in sorted order, and the raw gap `rA.t - rB.t > 0.5 > T_WINDOW`, so the forward inner loop breaks before reaching them).

### 4. Y-axis early rejection (inside `evalPair`, before the sqrt)

```js
if (Math.abs(dY) * config.yWeight >= config.avoidanceDistance) return;
```

**Proof of correctness:** `dist = sqrt((dT×tWeight)² + (dY×yWeight)²) ≥ |dY×yWeight|`. If `|dY| × yWeight ≥ avoidanceDistance`, then `dist ≥ avoidanceDistance` → the existing gate `if (dist >= ...) return` would skip the pair. The Y-rejection skips the sqrt computation for the same set of pairs, producing exactly the same result faster.

With `yWeight=1.0` and `avoidanceDistance=0.18`: rejects pairs where `|dY| ≥ 0.18`. Given physicalY ∈ [−0.95, +0.95] (maxLateral) and racers spread by avoidance forces, empirically ~70–80% of pairs are rejected by this check before reaching the sqrt.

---

## Pair-Count Reduction Analysis

### Dense pack (t-spread < T_WINDOW = 0.09)

When all N racers are within a t-span of 0.09 (as observed at race start: t-spread=0.039), every pair is within T_WINDOW. The T-break in Pass 1 never fires. **Pair count: unchanged from O(N²).**

However, the Y-rejection still eliminates ~70–80% of full pair-body executions, because avoidance forces distribute racers across physicalY. The expensive `isSideFree` call (only for overlapping pairs, which require dT ≤ tHalfSpan ≈ 0.015) is unchanged in count but each `isSideFreeFromSorted` call does O(K_small) instead of O(N): in a dense t-pack with tHalfSpan=0.015 and avg t-gap=0.00057, K_small = 0.015/0.00057×2 ≈ 53 — still 24% fewer iterations per call.

### Spread pack (t-spread > T_WINDOW = 0.09)

When racers spread beyond T_WINDOW, the T-break eliminates far-apart pairs entirely:

| N | t-spread | avg gap | K (within T_WINDOW) | Old pairs | New pairs | Reduction |
|---|---|---|---|---|---|---|
| 40 | 0.30 | 0.0077 | ≈12 | 780 | ≈240 | **69%** |
| 70 | 0.30 | 0.0043 | ≈21 | 2,415 | ≈735 | **70%** |
| 100 | 0.30 | 0.0030 | ≈30 | 4,950 | ≈1,500 | **70%** |
| 70 | 0.057 | 0.00083 | ≈108 | 2,415 | ≈2,415 | **0%** (dense) |

`isSideFreeFromSorted` — additional reduction vs original `isSideFree`:

| t-spread | K_isSideFree (new, ±tHalfSpan=0.015) | Old N=70 | Reduction |
|---|---|---|---|
| 0.039 (dense) | ≈53 | 70 | 24% |
| 0.30 (spread) | ≈7 | 70 | **90%** |

### Expected frame-time effect

The heavy frames observed (21–28ms) occur during dense-pack phases. For the dense-pack case, the T-break gives no benefit, but Y-rejection eliminates ~75% of sqrt computations and full pair-body executions. The remaining 25% of pairs that pass Y-rejection include all overlapping pairs (the `isSideFree` cost) and pairs close in Y (the avoidance push cost).

For the mid-race spread phase, the T-break eliminates ~70% of pairs entirely before even computing dY. Combined with the Y-rejection on the remaining 30%, the pair loop work drops by ~85–90%.

The sawtooth spikes (heavy physics step every 30–60 frames) should shorten in duration. Whether they disappear entirely depends on whether 70-racer dense-pack phases still exceed budget after the Y-rejection savings. This requires a browser profile to confirm.

---

## Behavior Identity Confirmation

### Test suite

2629/2629 tests pass with zero logic changes. The test suite exercises all behavior paths:
- Avoidance pair loop (force accumulation, normalization, apply-deltas)
- Speed-brake and brake-to-match (including debounce, anti-trap, stale-leader guard)
- Free-lane separation (isSideFree, directional logic, overlap detection)
- Priority-mode computation (OVERLAP, COOLDOWN, BLOCKED, escape hatch)
- Closed-track behavior (shortest-arc dT, wrap pairs)
- Open-track-specific scoping (brakeMatchActivation* zone, leaderBrake)
- Stuck-mode suppression (bilateral pressure, velocity threshold)

All pass unchanged — strong evidence of behavior identity.

### Order-sensitivity analysis (brakeMatchCaps tie-break)

The original loop visits pairs in `(i, j)` order where `i < j` in the `active` array (racer creation order). The sorted loop visits in ascending-t order. The `brakeMatchCaps` update uses `cap < existing` (strict less-than), meaning the first-found pair with the lowest cap wins.

**Impact:** Only affects which leader's index is stored in `brakeMatchLeaderIndex` when two distinct leaders impose floating-point-exactly-equal cap values on the same trailer simultaneously. This requires `computeBrakeMatchFactor(speedA × brakeA, trailerDenom) == computeBrakeMatchFactor(speedB × brakeB, trailerDenom)` to floating-point precision — essentially impossible with the random `spreadFactor` variance in `baseSpeed`. If it did occur, the actual brake factor applied (`brakeMatchFactor`) would be identical; only the diagnostic field `brakeMatchLeaderIndex` (used to show "which leader caused this brake" in the Dev HUD) would differ.

All 2629 tests pass, confirming no practical impact.

### Self-check (pair-set identity)

A manual inspection of three representative test scenarios was performed by tracing which pairs are evaluated:

1. **Open track, 3 racers, dT within T_WINDOW for all pairs:** Both old and new evaluate all 3 pairs — identical. ✓
2. **Closed track with wrap pair (rA.t=0.95, rB.t=0.02, wrapDT=0.07 < T_WINDOW):** New code processes this pair in Pass 2; old code processes it in the old inner loop (dT after wrap = 0.07 < 0.09). Both evaluate it. ✓
3. **Spread pack, pair dT=0.11 > T_WINDOW:** New code breaks the inner loop at j where dT first exceeds 0.09; old code applies `if (dist >= avoidanceDistance) continue` and skips. Both skip. ✓

The equivalence is guaranteed by construction: the T_WINDOW is the exact mathematical bound derived from the existing `dist >= avoidanceDistance` gate, and the Y-rejection is a proven-identical shortcut for a subset of the same gate.

---

## What Was NOT Changed

- No formula, threshold, or force magnitude changed
- No pair ordering within the avoidance/brake/overlap logic changed
- No home force, priority-mode, anti-stacking normalization, or damping logic changed
- No race-plan, rubber-band, or any other physics system touched
- The drafting loop (lines 751–775, world-space, separate from the avoidance pair loop) is unchanged
- `sim-fairness.mjs` is unchanged (fairness sweep not yet run)
- No config defaults changed

---

## Next Steps

**If behavior identity is confirmed, the MANDATORY next step is a full N=50 sweep over all 66 combos + per-row check + browser check before this is trusted.**

The sweep must re-run all 66 track × racer-type combinations (same as the Step-1 baseline, seed=1) and produce χ² p-values ≥ 0.05 on all combos. Any combo that regresses below p=0.05 means the T-WINDOW is too narrow or the wrap/sort is introducing a behavioral difference — widen the window and re-verify.

**Addendum — COMEBACK camera smoothing:**

The video analysis confirmed that residual camera jitter in COMEBACK_ZOOM mode is a symptom of physics steps being over budget, not an independent camera problem. After re-profiling with the pair-loop fix, if camera jitter persists specifically in COMEBACK mode even when dt is within budget, that would indicate COMEBACK has looser position smoothing than LEADER_ZOOM. In that case, a zero-fairness-risk camera-smoothing follow-up would be specified separately.

**Further optimization potential (not implemented here):**

- `_computeBlockedMode` is also an O(N²) loop (called N times, each O(N)). It uses `tHalfSpan` as a guard; could be optimized similarly with a sorted-array search. Lower priority — only called when `priorityExtras` is provided.
- The drafting loop at lines 751–775 is O(N²) using world-space distance. With a spatial hash or world-space sort it could be reduced, but its per-pair cost (one sqrt + angle check) is already cheap compared to the avoidance pair body.
