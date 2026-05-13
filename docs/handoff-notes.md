# Handoff Notes

## 2026-05-13 - Constraints-First Planner Skeleton Added

### Added
- New module: `client/src/modules/planner/constraintsPlannerSkeleton.js`

### What is included
- Plain-object example literals for:
  - HorseState
  - TrackModel
  - Intent
  - ReservationTube (including reservedCapsules)
  - ConstraintSet
  - SolverInput / SolverOutput
- `planFrame(state, dt)` pipeline with A..G step boundaries and function wiring:
  - `predictSnapshot`
  - `computeIntents`
  - `sortByPriority`
  - `reservationLayer`
  - `applyFirstControl`
  - `postStabilize`
  - `writeDiagnostics`
- Minimal hard-layer solver:
  - `solveHardLayerProjectedQP(input)`
  - Sequential projected-gradient objective updates
  - Active-set style corrections for track bounds and reservation collisions
  - Lateral-first avoidance, longitudinal slowdown fallback when lateral path blocked
- KPI diagnostics structure and update points for 8 metrics.
- `runConvergenceExample()` demonstrating leader-centerline retention and follower bypass/brake behavior.

### Integration notes
- Keep existing drafting implementation and wire it through `state.draftApi.computeDraftBonus(...)`.
- Keep world-space rendering anchored to planner outputs from `s/y` to avoid visual double-image artifacts.
- The current file is intentionally a skeleton and should be split into production modules once validated.

### Next suggested tasks
1. Add adapter from current racer model to `HorseState` and back.
2. Replace current PBD frame call with `planFrame` behind a runtime feature flag.
3. Log KPI snapshot every 1s and expose in dev panel.
4. Add deterministic replay test for a 20-horse convergence scenario.
