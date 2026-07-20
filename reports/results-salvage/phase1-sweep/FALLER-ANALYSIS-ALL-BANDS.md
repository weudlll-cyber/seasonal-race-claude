# Faller Analysis — All Bands (BASELINE_CURRENT, choreoOutcomeStart=0.6)

Where do band fallers land — overshoot toward the front (TOO_FAST, finish rank below the band) or
undershoot toward the back (TOO_SLOW, finish rank above the band)? Reuses the Phase-1 sweep data
(4 tracks × 40 races = 160 races, 40 closed / 60 open). Band edges: B1 1–5, B2 6–15, B3 16–25,
B4 26–40, B5 41+ (real BAND_EDGES).

_Note: the spec referenced `phase1-sweep-baseline.json` (not produced by this harness) and band
ranges 26–35/36–40; this analysis uses the actual per-track `fairness-data.json` and the real band edges._

## Per-band faller distribution (aggregate, all 4 tracks)

| Band | drawn | reach | fallers | TOO_FAST | fast Δ̄ | TOO_SLOW | slow Δ̄ | fast share |
|---|---|---|---|---|---|---|---|---|
| B1 (1–5) | 800 | 77.4% | 181 | 0 | n/a | 181 | +9.9 | 0.0% |
| B2 (6–15) | 1600 | 74.6% | 406 | 167 | -3.1 | 239 | +9.7 | 41.1% |
| B3 (16–25) | 1600 | 67.6% | 519 | 218 | -5.6 | 301 | +8.2 | 42.0% |
| B4 (26–40) | 2400 | 81.3% | 450 | 345 | -9.9 | 105 | +9.0 | 76.7% |
| B5 (41+) | 800 | 83.5% | 132 | 132 | -16.0 | 0 | n/a | 100.0% |

`Δ̄` = mean (finish rank − target rank). Negative = ended ahead of target (faster); positive = behind (slower).

## Band-reach by track (worst = largest deviation from 70%)

| Track | B1 | B2 | B3 | B4 | B5 | B3 dev from 70% |
|---|---|---|---|---|---|---|
| city-circuit | 80.5% | 77.0% | 67.3% | 85.0% | n/a | 2.7pp |
| dirt-oval | 79.5% | 77.3% | 70.3% | 86.5% | n/a | 0.3pp |
| mountainstreet ← WORST | 72.5% | 68.3% | 62.7% | 66.8% | 83.5% | 7.3pp |
| ice-track | 77.0% | 76.0% | 70.0% | 86.7% | n/a | 0.0pp |

## Per-band fast/slow split by track

### city-circuit

| Band | reach | TOO_FAST | fast Δ̄ | TOO_SLOW | slow Δ̄ |
|---|---|---|---|---|---|
| B1 (1–5) | 80.5% | 0 | n/a | 39 | +10.4 |
| B2 (6–15) | 77.0% | 34 | -3.1 | 58 | +6.9 |
| B3 (16–25) | 67.3% | 52 | -5.5 | 79 | +7.1 |
| B4 (26–40) | 85.0% | 90 | -10.1 | 0 | n/a |

### dirt-oval

| Band | reach | TOO_FAST | fast Δ̄ | TOO_SLOW | slow Δ̄ |
|---|---|---|---|---|---|
| B1 (1–5) | 79.5% | 0 | n/a | 41 | +8.4 |
| B2 (6–15) | 77.3% | 39 | -2.6 | 52 | +7.9 |
| B3 (16–25) | 70.3% | 46 | -5.7 | 73 | +6.2 |
| B4 (26–40) | 86.5% | 81 | -10.1 | 0 | n/a |

### mountainstreet (worst track)

| Band | reach | TOO_FAST | fast Δ̄ | TOO_SLOW | slow Δ̄ |
|---|---|---|---|---|---|
| B1 (1–5) | 72.5% | 0 | n/a | 55 | +10.6 |
| B2 (6–15) | 68.3% | 53 | -3.6 | 74 | +15.1 |
| B3 (16–25) | 62.7% | 67 | -5.1 | 82 | +12.3 |
| B4 (26–40) | 66.8% | 94 | -8.5 | 105 | +9.0 |
| B5 (41+) | 83.5% | 132 | -16.0 | 0 | n/a |

### ice-track

| Band | reach | TOO_FAST | fast Δ̄ | TOO_SLOW | slow Δ̄ |
|---|---|---|---|---|---|
| B1 (1–5) | 77.0% | 0 | n/a | 46 | +10.1 |
| B2 (6–15) | 76.0% | 41 | -3.0 | 55 | +7.3 |
| B3 (16–25) | 70.0% | 53 | -6.1 | 67 | +6.9 |
| B4 (26–40) | 86.7% | 80 | -11.0 | 0 | n/a |

## Answers

**Q1 — per band, is faller distribution TOO_FAST or TOO_SLOW dominant?**
- B1 (1–5): 0 fast / 181 slow → **TOO_SLOW** (0.0% of fallers are fast).
- B2 (6–15): 167 fast / 239 slow → **TOO_SLOW** (41.1% of fallers are fast).
- B3 (16–25): 218 fast / 301 slow → **TOO_SLOW** (42.0% of fallers are fast).
- B4 (26–40): 345 fast / 105 slow → **TOO_FAST** (76.7% of fallers are fast).
- B5 (41+): 132 fast / 0 slow → **TOO_FAST** (100.0% of fallers are fast).

**Q2 — worst band + track.**
- Worst track (B3 deviation): **mountainstreet** (B3 reach 62.7%, 7.3pp from 70%).
- B3 fallers are dominantly **TOO_SLOW (undershoot to the back)** — 42.0% fast. This does NOT support the "racers enter OUTCOME too fast" hypothesis.

_Deep-dive target (Phase 2): **mountainstreet**._

