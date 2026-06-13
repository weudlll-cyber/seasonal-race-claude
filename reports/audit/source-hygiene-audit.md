# Source Hygiene Audit

**Date:** 2026-06-13  
**Base commit:** `6ae3d4f66981421fc2cbef4728422dc211972511`  
**Scope:** `client/src/**`, `server/src/**`, `scripts/**` (light), repo-root organisation  
**Excluded:** `*.test.*`, `*.spec.*`, `node_modules`, build output, comment accuracy (handled by separate comment-audit)

---

## Summary

| Category | Count |
|---|---|
| H1 — Extraction candidate | 2 |
| H2 — Mixed responsibilities | 1 |
| H3 — Duplication | 2 |
| H4 — Dead / unused / misfiled | 3 |
| H5 — Leave as-is (required anti-shrink guard) | 9 |

---

## H5 — Leave as-is (required)

These large files are cohesive and must **not** be split.

| File | Lines | Justification |
|---|---|---|
| `client/src/modules/camera/CameraDirector.js` | 2147 | Single state-machine concern: 5 camera states, transitions, and targeting. Already split in prior work. All 2147 lines serve one abstraction; private helpers are deeply intertwined with the FSM logic. |
| `client/src/screens/RaceScreen/index.jsx` | 1691 | Orchestrator by nature — canvas, physics loop, phase management, and overlay wiring are all tightly coupled through shared refs and cannot be separated without threading prop/context plumbing that would add more complexity than it removes. Covered by integration-style tests. |
| `client/src/modules/raceBehavior.js` | 1022 | Single physics domain (lateral avoidance + drafting + brake-to-match). Private helpers (`normalizeAngle`, `pairContact`, geometry converters) are not extracted because they are private implementation, not shared contracts. Highly tested (3 test files, 738+ test lines). |
| `client/src/screens/SetupScreen/SetupScreen.jsx` | 1120 | Cohesive setup wizard. The three sub-concerns (player groups, track, race params) share a single form-state object; splitting would create a cross-file prop-drilling chain with no gain. |
| `client/src/screens/TrackEditor/TrackEditor.jsx` | 1066 | Already split in prior work via custom hooks (`useViewport`, `useHistory`, `useTrackIO`). Remaining code is justified drag/viewport/geometry state. |
| `client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx` | 1349 | Cohesive camera tuning UI (11 sections, all camera parameters). `SliderRow`, `StateProfileBlock`, `SectionHeading` are already extracted as local sub-components. Splitting by section would add 11 files with no reduction in coupling. |
| `client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx` | 752 | Single domain: dynamics parameter UI. Large due to the slider-per-param pattern; all sliders are interdependent dynamics config, not separable concerns. |
| `client/src/screens/DevScreen/sections/TrackManager.jsx` | 727 | Single domain: track list CRUD UI. Size is justified by the full track management surface (search, sort, edit, delete, import). |
| `client/src/screens/DevScreen/sections/RacerEditModal.jsx` | 672 | Single domain: racer sprite editor (coats, patterns, frame crops). All sections directly edit one racer type object; shared state makes extraction a net loss. |

---

## H1 — Extraction Candidates

### H1-1: Camera migration chain — extract from `cameraConfig.js`

**File:** `client/src/modules/cameraConfig.js` (665 lines)  
**Role:** Camera config load/save from localStorage + 12 historical version migrations  
**Reason:** Two unrelated responsibilities in one file (see also H2-1). The 12 migration functions (lines 152–357) are a pure historical-conversion chain. They have no shared mutable state with the I/O code, take and return plain config objects, and are never called except from the `loadCameraConfig` migration dispatch block (lines 360–660). Once run and written back, a migration is never invoked again.

**Proposed task:**  
- Move `migrateV3toV5` through `migrateV14toV15` (lines 152–357) into a new file `client/src/modules/cameraMigrations.js`  
- Export a single `applyMigrations(config, version)` function that encapsulates the dispatch chain  
- `cameraConfig.js` calls `applyMigrations` instead of inlining the dispatch; its own surface stays: `loadCameraConfig`, `saveCameraConfig`, `DEFAULT_CAMERA_CONFIG`

**Resulting interface:** `cameraMigrations.js` exports `applyMigrations(rawConfig) → migratedConfig` (pure function, no side effects).  
**Call sites:** One call site in `loadCameraConfig` (line ~380).  
**Risk/effort:** Low. Migrations are already pure functions with no shared state; the refactor is mechanical.  
**Test coverage:** `cameraConfig.test.js` covers the migration chain via the `loadCameraConfig` path — a regression would be caught.  
**Priority:** Low (cosmetic separation, no bug risk).

---

## H2 — Mixed Responsibilities

### H2-1: `cameraConfig.js` — config I/O + historical migration chain

**File:** `client/src/modules/cameraConfig.js` (665 lines)  
**Reason:** The file has three distinct jobs: (1) default-config definition, (2) 12 sequential schema migrations (lines 152–357), (3) localStorage I/O with version-dispatch logic (lines 360–663). The migration chain is a historical artefact; new versions of the config no longer need it — but it must remain runnable for users upgrading from v3. Keeping it co-located with current I/O means every reader of `cameraConfig.js` must mentally skip 200 lines of legacy code to understand how config is saved and loaded today.

**Proposed fix:** Extract migrations to `cameraMigrations.js` (see H1-1). The I/O concern and the default-config concern belong in `cameraConfig.js` and are genuinely related — no further split needed.  
**Risk/effort:** Low.  
**Priority:** Low.

---

## H3 — Duplication

### H3-1: `lerp` and `lerpAngle` defined identically in four production files

**Locations (production code only):**

| File | Lines | Definition |
|---|---|---|
| `client/src/screens/RaceScreen/drawing/battleDiagRendering.js` | 14 | `const lerp = (a, b, t) => a + (b - a) * t;` |
| `client/src/screens/RaceScreen/drawing/priorityModeOverlay.js` | 13 | `const lerp = (a, b, t) => a + (b - a) * t;` |
| `client/src/screens/RaceScreen/drawing/racerRendering.js` | 14–18 | `lerp` + `lerpAngle` (shortest-arc) |
| `client/src/screens/RaceScreen/index.jsx` | 701–708 | `lerp` + `lerpAngle` (identical to racerRendering) |

No shared math utility module exists in `client/src/utils/` or `client/src/modules/`. The `client/src/utils/` directory currently holds only `formatRaceTime.js`, `slugify.js`, and `withTimeout.js`.

**Proposed fix:** Add `client/src/utils/mathUtils.js` exporting `lerp`, `lerpAngle`, and `tNorm` (see H3-2). Replace all four inline definitions with `import { lerp, lerpAngle } from '../../utils/mathUtils.js'` (path relative to each file).  
**Risk/effort:** Low. Functions are one-liners with no side effects; any incorrect refactor would break the render interpolation immediately and visibly.  
**Test coverage:** `racerRendering` and `RaceScreen` render paths are exercised in integration tests, but the lerp itself is not unit-tested — extraction without a unit test for the utility is acceptable here (trivial pure function).  
**Priority:** Medium. Four copies means four places a subtle fix (e.g., the `lerpAngle` wrap-around for open tracks) can be applied inconsistently.

---

### H3-2: T-position circular normalization pattern repeated in two files

**Locations:**

| File | Line | Code |
|---|---|---|
| `client/src/screens/RaceScreen/index.jsx` | 138 | `const tPos = (t) => ((t % 1) + 1) % 1;` |
| `client/src/modules/headlessRaceSimulator.js` | 79 | `const tNorm = ((t % 1) + 1) % 1; // inline` |

Both normalize a racer's `t` coordinate (track-position fraction) to `[0, 1)` for closed tracks. The formula is identical; only the name differs (`tPos` vs `tNorm`).

**Proposed fix:** Add `export function tNorm(t) { return ((t % 1) + 1) % 1; }` to the `mathUtils.js` proposed in H3-1. Replace both inline uses.  
**Risk/effort:** Low. One-liner pure function; both usages are single-call-site.  
**Test coverage:** The simulator is heavily tested; any wrong normalization would fail position-order assertions.  
**Priority:** Low (two copies, not four; less urgent than H3-1).

---

## H4 — Dead / Unused / Misfiled

### H4-1: 227 PNG/JPG diagnostic screenshots in repo root

**Evidence:** `ls *.png *.jpg` in repo root returns 227 files (vs. the ~63 expected at spec time). Files group into diagnostic/verification runs: `check-*.png`, `cam-diag-*.png`, `luge-*.png`, `race-*.png`, `space-sprint-*.png`, etc. — all eye-check screenshots accumulated during iterative feature verification.

**Impact:** Root-level noise hides actual project files; each `git status` shows hundreds of untracked entries; developer tools that glob the root for source files get polluted results.

**Proposed fix:** One of the following (game-master decision):  
- Add `*.png` and `*.jpg` to `.gitignore` (they are browser-taken screenshots, not version-controlled assets).  
- Move to `reports/screenshots/` and add a `.gitkeep`; add to `.gitignore` going forward.  

**Risk/effort:** Low. These files are already untracked (not in git history); moving or ignoring them has zero code impact.  
**Priority:** High (cosmetic but distracting; easiest win in the repo).

---

### H4-2: 8 sweep parameter result files in repo root

**Files:**
```
sweep-balanced-lhs-results.txt
sweep-dyn-sbt-results.txt
sweep-full-4phase-results.txt
sweep-phase1-results.txt  sweep-phase2-results.txt
sweep-phase3-results.txt  sweep-phase4-results.txt
sweep-phase5-results.txt
```

**Reason:** These are output artifacts from `scripts/` parameter sweep runs, not source. They pollute the root alongside `CLAUDE.md`, `README.md`, and `package.json`.

**Proposed fix:** Move to `reports/sweep-results/` (the `reports/` directory already exists). Add `*-results.txt` or `reports/sweep-results/` to `.gitignore` if sweep outputs should not be committed.  
**Risk/effort:** Low.  
**Priority:** Medium.

---

### H4-3: Five unimported stub components in `client/src/components/`

**Files** (verified with `grep -r` for any import across all `client/src` production files):

| Component | File | Lines | Status |
|---|---|---|---|
| `Button` | `client/src/components/Button/index.js` | ~17 | Zero imports in production |
| `Modal` | `client/src/components/Modal/index.js` | ~26 | Zero imports in production |
| `InputField` | `client/src/components/InputField/index.js` | ~30 | Zero imports in production |
| `ColorPicker` | `client/src/components/ColorPicker/index.js` | ~36 | Zero imports in production |
| `LogoUploader` | `client/src/components/LogoUploader/index.js` | ~46 | Zero imports in production |

**Context:** The `reports/proposals/branding-concept.md` proposal (section 6) explicitly designates these five components as future integration targets for Phase 1 branding work. They are **intentional stubs**, not accidentally orphaned code.

**Proposed fix:** No deletion needed. Document their status in a comment at the top of each file (e.g., `// Stub — awaiting branding Phase 1 integration; see reports/proposals/branding-concept.md`) so they are not mistaken for dead code. Alternatively, defer until Phase 1 is scoped.  

For contrast: `ErrorBoundary`, `InfoTooltip`, `PresetThumbnail`, and `EffectConfig` in the same directory **are** actively imported in production and are not affected.

**Risk/effort:** Low.  
**Priority:** Low (context is documented; risk is only developer confusion).

---

## Suggested Sequencing

### Safe first (independent, well-tested, low coupling)

1. **H4-1 (root images)** — zero code change; `.gitignore` edit only. Immediate quality-of-life improvement.
2. **H4-2 (sweep results)** — move files + optional `.gitignore` line. Zero code impact.
3. **H3-1 + H3-2 (math utilities)** — create `client/src/utils/mathUtils.js`; swap four inline `lerp`/`lerpAngle` definitions; one test file to add for the new module. These can be a single small PR.

### Sequenced after (mild coupling)

4. **H1-1 / H2-1 (camera migrations)** — extract `cameraMigrations.js`; one call site in `cameraConfig.js`. Blocked on nothing; do after math utilities to keep PRs small.

### Deferred / informational

5. **H4-3 (stub components)** — add comment-only annotation; depends on branding Phase 1 scheduling decision.

### Independent of all others

- H3-2 (`tNorm`) can be batched with H3-1 at no extra cost (same new file, adjacent lines).
