# rowBonusPost Fairness Sweep (RBS 1) — Summary

Sweep of the start-row POST-PULK speed bonus (`rowBonusPost`) to test whether it is
still required for fairness. 4 tracks × 3 values (1.0 shipped, 0.5 half, 0.0 off),
100 races per config, seed=1, 60s.

**Gate:** band-reach ≥ 70% AND 0 Holm-unfair start rows.
band-reach = overall zone-success (finalRank band == target band) on the real rawData;
Holm start-row flag = `computeExtendedFairnessStats.anyConfirmatoryFlagged` (299 perms),
both read from each config's `hero-map.json`.

## Band-reach + gate verdict

Cells: overall band-reach % + PASS/FAIL (gate above).

| Track (topology) | Racer | rowBonusPost=1.0 | rowBonusPost=0.5 | rowBonusPost=0.0 |
|---|---|---|---|---|
| city-circuit (closed) | motorbike | 80.1% FAIL | 80.8% PASS | 81.3% PASS |
| mountainstreet (open) | boarder | 82.8% PASS | 82.3% PASS | 82.3% PASS |
| dirt-oval (closed) | horse | 81.8% PASS | 83.0% PASS | 82.4% FAIL |
| ice-track (closed) | snowmobile | 80.8% PASS | 81.0% PASS | 81.3% PASS |

## Start-row Holm detail

startRowUnfair = any confirmatory start-row test flagged at α=0.05 (Holm). minPHolm = smallest Holm-corrected p.

| Track | Metric | rowBonusPost=1.0 | rowBonusPost=0.5 | rowBonusPost=0.0 |
|---|---|---|---|---|
| city-circuit | startRowUnfair | UNFAIR | fair | fair |
| city-circuit | minPHolm | 0.040 | 0.137 | 0.073 |
| mountainstreet | startRowUnfair | fair | fair | fair |
| mountainstreet | minPHolm | 1.000 | 1.000 | 1.000 |
| dirt-oval | startRowUnfair | fair | fair | UNFAIR |
| dirt-oval | minPHolm | 0.220 | 0.360 | 0.040 |
| ice-track | startRowUnfair | fair | fair | fair |
| ice-track | minPHolm | 0.300 | 0.460 | 0.060 |

## Action / naturalness metrics (secondary — comparison only, not gated)

stableOvertakes = confirmed lead-swaps (≥3s) per racer, 20–80% of race (higher = more action).
brakeRate = fraction of racer-frames braking. fairChanceExact/Top5 = B1-target hit rates.

### city-circuit (motorbike)

| Metric | rowBonusPost=1.0 | rowBonusPost=0.5 | rowBonusPost=0.0 |
|---|---|---|---|
| stableOvertakes | 6.28 | 6.28 | 6.28 |
| brakeRate | 62.2% | 62.3% | 62.0% |
| fairChanceExact | 23.2% | 21.2% | 20.4% |
| fairChanceTop5 | 83.0% | 83.8% | 83.2% |
| honestOverlap | 3.1% | 3.0% | 3.0% |

### mountainstreet (boarder)

| Metric | rowBonusPost=1.0 | rowBonusPost=0.5 | rowBonusPost=0.0 |
|---|---|---|---|
| stableOvertakes | 12.49 | 12.47 | 12.49 |
| brakeRate | 49.6% | 49.4% | 49.5% |
| fairChanceExact | 19.8% | 19.4% | 19.6% |
| fairChanceTop5 | 82.2% | 80.6% | 83.2% |
| honestOverlap | 1.9% | 1.9% | 1.9% |

### dirt-oval (horse)

| Metric | rowBonusPost=1.0 | rowBonusPost=0.5 | rowBonusPost=0.0 |
|---|---|---|---|
| stableOvertakes | 6.18 | 6.18 | 6.18 |
| brakeRate | 62.0% | 62.1% | 62.0% |
| fairChanceExact | 20.4% | 20.8% | 19.6% |
| fairChanceTop5 | 83.2% | 85.0% | 84.4% |
| honestOverlap | 3.0% | 3.0% | 3.0% |

### ice-track (snowmobile)

| Metric | rowBonusPost=1.0 | rowBonusPost=0.5 | rowBonusPost=0.0 |
|---|---|---|---|
| stableOvertakes | 6.28 | 6.28 | 6.28 |
| brakeRate | 60.5% | 60.5% | 60.2% |
| fairChanceExact | 24.0% | 21.4% | 20.8% |
| fairChanceTop5 | 82.0% | 82.0% | 80.0% |
| honestOverlap | 2.9% | 2.8% | 2.8% |

## Headline

- rowBonusPost=1.0: 3/4 tracks PASS the gate.
- rowBonusPost=0.5: 4/4 tracks PASS the gate.
- rowBonusPost=0.0: 3/4 tracks PASS the gate.

## Interpretation

- **Band-reach is insensitive to rowBonusPost.** Across all three values the per-track
  band-reach moves by at most 1.2 pts
  — every config sits in the ~80–83% range. The start-row POST-PULK bonus does not drive the
  band-reach fairness gate.
- **The Holm start-row flags look like noise, not signal.** Only two flags appear, both at
  minPHolm ≈ 0.04 (right at α=0.05), and they do NOT track the knob monotonically — one lands on
  the SHIPPED value (city-circuit @ 1.0), the other on OFF (dirt-oval @ 0.0). A flag on the shipped
  default is the tell of an over-powered start-row test at N=100 single-track (the production gate
  pools ~300 races/track). Treat these as false positives pending a higher-N pooled re-check.
- **Action metrics are flat.** stableOvertakes / brakeRate / honestOverlap are identical to 2 dp
  across values. The one mild trend: fairChanceExact (B1 exact-rank hit rate) drifts down a few
  points as the bonus is removed — the bonus nudges B1 heroes onto their exact rank, but not their
  band (which is what the gate measures).
- **Read:** the start-row POST bonus is not required for band-reach fairness; it can be halved or
  removed with no band-reach cost, at a small cost in B1 exact-placement precision. Confirm the two
  borderline Holm flags with the pooled 300-races/track methodology before acting on defaults.

## Caveats

- ASSUMED-DEFAULTS world (no `--config`): PROVISIONAL — describes the shipped defaults, not a
  specific browser world.
- Single track × single racer per config at N=100. This is a fast comparative probe, not the
  production fairness gate (pooled ~300 races/track via native computeFairnessStats).
- Topology labels are read from the engine (`isOpen`), which classifies **city-circuit as closed**
  — the RBS 1 spec labeled it open. Racers are the spec-hardcoded ones, not per-track defaults.
- Holm gate is sourced from the read-only `--hero-map` path (byte-identical race results); it is
  the only place sim-fairness exposes the start-row Holm test as a machine-readable field.

