# SWEEP 2 — choreoOutcomeStart (PULK/OUTCOME boundary)

Owner question: how late can PULK run (higher choreoOutcomeStart) while OUTCOME still
delivers fair results? 4 tracks × 4 values, 100 races/config, seed=1, 60s, default racer,
40 racers (closed) / 60 (open).

**Gate:** band-reach ≥ 70% AND 0 Holm-unfair start rows.

## Band-reach + gate

| Track (topology) | choreoOutcomeStart=0.5 | =0.6 | =0.7 | =0.8 |
|---|---|---|---|---|
| city-circuit (closed) | 80.1% FAIL | 77.8% PASS | 70.5% PASS | 61.6% FAIL |
| dirt-oval (closed) | 81.8% PASS | 78.4% PASS | 73.2% PASS | 63.8% FAIL |
| mountainstreet (open) | 77.1% FAIL | 71.6% FAIL | 63.7% FAIL | 53.1% FAIL |
| ice-track (closed) | 80.8% PASS | 78.0% PASS | 72.5% PASS | 63.1% FAIL |

## Per-band reach (which band breaks first as PULK runs later)

| Track | choreoOutcomeStart | per-band | heroSuccess | minPHolm |
|---|---|---|---|---|
| city-circuit | 0.5 | B1 83% / B2 78% / B3 69% / B4 88% | 87.7% | 0.0400 |
| city-circuit | 0.6 | B1 79% / B2 75% / B3 68% / B4 86% | 91.6% | 0.0800 |
| city-circuit | 0.7 | B1 72% / B2 66% / B3 59% / B4 81% | 89.7% | 0.0812 |
| city-circuit | 0.8 | B1 65% / B2 56% / B3 52% / B4 71% | 87.7% | 0.0066 |
| dirt-oval | 0.5 | B1 83% / B2 81% / B3 72% / B4 88% | 87.5% | 0.2200 |
| dirt-oval | 0.6 | B1 80% / B2 77% / B3 68% / B4 86% | 88.7% | 0.8400 |
| dirt-oval | 0.7 | B1 74% / B2 69% / B3 65% / B4 82% | 91.8% | 0.1000 |
| dirt-oval | 0.8 | B1 67% / B2 61% / B3 54% / B4 71% | 91.4% | 0.0200 |
| mountainstreet | 0.5 | B1 73% / B2 75% / B3 69% / B4 71% / B5 88% | 77.7% | 0.0400 |
| mountainstreet | 0.6 | B1 72% / B2 67% / B3 60% / B4 67% / B5 84% | 83.0% | 0.0400 |
| mountainstreet | 0.7 | B1 67% / B2 56% / B3 53% / B4 60% / B5 75% | 80.4% | 0.6000 |
| mountainstreet | 0.8 | B1 58% / B2 42% / B3 42% / B4 50% / B5 66% | 78.1% | 0.0600 |
| ice-track | 0.5 | B1 82% / B2 79% / B3 71% / B4 88% | 86.2% | 0.3000 |
| ice-track | 0.6 | B1 79% / B2 75% / B3 68% / B4 86% | 88.5% | 1.0000 |
| ice-track | 0.7 | B1 73% / B2 68% / B3 64% / B4 81% | 90.0% | 0.3200 |
| ice-track | 0.8 | B1 61% / B2 57% / B3 56% / B4 72% | 88.1% | 0.0200 |

## Action metrics (PULK window): does later PULK add or remove drama?

leadChanges = P1 hand-overs in window; distinctP1 = distinct leaders in window (means over 100 races).

| Track | Metric | =0.5 | =0.6 | =0.7 | =0.8 |
|---|---|---|---|---|---|
| city-circuit | leadChanges | 6.47 | 9.86 | 13.34 | 17.35 |
| city-circuit | distinctP1 | 5.43 | 7.05 | 8.49 | 10.24 |
| dirt-oval | leadChanges | 7.26 | 11.03 | 15.02 | 19.02 |
| dirt-oval | distinctP1 | 5.80 | 7.44 | 8.90 | 10.50 |
| mountainstreet | leadChanges | 5.53 | 8.48 | 11.29 | 14.20 |
| mountainstreet | distinctP1 | 6.04 | 8.48 | 10.57 | 12.49 |
| ice-track | leadChanges | 6.63 | 10.06 | 14.00 | 17.73 |
| ice-track | distinctP1 | 5.58 | 7.10 | 8.57 | 10.14 |

## Best value (max action while gate holds)

- choreoOutcomeStart=0.5: 2/4 pass, mean leadChanges 6.47
- choreoOutcomeStart=0.6: 3/4 pass, mean leadChanges 9.86
- choreoOutcomeStart=0.7: 3/4 pass, mean leadChanges 13.41
- choreoOutcomeStart=0.8: 0/4 pass, mean leadChanges 17.08

**No value passes all 4 tracks.** Highest partial: choreoOutcomeStart=0.7 (3/4 pass, mean leadChanges 13.41). Owner to weigh trade-off.

