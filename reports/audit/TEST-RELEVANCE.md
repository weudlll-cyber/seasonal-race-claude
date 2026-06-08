# RaceArena — Test-Relevance Triage Report

**Date:** 2026-06-09  
**Produced by:** AUTORUN STEP 9 (read-only — no tests were changed, deleted, or added)  
**Start point:** backup/auto-08 (after STEP 8)  
**Method:** grep + manual inspection of all `*.test.js` / `*.test.jsx` files

---

## Summary

| Category | Count | Finding |
|----------|-------|---------|
| Total test files inspected | 123 (121 client + 2 server) | — |
| `.skip` / `.todo` / `xtest` / `xdescribe` | 0 | Clean |
| Tests referencing REMOVED component names | 0 | Clean |
| Tests asserting old hex ID `90d3020197da` | 0 | Clean |
| Tests asserting retired race-engine fields | 1 file, 2 tests | Intentional (see F-01) |
| Genuine near-duplicate test groups | 13 racer-type files | Intentional (see F-02) |
| Over-mocked tests that test mock, not unit | 0 critical | None found |
| Vacuously-passing tests (L135 null-geometry trap) | 1 candidate | Low risk (see F-03) |
| Uncovered modules with no test file | 4 | Pre-existing gaps (see Gaps) |

---

## Flagged Candidates

### F-01 — `raceBehaviorConfig.test.js:60–61, 87–89` — `avoidanceDistance` field

**Location:** `client/src/modules/raceBehaviorConfig.test.js:60–61, 87, 89`

**Why flagged:** `avoidanceDistance` was a physics field removed from the active race-behavior tuning UI. Two tests assert its presence in the config.

**Analysis:** The field is explicitly retained for sim-script backward compatibility (the test at line 60–61 has the comment: `"kept for sim-script backward compat"`). `sim-fairness.mjs` reads this field at runtime. The field still exists in `DEFAULT_RACE_BEHAVIOR_CONFIG` and the assertion is accurate. The mock-based test at line 87–89 confirms the field passes through `mergeRaceBehaviorConfig`.

**Recommended action:** **KEEP-and-document** — add a comment to the `DEFAULT_RACE_BEHAVIOR_CONFIG` definition in the source noting that `avoidanceDistance` is retained for sim-script compat. No test change needed.

**Risk if removed:** `sim-fairness.mjs` reads `avoidanceDistance`; removing the field without updating the sim would break sim runs. Zero risk from keeping these tests.

---

### F-02 — Racer-type duplicate `_drawBody` / `_getFrameIndex` tests (13 files)

**Locations (sample):**

| File | Lines | Pattern |
|------|-------|---------|
| `racer-types/beetle.test.js:128,141` | `_getFrameIndex`, `_drawBody` | "cycles through 8 frames" / "falls back to arc circle" |
| `racer-types/boarder.test.js:128,141` | Same pattern, 12 frames | |
| `racer-types/buggy.test.js:105,118` | Same pattern, 8 frames | |
| `racer-types/dragon.test.js:113,133` | Same pattern, 16 frames | |
| `racer-types/duck.test.js:108,212` | Same pattern, 8 frames | |
| `racer-types/elephant.test.js:112,133` | Same pattern, 8 frames | |
| `racer-types/f1.test.js:105,118` | Same pattern, 8 frames | |
| `racer-types/giraffe.test.js:112,125` | Same pattern, 8 frames | |
| `racer-types/horse.test.js:203,234` | Same pattern, 8 frames | |
| `racer-types/koi.test.js:181,196` | Same pattern, 16 frames | |
| `racer-types/luge.test.js:129,142` | Same pattern, 16 frames | |
| `racer-types/motorbike.test.js:105,118` | Same pattern, 8 frames | |
| `racer-types/plane.test.js:105` | Same pattern, 8 frames | |

**Why flagged:** These are near-duplicate test patterns across ~13 racer-type files. Each file tests the same structural behaviors (`_drawBody` fallback, `_getFrameIndex` cycling).

**Analysis:** These are NOT vacuous duplicates. Each test operates on a different racer-type class instance with different sprite sheets, frame counts, and animation parameters. The tests verify that each racer type's concrete implementation conforms to the SpriteRacerType contract. Deduplication into a shared test helper could reduce code but is a style choice, not a correctness issue.

**Recommended action:** **KEEP** — the tests are correct. Optionally refactor into a shared `sharedRacerTypeTests(RacerClass, frameCount)` helper in a follow-on cleanup, but there is zero risk from leaving them as-is.

**Risk if removed:** Removing any of these would leave a racer type without fallback-arc or frame-cycling coverage. Low individual risk but cumulative blind spot.

---

### F-03 — `trackEditorSave.test.js:41,104,119,261` — Empty geometry in save tests

**Locations:** `client/src/screens/TrackEditor/trackEditorSave.test.js:41, 104, 119, 261`

**Why flagged:** These tests construct track objects with `centerPoints: []` (and/or `innerPoints: []`, `outerPoints: []`). Per L135: a test whose setup passes empty/null geometry to a function that returns early on empty geometry means the assertions inside the function body are never exercised.

**Analysis:** Reviewed the actual test purposes:
- Line 41: Tests that `saveTrackToServer` returns a created track ID — the function calls the API, and empty geometry is valid for a default-track save flow. The assertion (`id` is returned) is not vacuous.
- Lines 104, 119: Test error-path behavior (server 400 responses). The geometry content is irrelevant to the error path being tested.
- Line 261: Tests the track-update path. Again, the geometry being empty is valid input for testing the update flow.

**Recommended action:** **KEEP** — these tests are testing the save/API path, not physics or geometry computation. Empty geometry does not cause vacuous assertions for this test purpose.

**Risk if removed:** Low (tests are not vacuous), but removing would reduce coverage of the save-path error handling.

---

### F-04 — `bgImageCache.test.js:42` — `docker compose up` hint assertion

**Location:** `client/src/modules/track-effects/bgImageCache.test.js:36–42`

**Why flagged:** The test asserts on the text `docker compose up` in a console.warn message. This is a hint to the user in a background-image load-failure warning. Unlike the `apiClient.js` German string fix (H-01), this is already the English form.

**Analysis:** The assertion is `expect(warnSpy.mock.calls[0][0]).toContain('docker compose up')` — using the correct English `docker compose up` (no hyphen). The source string in `bgImageCache.js` was always English. This test is sound.

**Recommended action:** **KEEP** — the assertion text is correct and not stale.

**Risk if removed:** Removes coverage of the background-image error-hint message. Low risk.

---

### F-05 — `CameraDirector.test.js:934, 1576` and `cameraConfig.test.js:64` — `showCameraStateHud` config field

**Locations:**
- `client/src/modules/camera/CameraDirector.test.js:934, 1576`
- `client/src/modules/cameraConfig.test.js:64`
- `client/src/screens/DevScreen/sections/SpriteSizeRangeSection.test.jsx:15, 31, 52`

**Why flagged:** `CameraStateHudSection` (the DevScreen section) was merged into `CameraAdvancedSection` in Phase 3D. These tests reference `showCameraStateHud`.

**Analysis:** `showCameraStateHud` is a **camera config field** (key in the camera config object that controls HUD visibility), NOT a reference to the removed `CameraStateHudSection` component. The field still exists in the live camera config schema and is read by `CameraDirector`. These test setups are constructing valid config objects, not referencing the old component name.

**Recommended action:** **KEEP** — the field is valid and tests are correct.

---

## Coverage Gaps (no test file — not flagged as stale, listed for completeness)

These modules have 0% test coverage and no test file. Owner-decision items per TC-01/TC-02/TC-06/TC-08/TC-11 in TEST-COVERAGE.md:

| Module | Lines | Notes |
|--------|-------|-------|
| `RaceScreen/index.jsx` | 1577 | Race engine — requires canvas + rAF (TC-01, owner-decision) |
| `RaceScreen/drawing/*.js` (6 files) | ~900 | Canvas drawing — mock-canvas testable (TC-02, owner-decision) |
| `headlessRaceSimulator.js` | 361 | Sim utility — pure function, testable (TC-06, owner-decision) |
| `TransitionContext.jsx` | 47 | Transition context — easily testable (TC-08, safe-small-fix) |
| `surfaceClassLoader.js` | ~60 | Loader utility — 0% stmt (TC-06 area) |
| `useStorage.js` | ~80 | React hook — 0% branch (TC-11, safe-small-fix) |

---

## Server Tests — No Stale Content Found

Both server test files (`tracks.test.js`, `surfaceClasses.test.js`) are up-to-date:
- All referenced endpoints and functions exist
- No references to removed fields or renamed functions
- The `detectMagicType` and validation tests added in STEP 8 cover the current contract

---

## Conclusion

No immediate deletions or test removals are warranted. The candidates above are all KEEP or KEEP-and-document. The most actionable follow-on work for an awake session:

1. **F-01**: Add a source comment to `DEFAULT_RACE_BEHAVIOR_CONFIG` that `avoidanceDistance` is retained for sim-script compat.
2. **F-02**: Optionally extract a shared racer-type test helper to reduce duplication (pure style).
3. **Coverage gaps**: `TransitionContext.jsx` and `useStorage.js` are the lowest-effort gaps to close (TC-08, TC-11).
