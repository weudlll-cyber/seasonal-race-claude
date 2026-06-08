# Audit Cluster 4 — Deletion Proof Table

**Date:** 2026-06-08
**HEAD:** cd067d6 (backup/pre-audit-c4)
**Method:** Independent grep for each candidate — symbol + filename + string refs +
  dynamic-load patterns. Knip verdict is hypothesis only; this table is the reference check.

---

## Proof Table

| # | Candidate | Grep Evidence | Verdict |
|---|-----------|---------------|---------|
| K03 | `track-effects/effects/bubbles.js` | `track-effects/index.js:11` uses `import.meta.glob('./effects/*.js', { eager: true })` — loads ALL files in that directory. Every `effects/*.js` file is eagerly imported at app boot. | **KEEP** — glob-loaded, not a dead file |
| K04 | `track-effects/effects/dust.js` | Same glob. Also `RacerEditor.jsx:44,65` reference `'dust'` as the default `trailStyle` (separate trail system, unrelated, but confirms the string is live too). | **KEEP** — glob-loaded |
| K05 | `track-effects/effects/fireflies.js` | Same glob. Zero standalone non-glob import — but glob loads it. | **KEEP** — glob-loaded |
| K06 | `track-effects/effects/mud.js` | Same glob. `surface-effects/defaults.js:60` also has `id: 'mud'` (separate system). | **KEEP** — glob-loaded |
| K07 | `track-effects/effects/rain.js` | Same glob. | **KEEP** — glob-loaded |
| K08 | `track-effects/effects/stars.js` | Same glob. `trackRendering.js:54` has local `const stars = [...]` (unrelated variable name). | **KEEP** — glob-loaded |
| K09 | `track-effects/effects/wave.js` | Same glob. | **KEEP** — glob-loaded |
| K01 | `screens/DevScreen/index.js` | `App.jsx:11` imports `from './screens/DevScreen/DevScreen.jsx'` (explicit file, not the directory). Grep for `DevScreen/index` or bare `DevScreen'` in any import: zero hits outside the file itself. File contains a 10-line stub component (`<div className="screen screen--dev" />`). | **CONFIRMED-DEAD** — zero callers |
| K02 | `screens/SetupScreen/index.js` | `App.jsx:10` imports `from './screens/SetupScreen/SetupScreen.jsx'` (explicit file). Grep for `SetupScreen/index` or bare `SetupScreen'` as an import target: zero hits. File is a barrel re-export of `SetupScreen.jsx`. | **CONFIRMED-DEAD** — zero callers |
| K11 | `saveTrack` export (trackStorage.js) | `trackStorage.test.js:29,39,47…` (24 call sites in test file). Zero production callers outside `trackStorage.js`. | **KEEP** — test callers; removing export would break the test suite |
| K17 | `computeRowLayout` export (rowLayout.js) | `rowLayout.test.js:67,75,88…` (test callers). `scripts/diag-avoidance-track.mjs:5,56` and `scripts/sim-race-visual.mjs:48,355` (script callers). | **KEEP** — test + script callers |
| K16 | `OVERLAY_TEMPLATES`, `hasAllVars`, `resolveTemplate` (stateOverlayTemplates.js) | `stateOverlayTemplates.test.js:3-5,57,169,184,200,204,212,235,244` (test callers only). Zero production callers. | **KEEP** — test callers; removing exports would break the test suite |
| E05 | `RACER_TYPE_IDS` import in `TrackManager.jsx:18` | `RACER_TYPE_IDS` appears at `TrackManager.jsx:18` (import) and nowhere else in that file (grep confirmed 0 other hits). The *export* itself is live in `racer-types/index.js` and used in `RacerEditor.jsx:15,105`, multiple test files. The dead thing is only the **import** in TrackManager. | **CONFIRMED-DEAD import** — remove only from TrackManager's destructured import |
| E06 | `PRIORITY_MODE` import in `RaceScreen/index.jsx:56` | `PRIORITY_MODE` appears at `index.jsx:56` (import) and nowhere else in that file (grep confirmed 0 other hits). The *export* is live in `raceBehavior.js` and used heavily in `priorityModeOverlay.js`. The dead thing is only the **import** in index.jsx. | **CONFIRMED-DEAD import** — remove only from index.jsx's destructured import |

---

## Summary

| Verdict | Items |
|---------|-------|
| **CONFIRMED-DEAD (delete file)** | `DevScreen/index.js`, `SetupScreen/index.js` |
| **CONFIRMED-DEAD (remove import line only)** | `RACER_TYPE_IDS` in `TrackManager.jsx:18`, `PRIORITY_MODE` in `RaceScreen/index.jsx:56` |
| **KEEP** | K03–K09 (7 track-effects modules — glob-loaded), `saveTrack`, `computeRowLayout`, `stateOverlayTemplates` exports (all have test/script callers) |

**No files are deleted and no code is changed until the owner reviews this proof table.**

---

## False-Positive Detail: track-effects glob

`client/src/modules/track-effects/index.js:11`:
```javascript
const modules = import.meta.glob(['./effects/*.js', '!./effects/*.test.js'], { eager: true });
```
This Vite glob eagerly imports every `*.js` in `effects/` (excluding test files) at bundle time.
Knip cannot trace `import.meta.glob` patterns — it sees no static `import` statements for
these files and therefore incorrectly flags them as unused. All 7 effect modules are live.
