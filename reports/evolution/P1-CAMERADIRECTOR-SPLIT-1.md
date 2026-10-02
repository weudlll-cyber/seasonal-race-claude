# P1-CAMERADIRECTOR-SPLIT-1 — CameraDirector.js split along its own seams, picture unchanged

**2026-10-02, branch `refactor/camera-director-split` off `ship/owner-cosmetic-defaults` @ `61b6b57a`.
A refactor: no behaviour change, no config key renamed, no new mechanism. NOT merged.** It is the P1
item of the structural proposals ([DC2-ARC4-SOURCE.md](../audit/DC2-ARC4-SOURCE.md) §4.5, the
"THE STRUCTURAL PROPOSALS" row in [BACKLOG.md](../../docs/BACKLOG.md)).

**Owed before any merge, and not run here:** `npm run verify -- --premerge` and the Playwright browser
gate. Green suites are not pre-merge clearance.

## The acceptance test, and the tip's values

This branch's camera differs from `docs/fingerprints.json` on purpose (unminted owner changes on
`ship/owner-cosmetic-defaults`), so `node scripts/check-fingerprints.mjs --mint` — which only VERIFIES
(`grep -c writeFileSync scripts/check-fingerprints.mjs` = 0) — prints two FAIL lines for camera and
render on the untouched tip. The test was therefore: **after every extraction the ENGINE values it
prints equal the tip's**. Measured on `61b6b57a` before any change:

| role | engine value at the tip | record |
| --- | --- | --- |
| world | `81798e1875975cc2` (no FAIL — equals the record) | same |
| camera | `f79cdf8c03418c5f` | differs on purpose |
| render | `87eb0a87809a3f59` | differs on purpose |

They equal the values the brief gave. (One caveat, stated rather than hidden: the first edit of
extraction 1 was written to the working tree while that baseline run was still in progress and was
stashed within a few minutes; the run's values are the brief's values to the digit, and the edit is
the delegation shown below, which every later run confirms is fingerprint-neutral.)

`docs/fingerprints.json` was never written.

## The extractions — one per commit

Every row: camera suite (`npx vitest run src/modules/camera --maxWorkers=4`) **36 files, 1026 tests,
all green**, and the fingerprint command printing **world: no FAIL; camera engine `f79cdf8c03418c5f`;
render engine `87eb0a87809a3f59`** — the tip's values, unchanged.

| # | commit | what moved | where to |
| --- | --- | --- | --- |
| 1 | `8ea1a600` | `_acceptsOffer`, `_weightedRandomPick` bodies + the CAMERA-WEIGHTS-1 doc block | `offerArbitration.js` (`acceptsOffer`, `weightedRandomPick`) |
| 2 | `ba9123ea` | `_isOverviewEligible`, `_scheduleNextOverview` bodies | `offerArbitration.js` (`overviewEligible`, `nextOverviewAt`) |
| 3 | `8af8912a` | the `CAM_STATE` enum (re-exported by the director) | `camState.js` |
| 4 | `bcf9817b` | the candidate pool and the take-or-decline of the offer | `offerArbitration.js` (`offerPool`, `arbitrateOffers`) |
| 5 | `e6bc32a8` | the start ceremony's camera, 6 methods | `CameraDirectorCeremony.js` (mixin) |
| 6 | `67f29816` | the run-in / endgame schedule, 9 methods | `CameraDirectorRunIn.js` (mixin) |
| 7 | `57d8902d` | contention watch, level set, abreast contenders, 8 methods | `CameraDirectorLevelSet.js` (mixin) |
| 8 | `5a013d05` | the guarantee ceilings, 9 methods | `CameraDirectorCeilings.js` (mixin) |

Three further commits change no product code: `a6377024` and `edf24b36` (two source-reading guards
follow the code — below) and `f1b82810` (the director's header). Each was checked the same way, same
values.

**Reverted extractions: none.** No value moved and no test failed at any step.

### How the arbitration seam was cut (1–4)

The proposal named the seam: the comeback precedence returns **above** the arbitration rather than
joining it. After extraction 4, `_pickNextState`'s last branch reads in that order — eligibility of
each shot (unchanged tests, unchanged order), then the precedence return, then `offerPool(...)` and
`arbitrateOffers(...)`. The pure functions take the director's randomness as a parameter
(`() => this._random()`), and `arbitrateOffers` is handed the director's own `_weightedRandomPick` /
`_acceptsOffer`, so the seeded stream is drawn in the same order and the methods tests call and
override (`_isOverviewEligible`, `_weightedRandomPick`, `_acceptsOffer`, `_scheduleNextOverview`) are
all still there, now as thin delegators.

One evaluation-order fact checked rather than assumed: OVERVIEW eligibility is still evaluated after
the precedence test, as before; it is a pure read, so even a reordering could not have moved anything.

### How the stateful blocks were cut (5–8)

By the precedent already in the file: `CameraDirectorDiag.js` has always been installed with
`Object.defineProperties(CameraDirector.prototype, Object.getOwnPropertyDescriptors(diagMixin))`.
The four new mixins are installed the same way, at the bottom of `CameraDirector.js`, and **none
imports from it** (state names come from `camState.js`). The methods were moved verbatim — bodies,
default arguments, comments, and the orphaned doc blocks that stood beside them — with **one
exception**: in `CameraDirectorLevelSet.js` the three call sites of the statics read
`this.constructor.contactLengthBetween` / `this.constructor.withinOneLength` instead of
`CameraDirector.*`. The statics themselves stay on the class (scripts call them, and
`levelSet.test.js` spies on `CameraDirector.contactLengthBetween`); on every director
`this.constructor` is `CameraDirector`, the spy-based sabotage test still bites, and no test or script
calls these methods with a detached receiver (checked by grep).

Checked once by script: the 58 mixin keys are unique across the five mixins, and none shadows a
method or getter still declared in the class body (`defineProperties` would replace one silently).

## Two guards that would have gone blind — fixed, with sabotage

Two tests read `CameraDirector.js`'s **source** and make negative assertions on it. After a split, a
negative assertion on one file passes vacuously for code that moved — the guard looks like coverage
and is not.

- `projection.test.js` — "CameraDirector never does arithmetic with the raw axis scales" (and its
  `OPEN_TRACK_BASE_ZOOM` twin). Now reads `CameraDirector.js` plus the five split modules plus
  `CameraDirectorDiag.js`. **Sabotage:** `1 * this._bsX` planted in `CameraDirectorRunIn.js` → red;
  restored → 15/15.
- `runInArrival.test.js` — the run-in arrival latch "never assigns the condition". Same file list,
  `CameraDirector.js` first so the positive matches still find the production line. **Sabotage:**
  `this._runInArrived = this._runInAfterDeadline;` planted in `CameraDirectorRunIn.js` → red; restored
  → 11/11.

`scripts/check-frame-camera-inputs.mjs` scans all of `client/src` and exempts only
`CameraDirector.js`; it passes with the new files (566 scanned, no literals) and needs no change.

## Lines, before and after

| file | at `61b6b57a` | after |
| --- | ---: | ---: |
| `client/src/modules/camera/CameraDirector.js` | 5,526 | 3,648 |
| `client/src/modules/camera/offerArbitration.js` | — | 239 |
| `client/src/modules/camera/camState.js` | — | 25 |
| `client/src/modules/camera/CameraDirectorCeremony.js` | — | 251 |
| `client/src/modules/camera/CameraDirectorRunIn.js` | — | 713 |
| `client/src/modules/camera/CameraDirectorLevelSet.js` | — | 545 |
| `client/src/modules/camera/CameraDirectorCeilings.js` | — | 515 |
| `client/src/modules/camera/projection.test.js` | 186 | 199 |
| `client/src/modules/camera/runInArrival.test.js` | 162 | 175 |
| `client/src/modules/camera/cameraTimingComputation.js` (comment) | 488 | 489 |
| `client/src/modules/camera/transitionDecision.js` (comment) | 143 | 143 |

The new modules sum to 2,288 lines against 1,878 removed; the difference is the new headers and the
placeholder comments that say in the class where each block went.

## The module map

| module | owns | imported by |
| --- | --- | --- |
| `CameraDirector.js` | the state machine (`update`, `_pickNextState`, `_transition`, holds, the finish sequence's lifecycle), the camera's motion (`_setTargets` composition, `_resolvePanTarget`, lerps, glide/cut/follow), framing subjects and the lateral guarantee, public getters, the unit statics | RaceScreen, harnesses, tests (unchanged) |
| `offerArbitration.js` | pure: `acceptsOffer`, `weightedRandomPick`, `offerPool`, `arbitrateOffers`, `overviewEligible`, `nextOverviewAt` | `CameraDirector.js` |
| `camState.js` | `CAM_STATE` (re-exported by `CameraDirector.js`) | `CameraDirector.js`, `offerArbitration.js`, `CameraDirectorCeilings.js` |
| `CameraDirectorCeremony.js` | `ceremonyMixin` — `_venueCamZoom`, `_ceremonyTargetCamZoom`, `ceremonySchedule`, `setCeremonyBrandActive`, `_formationCentre`, `updateCountdown` | `CameraDirector.js` (installed on the prototype) |
| `CameraDirectorRunIn.js` | `runInMixin` — `_updateRunIn`, `_scheduleEngaged`, `_scheduleFittedProgress`, `_scheduleWiden`, `_scheduleClose`, `_scheduleComposing`, `_runInSweepU`, `_beginRunInGlide`, `_runInProgressOf` | `CameraDirector.js` (installed) |
| `CameraDirectorLevelSet.js` | `levelSetMixin` — `_updateContentionWatch`, `_contentionWeight`, `_contentionEased`, `_levelContenders`, `_levelCeiling`, `_levelEaseTo`, `_abreastSurvivors`, `_abreastContenders` | `CameraDirector.js` (installed) |
| `CameraDirectorCeilings.js` | `ceilingsMixin` — `_guaranteeCeiling`, `_corridorCapWeight`, `_corridorWidthCap`, `_finishLineWorldPoint`, `_anchorScreen`, `_forwardFracNow`, `_lineCeiling`, `_companyCeiling`, `_fieldCeiling` | `CameraDirector.js` (installed) |
| `CameraDirectorDiag.js` | (unchanged) the Dev Screen diagnostics, read-only | `CameraDirector.js` (installed) |

**The public surface is unchanged.** `CameraDirector`, `CAM_STATE`, `OPEN_TRACK_BASE_ZOOM`,
`tcToLerpFactor` and every method or getter a test, a script or another module calls still resolve on
`CameraDirector` / its prototype; `import { CAM_STATE } from './CameraDirector.js'` resolves to the
same object.

### What was deliberately NOT split

`update()`, `_transition()` and `_setTargets()` stay together in `CameraDirector.js`. Their
correctness is an ORDERING (docs/CAMERA_DIRECTOR.md; RUNIN-ORDER-FIX-1), and CAMERA-HYGIENE-2 already
rejected a file boundary through `_transition` for that reason (transitionDecision.js's header). A
split there would hide the ordering this file exists to make readable.

## Test counts

- Camera suite after every step: **36 files, 1026 tests** — the same counts as at the tip (no test was
  added or removed; two were widened).
- Full client suite once at the end (`npx vitest run --maxWorkers=6`): **282 files, 4962 tests, all
  passed.**

## MEASURED stamps (SHIP-CEREMONY TRAP B)

The pre-commit `check-measured-stamps --staged` asks about `tracking-lag` (docs/CAMERA_DIRECTOR.md,
depends on `client/src/modules/camera/`) and `straggler-truth` (docs/ENDING-PHASES.md, depends on
`CameraDirector.js`) on every camera commit. Each commit re-stamped both deliberately, provisionally at
its parent, with the reason in its message; the closing docs commit stamps both at `f1b82810`, the last
commit that changed their dependencies. **The numbers cannot have moved:** every change is a move of
code, a comment, or a test reading more files, and all four fingerprints — camera and render included —
are the tip's engine values with every change in the tree.

## Noticed and left

- **57 `CameraDirector.js:<line>` citations** across docs, archive docs and script comments were
  already drifting before this branch; the split moves many of them further. Not chased — a line
  citation is history where it was written. Two that a reader of THIS seam will meet:
  `scripts/diag/comeback-beats.mjs:112` (`_weightedRandomPick` at `CameraDirector.js:742`) and
  DC2-ARC4-SOURCE.md §4.5's own `:742`, `:736`, `:1816-1821`.
- `cameraTimingComputation.js` keeps its own hand list of the six state names. It could now import
  `CAM_STATE` from `camState.js` without a cycle; left as it is (its key-equality test still binds the
  two), and its comment says so.
- The mixin install is five one-line `Object.defineProperties` calls. A loop with a collision assert
  would be a small new mechanism; not added — the collision check was run once instead, above.
- Still owed: `npm run verify -- --premerge` and the browser gate, then the owner's decision to merge.
