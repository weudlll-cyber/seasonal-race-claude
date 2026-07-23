# Independent Review — Measurement Instrumentation on branch pre/greenfield-proto

Scope reviewed: commits 93d68ca and 71f6810, plus gate-runner tooling present on this branch snapshot.

## 1. Behaviour neutrality
Verdict: SOUND

- The episode tracker is read-only state local to the observer and receives all inputs as arguments; it does not mutate racer/controller state and does not call RNG. References: `scripts/sim/observers/escape-episodes.mjs:34`, `scripts/sim/observers/escape-episodes.mjs:56`, `scripts/sim/observers/escape-episodes.mjs:118`.
- The tracker is instantiated once per race from already-computed schedule terms and only sampled conditionally; this avoids hidden reconfiguration inside the frame loop. References: `scripts/sim-fairness.mjs:712`, `scripts/sim-fairness.mjs:714`, `scripts/sim-fairness.mjs:724`, `scripts/sim-fairness.mjs:1324`.
- Telemetry writes in the controller (`_gapWindowRollsByRacer`, `_gapLeaderDownEvents`) are append/counter only and are not consumed to alter returned target draws. References: `client/src/modules/racePlanner.js:420`, `client/src/modules/racePlanner.js:443`, `client/src/modules/racePlanner.js:1015`, `client/src/modules/racePlanner.js:1042`, `client/src/modules/racePlanner.js:1254`.
- Gap-reroll transformation decisions are still based on existing sim inputs (`elapsedMs`, phase progress, gaps, thresholds). No observer path introduces extra random draws or schedule writes. References: `client/src/modules/racePlanner.js:987`, `client/src/modules/racePlanner.js:1010`.

## 2. Episode definition and first-finisher window
Verdict: SOUND

- Escape episodes open on `gapLen > G` and close on `gapLen <= G`, matching the documented definition exactly. References: `scripts/sim/observers/escape-episodes.mjs:56`.
- The first-finisher exclusion is implemented by sampling only while `finishedCount === 0`, and sampling is executed before finish marking in the loop. This includes the leader-crossing frame and excludes post-finish cascade frames. References: `scripts/sim-fairness.mjs:1319`, `scripts/sim-fairness.mjs:1324`, `scripts/sim-fairness.mjs:2337`.
- The convention is aligned with the front-battle observer contract (`[contestWindowStart, FIRST FINISH]` and freeze when any racer is finished). References: `scripts/sim/observers/outcome-front-battle.mjs:16`, `scripts/sim/observers/outcome-front-battle.mjs:90`, `scripts/sim/observers/outcome-front-battle.mjs:111`, `scripts/sim-fairness.mjs:2259`.
- Boundary check: an episode starting on the leader-crossing frame is still counted (because finish flags are applied after observation), so the exclusion does not drop that edge case.

## 3. hadCorrectableRollAhead / last correctable roll
Verdict: CONCERN

- Core parity is correct at boundary level: observer uses `hadCorrectableRollAhead = nextRoll <= windowEndMs`, and transform rejects only `elapsedMs > windowEndMs`, so equality at the boundary is consistently treated as correctable. References: `scripts/sim/observers/escape-episodes.mjs:67`, `client/src/modules/racePlanner.js:1010`.
- Window construction is schedule-based and uses realized-duration terms in both harness and transform path, matching the documented 95% minus transition rule. References: `scripts/sim-fairness.mjs:712`, `scripts/sim-fairness.mjs:714`, `scripts/sim-fairness.mjs:726`, `client/src/modules/racePlanner.js:1009`.
- Concern is in the report-side “schedule math” derivation: `lastCorrectable = floor(windowEnd / interval) * interval` assumes a fixed grid from zero and ignores the per-roll jitter used by the actual scheduler. This can misstate where the last practical corrective chance lands for specific seeds/durations, especially when conclusions are framed as exact cut points. References: `scripts/exp-escape-episodes-report.mjs:44`, `scripts/exp-escape-episodes-report.mjs:52`, `scripts/sim-fairness.mjs:745`, `scripts/sim-fairness.mjs:1292`.

## 4. Unit tests added in 93d68ca
Verdict: CONCERN

- Coverage is strong for pure tracker boundaries (strict `> G`, close at `<= G`, unresolved close, null/Infinity roll handling, bucket splits). References: `scripts/sim/observers/escape-episodes.test.mjs:20`, `scripts/sim/observers/escape-episodes.test.mjs:28`, `scripts/sim/observers/escape-episodes.test.mjs:44`, `scripts/sim/observers/escape-episodes.test.mjs:78`, `scripts/sim/observers/escape-episodes.test.mjs:105`.
- Missing material case: no integration test for the specific failure mode that motivated the change (post-finish cascade creating spurious uncorrected/out-of-rolls episodes). The guard is in sim harness logic (`finishedCount === 0`), but tests exercise only the pure observer module, not the harness feed order around finish detection. References: `scripts/sim-fairness.mjs:1319`, `scripts/sim-fairness.mjs:1324`, `scripts/sim-fairness.mjs:2337`.
- Missing boundary case: no explicit equality test for `nextRoll == windowEndMs` and `raceTs == windowEndMs` (only strict-after-window case is pinned). References: `scripts/sim/observers/escape-episodes.test.mjs:64`, `scripts/sim/observers/escape-episodes.test.mjs:70`.

## 5. Metric G-dependence
Verdict: CONCERN

- Directly G-coupled by definition: episode counts and all episode-derived rates from `summarizeEpisodes` (`nEpisodes`, `uncorrectedRate`, `outOfRollsRate`, `unresolvedRate`, `startedAfterWindowEndRate`) because episodes are defined by `gap > G`. References: `scripts/sim/observers/escape-episodes.mjs:56`, `scripts/sim/observers/escape-episodes.mjs:136`, `scripts/sim/observers/escape-episodes.mjs:140`, `scripts/sim/observers/escape-episodes.mjs:147`, `scripts/exp-escape-episodes-report.mjs:91`.
- Also mechanically G-coupled: `tiltFrac*`, `tiltSaturatedRate`, `tiltDelta*` in the G sweep, because those are functions of `frac = min(1, strength*(gap-G))`; changing G shifts these even with identical underlying gap trajectories. References: `scripts/exp-screen-g.mjs:129`, `scripts/exp-screen-g.mjs:130`, `client/src/modules/racePlanner.js:1023`.
- Metrics that are reasonably G-independent in definition (though still treatment-sensitive) include runaway/parade/front-action style outcome metrics sourced from the runaway-parade classifier and line snapshots; these do not use G as a classifier threshold. References: `scripts/exp-screen-g.mjs:145`.

## 6. Gate runner: pooling, Holm, seed pairing
Verdict: BLOCKER

- Requested runner `scripts/exp-gate-retune.mjs` is not tracked on this branch snapshot (present only as untracked local file), so the exact retune-gate implementation cannot be branch-audited as requested.
- For the tracked surrogate currently implementing the retune-style gate (`--gapreroll-phase2b` in `scripts/exp-runaway-leader.mjs`):
  - Seed pairing across arms appears real at run invocation level (`--seed=${SEED}`, `--races=${RACES}` passed for every arm×track run). References: `scripts/exp-runaway-leader.mjs:1371`.
  - Runaway pooled rate is weighted by race count via `runaway / N` over summed per-track counts, which is sane for equal-weight-by-race pooling. References: `scripts/exp-runaway-leader.mjs:1430`.
  - Holm handling is reduced to count-of-tracks with `holmUnfair > 0` (`holmTracks <= 2`) rather than a full multiple-testing Holm procedure in this runner. References: `scripts/exp-runaway-leader.mjs:1433`.
  - Some pooled telemetry (for example `action`, `dutyCycle`) is simple mean across track summaries, not explicit race-weighted recomputation; with equal `N` per track this is acceptable, but weighting assumptions are implicit. References: `scripts/exp-runaway-leader.mjs:1433`.

## Overall summary
Measurement wiring for the episode tracker and first-finisher cutoff is internally consistent and appears behavior-neutral in code structure. The main review risks are interpretive: report-side schedule math simplifies the real jittered schedule, episode-derived rates are G-definition-coupled, and in the G sweep even tilt-fraction family metrics are mechanically tied to G. The requested `exp-gate-retune` artifact is not part of this branch snapshot, so that exact gate implementation remains unverified here.