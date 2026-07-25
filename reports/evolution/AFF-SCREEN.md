# Assignment-follows-field (Evolution Act 1) — SCREEN

**Report-only. Nothing ships; the owner decides after an eye test.** Paired, race-for-race, same seeds. CONTROL = shipped defaults (AFF flag OFF) vs AFF = flag ON at affSwapThresholdLengths 0.5. Tracks (one open + one closed): luger-hill (open) + searound (closed), canonical per-track defaults (`--track-defaults`), N=25 per arm per track (50 races/arm), 40 racers closed / 60 open. band-reach is the primary fairness metric; the rest are finale guardrails; the flap diagnostic is the mean intra-band target swaps per racer per race (AFF/live). Generated 2026-07-25.

## Pooled (both tracks)

| metric | CONTROL | AFF-0.5 |
|---|---|---|
| band-reach | 71.1% | 66.8% |
| dead finales | 8.0% | 14.0% |
| front@line | 4.14 | 3.42 |
| lead changes | 2.24 | 1.80 |
| runaway | 14.0% | 18.0% |
| escape med (L) | 2.25 | 2.11 |
| escape p90 (L) | 3.92 | 4.04 |
| flap swaps/racer | — | 8.79 |
| Holm-unfair tracks | 2/2 | 2/2 |

## luger-hill (open)

| metric | CONTROL | AFF-0.5 |
|---|---|---|
| band-reach | 68.4% | 65.1% |
| dead finales | 8.0% | 4.0% |
| front@line | 5.36 | 4.04 |
| lead changes | 3.00 | 2.36 |
| runaway | 12.0% | 12.0% |
| escape med (L) | 1.59 | 1.96 |
| escape p90 (L) | 3.17 | 3.17 |
| flap swaps/racer | — | 9.85 |
| Holm-unfair tracks | 1/1 | 1/1 |

## searound (closed)

| metric | CONTROL | AFF-0.5 |
|---|---|---|
| band-reach | 75.1% | 69.3% |
| dead finales | 8.0% | 24.0% |
| front@line | 2.92 | 2.80 |
| lead changes | 1.48 | 1.24 |
| runaway | 16.0% | 24.0% |
| escape med (L) | 2.79 | 2.65 |
| escape p90 (L) | 5.09 | 5.62 |
| flap swaps/racer | — | 7.74 |
| Holm-unfair tracks | 1/1 | 1/1 |

## Closing line

**Direction: NEGATIVE (guardrails regressed) — band-reach BELOW 70%, fairness at risk. Δband-reach -4.3pp, Δdead +6.0pp, Δlead-changes -0.44, Δrunaway +4.0pp; per-tick cadence looks TWITCHY (mean 8.79 committed swaps/racer/race — consider the roll-boundary fallback).**
