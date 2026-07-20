# rowEnvMult Smoothing — Slew vs Easing

Smooths ONLY the ~0.5–1.5% rowEnvMult step at the PULK→OUTCOME boundary (0.60), back-rows only.
SLEW = 1%/frame linear (governorMult pattern); EASING = 1s easeInOutCubic (trajectoryMult pattern).
4 tracks × 100 races, seed=1, default racer, 40 closed / 60 open, choreoOutcomeStart=0.6. Off = byte-identical.

| Variant | B1 | ΔB1 | B2 | ΔB2 | B3 | ΔB3 | Holm | PULK LC | ΔLC |
|---|---|---|---|---|---|---|---|---|---|
| BASELINE (stepped (current)) | 77.6% | — | 73.6% | — | 66.0% | — | 1/4 | 9.86 | — |
| SLEW (1%/frame slew) | 77.0% | -0.6pp | 73.8% | +0.2pp | 66.4% | +0.4pp | 0/4 | 9.84 | -0.2% |
| EASING (1s easeInOutCubic) | 77.3% | -0.4pp | 73.4% | -0.2pp | 66.1% | +0.2pp | 0/4 | 9.69 | -1.7% |

## Per-track B1 / B2

| Variant | city-circuit | dirt-oval | mountainstreet | ice-track |
|---|---|---|---|---|
| BASELINE | 79.4%/75.4% | 80.4%/76.7% | 71.6%/67.2% | 79.2%/75.1% |
| SLEW | 78.6%/75.9% | 80.4%/77.0% | 70.8%/67.3% | 78.2%/74.9% |
| EASING | 77.4%/73.8% | 80.0%/76.8% | 71.4%/67.1% | 80.2%/75.8% |

## Verdict

- **SLEW**: B1 -0.6pp, B2 +0.2pp vs baseline; total B1+B2 deviation 0.8pp.
- **EASING**: B1 -0.4pp, B2 -0.2pp vs baseline; total B1+B2 deviation 0.6pp.

- **Fairness impact of smoothing the step: ≤ 0.6pp** on B1/B2 for both methods — negligible (as expected for a ~1% back-row step); both are fairness-safe.
- **Closest to baseline: EASING** (1s easeInOutCubic). Both are safe; EASING deviates least. EASING spreads the step over ~1s (smoothest visually); SLEW clears it in ~2 frames.
- **Reminder:** this step is ~0.5–1.5% on back rows only — cosmetically marginal. The choice is about visual polish, not fairness (both hold).

---
_Configs present: 12/12._

