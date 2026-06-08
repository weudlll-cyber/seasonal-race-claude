# Report 44 — Speed-Brake Lateral Term: Conceptual Analysis

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-08
**Status:** Conceptual diagnosis only. No code change. Fix direction identified.

---

## Verdict in one sentence

The lateral term in the speed-brake is **conceptually correct** as a same-lane filter, but the current threshold value is not body-calibrated, and the previous body-based attempt used the **wrong multiplier** (1.5× — a longitudinal concept with no meaning for a lateral same-lane test).

---

## Task 1 — What the lateral term actually does

**Code, `raceBehavior.js:521`:**
```javascript
if (Math.abs(dY) < config.speedBrakeYThreshold && dT < dynamicBrakeT) {
    speedBrakeSet.add(trailer.index);
```

`dY = rA.physicalY - rB.physicalY` is the normalized lateral separation.
`speedBrakeYThreshold = 0.18` (from `defaults.js`).

On a 300 px track: `0.18 × 150 = 27 px`. The condition fires when the trailer is within **27 px laterally** AND within `dynamicBrakeT` longitudinally behind the leader.

**The lateral term gates entry into the speed-brake set.** Increasing `speedBrakeYThreshold` directly increases the fraction of pairs that enter the set → higher `brake%`. Decreasing it reduces the set → lower `brake%`. This is the mechanism that caused the luge regression when we tried `contactWidth × 1.5 = 37.5 px` on a 250 px track (all adjacent pairs fit inside).

**Is this (a) a same-lane filter or (b) a lateral brake-driver?**

It is **(a) a same-lane filter** — correctly so. The `dT < dynamicBrakeT` condition already ensures we are only looking at a pair where one racer is longitudinally behind the other. The lateral condition then asks: "Is the trailer close enough laterally that it will actually rear-end the leader, or is it passing in a different lane?"

Without the lateral term, a racer passing at physicalY = +0.8 would trigger the speed-brake for every single racer at the same longitudinal position — regardless of whether a collision is even possible. The lateral filter prevents that.

**However**, the threshold (0.18 → 27 px) is a track-fraction constant, not calibrated to body width. For slim racers the threshold is too wide (rocket body is 14 px, yet the filter admits pairs up to 27 px apart — nearly 2 body-widths of free space). For medium racers it happens to be approximately correct (dragon body 28.5 px ≈ 27 px threshold).

---

## Task 2 — Why body-based with ×1.5 broke wide racers

**The attempted fix** used `contactWidth × speedBrakeTMultiplier = contactWidth × 1.5` as the lateral threshold (`brakeContactWidth × 1.5` in report 43).

| Racer | Body contact width | ×1.5 | Old threshold (0.18×halftrack) | Direction |
|---|---|---|---|---|
| Rocket | 14 px | **21 px** | 27 px | Narrower ✓ |
| Dragon | 28.5 px | **42.75 px** | 27 px | Wider ✗ |
| Luge (~250px track) | ~25 px | **37.5 px** | 22.5 px | 67% wider ✗ |

For the luge on the 250 px track: row spacing ≈ 237.5 / (60/7) ≈ 27.6 px. Old threshold 22.5 px → most adjacent pairs were **outside** the threshold (27.6 > 22.5 → no brake). New threshold 37.5 px → all adjacent pairs **inside** (27.6 < 37.5 → all brake). The entire field was suddenly speed-braking. Luge brake jumped from 70% to 90.6%, p dropped from 0.057 to 0.004.

**The fundamental error:** `speedBrakeTMultiplier = 1.5` has a specific meaning in the longitudinal dimension: the brake zone should have *lead time* — fire while bodies are still 1.5× further apart than contact, giving the trailer time to slow down. This expansion is intentional and appropriate for the longitudinal axis.

For the **lateral** axis, no expansion is needed. The question is binary: "Are these bodies in the same lane?" The answer is yes when the lateral gap is less than the combined body widths (= `contactWidth`). There is no "lead time" concept for lateral proximity — either the bodies will collide if no lateral action is taken, or they will not.

Applying `×1.5` to the lateral threshold treated it as a zone-size expansion when it is actually a same-lane boolean.

---

## Task 3 — Correct design: lateral ≠ brake

The user's principle: **lateral proximity does not cause braking; braking is caused by a longitudinal obstacle in the same lane.**

This is exactly what the code should express:

```
brake = (longitudinally close ahead) AND (in the same lane)
```

- `dT < dynamicBrakeT` → longitudinally close, same direction: ✓ already body-calibrated (report 43)
- `Math.abs(dY) < threshold` → in the same lane: needs to be `threshold = contactWidth / trackHalfWidth` exactly (no expansion)

The lateral term should be a **narrow same-lane boolean**, not a zone that scales with how much room racers have to pass each other. The `×1.5` confused "same lane?" with "within a comfortable passing distance?" — different questions.

**Correct threshold:** `latPx < contactWidth` where `contactWidth = hwA + hwB` (sum of body half-widths from `pairContact`). In normalized terms: `|dY| < pxToPhysicalY(contactWidth, trackWidth)`.

| Racer | `contactWidth` | Correct lateral | Old (0.18×halftrack) |
|---|---|---|---|
| Rocket | 14 px | **14 px** (= bodies touching) | 27 px (too wide) |
| Dragon | 28.5 px | **28.5 px** | 27 px (~same) |
| Luge (~250px) | ~25 px | **25 px** | 22.5 px (~same) |

This would:
- Fix the rocket (14 px vs 27 px — halved): rocket brake% would drop significantly beyond what the longitudinal fix alone achieved
- Leave dragon virtually unchanged (28.5 ≈ 27 px — 1.5 px difference)
- Leave luge virtually unchanged (25 ≈ 22.5 px — 2.5 px wider, negligible)

Note: `contactWidth` alone (`×1.0`) means "trigger at the moment of lateral contact." A very small buffer (e.g., `×1.1` = 10%) would give a one-frame margin before actual collision. This is much smaller than the current 0.18 threshold for slim racers and does NOT use `speedBrakeTMultiplier` at all.

---

## Task 4 — Is `isSideFree` / the gate already handling lateral neighbors?

Yes, with a crucial scope difference:

**Gate (avoidance force, `raceBehavior.js:582–622`):**
- Fires when: `latPx < contactWidth × 1.2 AND longPx < contactLength × 1.2` (both axes inside buffered contact zone)
- Effect: lateral force pushes racers apart
- Zone: approaching contact from both dimensions

**Free-lane / `isSideFree` (`raceBehavior.js:243–255`, `627–695`):**
- Fires when: `dT ≤ tHalfSpan AND |dY| ≤ lateralHalfSpan` (bodies overlapping)
- `isSideFree` checks: "If I move one body-width in direction `dir`, is there another racer in the way?"
- Effect: directional lateral impulse toward the free side
- Zone: bodies already overlapping

**Speed-brake (`raceBehavior.js:511–580`):**
- Fires when: `|dY| < 0.18 (27px) AND dT < dynamicBrakeT (38.5px)`
- Effect: adds trailer to `speedBrakeSet` → speed floor applied later; caps trailer at leader's speed (brake-to-match)
- Zone: wider than gate, outside overlap zone (lead-time)

These three answer **different questions at different stages**:
1. Brake: "I'm behind someone in roughly the same lane and approaching — should I slow down?" (lead time, before contact)
2. Gate: "I'm near contact — what lateral force should push me away?" (approach correction)
3. Free-lane: "I'm overlapping — which way is free?" (overlap resolution)

The lateral term in the speed-brake is NOT duplicated by `isSideFree` or the gate. `isSideFree` checks whether there's a third racer blocking a lateral escape route (not whether the pair itself is in the same lane). The gate handles approach correction (not braking). There is no double-handling — they are distinct mechanisms.

However: if a racer is clearly in a different lane (large lateral gap, clearly passing), neither the gate nor `isSideFree` should be affected — and the speed-brake's lateral filter correctly prevents braking in that case. The filter IS necessary. It just needs the right threshold.

---

## Summary

| Question | Answer |
|---|---|
| Is the lateral term a same-lane filter or brake-driver? | Same-lane filter — conceptually correct |
| Is "lateral ≠ brake" violated? | No in concept, yes in calibration: 27 px is too wide for slim racers |
| Why did `×1.5` break wide racers? | Wrong multiplier: lateral needs no lead-time expansion; `×1.5` is a longitudinal concept |
| What is the correct lateral threshold? | `contactWidth = hwA + hwB` (no multiplier), optionally `×1.1` for a one-frame margin |
| Does `isSideFree` / gate already cover this? | No — different mechanisms, different zones, no double-handling |
| Does this block merge? | User decision — the fix is identified but not applied |

---

## Fix direction (not implemented yet)

Replace `config.speedBrakeYThreshold` with the body-contact width in the lateral same-lane check:

```javascript
// Current (normalized, not body-calibrated):
if (Math.abs(dY) < config.speedBrakeYThreshold && dT < dynamicBrakeT)

// Proposed (body-based, same-lane boolean, NO expansion multiplier):
const brakeContactWidth = hwA_b + hwB_b;   // hwA_b/hwB_b from pairContact half-widths
const brakeLatThreshold = trackWidth > 0
  ? pxToPhysicalY(brakeContactWidth, trackWidth)  // exact contact width, ×1.0
  : config.speedBrakeYThreshold;
if (Math.abs(dY) < brakeLatThreshold && dT < dynamicBrakeT)
```

Effect at `×1.0`:
- Rocket on 300 px track: 14 px threshold vs current 27 px — significant reduction
- Dragon on 300 px track: 28.5 px vs current 27 px — ~1.5 px wider, negligible
- Luge on 250 px track: 25 px vs current 22.5 px — ~2.5 px wider, expected to be safe

This change can be made in the same edit that already added `hlA_b`/`hlB_b` (report 43), just adding `hwA_b`/`hwB_b` back. The 1.5× failure was solely the multiplier — the concept was correct.

Whether to use `×1.0` exactly or `×1.1` (one-frame margin) is a tuning decision. The key constraint is: multiplier must be small enough that wide racers on narrow tracks don't expand beyond the old threshold. For luge on 250px track to not exceed 22.5px: `25 × factor < 22.5` → `factor < 0.9` — actually `×1.0` already slightly exceeds 22.5px for the luge. So `contactWidth × 1.0 ≈ 25px` vs `22.5px old` — 11% wider. This is modest and unlikely to cause the saturation seen with `×1.5` (67% expansion for luge).
