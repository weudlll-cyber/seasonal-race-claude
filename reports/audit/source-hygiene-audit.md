# Source Hygiene Audit

**Date:** 2026-06-13  
**Base commit:** `6ae3d4f66981421fc2cbef4728422dc211972511`  
**Scope:** `client/src/**`, `server/src/**`, `scripts/**` (light), repo-root organisation  
**Excluded:** `*.test.*`, `*.spec.*`, `node_modules`, build output, comment accuracy (handled by separate comment-audit)

> Revised 2026-06-13 after independent Plan-Claude + Copilot review; numbers re-verified against HEAD `fea93f4`.

---

## Summary

| Category | Count |
|---|---|
| H1 — Extraction candidate | 1 |
| H2 — Mixed responsibilities | 1 |
| H3 — Duplication | 2 |
| H4 — Dead / unused / misfiled | 3 |
| H5 — Leave as-is (required anti-shrink guard) | 9 |

Additional findings from the independent second-review pass are listed in a dedicated section at the end of this document.

---

## H5 — Leave as-is (required)

These large files are cohesive and must **not** be split.

| File | Lines | Justification |
|---|---|---|
| `client/src/modules/camera/CameraDirector.js` | 2147 | Single state-machine concern: 5 camera states, transitions, and targeting. Already split in prior work. All 2147 lines serve one abstraction; private helpers are deeply intertwined with the FSM logic. |
| `client/src/screens/RaceScreen/index.jsx` | 1691 | Core rAF/physics orchestration and canvas setup are tightly coupled through shared refs; separating them would require threading prop/context plumbing that adds more complexity than it removes. **Keep core; optional DOM-shell extraction:** the pure loading/error DOM blocks around lines 1537 and 1608 have no ref dependencies and could be extracted to small shell components later without touching the physics loop. Covered by integration-style tests. |
| `client/src/modules/raceBehavior.js` | 1022 | Single physics domain (lateral avoidance + drafting + brake-to-match). Private helpers (`normalizeAngle`, `pairContact`, geometry converters) are not extracted because they are private implementation, not shared contracts. Highly tested (4 test files: `raceBehavior.test.js`, `raceBehaviorBrakeMatch.test.js`, `raceBehaviorConfig.test.js`, `raceBehaviorPriorityMode.test.js`; ~1599 lines total). |
| `client/src/screens/SetupScreen/SetupScreen.jsx` | 1120 | Cohesive setup wizard. Its three concerns (player groups, track selection, race parameters) are independently stateful but share a single `handleStartRace` output boundary — there is no shared form-state object. The one plausible later extraction is the Quick Test UI block (lines 932–1104), which has its own isolated state (`quickTestCount`, `quickTestSeed`, `quickTrackId`, `quickTestRacerTypeId`) and a clean boundary. Leave as-is for now; the Quick Test block is a concrete candidate if SetupScreen grows further. |
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

### H4-1: 63 git-tracked PNG/JPG diagnostic screenshots in repo root

**Evidence:** At HEAD, the repo root contains 227 PNG/JPG files total. Of these:
- **63 are git-tracked** (`git ls-files | grep -E "^[^/]+\.(png|jpg)$"`)
- **164 are git-ignored** (`.gitignore` already covers them)
- **0 are untracked** (`git status` shows no untracked image files)

Files group into diagnostic/verification runs: `check-*.png`, `cam-diag-*.png`, `luge-*.png`, `race-*.png`, `space-sprint-*.png`, etc. — all eye-check screenshots accumulated during iterative feature verification.

**Impact:** Root-level clutter hides actual project files. The `.gitignore` already prevents future screenshots from being tracked, but the 63 historical images that were committed before the ignore rule was added remain in git history and will travel with every clone.

**Proposed fix:** Run `git rm --cached <file>` on each of the 63 tracked root images to remove them from the index (files remain on disk; `.gitignore` then covers them going forward). This is a one-shot cleanup — do NOT perform it in this audit; schedule as a separate bounded task.  
**Risk/effort:** Low. Files stay on disk; only the git index changes. No code is touched.  
**Priority:** Medium (the `.gitignore` already handles new files; this is a history-cleanup rather than an urgent fix).

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

**Status:** All 8 are **git-ignored** (confirmed via `git ls-files --others --ignored --exclude-standard`). They are not tracked and not untracked noise visible in `git status`. They sit in the root as local artifacts from `scripts/` parameter sweep runs.

**Proposed fix:** Move to `reports/sweep-results/` to keep the root tidy; the `.gitignore` rule already suppresses them wherever they live. No urgency — these do not affect git state.  
**Risk/effort:** Low.  
**Priority:** Low.

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

1. **H4-2 (sweep results)** — move files only; no git or code impact.
2. **H3-1 + H3-2 (math utilities)** — create `client/src/utils/mathUtils.js`; swap four inline `lerp`/`lerpAngle` definitions; one test file to add for the new module. These can be a single small PR.

### Sequenced after (mild coupling)

3. **H1-1 / H2-1 (camera migrations)** — extract `cameraMigrations.js`; one call site in `cameraConfig.js`. Blocked on nothing; do after math utilities to keep PRs small.
4. **H4-1 (root tracked images)** — `git rm --cached` pass on 63 tracked root images. Schedule as its own commit; no other changes in same PR.

### Deferred / informational

5. **H4-3 (stub components)** — add comment-only annotation; depends on branding Phase 1 scheduling decision.

### Independent of all others

- H3-2 (`tNorm`) can be batched with H3-1 at no extra cost (same new file, adjacent lines).

---

## Additional Findings — Independent Second-Review Pass

The following four items were surfaced during the independent Plan-Claude + Copilot review and are confirmed against HEAD. They extend the findings above; no original item is superseded.

---

### AF-1 (H3 — Duplication): Active-brand resolution logic repeated in three runtime surfaces

The pattern `id = activeSession?.activeBrandingProfileId; profile = id ? profiles.find(p => p.id === id) ?? null : null` appears identically in:

| File | Line | Context |
|---|---|---|
| `client/src/screens/SetupScreen/SetupScreen.jsx` | 157 | Inline in component body (reads `brandingProfiles` + `activeSession` hooks) |
| `client/src/screens/RaceScreen/index.jsx` | 26 | Inline in component body (reads from storage via `useMemo`) |
| `client/src/screens/RaceScreen/BrandLogoOverlay.jsx` | 22 | Inline in component body (reads `brandingProfiles` + `activeSession` hooks) |

Each surface independently reads storage, resolves the active profile, and handles the null case. Any change to the resolution logic (e.g., adding a fallback, changing the null sentinel) must be applied in three places.

**Proposed fix:** Extract a custom hook `useActiveBrandProfile()` in `client/src/modules/` or `client/src/hooks/` that encapsulates the two `useStorage` calls and the `find` resolution. All three call sites replace their inline resolution with a single hook call.  
**Risk/effort:** Low. Pure React hook with no side effects; the three callers are straightforward to update.  
**Priority:** Medium — the brand system is actively growing; this duplication will compound as more surfaces are added.

---

### AF-2 (H2 — Mixed Responsibilities): `App.jsx` mixes routing with storage migration side effects

**File:** `client/src/App.jsx` (121 lines)  
**Reason:** The file contains two unrelated concerns at module scope:
1. **Storage migration IIFE** (`App.jsx:21–66`): runs `migrateStorage()` immediately on module load, mutating localStorage before the React tree is mounted.
2. **Router composition** (`App.jsx:70`): the `App()` component that renders `BrowserRouter` + `Routes`.

The IIFE executing at import time is a side effect that makes the module order-sensitive and harder to test in isolation. The migration logic has no dependency on the React tree and does not belong in the routing module.

**Proposed fix:** Move `migrateStorage` and `removeStalePromotedDefaults` to `client/src/modules/storage/migrateStorage.js` (a file that already exists for tests). Call `migrateStorage()` explicitly from `client/src/main.jsx` before mounting the React root, rather than as an IIFE side effect of importing `App.jsx`.  
**Risk/effort:** Low-medium. The logic is already tested; the move is mechanical, but the call site change in `main.jsx` must be verified to run before `ReactDOM.createRoot`.  
**Priority:** Low (current behavior is correct; this is a structural cleanliness issue, not a bug).

---

### AF-3 (H4 — Possible Dead Export): `drawNameTag` exported but only referenced internally

**File:** `client/src/screens/RaceScreen/drawing/racerRendering.js`  
**Evidence:** `export function drawNameTag` at line 33 is not imported by any other production file (`grep -r` across all `client/src` returns zero external references). The only call site is `racerRendering.js:137` — within the same file.

**Status: NEEDS VERIFICATION before any action.** The export may be consumed by:
- Test files (not checked in this scan)
- Dynamic imports not detectable by static grep
- A future caller already planned in the branding or diagnostics work

**Proposed action:** Verify with `grep -r "drawNameTag" client/src` including test files. If truly unused externally, demote to a non-exported function. Do not remove without confirming.  
**Risk/effort:** Low (change is `export function` → `function`; fully reversible).  
**Priority:** Low — informational until verification.

---

### AF-4 (H1 — Deeper Extraction): Version-branch duplication inside `cameraConfig.js` dispatch block

**File:** `client/src/modules/cameraConfig.js`, lines 504–643  
**Evidence:** The `loadCameraConfig` function contains 8 near-identical `if (stored.schemaVersion === N)` branches (versions 7–14). Each branch:
1. Shallow-merges with `DEFAULT_CAMERA_CONFIG`
2. Deep-merges `cameraStateProfiles` (identical 7-line block copy-pasted verbatim across all 8 branches)
3. Chains a version-specific suffix of migration calls

The deep-merge profile block (`for (const state of Object.keys(defProfiles)) { merged.cameraStateProfiles[state] = { ...defProfiles[state], ...(stored.cameraStateProfiles[state] ?? {}) }; }`) is copy-pasted identically 8 times within the dispatch function, in addition to the migration functions themselves being extracted (H1-1). This is a stronger extraction target than H1-1 alone described.

**Proposed fix:** Extract a `deepMergeProfiles(stored, defaults)` helper and a `runMigrationChain(config, fromVersion)` dispatch table. The 8 branches collapse to a single parameterized call. This can be done as part of the same task as H1-1 or as a follow-on pass.  
**Risk/effort:** Low. All branches are covered by `cameraConfig.test.js` (migration round-trip tests).  
**Priority:** Low-medium — the duplication is in rarely-touched legacy code, but each new schema version adds another copy of the 7-line block.
