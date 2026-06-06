# Perf Analysis — Loop Fusion Feasibility in the Physics Step

**Date:** 2026-06-06
**Branch:** `feat/open-track-overlap`
**Status:** Analysis only — no code changes. All numbers are estimates pending
measurement; marked hypothesis where applicable.

---

## 1. Pass Inventory — Every Per-Step Traversal

The physics accumulator loop (`while (st.physicsAccum >= FIXED_DT)`) in
[index.jsx:812](../../client/src/screens/RaceScreen/index.jsx#L812) executes the
following traversals in order every physics step. All racers (finished + active) = N_all.
Active racers only (not finished) = N_act. At steady state: N_all ≈ N_act for most
of the race; at end, N_act shrinks.

### Single-racer passes in `index.jsx`

| ID | Location | Iterates | Purpose |
|----|----------|----------|---------|
| P1 | [index.jsx:819–824](../../client/src/screens/RaceScreen/index.jsx#L819) | N_all | Snapshot `_prevT/X/Y/angle` for render interpolation |
| P2 | [index.jsx:832–840](../../client/src/screens/RaceScreen/index.jsx#L832) | N_all | `trajectoryMult` easeInOutCubic transition — guarded by `racePlanController` |
| P3 | [index.jsx:845–848](../../client/src/screens/RaceScreen/index.jsx#L845) | N_all | `reduce` for `leaderT` (rubber-band) |
| P4 | [index.jsx:852–855](../../client/src/screens/RaceScreen/index.jsx#L852) | N_all | `reduce` for `secondT` (rubber-band, second scan) |
| P5 | [index.jsx:858–877](../../client/src/screens/RaceScreen/index.jsx#L858) | N_all | `rubberBandMult` easing per racer — guarded by `rubberBandConfig.enabled` |
| P6 | [index.jsx:881–961](../../client/src/screens/RaceScreen/index.jsx#L881) | N_all | Main t-advance: spreadFactor re-roll + t/vt update |
| P7 | [index.jsx:963–973](../../client/src/screens/RaceScreen/index.jsx#L963) | N_act (×2) | constSpeed equalization — conditional, rarely active |
| Pos | [index.jsx:974](../../client/src/screens/RaceScreen/index.jsx#L974) | N_all | `computePositions()` — world x/y/angle from `r.t` via spline |
| P8 | [index.jsx:989–998](../../client/src/screens/RaceScreen/index.jsx#L989) | N_all | Finish detection: `r.t >= st.finishT`, `emitBurst`, lap counter |
| P9 | [index.jsx:1005–1014](../../client/src/screens/RaceScreen/index.jsx#L1005) | N_all | Scoreboard sort — ~every 6 steps, conditional |
| P10 | [index.jsx:1044](../../client/src/screens/RaceScreen/index.jsx#L1044) | N_all | Final-lap `reduce` — closed track, conditional |
| P11 | [index.jsx:1050–1097](../../client/src/screens/RaceScreen/index.jsx#L1050) | N_act | Race-plan diagnostics — guarded by `racePlanController` |

### Single-racer passes inside `applyRacerBehavior` (raceBehavior.js)

| ID | Location | Iterates | Purpose |
|----|----------|----------|---------|
| A | [raceBehavior.js:277–278](../../client/src/modules/raceBehavior.js#L277) | N_all / N_act | Filter to `active`; reset `draftingBoostActive = false` |
| B | [raceBehavior.js:281–296](../../client/src/modules/raceBehavior.js#L281) | N_act | Clear+populate Maps (yDeltas, yAvoidDeltas, etc.) |
| B2 | [raceBehavior.js:320–338](../../client/src/modules/raceBehavior.js#L320) | N_act (×0–2) | Conditional dRawPos/dRawNeg/dCntPos/dCntNeg init — only when diagOut or stuckSuppress |
| D | [raceBehavior.js:549–580](../../client/src/modules/raceBehavior.js#L549) | N_act | Priority-mode assignment; calls `_computeBlockedMode` per non-overlap racer |
| E | [raceBehavior.js:583–613](../../client/src/modules/raceBehavior.js#L583) | N_act | Home force: write `yDeltas` per racer |
| F | [raceBehavior.js:618–629](../../client/src/modules/raceBehavior.js#L618) | N_act | Anti-stacking normalization: divide yAvoidDeltas + yFreeLaneDeltas by sqrt(N) |
| G | [raceBehavior.js:632–751](../../client/src/modules/raceBehavior.js#L632) | N_act | Apply-deltas: velocity + damping + clamp + avoidanceActive + brake-match hold state |

### Pair-loop passes (dominate cost)

| ID | Location | Iterates | Purpose |
|----|----------|----------|---------|
| C | [raceBehavior.js:342–543](../../client/src/modules/raceBehavior.js#L342) | N_act(N_act−1)/2 | Avoidance: speed-brake + brake-match + free-lane + push |
| C-inner | [raceBehavior.js:166–178](../../client/src/modules/raceBehavior.js#L166) | O(N_act) per call | `isSideFree`: O(N) scan — called ≤4× per overlapping pair |
| H | [raceBehavior.js:757–781](../../client/src/modules/raceBehavior.js#L757) | N_act(N_act−1) | Drafting: world-space cone check (asymmetric — all ordered pairs) |

**Total single-racer iterations per step (N_all = 70, N_act = 65, steady-state):**
P1 through P8 (non-conditional) + A–G: ≈ 6×70 + 70 + 7×65 = 420 + 70 + 455 = 945

**Total pair iterations:** C ≈ 65×64/2 = 2080; H ≈ 65×64 = 4160 (inner loop exits
early on `leader.t <= follower.t`, so effective work ≈ 2080 qualified pairs too, but
the loop still iterates 4160 times due to the asymmetric structure)

**Pair loop vs single-racer ratio:** ~6200 pair iterations vs ~945 single-racer
iterations — pair loops account for **~87% of all traversal work**.

---

## 2. Fusibility Assessment

### 2a. Safe to fuse

**F1 — Rubber-band two reduces (P3 + P4) → one pass**

P3 finds `leaderT` and P4 finds `secondT = max(r.t) where r.t < leaderT`. Both are
pure scalar aggregations over the same set with no writes. Standard top-2 scan:

```js
let leaderT = -Infinity, secondT = -Infinity;
for (const r2 of st.racers) {
  if (r2.finished) continue;
  if (r2.t > leaderT) { secondT = leaderT; leaderT = r2.t; }
  else if (r2.t > secondT) secondT = r2.t;
}
```

**Data dependency:** none — both scalars are computed before P5 (rubberBandMult) reads
them, and that ordering is preserved. **No order hazard.**

**F2 — Prev-snapshot + trajectoryMult + rubberBandMult + t-advance → one combined
per-racer pass (P1 + P2 + P5 + P6)**

All four are `for (const r of st.racers)` loops. None writes a field read by another
racer's iteration — every racer touches only its own fields (r.t, r.trajectoryMult,
r.rubberBandMult, r._prevT, etc.). P5 needs `leaderT`/`secondT`/`boostActive` scalars
already resolved (which F1 provides before this pass). Processing order within the loop
body: prev-snapshot first (reads prior-step positions), then trajectoryMult, then
rubberBandMult, then t-advance (which uses the freshly updated trajectoryMult and
rubberBandMult). Reading `trajectoryMult` inside the t-advance body in the SAME racer's
iteration is fine — the field is already updated earlier in the same body.

**Data dependency check:**
- P1 reads `r.x`, `r.y`, `r.angle` — these are world positions from the prior step's
  `computePositions()`. They are NOT changed by P2/P5/P6 (which write `r.t`, not
  `r.x/y`). Safe.
- P6's t-advance reads `r.trajectoryMult` and `r.rubberBandMult` — both written
  earlier in the same racer's iteration body. Safe.
- P6 also reads `r.avoidanceActive` and `r.brakeMatchFactor` — written by the PRIOR
  step's `applyRacerBehavior` (intentional one-frame lag). Not touched in this pass.
  Safe.

**No order hazard.**

**F3 — Home force + anti-stacking normalization + apply-deltas → one per-racer pass
(E + F + G)**

All three iterate `active` with no cross-racer dependencies. At the point E starts,
the pair loop C has fully completed and all Maps are populated read-only. Each racer's
computation touches only its own Map entries:

```js
for (const r of active) {
  // E: compute home contribution inline
  const homeContrib = ...;

  // F: normalize avoidance + free-lane inline
  const count = neighborCounts.get(r.index);
  const avoid = count > 1 ? yAvoidDeltas.get(r.index) / Math.sqrt(count) : yAvoidDeltas.get(r.index);
  const flCount = freeLaneCounts.get(r.index);
  const freeLane = flCount > 1 ? yFreeLaneDeltas.get(r.index) / Math.sqrt(flCount) : yFreeLaneDeltas.get(r.index);

  // G: apply total delta
  let delta = homeContrib + avoid + freeLane;
  // ... stuck-mode, velocity, clamp, avoidanceActive, brake-match hold, diagOut
}
```

`yDeltas` Map becomes an unnecessary intermediary — `totalDelta` is computed directly.
This eliminates 2×N_act Map.get/set calls (the `yDeltas` reads/writes in E and F).

**Data dependency:** E needs the priority-mode loop D to complete first (reads
`r.currentMode`). D needs the pair loop C to complete first (reads `overlapSet`). Both
preconditions are already satisfied in the current ordering and are preserved. **No
order hazard.**

**F4 — Init-loop consolidation (B + B2)**

[raceBehavior.js:290–338](../../client/src/modules/raceBehavior.js#L290) has up to
three separate `for (const r of active)` loops for initialization. All can be one:

```js
for (const r of active) {
  _yDeltas.set(r.index, 0);
  // ... all always-needed Maps ...
  if (needsBreakdown) { _dRawPos.set(r.index, 0); _dRawNeg.set(r.index, 0); }
  if (diagOut !== null) { _dCntPos.set(r.index, 0); _dCntNeg.set(r.index, 0); }
}
```

No cross-racer dependencies, no ordering constraints, pure init. **No order hazard.**

---

### 2b. Cannot be fused — explicit hazards

**BLOCKED: Avoidance pair loop (C) ↔ Drafting pair loop (H)**

The avoidance pair body at
[raceBehavior.js:414–416](../../client/src/modules/raceBehavior.js#L414) reads
`leader.draftingBoostActive` and `trailer.draftingBoostActive` to scale the
brake-to-match cap:

```js
const boostL = leader.draftingBoostActive ? config.draftingBoost : 1.0;
const boostT = trailer.draftingBoostActive ? config.draftingBoost : 1.0;
```

Currently, `draftingBoostActive` is reset to `false` at
[raceBehavior.js:278](../../client/src/modules/raceBehavior.js#L278) before C runs,
and H sets it to `true` for qualifying followers AFTER C finishes. So during C, all
`draftingBoostActive` values are `false` → `boostL/boostT = 1.0` for all pairs.

If C and H were fused into one combined pair scan, some racers would have
`draftingBoostActive = true` mid-pass (set by earlier H iterations) while others are
still `false`. The brake-to-match cap would then be non-deterministically affected by
the order in which pairs happen to be processed. This changes behavior.

**The one-frame lag (`applyRacerBehavior` runs, THEN the values are read next step) is
intentional and must be preserved.** Fusing C and H would collapse this lag for
mid-pass pairs.

**BLOCKED: Avoidance pair loop (C) ↔ Priority-mode loop (D)**

D reads `overlapSet` at [raceBehavior.js:555](../../client/src/modules/raceBehavior.js#L555).
`overlapSet` is populated by C. D requires the FULL pair loop to have run so that
every overlapping pair has been added to `overlapSet`. If D is interleaved with C, a
racer's `overlapSet.has(r.index)` check would return `false` even though it might
have an overlap partner not yet visited in C. This changes `currentMode` assignments.

**BLOCKED: Any pre-computePositions pass ↔ Any post-computePositions pass**

`computePositions()` at [index.jsx:974](../../client/src/screens/RaceScreen/index.jsx#L974)
writes `r.x`, `r.y`, `r.angle` from the new `r.t`. The drafting loop H reads world-space
`r.x`, `r.y`, `r.angle` — it REQUIRES updated positions from `computePositions()`.
Therefore:

```
t-advance (P6) → computePositions() → applyRacerBehavior [C, H]
```

This ordering must be preserved. Passes before `computePositions()` and passes inside
`applyRacerBehavior` cannot be merged across the `computePositions()` boundary.

**BLOCKED: Finish detection (P8) into t-advance loop (P6)**

`emitBurst(st.burstParticles, r.x, r.y)` at
[index.jsx:995](../../client/src/screens/RaceScreen/index.jsx#L995) uses world
positions. These are only current AFTER `computePositions()` runs. Fusing P8 into P6
(before `computePositions()`) would emit burst particles at the prior-step position —
a 1-frame stale coordinate. The visual difference is negligible (~16ms × speed), but
it is a behavioral change. Not recommended.

**BLOCKED: Cross-module entanglement**

`applyRacerBehavior` does not have access to `st.finishedCount`, `physicsTs`,
`emitBurst`, `setScoreboard`, etc. Pulling index.jsx loops (P8, P9) into
`applyRacerBehavior` would entangle the pure-physics module with React state.
Architecturally wrong — keep them separate.

---

## 3. Concrete Behavior-Preserving Fusion Plan

### Plan A — index.jsx: four pre-advance passes → two (F1 + F2)

**Before:** P1, P2, P3, P4, P5, P6 — six separate loops over `st.racers` (≈6×N_all).

**After:** two loops:
```
Step 1 — scalar scan (F1):
  for (r of st.racers): compute leaderT + secondT in one pass → boostActive scalar

Step 2 — combined per-racer pass (F2):
  for (r of st.racers):
    r._prevT = r.t; r._prevX = r.x; r._prevY = r.y; r._prevAngle = r.angle;
    [ trajectoryMult easing — if racePlanController ]
    [ rubberBandMult easing — if rubberBandConfig.enabled, using leaderT/boostActive ]
    [ spreadFactor re-roll ]
    t-advance (reads freshly-written trajectoryMult, rubberBandMult from earlier in body)
    vt update
```

**Behavioral identity:** All per-racer fields (trajectoryMult, rubberBandMult, t, vt,
_prevT/X/Y/angle) are written in the same order as before relative to the t-advance
within each racer's body. The only change is that adjacent racers' loop iterations are
interleaved rather than fully separated. Since no racer's body reads another racer's
fields, this is bit-identical.

**Caveat:** The rubber-band `boostActive` flag is currently computed from `leaderGap`
after the two reduces. The fused version must compute `leaderGap` from the F1 scalars
before entering the per-racer loop. This preserves the same logic.

### Plan B — raceBehavior.js: three post-pair per-racer passes → one (F3 + F4)

**Before:** B (init), B2 (conditional init), E (home force), F (anti-stacking), G
(apply-deltas) — up to five loops over `active`.

**After:** two loops:
```
Step 1 — combined init (F4):
  for (r of active):
    _yDeltas.set(r.index, 0); ... (all always-needed Maps)
    if (needsBreakdown) { _dRawPos/Neg init }
    if (diagOut !== null) { _dCntPos/Neg init }

Step 2 — combined home+normalize+apply (F3):
  for (r of active):
    homeContrib = ...  [was E]
    avoid = yAvoidDeltas / sqrt(neighborCount)  [was F]
    freeLane = yFreeLaneDeltas / sqrt(flCount)  [was F]
    delta = homeContrib + avoid + freeLane
    ... stuck-mode, velocity, clamp, avoidanceActive, brake-match hold, diagOut  [was G]
```

`yDeltas` Map is no longer needed as an accumulator — `totalDelta` is computed inline.
The Map can be removed entirely (reducing memory usage and eliminating ~2×N_act
Map.get/set calls). All other Maps (yAvoidDeltas, yFreeLaneDeltas, neighborCounts,
freeLaneCounts) remain read-only at this point and are unchanged.

**Behavioral identity:** The home force formula, avoidance normalization, and apply-
deltas formulas are identical. The only structural change is computing them inline in
one body rather than as three separate passes with a Map intermediary. Since no racer
body reads another racer's output (no cross-racer dependencies in E/F/G), the results
are bit-identical.

**Tests that must stay green:** All 2629. No formula changes → tests should pass
without modification. This is NOT a hypothesis; it is the design property of the
fusion (only loop structure changes, not arithmetic).

### Ordering contract (must be preserved)

```
F1 (leaderT/secondT scalars)
F2 (per-racer: prev-snapshot, trajectoryMult, rubberBandMult, t-advance, vt)
computePositions()
  applyRacerBehavior:
    A (filter active + reset draftingBoostActive)
    F4 (combined init)
    C (avoidance pair loop) ← unchanged
    D (priority-mode) ← unchanged
    F3 (combined home+normalize+apply)
    H (drafting pair loop) ← unchanged
P8 (finish detection)
```

---

## 4. Y-Rejection: Assessment and Interaction with Fusion

**What it is:** Add one pre-check before the `sqrt` inside the avoidance pair loop C,
at [raceBehavior.js:351](../../client/src/modules/raceBehavior.js#L351):

```js
const dY = rA.physicalY - rB.physicalY;
if (Math.abs(dY) * config.yWeight >= config.avoidanceDistance) continue;
// ... then existing sqrt + dist check
```

**Correctness proof (identical to report 08):** `dist = sqrt((dT×tWeight)² + (dY×yWeight)²) ≥ |dY×yWeight|`.
If `|dY|×yWeight ≥ avoidanceDistance`, then `dist ≥ avoidanceDistance` → existing
gate would `continue`. Y-rejection is a strict mathematical subset of the existing
gate. Results are bit-identical.

**Expected skip rate:** With `yWeight = 1.0` and `avoidanceDistance = 0.18`, rejects
pairs where `|dY| ≥ 0.18`. Since `physicalY ∈ [−maxLateral, +maxLateral]` and
avoidance forces push racers apart in Y, empirically ~70–80% of pairs have
`|dY| ≥ 0.18` during mid-race. This is a hypothesis — the exact rate depends on pack
density and maxLateral config. **(Hypothesis: confirm via Dev Screen diagnostics.)**

**What the Y-rejection saves:** For the ~75% of pairs that fail the check, it eliminates:
1. The `sqrt` call (the most expensive operation in the loop body — ~10–20ns)
2. The dist comparison
3. All subsequent pair body work (track-width lookups, speed-brake check, isSideFree
   calls, accumulator updates)

**Cost of Y-rejection itself:** One `Math.abs(dY * yWeight)` and one `>=` comparison
per pair — extremely cheap (~0.5ns). Net: saves expensive sqrt + body for ~75% of pairs
at a cost of one trivial comparison for 100% of pairs.

**Interaction with loop fusion:** Y-rejection targets the PAIR loop body (C). The
fusion plan targets SINGLE-RACER loops (P1–P6, E–G). They operate on completely
different loop structures and are fully orthogonal — both can be applied in the same
implementation without interference.

**Combined interaction:**
- Y-rejection reduces work inside the dominant O(N²) pass
- Fusion reduces overhead on the O(N) passes

For the sawtooth judder observed in the 70-racer frame log, the pair loop is the root
cause. Y-rejection directly addresses the root cause; fusion reduces the surrounding
overhead. Applying both is the correct approach.

---

## 5. Estimated Work Reduction

All estimates use **active pair count C = N(N−1)/2**, and assume:
- sqrt costs ~15× a trivial op
- avoidance pair body (post-dist-check) costs ~30 trivial ops
- Y-rejection skip rate = 75% of pairs
- Pairs passing the dist check (before Y-rejection): ~20% of all pairs (estimated from
  config: avoidanceDistance=0.18, tWeight=2, yWeight=1, spread across track width)

**"Work unit" = one trivial comparison or arithmetic op.**

### Fusion alone (F1 + F2 + F3 + F4)

Savings are all from O(N) passes:

| N_act | Passes saved | Approx saved iters |
|-------|-------------|-------------------|
| 40 | ~6–8 passes × N | 240–320 |
| 70 | ~6–8 passes × N | 420–560 |
| 100 | ~6–8 passes × N | 600–800 |

**Pair loop unchanged** → fusion saves ~0–2% of total step cost when pairs dominate.
Hypothesis: negligible impact on sawtooth judder; noticeable only in profiling's
scripting-time overhead if JavaScript engine has high function-call or loop-setup cost.

### Y-rejection alone (add dY pre-check to C)

Per pair: add 1 trivial op (dY multiply+compare). Skip sqrt (~15 units) + dist check
(~1 unit) + body (~30 units) for 75% of pairs.

| N_act | Total pairs | Pairs skipped | Work before | Work after | Reduction |
|-------|-------------|---------------|-------------|------------|-----------|
| 40 | 780 | 585 | 780×17 + 156×30 = 18,060 | 780×2 + 195×17 + 39×30 = 6,045 | **~67%** |
| 70 | 2415 | 1811 | 2415×17 + 483×30 = 55,545 | 2415×2 + 604×17 + 121×30 = 18,619 | **~66%** |
| 100 | 4950 | 3713 | 4950×17 + 990×30 = 113,550 | 4950×2 + 1238×17 + 495×30 = 46,696 | **~59%** |

*(Numbers are illustrative "work units" — the actual ratio depends on real skip rate
and body complexity. The direction is reliable; the exact % is a hypothesis.)*

**Hypothesis:** Y-rejection reduces avoidance pair loop wall-clock time by ~50–70% at
N=70. This directly attacks the sawtooth spike duration. Whether spikes disappear
entirely depends on whether the reduced avoidance cost + drafting loop still fits
within the 16ms budget for a 70-racer dense pack.

### Both combined

| N_act | Pair loop reduction | Single-pass reduction | Total reduction vs baseline |
|-------|--------------------|-----------------------|----------------------------|
| 40 | ~67% of pair loop | ~12% of single-racer passes | ~**58–62%** of total step work |
| 70 | ~66% of pair loop | ~12% of single-racer passes | ~**57–61%** of total step work |
| 100 | ~59% of pair loop | ~12% of single-racer passes | ~**51–56%** of total step work |

*Total = weighted sum, where pair work is ~87% of total at N=70.*

**Hypothesis:** At N=70, fusing + Y-rejection together reduce total physics step work
by ~55–60% compared to the current baseline. In the 70-racer frame log, heavy physics
steps ran 21–28ms. A 55–60% reduction would target ~9–12ms — within the 16.7ms budget.
This is optimistic because it ignores V8 JIT warm-up, hidden per-op costs, and the
drafting loop (unchanged). Confirm with a frame log.

---

## 6. What Must NOT Be Fused

| Pair | Reason | Hazard type |
|------|--------|-------------|
| Avoidance C ↔ Drafting H | `draftingBoostActive` one-frame lag: C reads it as `false`; fusing would make it partially `true` mid-pass, changing brake-to-match caps | **Behavioral change — any N** |
| Avoidance C ↔ Priority-mode D | D needs `overlapSet` fully populated; partial population changes `currentMode` assignments | **Behavioral change — any N** |
| Priority-mode D ↔ Pair loop C | See above — reverse of the same dependency | **Behavioral change** |
| Pre-`computePositions` passes ↔ `applyRacerBehavior` | H (drafting) uses `r.x/y/angle`; these are only valid after `computePositions()` | **Wrong data — subtle bug on curves** |
| Finish detection P8 ↔ t-advance P6 | `emitBurst(r.x, r.y)` would use stale (prior-step) world positions | **Visual regression (particles at wrong location)** |
| `applyRacerBehavior` internals ↔ `index.jsx` passes | Module boundary — `raceBehavior.js` has no access to `st`, `emitBurst`, `setScoreboard`, React state | **Architecture violation** |

---

## 7. Implementation Sequence (if approved)

The following order minimizes risk and keeps tests green at every step:

1. **Y-rejection** (one line inside pair loop C) — zero structural change, tests must
   stay 2629/2629 green. Frame-log before/after immediately shows whether sawtooth
   spikes shorten.
2. **F1** (rubber-band two reduces → one pass) — trivial, zero fairness risk.
3. **F4** (init-loop consolidation) — trivial merge inside `applyRacerBehavior`.
4. **F2** (combined pre-advance per-racer pass) — combine 4 loops in `index.jsx`.
5. **F3** (combined home+normalize+apply) — removes `yDeltas` as intermediary;
   slightly more invasive inside `applyRacerBehavior`.

After step 1: take a new frame log with 70 racers and compare against
`camera-log-2026-06-06T13-14-26-f1765.json` baseline.
After step 5: run full N=50 sweep across all 66 combos to confirm bit-identical physics.
N=50 sweep is MANDATORY before trusting the combined change in production, even though
the fusion is designed to be bit-identical — the sweep detects regressions introduced
by integration errors.

---

## 8. Claim Status Summary

| Claim | Status |
|-------|--------|
| Fusion saves ~6–8 full per-racer passes per step | **Verified by inspection** |
| Fusion reduces total step time by ~2–5% at N=70 | **Hypothesis — requires frame-log** |
| Y-rejection skip rate is ~70–80% of pairs | **Hypothesis — requires diagnostic counting** |
| Y-rejection reduces avoidance loop time by ~50–70% | **Hypothesis — requires frame-log** |
| Combined reduction of ~55–60% at N=70 | **Hypothesis — requires frame-log** |
| Tests stay 2629/2629 green after fusion | **Expected (no formula changes) — verify** |
| Full N=50 sweep shows no fairness regression | **Required before production trust** |
| Sawtooth judder disappears at N=70 after Y-rejection | **Unknown — drafting loop and dense-pack cost still present** |
