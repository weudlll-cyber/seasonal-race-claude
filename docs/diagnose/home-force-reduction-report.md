# Home-Force Reduction On Overlap Report

## 1. What was implemented

Files:

- client/src/modules/raceBehavior.js
- client/src/modules/storage/defaults.js
- client/src/modules/raceBehaviorConfig.js
- client/src/screens/DevScreen/sections/RaceTuningSection.jsx
- client/src/modules/raceBehavior.test.js
- client/src/modules/raceBehaviorConfig.test.js
- client/src/screens/DevScreen/sections/RaceTuningSection.test.jsx

Code delta (fix scope only, excluding report file):

- Added lines: 124
- Removed lines: 5

Conditional logic:

- Overlap detection uses the same geometry condition as free-lane (dT/tHalfSpan + dY/lateralHalfSpan).
- An overlap flag is collected per racer.
- Home force is scaled per frame:
  - without overlap: factor = 1.0
  - with overlap: factor = homeForceReductionOnOverlap
- Avoidance, free-lane, drafting, reRoll, and the remaining mechanics remain unchanged.

## 2. Values table

| Value                       | New | Default | Tunable in DevScreen |
| --------------------------- | --- | ------- | -------------------- |
| homeForceReductionOnOverlap | Yes | 0.3     | Yes                  |

UI note:

- New input in block "Home Force": "Home Force Reduction On Overlap" (range 0.0 to 1.0).
- Tooltip: "Home force factor when actively overlapping. 0.3 = 30% normal strength when racer overlaps."
- localStorage note for PR update: user must click "Reset All Defaults" to ensure the new value lands safely in the saved config object.

## 3. Test results

Full test pre (before fix):

- Test suites: 506
- Tests: 1734
- Passed: 1734
- Failed: 0

Full test post (after fix):

- Test suites: 506
- Tests: 1741
- Passed: 1741
- Failed: 0

New unit tests (required):

- applyRacerBehavior — home force:
  - reduces home force by factor during active overlap
  - keeps full home force when there is no overlap
  - homeForceReductionOnOverlap=1.0 disables reduction (backwards-compat)
  - homeForceReductionOnOverlap=0.0 disables home force during overlap

Additional validation:

- raceBehaviorConfig.test.js:
  - default range check for homeForceReductionOnOverlap (0..1)
  - invalid >1 fallback to defaults
  - invalid <0 fallback to defaults
- RaceTuningSection.test.jsx:
  - new input is rendered

## 4. Status of the three ABSOLUTE rules

Rule #1 (no further new constants):

- Observed. Only homeForceReductionOnOverlap newly introduced.

Rule #2 (DevScreen Single Source of Truth):

- Observed. Value is integrated in DEFAULT_RACE_BEHAVIOR_CONFIG, load/save config and DevScreen input.

Rule #3 (localStorage note):

- Observed. Note documented: click "Reset All Defaults".

## 5. Expected vs. actual

Diagnosis baseline (before fix):

- 99.1% persistent overlap transitions
- Home force in failure 2.8× stronger than free-lane

Expected after fix (data-based):

- On overlap, home force is scaled by 0.3.
- Effective home magnitude drops from approx. 0.0062 to approx. 0.0019.
- This is just below free-lane approx. 0.0022, so free-lane should win significantly more often.
- Expected rough order: persistent overlaps significantly reduced, plausibly toward <50%.

Important:

- Actual effectiveness must be confirmed visually by user verification in Race Screen (20 racers, dirt oval, drafting on).

## 6. Tuning recommendation if result is not convincing

- If packs remain persistently overlapping:
  - Lower homeForceReductionOnOverlap toward 0.15 or 0.0.
- If racers drift too far apart:
  - Raise homeForceReductionOnOverlap toward 0.5 to 1.0.
- If race field dissolves too strongly:
  - Reset to >=0.5 and observe again.

## 7. What would need to be tested next

If home-force reduction alone is insufficient:

- Test overlap-conditional avoidance reduction separately (separate scope).
- This follow-up spec is deliberately not part of this fix.
