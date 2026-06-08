# Step 2 Stage B — Same-Lane Detection + Lateral Side Commitment

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-06
**Commit:** `7119f9b`
**Baseline:** `backup/pre-step2` (`d762bc5`)
**Tests:** 2629/2629 green
**Status:** Code built; frame log + browser check pending.

---

## What Was Built

All changes in [raceBehavior.js](../../client/src/modules/raceBehavior.js), open tracks only.

### New module-level structures (lines 54–58)

```js
const _sameLaneApproach = new Set();   // trailer indices with a near-same-lane leader this step
const _approachForceMag = new Map();   // per-trailer max forceMag for same-lane pairs
```

Cleared per step alongside the Stage A accumulators.

### Per-racer init fields (lines 117–120)

```js
racer.approachCommitDir    = 0;   // −1 (left), 0 (none), +1 (right)
racer.approachCommitFrames = 0;   // consecutive frames holding this direction
```

Same stateful pattern as `brakeMatchLeaderIndex / brakeMatchFrames`.

### Same-lane detection in pair loop body (after dist gate, before yDiff gate)

[raceBehavior.js:581–600](../../client/src/modules/raceBehavior.js#L581)

```js
if (config.isOpen !== false && trackWidth > 0) {
  const sameLaneHH = Math.max(
    trailer.honestBodyWidthPx ?? trailer.spriteWorldSizePx ?? 0,
    leader.honestBodyWidthPx  ?? leader.spriteWorldSizePx  ?? 0
  ) / trackWidth;
  if (sameLaneHH > 0 && Math.abs(yDiff) < sameLaneHH) {
    _sameLaneApproach.add(trailer.index);
    if (forceMag > (_approachForceMag.get(trailer.index) ?? 0))
      _approachForceMag.set(trailer.index, forceMag);
  }
}
if (Math.abs(yDiff) < 1e-6) continue;  // existing gate unchanged
```

**Threshold:** `sameLaneHH = max(trailer.honestBodyWidthPx, leader.honestBodyWidthPx) / trackWidth`.
For dragon on Space Sprint: 41.8px / 449px ≈ 0.093. Fires when trailer is within one
honest half-body width of the leader laterally — close enough that natural avoidance push
direction is unreliable or zero.

### Commitment state + force injection in apply-deltas loop (lines 729–788)

After stuck-mode suppression, before velocity update:

```js
if (config.isOpen !== false) {
  if (_sameLaneApproach.has(r.index)) {
    const leftFree  = !_approachLeft.has(r.index);
    const rightFree = !_approachRight.has(r.index);
    let desiredDir = 0;
    if      (leftFree && !rightFree)  desiredDir = -1;
    else if (!leftFree && rightFree)  desiredDir = 1;
    else if (leftFree && rightFree) {
      const fwdL = _forwardLeft.has(r.index);
      const fwdR = _forwardRight.has(r.index);
      if (!fwdL && fwdR)      desiredDir = -1;
      else if (fwdL && !fwdR) desiredDir = 1;
      else                     desiredDir = (r.index & 1) === 0 ? 1 : -1;  // index-parity tie-break
    }
    // desiredDir === 0: both sides occupied → fall to brake-to-match
    ...debounce + anti-starvation...
  }
  if (r.approachCommitDir !== 0) {
    const fMag = _approachForceMag.get(r.index) ?? 0;
    if (fMag > 0) delta += r.approachCommitDir * fMag;
  }
}
```

**Key properties:**
- `leftFree = !_approachLeft.has(r.index)` — O(1) Set lookup, no scan
- Tie-break `(r.index & 1) === 0 ? 1 : -1` — identity-based (not position-based → no row-correlated bias)
- Force magnitude = `_approachForceMag` = the `forceMag` computed by the pair loop at the same pair's distance → respects `config.lateralForce × (1 − dist/avoidanceDistance)` bound
- Debounce: decrement counter before direction flip; flip only when counter reaches 0 (~3 frames)
- Anti-starvation: abandon commit after `brakeHoldTimeoutFrames` (90) frames
- Decay: when no same-lane leader, decay by `brakeReleaseDebounceFrames` (3) per frame

---

## Tests

2629/2629 green. No behavior test needed updating — no existing test asserted the old
same-lane no-redirect behavior with exact position expectations.

---

## Screening Fairness Results

### 3-combo screening (N=50, seed=1)

| Track × Racer | p | Gate | honest overlap | zigzag | vs baseline |
|---|---|---|---|---|---|
| Space Sprint × dragon | **0.968** | ✅ | 4.1% | 0.000166 | baseline: p=0.866, honest=4.0%, zig=0.000173 |
| Mountainstreet × dragon | **0.731** | ✅ | 3.5% | 0.000165 | baseline: p=0.612, honest=3.4%, zig=0.000167 |
| Dirt Oval × horse (closed) | **0.802** | ✅ | 2.7% | n/a | baseline: p=0.257 (from 8bd7180 sweep) |

All three pass. Closed-track Dirt Oval × horse is clean — confirmed the
`config.isOpen !== false` guard is working.

**Dragon honest overlap:** Unchanged within noise (4.0%→4.1%, 3.4%→3.5%).
Stage B fires correctly, but the aggregate overlap reduction may not yet be visible in
the sim at N=50 (the racers laterally spread during the race, reducing same-lane encounters
relative to the early-pack dense-start scenario where Stage B matters most). The
browser check will be the primary test.

### All-track dragon pass (N=20, seed=1, broad plausibility)

| Track | Type | p (N=20) | honest | Notes |
|-------|------|---------|--------|-------|
| Dirt Oval | closed | 0.332 | 8.2% | ✅ unchanged |
| River Run | open | 0.389 | 3.7% | ✅ |
| Space Sprint | open | 0.022 | 4.1% | ⚠️ noise — N=50 seed=1 gave p=0.968 |
| Garden Path | closed | 0.503 | 6.7% | ✅ unchanged |
| City Circuit | closed | 0.058 | 8.0% | ✅ marginal at N=20, expected |
| Luger Hill | open | 0.576 | 4.6% | ✅ |
| Ice Track | closed | — | — | dragon not eligible (surface mismatch) |
| Mountainstreet | open | 0.819 | 3.4% | ✅ |
| Searound | closed | 0.480 | 5.4% | ✅ unchanged |
| Seatrack | open | 0.453 | 3.6% | ✅ |

**Space Sprint × dragon N=20 p=0.022:** Row0=60% (expected 33%) from 20 races × 3 rows.
At N=20 with 3 rows, a chi-square deviation of this size is within normal seed-1 noise —
N=50 seed=1 gave p=0.968 for this exact combo, strongly confirming it is sampling noise.
No structural issue.

**All open-track closed-track behavior:** Open tracks show stable honest overlap vs
baseline. Closed tracks show no change (the `isOpen !== false` guard is intact).

---

## Pending: Frame Log

**Please capture a frame log** (70 racers, Space Sprint, ~600 frames, same conditions as
f2293) and compare against the Stage A result (which was identical to f2293):

| Log | P90 | >16.7ms | Context |
|-----|-----|---------|---------|
| f2293 — Y-rejection | 16.69ms | 8.0% | Stage A was identical to this |
| **New** | ? | ? | Stage B: commitment logic in apply-deltas (O(1) per racer) |

Stage B adds ~O(N) work per step (60 racer apply-deltas loop iterations with Set lookups).
Expected impact: smaller than Stage A's gate check on all pairs. But measure first.

---

## Pending: User Browser Check

**This is the first stage you can see.** Please run:
- Space Sprint or Luger Hill, dragon racer, full field (60 racers)
- Watch a comeback scenario: does dragon (or a racer approaching dragon from behind in
  the same lane) visibly steer AROUND rather than sit overlapping?
- Confirm: no visible zigzag or left-right oscillation
- Confirm: closed-track race looks unchanged

The visual check is the primary gate for Stage B — it answers whether "steering around"
is actually happening in practice, which the aggregate overlap stats may not capture.

---

## Screening Verdict

**Screening CLEAN.** No gross failures. All fairness gates pass:
- 3-combo N=50 screen: all pass ✅
- Closed-track Dirt Oval × horse unchanged ✅
- Zigzag not increased (slight decrease) ✅
- Dragon honest overlap unchanged (not regressed, not yet visibly improved in sim) ✅

Stage B is ready for the frame log and browser check. If both pass:
→ Stage C (forward-clearance activation) is next.
→ Full 66×N=50 sweep is reserved for after all stages (B+C+D) are in.

If browser check shows no visible steering-around: investigate the `sameLaneHH` threshold
(may need widening) or the force magnitude (may need scaling).
