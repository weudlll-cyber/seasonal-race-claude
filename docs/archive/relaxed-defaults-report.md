# Relaxed Defaults Report

Date: 2026-05-14
Branch: claude/relaxed-defaults
Base commit: 47b10eff327aabd332d54af722ce79d7f6546df4

## 1. Before/after table

| Value                             |     Old |     New | Rationale                                                         |
| --------------------------------- | ------: | ------: | ----------------------------------------------------------------- |
| BASE_SPEED_MIN                    | 0.00091 | 0.00096 | Spread reduced, mean stays the same (0.001045).                   |
| BASE_SPEED_MAX                    | 0.00118 | 0.00113 | Spread reduced, mean stays the same (0.001045).                   |
| Spread calculated ((max-min)/min) |   29.7% |   17.7% | Target range below 15-18% hit (near upper end, but within).       |
| reRollVariationPercent            |      85 |      45 | Within recommended range 35-50, less volatile pack reformation.   |
| draftingBoost                     |    1.10 |    1.04 | Within recommended range 1.02-1.05, less pack-driving attraction. |
| draftingMaxDistance               |     110 |      80 | Shorter range, drafting acts more locally rather than broadly.    |

Note on cone width (draftingConeAngle):

- Unchanged at 30.
- Assessment: unclear whether a blanket reduction to 25 is immediately sensible, as this appears strongly track- and camera-dependent.
- Suggestion for A/B in visual test (no default decision here): 30 vs 25.

## 2. Status of the three ABSOLUTE rules

- Rule #1 (no new constants): observed.
  - Only existing defaults were changed.
  - No new mechanics, no new mode, no new race constant introduced.
- Rule #2 (DevScreen single source of truth): observed.
  - All changed values remain adjustable via existing DevScreen sliders.
- Rule #3 (localStorage note): observed.
  - New defaults only take effect after "Reset All Defaults" if old localStorage values are present.

## 3. Visual test — notes for user

Pay special attention to:

- Do final-lap stacks become smaller or dissolve more often?
- Do visible overtaking maneuvers still emerge rather than "one block"?
- Is race drama preserved (position changes) without chaotic reformation of large packs?

Good result:

- Fewer persistent overlaps in the mid/late phase.
- Drafting visible, but not as a dominant "collection magnet".
- Position changes present, but less extreme jump character.

Warning sign:

- Large multi-overlaps remain nearly unchanged.
- Or race feels "too static" without recognizable duels.

## 4. Tuning recommendations if visual test is not convincing

If packs are still too large:

- `draftingMaxDistance` further decrease (e.g. 80 -> 70 -> 60).
- `reRollVariationPercent` further decrease (e.g. 45 -> 40 -> 35).
- optional A/B: `draftingConeAngle` 30 -> 25.

If race drama is now too boring:

- `reRollVariationPercent` slightly increase (e.g. 45 -> 50).
- `draftingBoost` slightly increase (e.g. 1.04 -> 1.05).

If drafting is too weakly visible:

- first `draftingMaxDistance` slightly increase (80 -> 90),
- then if needed `draftingBoost` minimally increase (1.04 -> 1.05),
- `draftingConeAngle` leave unchanged initially, then A/B 30 vs 35.

## 5. PR Status

- PR number: #97
- PR URL: https://github.com/weudlll-cyber/seasonal-race-claude/pull/97
- Branch name: claude/relaxed-defaults
- Commit SHAs:
  - fd50e98 (feat)
  - 437b494 (test)
  - 830af80 (docs)
  - 15a76fe (docs-fix)

## Test Results

- Pre-test count: 94 files, 1728 tests, all green.
- Post-test count: 94 files, 1728 tests, all green.
- Difference: 0 new tests (only expected values for changed defaults adjusted).
