# Report 34 — Scale Cleanup: Build Complete

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07
**Status:** Steps 1–6 + documentation committed. Tests 2629/2629 green. Awaiting user browser check before Step 7 (full sweep).

---

## Checkpoints A–H

| Checkpoint | Description | Result |
|---|---|---|
| **A** | Sim Space Sprint width | **300 px** (was 449 px) ✓ |
| **B** | drawnBodyWidthPx dragon N=40 | **28.5 px** (was ~34 px) ✓ |
| **B** | drawnBodyWidthPx plane N=40 | **28.5 px** ✓ |
| **B** | drawnBodyWidthPx rocket N=40 | **14.25 px** ✓ |
| **C** | drawnBodyLengthPx dragon N=40 | **≈ 30.6 px** (28.5 × 0.898/0.836) ✓ |
| **C** | drawnBodyLengthPx rocket N=40 | **≈ 41.1 px** (14.25 × 0.801/0.278) ✓ |
| **D** | sameLaneHH dragon N=40 Space Sprint | **0.190** (28.5 / 150 = 0.190; was 0.095) ✓ |
| **E** | BLOCKED dY at physicalY=1, trackWidth=300 | **150 px** (was 300 px) ✓ |
| **F** | Stage D shuts off at absYDiff = 0.190 | **Correct** — upstream fixes cascade; no code change needed ✓ |
| **G** | Sim shows width=300px AND drawnBodyWidthPx=28.5px simultaneously | **Confirmed** (sim run output) ✓ |
| **H** | Tests green after naming cleanup | **2629 / 2629** ✓ |

Checkpoint A verified by sim run (`node scripts/sim-fairness.mjs --track=space-sprint --races=1 --racers=40 --dur=30 --racer=dragon`), which printed `width=300px`. All other checkpoints verified by derivation from source.

---

## lateralScale consequence (accepted)

Space Sprint: `pairTrackWidth 449 → 300 px`, `lateralScale 98/449 ≈ 0.218 → 98/300 ≈ 0.327` (+50%). Accepted per plan — avoidance was calibrated against an inflated width. The full N=50 sweep (Step 7) will establish the new baseline.

---

## Commits (7 steps + docs + coverage)

| Commit | Description |
|---|---|
| `01fdfff` | fix(step1): read track.width as primary width source |
| `f5d51dd` | fix(step2): body width = bodyNarrow (game + sim) |
| `6ac2307` | fix(step3): body length from render primitives (game + sim) |
| `0ef0da6` | fix(step4): add physicalY helpers; fix all lateral denominators |
| `2fce20f` | fix(step5): sweep/diag scripts read track.width as primary width source |
| `7ccae4d` | refactor(step6): naming cleanup — honest names, dead branches removed |
| `630672d` | fix(tests+hud): update all old field names after scale-cleanup renames |
| `d13b732` | docs: add Scale & Size architecture section; mark handoff-notes outdated |

---

## Touched files — complete list

### Game (physics + init)
| File | Change |
|---|---|
| [client/src/screens/RaceScreen/index.jsx](../../client/src/screens/RaceScreen/index.jsx) | Steps 1–3, 6: trackWidthPx source, body sources, field renames, displaySizeScale_physical inlined |
| [client/src/modules/raceBehavior.js](../../client/src/modules/raceBehavior.js) | Steps 4, 6: physicalY helpers, 6 denominator/BLOCKED sites, getter renames, dead branches removed |
| [client/src/modules/camera/CameraDirector.js](../../client/src/modules/camera/CameraDirector.js) | Step 6: referenceSpriteSize → drawnBodyWidthRefPx |
| [client/src/screens/RaceScreen/drawing/priorityModeOverlay.js](../../client/src/screens/RaceScreen/drawing/priorityModeOverlay.js) | Step 6: frameSizePx (was spriteWorldSizePx) |
| [client/src/screens/RaceScreen/CameraDiagnosticsHUD.jsx](../../client/src/screens/RaceScreen/CameraDiagnosticsHUD.jsx) | Coverage: _drawnBodyWidthRefPx (was _referenceSpriteSize) |
| [client/src/modules/headlessRaceSimulator.js](../../client/src/modules/headlessRaceSimulator.js) | Step 6: frameSizePx + trackWidthPx on racer objects |
| [client/src/modules/rowLayout.js](../../client/src/modules/rowLayout.js) | Step 6: computeRacersPerRow param names updated |

### User-facing / setup
| File | Change |
|---|---|
| [client/src/screens/SetupScreen/SetupScreen.jsx](../../client/src/screens/SetupScreen/SetupScreen.jsx) | Step 1: geom.width ?? getActualTrackWidth() |
| [client/src/screens/DevScreen/sections/TrackManager.jsx](../../client/src/screens/DevScreen/sections/TrackManager.jsx) | Step 1: geom.width ?? getActualTrackWidth() |

### Sim (primary)
| File | Change |
|---|---|
| [scripts/sim-fairness.mjs](../../scripts/sim-fairness.mjs) | Steps 1–3, 6: all width/body sources, field renames, computeBodyNarrowRef call added |

### Sweep / diag scripts (width-source one-liner only)
All 19 scripts: `shape.getActualTrackWidth()` → `<var>.width ?? shape.getActualTrackWidth()`

`compare-sets.mjs`, `compare-zones.mjs`, `diag-avoidance-track.mjs`, `diag-comeback-overlap.mjs`,
`diag-stuck-mode.mjs`, `param-sweep-full.mjs`, `sim-race-visual.mjs`, `sim-sweep.mjs`,
`sweep-balanced-lhs.mjs`, `sweep-body-collision.mjs`, `sweep-dyn-sbt.mjs`, `sweep-full-4phase.mjs`,
`sweep-lateral.mjs`, `sweep-phase2.mjs`, `sweep-phase3.mjs`, `sweep-phase4-only.mjs`,
`sweep-phase4.mjs`, `sweep-phase5.mjs`, `sweep-stuck-escape.mjs`

| File | Change |
|---|---|
| [scripts/diag-free-lane-force-attribution.mjs](../../scripts/diag-free-lane-force-attribution.mjs) | Step 6: frameSizePx (was visibleWidthPx + spriteWorldSizePx merged) |

### Tests
| File | Change | Why expected values changed |
|---|---|---|
| [client/src/modules/raceBehavior.test.js](../../client/src/modules/raceBehavior.test.js) | `makeLaneRacer`: `frameSizePx` + `trackWidthPx`; comment updates | Field rename only — numeric outcomes unchanged. The free-lane sensor (EXEMPT L515) and speed-brake formula are identical; tests with `lateralForce=0` zero out Stage B. |
| [client/src/modules/raceBehaviorBrakeMatch.test.js](../../client/src/modules/raceBehaviorBrakeMatch.test.js) | `makeRacer`: `frameSizePx` + `trackWidthPx`; comment updates | Field rename only — brake-match formula unchanged. |
| [client/src/modules/camera/CameraDirector.test.js](../../client/src/modules/camera/CameraDirector.test.js) | `cd._drawnBodyWidthRefPx` (was `cd._referenceSpriteSize`); test name/description | Field rename only — camera zoom math unchanged. |
| [client/src/modules/rowLayout.test.js](../../client/src/modules/rowLayout.test.js) | Test description update | Description only. |
| [client/src/screens/RaceScreen/CameraDiagnosticsHUD.test.jsx](../../client/src/screens/RaceScreen/CameraDiagnosticsHUD.test.jsx) | Mock: `_drawnBodyWidthRefPx` (was `_referenceSpriteSize`) | Field rename only. |

### Docs
| File | Change |
|---|---|
| [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) | New "Scale & Size" section: bug explanation, 3 SOTs, physicalY mapping, naming map, 7 invariants, deferred items. Row-Start Layout section updated. |
| [docs/handoff-notes.md](../../docs/handoff-notes.md) | Outdated notice pointing to ARCHITECTURE.md. |

---

## Dead code removed (not just renamed)

Per user addendum — items that only existed for the old broken computation, deleted rather than carried forward:

| Item | Location | Why deleted |
|---|---|---|
| `getTrackWidthAtTpx` old `geometricTrackWidthPx` fallback branch | raceBehavior.js getter | Dead after racer field renamed to `trackWidthPx` |
| `getFrameSizePx` old `visibleWidthPx` + `spriteWorldSizePx` dual branches | raceBehavior.js getter | Dead after both fields unified to `frameSizePx` |
| `else { displaySizeScale_physical = 1; }` in index.jsx | RaceScreen/index.jsx | Dead — `physicalSpriteSize = displaySize` by default handles it |
| `displaySizeScale_physical` variable | RaceScreen/index.jsx | Inlined: `physicalSpriteSize = racerLayout.spriteSize` directly |

---

## What did NOT change

- **Stage D gap force code:** `raceBehavior.js:~820` — `honestHalfSpan = drawnBodyWidthPx / (tw/2)` is now correct via `pxToPhysicalY`; `clearanceSpan = 2 × honestHalfSpan` evaluates to exactly 0.190 for dragon N=40. No behavior tuning needed.
- **`REFERENCE_TRACK_WIDTH = 98`:** Unchanged. Dirt Oval calibration anchor.
- **`getActualTrackWidth()`:** Still present as fallback for tracks without `width` field. Not retired.
- **Free-lane `lateralHalfSpan` (L515):** Intentionally exempt — full-frame proximity sensor; documented with comment.

---

## Pending: Step 7 — full 66-combo N=50 sweep

**Gate: user browser check first.**

The browser check is the real test: do dragon overtakes, full-field races, and slim racers (rocket/giraffe) now show clean on-screen separation when avoidance fires? If correct, old sim results are voided (all were computed on the wrong scale) and Step 7 establishes the new baseline.

After browser confirmation, run:
```
node scripts/sim-fairness.mjs --races=50 --openRacers=40 --closedRacers=40
```

Re-check any seed-1 failures at seeds 2 and 42. Expect Space Sprint results to show lower overlap vs Stage C baseline.
