# Perf Fix — Y-Rejection in the Avoidance Pair Loop

**Date:** 2026-06-06
**Branch:** `feat/open-track-overlap`
**Tests:** 2629/2629 green — no test logic changed
**Status:** Change applied; frame-log measurement pending before proceeding.

---

## The Change

**File:** [raceBehavior.js:358](../../client/src/modules/raceBehavior.js#L358)

One line added immediately after `dY` is computed and before the `sqrt`:

```js
// dist ≥ |dY·yWeight|, so if this holds, the existing dist gate below would also fire.
if (Math.abs(dY) * config.yWeight >= config.avoidanceDistance) { _dbg_pairYSkip++; continue; }
```

The existing gate it shortcuts (unchanged, still present at line 360):

```js
const dist = Math.sqrt((dT * config.tWeight) ** 2 + (dY * config.yWeight) ** 2);
if (dist >= config.avoidanceDistance) continue;
```

Three diagnostic counter variables were also added at module scope (lines 48–51) and a
periodic `console.log` at the end of `applyRacerBehavior` (lines 791–799) to measure
skip fraction. All three are marked for removal after measurement is confirmed.

---

## Equivalence Argument

The existing gate rejects a pair when:

```
dist = sqrt((dT · tWeight)² + (dY · yWeight)²)  ≥  avoidanceDistance
```

The Y-rejection fires when:

```
|dY| · yWeight  ≥  avoidanceDistance
```

**Proof of equivalence (subset):**

For any real numbers A and B: `sqrt(A² + B²) ≥ sqrt(B²) = |B|`.

Setting `B = dY · yWeight`:

```
dist = sqrt((dT·tWeight)² + (dY·yWeight)²)  ≥  |dY·yWeight|  =  |dY| · yWeight
```

Therefore: if `|dY| · yWeight ≥ avoidanceDistance`, then `dist ≥ avoidanceDistance`.

**The Y-rejection fires only when the existing gate would also fire.** No pair that has
any avoidance interaction (dist < avoidanceDistance) is skipped by the Y-rejection.
The Y-rejection is a strict mathematical subset of the existing gate — it allows
skipping the `sqrt` computation early for a provably non-interacting subset of pairs.

Edge cases:
- `yWeight = 0`: `|dY| · 0 = 0 < avoidanceDistance` always → Y-rejection never fires,
  existing gate handles everything. No regression.
- `avoidanceDistance = 0`: both gates always fire; Y-rejection fires first. No change
  in outcome.

---

## What Was NOT Changed

- No formula, force magnitude, threshold value, or interaction logic changed
- The existing `if (dist >= config.avoidanceDistance) continue` gate at line 360 is
  still present and still fires for the pairs the Y-rejection does NOT catch (where
  `|dY| · yWeight < avoidanceDistance` but `dist ≥ avoidanceDistance` due to the dT
  component)
- Iteration order (i < j, all pairs in active-array order) unchanged
- `brakeMatchCaps` first-found-wins tie-break: the same pairs pass through the full
  pair body in the same order; only pairs that already produced `continue` at the dist
  gate now produce `continue` earlier
- Drafting loop, `isSideFree`, BLOCKED logic, priority-mode — all untouched
- `draftingBoostActive` one-frame lag preserved (H still runs after C, unchanged)
- `sim-fairness.mjs` unchanged (N=50 sweep not yet run — required before production
  trust if the frame log shows improvement)

---

## Skip-Fraction Measurement

A temporary diagnostic logs to the browser console every 300 physics steps (~5 s at
60 fps with `FIXED_DT = 16 ms`):

```
[Y-reject] pairs=<total> skipped=<y-rejected> (<pct>%) over 300 steps
```

**To measure at 70 racers:** open Space Sprint with 70 racers, open DevTools console,
wait ~10 s for two log lines, read the skip percentage. The competing estimates to
resolve: CC ≈ 75%, Copilot ≈ 7–15%.

The skip fraction depends on:
- `avoidanceDistance / yWeight` threshold: with defaults (0.18 / 1.0 = 0.18), rejects
  pairs where `|dY| ≥ 0.18`
- `maxLateral` config: caps physicalY at 0.9, so `physicalY ∈ [−0.9, +0.9]` → maximum
  `|dY| = 1.8`, well above the 0.18 threshold
- Pack spread: at race start (dense pack, all physicalY ≈ 0), `|dY|` is small → low
  skip rate. Mid-race (laterally spread by avoidance forces) → higher skip rate

---

## Next Steps (in order)

1. **User captures frame log** — 70 racers, Space Sprint, same conditions as the
   baseline `camera-log-2026-06-06T13-14-26-f1765.json`. Compare median / mean / P90 /
   P99 / max frame times and sawtooth spike pattern.
2. **Read console skip fraction** — resolve the CC vs Copilot disagreement empirically.
3. **If frame log shows real improvement** → proceed with optional F1–F4 loop fusion,
   then mandatory N=50 sweep across all 66 combos before production trust.
4. **If no improvement** → revert to `backup/pre-pairloop-opt` (fb98858) and
   investigate further.
5. **Remove diagnostic counters** after skip fraction is confirmed (lines 48–51 and
   791–799 in raceBehavior.js).
