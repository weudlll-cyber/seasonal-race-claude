# RaceArena — Test Coverage Audit

**Date:** 2026-06-09  
**Start point:** backup/sec2  
**Method:** READ-ONLY — no tests written or changed.  
**Tools:** `vitest --coverage` (client, v8 provider); server has no coverage provider installed.

---

## Triage Table

| ID  | Finding | Priority | Fix class |
|-----|---------|----------|-----------|
| TC-01 | `RaceScreen/index.jsx` 0% coverage — the entire race engine is untested | CRITICAL | OWNER-DECISION |
| TC-02 | `RaceScreen/drawing/` all 0% — 6 rendering modules with zero coverage | HIGH | OWNER-DECISION |
| TC-03 | `raceBehavior.js` only 87% stmt / 78% branch — gap/brake/avoidance edge cases uncovered | HIGH | SAFE-SMALL-FIX |
| TC-04 | `SurfaceClassPreview` 2 unhandled rejections — root cause identified: missing `getTransform` in canvas mock | HIGH | SAFE-SMALL-FIX |
| TC-05 | Server `tracks.test.js` + `surfaceClasses.test.js` share a single module-level route instance — cross-test state pollution masked by `retry: 3` | MEDIUM | OWNER-DECISION |
| TC-06 | `headlessRaceSimulator.js` 0% — race-simulation utility used by scripts has no unit tests | MEDIUM | OWNER-DECISION |
| TC-07 | `spriteTinter.js` 64% stmt / 51% branch — pattern-tinting and mask paths uncovered | MEDIUM | SAFE-SMALL-FIX |
| TC-08 | `TransitionContext.jsx` 0% — screen-transition context untested | MEDIUM | SAFE-SMALL-FIX |
| TC-09 | Server coverage provider not installed (`@vitest/coverage-v8` missing) | MEDIUM | SAFE-SMALL-FIX |
| TC-10 | No skipped or todo tests — clean | INFO | no action |
| TC-11 | `useStorage.js` 43% / 0% branch — React hook backing localStorage untested for error paths | LOW | SAFE-SMALL-FIX |

---

## Coverage Summary (client)

```
All files   : 60.96% stmts | 51.35% branch | 54.49% funcs | 62.78% lines
src/modules : 77.06% stmts | 73.92% branch | 71.12% funcs | 78.04% lines
src/services: 69.44% stmts | 72.72% branch | 53.84% funcs | 68.57% lines
src/contexts:  0%                 (TransitionContext.jsx not tested)
```

Server: `@vitest/coverage-v8` not installed — running `vitest --coverage` on the server fails with `MISSING DEPENDENCY`. Coverage is unknown. The 154 server tests pass but branch/line coverage of `tracks.js` validation functions, the new `detectMagicType`, and surface-class validation is unquantified.

---

## Critical Path Coverage Table

| Area | File | % Stmts | % Branch | % Funcs | Notes |
|------|------|---------|---------|---------|-------|
| **Race engine** | `RaceScreen/index.jsx` | **0%** | **0%** | **0%** | 1577 lines, zero coverage |
| **Race drawing** | `drawing/*.js` (6 files) | **0%** | **0%** | **0%** | All rendering modules untested |
| **Race behavior** | `raceBehavior.js` | 87% | 78% | 88% | Edge cases in avoidance/brake/gate |
| **Camera director** | `CameraDirector.js` | 92% | 81% | 94% | Well-tested |
| **Camera timing** | `cameraTimingComputation.js` | 100% | 96% | 100% | Fully covered |
| **Physics gate** | `raceBehavior.js` (gate logic) | 87% | 78% | 88% | Body-gate branches partially covered |
| **Track geometry** | `EditorShape.js` | 92% | 89% | 91% | Good |
| **New C1/C2 validation** | `server/tracks.js:validateEffects, validatePoints` | unknown | unknown | unknown | Server coverage provider missing |
| **New C4 upload** | `server/tracks.js:detectMagicType` | unknown | unknown | unknown | Tested via integration tests only |
| **Server routes** | `tracks.js` (all routes) | unknown | unknown | unknown | No server coverage |
| **Surface classes** | `server/surfaceClasses.js` | unknown | unknown | unknown | No server coverage |
| **Sprite tinting** | `spriteTinter.js` | 64% | 51% | 82% | Pattern + mask paths uncovered |
| **localStorage hook** | `useStorage.js` | 43% | **0%** | 50% | Zero branch coverage |
| **Surface class loader** | `surfaceClassLoader.js` | **0%** | 100% | **0%** | Cache/fetch paths untested |
| **Headless sim** | `headlessRaceSimulator.js` | **0%** | **0%** | **0%** | Simulation utility zero |
| **Transition context** | `TransitionContext.jsx` | **0%** | **0%** | **0%** | Zero |

---

## TC-01 — `RaceScreen/index.jsx` 0% coverage (CRITICAL)

**File:** `client/src/screens/RaceScreen/index.jsx` (1577 lines)

The entire race engine — physics loop, racer initialization, collision detection, finish detection, camera integration, overlay rendering — has **zero unit test coverage**. This is the highest-risk module in the codebase.

The entire race loop runs inside a `useEffect` + `requestAnimationFrame` closure that requires a real or simulated canvas, racer data, and track geometry to exercise. jsdom's `HTMLCanvasElement` does not support `getContext('2d')` (it returns null without the `canvas` npm package), making straightforward unit tests impossible without significant mocking work.

The `headlessRaceSimulator.js` module exists specifically to run race logic without a DOM, but it too has 0% coverage (TC-06), meaning neither path exercises the physics.

**Risk:** Any regression in race physics, finish detection, rubber-banding, or camera integration goes undetected until manual browser testing.

**Recommended approach (owner decision):**
- Extract pure functions (speed computation, position update, gate check) from the `useEffect` into testable pure modules — this is architecturally the right fix.
- Or: add a `headlessRaceSimulator.js` test suite (lower effort, covers the simulation path if not the React integration).

---

## TC-02 — `RaceScreen/drawing/` 6 files, all 0% (HIGH)

**Files:**
- `drawing/battleDiagRendering.js` — 0%
- `drawing/overlayRendering.js` — 0%
- `drawing/particleRendering.js` — 0%
- `drawing/priorityModeOverlay.js` — 0%
- `drawing/racerRendering.js` — 0%
- `drawing/trackRendering.js` — 0%

All six drawing modules extracted from `RaceScreen/index.jsx` in the hygiene PR have zero test coverage. These are pure canvas rendering functions that take a `ctx` and data structures — they are more testable than the full race loop (no `requestAnimationFrame`, no React). A mock canvas context (as already done in `SurfaceClassPreview.test.jsx`) would allow smoke testing.

---

## TC-03 — `raceBehavior.js` 78% branch (HIGH)

**File:** `client/src/modules/raceBehavior.js`  
**Coverage:** 87% stmts, 78% branch, 88% funcs  
**Uncovered lines:** includes lines 844, 848–849, 982

The uncovered branches include edge cases in the avoidance gate and brake-to-match logic. These code paths directly affect race fairness. Given the extensive sim-fairness work to reach 72/72 combo fairness, untested branches in `raceBehavior.js` represent a latent regression risk.

The existing `raceBehavior.test.js` and `raceBehaviorBrakeMatch.test.js` cover the main paths well but miss some edge cases (zero-neighbor, already-at-finish, out-of-range inputs).

---

## TC-04 — `SurfaceClassPreview` 2 unhandled rejections — root cause (HIGH)

**Files:** `client/src/screens/DevScreen/sections/SurfaceClassPreview.test.jsx`  
**Error:** `TypeError: ctx.getTransform is not a function` in `cloud.js:129`

**Root cause (definitive):**

`SurfaceClassPreview.test.jsx`'s `beforeEach` mock provides a fake canvas context:
```javascript
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillStyle: '', globalAlpha: 1, fillRect: vi.fn(), beginPath: vi.fn(),
  arc: vi.fn(), fill: vi.fn(), clearRect: vi.fn(), strokeStyle: '',
  lineWidth: 1, lineCap: '', moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(),
}));
```

The mock **does not include `getTransform`**, but `cloud.js:129` calls it:
```javascript
const { a: ez, e: ox, f: oy } = ctx.getTransform();
```

When the test schedules a `requestAnimationFrame` callback via `Promise.resolve().then(...)`, the `tick()` function fires asynchronously *after the test body returns*. The `tick` → `render(ctx, pool)` → `cloud.getTransform()` crash happens in the promise microtask queue, becoming an **unhandled rejection** that Vitest captures but doesn't fail the test (because the test itself already resolved successfully).

The rejections are pre-existing, repeatable, and always 2 in number because exactly 2 test cases schedule rAF callbacks that resolve after the test completes: the first two `render` calls (`beforeEach`-mounted components in "stops the rAF loop" and "renders a canvas element" tests).

**Fix (not done here):** Add `getTransform: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }))` to the mock canvas context in `SurfaceClassPreview.test.jsx`. SAFE-SMALL-FIX — one line. Tests would go from 4 pass + 2 unhandled errors to 4 pass + 0 errors.

---

## TC-05 — Server test cross-test pollution masked by `retry: 3` (MEDIUM)

**Context:** `vitest.config.js:retry: 3` was explicitly added (visible in the config).

**Issue:** Both server test files (`tracks.test.js` and `surfaceClasses.test.js`) call `createApp()` at module level — once per file, not once per test. `createApp()` imports `tracks.js` and `surfaceClasses.js`, which execute their module-level startup code: `loadAllTracks()`, `loadAll()`, `migrateDefaultTracks()`, etc.

Since Node.js (and Vitest's isolation) re-uses module singletons within a test file, the in-memory `tracksMap` and `classesMap` Maps are **shared across all tests within a file** and are mutated by each test's POST/PUT/DELETE operations. The `afterAll` cleanup deletes created tracks, but:

1. Tests within a file can fail if they run while another test has left the map in a dirty state.
2. The order of async tests matters — if a POST test leaks a track before a list-count test runs, the count assertion could fail.

The `retry: 3` config at client level is inherited for all test runs. For the server tests there is no explicit retry config, but the 3-retry setup in `vitest.config.js` applies if the server uses the client config — it does not (server has no `vitest.config.js`). The 154 server tests pass consistently.

**The actual isolation concern** is within the client tests where `storage.test.js` imports `storage.js` at module level and the IIFE migrations (`migrateTracksWorldDimensionsFromGeometry`, `migrateTracksAddWorldHeight`) run on `import`, potentially interfering with tests that set `racearena:tracks` in `localStorage`. The `beforeEach(() => localStorage.clear())` pattern in most tests mitigates this, but the module-level IIFE runs **before** any `beforeEach`.

**Real fix (not done here):** Reset `localStorage` in the test environment's global setup before each suite that imports `storage.js`, or move the IIFE migrations behind a function call.

---

## TC-06 — `headlessRaceSimulator.js` 0% coverage (MEDIUM)

**File:** `client/src/modules/headlessRaceSimulator.js` (361 lines)

This module runs full races without a DOM. It is used exclusively by `scripts/*.mjs` sim tools and never by the app itself. It is not in any test file. Coverage is 0%.

The sim scripts (`sim-fairness.mjs`, `sim-sweep.mjs`, etc.) exercise it as integration tests when run manually, but there are no automated unit tests. If `raceBehavior.js` changes break the sim output, there is no automated detection.

---

## TC-07 — `spriteTinter.js` 51% branch coverage (MEDIUM)

**File:** `client/src/modules/racer-types/spriteTinter.js`  
**Coverage:** 64% stmts, 51% branch, 82% funcs  
**Uncovered lines:** 192–293, 341–450 (pattern-tinting + mask paths)

The `_patternedVariantCache` and `_maskedVariantCache` paths are never exercised in tests. These handle the `tintMode: 'pattern'` and `tintMode: 'mask'` racer types. Given that new racer types (Boarder, Snowmobile) use pattern or mask tinting, regressions in this code go undetected. The `_clearPatternedVariantCache` and `_getPatternedVariantCacheSize` test helpers exist but are only used indirectly.

---

## TC-08 — `TransitionContext.jsx` 0% (MEDIUM)

**File:** `client/src/contexts/TransitionContext.jsx` (47 lines)

The screen-transition context (`fade to black` between screens) has zero test coverage. All screen tests that render with the context use `React.Suspense` fallback or direct renders, not the actual `TransitionContext`. Simple tests for `useTransition` hook and `TransitionOverlay` rendering would provide good coverage.

---

## TC-09 — Server coverage provider not installed (MEDIUM)

**File:** `server/package.json`

The server has no `@vitest/coverage-v8` devDependency and no `vitest.config.js` with coverage settings. Running `npx vitest --coverage` in `server/` fails immediately with `MISSING DEPENDENCY Cannot find dependency '@vitest/coverage-v8'`.

The server contains critical validation logic (C1/C2/H4 from Sec-1, C4 from Sec-2) that has been tested only via integration-style supertest assertions, not with branch-level coverage measurement. It is unknown what percentage of error branches in `validateEffects`, `validatePoints`, `validateTrackLights`, `validateBody`, and `detectMagicType` are covered.

**Fix:** Add `@vitest/coverage-v8` to `server/devDependencies` and a `vitest.config.js` with `coverage: { provider: 'v8', include: ['src/**/*.js'] }`.

---

## TC-10 — No skipped or todo tests (INFO)

Grep for `.skip`, `.todo`, `xtest`, `xit`, `xdescribe` across all `*.test.*` files found **zero** matches. All tests actively run and assert. Clean.

---

## TC-11 — `useStorage.js` 0% branch coverage (LOW)

**File:** `client/src/modules/storage/useStorage.js`  
**Coverage:** 43% stmts, 0% branch, 50% funcs

The `useStorage` hook (React hook backed by localStorage) has no branch coverage. The error path (quota exceeded) and the value parsing path (corrupt JSON) are never exercised. These paths are tested in `storage.test.js` at the `storageGet`/`storageSet` level, but not via the hook itself.
