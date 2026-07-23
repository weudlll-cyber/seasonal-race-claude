# Micro-divergence localization — browser vs sim, searound / manta / 40 / 60 s

**Diagnosis, report-only. No shipped race code changed.** New diagnostic: `scripts/diag/micro-divergence.mjs`.
Compute used: 6 single-race (N=1) runs total (3 seeds × 2 duration models), no sweeps.

## TL;DR

- **t=0 state is identical** on both sides (grid + spreadFactors + jitters) — steps 1 + 2a hold. The
  drift is entirely downstream of the start.
- The **only** input the two engines derive differently is the **closed-track pace duration**. finishT
  (laps) matches; `race_baseSpeed`, the re-roll schedule, and the plan `targetDurationMs` all key on a
  "duration in seconds" that the **sim takes as the raw setting `durationSec = 60`** while the **browser
  derives a nominal `targetDuration = quickClosedDuration = round(estimatedSecondsPerLap·laps) = 28`**.
- Substituting the browser's *source-documented* 28 into the shared `runSingleRace` (Run B) reproduces
  the **shape** of the owner's finding — tight front margins flip, wide ones survive — but **over-states**
  the magnitude (a 2.14× pace change; it flips seed 42's winner, which the owner saw MATCH). So the
  browser's *runtime* effective duration is **closer to the sim's than 28 implies**; the true residual is
  a **smaller sub-term of the duration model**, not the full pace factor.
- **Classification: (a) — belongs in the upcoming speed/duration ship.** It is the closed-track
  duration/finish model. Not a one-line fix (needs the canonical duration semantics); not float noise.
- **Pinning the exact sub-term needs a browser-side capture** (named below) — the one thing this headless
  harness cannot faithfully reconstruct.

## Method — two runs of the SHARED loop, not a from-scratch mirror

The step-1 seedDeterminism mirror simplifies the model (no plan, no brake/boost, mock geometry).
Rather than extend it into a full re-implementation of index.jsx's ~200-line loop — which would risk
its own bugs and make any divergence ambiguous — the diagnostic drives the **real, shared**
`runSingleRace` (the same function the fairness sim uses; the browser imports the same per-frame
modules, FORCE-PARITY) **twice** on searound / manta / 40, same seed, and varies **only** the duration
inputs:

| | targetSeconds (→ `race_baseSpeed`, schedule) | plan `targetDurationMs` | finishT |
|---|---|---|---|
| **Run A** — sim-native | 60 (`durationSec`) | 60 000 | 2 |
| **Run B** — browser source value | 28 (`quickClosedDuration`) | 28 000 | 2 |

Because both runs use the identical shared step and identical seed/grid, **every difference is
attributable to the duration inputs alone** — zero reimplementation risk. Extensions made to reach the
full real-race model (vs the step-1 mirror): real searound geometry via `EditorShape`, the real
`createRacePlan`/`createTrajectoryController` with shipped `DEFAULT_RACE_DYNAMICS_CONFIG`, the shared
`raceRng`+`rowLayout` (D-GRID) wiring, and the real re-roll/brake/plan step inside `runSingleRace`.

**Validation:** Run A's finish order reproduces the committed step-2a acceptance **exactly** (seed 1:
Quasar, Breeze, Maverick, Hawk, Storm, …; seed 42 winner Zephyr) — so the sim side of the diagnostic is
faithful, and Run A *is* the acceptance the owner compared against.

## Checkpoint diff (seed 1, per-racer t at 5 s of physicsTs)

`t=0 grid identical: true` (same row+lane per racer on both runs).

| physicsTs | A order == B order? | Spearman(A,B) rank corr |
|---|---|---|
| 5 000  | no | 0.952 |
| 10 000 | no | 0.805 |
| 15 000 | no | 0.801 |
| 20 000 | no | 0.778 |
| 25 000 | no | 0.708 |
| 30 000 | no | 0.619 |
| 35 000 | no | 0.460 |
| 40 000 | no | 0.439 |
| 45 000 | no | 0.100 |
| 50 000 … 95 000 | — | Run B already finished (it is 2.14× faster); Run A still racing |

**Earliest divergence:** immediate. The two streams are identical at t=0 and diverge from the *first*
re-roll/step window, because `race_baseSpeed` differs by the full 60/28 ratio — Run B pulls ahead in
absolute t at every checkpoint and the *ordering* correlation decays monotonically. This is **not** a
finish-line detection artefact (the streams never re-converge; they separate from the start), and it is
**not** all-or-nothing per racer — it is a smooth, growing, duration-driven drift.

## The seam, at the source

Everything before the shared step is identical **except** the duration term:

| Quantity | Browser (file:line) | Sim (file:line) | Same? |
|---|---|---|---|
| finishT (closed) = laps | `index.jsx:501` `raceData.targetLaps ?? lapsFromDuration(duration)` = 2 | `sim-fairness.mjs:3129-3131` `lapsFromDuration(durationSec)` = 2 | **YES** |
| `race_baseSpeed` duration arg | `index.jsx:508-510` uses **`targetDuration`** = `quickClosedDuration` (`SetupScreen.jsx:465,491`) = **28** | `sim-fairness.mjs:663-666` uses **`targetSeconds`** = `durationSec` = **60** | **NO** |
| re-roll schedule basis | `index.jsx:560` `rerollDurationSec = estimatedDurationSec` (`estimateClosedTrackDurationSec`, `lapUtils.js:113`) ≈ **41.3 s** | `sim-fairness.mjs` `realizedDurationSec = targetSeconds·ems·closedSsf` ≈ **89.0 s** | **NO** |
| plan `targetDurationMs` | `index.jsx:719` `targetDuration*1000` = **28 000** | `sim-fairness.mjs:3167` `durationSec*1000` = **60 000** | **NO** |

The root is a **decoupling the sim does not mirror**: the browser derives finishT from the *setting*
(`duration` 60 → 2 laps) but derives pace/schedule/plan from the *nominal* traversal time
(`estimatedSecondsPerLap·laps` ≈ 28 s, `lapUtils.js:113-128`); the sim couples **all** of them to the
raw `durationSec`. finishT agrees; every "seconds" term disagrees.

## Why the owner saw only front neighbour-swaps — and where the reconstruction breaks

Run A vs Run B, all three acceptance seeds:

| seed | Run A winner (margin) | Run B winner | top-5 overlap | median-time ratio A/B |
|---|---|---|---|---|
| 1  | **Quasar** (0.21 s) | Breeze | 3/5 | 2.179 |
| 7  | **Breeze** (0.05 s) | Gale   | 4/5 | 2.145 |
| 42 | **Zephyr** (0.53 s) | Blitz  | 4/5 | 2.146 |

The **shape** matches the owner's report: the duration perturbation reshuffles finish *times*, so the
tightest front pairs flip (seed 1 Quasar↔Breeze at 0.21 s; seed 7 Breeze↔Gale at 0.05 s) while the
front *set* mostly survives — exactly "front set matches, sub-quarter-second neighbours swap."

But the **magnitude is wrong**: Run B is a 2.14× pace change and it **flips seed 42's winner**
(Zephyr → Blitz, a 4-place jump), whereas the owner reports seed 42's winner **matches exactly**
(0.86 s margin — itself *larger* than Run A's 0.53 s, not the ~0.25 s a half-length race would give).
A browser truly running at 28-nominal (≈43 s) would show ~half Run A's margins and a flipped seed-42
winner. It does not. **Therefore the owner's browser runs much closer to Run A (60-based, ≈90 s) than to
Run B, and the true residual is a *smaller* duration sub-term** — most plausibly the re-roll **schedule
basis** (browser `estimatedDurationSec` ≈ 41 s vs sim `realizedDurationSec` ≈ 89 s) and/or the plan
`targetDurationMs` (28 000 vs 60 000), which perturb re-roll timing and plan-phase placement *without*
the full 2× pace change — rather than `race_baseSpeed` itself.

## Mirror-faithfulness statement

- **Run A is faithful** to the sim/acceptance (reproduces it exactly) and, per the shared-step guarantee
  (FORCE-PARITY), to the browser's per-frame *forces* given identical inputs.
- **Run B is faithful to the browser's SOURCE value** (`targetDuration = quickClosedDuration = 28`,
  verified: manta `speedMultiplier = 1.1` in both `MantaRacerType.js:42` and the sim's `RACER_CONFIGS`)
  — **but it disagrees with the owner's observed browser** (over-diverges, wrong seed-42 winner). So the
  divergence **could live in the reconstruction**: I cannot confirm headlessly what duration the browser
  *actually* feeds `race_baseSpeed` vs the schedule vs the plan at runtime. The seam is definitely the
  duration model; which sub-term carries the *small* real residual is unresolved here.

### Browser-side capture that would settle it (one seeded Quick-Test, seed 1, searound/manta/40/60 s)

Log at race init and finish: `raceData.targetDuration`, the realized `race_baseSpeed`,
`rerollDurationSec` (index.jsx:560), the plan `targetDurationMs`, the **physicsTs at the winner's
finish**, and **per-racer `t` at physicsTs = 5000, 10000, …**. Diff that against Run A's stream (same
emitter). If the browser's finish physicsTs ≈ Run A's (~90 s) it confirms the pace is 60-based and
isolates the residual to the schedule/plan terms; if it's ~43 s, Run B was right and the owner's
seed-42 match needs re-checking.

## Classification for the planner

**(a) — fold into the speed/duration ship.** The closed-track duration model — nominal
(`estimatedSecondsPerLap·laps`) vs realized (`durationSec·ems·closedSsf`), and which of them feeds
finishT vs `race_baseSpeed` vs the re-roll schedule vs the plan — is derived inconsistently between the
two engines. Unifying it is precisely the speed/duration ship's job; doing it there (once, with the
canonical semantics decided) is cheaper and safer than a drive-by. It is **not** a one-line fix and
**not** irreducible float noise (the differing term is a real, named scalar).

**Golden-test tolerance until unified:** front margins are as tight as **0.05–0.21 s**, so exact
finish-time equality is unachievable across this seam. The acceptance test should assert **finishing
order with a small time tolerance** (and expect occasional tightest-pair swaps) rather than exact
equality. **Once the duration model is unified**, tighten to: (1) the duration scalars — finishT,
`race_baseSpeed`, `rerollDurationSec`, plan `targetDurationMs` — **bit-match** across engines, then
(2) per-racer `t` at every checkpoint matches to float tolerance (~1e-6). Exact equality becomes the
target only after the duration derivation is shared, the way `raceStep.js` and the grid already are.
