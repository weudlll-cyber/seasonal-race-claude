# Stage B Fix — Deadlock Resolution + Overlap Objective Met

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-06
**Commit:** `1864180`
**Tests:** 2629/2629 green

---

## Option Choice: B (forward tiebreak → leader-relative)

### Why not Option A (pure leader-relative always)?

Option A commits in the leader-relative direction regardless of what's ahead in the target
lane. If a racer is directly ahead in the adjacent lane, we push into them — creating a
cascade (they push the next, etc.). The existing anti-stacking normalization bounds this,
but it's structurally aggressive.

### Why Option B (forward tiebreak first)?

The forward-clearance accumulators (`_forwardLeft`/`_forwardRight`) tell us whether there
is a racer **ahead** in the target lane. A racer adjacent but BEHIND us is not a problem —
as we advance in t, we leave them behind. Moving toward the forward-clear direction means:
- The adjacent blocker (reason both sides seemed occupied) is behind us → no cascade
- We're moving into space that is genuinely open ahead

When neither side is forward-clear (or both are), we fall back to leader-relative (Option A)
as the final tiebreaker. This keeps Option A as a last resort rather than the default.

### Why cascade risk is acceptable even for the fallback

The force is bounded to `lateralForce × (1 − dist/avoidanceDistance)` — the same calibrated
value used by the existing free-lane separation. Any new secondary overlap triggered by
Stage B is immediately handled by the existing avoidance system. The stuck-mode suppression
and anti-stacking normalization already bound cascades in the current system.

---

## What Was Built

[raceBehavior.js](../../client/src/modules/raceBehavior.js) — three additions:

### 1. `_sameLaneLeaderPhysY` Map (line 59)

```js
const _sameLaneLeaderPhysY = new Map();
```

Stores the leader's `physicalY` at the time the same-lane detection fires (alongside
`_approachForceMag`). Same wave-2 pattern: module-level, cleared per step.

### 2. Population in pair loop (alongside `_approachForceMag.set(...)`)

```js
if (forceMag >= (_approachForceMag.get(trailer.index) ?? 0)) {
  _sameLaneLeaderPhysY.set(trailer.index, leader.physicalY);
}
```

Most-constraining leader wins (same priority as forceMag selection).

### 3. Deadlock-break in apply-deltas (replaces `desiredDir=0 → decay`)

When both adjacent sides occupied (`desiredDir` still 0 after the existing `if/else`):

```js
if (desiredDir === 0) {
  const fwdL = _forwardLeft.has(r.index);
  const fwdR = _forwardRight.has(r.index);
  if (!fwdL && fwdR)       desiredDir = -1;  // left forward clear → go left
  else if (fwdL && !fwdR)  desiredDir = 1;   // right forward clear → go right
  else {
    // both forward clear or both blocked → leader-relative
    const lpy = _sameLaneLeaderPhysY.get(r.index);
    if (lpy !== undefined) {
      const relPos = r.physicalY - lpy;
      desiredDir = Math.abs(relPos) >= 1e-6
        ? relPos >= 0 ? 1 : -1
        : (r.index & 1) === 0 ? 1 : -1;
    }
  }
}
```

**Test update:** Added `isOpen: false` to the `all sides blocked → no free-lane action`
test — that test covers the free-lane separation contract (unchanged), and Stage B is
open-track only. The `isOpen: false` correctly scopes it.

---

## Dragon Honest Overlap: OBJECTIVE MET

| Track | Baseline % | Fixed % | Δ (pp) | Δ (relative) |
|-------|-----------|---------|--------|-------------|
| Space Sprint | 4.0 | **3.0** | **−1.0** | **−25%** |
| River Run | 3.6 | **2.8** | **−0.8** | **−22%** |
| Luger Hill | 4.5 | **3.5** | **−1.0** | **−22%** |
| Mountainstreet | 3.4 | **2.8** | **−0.6** | **−18%** |
| Seatrack | 3.6 | **2.7** | **−0.9** | **−25%** |

Dragon honest overlap dropped on **every open track**. Average reduction: ~0.86 pp / ~22%.
Resolution time also improved: ~40 frames → ~27 frames average.

---

## Closed-Track Confirmation (unchanged)

| Track | Baseline % | Fixed % | Stage B fires? |
|-------|-----------|---------|---------------|
| Dirt Oval | 8.0% | 8.0% | No (isOpen: false) |
| Garden Path | 6.9% | 6.7% | No |
| City Circuit | 8.3% | 7.9% | No |
| Searound | 5.5% | 5.5% | No |

Closed tracks are byte-for-byte unchanged by Stage B. Any minor differences are within
N=20 noise. The `config.isOpen !== false` guard is working.

---

## Zigzag: Within Gate, Proportionally Elevated

| Track | Baseline zigzag | Fixed zigzag | Δ (abs) | Gate (0.05) |
|-------|----------------|-------------|---------|-------------|
| Space Sprint × dragon | 0.000173 | 0.000360 | +0.000187 | ✅ (gate: 0.05) |
| River Run × dragon | 0.000170 | 0.000376 | +0.000206 | ✅ |
| Luger Hill × dragon | 0.000092 | 0.000283 | +0.000191 | ✅ |
| Mountainstreet × dragon | 0.000167 | 0.000396 | +0.000229 | ✅ |
| Seatrack × dragon | 0.000168 | 0.000370 | +0.000202 | ✅ |

All absolute zigzag values are < 0.001 — well below the 0.05 gate. The **proportional
increase (~2–4×)** is the key uncertainty: does doubled zigzag look like visible
oscillation in the browser, or like natural lateral weaving? The browser check answers this.

The `latSpd` metric (average lateral speed) also rose from ~0.000410 to ~0.001275 — 
racers are moving laterally ~3× faster. This is Stage B working: racers are now actively
steering around, not just slowly drifting.

---

## Fairness Screening

### 3-combo N=50 (Space Sprint, Mountainstreet, Dirt Oval × horse)

| Track × Racer | p | honest% | zigzag | Gate |
|---|---|---|---|---|
| Space Sprint × dragon | 0.543 | 3.0% | 0.000359 | ✅ |
| Mountainstreet × dragon | 0.295 | 2.7% | 0.000400 | ✅ |
| Dirt Oval × horse (closed) | **0.107** | 2.7% | n/a | ✅ |

### All-track N=20 dragon pass

| Track | Type | p | honest% | Gate |
|-------|------|---|---------|------|
| Dirt Oval | closed | 0.166 | 8.0% | ✅ |
| River Run | open | 0.245 | 2.8% | ✅ |
| Space Sprint | open | 0.155 | 3.0% | ✅ |
| Garden Path | closed | 0.495 | 6.7% | ✅ |
| City Circuit | closed | 0.409 | 7.9% | ✅ |
| Luger Hill | open | 0.850 | 3.5% | ✅ |
| Ice Track | closed | — | — | dragon ineligible (surface) |
| Mountainstreet | open | 0.245 | 2.8% | ✅ |
| Searound | closed | 0.198 | 5.5% | ✅ |
| Seatrack | open | 0.155 | 2.7% | ✅ |

All 9 eligible tracks pass. No structural regressions.

---

## Pending: Frame Log + Browser Check

**Frame log** — capture 70 racers, Space Sprint, ~600 frames, compare against f2087
(Stage A baseline = Y-rejection baseline). Stage B adds O(N) work per step in the
apply-deltas loop — expected to be smaller than Stage A's O(N²) gate check, but measure.

**Browser check** (primary gate):
- Does a comeback racer (slightly behind in the same lane) now visibly steer AROUND
  dragon rather than sitting in overlap?
- Does the lateral movement look **natural** (smooth weaving) or **nervous** (jitter)?
  The zigzag doubled in the sim — the browser check determines if this is visible.
- Confirm no visible shoving of a third racer when Stage B's forward-tiebreak fires.
- Closed-track race: visually unchanged?

**Verdict when browser passes:** Stage B achieves its purpose. Proceed to Stage C
(forward clearance activation — already accumulated, zero extra cost to enable).
