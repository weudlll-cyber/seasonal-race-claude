# Free-Lane Separation Report

Date: 2026-05-14
Branch: claude/free-lane-separation
Base commit: a49636e
Worktree: c:\Users\weudl\OneDrive\Dokumente\Seasonal race claude-master-merge

## 1. What was implemented

Changed files:
- client/src/modules/raceBehavior.js (+133/-0)
- client/src/screens/RaceScreen/index.jsx (+3/-0)
- client/src/modules/storage/defaults.js (+1/-1)
- client/src/modules/raceBehavior.test.js (+116/-0)
- client/src/modules/raceDynamicsConfig.test.js (+2/-2)
- client/src/screens/DevScreen/sections/RaceTuningSection.test.jsx (+4/-4)

Algorithm (Free-Lane Separation, additive):
- Per racer pair the existing force logic continues to be applied.
- Additionally, when active overlap is detected, left/right space is checked.
- Space check uses existing geometry derivation (spriteWorldSizePx, trackWidthPx, pathLengthPx), no new tuning defaults.
- When space is free on both sides, the Y-geometry rule is applied (left/right by current physicalY position).
- At exactly equal physicalY, choice is made deterministically via a stable hash of racer IDs (no Math.random).
- The resulting free-lane movement is added as an additive delta force to the existing yDelta.
- Final position clamping remains unchanged via existing maxLateral + clamp.

## 2. Before/after values table

| Value | Old | New | Rationale |
|---|---:|---:|---|
| reRollVariationPercent | 45 | 58 | More race drama/position changes, within target range 55-60 |
| all other defaults | unchanged | unchanged | Only the requested increase for reRoll |

## 3. Test results

- Pre-count (base master a49636e): 94 files / 1728 tests (green, previously verified)
- Post-count (branch claude/free-lane-separation): 94 files / 1734 tests (green)
- New tests: 6 free-lane unit tests in client/src/modules/raceBehavior.test.js

New test cases:
- Overlap, both sides free → Y-geometry rule separates left/right
- Overlap, one racer only one side free → one-sided yielding + geometry for the other
- A only left free, B only right free → A left, B right
- All sides blocked → no additional free-lane action
- Exactly equal physicalY → deterministic selection (stably repeatable)
- Free-lane respects maxLateral (no jump outside the cap)

## 4. Status of the three ABSOLUTE rules

- Rule #1 (no new race-behavior-relevant constants): observed.
  - No new tunable defaults or new mechanics constants in defaults.js.
  - Free-lane thresholds are derived from existing geometry (sprite/track/path).
- Rule #2 (DevScreen Single Source of Truth): observed.
  - Changed default remains tunable in the existing DevScreen re-roll block.
- Rule #3 (localStorage note): observed.
  - PR text explicitly notes "Reset All Defaults".

## 5. Visual test — notes for user

Before test, mandatory:
- DevScreen → click "Reset All Defaults" (otherwise old localStorage values remain active).

Observe:
- Do overlapping racers separate earlier/more reliably into lateral free areas?
- Does movement stay smooth (no jumps, no double images)?
- Is re-roll-driven race action visibly higher than at default 45?
- Do drafting effects remain recognizably active?

If too little action:
- Increase reRollVariationPercent slightly further (e.g. 60 → 65) in DevScreen.

If packs become too strong again:
- Decrease reRollVariationPercent slightly (e.g. 58 → 55).
- Fine-tune drafting values from PR #97 instead of introducing new mechanics.

## 6. Observations from the implementation

- Without per-racer geometry metadata (sprite/track/path) the required "half sprite width" check in raceBehavior.js was not robustly possible.
- Therefore existing, already-computed values from RaceScreen were written to each racer (derived, not newly tuned).
- No open blocker question identified for this spec.

## 7. PR status

- PR number: #98
- PR URL: https://github.com/weudlll-cyber/seasonal-race-claude/pull/98
- Branch name: claude/free-lane-separation
- Commit SHAs:
  - d483f81 (feat)
  - 092d792 (test)
  - 8bd4594 (docs)
