# GREENFIELD SWEEP — composer `vcc`

4 tracks (2 open + 2 closed), default racers, **N=50**, dur=60s, baseline seeds. σ=0.48 (P0 pooled). The composer replaces the re-roll dice + trajectoryMult servo; the full live engine (avoidance, no-overlap, braking) + the whole observer suite run unchanged. Band delivery = per-racer finalRank-band == assigned-tier-band.

Baselines: band-reach > 80% (owner mark); p1Contest 5.3% @0.80 (A1), 31.3% @0.62 (A6).

## Pooled

- **band delivery = 47.2%** vs 80% mark ❌; tier-exactness (all-in-tier races) = 0.0%
- runaway = 7.5%; parade = 1.0%
- **p1Contest @0.80 = 0.0%** vs 5.3% ❌; **@0.62 = 0.0%** vs 31.3% ❌
- leadChange mean = 0.17; distinctLeaders mean = 1.17; **intraTierEntropy = 1.000**
- band-compliance violations = 0 (target 0 — the hard invariant)
- delivery diagnostics: re-deals 0.00/race, recompiles 0.00, re-plans 320.00, minMargin 0.0000

## Per track

| track | type | band | tierExact | runaway | parade | p1@80 | p1@62 | lead | distinct | entropy | viol |
|---|---|---|---|---|---|---|---|---|---|---|---|
| luger-hill | open | 47.8% | 0.0% | 8.0% | 0.0% | 0.0% | 0.0% | 0.20 | 1.20 | 1.000 | 0 |
| mountainstreet | open | 46.2% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.16 | 1.16 | 1.000 | 0 |
| searound | closed | 50.7% | 0.0% | 16.0% | 2.0% | 0.0% | 0.0% | 0.20 | 1.20 | 1.000 | 0 |
| dirt-oval | closed | 44.0% | 0.0% | 6.0% | 2.0% | 0.0% | 0.0% | 0.12 | 1.12 | 1.000 | 0 |

Data: `sweep-vcc.csv`.
