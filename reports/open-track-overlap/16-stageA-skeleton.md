# Step 2 Stage A — Clearance Accumulator Skeleton

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-06
**Commit:** `9834bd3`
**Baseline tag:** `backup/pre-step2` (`d762bc5`)
**Status:** Populated, not consumed — pure perf-feasibility measurement.

---

## What Was Added

Three changes to [raceBehavior.js](../../client/src/modules/raceBehavior.js), zero to anything else:

### 1. Module-level Set declarations (lines 50–57)

```js
// Step-2 clearance accumulators (Stage A — populated, not yet consumed).
const _approachLeft  = new Set();
const _approachRight = new Set();
const _forwardLeft   = new Set();
const _forwardRight  = new Set();
```

Wave-2 pattern — module-level, cleared per step, no per-step allocation.

### 2. Clear at step start (lines 297–300)

```js
_approachLeft.clear();
_approachRight.clear();
_forwardLeft.clear();
_forwardRight.clear();
```

Added alongside the existing `_brakeMatchCaps.clear()` block.

### 3. Accumulator block in pair loop — BEFORE Y-rejection (lines 363–392)

Placed immediately after `dT` and `dY` are computed, before the Y-rejection
`continue`. This is the key placement — see the addendum in report 15 for why
running before Y-rejection is required to avoid a correctness hole in the
clearance corridor.

```js
if (config.isOpen !== false) {
  const twA = getTrackWidthPx(rA);
  const twB = getTrackWidthPx(rB);
  const pairTW = Math.max(twA, twB);
  if (pairTW > 0) {
    const rAHH = (rA.honestBodyWidthPx ?? rA.spriteWorldSizePx ?? 0) / pairTW;
    const rBHH = (rB.honestBodyWidthPx ?? rB.spriteWorldSizePx ?? 0) / pairTW;
    const pairHH = Math.max(rAHH, rBHH);
    if (pairHH > 0 && Math.abs(dY) < 2 * pairHH) {
      const aIsAhead = rA.t >= rB.t;
      const front = aIsAhead ? rA : rB;
      const back  = aIsAhead ? rB : rA;
      const lateralDelta = front.physicalY - back.physicalY;
      if      (lateralDelta > 0) { _approachRight.add(back.index); _approachLeft.add(front.index);  }
      else if (lateralDelta < 0) { _approachLeft.add(back.index);  _approachRight.add(front.index); }
      if      (lateralDelta >  pairHH) _forwardRight.add(back.index);
      else if (lateralDelta < -pairHH) _forwardLeft.add(back.index);
    }
  }
}
// Y-rejection — unchanged, immediately follows:
if (Math.abs(dY) * config.yWeight >= config.avoidanceDistance) continue;
```

**Nothing reads these Sets.** `grep -r "_approachLeft\|_approachRight\|_forwardLeft\|_forwardRight" client/src`
returns only `declare`, `clear`, `add` — zero `.has()` or `.forEach()` calls.

---

## Zero Behavior Change Confirmation

- **Tests:** 2629/2629 green. No test logic changed — the new Sets are populated but
  nothing downstream reads them, so `applyRacerBehavior`'s output is bit-identical.
- **Physics:** `r.physicalY`, `r.avoidanceActive`, `r.brakeMatchFactor`, `r.physicalYVelocity`
  — all written only by the existing avoidance/apply-deltas paths, which are untouched.
- **Game + sim:** `honestBodyWidthPx` (the field the gate reads) is data-only from the
  prerequisite commit; it is not consumed by avoidance physics.

---

## Added Per-Step Cost Estimate

The gate check per pair (all pairs, before Y-rejection) uses **only cheap arithmetic
and field reads** — no `Math.sqrt`, no `Map.get/set`, no `Set.add` (for failing pairs).

Estimated timing (V8 JIT, modern CPU):

| Component | Cost | Where it runs |
|-----------|------|--------------|
| Gate check (field reads + arithmetic) | ~18 ns/pair | ALL pairs |
| Full block (lateralDelta + Set.add×2) | ~36 ns/pair | Corridor pairs only (~15% of all at mid-race) |

| N | Total pairs | Added per step | Y-reject saved | Ratio |
|---|------------|----------------|----------------|-------|
| 40 | 780 | ~0.018 ms | ~0.027 ms | 67% |
| 70 | 2415 | ~0.057 ms | ~0.085 ms | 67% |
| 100 | 4950 | ~0.116 ms | ~0.174 ms | 67% |

**Interpretation:** Stage A adds roughly two-thirds of what Y-rejection saved, in
absolute nanoseconds. But Y-rejection eliminated `Math.sqrt` calls (~5 ns each) plus
large if-blocks — those savings dwarf the cost of the new gate check's simple arithmetic.

Translated to frame budget impact at 70 racers (the standard comparison scenario):
- ~0.057 ms added per physics step
- With 2 catch-up steps at peak density: ~0.114 ms added per frame
- Against the Y-rejection improvement of ~5.2 ms (P90 21.86→16.69ms): **the addition is ~2% of the Y-rejection gain**

**The frame log is the authoritative test.** The estimate above is derived from instruction
timing; actual impact depends on JIT compilation, cache behavior, and branch prediction
— all things the browser measures directly.

---

## Known cost-vs-correctness trade-off

For most racer/track combos (all except dragon on the narrowest open tracks), the
accumulator gate `|dY| < 2×pairHH` fires on exactly the same pairs that survive
Y-rejection — no extra work. For dragon on Luger Hill (pairHH = 0.127,
`2×pairHH = 0.254 > 0.18`), the gate fires on ~15% extra pairs beyond Y-rejection.
These extra pairs do the gate check (~18 ns) but contribute nothing new to the Sets
(their outer-fringe blockers are beyond honest-overlap range anyway).

If the frame log shows a budget overshoot: the cheapest fix is to pre-compute
`honestHH` per racer in the existing O(N) init loop (one extra Map or typed-array
entry per racer at step start), eliminating the `getTrackWidthPx` calls from the
inner pair loop.

---

## Frame Log Request

**Please capture a frame log** at the same conditions as the earlier baselines:
70 racers, Space Sprint, same play pattern (~600 frames). Then compare against:

| Log | Conditions | P90 | Key context |
|-----|-----------|-----|-------------|
| `f1765` (13:14) | Pre-Y-reject baseline | 21.86 ms | Starting point |
| `f2293` (16:38) | Y-rejection | 16.69 ms | Current best |
| **New** | Stage A accumulators | ? | Does the gate check fit the budget? |

**Gate question:** Does P90 remain ≤ 16.7 ms (the hardware budget), or does
the gate overhead push it above? Mean/median/over-budget count all matter.

If Stage A fits the budget → Stage B (first real avoidance behavior: side
commitment on same-lane approach) is next.

If Stage A shows a regression → add the per-racer `honestHH` pre-compute
optimization and re-measure before proceeding to Stage B.
