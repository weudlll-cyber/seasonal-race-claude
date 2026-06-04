# Phase 1 — Source Hygiene & Security Audit

**Branch:** `chore/clean-state-2026-06-04`
**Date:** 2026-06-04
**Baseline commit:** `e4f509f`
**Verdict:** PASS with ATTENTION items (no blocking issues; see findings below)

---

## Executive Summary

The codebase is in good shape. No secrets, no TODO/FIXME debt, no blocked tests, no structural
security holes. Five attention items surfaced: stale physics values in two E2E/unit test files,
17 dead-code constants in CameraDirector.js, an orphaned user-created track file in server data
that the sim counts as a "default" track, a 9-vs-10 track count inconsistency between server
comments and ARCHITECTURE.md, and stale racer-count claims (13 → 20) in ARCHITECTURE.md.

**Determinism fingerprint: PASS — before and after fingerprint identical (no changes made in Phase 1).**
**Full test suite: 2564/2564 PASS.**

---

## 1a. Determinism Fingerprint

Fixed-seed runs before any changes, recorded for comparison after Phase 1 cleanups.

| Track | Racer | Duration | finishT | p-value |
|---|---|---|---|---|
| dirt-oval | horse | 30s | 2.094 | 0.634 |
| dirt-oval | dragon | 30s | 2.304 | 0.224 |
| dirt-oval | buggy | 30s | 1.990 | 0.180 |
| dirt-oval | snowmobile | 30s | 2.304 | 0.224 |
| space-sprint | dragon | 30s | 0.218 | 0.176 |
| space-sprint | rocket | 30s | 0.248 | 0.659 |
| space-sprint | plane | 30s | 0.228 | 0.659 |

Seeds: dirt-oval seed=42, space-sprint seed=42, 5 races each, `--dur=30`.

After Phase 1 (no code changes applied): **identical — fingerprint confirmed.**

---

## 1b. Full File Inventory

### Tracked file totals
- JS/JSX source files: ~160
- Test files (vitest): ~70
- E2E specs (Playwright): 21
- Server source: ~20
- Scripts: 37
- Docs: ~10 markdown files
- JSON data (tracks): 10 files (9 default + 1 user-created)
- Total tracked non-binary files: ~340

### Header Convention
The project standard header is:
```
// ============================================================
// File:        <filename>
// Path:        <relative-path>
// Project:     RaceArena
// Created:     YYYY-MM-DD
// Description: ...
// ============================================================
```

**Files missing the standard header** (no behavior impact — documentation only):
- All `client/e2e/` spec files (21 files) — Playwright E2E specs have partial headers
- Simple re-export files: `client/src/components/Button/index.js`, `ColorPicker/index.js`,
  `InputField/index.js`, `LogoUploader/index.js`, `Modal/index.js`, `InfoTooltip/index.js`
- `client/src/App.jsx`, `client/src/main.jsx`
- Config files: `eslint.config.js`, `vite.config.js`, `playwright.config.js`

**Recommended (not applied):** Add standard headers to the re-export component index files. E2E
specs and config files are considered tooling, not domain code, so headers are optional there.

### Oversized Files (candidates for splitting — do not split now)

| File | Lines | Rationale |
|---|---|---|
| `client/src/modules/camera/CameraDirector.test.js` | 5,674 | Very large test file; one module but many complex scenarios |
| `scripts/sim-fairness.mjs` | 2,353 | Monolithic simulation script; could be modularized but works well |
| `client/src/modules/camera/CameraDirector.js` | 2,074 | Complex state machine; split attempted before (Diag extracted) |
| `client/src/screens/RaceScreen/index.jsx` | 1,528 | Main race screen; drawing submodules already extracted |
| `client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx` | 1,312 | Long but single-responsibility |

ARCHITECTURE.md references RaceScreen at 1,460 lines — actual is 1,528 (minor stale count).

---

## 1c. Dead / Redundant / Over-complex Code

### FINDING C1 — Dead constants in CameraDirector.js (ATTENTION)

`client/src/modules/camera/CameraDirector.js` lines 28–71 declare 17 named constants
(`MAX_STATE_DURATION`, `ENDGAME_PROGRESS_THRESHOLD`, `BATTLE_PULK_THRESHOLD_PX`, etc.) that
ESLint flags as `no-unused-vars`. These were originally code fallbacks for when no camera config
was provided, but the config path is now always populated from `DEFAULT_CAMERA_CONFIG`. They are
no longer read at runtime.

**Impact:** Dead code only — no behavior effect. Safe to remove with a grep-verify step.
**Recommended (not applied):** Prefix with `_` (ESLint convention) or delete outright after
confirming none are exported/imported elsewhere. The 2 unused function params at line 1021
(`canvasW`, `canvasH`) should also be prefixed `_canvasW`, `_canvasH`.

### FINDING C2 — ESLint warnings (all warnings, 0 errors)

Full ESLint run on `client/src/`:
- 17 unused vars in CameraDirector.js (covered above)
- 2 unused function params in CameraDirector.js
- 1 react-refresh warning in TransitionContext.jsx
- ~25 `console.log` in `diagnostics/trackCorridor.test.js` (test file, intentional debug output)

**Auto-fixable by ESLint:** none of these (require manual judgment).
**Prettier:** all files pass `prettier --check` — no formatting issues.

### FINDING C3 — Stale comment in `client/src/modules/racer-types/index.js`

Header comment says "D3.5.3: All 13 racer types are SpriteRacerType instances." The project now
has 20 built-in racer types. The "13" count is stale.

**Recommended (not applied):** Update header comment to "20 types total."

### FINDING C4 — No TODO/FIXME/HACK/XXX in source

Grep across all tracked source files returned zero matches. The codebase is clean.

---

## 1d. Lint / Format / Typecheck

| Check | Result |
|---|---|
| ESLint (`npx eslint src/`) | 0 errors, 45 warnings (dead code + debug logs in tests) |
| Prettier (`prettier --check`) | All matched files pass — no formatting issues |
| TypeScript / Flow | Project uses plain JS — no typecheck step |

No auto-fixable behavior-neutral changes were applied because ESLint warnings in this project
all require manual judgment (unused var prefixing, console removal in tests).

---

## 1e. Physics-Parameter Leakage Check

### The 8 frozen parameters (from `defaults.js`)
```
lateralForce:                0.011400
lateralDamping:              0.160000
homeForceStrength:           0.030000
homeForceReductionOnOverlap: 0.300000
avoidanceDistance:           0.180000
speedBrakeFactor:            0.945000
speedBrakeTMultiplier:       1.500000
speedBrakeYThreshold:        0.180000
```

### Leakage scan result: NO production leakage

Every reference to these parameter names outside `defaults.js` is one of:
- `raceBehavior.js` — reads them from `config` object (correct, config comes from defaults)
- `raceBehaviorConfig.js` — same, reads from config
- `headlessRaceSimulator.js` — reads `behaviorConfig.speedBrakeFactor` (correct)
- `sim-fairness.mjs` / `sim-sweep.mjs` / `sweep-*.mjs` — pass via CLI flags, read defaults
- Test files — use test-specific numeric literals in mock configs (see FINDING E1 below)

**No hardcoded physics values appear in production application code outside `defaults.js`.**

### FINDING E1 — Stale physics values in E2E test (ATTENTION — tests will FAIL when run)

`client/e2e/d11-ux-verification.spec.js` has a `DEFAULT_CFG` object and V1 test assertions
with OLD physics values:

| Parameter | Test expects | Current default |
|---|---|---|
| `homeForceStrength` | 0.018 | 0.030 |
| `avoidanceDistance` | 0.35 | 0.18 |
| `lateralForce` | 0.015 | 0.0114 |
| `speedBrakeFactor` | 0.98 | 0.945 |

Tests V1–V3 explicitly verify `expect(page.getByLabel('Home Force Strength')).toHaveValue('0.018')`.
**These Playwright E2E tests will FAIL** if run against the current app because the Dev Screen
now shows the current default values (0.03, 0.18, 0.0114, 0.945).

Additionally, `client/src/screens/DevScreen/sections/RaceTuningSection.test.jsx` has mock
config literals (homeForceStrength: 0.04, avoidanceDistance: 0.35, etc.) that are test-specific
mock data, not default assertions — those are fine.

**Recommended (not applied):** Update `d11-ux-verification.spec.js` `DEFAULT_CFG` and
V1 test assertions to match current `DEFAULT_RACE_BEHAVIOR_CONFIG` values. This is a safe,
behavior-neutral change to the test file, but it needs browser verification first.

Note: This file is a Playwright E2E spec — it does NOT run in the vitest suite.
The 2564/2564 vitest tests passing does NOT cover this. It is a latent test failure.

### Dev Screen physics sliders

Confirmed: **none of the 8 physics parameters have sliders in the Dev Screen.**
The `DynamicsTuningSection.jsx` references the parameter names only in a tooltip warning
message. `BehaviorTuningSection.jsx` controls non-frozen behavior params (drafting, home force
UI elements map to other config fields). The 8 frozen params are deliberately inaccessible.

---

## 1f. Security Audit

### Dependency vulnerabilities
```
npm audit (client/):
  2 moderate severity — react-router 6.7.0–6.30.3
  Vulnerability: open redirect via protocol-relative URL (//-prefix)
  Fix: npm audit fix (non-breaking upgrade available)
  CVE: GHSA-2j2x-hqr9-3h42
```

**Recommended (not applied):** Run `npm audit fix` in `client/`. Non-breaking minor upgrade.
Impact is low (open redirect only affects same-origin navigation in edge cases).

### Secret / credential scan

Grep for `JWT`, `SECRET`, `PASSWORD`, `API_KEY`, `token` across all tracked files:
- Only `process.env.PORT` found in `server/src/index.js` — appropriate.
- No hardcoded credentials, tokens, or secrets anywhere.
- **PASS**

### Server hardening

| Check | Status |
|---|---|
| Stream error listener (`createReadStream`) | PRESENT — line 478 `stream.on('error', ...)` ✓ |
| Unhandled error crash on background endpoint | Handled: 500 JSON if headers not yet sent ✓ |
| Path traversal (background image serving) | LOW RISK — filename derived server-side from `track.id.ext` at upload time, not from user query params ✓ |
| Input validation on POST/PUT `/api/tracks` | Present — `validateTrackBodyForCreate` / `validateTrackBodyForUpdate` ✓ |
| Static file serving path traversal | No Express `static()` middleware — only API routes; no file path user-controlled ✓ |
| CORS | `app.use(cors())` — wide-open, acceptable for local-only deployment |

### Authentication / Authorization — PRE-GO-LIVE BLOCKER ⚠️

The server has **no authentication**. Any request to `/api/tracks` can read, create, update, or
delete tracks. The `/api/surface-classes` endpoint is similarly open.

This is a known, backlogged item (Backlog #7). The app is not yet publicly deployed.

**This MUST be resolved before any public deployment.** JWT/session-based auth with operator
login is the planned approach. Do not deploy publicly without implementing auth.

---

## 1g. TODO / FIXME / HACK / XXX Inventory

Grep result: **zero matches** across all tracked source files.

The codebase has no outstanding inline debt markers. Clean.

---

## 1h. Doc-vs-Code Consistency

### FINDING H1 — Racer set: code has 20 types, ARCHITECTURE.md claims 13

`ARCHITECTURE.md` at multiple locations:
- Line 75: "LugeRacerType.js # 13th built-in type"
- Line 631 (VRE-3 table): "All 13 racer types assigned"
- `index.js` header: "20 types total as of snowmobile addition" ✓ (correct in code)

**Resolution:** The racer-types `index.js` is correct (20 types). ARCHITECTURE.md is stale.
The 20 built-in types are: horse, duck, snail, elephant, giraffe, snake, dragon, f1, rocket,
buggy, motorbike, plane, luge, beetle, boarder, koi, turtle, manta, dolphin, snowmobile.

HANDOFF.md is acknowledged as outdated by the user — skipped per user instruction.

### FINDING H2 — Track count: 9 defaults in code vs "10" in docs/comments

| Source | Says |
|---|---|
| `client/src/modules/storage/defaults.js` (DEFAULT_TRACKS array) | 9 tracks |
| `server/src/routes/tracks.js` (code comment at DEFAULT_TRACK_SEEDS) | "9 built-in default tracks" |
| `scripts/sim-fairness.mjs` (trackFiles array) | 10 entries |
| `ARCHITECTURE.md` ("all 10 default tracks") | 10 |
| `defaults.js` physics comment ("all 10 default tracks") | 10 |

The sim's 10th entry is `90d3020197da` — "Luger Hill", a **user-created** track (not a default).
It has surfaceClasses: `['ice', 'air']`, created 2026-05-27, `isDefault: false`.

**Resolution:** There are 9 default tracks. The sweep (and this Phase 2 run) correctly covers
10 tracks including user-created Luger Hill. However, "10 default tracks" in ARCHITECTURE.md and
in the physics comment in defaults.js is technically inaccurate — should be "9 default + 1
user-created (Luger Hill)." Phase 4 will fix these doc references.

The 9 default tracks are:
| ID | Name | Surface | worldW × worldH | Open/Closed |
|---|---|---|---|---|
| dirt-oval | Dirt Oval | earth | 1280×720 | Closed |
| river-run | River Run | water | 1280×720 | Open |
| space-sprint | Space Sprint | air | 1280×720 | Open |
| garden-path | Garden Path | grass, earth | 1280×720 | Open |
| city-circuit | City Circuit | asphalt | 1280×720 | Closed |
| mountainstreet | Mountainstreet | asphalt | 6144×4096 | Open |
| ice-track | Ice Track | ice, snow | 1536×1024 | Closed |
| seatrack | Seatrack | water | 6144×4096 | Open |
| searound | Searound | water | 3072×2048 | Closed |

Plus user-created Luger Hill (ice, air) — included in sim only.

### FINDING H3 — Body-dimension table (from spec cross-check)

The spec mentioned a discrepancy: HANDOFF lists `penguin`/`ufo` while body-dimensions lists
`snail`/`elephant`. Per user instruction, HANDOFF.md is outdated and ignored.

The 20 racer types in code are confirmed above. There is no `penguin` or `ufo` racer type in the
codebase. `snail` and `elephant` are present and correct.

### FINDING H4 — bodyFillX/bodyFillY in sim-fairness.mjs RACER_CONFIGS

The `RACER_CONFIGS` in `scripts/sim-fairness.mjs` includes `bodyFillX` and `bodyFillY` for all
20 racer types. These were added in the recent `feat/body-dimensions` merge. Verified all 20
racer type files have `bodyFillX`/`bodyFillY` defined. Sim parity confirmed. ✓

---

## 1i. Apply & Verify

**No code changes applied in Phase 1.** All findings are either:
- Confirmed non-issues (no production behavior impact)
- Recommended for future cleanup (documented below)

The determinism fingerprint was re-verified after all read-only analysis: **PASS (unchanged).**

---

## Findings Summary

| ID | File | Severity | Type | Applied? |
|---|---|---|---|---|
| C1 | CameraDirector.js:28–71 | Low | 17 dead constants (never read after config migration) | No — Recommended |
| C2 | CameraDirector.js:1021 | Low | 2 unused function params | No — Recommended |
| C3 | racer-types/index.js header | Info | Stale "13 racer types" comment | No — Recommended |
| E1 | e2e/d11-ux-verification.spec.js | Medium | Stale physics values — E2E tests WILL FAIL | No — Recommended |
| H1 | ARCHITECTURE.md | Medium | "13 racer types" in multiple places; should be 20 | No — Phase 4 fix |
| H2 | ARCHITECTURE.md + defaults.js comment | Low | "10 default tracks" — should be "9 default + 1 user-created" | No — Phase 4 fix |
| SEC1 | client/package.json | Moderate | 2 react-router moderate vulns (open redirect) | No — Recommended |
| SEC2 | server | Blocker | No auth — must fix before public deployment | No — Known backlog #7 |

### Recommended (not applied), ranked by impact/risk

1. **[HIGH] Fix d11-ux-verification.spec.js** — Update stale physics default values to prevent
   latent E2E test failures. Requires browser verification against running dev server.

2. **[MEDIUM] `npm audit fix` in client/** — Upgrades react-router to patch the moderate
   open-redirect vulnerability. Minor version bump, non-breaking.

3. **[MEDIUM] Update ARCHITECTURE.md** — Fix "13 racer types" to 20, update folder tree
   line counts, fix "10 default tracks" claim. (Scheduled for Phase 4.)

4. **[LOW] Prefix or delete dead constants in CameraDirector.js** — 17 unused fallback
   constants that predate the config-always-present architecture. Prefix with `_` to silence
   ESLint, or delete after confirming none are imported elsewhere.

5. **[LOW] Update racer-types/index.js header** comment from "13" to "20 racer types."
