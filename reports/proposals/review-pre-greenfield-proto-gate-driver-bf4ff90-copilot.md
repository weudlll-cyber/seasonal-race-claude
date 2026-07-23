# Follow-up Review — Real Gate Driver at bf4ff90

Scope reviewed: commit bf4ff90, file scripts/exp-gate-retune.mjs, and seed semantics in scripts/sim-fairness.mjs.

## 1. Seed pairing is real race-for-race
Verdict: SOUND

- Each arm x track invocation passes identical seed/race-count controls to the sim (`--seed=${SEED}`, `--races=${races}`), with no arm-specific perturbation of seed inputs. References: scripts/exp-gate-retune.mjs:69.
- Sim seed assignment is deterministic and index-based (`seed = (GLOBAL_SEED - 1) * N_RACES + raceIdx + 1`), so per-track runs with the same `GLOBAL_SEED` and `N_RACES` produce the same seed sequence in both arms. References: scripts/sim-fairness.mjs:3241, scripts/sim-fairness.mjs:3243.
- The driver also records per-race seed in output rows (`seed: rec.seed`), preserving auditable pair keys by track+seed. References: scripts/exp-gate-retune.mjs:85, scripts/exp-gate-retune.mjs:199.

Notes:
- The gate aggregation itself does not compute paired deltas; it aggregates each arm independently. Pairing is therefore real and reproducible, but currently used as experimental control rather than as a paired statistical estimator.

## 2. Pooled band-reach weighting by racer-rows
Verdict: SOUND

- Pooled band-reach is explicitly weighted by racer-row volume (`nRacerRows = races * nRacers`), not by flat track mean. References: scripts/exp-gate-retune.mjs:105, scripts/exp-gate-retune.mjs:115, scripts/exp-gate-retune.mjs:116.
- Closed/open field-size asymmetry is captured in weights (`40` vs `60`), so larger fields contribute proportionally to the pooled primary fairness metric. References: scripts/exp-gate-retune.mjs:53, scripts/exp-gate-retune.mjs:66.
- Primary gate pass/fail is driven by this pooled weighted figure only (`bandReachPooled >= 0.70`). References: scripts/exp-gate-retune.mjs:185, scripts/exp-gate-retune.mjs:190.

Consistency check for "every pooled figure that feeds the gate primary":
- True for the primary fairness gate itself: only `bandReachPooled` feeds it, and that figure is weighted as claimed.
- Other pooled context figures (dead/front/runaway/parade/etc.) are race-row means, not racer-row weighted; these are printed as context and do not feed the primary gate. References: scripts/exp-gate-retune.mjs:125-131, scripts/exp-gate-retune.mjs:175.

## 3. Holm is reported as flagged-track count, not full multiple-testing procedure
Verdict: SOUND

- Driver ingests per-track Holm artifacts (`startRowUnfair`, `startRowMinPHolm`) and aggregates secondary fairness as count of flagged tracks. References: scripts/exp-gate-retune.mjs:104, scripts/exp-gate-retune.mjs:148.
- Console/report wording consistently presents Holm as flagged-track count (`Holm-flagged tracks: x/y`) with per-track `minPHolm` shown in gate-arm-track output. References: scripts/exp-gate-retune.mjs:172, scripts/exp-gate-retune.mjs:182, scripts/exp-gate-retune.mjs:198.
- No code path claims or computes a full cross-track Holm procedure in this driver; it reports the count-based secondary exactly as described.

## 4. Additional material findings in driver implementation
Verdict: SOUND

- Arm-config leakage risk: low. Each run explicitly sets all retune knobs used by this gate (`gapRerollEnabled`, `threshold`, `strength`, `mode`, `carouselEnabled=false`) per invocation, so no dependence on ambient defaults for the tested axes. References: scripts/exp-gate-retune.mjs:70-71.
- Result-file mixing between arms/tracks/durations: low. Output directories include tag+arm+track+duration, separating gate and duration-sanity runs and preventing overwrite collisions across combinations. References: scripts/exp-gate-retune.mjs:66, scripts/exp-gate-retune.mjs:214.
- Early-stop logic touching primary: none inside this driver. The stop rule is evaluated and printed, but there is no internal abort or path that mutates primary pass/fail computation; primary remains `bandReachPooled >= 0.70`. References: scripts/exp-gate-retune.mjs:18, scripts/exp-gate-retune.mjs:185, scripts/exp-gate-retune.mjs:193.

## Short summary
The real gate driver at bf4ff90 matches its commit claims for section 6: seed pairing is truly race-for-race under deterministic seed mapping, pooled primary band-reach is weighted by racer-rows, and Holm is represented as a flagged-track count with per-track minPHolm visibility rather than a full multiple-testing procedure. I found no material implementation issue in config scoping, output separation, or early-stop behavior that would distort the primary gate computation.