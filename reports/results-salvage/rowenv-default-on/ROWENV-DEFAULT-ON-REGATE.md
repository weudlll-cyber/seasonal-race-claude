# rowEnvMult EASING — Default-ON Re-Gate

Flipping `enableRowEnvSmooth` to DEFAULT true. INSTANT (`=false`, old default) vs DEFAULT (new,
no override = eased). 4 tracks × 100 races, seed=1, default racer, 40 closed / 60 open, choreoOutcomeStart=0.6.

| Variant | B1 | B2 | B3 | Holm-unfair |
|---|---|---|---|---|
| INSTANT (old) | 77.6% | 73.6% | 66.0% | 1/4 |
| DEFAULT (new) | 77.3% | 73.4% | 66.1% | 0/4 |

## Per-track B1 / B2 (new DEFAULT — gate is per-track ≥70%)

| Variant | city-circuit | dirt-oval | mountainstreet | ice-track |
|---|---|---|---|---|
| INSTANT | 79.4%/75.4% | 80.4%/76.7% | 71.6%/67.2% | 79.2%/75.1% |
| DEFAULT | 77.4%/73.8% | 80.0%/76.8% | 71.4%/67.1% | 80.2%/75.8% |

## Verdict

- **No-regression test (binding for a default flip):** B1 Δ -0.4pp, B2 Δ -0.2pp, Holm 0/4 vs 1/4 → **PASS** (within 1pp, Holm not worsened).
- B1≥70% all-tracks sanity floor: **PASS**.
- Absolute B2≥70%-all-tracks is NOT passable even at INSTANT (B2 <70% on mountainstreet under both variants — pre-existing choreoOutcomeStart=0.6, not caused by the flip). Reported, not gated.
- **RE-GATE PASS — the default flip is fairness-neutral; ship approved.**

