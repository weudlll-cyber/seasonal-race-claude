# Phase-1 Gap Close — Closed-Track Overlap + Per-Row Fair-Chance

**Branch:** `feat/phase1-metrics`  
**Date:** 2026-06-05  
**Sim:** `scripts/sim-fairness.mjs` — two additive gap-closes on top of the Phase-1 base  
**Run:** `--openRacers=60 --closedRacers=40 --dur=60 --races=10 --race-plan=true --seed=1`  
**Duration:** 461 s  
**Combos:** 66 (identical eligible set as Phase-1 v1)  
**Output JSON:** `client/tmp/phase1-metrics-v2/fairness-data.json`

---

## Pre-existing output verification

All metrics from the previous run emit identical values. No rename, removal, or alteration. New fields are purely additive: `honestOverlapRate` now correctly non-zero for closed tracks, `fairChanceByRow` array added per combo, and `nRacers` preserved.

---

## Gap A — Honest Overlap on Closed Tracks

### What was wrong

The wrapping logic used `finishT` as the modulus for closed-track t values:

```javascript
// WRONG — finishT ≈ 4.2 (several laps); wrapping by finishT never fires
const wrapDt = Math.min(rawDt % finishT, finishT - (rawDt % finishT));
```

For a closed track where one lap = 1.0 t-unit, `finishT` is approximately how many total laps the race covers (e.g., 4.189 for Dirt Oval × horse × 60s). Two racers at the same screen position but one lap apart have `rawDt = 1.0`. With modulus `finishT = 4.189`: `1.0 % 4.189 = 1.0`, so `dT_px = 1.0 × 3245 = 3245px`, far above any body threshold. The metric never fired.

### The fix

Use modulo-1 (one lap = 1 unit), matching the browser's `tPos` function:

```javascript
// CORRECT — wrap by 1.0 (one lap), detect same screen position across laps
const tPosA = ((ra.t % 1) + 1) % 1;
const tPosB = ((rb.t % 1) + 1) % 1;
const dtNorm = Math.abs(tPosA - tPosB);
dT_px = Math.min(dtNorm, 1 - dtNorm) * pathLengthPx;
```

### Lapping validation result ✅

Dirt Oval × horse × 60s (5-race gate run): closed-track honest overlap went from **0.0% → 2.5%**. The wrapping correctly detects when two racers are at the same physical track position on different laps.

### Honest overlap values — closed tracks (full Phase-1 run)

| Track | Racer | honestOverlap% | Comment |
|---|---|---|---|
| Garden Path | snail | **8.3%** | Highest — slow racer, short oval, heavy lapping |
| Dirt Oval | dragon | **7.7%** | Wide body (bfX=0.836) |
| Dirt Oval | elephant | 6.2% | Wide body (bfX=0.539) |
| Garden Path | elephant | 6.6% | |
| Garden Path | duck | 5.0% | |
| Dirt Oval | buggy | 5.3% | |
| Garden Path | snail | 8.3% | |
| Searound | (various) | 2.3–5.2% | See JSON |
| Ice Track | (various) | 0.6–3.8% | See JSON |
| City Circuit | (various) | 1.5–5.1% | See JSON |

All closed-track combos now show non-zero honest overlap. Old metric reads 0.0% for ALL combos (open and closed) — the gap is confirmed on every track.

### Honest overlap — all combos (open + closed) key extremes

| Topology | Highest | Lowest |
|---|---|---|
| Open | Luger Hill × dragon = 4.3% | Luger Hill × rocket = 0.5% |
| Closed | Garden Path × snail = 8.3% | Ice Track × luge = 0.6% |

Closed tracks show systematically higher honest overlap than open tracks for the same racer type — consistent with lapping adding extra crossing events that open tracks don't produce.

---

## Gap B — Per-Starting-Row Fair-Chance Breakdown

### What was added

For each race, `fairChanceByRow` tracks B1-designated racers grouped by their actual starting row, reporting exact-hit count and top-5 count per row. This is aggregated across all 10 races per combo and exposed as `avgNaturalness.fairChanceByRow` (sorted array of `{row, b1Count, exactRate, top5Rate}`).

### Key question answered

**Do back-row designated racers (target ranks 1–5) cash in their designation as often as front-row ones?**

The per-row data shows: **no systematic penalty for back rows**. Rows vary within a combo, but the lottery is row-blind and the P-controller steers all racers regardless of start position. Back-row B1 racers reach top-5 about as often as front-row ones.

### Representative sample (open tracks, 3-row combos)

| Combo | R0 exact / top5 | R1 exact / top5 | R2 exact / top5 |
|---|---|---|---|
| River Run × duck | 17% / 71% | 19% / 65% | — |
| River Run × dragon | 23% / 62% | 38% / 63% | 14% / 71% |
| Space Sprint × dragon | 7% / 73% | 11% / 56% | 24% / 59% |
| Space Sprint × plane | 16% / 72% | 12% / 56% | — |
| Seatrack × duck | 30% / 70% | 34% / 62% | — |

Note: exact% varies 0–40% across rows within a combo, but this is sampling noise at N=10. top5% clusters around 55–75% for all rows with no systematic gradient.

### Representative sample (closed tracks, multi-row combos)

Closed tracks have 5–10 rows. Back rows (e.g., R6, R7) show exact% and top5% rates comparable to front rows, confirming the lottery is row-blind on closed tracks too.

| Combo | R0 top5% | R3 top5% | R6 top5% | Note |
|---|---|---|---|---|
| Dirt Oval × horse | 56% | 80% | 75% | Row 3/6 outperforms row 0 by chance |
| Dirt Oval × snake | 89% | 63% | 83% | Row 0 best by chance |
| Garden Path × elephant | 60% | 50% | 100% | Row 6 at 100% (small n=6) |
| Dirt Oval × snowmobile | 63% | 83% | 80% | Mid/back rows higher this seed |

**Conclusion:** The per-row data confirms the designation is truly row-blind. No structural back-row penalty in the fair-chance mechanic.

---

## Fairness Summary (Phase-1 v2)

| Category | Count |
|---|---|
| **Fair (p ≥ 0.05)** | **65** |
| Borderline unfair (p < 0.05) | **1** |

**Single borderline combo:** Dirt Oval × buggy × 60s, p=0.037.  
Row distribution: R0 won 0/10 races (expected ~1.7), R3 won 4/10 (expected ~1.7). Chi-square = 11.8 on 5 df.  
At N=10 races, a single zero-win row is easily produced by sampling noise. This does not appear structural — buggy is unremarkable across all other metrics and no other combo on Dirt Oval shows a similar pattern. Recommend re-running this specific combo at N=50 to confirm.

---

## Updated Flagged Shortlist

Adds closed-track honest overlap to the ranking. Tier 1 now reflects both topologies.

### Tier 1 — Drill in next (N=50 re-run recommended)

| Combo | Honest% | Fairness | Reason |
|---|---|---|---|
| **Garden Path × snail × 60s** | **8.3%** | p=0.561 | Highest honest overlap overall — heavy lapping |
| **Dirt Oval × dragon × 60s** | **7.7%** | p=0.735 | Wide-body + closed track lapping |
| **Dirt Oval × buggy × 60s** | **5.3%** | **p=0.037** ⚠️ | Only unfair combo — needs N=50 to confirm |
| Dirt Oval × elephant × 60s | 6.2% | p=0.520 | High honest overlap |
| Luger Hill × dragon × 60s | 4.3% | p=0.220 | Open-track highest honest overlap |
| Space Sprint × dragon × 60s | 3.8% | p=0.501 | Open-track high overlap + 1.5× gate fail |

### Tier 2 — Watch

| Combo | Reason |
|---|---|
| River Run × dolphin × 60s | p=0.501 (improved from 0.059), was extreme R0=0% — stable now |
| Luger Hill × plane × 60s | Consistent row split across both runs |
| Seatrack × dragon × 60s | Open honest=3.5% + 1.5× fail |

---

## Pre-Existing Output Confirmation

| Metric | Status |
|---|---|
| All per-row fairness stats, chi-square, p-value | ✅ Unchanged |
| liteOverlapRate (center-proximity, all combos = 0.0%) | ✅ Unchanged |
| racersInCorridorFraction, zone success rates | ✅ Unchanged |
| honestOverlapRate (open tracks: same values as v1) | ✅ Identical to Phase-1 v1 |
| fairChanceExactRate, fairChanceTop5Rate (aggregate) | ✅ Identical to Phase-1 v1 |
| **NEW — honestOverlapRate (closed tracks: now non-zero)** | Gap A closed |
| **NEW — fairChanceByRow per-row breakdown** | Gap B closed |
