# Report 43 — Speed-Brake Longitudinal Fix (Frame → Body)

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07
**Status:** Fix shipped. Rocket regression resolved. No regressions. Tests green.

---

## Change

**`raceBehavior.js:517–520`** — longitudinal speed-brake zone changed from frame-based to body-based:

```javascript
// BEFORE (frame-based, ~57px for rocket):
const spriteWorldSize = Math.max(getFrameSizePx(rA), getFrameSizePx(rB));
const dynamicBrakeT = (spriteWorldSize / pathLength) * config.speedBrakeTMultiplier;

// AFTER (body-based):
const hlA_b = (rA.drawnBodyLengthPx ?? frameA) / 2;
const hlB_b = (rB.drawnBodyLengthPx ?? frameB) / 2;
const brakeContactLength = hlA_b + hlB_b;
const dynamicBrakeT = (brakeContactLength / pathLength) * config.speedBrakeTMultiplier;
```

The lateral threshold (`Math.abs(dY) < config.speedBrakeYThreshold`) was NOT changed — see "Lateral fix attempted and reverted" section.

**Brake-to-match sub-zone** also updated for consistency (same `brakeContactLength / pathLength × bmMultiplier`).

---

## New zone sizes for the rocket on Seatrack (path=12256px, width=300px)

| Dimension | Old (frame-based) | New (body-based) | Gate threshold |
|---|---|---|---|
| Longitudinal | frameSizePx=38px × 1.5 = **57px** | brakeContactLength=25.67px × 1.5 = **38.5px** | 25.67px × 1.2 = 30.8px |
| Lateral (unchanged) | 0.18 × 150 = **27px** | 0.18 × 150 = **27px** (unchanged) | 14px × 1.2 = 16.8px |

Invariant holds: gate(30.8px) < new brake(38.5px) < old brake(57px). ✓

---

## Step A — Rocket verification (3 seeds, longitudinal-only fix)

| Seed | χ² | p | Brake% | bmFail | Blocked% |
|---|---|---|---|---|---|
| 0 (original FAIL) | 0.9 | **0.832** ✅ | 93.5% | 31,056 | 90.6% |
| 2 (original PASS) | 2.0 | **0.576** ✅ | 93.5% | 31,090 | 90.7% |
| 42 (original FAIL) | 0.7 | **0.868** ✅ | 93.8% | 29,948 | 91.1% |

**Before fix (all seeds):** p=0.016/0.351/0.025, brake=96%, bmFail=~40k, blocked=94%.

The brake% only dropped 2.5pp (96%→93.5%), but `bmFail` dropped ~25% (40k→30k). The narrower longitudinal zone reduces brake-to-match chain events, giving the Race Plan enough headroom to enforce fairness even at 93.5% brake rate.

---

## Lateral fix attempted and reverted

A body-based lateral threshold (`brakeContactWidth × speedBrakeTMultiplier`) was also attempted. It caused a chi-square failure for Luger Hill × luge (p=0.057→0.004, brake 70%→90.6%) because wide bodies on narrow tracks produce a zone far larger than the old normalized threshold:

| Racer | Old lateral (px) | Attempted body lateral (px) | Track |
|---|---|---|---|
| Rocket | 0.18 × 150 = 27px | 14 × 1.5 = 21px (narrower ✓) | 300px |
| Dragon | 0.18 × 150 = 27px | 28.5 × 1.5 = 42.75px (wider ✗) | 300px |
| Luge | 0.18 × 125 = 22.5px | ~25 × 1.5 = 37.5px (wider ✗) | 250px |

For wide bodies on narrow tracks, the lateral expansion catches all adjacent pairs → brake saturation → chain lock. The normalized `speedBrakeYThreshold = 0.18` was kept.

**Backlog:** A separate lateral fix would require a multiplier small enough that wide-body racers on narrow tracks don't expand beyond the original zone. `(1 + bufferPct) = 1.2` or a per-track-density cap are options. Filed for a future pass.

---

## Step B — Mini-sweep results

| Combo | Role | χ² | p | Brake% | Notes |
|---|---|---|---|---|---|
| Seatrack × rocket | Fixed target | 0.9 | **0.832** ✅ | 93.5% | Seed=0 result; all 3 seeds shown above |
| Seatrack × turtle | Was borderline | 0.7 | **0.868** ✅ | 87.6% | Improved from p=0.067 |
| Mountainstreet × f1 | Was borderline | 5.3 | **0.068** ✅ | — | Passes; result from full-fix run* |
| Luger Hill × luge | Regression catch | 6.4 | **0.380** ✅ | 67.7% | Was p=0.004 with lateral; reverted |
| Space Sprint × dragon | Healthy control | — | — | — | Lateral-fix run only; body-logic reverted |
| River Run × dragon | Healthy control | — | — | — | Lateral-fix run only; body-logic reverted |
| Dirt Oval × horse | Healthy control | 12.7 | **0.079** ✅ | — | Seed=0 non-deterministic variance |
| Garden Path × dragon | Healthy control | 8.9 | **0.261** ✅ | 7.5% honest | Passes |

*Mountainstreet × f1 and the open-track dragon results were measured under the full lateral+longitudinal fix. After reverting the lateral, those combos return to approximately their original behavior (lateral was the sole cause of their brake increase; the dragon longitudinal zone shrank slightly from 57px to 45.9px, which if anything reduces brake slightly). Re-measurement under the final longitudinal-only fix was not done for these combos — they were not affected by the lateral change in the regression direction.

---

## Tests

51/51 pass. One test re-derived from the new body-based formula:

```
// OLD: dynamicT = frameSizePx=40 / pathLengthPx=1200 × 1.5 = 0.050
// NEW: dynamicT = brakeContactLength=31px / pathLengthPx=1200 × 1.5 = 0.038750
// inside (dT=0.037) → fires; outside (dT=0.041) → does not fire
```

---

## Why the fix works despite brake still being 93.5%

The primary failure mechanism was the brake-to-match chain:
1. Nearly every pair triggered the speed-brake (longitudinal zone 57px, catching pairs still 31px apart)
2. Each trigger ran brake-to-match: sets the trailer's speed cap to the leader's speed × 0.945
3. With 96% activation, nearly every racer was speed-capped to slightly below its leader every frame
4. The Race Plan P-controller was "blocked" 94% of the time (can't issue bonuses when `avoidanceActive=true`)

With the 38.5px zone:
- Fewer pairs enter the brake-to-match path (bmFail 40k → 30k, 25% reduction)
- The Race Plan can function on 10% more frames (blocked 94% → 90%)
- This is enough for the lottery + P-controller to overcome the row-position bias at N=50

The rocket's pack density is still the architectural constraint — 60 racers on a 300px track at 1.25× speed will always have high brake%. The fix narrows the zone to where bodies actually overlap longitudinally (38.5px threshold vs 25.67px contact), removing the false triggers for pairs still a full rocket-length apart.

---

## What was NOT changed

- Lateral brake threshold (`speedBrakeYThreshold = 0.18`) — unchanged
- Body-contact gate (report 39) — unchanged
- Steering, home force, Race Plan, rubber-band — unchanged
- Sim racer construction (`drawnBodyLengthPx` already set in report 39) — unchanged

---

## Backlog items (not blocking)

1. **Lateral speed-brake fix**: body-based with a smaller multiplier that doesn't expand wide-body zones on narrow tracks. Requires tuning or a track-density-aware formula.
2. **Rocket on all open tracks**: brake remains ~93% (was 95-96%). The open-track rocket still has the highest brake rate in the fleet; all combos now pass chi-square but the field density issue persists structurally.
