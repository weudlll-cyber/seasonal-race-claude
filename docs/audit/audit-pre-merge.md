# RaceArena — Pre-Merge Audit
**Branch:** `feat/per-state-camera-phase-1-foundation`  
**Date:** 2026-05-12  
**Tests at audit:** 1717/1717 ✓ | **Build:** ✓ (447 kB JS gzip: 131 kB)

---

## Executive Summary

| Priority | Count | Areas |
|-----------|--------|---------|
| CRITICAL | 0 | — |
| IMPORTANT | 5 | Dead code (2×), CORS, Server auth, Monolithic components |
| NICE-TO-HAVE | 9 | Coverage UI components, Dependency upgrades, JSDoc, Browserslist, Bundle split, Magic numbers |

**Recommendation: Branch is ready to merge.** Not a single CRITICAL item found. All IMPORTANT items are known scope decisions (Phase L = local dev server without auth) or minor dead code. Follow-up cleanup can be done in separate commits after merge.

**Estimated effort for IMPORTANT items:**
- I1 + I2 (dead code): ~10 min, 1 commit
- I3 + I4 (CORS/Auth): documented as Phase 5 — no code effort
- I5 (monolithic components): several hours, optional refactor sprint

---

## Section 1 — Security

### 1.1 Dependency vulnerabilities

```
npm audit client/: 0 vulnerabilities (9 prod + 419 dev deps)
npm audit server/: 0 vulnerabilities (82 prod + 97 dev deps)
```

**Finding:** No action needed. No known CVEs in the current dependency chain.

### 1.2 Sensitive Data

- **No .env files** found in the repository.
- `.gitignore` correctly covers `.env`, `node_modules`, `dist`, `coverage`, `.claude/settings*`, `diagnosis/` and temporary backup files.
- **No hardcoded API key, token, or password** found in `client/src` or `server/src`.
- **localStorage usage:** All writes go through `client/src/modules/storage/storage.js` with the `racearena:` namespace. No sensitive data (no credentials, no personal data) is stored — only race configurations.
- **URL parameters:** No sensitive data found in URL parameters.

### 1.3 XSS / Input sanitization

- **`dangerouslySetInnerHTML`:** Not used. No finding.
- **`innerHTML`:** Not set directly. No finding.
- **User inputs in frontend:** Track names, racer names etc. are managed as React state and rendered via JSX — React escapes automatically. No direct DOM injection risk.
- **Server validation:** `validateTrackBodyForCreate()` and `validateTrackBodyForUpdate()` in `server/src/routes/tracks.js` check types, required fields, and hex color format. `isValidHexColor()` via regex `/^#[0-9a-fA-F]{6}$/`. Multer limits file upload to 10 MB.

### 1.4 CORS / API security

**`[IMPORTANT — I3]`** Server app (Phase L) uses:
```js
app.use(cors())  // app.js:17 — no origin filter
```
All origins may access all endpoints. Acceptable for Phase L use (Docker on localhost). An origin whitelist must be configured for Phase 5 (public exposure).

**`[IMPORTANT — I4]`** No authentication middleware present. All CRUD endpoints (`POST /api/tracks`, `DELETE /api/tracks/:id`, `POST /api/surface-classes` etc.) are reachable without auth. Auth is planned for Phase 5 (JWT) per README and Roadmap. Accepted for Phase L (localhost-only). **Auth must be implemented before any public exposure.**

---

## Section 2 — Source Hygiene

### 2.1 Dead code

**`[IMPORTANT — I1]` `client/src/modules/utils/index.js`** — never imported, 0% coverage.

Exports `formatLapTime`, `formatRank`, `clamp`, `lerp`. Not a single one of these functions is imported from this file. The file has existed since project start but was never integrated into the codebase. Either delete or integrate at the call sites (e.g. `formatLapTime` in ResultScreen).

**`[IMPORTANT — I2]` `client/src/screens/DevScreen/components/SectionContainer.jsx`** — never imported, 0% coverage.

A reusable wrapper component (`SectionContainer`) is not imported in any other file. All DevScreen sections use their own card layouts directly. Can be deleted.

### 2.2 Code smells

**Monolithic React components `[IMPORTANT — I5]`:**

| Component | Lines | Assessment |
|-----------|--------|-----------|
| `TrackEditor.jsx` | 1447 | Refactor candidate |
| `RaceScreen/index.jsx` | 1286 | Refactor candidate |
| `RaceTuningSection.jsx` | 965 | Refactor candidate |
| `SetupScreen.jsx` | 742 | Borderline |
| `TrackManager.jsx` | 657 | Borderline |
| `CameraDirector.js` | 1093 | Acceptable — state machine with many states |
| `CameraDiagnosticsHUD.jsx` | 388 | Acceptable — legitimate HUD debug tool |

TrackEditor, RaceScreen and RaceTuningSection are candidates for extraction of sub-components (e.g. the ~100-line star background render function in RaceScreen). Not merge-blocking, but on the radar for a later refactor sprint.

**`console.*` calls in production code:**

All 19 `console.warn`/`console.error` calls are legitimate:
- `[RaceArena]`-prefixed warnings in error boundaries, storage migrations, track loading
- Two `console.warn` in CameraDirector for camera-state-transition logging (HUD debug feature, by design)
- Not a single unnecessary `console.log` (debug statement)

**Magic numbers:**

In `client/src/screens/RaceScreen/index.jsx` coordinates for the star background (lines 673–686) are hardcoded as a literal array. This is deliberate — they are decoration data, not physics constants. No action required.

### 2.3 Naming inconsistencies

No systematic finding. Codebase consistently uses camelCase for JS identifiers, SCREAMING_SNAKE_CASE for module constants (e.g. `MAX_STATE_DURATION`, `BATTLE_PULK_THRESHOLD_PX`). Abbreviations (`tc`, `lf`, `bsX`) are explained in the context of the camera module via JSDoc and constants.

Sole remaining finding: file header in `CameraZoomTuningSection.jsx` still contains `Etappe 3:` in the description line. Not a code smell, just a historical note — can be cleaned up.

### 2.4 Commented-out code / markers

- **No TODOs, FIXMEs, HACKs, XXX** found in `client/src` or `server/src`.
- No commented-out code block found. All `//` comment blocks are documentation (JSDoc, inline explanations) or file headers.
- Comment-to-code ratio: 13.5% (2548 of 18923 lines) — healthy. The majority are standardized file headers.

---

## Section 3 — Test Coverage

### 3.1 Coverage report

```
Statements : 64.37%  (3555 / 5522)
Branches   : 55.86%  (1881 / 3367)
Functions  : 61.63%  ( 673 / 1092)
Lines      : 65.88%  (3239 / 4916)
```

**Modules with 0% coverage (assessed by type):**

| File | Lines | Assessment |
|-------|--------|-----------|
| `modules/utils/index.js` | 26 | IMPORTANT — dead code (I1) |
| `screens/DevScreen/components/SectionContainer.jsx` | ~50 | IMPORTANT — dead code (I2) |
| `screens/RaceScreen/index.jsx` | 1286 | NICE-TO-HAVE — canvas UI, not unit-testable |
| `screens/RaceScreen/CameraDiagnosticsHUD.jsx` | 388 | NICE-TO-HAVE — dev HUD, React-rendered |
| `screens/DevScreen/sections/SystemSettings.jsx` | ~160 | NICE-TO-HAVE — dev UI |
| `screens/DevScreen/sections/RaceDefaults.jsx` | ~200 | NICE-TO-HAVE — dev UI |
| `screens/DevScreen/sections/CameraStateHudSection.jsx` | ~30 | NICE-TO-HAVE — dev UI |

**Modules with < 50% coverage:**

| File | Stmts% | Assessment |
|-------|--------|-----------|
| `DevScreen/sections/BrandingProfiles.jsx` | 15.62% | NICE-TO-HAVE |
| `DevScreen/sections/PlayerGroupsManager.jsx` | 26.66% | NICE-TO-HAVE |
| `DevScreen/sections/MinSpriteSizePreview.jsx` | 30% | NICE-TO-HAVE |
| `DevScreen/sections/RaceHistory.jsx` | 42.85% | NICE-TO-HAVE |
| `DevScreen/sections/RacerManager.jsx` | 46.15% | NICE-TO-HAVE |

All low-coverage modules are Dev Panel UI components without a logic core. Missing tests here are a UX regression risk, not a security problem.

### 3.2 Untested critical paths

| Path | Tested? | Details |
|------|-----------|---------|
| `EditorShape.getPosition()` Interpolation | ✓ YES | 3 smoothness regression tests (Etappe 26) + existing position/offset tests |
| Camera State Machine — all transitions | ✓ YES | CameraDirector.test.js: ~700 lines, 90+ tests across all states |
| Pack detection `_isPulk()` | ✓ YES | 9 dedicated tests in the "Etappe 13" block |
| Re-roll mechanics | ⚠ PARTIAL | `rowLayout.js` has tests; the re-roll logic in `RaceScreen/index.jsx` (canvas) is not directly testable |
| Backend endpoints | ✓ YES | `server/src/routes/tracks.test.js` + `surfaceClasses.test.js` |
| Schema v5 migration | ✓ YES | `cameraConfig.test.js` |

### 3.3 Test quality

- **Not a single `it.skip`** or `describe.skip` in the codebase. All tests run.
- **No `it.only`** or `describe.only` forgotten.
- **Snapshot tests:** No snapshot tests present — no risk of stale snapshots.
- **Complex tests:** `CameraDirector.test.js` is large at ~1200 lines but well structured into named describe blocks. Tests check behavior (state transitions, timing, cooldowns), not implementation.
- **Diagnostic tests:** `catmullRom.diagnostic.test.js` and `trackCorridor.test.js` contain `console.log` — these are explicitly designed as diagnostic tools, acceptable.

---

## Section 4 — Dependencies

### 4.1 Version status

**Client (npm outdated):**

| Package | Current | Latest | Type |
|---------|---------|--------|-----|
| `react` | 18.3.1 | **19.2.6** | Major — breaking changes, no upgrade pressure |
| `react-dom` | 18.3.1 | **19.2.6** | Major — together with react |
| `react-router-dom` | 6.30.3 | **7.15.0** | Major — new API (v7 Framework-Mode) |
| `eslint` | 9.39.4 | **10.3.0** | Major — new flat-config breaking changes |
| `vite` | 8.0.10 | 8.0.12 | Patch — non-critical |
| `@playwright/test` | 1.59.1 | 1.60.0 | Minor — update when convenient |
| `jsdom` | 29.0.2 | 29.1.1 | Minor — update when convenient |

**Server (npm outdated):**

| Package | Current | Latest | Type |
|---------|---------|--------|-----|
| `express` | 4.22.1 | **5.2.1** | Major — Express 5 async error handling |
| `vitest` | 4.1.5 | 4.1.6 | Patch — non-critical |

**`[NICE-TO-HAVE]`** React 19, react-router v7, ESLint 10 and Express 5 are all major upgrades with potentially breaking changes. No action needed before this merge, but a planned upgrade sprint makes sense.

### 4.2 Bundle size

```
dist/assets/index.js   447.78 kB │ gzip: 131.46 kB
dist/assets/index.css   38.53 kB │ gzip:   7.41 kB
dist/index.html          0.93 kB │ gzip:   0.48 kB
```

No code splitting configured — everything in one bundle. For a canvas game app with ~136 modules, 131 kB gzip is acceptable. React (runtime + DOM) makes up the majority. With further growth, route-based code splitting (Vite dynamic import) could make sense.

**`[NICE-TO-HAVE]`** An explicit `build.rollupOptions.output.manualChunks` configuration could separate React from app code and improve browser caching.

### 4.3 Dev vs Production

All production dependencies correctly assigned:
- `client/`: `react`, `react-dom`, `react-router-dom` as `dependencies` ✓
- `server/`: `express`, `cors`, `multer` as `dependencies` ✓
- Dev tools (`eslint`, `vite`, `vitest`, `playwright`) all in `devDependencies` ✓

---

## Section 5 — Documentation

### 5.1 README.md

`README.md` (root) is present, current, and complete:
- Tech stack documented ✓
- Feature list complete ✓
- Getting Started (dev + Docker) ✓
- API endpoints for Phase L documented ✓
- Reference to `docs/` for Architecture, Track-Editor-Spec, Roadmap ✓

Minor: The README entry "Camera Director" in the feature list does not yet mention the new states `lead-in/lead-out` and the pack condition. **NICE-TO-HAVE.**

### 5.2 Code documentation

| Module | JSDoc | Assessment |
|-------|-------|-----------|
| `CameraDirector.js` | ✓ | Class JSDoc, all constants commented, `_computeZoomForTargetSize` well explained |
| `EditorShape.js` | ⚠ Partial | `getPosition()` signature JSDoc present, but the new interpolation mode is not mentioned |
| `panTarget.js` | ✓ | `getPanTarget()` fully explained with JSDoc + shape fallback |
| `rowLayout.js` | ✓ | `computeSpeedBonus()` with JSDoc |
| `CameraDirector._isPulk()` | ⚠ | Private method, no JSDoc |

**`[NICE-TO-HAVE]`** `EditorShape.getPosition()` JSDoc should receive a sentence about linear interpolation (was previously `Math.round()`-based, now interpolated). Prevents future confusion when someone debugs the old staircase regression.

### 5.3 Stale inline comments

- **Etappe references:** One remaining file header comment in `CameraZoomTuningSection.jsx:7` (`Etappe 3: per-state cameraStateProfiles accordion`) — historical, not a code smell, but cleanable.
- **No further Etappe/workaround comments** found in production code. All Etappe-23 trace instrumentations were fully removed in Etappe 27.

---

## Section 6 — Performance

### 6.1 Race loop performance

After the Etappe-27 cleanups and the Etappe-26 fix:

| Operation | Before | Now |
|-----------|--------|-------|
| `shape.getPosition()` per racer | 2× (displayT + drawX) | 1× |
| `_tangentAngle()` calculation | Live (catmullRom call) | Precomputed `_angles[]` |
| Sprite EMA (`_displayT`) | Per-frame loop | Removed (Etappe 19) |

Estimated allocations in the hot path per frame with 100 racers:
- `getPosition()` returns `{ x, y, angle }` → 100 objects per frame. Low GC load since short-lived. Optimizable via object reuse, but not necessary at current racer counts.
- The race loop is canvas-rAF-based — no virtual DOM overhead in the render path.

### 6.2 Memory

- **Race reset:** Racers array is reallocated at race start; old state is cleaned up by GC. No structural leak.
- **EditorShape:** `_inner[]` and `_outer[]` are allocated once in the constructor (`n` samples of 2 floats each). At `samples=500`: ~4 kB. No leak.
- **Trail buffer:** `trail.push()` in `drawRacers` — trails are limited with `shift()`. No unbounded growth.

### 6.3 Render

- No `getImageData`/`putImageData` in the hot path (expensive).
- `getEdgePoints(80)` is called once at race start (line 205), not per frame. ✓
- `drawBattleDiagMarkers()` runs only when `showCameraDiagnostics=true` (dev HUD). ✓

---

## Section 7 — Browser Compatibility

### 7.1 Browserslist

No explicit `browserslist` in `package.json` or `.browserslistrc`. Vite uses default target: modern browsers with ES module support.

**`[NICE-TO-HAVE]`** An explicit `"browserslist": ["> 0.5%", "last 2 versions", "not dead"]` declaration in `client/package.json` would align Vite and ESLint browser plugin consistently on the same target.

### 7.2 Features

All used JS features are available in modern browsers (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+):

| Feature | Support | Risk |
|---------|---------|--------|
| Optional chaining `?.` | Chrome 80+ | ✓ no risk |
| Nullish coalescing `??` | Chrome 80+ | ✓ no risk |
| `Array.at()` | Chrome 92+ | ✓ no risk |
| Canvas 2D API | Universal | ✓ no risk |
| `localStorage` | Universal | ✓ no risk |
| `fetch` | Chrome 42+ | ✓ no risk |
| ES Modules (native) | Chrome 61+ | ✓ no risk (Vite bundles for prod) |

---

## Section 8 — Accessibility (brief assessment)

### 8.1 ARIA

58 ARIA attributes found. Correct usage:
- Modal dialog: `role="dialog"`, `aria-modal="true"`, `aria-label` ✓
- InfoTooltip: `role="img"` + `role="tooltip"` ✓
- Input labels: `aria-label` on slider/color-picker ✓

Gaps: Canvas elements (race track, minimap) have no ARIA — for a canvas game app this is unavoidable without a full a11y framework.

### 8.2 Keyboard navigation

Setup form and Dev Panel navigable via Tab. Canvas race itself is not keyboard-navigable — by design (no playable mode, viewer only).

### 8.3 Color Contrast

Not systematically checked (no tool run). Dev Panel uses dark theme with light labels — subjectively sufficient. A WCAG check (e.g. axe-playwright) should be added for public exposure.

---

## Section 9 — Build / CI

### 9.1 Build

```
✓ Build successful (390ms)
dist/assets/index.js  447.78 kB │ gzip: 131.46 kB
```

No warnings, no errors. Tree-shaking active (Vite/Rollup standard).

### 9.2 CI pipeline

`.github/workflows/ci.yml` covers:
- ✓ ESLint (Syntax + Rules)
- ✓ Prettier format check
- ✓ Tests with coverage (`npm run test:coverage`)
- ✓ Security audit (`npm audit --audit-level=high`)
- ⚠ No server test step (`server/` is not tested in CI)
- ⚠ No build step in CI (build could break without CI alarm)

**`[NICE-TO-HAVE]`** Two missing CI steps:
1. `cd server && npm test` — server tests run locally but not in CI
2. `cd client && npm run build` — build is not verified in CI

### 9.3 Pre-Commit Hooks

`.husky/pre-commit`: `cd client && npx lint-staged`

lint-staged runs ESLint + Prettier on staged `.js`/`.jsx` files. Cleanly configured, hooks are active (commits of this branch were correctly processed by lint-staged). ✓

### 9.4 .gitignore

`.gitignore` fully covers:
- `node_modules/`, `.env`, `dist/`, `build/` ✓
- `client/coverage/`, `client/playwright-report/`, `client/test-results/` ✓
- `.claude/projects/`, `.claude/settings*.json` ✓ (no leak of Claude config)
- `server/data/**/*.json.tmp`, `server/data/tracks-backups/` ✓
- `AUDIT.md`, `audit-temp/`, `diagnosis/` ✓ (temporary artifacts)

---

## Appendix — Complete item list

### IMPORTANT

| ID | Finding | File | Effort |
|----|--------|-------|---------|
| I1 | `utils/index.js` is dead module — delete or integrate | `client/src/modules/utils/index.js` | 10 min |
| I2 | `SectionContainer.jsx` never imported — delete | `client/src/screens/DevScreen/components/SectionContainer.jsx` | 5 min |
| I3 | CORS wide-open (`cors()` without origin filter) | `server/src/app.js:17` | Phase 5 |
| I4 | No server authentication on CRUD endpoints | `server/src/routes/tracks.js` | Phase 5 |
| I5 | Monolithic components > 700 lines (TrackEditor, RaceScreen, RaceTuningSection) | multiple | Refactor sprint |

### NICE-TO-HAVE

| ID | Finding | Effort |
|----|--------|---------|
| N1 | `EditorShape.getPosition()` JSDoc: missing note on linear interpolation | 2 min |
| N2 | `CameraDirector._isPulk()` no JSDoc | 3 min |
| N3 | `CameraZoomTuningSection.jsx:7` — stale `Etappe 3:` comment in header | 1 min |
| N4 | Explicit `browserslist` in `client/package.json` | 2 min |
| N5 | CI: add server tests + build step | 15 min |
| N6 | README: Camera Director — mention lead-in/lead-out and pack condition | 5 min |
| N7 | Plan React 19 / react-router v7 / Express 5 upgrade sprint | medium |
| N8 | Code splitting for React bundle (Vite manualChunks) | 30 min |
| N9 | WCAG check with axe-playwright when app goes public | — |
