# PART B — Chase-suppression at small G (searound + mountainstreet, N=50, 60s)

Arms: OFF (no gapReroll) / G15 (symmetric G=1.5 s=1.0, the confirmed candidate) / G075 (symmetric G=0.75 s=1.0, the owner's slider). Fixed baseline seeds 1–50, default racer per track. Branch-fire counters are pure telemetry — no sim behavior changed.

## STOP gate — OFF reproduces the known baselines
✅ PASSED — OFF runaway counts equal the confirm-n200 V0 first-50-seed subset (searound 14, mountainstreet 10).

## Headline per arm × track
| track | arm | runawayWinnerRate | mean escape gap@0.90 (L) | median | DOWN-tilts | UP-tilts | **DOWN with gapAhead>gapBehind** |
|---|---|---|---|---|---|---|---|
| searound | OFF | 28.0% (14/50) | 2.55 | 1.23 | 0 | 0 | **0** |
| searound | G15 | 16.0% (8/50) | 1.80 | 1.33 | 381 | 328 | **27** |
| searound | G075 | 14.0% (7/50) | 1.91 | 1.45 | 1207 | 867 | **188** |
| mountainstreet | OFF | 20.0% (10/50) | 2.18 | 1.48 | 0 | 0 | **0** |
| mountainstreet | G15 | 6.0% (3/50) | 1.63 | 1.26 | 289 | 245 | **18** |
| mountainstreet | G075 | 8.0% (4/50) | 1.58 | 1.12 | 892 | 667 | **111** |

*Mean escape gap@0.90 = leader→P2 distance in racer lengths at progress 0.90, averaged over races where P2 still exists (n per race set in `per-arm-track.csv`).*

## The smoking gun — DOWN-tilts by live-rank group
A DOWN-tilt shifts the draw toward the SLOW band edge. It is *intended* for a racer that has escaped forward. It is *suppression* when the racer is itself far behind the racer ahead.
| track | arm | DOWN total | on leader (P1) | on chasers (P2–P5) | on pack (P6+) | gapAhead mean at DOWN | gapBehind mean at DOWN | share with gapAhead>gapBehind |
|---|---|---|---|---|---|---|---|---|
| searound | OFF | 0 | 0 | 0 | 0 | 0.00 | 0.00 | **–** |
| searound | G15 | 381 | 43 | 59 | 279 | 0.74 | 2.43 | **7.1%** |
| searound | G075 | 1207 | 86 | 188 | 933 | 0.66 | 1.49 | **15.6%** |
| mountainstreet | OFF | 0 | 0 | 0 | 0 | 0.00 | 0.00 | **–** |
| mountainstreet | G15 | 289 | 39 | 44 | 206 | 0.65 | 2.39 | **6.2%** |
| mountainstreet | G075 | 892 | 73 | 119 | 700 | 0.60 | 1.45 | **12.4%** |

## Verdict
- **searound**: runaway OFF 28.0% → G15 16.0% → G075 14.0%; mean escape gap@0.90 2.55 → 1.80 → 1.91L; suppressed DOWN-tilts (gapAhead>gapBehind) 0 → 27 → 188.
- **mountainstreet**: runaway OFF 20.0% → G15 6.0% → G075 8.0%; mean escape gap@0.90 2.18 → 1.63 → 1.58L; suppressed DOWN-tilts (gapAhead>gapBehind) 0 → 18 → 111.

Pooled: suppressed DOWN-tilts G15 = 45, G075 = 299 (ratio 6.6×). Mean runawayWinnerRate OFF 24.0% / G15 11.0% / G075 11.0%.

Data: `per-arm-track.csv` (aggregates), `races-<arm>-<track>.csv` (per-seed; determinism re-run target).
