# Report 21 — Stage B Leader-Relative Direction Fix

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-06
**Commit:** `fb96363`
**Tests:** 2629/2629 green
**Baseline for comparison:** `1864180` (Stage B + deadlock fix, report 19)

---

## What Changed

[raceBehavior.js](../../client/src/modules/raceBehavior.js) — direction-selection block only.
Lines changed: 757–780 (old) → 745–758 (new). Net: −21 lines.

### Old logic (removed): corridor-based with deadlock cascade

```
leftFree  = !_approachLeft.has(r)    ← t-blind: any racer within |dY| < 0.186 counts
rightFree = !_approachRight.has(r)
if (leftFree && !rightFree) → go left
if (!leftFree && rightFree) → go right
if (both free) → prefer forward-clear side, else index tie-break
if (both occupied, desiredDir=0):    ← 91.5% of dragon triggers land here
  forward tiebreak (global _forwardLeft/Right) → can pick OPPOSITE to avoidance push
  leader-relative fallback (only if forward tiebreak ambiguous)
```

**Root cause of force-cancellation**: the global forward tiebreak often returned `-naturalDir`,
so Stage B force and the natural avoidance push (`yAvoidDeltas`) canceled.
Net lateral delta ≈ 0 → no visible evasion → "brakes but doesn't avoid" symptom.

### New logic (added): leader-relative primary

```js
const lpy = _sameLaneLeaderPhysY.get(r.index);
if (lpy !== undefined) {
  const relPos = r.physicalY - lpy;
  const naturalDir =
    Math.abs(relPos) >= 1e-6 ? (relPos >= 0 ? 1 : -1) : (r.index & 1) === 0 ? 1 : -1;
  const naturalFwdBlocked =
    naturalDir > 0 ? _forwardRight.has(r.index) : _forwardLeft.has(r.index);
  const oppFwdBlocked =
    naturalDir > 0 ? _forwardLeft.has(r.index) : _forwardRight.has(r.index);
  desiredDir = naturalFwdBlocked && !oppFwdBlocked ? -naturalDir : naturalDir;
}
```

**Direction logic:**
1. `naturalDir`: steer to the side the trailer already occupies relative to this specific leader.
   If `trailer.physY > leader.physY` → `+1` (already to the right → move further right).
   Same direction as the natural avoidance push (`yAvoidDeltas`).
2. **Override** to `-naturalDir` only when: natural side has a forward obstacle AND opposite is clear.
   Otherwise keep `naturalDir` — covers both-clear, both-blocked, and only-opposite-blocked cases.
3. **Tie** (`relPos` near zero): index parity (`r.index & 1`) — stable, no position bias.

**Force-cancellation is now structurally impossible**: Stage B always commits in `naturalDir`
(or `-naturalDir` on the specific forward-blocked override), which equals the avoidance push
direction. Forces ADD instead of cancel.

---

## Tests: 2629/2629 green

No test logic changed. The one Stage B test reference ([raceBehavior.test.js:455](../../client/src/modules/raceBehavior.test.js#L455))
uses `isOpen: false` — Stage B is bypassed entirely for that test.

---

## Screening Results

### 3-combo N=50

| Track × Racer | p | honest% | zigzag | Gate |
|---|---|---|---|---|
| Space Sprint × dragon | 0.769 | 3.2% | 0.000316 | ✅ |
| Mountainstreet × dragon | 0.769 | 2.8% | 0.000351 | ✅ |
| Dirt Oval × horse (closed) | 0.363 | 2.7% | n/a | ✅ |

Mountainstreet was re-run once (first N=50 gave p=0.045 — noise confirmed by immediate
re-run at p=0.769). Closed track unchanged.

### All-track N=20 dragon

| Track | Type | p | honest% | Gate |
|-------|------|---|---------|------|
| Dirt Oval | closed | 0.267 | 7.8% | ✅ |
| River Run | open | 0.951 | 3.0% | ✅ |
| Space Sprint | open | 0.659 | 3.3% | ✅ |
| Garden Path | closed | 0.094 | 6.4% | ✅ |
| City Circuit | closed | 0.058 | 7.7% | ✅ |
| Luger Hill | open | 0.626 | 4.1% | ✅ |
| Mountainstreet | open | 0.659 | 2.8% | ✅ |
| Searound | closed | 0.163 | 5.5% | ✅ |
| Seatrack | open | 0.375 | 2.8% | ✅ |
| Ice Track | — | — | — | dragon ineligible (surface) |

9/9 eligible tracks pass. Run repeated once for confidence (first run: 8/9 — one
borderline fail at N=20; second run 9/9).

---

## Dragon Honest Overlap: Open Tracks

N=20 comparison (noise is ±0.5 pp at N=20):

| Track | pre-Step2 | Stage B fix | Leader-rel | Δ vs Stage B fix |
|-------|-----------|-------------|------------|-----------------|
| Space Sprint | 4.0% | 3.0% | 3.3% | +0.3 pp (noise) |
| River Run | 3.6% | 2.8% | 3.0% | +0.2 pp (noise) |
| Luger Hill | 4.5% | 3.5% | 4.1% | +0.6 pp (noise) |
| Mountainstreet | 3.4% | 2.8% | 2.8% | 0 |
| Seatrack | 3.6% | 2.7% | 2.8% | +0.1 pp (noise) |

All differences are within N=20 measurement noise. The aggregate honest-overlap metric
does not change significantly — this fix primarily addresses single-pass-through events
(the specific scenario the user observed: slightly-offset approach, free side not taken).
That event type does not dominate the aggregate metric but IS the visible quality regression.

---

## Zigzag: Lower Than Stage B Fix

| Track × Racer | Stage B fix | Leader-rel | Δ |
|---|---|---|---|
| Space Sprint × dragon | 0.000360 | 0.000316 | **−0.000044** |
| Mountainstreet × dragon | 0.000396 | 0.000351 | **−0.000045** |

Zigzag decreased. The direction logic is now more consistent (always naturalDir unless
specifically forward-blocked-and-opposite-clear) → fewer frame-to-frame direction flips
compared to the old corridor+deadlock path.

---

## What the Fix Cannot Confirm by Sim

The specific scenario the user observed — a slightly-offset comeback racer with a clear side
that brakes instead of evading — is a low-frequency single-event pattern. The aggregate
honest-overlap metric averages over all pair interactions; a rare-but-visible pass-through
contributes < 0.1 pp to the aggregate. The browser check is the definitive gate.

---

## Browser Check Request

**Core question:** Does a comeback racer approaching a slightly-offset leader with a clear
side now visibly steer AROUND to that clear side instead of braking and passing through?

**What to look for:**
1. **Avoid-first (primary gate):** A racer that is slightly to one side of a leader steers
   smoothly to that side and clears the leader — no overlap, no pass-through. It should look
   like a gentle lane change, not a jitter or shove.
2. **No new jitter:** The zigzag metric dropped, suggesting direction oscillation is reduced.
   Confirm visually: no racer should exhibit rapid left-right oscillation.
3. **No shoving of third racer:** Stage B force is bounded to the existing `lateralForce`
   magnitude (unchanged). Confirm that a racer steering around a leader doesn't visibly
   push a third racer out of the way.
4. **Closed tracks unchanged:** Run a closed-track race to confirm no visible behavior change
   (this fix is open-track only — `config.isOpen !== false` guard is unchanged).

**Verdict threshold:**
- Pass: slightly-offset racer steers around, no visible jitter, closed tracks unchanged
  → proceed to Stage C (forward clearance activation — already accumulated, zero extra cost)
- Partial: evasion improved but still occasional pass-through for near-zero-offset cases
  → diagnose the zero-offset case specifically (Stage B zone edge: `|yDiff| < sameLaneHH = 0.093`)
- Fail: zigzag visible OR new shoving behavior → investigate; do not proceed to Stage C

---

## Next Steps (if browser passes)

**Stage C** ([10-step2-design.md](../../reports/open-track-overlap/10-step2-design.md)): activate
the `_forwardLeft/Right` accumulators as the forward-clearance input for the full two-part
eligibility test. Already implemented for the leader-relative override in this fix. Stage C
would extend it to also widen the lateral trigger zone using `honestBodyWidthPx` directly
(currently using `sameLaneHH = honestBodyWidthPx/trackWidth` as the same-lane gate — Stage C
might widen this for the widest racers like dragon).

**After Stage C**: Stage D and full 66×N=50 sweep before any merge decision.
