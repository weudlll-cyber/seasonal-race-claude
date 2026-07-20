# RBS 1 — Fairness Detail (per-start-row win breakdown)

Per-start-row WIN distribution for every rowBonusPost sweep config, next to the gate fields.
Answers "why does a config flag on the start-row Holm test?" — the win counts show which rows
win more/less than the fair expectation (each row's expected win rate is 0.25 for a 4-row grid).

Cells `Rx.wins/rate` = wins from start row x over 100 races + that row's win rate. Sum of the four
row win-counts = 100 (one winner per race). Topology read from the sibling `fairness-data.json`
(`isOpen`) since hero-map `meta` does not carry it.

**Speed columns (OUTCOME phase):** the effective start-row speed multiplier for row i is
`1 + rawRowBonus_i · rowBonusPost` (raceStep.js POST-phase envelope; `rawRowBonus_i` emitted by
sim-fairness). Row 0 = 0 → **speedMin is always 1.000**; speedMax = deepest row; speedRange =
speedMax/speedMin = the front-to-back "schießen" spread. Shown to 3dp because the real spread is
~1% (see note below), not the ~1.3–1.7× the RBS-1 spec anticipated.

| Track | Topology | Racer | rowBonusPost | band-reach | startRowUnfair | minPHolm | speedMin | speedMax | speedRange | R0 w/rate | R1 w/rate | R2 w/rate | R3 w/rate |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| city-circuit | closed | motorbike | 1.0 | 80.1% | true | 0.0400 | 1.000 | 1.014 | 1.014 | 22/0.22 | 34/0.34 | 25/0.25 | 19/0.19 |
| city-circuit | closed | motorbike | 0.5 | 80.8% | false | 0.1374 | 1.000 | 1.007 | 1.007 | 29/0.29 | 33/0.33 | 20/0.20 | 18/0.18 |
| city-circuit | closed | motorbike | 0.0 | 81.3% | false | 0.0729 | 1.000 | 1.000 | 1.000 | 31/0.31 | 32/0.32 | 22/0.22 | 15/0.15 |
| dirt-oval | closed | horse | 1.0 | 81.8% | false | 0.2200 | 1.000 | 1.012 | 1.012 | 32/0.32 | 22/0.22 | 25/0.25 | 21/0.21 |
| dirt-oval | closed | horse | 0.5 | 83.0% | false | 0.3600 | 1.000 | 1.006 | 1.006 | 30/0.30 | 23/0.23 | 26/0.26 | 21/0.21 |
| dirt-oval | closed | horse | 0.0 | 82.4% | true | 0.0400 | 1.000 | 1.000 | 1.000 | 34/0.34 | 22/0.22 | 24/0.24 | 20/0.20 |
| ice-track | closed | snowmobile | 1.0 | 80.8% | false | 0.3000 | 1.000 | 1.015 | 1.015 | 26/0.26 | 26/0.26 | 25/0.25 | 23/0.23 |
| ice-track | closed | snowmobile | 0.5 | 81.0% | false | 0.4600 | 1.000 | 1.007 | 1.007 | 31/0.31 | 22/0.22 | 24/0.24 | 23/0.23 |
| ice-track | closed | snowmobile | 0.0 | 81.3% | false | 0.0600 | 1.000 | 1.000 | 1.000 | 32/0.32 | 21/0.21 | 25/0.25 | 22/0.22 |
| mountainstreet | open | boarder | 1.0 | 82.8% | false | 1.0000 | 1.000 | 1.006 | 1.006 | 50/0.50 | 50/0.50 | — | — |
| mountainstreet | open | boarder | 0.5 | 82.3% | false | 1.0000 | 1.000 | 1.003 | 1.003 | 54/0.54 | 46/0.46 | — | — |
| mountainstreet | open | boarder | 0.0 | 82.3% | false | 1.0000 | 1.000 | 1.000 | 1.000 | 52/0.52 | 48/0.48 | — | — |

## Sanity

- Configs in table: 12/12
- Win-sum check (each row set should total 100): all 12 = 100 ✓

## Finding — the "schießen" speed spread is ~1%, not 1.3–1.7×

- The largest OUTCOME start-row speed spread across all 12 configs is **speedRange 1.015**
  (at rowBonusPost=1.0) — i.e. the deepest row is only ~1–1.5% faster than the front row, not the
  27–71% the RBS-1 spec anticipated. On closed tracks the row gap is a tiny fraction of the multi-lap
  distance, so `rawRowBonus` (∝ rowGap / finishT) is small; halving or zeroing rowBonusPost shrinks an
  already-tiny spread toward 1.000.
- This independently corroborates the sweep headline: **rowBonusPost is a near-negligible speed lever**
  here, so it does not drive band-reach and cannot explain the scattered Holm flags (which move with
  noise, not with the ~1% speed change — e.g. city-circuit @1.0 flags with the *widest* spread while
  dirt-oval @0.0 flags with a *flat* 1.000 spread).

