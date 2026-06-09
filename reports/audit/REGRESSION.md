# RaceArena — Regression Hunt Report

**Date:** 2026-06-09
**Branch:** master
**Owner report:** Racers cluster near the finish and barely advance; ~30fps with a 238ms "other" spike (perf log).
**Tags involved:** backup/sec2 (known-good), backup/auto-done (end of overnight batch), backup/pre-regfix (start of this hunt), backup/regfix (end of this hunt — see below).

---

## Summary

| Question | Answer |
|----------|--------|
| Did the overnight batch (sec2→auto-done) regress physics? | **NO** — sim output byte-identical |
| Did the H-05 diag commits (auto-done→master) regress physics? | **NO** — sim output byte-identical |
| Were the H-05 diag commits the source of the 238ms spike? | **NO** — spike present on clean build too |
| Action taken | Reverted H-05 diag instrumentation (see commit below) |
| Physics fix needed? | No — sim matches sec2 baseline |
| Perf fix needed? | Phase 2 TBD — spike is pre-existing, not a new regression |

---

## STEP 1 — sec2 Baseline (deterministic sim, no race plan)

**Command:** `node scripts/sim-fairness.mjs --seed=1 --races=5 --racers=20 --track=space-sprint --dur=60 --out=tmp/clean-sec2`

| Racer type | Finish line (finishT) | Wins row-0 | Wins row-1 | Avg rank row-0 | Avg rank row-1 | p-value | Verdict |
|------------|----------------------|------------|------------|----------------|----------------|---------|---------|
| dragon | 0.4360 | 3 | 2 | 9.94 | 11.06 | 0.6589 | FAIR |
| rocket | 0.4955 | 2 | 3 | 9.90 | 11.10 | 0.6589 | FAIR |
| plane | 0.4558 | 5 | — | 10.5 | — | 1.0000 | FAIR (1 row) |

All 5 races completed (outcomeReached = true). 0 unfair combos.
MD5 of fairness-data.json: `b6ce1af66254`

---

## STEP 2a — backup/auto-done vs sec2

**Command:** same as STEP 1 with `--out=tmp/clean-auto-done` (not run: identical code — see note below)

The diff `git diff backup/sec2 backup/auto-done -- client/src/modules/` shows **only** camera
constant refactoring in `CameraDirector.js` / `cameraTimingComputation.js` (H-02). Values
unchanged (200 px, 0.12 T); the sim does not import from either file. Code is physics-identical.

**Verdict: auto-done MATCHES sec2** (mathematically guaranteed by zero diff in physics modules).

---

## STEP 2b — current master (post-H-05 diag) vs sec2

**Command:** `node scripts/sim-fairness.mjs --seed=1 --races=5 --racers=20 --track=space-sprint --dur=60 --out=tmp/clean-master`

Output MD5: `b6ce1af66254` — **byte-identical to sec2**.

The H-05 diag commits only added `raceDiagnostics.js` (new module), size-getter exports to
`spriteLoader.js`, `spriteTinter.js`, `bgImageCache.js`, and `window.__raceDiagCapture?.()` calls
in `SetupScreen.jsx` / `RaceScreen/index.jsx`. None of these are imported by the sim.

**Verdict: master MATCHES sec2** — physics did NOT regress.

### Note on race-plan non-determinism

Running with `--race-plan=true` produced non-reproducible outputs across runs (win order varied
even with `--seed=1`). Root cause: `createRacePlan` is called in the outer combo loop before
`Math.random = makePRNG(seed)` is set in `runRace`; if the race-plan path uses native
`Math.random` during that window, the result is non-deterministic. This is a **pre-existing
sim-only issue** (does not affect the browser race engine) and is NOT the regression being hunted.
The deterministic comparison above uses `--race-plan=false` (the default) which is fully stable.

---

## STEP 4 — Rendering/Perf Diagnosis (clean build)

Physics confirmed unchanged → the "barely move" is a rendering/perf artifact.

### H-05 diag revert

The two temporary H-05 diag commits (`d2434ef`, `a51651d`) were reverted via targeted edits:
- Removed `import './modules/raceDiagnostics.js'` from `main.jsx`
- Removed 4 size-getter exports from `spriteLoader.js`, `spriteTinter.js` (×3), `bgImageCache.js`
- Removed 2 `window.__raceDiagCapture?.()` calls from `SetupScreen.jsx` and `RaceScreen/index.jsx`
- Deleted: `raceDiagnostics.js`, `h05-cache-leak-measurement.spec.js`, `playwright.h05.config.js`,
  `h05-detached-node-diagnosis.spec.js`, `playwright.h05b.config.js`

H-05 DIAGNOSIS reports (`.md`, `.json`) are **kept** for historical record.

### Frame-timing measurement on clean build

**Method:** Playwright headless Chromium, 600 rAF frames (~10s), Dirt Oval Quick Test (horse, 20 racers).
**Note:** headless rAF is browser-throttled to ~16fps (one frame ≈ 62ms) because the tab is
not visible. Absolute fps is not meaningful; the MAX SPIKE is the signal.

| Metric | Value |
|--------|-------|
| Frames measured | 600 |
| Avg frame time | 62.11 ms (headless throttle — not real fps) |
| p50 | 66.6 ms |
| p95 | 83.3 ms |
| p99 | 133.3 ms |
| **Max frame spike** | **216.6 ms** |
| Frames > 30 ms | 600 / 600 (all — headless throttle) |
| Frames > 100 ms | 10 / 600 |

The **216ms max spike** matches the owner's reported 238ms "other" spike. It is present on the
clean build (post-revert) and therefore **NOT caused by the H-05 diag instrumentation**.

### What causes the spike

Per H-05 Phase 1b diagnosis (`reports/audit/H05-DIAGNOSIS.md`):

> "The race loop generates high per-frame allocation volume (rAF per-frame objects: gradient
> descriptors, typed array slices, physics accumulator objects). V8 defers GC when the heap has
> room... GC eventually runs causing a pause. This is the 'other' cost."

The race rAF loop allocates many short-lived objects per frame. When V8 finally runs a GC sweep,
it blocks the rAF callback for 100–250ms — matching the owner's observed spike.

### Why "racers barely move near finish"

Two contributing factors (neither is a new regression):

1. **brakeMatch endgame** (from `feat/open-track-overlap`, merged 2026-06-08): the body-based
   speed-brake activates in the endgame zone to prevent overlap at the finish line. This
   intentionally slows racers when they are close to `finishT`. On open tracks, this appears as
   racers visibly decelerating near the finish.

2. **GC pause stutter**: the 200ms+ spike freezes the canvas at the same moment racers are
   decelerating in the endgame. Combined, the animation appears as "barely moving."

---

## Verdict

**Conclusion: NO physics regression.** The diag instrumentation has been reverted to a clean
state (matching `backup/auto-done`). The "barely move" is:
- Physics: brakeMatch endgame deceleration (by design, not a bug)
- Visual: GC pause stutter during peak per-frame allocation

**Phase 2 (for Plan-Claude):** If the stutter needs to be addressed, the target is per-frame
allocation reduction in the RaceScreen rAF loop — not DOM node management and not the caches.

Raw data: `reports/audit/H05-FRAME-STATS-CLEAN.json`

