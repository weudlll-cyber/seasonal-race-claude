# rowEnvMult EASING — Ship Re-Gate (shared raceStep.js)

BASELINE (`enableRowEnvSmooth=false`) vs SMOOTH (`=true`) via the SHARED raceStep.js the browser runs.
4 tracks × 100 races, seed=1, default racer, 40 closed / 60 open, choreoOutcomeStart=0.6.

| Variant | B1 | B2 | B3 | Holm-unfair |
|---|---|---|---|---|
| BASELINE | 77.6% | 73.6% | 66.0% | 1/4 |
| SMOOTH | 77.3% | 73.4% | 66.1% | 0/4 |

## Per-track B1 / B2

| Variant | city-circuit | dirt-oval | mountainstreet | ice-track |
|---|---|---|---|---|
| BASELINE | 79.4%/75.4% | 80.4%/76.7% | 71.6%/67.2% | 79.2%/75.1% |
| SMOOTH | 77.4%/73.8% | 80.0%/76.8% | 71.4%/67.1% | 80.2%/75.8% |

## Verdict

- B1 Δ -0.4pp, B2 Δ -0.2pp (SMOOTH vs BASELINE).
- **RE-GATE PASS**: B1/B2 within 1pp of baseline and Holm not worsened — the shared easing is fairness-neutral, matching the sim sweep (EASING B1 −0.4pp, B2 −0.2pp).
- Reminder: the flag defaults **false** (instant), so master behavior is unchanged until the owner enables it. Smoothness is a ~1% back-row visual nicety; the true visual check is the owner eye-test.

