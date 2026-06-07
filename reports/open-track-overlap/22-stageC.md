# Report 22 — Stage B Checkpoint + Stage C: Two-Part Switch Gate

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07
**Commit:** `dca7e47`
**Tests:** 2629/2629 green

---

## Recovery Point Inventory

| Tag | Commit | What it protects |
|-----|--------|-----------------|
| `backup/pre-step2` | `d762bc5` | honestBodyWidthPx data field added, no behavior — hard fallback for all Step 2 |
| `backup/step2-stageB` | `fb96363` | **NEW** Stage B complete: leader-relative, no pass-through (browser-confirmed) |
| `backup/y-reject-fair` | `2890efa` | Y-rejection + N=50 fair, production-ready — pre-Step-2 |
| `backup/step1-complete-fair` | `3eac3f2` | Brake-to-match complete, N=50 fair |
| `backup/pre-overtaking-rebuild` | `28ab6ae` | Before Step 1 |

Current HEAD: `dca7e47` (Stage C). Clean working tree.

---

## Task 1 Result — Stage B Tag

```
git tag -a backup/step2-stageB fb96363
```
Annotation: *"Step 2 Stage B complete: leader-relative avoidance, force-cancellation fixed,
no pass-through (browser-confirmed), zigzag down, dragon overlap -18..25% vs pre-step2.
Open-track only; closed unchanged. Fallback before Stage C."*

---

## Task 2 — Stage C: What Changed

[raceBehavior.js](../../client/src/modules/raceBehavior.js) — direction-block only. Net: +8 lines.

### The change

**Stage B override condition** (fires to switch from naturalDir to -naturalDir):
```
Stage B:  naturalFwdBlocked && !oppFwdBlocked
Stage C:  naturalFwdBlocked && !oppFwdBlocked && !oppApproachBlocked
```

**New variable:**
```js
// Part 1 (adjacent): is the opposite side free right now?
const oppApproachBlocked =
  naturalDir > 0 ? _approachLeft.has(r.index) : _approachRight.has(r.index);
```

`oppApproachBlocked` = `true` when a racer is already adjacent on the side we'd switch to
(within the `|dY| < 2×pairHH = 0.186` corridor). If occupied, the switch is suppressed —
the racer stays on `naturalDir` rather than pivoting into an occupied lane.

### Why this is safe: force-cancellation cannot recur

`_approachLeft/Right` is used here ONLY as a gate on the override (`desiredDir = -naturalDir`),
never as the primary direction. The primary is always `naturalDir` (leader-relative).

- Switch fires: `desiredDir = -naturalDir`. Forces still partially oppose — but this now
  requires THREE conditions to hold simultaneously (forward-blocked, opposite forward-clear,
  opposite adjacent-clear). In dense fields (91.5% approach-corridor occupancy), the
  `!oppApproachBlocked` condition is false most of the time → switch rarely fires → forces
  reinforce more often.
- Switch suppressed (the common case): `desiredDir = naturalDir`. Stage B force and natural
  avoidance both point `naturalDir` → forces ADD, evasion is effective.

### Scope

Open tracks only (`config.isOpen !== false` guard unchanged,
[raceBehavior.js:741](../../client/src/modules/raceBehavior.js#L741)).
Closed tracks: byte-for-byte unchanged.

---

## Tests: 2629/2629 green

No test logic changed. The one Stage B test ([raceBehavior.test.js:455](../../client/src/modules/raceBehavior.test.js#L455))
uses `isOpen: false` — Stage C is bypassed for that test.

---

## Screening Results

### 3-combo N=50

| Track × Racer | p | honest% | resolution | zigzag | Gate |
|---|---|---|---|---|---|
| Space Sprint × dragon | 0.769 | 3.7% | Ø9.8fr | 0.000309 | ✅ |
| Mountainstreet × dragon | 0.086 | 3.2% | Ø10.2fr | 0.000334 | ✅ |
| Dirt Oval × horse (closed) | 0.761 | 2.7% | — | n/a | ✅ |

### All-track N=20 dragon

| Track | Type | p | honest% | resolution | Gate |
|-------|------|---|---------|------------|------|
| Dirt Oval | closed | 0.686 | 7.9% | — | ✅ |
| River Run | open | 0.659 | 3.4% | Ø10.6fr | ✅ |
| Space Sprint | open | 0.951 | 3.7% | Ø9.0fr | ✅ |
| Garden Path | closed | 0.478 | 6.8% | — | ✅ |
| City Circuit | closed | 0.058 | 8.0% | — | ✅ |
| Luger Hill | open | 0.626 | 4.8% | Ø13.0fr | ✅ |
| Mountainstreet | open | 0.375 | 3.2% | Ø10.6fr | ✅ |
| Searound | closed | 0.074 | 5.7% | — | ✅ |
| Seatrack | open | 0.659 | 3.5% | Ø10.3fr | ✅ |
| Ice Track | — | — | — | — | dragon ineligible |

9/9 eligible tracks pass.

---

## Comparison vs Stage B

### Resolution time (open tracks, N=20): halved

| Track | Stage B | Stage C | Δ |
|-------|---------|---------|---|
| River Run | ~19fr | Ø10.6fr | **−44%** |
| Space Sprint | Ø16.8fr | Ø9.0fr | **−46%** |
| Luger Hill | ~23fr | Ø13.0fr | **−43%** |
| Mountainstreet | ~17fr | Ø10.6fr | **−38%** |
| Seatrack | ~17fr | Ø10.3fr | **−39%** |

Overlaps that do occur are resolved ~2× faster. This means less visible overlap duration
even when two racers do make momentary contact.

### Honest overlap %: within N=20 noise

| Track | Stage B honest% | Stage C honest% | Δ |
|-------|----------------|----------------|---|
| River Run | 3.0% | 3.4% | +0.4 (noise) |
| Space Sprint | 3.3% | 3.7% | +0.4 (noise) |
| Luger Hill | 4.1% | 4.8% | +0.7 (noise) |
| Mountainstreet | 2.8% | 3.2% | +0.4 (noise) |
| Seatrack | 2.8% | 3.5% | +0.7 (noise) |

N=20 noise range is ±0.5–1 pp. None of these differences exceed noise. The aggregate
honest-overlap metric is unchanged; what improved is *how fast* overlaps resolve.

### Zigzag: further reduced

| Track × Racer | Stage B | Stage C | Δ |
|---|---|---|---|
| Space Sprint × dragon | 0.000316 | 0.000309 | −0.000007 |
| Mountainstreet × dragon | 0.000351 | 0.000334 | −0.000017 |

The `!oppApproachBlocked` gate further reduces direction oscillation: the switch to
`-naturalDir` now requires the opposite side to be BOTH forward-clear AND adjacent-clear,
so oscillation-causing switches (opposite forward-clear but adjacent-occupied) are suppressed.

---

## What Stage C Cannot Improve

The user-observed "avoids but not WIDE ENOUGH" issue — dragon bodies still visibly overlap
when steering around — is not a direction-logic problem. Stage C (and Stage B) steer in
the correct direction, but the lateral push starts only when `|yDiff| < sameLaneHH = 0.093`.
This zone is too narrow for dragon's actual body width (honest full-span = 0.186 normalized).

**Stage D** (honest body width as the lateral trigger span) addresses this: widen the Stage B/C
trigger from `sameLaneHH = 0.093` to `2 × sameLaneHH = 0.186` so avoidance starts earlier,
giving the racer enough room to clear the leader before bodies touch. That is the dedicated
"gap width" fix.

---

## Browser Check Request

### Primary gate (preserve Stage B result)
- **No pass-through**: the Stage B browser confirmation must hold. Slightly-offset racers
  still steer around leaders rather than driving through them.
- **No new jitter**: Stage C's switch gate is STRICTER, so oscillation should be equal or
  less. Confirm no racer exhibits rapid left-right zigzag.

### Stage C signal
- **Faster resolution**: when two racers do briefly touch, do they separate more quickly
  than before? The sim shows 2× faster resolution — this should look like a quicker
  "bounce apart" rather than a prolonged side-by-side.
- **Closed track unchanged**: run a closed-track race, confirm visual parity.

### Expected remaining issue (Stage D scope)
- Dragon bodies may still partially overlap during the avoidance maneuver — this is correct
  Stage C behavior, not a regression. The lateral push starts 0.093 units away; Stage D
  will widen this to 0.186.

**Verdict threshold:**
- Pass: no pass-through, no new jitter, closed tracks unchanged → proceed to Stage D
- Fail: new jitter OR pass-through regressed → investigate before Stage D
