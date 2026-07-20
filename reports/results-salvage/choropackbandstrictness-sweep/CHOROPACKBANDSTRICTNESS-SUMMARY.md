# SWEEP 3 — choreoPackBandStrictness (choreography tightness)

Owner question: does tighter choreography (lower bandStrictness) increase action or break
fairness? 4 tracks × 3 values, 100 races/config, seed=1, 60s, default racer, 40 racers
(closed) / 60 (open). Lower strictness = tighter pack.

**Gate:** band-reach ≥ 70% AND 0 Holm-unfair start rows.

## Band-reach + gate

| Track (topology) | strictness=0.5 | =0.25 | =0.0 |
|---|---|---|---|
| city-circuit (closed) | 80.1% FAIL | 80.0% FAIL | 73.6% FAIL |
| dirt-oval (closed) | 81.8% PASS | 81.1% PASS | 74.6% PASS |
| mountainstreet (open) | 77.1% FAIL | 76.7% PASS | 68.9% FAIL |
| ice-track (closed) | 80.8% PASS | 78.8% PASS | 73.2% PASS |

## Per-band reach + Holm

| Track | strictness | per-band | minPHolm |
|---|---|---|---|
| city-circuit | 0.5 | B1 83% / B2 78% / B3 69% / B4 88% | 0.0400 |
| city-circuit | 0.25 | B1 80% / B2 78% / B3 70% / B4 88% | 0.0200 |
| city-circuit | 0.0 | B1 72% / B2 71% / B3 61% / B4 84% | 0.0400 |
| dirt-oval | 0.5 | B1 83% / B2 81% / B3 72% / B4 88% | 0.2200 |
| dirt-oval | 0.25 | B1 80% / B2 80% / B3 72% / B4 88% | 0.1000 |
| dirt-oval | 0.0 | B1 74% / B2 71% / B3 62% / B4 85% | 0.0600 |
| mountainstreet | 0.5 | B1 73% / B2 75% / B3 69% / B4 71% / B5 88% | 0.0400 |
| mountainstreet | 0.25 | B1 69% / B2 70% / B3 65% / B4 74% / B5 90% | 0.2400 |
| mountainstreet | 0.0 | B1 61% / B2 60% / B3 53% / B4 65% / B5 86% | 0.2600 |
| ice-track | 0.5 | B1 82% / B2 79% / B3 71% / B4 88% | 0.3000 |
| ice-track | 0.25 | B1 77% / B2 77% / B3 69% / B4 87% | 0.1600 |
| ice-track | 0.0 | B1 70% / B2 70% / B3 61% / B4 84% | 0.1000 |

## Action metrics (PULK window)

leadChanges = P1 hand-overs; distinctP1 = distinct leaders; heldOvertakes = confirmed top-5
overtakes held ≥750ms (means over 100 races).

| Track | Metric | =0.5 | =0.25 | =0.0 |
|---|---|---|---|---|
| city-circuit | leadChanges | 6.47 | 6.47 | 6.47 |
| city-circuit | distinctP1 | 5.43 | 5.43 | 5.43 |
| city-circuit | heldOvertakes | 17.06 | 17.06 | 17.06 |
| dirt-oval | leadChanges | 7.26 | 7.26 | 7.26 |
| dirt-oval | distinctP1 | 5.80 | 5.80 | 5.80 |
| dirt-oval | heldOvertakes | 18.80 | 18.80 | 18.80 |
| mountainstreet | leadChanges | 5.53 | 5.53 | 5.53 |
| mountainstreet | distinctP1 | 6.04 | 6.04 | 6.04 |
| mountainstreet | heldOvertakes | 16.94 | 16.94 | 16.94 |
| ice-track | leadChanges | 6.63 | 6.63 | 6.63 |
| ice-track | distinctP1 | 5.58 | 5.58 | 5.58 |
| ice-track | heldOvertakes | 17.94 | 17.94 | 17.94 |

## Observation — does tighter pack (lower strictness) add or remove PULK action?

- strictness=0.5: 2/4 pass gate, mean leadChanges 6.47
- strictness=0.25: 3/4 pass gate, mean leadChanges 6.47
- strictness=0.0: 2/4 pass gate, mean leadChanges 6.47

**Read: choreoPackBandStrictness has ZERO effect on PULK-window action.** The per-race PULK metrics
(leadChanges/distinctP1/heldOvertakes) are byte-identical across all three values on every track — the
PULK-phase trajectories do not change. The knob acts only in OUTCOME (progress ≥ choreoOutcomeStart=0.5),
where it reshapes band resolution: band-reach and per-band **fall** as strictness tightens toward 0.0
(B1/B3 drop most). So it is **not a PULK-action lever** — lowering it trades away fairness for no
measured action gain. Caveat: the action window ends at PULK end, so any OUTCOME-phase drama the knob
might add is NOT captured here — an OUTCOME-window action metric would be needed to test that.

