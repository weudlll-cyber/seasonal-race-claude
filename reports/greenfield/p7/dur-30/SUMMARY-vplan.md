# GREENFIELD SWEEP — composer `vplan`

4 tracks (2 open + 2 closed), default racers, **N=25**, dur=30s, baseline seeds. σ=0.48 (P0 pooled). The composer replaces the re-roll dice + trajectoryMult servo; the full live engine (avoidance, no-overlap, braking) + the whole observer suite run unchanged. Band delivery = per-racer finalRank-band == assigned-tier-band.

Baselines: band-reach > 80% (owner mark); p1Contest 5.3% @0.80 (A1), 31.3% @0.62 (A6).

## Pooled

- **band delivery = 65.5%** vs 80% mark ❌; tier-exactness (all-in-tier races) = 0.0%
- runaway = 3.0%; parade = 0.0%
- **p1Contest @0.80 = 0.0%** vs 5.3% ❌; **@0.62 = 0.0%** vs 31.3% ❌
- leadChange mean = 0.09; distinctLeaders mean = 1.09; **intraTierEntropy = 1.000**
- band-compliance violations = 0 (target 0 — the hard invariant)
- delivery diagnostics: re-deals 13.24/race, recompiles 0.00, re-plans 0.00

## Per track

| track | type | band | tierExact | runaway | parade | p1@80 | p1@62 | lead | distinct | entropy | viol |
|---|---|---|---|---|---|---|---|---|---|---|---|
| luger-hill | open | 63.4% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.08 | 1.08 | 1.000 | 0 |
| mountainstreet | open | 65.7% | 0.0% | 0.0% | 0.0% | 0.0% | 0.0% | 0.16 | 1.16 | 1.000 | 0 |
| searound | closed | 64.4% | 0.0% | 4.0% | 0.0% | 0.0% | 0.0% | 0.04 | 1.04 | 1.000 | 0 |
| dirt-oval | closed | 68.7% | 0.0% | 8.0% | 0.0% | 0.0% | 0.0% | 0.08 | 1.08 | 1.000 | 0 |

Data: `sweep-vplan.csv`.
