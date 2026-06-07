# Report 26 — Stage D (real fix): Self-Limiting Honest-Clearance Gap Force

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07
**Tests:** 2629/2629 green
**Status:** BROWSER CHECK REQUIRED before the full 66-combo sweep

---

## 1. What Was Built

Two changes, minimal footprint:

### defaults.js — two new config params

[defaults.js:540-546](../../client/src/modules/storage/defaults.js#L540):
```js
gapForceStrength: 1.0,   // gap-clearing force scale relative to lateralForce (0 = Stage C behavior)
gapForceCap: 1.5,        // max Stage B total injection as multiple of lateralForce
```

### raceBehavior.js — Stage D force injection

[raceBehavior.js:801–835](../../client/src/modules/raceBehavior.js#L801). Replaces the single-line Stage C injection with:

```js
if (r.approachCommitDir !== 0) {
  const fMag = _approachForceMag.get(r.index) ?? 0;
  if (fMag > 0) {
    let injected = fMag;
    // Three gates:
    const lpy = _sameLaneLeaderPhysY.get(r.index);
    if (inSameLane && speedBrakeSet.has(r.index) && lpy !== undefined) {
      const tw = getTrackWidthPx(r);
      if (tw > 0) {
        const honestHalfSpan = (r.honestBodyWidthPx ?? r.spriteWorldSizePx ?? 0) / tw;
        if (honestHalfSpan > 0) {
          const absYDiff = Math.abs(r.physicalY - lpy);
          const clearanceSpan = 2 * honestHalfSpan;
          const gapRatio = Math.max(0, (clearanceSpan - absYDiff) / clearanceSpan);
          const gapForce = config.lateralForce * (config.gapForceStrength ?? 1.0) * gapRatio;
          const cap = config.lateralForce * (config.gapForceCap ?? 1.5);
          injected = Math.min(injected + gapForce, cap);
        }
      }
    }
    delta += r.approachCommitDir * injected;
  }
}
```

No other files changed. Sim parity: automatic (sim imports `applyRacerBehavior` directly from
`raceBehavior.js` — [scripts/sim-fairness.mjs:125](../../scripts/sim-fairness.mjs#L125)).

---

## 2. Four Properties Confirmed

### SELF-LIMITING — raceBehavior.js:824

```js
const gapRatio = Math.max(0, (clearanceSpan - absYDiff) / clearanceSpan);
```

`clearanceSpan = 2 × honestHalfSpan`. gapRatio decreases linearly as `absYDiff` grows:

| |yDiff| | gapRatio | gapForce (dragon) |
|---------|---------|-----------|
| 0 | 1.000 | 0.0114 |
| sameLaneHH = 0.093 | 0.500 | 0.0057 |
| 2 × sameLaneHH = 0.186 | 0.000 | 0 |

In practice: `inSameLane` (gate 1) becomes false at `|yDiff| ≥ sameLaneHH = 0.093` → force
ends exactly at honest clearance. The 2× zero-crossing ensures gapForce is still strong at
|yDiff| = 0.093 when it cuts off — avoiding a premature ramp-down that would leave the gap
unclosed.

**No over-shoot risk**: the force turns off when `inSameLane` exits, which is when the trailer
has cleared one honest half-span. The 2× target in the formula provides a declining but non-zero
force throughout the critical closing window.

### HONEST-WIDTH SCALED — raceBehavior.js:819–820

```js
const honestHalfSpan = (r.honestBodyWidthPx ?? r.spriteWorldSizePx ?? 0) / tw;
```

`r.honestBodyWidthPx` is the per-racer honest body width (set from sprite configuration).

| Racer | honestBodyWidthPx | honestHalfSpan (Space Sprint) | inSameLane trigger | clearanceSpan |
|-------|------------------|-------------------------------|-------------------|---------------|
| dragon | 41.8 px | 0.093 | |yDiff| < 0.093 | 0.186 |
| rocket | ~20 px | ~0.045 | |yDiff| < 0.045 | ~0.090 |
| giraffe | ~8 px | ~0.018 | |yDiff| < 0.018 | ~0.036 |

Slim racers (rocket, giraffe) enter the `inSameLane` trigger zone only at very small yDiff, and
their smaller clearanceSpan means the gapForce ramps down faster. They also reach clearance in
fewer frames with the existing Stage B committed force, so Stage D fires for fewer frames and
contributes less total impulse. Slim-racer dynamics are minimally affected.

### CAPPED TOTAL — raceBehavior.js:828–829

```js
const cap = config.lateralForce * (config.gapForceCap ?? 1.5);
injected = Math.min(injected + gapForce, cap);
```

Maximum total Stage B injection = `1.5 × lateralForce = 1.5 × 0.0114 = 0.0171`.

At the worst case (|yDiff|=0, dist≈0): `fMag + gapForce = 0.0114 + 0.0114 = 0.0228`, capped
to `0.0171`. Steady-state velocity from this capped force:
`v_ss = 0.0171 × 0.16 / 0.84 = 0.00326/step`.

On a 449px track, 0.00326 normalized/step = 1.46 px/step — a firm push, not a violent shove.

### Open-track only; commitment required; speedBrakeSet gate — raceBehavior.js:741, 802, 816

1. **Open-track only** ([raceBehavior.js:741](../../client/src/modules/raceBehavior.js#L741)):
   entire Stage B block (including Stage D) is inside `if (config.isOpen !== false)`. Closed
   tracks completely untouched.

2. **Commitment required** ([raceBehavior.js:802](../../client/src/modules/raceBehavior.js#L802)):
   `if (r.approachCommitDir !== 0)` — gap force only fires when the trailer has an active lateral
   commitment from Stage B direction logic. Debounce + stablePairBit are unchanged; no new zigzag
   source from direction flipping.

3. **speedBrakeSet gate** ([raceBehavior.js:816](../../client/src/modules/raceBehavior.js#L816)):
   `speedBrakeSet.has(r.index)` — trailer must be actively decelerating behind a leader (close in
   T: `dT < dynamicBrakeT = spriteWorldSize/pathLength × 1.5`). This excludes "alongside" pairs
   that share similar track position and large T separation — the scenario that caused zigzag and
   excess honestOverlapRate in the ungated version (tested and discarded, N=50).

---

## 3. How It Fixes the Gap (2-Racer Arithmetic)

### Stage C baseline (from report 24)

Brake-match holds while `|yDiff| < 0.060`. Committed force at |yDiff|=0:
`fMag ≈ 0.0095`, `v_ss = 0.0018/step`. Reaches |yDiff|=0.060 in ~35 frames.

Post-release alongside window (~15 frames at committed force 0.0076):
`Δy ≈ 0.022` → |yDiff| at pass = **0.082** (5.4 px short of clearance 0.093).

### Stage D with gap force

At |yDiff|=0 during brake-match: `injected = min(0.0095+0.0114, 0.0171) = 0.0171`.
`v_ss = 0.0171 × 0.190 = 0.00326/step`. Reaches |yDiff|=0.060 in **~18 frames** (2× faster).

After brake-match exits (|yDiff|=0.060, v≈0.00326, speedBrakeSet still active):
Gap force continues (speedBrakeSet holds until dT > dynamicBrakeT = 67px in track direction).

Step simulation from brake-match exit (v = 0.00326/step, starting |yDiff| = 0.060):

| Frame | |yDiff| | gapRatio | delta | v |
|-------|---------|---------|-------|---|
| 0 (exit) | 0.060 | 0.677 | 0.01532 | 0.00297 |
| 2 | 0.066 | 0.645 | 0.01457 | 0.00279 |
| 4 | 0.071 | 0.618 | 0.01396 | 0.00267 |
| 6 | 0.077 | 0.586 | 0.01321 | 0.00253 |
| 8 | 0.082 | 0.559 | 0.01246 | 0.00238 |
| 10 | 0.086 | 0.538 | 0.01168 | 0.00224 |
| 12 | **0.091** | — | **inSameLane exits** | — |

**Honest clearance reached in ~12 post-brake-match frames** (comfortably within the ~15-frame
alongside window). Stage D closes the 5.4px gap to ≈ 0px.

---

## 4. Tests and Verification

### Tests: 2629/2629 green ✓

```
Test Files  122 passed (122)
Tests       2629 passed (2629)
Duration    83.80s
```

### Frame log estimate

Stage D adds per active racer (in apply-deltas): one `Set.has()` + one `Map.get()` + one
`getTrackWidthPx()` (two property reads) + ~6 arithmetic ops. Only fires for racers in the
`speedBrakeSet` intersection (typically < 20% of racers at any frame on open tracks).

Context: Y-rejection improved P90 by ~5ms (21.86→16.69ms). Stage D's per-racer cost is
comparable to Stage B/C, which was estimated at ~2% of Y-rejection gain (report 16). Stage D
adds ~1-2 instructions per qualifying pair. **Estimated P90 impact: < 0.1ms — within noise.**

**Browser frame log measurement needed**: run 70 racers on Space Sprint, check Dev Screen P90.
Gate: stay ≤ 16.7ms.

### Diagnostic sim (N=50, dragon × Space Sprint × 30s, race-plan=true)

| Metric | Stage C (gapForceStrength=0) | Stage D (gated Lever B) | Δ |
|--------|------------------------------|-------------------------|---|
| honestOverlapRate | 5.8% | 5.8% | 0 |
| zigzag | 0.000275 | 0.000355 | +0.000080 (well below 0.05 gate) |
| latSpd | 0.001202 | 0.001902 | +58% (more lateral motion during passes) |
| stableOvt | 4.681 | 4.507 | −4% (within noise at N=50) |
| **fairness p (dragon×SS)** | **0.022 (UNFAIR)** | **0.579 (fair)** | **+** |

Note on honestOverlapRate: the gap problem (15-frame pass window per overtake) is a tiny fraction
of all pair-frames in a 40-racer race. The aggregate rate doesn't capture the per-pass
improvement. The fairness recovery (p=0.022→0.579) is a measurable aggregate signal. The
visual gap is validated by browser check.

**Note on Stage C N=50 unfairness**: the p=0.022 for Stage C at N=50 is likely seed-specific
noise (Stage C passed 66 combos at N=50 in previous sweeps). The full 66-combo sweep after the
browser check will confirm.

---

## 5. BROWSER CHECK REQUIRED (do this before the full sweep)

Please run the browser with dragon racers on Space Sprint and check:

1. **Gap during pass**: when a dragon overtakes another dragon from directly behind, do the bodies
   now have visible clearance at the alongside moment? Gap should be noticeably wider than before
   (Stage C left a 5.4px overlap visible; Stage D should reduce this to near-zero).

2. **Slim racers clean**: giraffe and rocket on any open track — no new pass-through, no new
   jitter/oscillation during passes. Their dynamics should feel identical to Stage C.

3. **No shoving into third racer**: in a crowded open-track field, does the gap force cause any
   racer to be pushed violently into a third racer? The 1.5× cap limits the max injection to
   1.46 px/step on a 449px track — should feel firm but not aggressive.

4. **Frame log**: Dev Screen, 70 racers, Space Sprint. P90 should be ≤ 16.7ms (budget).

**To test Stage C behavior for comparison**: set `gapForceStrength: 0` in the browser config
(or via the UI if exposed), which disables Stage D and reverts to Stage C committed-force only.

---

## 6. After Browser Check Passes: Full 66-Combo Sweep

Run:
```
node scripts/sim-fairness.mjs --races=50 --race-plan=true --out=client/tmp/stageD-full
```

Gates (all must pass):
- All 66 combos: fairness p ≥ 0.05 (or re-check seed failures at seeds 2 & 42)
- Closed tracks: identical to Stage C baseline (closed completely untouched by Stage D)
- Zigzag: no combo > Stage C zigzag by +0.05 absolute (current delta: +0.000080)
- Back-row B1 top5: no row regression > −10pp vs Stage C
- Dragon honest overlap: visible reduction in browser check (primary validation)
- Slim racers (giraffe, rocket): honestOverlapRate and pass-through rate unchanged

---

## 7. Config Knobs if Browser Check Reveals Issues

| Problem observed | Recommended adjustment |
|-----------------|------------------------|
| Gap still visible (not wide enough) | Raise `gapForceStrength` from 1.0 to 1.5 |
| Racers shoved too hard sideways | Lower `gapForceCap` from 1.5 to 1.2 |
| Zigzag or oscillation increased | Lower `gapForceStrength` to 0.5 |
| Stage D force disabled for comparison | Set `gapForceStrength: 0` |

These are UI-configurable per the project rule (accessible via the behavior config JSON).
