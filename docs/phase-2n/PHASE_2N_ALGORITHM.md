# Phase 2N — Algorithm Summary & Structural Analysis

**Goal:** 8/9 configs (3 racers × r40/r70/r100) pass the 1.5× gate at N=50 for every open track.

**Gate:** Every row in the range [exp./1.5, exp.×1.5]  
**Fixed parameters:** avoidanceWarmupMs=0, dur=60s, v4MetricType=per_racer, v4ThresholdActive=true  
**Thresholds:** Row1=20/40/60, Row2+=20/40/70  
**Schedule:** Third-scheme: [B, 1+(B-1)×2/3, 1+(B-1)×1/3, 1.0]

---

## Results

| Track                       | Best N=50                       | at boost | Conclusion      |
| --------------------------- | ------------------------------- | -------- | --------------- |
| Space Sprint (air, 19772px) | **2/9** — rocket@r40, plane@r40 | 1.082    | Not convergible |
| Weltall (air, 15986px)      | **0/9**                         | —        | Not convergible |
| River Run (water, 6156px)   | **0/9** (N=10)                  | —        | Not convergible |

---

## Iteration overview

### Space Sprint — 9 iterations

boost: 1.07 → 1.10 → 1.085 → 1.07(thresholds) → 1.07(thresholds) → 1.075 → 1.09 → 1.082 → 1.086  
Best result at 1.082: rocket@r40 ✅, plane@r40 ✅; all others ❌  
N=50 total: 2/9

### Weltall — 2 iterations

boost: 1.082 → 1.09  
Best result: 0/9 at N=50 (both iterations)  
Theoretical maximum: 7/9 (dragon@r40 near fair, all r70/r100 possibly at higher boost)

### River Run — 3 iterations

boost: 1.15 → 1.10 → 1.13  
Best result: 0/9 at N=10 (structurally non-convergent)

---

## Structural limitations

### 1. Cross-racercount incompatibility

Each racercount (r40/r70/r100) produces a different number of rows for each racer:

**Space Sprint example:**

| Racer  | r40    | r70    | r100   |
| ------ | ------ | ------ | ------ |
| dragon | 3 rows | 5 rows | 6 rows |
| rocket | 2 rows | 4 rows | 5 rows |
| plane  | 2 rows | 4 rows | 5 rows |

The more rows, the higher the required boost for rear rows. The boost optimum for r100 always lies higher than for r40. The ranges do not overlap.

**Measured boost optima (approximate):**

- r40 (2-4 rows): optimal ~1.082-1.090
- r70 (4-6 rows): optimal >1.09
- r100 (5-9 rows): optimal >1.10+

### 2. Very small last-row racer count

For some combinations the last rows have extremely few racers:

**Example rocket@Weltall-r40:**

- Row 0: 950 racers, Row 1: 950 racers, **Row 2: 100 racers (5%)**
- Gate minimum: 22.2% × 50 races = 11.1 races
- Baseline expectation (no boost): 2/40 × 50 = 2.5 races
- **Required factor: 4.4× — structurally unreachable**

Row-2 stays at 6% win rate regardless of boost (measured at 1.082 AND 1.09).

### 3. Boost exhaustion at deep rows

The v4 per_racer mechanism exhausts the bonus after reaching the overtaking thresholds (20%/40%/70%). At high racercounts, rear rows must overtake very many racers:

**Example dragon@River Run-r100 (9 rows):**

- Row-8 racers must overtake 80%+ of the field
- Row-8 bonus end: none=60% (60% lose bonus completely before race end)
- Despite boost, Row 8 wins: 0% of races (expected 11.1%)

At v4 per_racer Row-7 60%-threshold: avg 44.5s (of 60s) — only reached after ~75% of race time. No more boost for the final 15s.

### 4. Boost shifts primarily R0→R1, not R0→R2+

The largest boost effect is redistribution of wins from Row 0 (front) to Row 1:

- Row 0 loses 20-30% win rate per 0.01 boost increase (Row 1 gains that)
- Row 2+ gain barely anything (often 0-6% constant across all boost values)

Cause: Row-1 racers only need to overtake 20-40% of the field to become competitive. Row-2+ racers need 60-80% and exhaust their boost in the process.

---

## Recommendations for Phase 2O

### Option A: Differentiate boost by racercount

- Instead of a global boost: `boostByRacercount = {40: 1.082, 70: 1.09, 100: 1.10}`
- Breaks the "one parameter" principle but addresses the structural cause

### Option B: Threshold adjustment for deeper rows

- Lower thresholds for Row 2+ (e.g. 15%/30%/55% instead of 20%/40%/70%)
- Boost exhausted earlier → less over-correction at Row 1
- Or: replace per_racer with a different metric type

### Option C: Loosen fairness gate

- 1.5× gate is strict; 2.0× would be more realistic for open tracks with many rows
- With 2.0× gate: Space Sprint 2/9 → presumably 5+/9

### Option D: Activate v4 only for r40

- For r70/r100 the bias correction is too complex
- Leave r70/r100 open tracks without v4 → no artificial fairness there

### Option E: Separate boost parameters per row depth

- instead of one boost for all: `rowBoostMultipliers = [1.0, 1.09, 1.15, 1.22, ...]`
- Each row gets its own boost value
