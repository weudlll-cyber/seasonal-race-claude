# GREENFIELD P0 — Physics-tax measurement

Read-only `--physics-tax` observer on the shipped default engine. 4 tracks (2 open + 2 closed), **N=100 per track**, seed=1, dur=60s. Same f40a7a6 baseline seeds the audit and composers use. Shipped default fingerprint unchanged (OFF path byte-identical).

**sigma = lostFrac / bandHalfWidth** — the share of the natural speed band that live avoidance braking already consumes. A composer may spend at most `band × (1 − sigma)`. bandHalfWidth = 0.0813 (≈ ±8.13% at the shipped 0.00096/0.00113 base-speed config).

## Pooled (all 4 tracks — the single reserve the composers must hold back)

- **sigma.mean = 48.1%**, sigma.p50 = 45.6%, sigma.p90 = 73.9%, sigma.p95 = 82.3%, sigma.max = 125.7%
- lostFrac.mean = 3.9% (p95 = 6.7%, max = 10.2%)
- **tail (last-decile) loss = 3.9%** → tailSigma = 47.4% (sets p_last and the tier-boundary widening)
- **concentration = 1.11** (1.0 = perfectly uniform drag; higher = a few bad places → roughly UNIFORM, more expensive to plan around)
- brake-frame share mean = 60.7%; drafting gain mean = 2.0% of applied distance

## Per track

| track | type | sigma.mean | sigma.p95 | tailSigma | concentration | brakeFrameShare |
|---|---|---|---|---|---|---|
| luger-hill | open | 42.1% | 58.7% | 41.3% | 1.17 | 62.8% |
| mountainstreet | open | 32.9% | 47.1% | 31.7% | 1.23 | 49.2% |
| searound | closed | 65.6% | 94.2% | 66.6% | 1.13 | 70.9% |
| dirt-oval | closed | 51.8% | 74.2% | 50.1% | 1.23 | 59.8% |

## Decile profile (pooled mean lostFrac per 10% of progress)

| d0 | d1 | d2 | d3 | d4 | d5 | d6 | d7 | d8 | d9 |
|---|---|---|---|---|---|---|---|---|---|
| 3.7% | 4.3% | 3.9% | 3.6% | 3.5% | 3.4% | 4.0% | 4.0% | 4.0% | 3.9% |

Data: `physics-tax.csv` (per-track + pooled aggregates), `physics-tax-deciles.csv` (decile profile).

Wall-clock: 58.9 min total across 4 tracks (jobs=4).
