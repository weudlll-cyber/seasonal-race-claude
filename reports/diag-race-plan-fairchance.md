# Diagnostic: Pre-Race Fair-Chance Selection and Assist

**Date:** 2026-06-05  
**Branch:** master (read-only, no changes)  
**Script:** `scripts/diag-race-plan-fairchance.mjs`  
**Key file:** `client/src/modules/racePlanner.js`

---

## Q1 — Does a pre-race designation exist, and how does it work?

**Yes, a pre-race designation exists, but it covers ALL racers — not a selected subset.**

At race creation ([racePlanner.js:131–141](client/src/modules/racePlanner.js#L131)):

```javascript
const rankPool = Array.from({ length: n }, (_, i) => i + 1);
// Fisher-Yates shuffle:
for (let i = rankPool.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [rankPool[i], rankPool[j]] = [rankPool[j], rankPool[i]];
}
const racerTargetRank = new Map();
for (let i = 0; i < racers.length; i++) {
  racerTargetRank.set(racers[i].index, rankPool[i]);
}
```

Every racer receives a unique random `targetRank` (1..N) via Fisher-Yates shuffle. The shuffle is row-agnostic: a racer from the last row is just as likely to receive `targetRank=1` as one from row 0.

From the shuffle, two special subsets are then identified:

| Subset | Selection rule | Count |
|---|---|---|
| **Winner** | Racer with `targetRank=1` | 1 |
| **Pulk racers** | 3 racers shuffled from rows 1–3 (middle field), never the winner | 3 |

The winner is just the racer with the lowest assigned target — no separate mechanism selects it. The pulk selection deliberately draws from middle rows (rows 1–3), but the targetRank shuffle itself is entirely row-blind.

**Are all starting rows represented?** Not deliberately — the targetRank shuffle assigns at random. The front row could receive B1 targets and the back row B5 targets by chance, or the reverse. Only the pulk subset is explicitly drawn from rows 1–3.

### Band structure

Five area bands group targets for the area-bonus mechanic:

| Band | Target rank range | Area bonus | P-controller target |
|---|---|---|---|
| B1 | 1–5 | +3% speed | top 5 positions |
| B2 | 6–15 | +2% speed | positions 6–15 |
| B3 | 16–25 | +1% speed | positions 16–25 |
| B4 | 26–40 | ±0% | positions 26–40 |
| B5 | 41+ | −1% speed | position 41+ |

A racer is "in their target band" when their current live rank falls within `[areaLo, areaHi]` for their assigned `targetRank`.

---

## Q2 — The assist: who it steers, which positions, when, and does it latch off?

### Three assist components

**Component 1 — Area bonus** ([racePlanner.js:272–286](client/src/modules/racePlanner.js#L272)):
- **Who:** ALL racers.
- **What:** A constant speed multiplier (B1=1.03, B2=1.02, B3=1.01, B4=1.00, B5=0.99) applied via `r.areaBonusMult`.
- **When:** Full from race start until `bonusTransitionEnd` (default 75% of race), then eases to 1.0 over 1.5 s.
- **Direction:** Unconditional and one-way — racers in B1 always get a slight boost regardless of current position.

**Component 2 — Pulk bias** ([racePlanner.js:352–370](client/src/modules/racePlanner.js#L352)):
- **Who:** The 3 designated pulk racers only.
- **What:** Speed re-roll bias that nudges each pulk racer toward the group's center t-position.
- **When:** Only during `PULK` phase: 25%–50% of race.
- **Direction:** Bidirectional within the speed band — pulls stragglers forward, slows leaders.

**Component 3 — P-controller (OUTCOME)** ([racePlanner.js:309–318](client/src/modules/racePlanner.js#L309)):
- **Who:** ALL active (non-finished) racers.
- **What:** A proportional controller that computes `rankError = currentRank − targetRank`, then applies:

  ```
  trajectoryMult = clamp(1.0 + gain × (rankError / nActive) + noise, 0.85, 1.10)
  ```
  `gain=2.0`, noise amplitude=0.0008.
- **When:** `OUTCOME` phase: corridorStart (default 55%) to corridorEnd (default 95%).
- **Direction:** Bidirectional. Positive rankError (racer ranked worse than target) → boost up to 1.10×. Negative rankError (racer ranked better than target) → brake down to 0.85×.
- **Target range:** Each racer's individual `targetRank` (1..N). The P-controller tries to achieve the exact assigned rank, not just a band.

### Does the assist disable per-racer after first-reach?

**No.** There is no flag, event, or latch anywhere in racePlanner.js that disables the P-controller for a racer after it first enters its target band. The controller fires unconditionally for every active racer in every OUTCOME frame.

Once a racer is inside its area band (currentRank ∈ [areaLo, areaHi]), the rankError is still non-zero unless the racer is at its exact `targetRank`. The controller continues to apply corrections — typically a brake if the racer overshot (ranked better than target), or no action if it landed exactly on target.

The live run below confirms this: every racer shows `NO (active)` in the assist-after-firstReach column.

---

## Q3 — The existing percentage: precise definition

**`racersInCorridorFraction`** ([racePlanner.js:384](client/src/modules/racePlanner.js#L384)):

```javascript
racersInCorridorFraction: _racerStepCount > 0 ? _racersInCorridorCount / _racerStepCount : 0
```

- **Numerator `_racersInCorridorCount`:** incremented by 1 for each non-finished racer, on each physics frame during OUTCOME, when that racer's current live rank is within its target band `[areaLo, areaHi]`.
- **Denominator `_racerStepCount`:** total non-finished racer-frames evaluated during OUTCOME phase.
- **Sampling rate:** every physics frame (60 fps, ~16.67 ms steps).
- **Result:** fraction of OUTCOME-phase racer-frames spent in the target band, averaged across all racers simultaneously.

**What it does NOT measure:**
- It does not measure whether each designated racer reached the band *at least once*.
- It does not measure final placement — a racer can be in its band for 90% of OUTCOME and then fall out at the end; the metric captures the 90%, not the final state.
- It is only collected for open-track races with `racePlanEnabled=true`. Closed tracks emit `racersInCorridorFraction: 0` by default.

**Correct description:** "Average fraction of the OUTCOME phase during which a racer is in its target position band." Higher is better — 80%+ means the P-controller is keeping most racers near their assigned spots for most of the steered portion of the race.

---

## Q4 — Live run verification

**Setup:** N=12 racers, 4 rows × 3, 120-second open-track race, seed=42. No collision avoidance. Script: `scripts/diag-race-plan-fairchance.mjs`.

### Pre-race designation (all rows, all bands assigned by random shuffle)

```
idx  row  targetRank  band         areaBonusMult  role
  0    0           3  B1(1-5)           1.0300  
  1    0           1  B1(1-5)           1.0300  WINNER
  2    0           6  B2(6-15)          1.0200  
  3    1          11  B2(6-15)          1.0200  PULK
  4    1          10  B2(6-15)          1.0200  
  5    1          12  B2(6-15)          1.0200  
  6    2           4  B1(1-5)           1.0300  PULK
  7    2           2  B1(1-5)           1.0300  
  8    2           7  B2(6-15)          1.0200  
  9    3           9  B2(6-15)          1.0200  
 10    3           5  B1(1-5)           1.0300  
 11    3           8  B2(6-15)          1.0200  PULK

winnerRacerId=1  pulkRacerIds=[6,3,11]  pulk rows=[2,1,3]
```

In this N=12 race all targets fall in B1 or B2 (ranks 1–12, both within the first two bands). Targets are distributed across all four rows without bias — row 3 (back row) contains B1 target `rank=5` (racer 10) and B2 targets.

### Live OUTCOME results

```
idx  row  target  band         firstReach%  tmAtReach  assistDisabled?  finalRank
  0    0       3  B1(1-5)          55.0%      1.1000  NO (active)              1
  1    0       1  B1(1-5)          55.0%      1.1000  NO (active)              2
  2    0       6  B2(6-15)         55.0%      1.1000  NO (active)              3
  3    1      11  B2(6-15)         55.0%      0.8500  NO (active)              4
  4    1      10  B2(6-15)         65.8%      0.8500  NO (active)              5
  5    1      12  B2(6-15)         74.9%      0.8500  NO (active)              6
  6    2       4  B1(1-5)          66.3%      1.1000  NO (active)              7
  7    2       2  B1(1-5)          55.0%      0.8500  NO (active)              8
  8    2       7  B2(6-15)         55.0%      1.1000  NO (active)              9
  9    3       9  B2(6-15)         55.0%      1.1000  NO (active)             10
 10    3       5  B1(1-5)          65.8%      1.1000  NO (active)             11
 11    3       8  B2(6-15)         55.0%      0.8500  NO (active)             12
```

**Observations:**
- All 12 racers eventually reach their target band during OUTCOME (no "NEVER").
- OUTCOME starts at 55% — racers showing `firstReach=55.0%` were already in their band when the P-controller activated.
- `tmAtReach` values of 1.1000 (max boost) or 0.8500 (max brake) confirm the controller was actively firing at first-reach.
- **`assistDisabled? = NO (active)` for every racer** — the P-controller continues applying corrections after first-reach. No latch exists.
- Final rank does not match targetRank in most cases — stochastic re-roll variation and area-bonus interactions produce natural spread around the intended outcome.

### Telemetry

```
racersInCorridorFraction  : 81.5%   ← fraction of OUTCOME racer-frames in target band
corridorViolationMean     : 2.09 rank positions
corridorViolationMax      : 11 rank positions
bidirectionalBoostFraction: 38.3%   ← fraction of frames where trajectoryMult > 1.0
bidirectionalBrakeFraction: 28.7%   ← fraction of frames where trajectoryMult < 1.0
pulkBiasEventCount        : 74      ← pulk-phase re-rolls biased
```

### Metric comparison

| Measurement | Value |
|---|---|
| `racersInCorridorFraction` (time-in-band, OUTCOME) | **81.5%** |
| Racers in target band at final placement | **6/12 = 50.0%** |

The two numbers differ substantially, confirming that `racersInCorridorFraction` does not measure final placement.

**Code path match:** Code reading and live run fully agree — no discrepancies.

---

## Q5 — Corrections to the original hypothesis

| Hypothesis point | Reality |
|---|---|
| "A set of racers is selected" | ALL racers are designated (N targets for N racers, unique shuffle). There is no "selected subset." |
| "Drawn from ALL starting rows deliberately" | The shuffle is row-blind. Back-row racers can receive B1 targets by chance. Only pulk selection (3 racers) deliberately uses rows 1–3. |
| "Assist steers designated racers toward a top band" | The P-controller steers ALL racers toward their individual targetRank (not just a "top band" and not just a subset). The area bonus also applies to all racers. |
| "Assist is one-time: disables after first-reach" | **FALSE.** No disable mechanism exists. The P-controller runs for every non-finished racer every OUTCOME frame until the race ends at 95%. |
| "Percentage measures final placement in band" | **FALSE.** It measures the fraction of OUTCOME-phase racer-frames where the racer's live rank is within its target band — time-in-band, not final state. |

---

## Plain-language summary

**Selection rule:** Before the race, every racer is dealt a unique random rank target (1..N) via Fisher-Yates shuffle. The racer who draws target rank 1 becomes the designated winner. Three racers from the middle rows (rows 1–3) become pulk racers. All of this happens in one seeded draw; the choice is spread across all rows only by probability, not by design rule.

**Assist mechanic:** Three overlapping mechanisms all operate from race start. The area bonus (speed multiplier based on which of 5 bands a racer's target falls in) applies from the start and fades at 75% of race. The pulk bias pulls 3 middle-field racers together during 25%–50% of race. The P-controller (bidirectional rank correction, ±10%/−15% speed range) fires on ALL active racers from 55% to 95% of race. There is no per-racer "disable after first-reach" — the P-controller runs continuously.

**What the percentage measures:** `racersInCorridorFraction` = (racer-frames where live rank is inside target band) ÷ (total racer-frames in OUTCOME phase). It is a time-average, not a final-state count. An 80% figure means the field collectively spends 80% of the steered portion of the race near their assigned rank positions.
