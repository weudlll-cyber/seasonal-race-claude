# Cleanup Audit — PR #98 (Free-Lane Separation + Home-Force Reduction)

<!-- HISTORICAL: 2026-05-14 — the cleanup audit for PR #98, describing the code as it was that day -->

> **Read this as HISTORY.** It records what was measured or true on 2026-05-14. Config values in it are
> that day's values, not today's; today's live in `client/src/modules/storage/defaults.js`.

**Date:** 2026-05-14  
**Branch:** `claude/free-lane-separation`  
**Scope:** All files changed in PR #98 (code, tests, DevScreen UI)

---

## Step 2 — Code Audit PR #98

### `client/src/modules/raceBehavior.js`

**Finding:** Clean.

- No dead code paths, no commented-out blocks.
- No unused imports (no imports — it is a pure function file).
- Utility functions (`normalizeAngle`, `shortestArcDeltaT`, `stablePairBit`, `getSpriteWorldSizePx`, `getTrackWidthPx`, `getPathLengthPx`) are all used.
- Magic numbers: `1e-6` (line 241) is standard epsilon for float comparison, no explanation needed. `2166136261` and `16777619` (lines 43–44) are FNV-1a constants — sufficiently recognizable from context.
- Comment lines 286–289: architectural note about drafting-cone limitation with reference to backlog item. Not a zombie comment — keep.
- No `console.log`/`console.error`.
- Naming: consistently camelCase, no inconsistencies.

**Fixes needed:** None.

---

### `client/src/modules/raceBehaviorConfig.js`

**Finding:** Clean.

- Migration comment line 15 (`LEGACY_START_SPREAD_DEFAULT`) is correct and necessary.
- Validation covers all config fields including `homeForceReductionOnOverlap` (lines 30–31).
- No dead code, no unused imports.

**Fixes needed:** None.

---

### `client/src/modules/storage/defaults.js`

**Finding:** Clean.

- `homeForceReductionOnOverlap: 0.3` correctly added with explanatory comment.
- `reRollVariationPercent: 58` (from PR #98 base) correct.
- No magic numbers without context.

**Fixes needed:** None.

---

### `client/src/screens/DevScreen/sections/RaceTuningSection.jsx`

**Finding:** Two errors.

#### Error 1 — `homeForceReductionOnOverlap` in wrong block (UX bug)

The input field for `homeForceReductionOnOverlap` is in the `formGrid` of **Block 2 (Start Layout)** (lines 399–421), but semantically belongs to **Block 9 (Home Force)**.

Consequence:

- The "Reset" button of Block 2 (`resetStartLayout`) does **not** reset `homeForceReductionOnOverlap` (only `startSpreadRange` and `runoutZone`).
- The "Reset" button of Block 9 (`resetHomeForce`) resets `homeForceReductionOnOverlap` — but the field sits three blocks higher up.
- User sees the field in "Start Layout", presses Reset there → field remains unchanged.

**Fix:** Move input from Block 2 to Block 9. `resetHomeForce` already covers it correctly.

#### Error 2 — InfoTooltip text in German (App-Language-Convention)

Line 405:

```
text="Home-Force-Faktor bei aktivem Overlap. 0.3 = 30% normale Starke wenn Racer uberlappt."
```

All other InfoTooltips in the same file are in English. This text was apparently added quickly during the diagnostic sprint and not adjusted.

**Fix:** Set English text, consistent with other tooltips.

---

### `client/src/screens/RaceScreen/index.jsx`

**Finding:** Clean for PR #98 scope.

- Geometry metadata (`spriteWorldSizePx`, `geometricTrackWidthPx`, `pathLengthPx`) is correctly passed to each racer (lines 368–370).
- `applyRacerBehavior` is called with complete `behaviorConfig` (line 935).
- The only `console.error` (line 178) is legitimate: critical guard for missing `geometryId`.

**Fixes needed:** None.

---

### Test Files

#### `client/src/modules/raceBehavior.test.js`

**Finding:** Clean.

- Home-force reduction tests (lines 121–180): test `homeForceReductionOnOverlap` correctly.
- Free-lane separation tests (lines 387–487): cover all 6 separation scenarios.
- No ghost tests. All tests reference functions/constants that exist in the current code.

#### `client/src/screens/DevScreen/sections/RaceTuningSection.test.jsx`

**Finding:** Mostly clean. One precision gap.

- The test "renders Block 9: Home Force" checks `getByLabelText('Home Force Reduction On Overlap')` (line 167).
- **After the fix** (move to Block 9) the test remains correct — it only checks whether the element is present in the DOM, not which block it is in.
- The mocks contain `homeForceReductionOnOverlap: 0.3` consistent with defaults.
- No ghost tests.

---

## Step 4 — Backend-UI Consistency

### Classification of all `DEFAULT_RACE_BEHAVIOR_CONFIG` fields

| Field                         | UI block                              | Wired? | Class                   |
| ----------------------------- | ------------------------------------- | ------ | ----------------------- |
| `enabled`                     | Checkbox (bottom)                     | ✅     | HOT                     |
| `startSpreadRange`            | Block 2                               | ✅     | HOT                     |
| `runoutZone`                  | Block 2                               | ✅     | HOT                     |
| `homeForceStrength`           | Block 9                               | ✅     | HOT                     |
| `homeForceReductionOnOverlap` | Block 2 (wrong) → Block 9 (after fix) | ✅     | HOT (misplaced → fixed) |
| `comfortThreshold`            | Block 6                               | ✅     | HOT                     |
| `softRepulsionStrength`       | Block 6                               | ✅     | HOT                     |
| `avoidanceDistance`           | Block 7                               | ✅     | HOT                     |
| `tWeight`                     | Block 7                               | ✅     | HOT                     |
| `yWeight`                     | Block 7                               | ✅     | HOT                     |
| `lateralForce`                | Block 7                               | ✅     | HOT                     |
| `maxLateral`                  | Block 7                               | ✅     | HOT                     |
| `speedBrakeYThreshold`        | Block 8                               | ✅     | HOT                     |
| `speedBrakeTThreshold`        | Block 8                               | ✅     | HOT                     |
| `speedBrakeFactor`            | Block 8                               | ✅     | HOT                     |
| `draftingMaxDistance`         | Block 5                               | ✅     | HOT                     |
| `draftingConeAngle`           | Block 5                               | ✅     | HOT                     |
| `draftingBoost`               | Block 5                               | ✅     | HOT                     |

**Result:** 18/18 fields HOT. 0 GHOST, 0 MISSING. 1 MISPLACED (fixed in the same commit).

**Free-Lane note:** There is no separate UI tunable for free-lane separation force — by design. Free-lane logic uses `lateralForce` and `maxLateral` from Block 7 (Soft Avoidance), which are already HOT.

---

## Step 7 — Security Check

**npm audit:** `found 0 vulnerabilities`

**Secrets grep** (API keys, tokens, passwords, credentials in client/src/): No findings.

**`.env` files committed:** None.

**Result:** Security check passed — no findings.

---

## Monitoring Metrics

| Metric                           | Value                                     |
| -------------------------------- | ----------------------------------------- |
| Ghost tests removed              | 0                                         |
| Ghost UI bindings removed        | 0                                         |
| Misplaced UI fields fixed        | 1 (homeForceReductionOnOverlap → Block 9) |
| Language-Convention fixes        | 1 (Tooltip German → English)              |
| raceBehavior.js: dead code paths | 0                                         |
| New zombie comments              | 0                                         |
