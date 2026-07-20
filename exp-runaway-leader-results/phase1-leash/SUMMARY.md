# Front Distance Leash — Phase-1a Exploration Sweep

Sim-only leash (SIM harness flags), all 4 tracks, **N=50 per track**, seed=1 (same seeds as the f40a7a6 baseline). Facts only — the variant decision is the owner's.
Leash: brake the current rank-1 racer in progress window [0.60, 0.92] when leader→P2 gap > maxLen; proportional brake (gainPct per excess length), floor 0.85, hysteresis 0.5, B1 floor. Flags OFF → byte-identical (fingerprint 72c3360fb75225ef verified).

## Gates
runaway <10% overall AND ≤15% every track AND parade ≤2% AND action Δ ≥ 0 AND B1&B2 band-reach ≥70% (every track) AND Holm ≤2/4 tracks.

| variant | leash | runaway overall | runaway per track (lh/ms/sr/do) | max track | parade | top-5 action (Δ vs V0) | B1 min | B2 min | Holm | PASS |
|---|---|---|---|---|---|---|---|---|---|---|
| V0 | off | 22.5% | 18.0% / 20.0% / 28.0% / 24.0% | 28.0% | 2.0% | 35.04 (+0.00) | 70.8% | 71.6% | 2/4 | ❌ |
| V-2.5-m | 2.5/3 | 30.5% | 18.0% / 36.0% / 36.0% / 32.0% | 36.0% | 2.0% | 34.75 (-0.29) | 70.4% | 70.8% | 2/4 | ❌ |
| V-2.0-m | 2/3 | 34.5% | 22.0% / 38.0% / 42.0% / 36.0% | 42.0% | 2.5% | 34.96 (-0.08) | 70.0% | 70.6% | 2/4 | ❌ |
| V-3.0-m | 3/3 | 29.0% | 18.0% / 32.0% / 34.0% / 32.0% | 34.0% | 1.5% | 34.82 (-0.22) | 70.0% | 70.4% | 2/4 | ❌ |
| V-2.5-lo | 2.5/1.5 | 31.0% | 18.0% / 36.0% / 38.0% / 32.0% | 38.0% | 2.0% | 34.69 (-0.35) | 70.4% | 70.8% | 2/4 | ❌ |
| V-2.5-hi | 2.5/6 | 29.5% | 18.0% / 34.0% / 36.0% / 30.0% | 36.0% | 2.0% | 34.88 (-0.16) | 70.8% | 70.8% | 2/4 | ❌ |

Per-track column order: luger-hill / mountainstreet / searound / dirt-oval.
Raw per-(variant×track) rows: `per-variant-track.csv`.
