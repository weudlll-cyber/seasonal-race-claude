# RaceArena — Static Analysis Discovery

**Date:** 2026-06-08
**HEAD:** 15ba914
**Branch:** backup/audit-c3
**Scope:** client/src + server/src

---

## TRIAGE TABLE

| ID | Tool | File:Line | Category | Finding | Risk | Notes |
|----|------|-----------|----------|---------|------|-------|
| K01 | knip | client/src/screens/DevScreen/index.js | Dead file | Stub component (renders `<div>`) — never imported; real DevScreen is DevScreen.jsx | Low | True dead code — stub left over from scaffolding |
| K02 | knip | client/src/screens/SetupScreen/index.js | Dead file | Re-export barrel — not imported anywhere (App.jsx imports SetupScreen.jsx directly) | Low | Barrel is unused |
| K03 | knip | client/src/modules/track-effects/effects/bubbles.js | Dead file | Effect module not referenced from index or registry | Medium | Verify no glob or string-ref |
| K04 | knip | client/src/modules/track-effects/effects/dust.js | Dead file | Same as K03 | Medium | Verify |
| K05 | knip | client/src/modules/track-effects/effects/fireflies.js | Dead file | Same as K03 | Medium | Verify |
| K06 | knip | client/src/modules/track-effects/effects/mud.js | Dead file | Same as K03 | Medium | Verify |
| K07 | knip | client/src/modules/track-effects/effects/rain.js | Dead file | Same as K03 | Medium | Verify |
| K08 | knip | client/src/modules/track-effects/effects/stars.js | Dead file | Same as K03 | Medium | Verify |
| K09 | knip | client/src/modules/track-effects/effects/wave.js | Dead file | Same as K03 | Medium | Verify |
| K10 | knip | root package.json:11-12 | Unused dep | `pngjs` and `sharp` listed as devDependencies in root package.json | Low | FALSE POSITIVE — both used in scripts/audit-sprite-crops.mjs and scripts/crop-dolphin-sprite.mjs; knip entry points don't include scripts/ |
| K11 | knip | client/src/modules/track-editor/trackStorage.js:156 | Unused export | `saveTrack` exported but only imported in test files | Low | Only test callers; no production caller |
| K12 | knip | client/src/screens/RaceScreen/drawing/racerRendering.js:24 | Unused export | `drawNameTag` exported but called within same file only | Low | Export surface is public but only self-consumed |
| K13 | knip | client/src/modules/surface-effects/generators/*.js | Unused named exports | `configSchema`, `defaultConfig`, `create` on all 4 generators | Low | FALSE POSITIVE — imported as default object; runtime access via `GENERATORS[classId].configSchema` etc. |
| K14 | knip | client/src/modules/racer-types/index.js (many) | Unused exports | ~25 named exports (individual RacerType classes, COATS_BY_TYPE, RACER_TYPE_LABELS, utility fns) | Medium | Partially false positive: many are consumed by tests; confirm no production callers for getRacerTypeById, listRacerTypes, warmUpAllRacerTypes |
| K15 | knip | client/src/modules/storage/trackLoader.js | Unused exports | `CACHE_KEY`, `loadAllTracks`, `getInitialTracks`, `getTrackBackgroundUrl` | Medium | Verify not called via string-ref or indirect import |
| K16 | knip | client/src/modules/stateOverlayTemplates.js | Unused exports | `OVERLAY_TEMPLATES`, `hasAllVars`, `resolveTemplate` | Medium | Verify no dynamic usage |
| K17 | knip | client/src/modules/rowLayout.js:41 | Unused export | `computeRowLayout` exported but headlessRaceSimulator has its own `computeRowLayoutSeeded` copy | Low | Duplicate logic — candidate for consolidation |
| K18 | knip | 100+ .test.* files | Unused files | All test files listed as "unused" by knip | Info | FALSE POSITIVE — knip entry points don't include vitest config; tests run via vitest |
| K19 | knip | client/src/modules/raceBehavior.js:80 | Unused export | `computeBrakeMatchFactor` | Low | Verify test-only usage |
| K20 | knip | client/src/modules/camera/CameraDirector.js | Unused exports | `CAM_STATE`, `FALLBACK_REFERENCE_SPRITE_SIZE`, `tcToLerpFactor` | Low | Verify test-only; CAM_STATE may be used in HUD components |
| J01 | jscpd | client/src/services/surfaceClassApi.js:13–61 vs trackApi.js:13–61 | CPD | 49-line near-identical API client boilerplate | Medium | Candidate for shared `makeApiClient()` helper |
| J02 | jscpd | server/src/routes/surfaceClasses.js:58–70 vs tracks.js:286–298 | CPD | 13-line duplicate error-response block | Low | Candidate for shared `sendError()` middleware |
| J03 | jscpd | server/src/routes/tracks.js:367–392 vs 417–447 | CPD | 17–27 line duplicate track-write logic | Medium | Two PUT handlers share identical validation+write pattern |
| J04 | jscpd | client/src/modules/cameraConfig.js:504–660 | CPD | ~15 self-clones in cameraConfig.js (per-track parameter blocks) | Low | Likely intentional per-track config; visual duplication only |
| J05 | jscpd | client/src/modules/camera/CameraDirector.js:1551–1598 | CPD | 11-line duplicate block (two similar pan/zoom computations) | Low | Investigate for factoring |
| J06 | jscpd | client/src/modules/racer-types/beetle.test.js vs 13+ other *.test.js | CPD | Racer-type test files share 50–400 token boilerplate | Info | Test duplication; consider shared test helper — low priority |
| J07 | jscpd | client/src/screens/TrackEditor/useViewport.js:40–92 | CPD | 8-line duplicate zoom/pan reset block in same file | Low | |
| J08 | jscpd | client/src/modules/camera/Minimap.js:68–88 | CPD | 6-line coordinate clamp duplicated | Low | Trivial; extract `clamp()` helper |
| E01 | eslint | client/src/contexts/TransitionContext.jsx:44 | react-refresh | Non-component export alongside component export | Info | react-refresh/only-export-components warning |
| E02 | eslint | client/src/modules/camera/CameraDirector.test.js:801,4435 | no-unused-vars | `rs` and `racers` assigned but never used in tests | Info | Test-file noise |
| E03 | eslint | client/src/modules/diagnostics/trackCorridor.test.js:37–257 | no-console | 46× console.log in diagnostic test | Info | Intentional diagnostic output; suppress with eslint-disable or convert to warn |
| E04 | eslint | client/src/modules/track-editor/catmullRom.diagnostic.test.js:126,164 | no-console | 2× console.log in diagnostic test | Info | Same as E03 |
| E05 | eslint | client/src/screens/DevScreen/sections/TrackManager.jsx:18 | no-unused-vars | `RACER_TYPE_IDS` imported but never used | Low | Dead import |
| E06 | eslint | client/src/screens/RaceScreen/index.jsx:56 | no-unused-vars | `PRIORITY_MODE` imported but never used | Low | Dead import |
| E07 | eslint | client/src/screens/RaceScreen/index.jsx:1497 | react-hooks/exhaustive-deps | Missing deps `enablePerfLog` and `showCameraDiagnostics` in useEffect | Medium | Stale-closure risk in perf-log effect |
| E08 | eslint | client/src/screens/SetupScreen/SetupScreen.jsx:206,326 | react-hooks/exhaustive-deps | `racerTypeOverrides` unnecessary in useMemo dep array (×2) | Low | Unnecessary re-compute; minor perf issue |
| S01 | sonarjs | client/src/modules/raceBehavior.js:318 | cognitive-complexity | `applyRacerBehavior` — complexity 467 (limit 15) | High | Core physics loop; well-understood but very hard to review |
| S02 | sonarjs | client/src/modules/camera/CameraDirector.js:1657 | cognitive-complexity | `_setTargets` — complexity 139 | High | Camera state machine switch; candidate for sub-function extraction |
| S03 | sonarjs | client/src/modules/camera/CameraDirector.js:1032 | cognitive-complexity | `_transition` — complexity 97 | High | |
| S04 | sonarjs | client/src/modules/camera/CameraDirector.js:628 | cognitive-complexity | `update` — complexity 94 | High | |
| S05 | sonarjs | client/src/modules/camera/CameraDirector.js:1311 | cognitive-complexity | `_detectPulkGroup` — complexity 92 | Medium | |
| S06 | sonarjs | client/src/screens/RaceScreen/index.jsx:750 | cognitive-complexity | `loop` (rAF callback) — complexity 358 | High | The entire render loop; monolithic by design but extreme complexity |
| S07 | sonarjs | client/src/modules/racer-types/SpriteRacerType.js:121 | cognitive-complexity | `render` — complexity 68 | High | Sprite render function |
| S08 | sonarjs | client/src/modules/cameraConfig.js:360 | cognitive-complexity | `loadCameraConfig` — complexity 76 | High | Migration function with many version branches |
| S09 | sonarjs | client/src/modules/racer-types/backgroundRemoval.js:58 | cognitive-complexity | `computeSpriteBoundingBox` — complexity 47 | Medium | Pixel-scanning function |
| S10 | sonarjs | client/src/screens/RaceScreen/CameraDiagnosticsHUD.jsx:21 | cognitive-complexity | HUD render function — complexity 52 | Medium | Diagnostic HUD; lower priority |
| S11 | sonarjs | client/src/modules/headlessRaceSimulator.js:110 | cognitive-complexity | `simulateRace` — complexity 34 | Medium | |
| S12 | sonarjs | client/src/modules/track-editor/trackStorage.js:228 | cognitive-complexity | Unnamed function — complexity 26 | Medium | |
| S13 | sonarjs | client/src/modules/camera/CameraDirectorDiag.js:111 | cognitive-complexity | Diag function — complexity 30 | Low | Diagnostic only |
| S14 | sonarjs | client/src/screens/TrackEditor/trackEditorDraw.js:12 | cognitive-complexity | `drawTrack` — complexity 40 | Medium | Canvas drawing function |
| S15 | sonarjs | client/src/modules/racer-types/spriteTinter.js | no-duplicate-string | Multiple string literals duplicated 3–8× | Low | Canvas context method names repeated |
| S16 | sonarjs | client/src/modules/storage/trackStorage.js | no-duplicate-string | Multiple localStorage key strings repeated 3–5× | Low | Extract KEY constants |
| S17 | sonarjs | client/src/screens/SetupScreen/SetupScreen.jsx:210 | no-collapsible-if | Nested if can be merged | Low | |
| S18 | sonarjs | client/src/screens/SetupScreen/SetupScreen.jsx:267 | prefer-immediate-return | Variable `range` assigned then immediately returned | Low | |

---

## False-Positive Watch List

Items that look unused/dead to static tools but are NOT:

- **All `.test.*` files** — knip lists 100+ test files as "unused" because entry points don't include the vitest config (`vitest.config.js`). Every test file is actively run by vitest. **Not dead.**
- **`pngjs` and `sharp`** (root `package.json`) — knip does not scan `scripts/`, which is not listed in `entry`/`project`. Both packages are used in `scripts/audit-sprite-crops.mjs` and `scripts/crop-dolphin-sprite.mjs`. **Not dead.**
- **`configSchema`, `defaultConfig`, `create`** on surface-effect generators (`cloud.js`, `line.js`, `particle.js`, `splash.js`) — `registry.js` imports these files as default objects, then consumers call `.configSchema` / `.defaultConfig` / `.create` at runtime via `GENERATORS[classId].*`. Knip does not trace runtime property access. **Not dead.**
- **`MinSpriteSizePreview` default export** — file exports both a named export (used in `RacerEditModal.jsx`) and a default; the default export is the same component. Knip flags the default as unused because callers import the named form. **Not a dead component.**
- **`SurfaceClassPreview` default export** — same pattern as above. Named export is imported by `SurfaceClassManager.jsx`. **Not dead.**
- **`RacerEditModal` default export** — named export `RacerEditModal` is used by `RacerManager.jsx`. Default is redundant. Moot if file is not imported by default anywhere.
- **`useSurfaceClasses` default export** — multiple callers import the named export. Default export is the same function; the default form is unused but the function itself is active.
- **`DevScreen/index.js`** — stub component (not the real DevScreen). Not imported by anything. This **is** dead code (K01 above is a true finding).
- **Any file imported via `import.meta.glob`** — none found in this codebase (scan shows no glob usage in production code).
- **`DEFAULT_TRACK_SEEDS`** (server/src/routes/tracks.js) — knip marks as unused export; it IS used internally within tracks.js (lines 209, 212, 327). The export keyword is unused but the constant is live.

---

## Tool 1: knip

**Command:** `npx knip@latest --include files,exports,dependencies` from repo root with `knip.json` config.

**Config file created:** `knip.json` (repo root) — temporary, must be deleted.

### Unused Files (138 total — bulk are test files)

Key non-test findings:

```
client/src/screens/DevScreen/index.js            — stub component, not imported
client/src/screens/SetupScreen/index.js          — barrel re-export, not imported
client/src/modules/track-effects/effects/bubbles.js
client/src/modules/track-effects/effects/dust.js
client/src/modules/track-effects/effects/fireflies.js
client/src/modules/track-effects/effects/mud.js
client/src/modules/track-effects/effects/rain.js
client/src/modules/track-effects/effects/stars.js
client/src/modules/track-effects/effects/wave.js
```

All `*.test.*` files (100+ items) are false positives — knip does not follow vitest config entry.

### Unused devDependencies (2)

```
pngjs   root/package.json:11  — FALSE POSITIVE (used in scripts/)
sharp   root/package.json:12  — FALSE POSITIVE (used in scripts/)
```

### Unused Exports (118 total — selected notable findings)

Production code (non-test) unused exports:

```
client/src/modules/track-editor/trackStorage.js:156     saveTrack (no production caller)
client/src/screens/RaceScreen/drawing/racerRendering.js:24  drawNameTag (self-consumed only)
client/src/modules/rowLayout.js:41                      computeRowLayout (no callers; simulator has its own copy)
client/src/modules/stateOverlayTemplates.js:15,73,83    OVERLAY_TEMPLATES, hasAllVars, resolveTemplate
client/src/modules/storage/trackLoader.js:18,146,157,173  CACHE_KEY, loadAllTracks, getInitialTracks, getTrackBackgroundUrl
client/src/modules/storage/trackMigration.js:24         getLocalCustomTracks (used internally, never imported externally)
client/src/modules/surface-effects/registry.js:46       resetToDefaults (no production caller)
client/src/modules/surface-effects/useSurfaceClasses.js:48  default export (named form used instead)
client/src/modules/racer-types/index.js                 ~25 exports including all RacerType classes,
                                                        COATS_BY_TYPE, RACER_TYPE_LABELS, getRacerTypeById,
                                                        listRacerTypes, warmUpAllRacerTypes, etc.
client/src/modules/camera/CameraDirector.js:16,52,96    CAM_STATE, FALLBACK_REFERENCE_SPRITE_SIZE, tcToLerpFactor
client/src/modules/camera/lapUtils.js:60                REFERENCE_CLOSED_PATH_PX
client/src/modules/camera/Minimap.js:11,12,13           MINIMAP_W, MINIMAP_H, MINIMAP_MARGIN
client/src/modules/camera/openTrackCamera.js:11         OPEN_TRACK_BASE_ZOOM
client/src/modules/headlessRaceSimulator.js:30,299      DIRT_OVAL_TRACK_WIDTH_PX, runDistributionMeasurement
client/src/modules/raceBehavior.js:80                   computeBrakeMatchFactor
client/src/modules/trackLights.js:18,37,85              VALID_LIGHT_STYLES, getDefaultTrackLights, getLightAlpha
client/src/modules/utils/RandomHelper.js:37             randomInt
client/src/modules/track-editor/catmullRom.js:217       derivativeAt
client/src/modules/track-editor/trackStorage.js:156     saveTrack
client/src/modules/track-effects/bgImageCache.js:52     _clearBackgroundImageCache
server/src/routes/tracks.js:59                          DEFAULT_TRACK_SEEDS (FALSE POSITIVE — used internally)
```

Generator named exports are FALSE POSITIVES (see Watch List).

---

## Tool 2: jscpd

**Command:** `npx jscpd@latest client/src server/src --min-tokens 50 --reporters console`

### Summary

| Format | Files | Total Lines | Clones Found | Duplicated Lines | Duplication % |
|--------|-------|-------------|--------------|------------------|---------------|
| css | 13 | 3,274 | 20 | 248 | 7.57% |
| javascript | 214 | 44,595 | 281 | 3,459 | 7.76% |
| jsx | 81 | 21,471 | 124 | 1,171 | 5.45% |
| **Total** | **308** | **69,340** | **425** | **4,878** | **7.03%** |

### Notable Production-Code Clones (non-test files)

**High-value refactor candidates:**

1. `client/src/services/surfaceClassApi.js:13–61` vs `client/src/services/trackApi.js:13–61`
   - 49 lines, 167 tokens — near-identical API client boilerplate (fetch wrapper, error handling, JSON parse)

2. `server/src/routes/tracks.js:367–376` vs `417–425` (10 lines, 74 tokens)
   and `tracks.js:376–392` vs `431–447` (17 lines, 120 tokens)
   - Two PUT-handler pairs share duplicate validation + write logic

3. `server/src/routes/surfaceClasses.js:58–70` vs `server/src/routes/tracks.js:286–298`
   - 13-line duplicate error-response block

4. `client/src/modules/camera/CameraDirector.js:1551–1561` vs `1588–1598` (11 lines, 54 tokens)
   - Similar pan-target computation blocks

5. `client/src/screens/TrackEditor/useViewport.js:40–47` vs `86–92` (8 lines, 83 tokens)
   - Duplicate zoom/pan reset logic in same file

6. `client/src/modules/camera/Minimap.js:68–73` vs `83–88` (6 lines, 73 tokens)
   - Duplicate coordinate clamp/transform

7. `client/src/modules/cameraConfig.js:504–660` — 12 self-clones
   - Per-track parameter blocks all share identical schema structure; likely intentional data duplication

**CSS clones:**

- `client/src/components/EffectConfig/EffectConfig.module.css:37–49` vs `client/src/screens/TrackEditor/TrackEditor.module.css:253–265`
  and two additional overlapping sub-ranges
  - Duplicated slider/form control styles

**Test-file clones (info only — bulk of the 425 total):**

- `beetle.test.js` duplicated across 13+ racer-type test files — shared setup boilerplate
- `SpriteRacerType.test.js` shares 50-line blocks with `duck.test.js`, `beetle.test.js`, `buggy.test.js`, `luge.test.js`
- Consider a shared `makeRacerTestHarness()` factory

---

## Tool 3: ESLint (existing config)

**Command:** `npx eslint src --max-warnings 9999 --format stylish` from `client/`

**Result:** 59 problems (0 errors, 59 warnings)

### Grouped by rule

#### `no-console` (55 warnings)

All in test/diagnostic files:

| File | Lines | Notes |
|------|-------|-------|
| `client/src/modules/diagnostics/trackCorridor.test.js` | 37–257 (46 instances) | Diagnostic logging in test; intentional output |
| `client/src/modules/track-editor/catmullRom.diagnostic.test.js` | 126, 164 | Diagnostic test |

#### `no-unused-vars` (4 warnings)

| File:Line | Variable | Notes |
|-----------|----------|-------|
| `modules/camera/CameraDirector.test.js:801` | `rs` | Test-only unused var |
| `modules/camera/CameraDirector.test.js:4435` | `racers` | Test-only unused var |
| `screens/DevScreen/sections/TrackManager.jsx:18` | `RACER_TYPE_IDS` | Dead import in production file |
| `screens/RaceScreen/index.jsx:56` | `PRIORITY_MODE` | Dead import in production file |

#### `react-hooks/exhaustive-deps` (3 warnings)

| File:Line | Finding | Risk |
|-----------|---------|------|
| `screens/RaceScreen/index.jsx:1497` | Missing deps `enablePerfLog`, `showCameraDiagnostics` in useEffect | Medium — stale closure; perf-log may use old values |
| `screens/SetupScreen/SetupScreen.jsx:206` | Unnecessary dep `racerTypeOverrides` in useMemo | Low — causes over-recomputation |
| `screens/SetupScreen/SetupScreen.jsx:326` | Unnecessary dep `racerTypeOverrides` in useMemo | Low |

#### `react-refresh/only-export-components` (1 warning)

| File:Line | Finding |
|-----------|---------|
| `contexts/TransitionContext.jsx:44` | Non-component (constant/function) exported alongside component — breaks HMR fast-refresh |

---

## Tool 4: SonarJS

**Command:** `ESLINT_USE_FLAT_CONFIG=true npx eslint --config eslint.sonar.config.mjs src --max-warnings 9999` from `client/`

**Temporary files created:**
- `client/eslint.sonar.config.mjs` — must be deleted before commit
- `eslint-plugin-sonarjs` installed with `npm install --no-save` — not persisted to package.json

**Result:** 138 problems (16 errors*, 122 warnings)
*The 16 "errors" are all `react-hooks/exhaustive-deps` and `react-hooks/refs` rules not found in the sonar-only config — noise from missing react-hooks plugin in the overlay config, not real errors.

### `sonarjs/cognitive-complexity` — Production files only

| File:Line | Function | Complexity | Risk |
|-----------|----------|------------|------|
| `modules/raceBehavior.js:318` | `applyRacerBehavior` | **467** | Critical — entire physics tick |
| `screens/RaceScreen/index.jsx:750` | `loop` (rAF callback) | **358** | Critical — entire render loop |
| `modules/camera/CameraDirector.js:1657` | `_setTargets` | **139** | High |
| `modules/camera/CameraDirector.js:1032` | `_transition` | **97** | High |
| `modules/camera/CameraDirector.js:628` | `update` | **94** | High |
| `modules/camera/CameraDirector.js:1311` | `_detectPulkGroup` | **92** | High |
| `modules/racer-types/SpriteRacerType.js:121` | `render` | **68** | High |
| `modules/cameraConfig.js:360` | `loadCameraConfig` | **76** | High — migration branches |
| `modules/racer-types/backgroundRemoval.js:58` | `computeSpriteBoundingBox` | **47** | Medium |
| `screens/RaceScreen/CameraDiagnosticsHUD.jsx:21` | render fn | **52** | Medium (diag HUD) |
| `screens/RaceScreen/drawing/priorityModeOverlay.js:19` | overlay fn | **21** | Low |
| `modules/headlessRaceSimulator.js:110` | `simulateRace` | **34** | Medium |
| `modules/camera/CameraDirector.js:903` | `_detectComebackRacer` | **37** | Medium |
| `modules/camera/CameraDirector.js:525` | `_pickNextState` | **20** | Medium |
| `modules/track-editor/trackStorage.js:228` | (unnamed) | **26** | Medium |
| `modules/track-editor/catmullRom.js:151` | spline fn | **25** | Low |
| `modules/camera/CameraDirectorDiag.js:111` | diag fn | **30** | Low (diag only) |
| `modules/camera/CameraDirectorDiag.js:39` | diag fn | **24** | Low (diag only) |
| `modules/racer-types/index.js:361` | `warmUpAllRacerTypes` | **17** | Low |
| `modules/racer-types/index.js:333` | `resetRacerTypeOverride` | **16** | Low |
| `modules/camera/Minimap.js:28` | render fn | **17** | Low |
| `modules/camera/cameraTimingComputation.js:56` | timing fn | **16** | Low |
| `screens/TrackEditor/trackEditorDraw.js:12` | `drawTrack` | **40** | Medium |
| `screens/TrackEditor/TrackEditor.jsx:502` | handler fn | **20** | Low |
| `screens/TrackEditor/TrackEditorSaveBar.jsx:3` | component | **19** | Low |
| `screens/DevScreen/sections/TrackManager.jsx:69` | TrackManager | **17** | Low |
| `screens/DevScreen/sections/DynamicsTuningSection.jsx:38` | component | **16** | Low |
| `screens/RaceScreen/index.jsx:245,350` | effects | 49, 19 | Medium |
| `screens/SetupScreen/SetupScreen.jsx:113` | handler | **17** | Low |
| `screens/RaceScreen/BattleDiagHUD.jsx:44` | diag HUD | **22** | Low (diag) |

### `sonarjs/no-duplicate-string` — Production files only (selected)

| File:Line | String | Repeat Count |
|-----------|--------|--------------|
| `modules/racer-types/index.js:29` | (racer type string) | 15× |
| `modules/racer-types/index.js:140` | (string) | 12× |
| `screens/SetupScreen/SetupScreen.jsx:421` | (string) | 14× |
| `modules/racer-types/spriteTinter.js:89` | (canvas method name) | 8× |
| `screens/DevScreen/sections/CameraAdvancedSection.jsx:167` | (label string) | 9× |
| `screens/DevScreen/sections/TrackManager.jsx:216` | (string) | 9× |
| `screens/TrackEditor/TrackEditorToolbar.jsx:131` | (string) | 6× |
| `screens/CameraFrameLogHUD.jsx:32` | (string) | 7× |

### `sonarjs/no-collapsible-if` — Production files

| File:Line | Notes |
|-----------|-------|
| `screens/SetupScreen/SetupScreen.jsx:210` | Nested if can be `&&`-merged |

### `sonarjs/prefer-immediate-return` — Production files

| File:Line | Variable | Notes |
|-----------|----------|-------|
| `screens/SetupScreen/SetupScreen.jsx:267` | `range` | Assign-then-return; trivial inline |

### `sonarjs/no-identical-functions` — Production files

No identical functions found in production code (only in test boilerplate, already captured by jscpd).

---

## Cleanup Required Before Commit

The following temporary files were created during this audit and **must be deleted**:

1. `knip.json` (repo root) — temporary knip config
2. `client/eslint.sonar.config.mjs` — temporary SonarJS flat config overlay
3. `eslint-plugin-sonarjs` was installed with `npm install --no-save` into `client/node_modules/` — not persisted to `package.json` but will be removed by a clean `npm ci`
