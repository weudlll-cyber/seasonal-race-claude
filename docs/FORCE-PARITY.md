# FORCE-PARITY — browser vs. fairness sim (INFRA 5B)

**Read-only audit. Nothing here was fixed — everything is named.** Date: 2026-07-10, on
`chore/sim-trust` at the Stage-5A commit (`de66798`).

## Method

Every force that changes a racer's forward motion (`r.t`) funnels through ONE shared
function — `advanceRacerT` in [raceStep.js](../client/src/modules/raceStep.js#L72-L86):

```
t += baseSpeed · boost · brake · rowEnvMult · trajectoryMult · areaBonusMult · governorMult · dt
     (then finish clamp: Math.min(advanced, finishT + 0.001))
```

Because both engines import `advanceRacerT`, factors **4–8 (rowEnvMult, trajectoryMult,
areaBonusMult, governorMult, dt), the multiplication order, and the finish clamp are identical
by construction.** The divergence risk lives entirely in the **inputs** each engine computes
*before* the t-update: `baseSpeed`, `boost`, `brake`, `governorMult`, and the re-roll schedule
that drives `spreadFactor → baseSpeed`.

Two divergences already found came from the same switch (`phaseSplitBonusEnabled`): `rowEnvMult`
(INFRA step 4) and `areaBonusMult` (INFRA step 5A, `de66798`). This audit enumerates every
remaining force to find a third before it finds us.

Every row was verified against the source directly (not only via the inventory sub-agents).

### Verdicts

- **IDENTICAL** — same value on both sides for every input, by shared code or line-for-line
  equal formula reading the same config source.
- **IDENTICAL-BY-SHARED-MODULE** — both call the same imported function; parity is guaranteed
  *given identical call arguments / geometry*. The dependency is named where it matters.
- **DIVERGENT** — the two sides can produce different values under the shipped config.
- **DIVERGENT-IF-OVERRIDDEN** — identical at the shipped default, but the two sides read the
  value from different places, so an owner override moves only one side.
- **BROWSER-ONLY / SIM-ONLY** — the force exists on one side only.

## Force table

| # | Force | Browser (file:line) | Sim (file:line) | Verdict |
|---|-------|---------------------|-----------------|---------|
| 1 | `baseSpeed` assembly `= race_baseSpeed·speedMultiplier·spreadFactor·speedBonusMult` | index.jsx:618 | sim-fairness.mjs:629 | **IDENTICAL** — same factors, same order |
| 2 | `race_baseSpeed` (N-calibrated back-solve) | index.jsx:500-503 → raceBaseSpeed.js `computeRaceBaseSpeed` | sim-fairness.mjs:569-572 → same helper, same args | **IDENTICAL** (shared helper) |
| 3 | `speedMultiplier` (racer-type constant) | racerType / RACER config | sim-fairness.mjs RACER_CONFIGS:449-470 | **IDENTICAL** (per-type constant) |
| 4 | `BASE_SPEED_MIN/MAX/MEAN` band = 0.00096 / 0.00113 | index.jsx:423-425 via `loadBaseSpeedConfig()` | sim-fairness.mjs:549-551 via `DEFAULT_BASE_SPEED_CONFIG` | **IDENTICAL** — same SOT ([defaults.js:29-30](../client/src/modules/storage/defaults.js#L29-L30)); spread ±8.1% both |
| 5 | `spreadFactor` init `= (MIN+rand·(MAX−MIN))/MEAN` | index.jsx:604 | sim-fairness.mjs:617 | **IDENTICAL** formula (RNG stream differs *by design*: sim seeds `Math.random`, browser uses system RNG) |
| 6 | `speedBonusMult` / `rawRowBonus` (start-row bonus) | index.jsx:587 `computeSpeedBonus` | sim-fairness.mjs:608 same shared fn | **IDENTICAL-BY-SHARED-MODULE** (depends on identical row layout — a maintained invariant) |
| 7 | `finishT` `= min(BASE_SPEED_MEAN/ssf·spd·FPS·dur, 1−runoutZone)` | index.jsx:488-493 | sim-fairness.mjs:2498-2500 `computeFinishT` | **DIVERGENT-IF-OVERRIDDEN** — identical at default (`runoutZone=0.05`), but sim hardcodes `0.05` in `computeFinishT` while browser reads `behaviorConfig.runoutZone`. See open item **O1**. |
| 8 | Re-roll schedule (`rollCount`, `rollInterval`, `lastRollDeadline`, `realizedDuration`) | index.jsx:538-539, 938-939 | sim-fairness.mjs:599-602 | **IDENTICAL** — same formulas, same `dynamicsConfig` source (75 / 3.0 / 10 / 95) |
| 9 | Re-roll target draw (variant 1) | index.jsx:1093-1110 | sim-fairness.mjs:1036 | **IDENTICAL** at default. **SIM-ONLY**: `--rerollVariant=2` mean-reverting draw (sim:1032-1035), no browser equivalent, default off. See **O2**. |
| 10 | Re-roll transition (`easeInOutCubic`, `transitionDuration`) | index.jsx:1119-1124 | sim-fairness.mjs:1058-1063 | **IDENTICAL** |
| 11 | PULK re-roll bias | index.jsx (re-roll call) → racePlanner.js `computePulkBiasedTarget` | sim-fairness.mjs:1039-1045 → same fn | **IDENTICAL-BY-SHARED-MODULE** |
| 12 | `boost` / drafting | index.jsx:1129 (`draftingBoostActive`) ← raceBehavior.js `applyRacerBehavior` | sim-fairness.mjs:1338 ← same fn | **IDENTICAL-BY-SHARED-MODULE** (depends on identical geometry) |
| 13 | `brake` / avoidance = `min(effectiveBrakeFactor, brakeMatchFactor)` | index.jsx:1130-1142 ← `computeEffectiveBrakeFactor` + raceBehavior.js | sim-fairness.mjs:1334, 1341-1343 ← same fns | **IDENTICAL-BY-SHARED-MODULE** |
| 14 | `rowEnvMult` (start-row phase envelope) | index.jsx:1146 → raceStep.js:46-55 | advanceRacerT (sim:1347) → same fn | **IDENTICAL** (single source — INFRA step 4) |
| 15 | `trajectoryMult` (P-controller + easeInOutCubic) | index.jsx:1028-1042 ← racePlanner.js `update` | sim-fairness.mjs:1078-1090 ← same fn | **IDENTICAL-BY-SHARED-MODULE** |
| 16 | `areaBonusMult` (band bonus + phase-split) | index.jsx:1025 (threaded) ← racePlanner.js `update` | sim-fairness.mjs:1078 ← same fn | **IDENTICAL** (single source — INFRA step 5A, this commit) |
| 17 | `governorMult` (pre-OUTCOME director) | index.jsx:1057-1073 ← raceGovernor.js `applyGovernor` | sim-fairness.mjs:1110-1116 ← same fn | **IDENTICAL-BY-SHARED-MODULE** — same gate: `racePlan(Controller) && governorDirectorEnabled && !directorV4Enabled` |
| 18 | `dt` = 1.0 per step | raceStep.js:73 (`FIXED_DT/16`) | sim-fairness.mjs:1352 (`DT/16`) | **IDENTICAL**. Browser rAF accumulator caps at 2 catch-up steps/frame — real-time *pacing*, deterministic in `physicsTs`; not a force. |
| 19 | Finish clamp `min(advanced, finishT+0.001)` | raceStep.js:85 | raceStep.js:85 | **IDENTICAL** (shared) |
| 20 | Finish detection (`r.t≥finishT → finishRank`) | index.jsx:1187-1192 | sim-fairness.mjs:~1785 | **IDENTICAL** |
| 21 | Lap normalization (`t` unbounded; `((t%1)+1)%1` for position/gap only) | index.jsx:853 (`tPos`, position-only; `r.t` never mutated) | sim-fairness.mjs:670-677 | **IDENTICAL** behaviour — but *independent* implementations, not shared code. See **O3**. |
| 22 | Run-out decay (finished racers `×0.97`) | index.jsx:1159-1160 | — (init only, sim:640, never applied) | **BROWSER-ONLY** — see **O4** |

## Still-open divergences (plain language) — NAMED, NOT FIXED

**O1 — `finishT` run-out zone source.** The sim's `computeFinishT` (sim-fairness.mjs:498-500)
takes `runoutZone` as a parameter defaulting to `0.05` and is **called without passing it**, so
the sim always uses `0.05`. The browser uses `behaviorConfig.runoutZone` (index.jsx:491). Both
are `0.05` in the shipped config, so today they agree. If the owner ever changes `runoutZone`,
the browser's open-track finish line moves and the sim's does not. Low blast radius (open tracks
only), but it is a real seam. *Fix would be: thread `behaviorConfig.runoutZone` into the sim's
`computeFinishT` call.*

**O2 — `--rerollVariant=2` is a sim-only experiment.** The mean-reverting re-roll draw
(sim-fairness.mjs:1032-1035) has no browser equivalent. It defaults to variant 1 (byte-identical
to the browser), so a normal run is parity-clean; but any sweep run with `--rerollVariant=2`
measures a race the browser cannot produce. Expected (it is a strip-down experiment), listed for
completeness.

**O3 — lap normalization is duplicated, not shared.** Both sides keep `r.t` unbounded and wrap
only for position/gap lookups, and the wrap formula `((t%1)+1)%1` is identical — but it lives in
two hand-written copies (index.jsx `tPos` / sim-fairness.mjs:670-677) rather than one shared
helper. It is correct today; it is the *class* of thing that drifted for `rowEnvMult` and
`areaBonusMult`. A future single-source pass (like raceStep.js) would close it.

**O4 — run-out decay is browser-only, with no outcome impact.** After a racer finishes, the
browser keeps advancing it with an exponential `×0.97` decay (a visual roll-out past the line);
the sim freezes finished racers. This never touches `finishRank` or `finishTime` (both locked at
the finish crossing), so **no fairness or gap-space metric is affected** — it is purely cosmetic.
Named so it is not mistaken for a measurement bug later.

**O5 — auxiliary sweep scripts do not thread the phase-split.** The main fairness sim
(sim-fairness.mjs) now applies the shipped areaBonus split natively (INFRA 5A), but the smaller
analysis tools — `compare-zones.mjs`, `compare-sets.mjs`, `param-sweep-full.mjs`,
`sweep-lateral.mjs`, `sim-sweep.mjs` — call `createRacePlan` with only
`{ bonusStrengthMultiplier }` and **no `phaseSplitBonusEnabled`**, so they run WITHOUT the split
(as they always did). They therefore diverge from the browser's shipped split. They are separate
tools, not "the sim," and were already in this state before 5A — but if any of them is used to
judge shipped behaviour, its numbers omit the phase-split. Named, not fixed.

**O6 — shared-module parity is conditional on identical geometry.** Rows 6, 12, 13, 15, 17 are
"identical *by shared module*." That guarantee holds only while both engines feed those functions
the same racer positions, body sizes, and row layout. That equality is a *maintained invariant*
(the row-layout / overlap parity work), not a structural certainty. It is the most likely place a
future geometry change re-opens a gap without touching any force directly.

## Bottom line

At the shipped config, after INFRA steps 4 and 5A, **no force in the t-update diverges between
browser and sim.** The two known divergences (`rowEnvMult`, `areaBonusMult`) are closed at the
source. The open items above are seams (O1, O3, O6), a cosmetic browser-only effect (O4), and
sim-only tooling (O2, O5) — none is an active divergence in a default shipped race. No third
active force divergence was found.
