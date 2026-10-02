# P4-RACESCREEN-SPLIT-1 — RaceScreen's 2,163-line component split along the seams it already had

**2026-10-02. A refactor, on branch `refactor/racescreen-split`, NOT merged.** Proposal P4 of
[DC2-ARC4-SOURCE.md](../audit/DC2-ARC4-SOURCE.md) §4.5 ("THE STRUCTURAL PROPOSALS", the docs/BACKLOG.md
row): `RaceScreen/index.jsx` mixed the rAF loop and physics stepping with camera seeding, effect
instantiation and the ceremony. **No behaviour change, no renamed config key, no new mechanism.**
Eleven extractions, one per commit, each moved verbatim. None was reverted.

## The one plain sentence

★ **`index.jsx` went from 2,163 lines to 1,643, and eleven modules beside it now each own one thing
the file used to do inline; every extraction kept the RaceScreen tests green and all four
fingerprint roles verified unchanged.** What the owner sees: nothing, if it is right — which is the
reason the browser gates below are still owed.

## What is still owed before this can merge

- **`npm run verify -- --premerge`** — not run here, by instruction; the coordinator runs it.
- **The Playwright browser gates** — not run here, by instruction. RaceScreen is a React component
  driven by a real rAF loop; the vitest suites mount it but do not race it in a browser, and **no
  fingerprint executes `index.jsx`** (it imports `virtual:ra-build` and is JSX — the world, camera
  and render fingerprints drive `raceCore.js`, `CameraDirector.js` and `renderRaceFrame.js`
  directly). So the fingerprint verifications below prove the ENGINE and the RENDERER untouched;
  they cannot prove the browser path. **The browser suite is the instrument that can**, and it has
  not been run on this branch.

## Lines before and after

| File | Before (master `a96c9762`) | After (`07467ddb`) |
| --- | ---: | ---: |
| `client/src/screens/RaceScreen/index.jsx` | 2,163 | 1,643 (incl. +19 header lines naming the split) |
| `raceWorldSetup.js` | — | 213 |
| `raceLoopDiagnostics.js` | — | 247 |
| `viewerFrameProbe.js` | — | 154 |
| `stateOverlaySelection.js` | — | 110 |
| `raceCamera.js` | — | 97 |
| `battleSlowmo.js` | — | 76 |
| `raceResults.js` | — | 74 |
| `trackScene.js` | — | 74 |
| `racerDisplayFields.js` | — | 65 |
| `renderInterpolation.js` | — | 48 |
| `burstParticles.js` | — | 44 |
| `raceActionWiring.test.js` | 82 | 101 |

The new modules total 1,202 lines against 520 removed from `index.jsx`: each carries a header that
says what it owns and why it is its own module, a JSDoc block, and the inline comments that sat beside
the code where it came from.

## The module map

Every new module is imported by **`index.jsx` only**; none imports another. All are in the engine
hull (`scripts/engine-reach.mjs`), because a driver's whole import closure is, and the generated list
in `docs/SIM.md` was regenerated (204 → 215 files).

| Module | Owns | Stayed in `index.jsx`, and why |
| --- | --- | --- |
| `raceWorldSetup.js` · `resolveRaceWorld()` | WHICH WORLD the race is built from: the racer type's physics fields (recorded or live, RACE-IDENTIFIER-2), the config world (recorded or this host's, RACE-IDENTIFIER-1), the action stage from the payload (RACE-ACTION-CONTROL-1), the badge and diff, and the `createRaceFromIdentity` parameters (RACE-PARAMS-2) | The engine call itself. `index.jsx` stays the DRIVER — `engine-reach` finds drivers by their `raceCore.js` import, and its test asserts `index.jsx` is one |
| `trackScene.js` · `cacheTrackLights()`, `createTrackEffects()` | The track lights and the track-effect instances ("effect instantiation", named by P4) | `effectsRef` and the cleanup that destroys the effects — the component owns their lifetime |
| `raceCamera.js` · `createRaceCamera()` | The CameraDirector, constructed and SEEDED in the original order: constructor, seed from the race seed, viewer probe, seed set, brand-card answer ("camera seeding", named by P4) | The brand-card DECISION (it reads the branding profile), the React resets, the live-truth console line |
| `racerDisplayFields.js` · `attachRacerDisplayFields()` | The render-only racer fields: roster display fields, icon, coat, pattern, start number, trail emitter | — |
| `battleSlowmo.js` · `advanceSlowmo()` | The BATTLE / PHOTO_FINISH slow-motion clock, the focus fade, `st.slowmoTs`; returns the factor | The accumulator line `st.physicsAccum += rawDt * effectiveSlowmoFactor`, so the physics clock reads in one place |
| `raceLoopDiagnostics.js` | The GovernorDiagHUD snapshot, the hold probe, the Race-Plan per-step readout, the top-3 Δv readout — read-only HUD bookkeeping, three of the four inside the physics accumulator | The CONDITIONS each runs under, at the call sites |
| `raceResults.js` · `splitFinishOrder()`, `buildRaceResults()` | The finish order and the `raceResults` payload — the contract with ResultScreen | The `sessionStorage` write and the test-race gate in front of it |
| `burstParticles.js` · `advanceBurstParticles()` | The finish-line burst particle step, which was TWO inline copies | — |
| `renderInterpolation.js` · `interpolateRacers()` | The interpolated racer snapshot between physics steps | Whether to use it (`renderInterpolation` key, RACING phase) |
| `stateOverlaySelection.js` · `overlayVarsFor()`, `pickOverlayText()` | Which narrative line the state overlay shows, with the per-race no-repeat memory | The `useEffect`: the banner state, its timer, the gates |
| `viewerFrameProbe.js` · `viewerFramePayload()` | The 110-line per-frame payload for `recordViewerFrame` | The `recordViewerFrame` call, beside the marker frame |

**What `index.jsx` still owns:** the React component — state, refs, effects; the race-init effect
that wires one race together; the rAF loop (phase advancement, the ceremony's DOM beats, the
fixed-timestep accumulator and its catch-up cap, `stepRacePhysics`, the scoreboard tick, the finish
hand-over timers, the camera update, the draw call); the camera marker builder and the live-truth
line (both read `RA_BUILD`, whose ONLY import must stay here — `buildIdentitySource.test.js`
asserts the three consumers by their text in this file); cancel, fullscreen, the click handlers
(`ceremonySkip.test.jsx` and `stayOnTheFinish.test.jsx` read those from this file's source), and the
DOM.

## Every extraction, with its verification

Each row: RaceScreen vitest (`npx vitest run src/screens/RaceScreen --maxWorkers=4`) and
`node scripts/check-fingerprints.mjs --mint` run on the working tree **before** the commit. The guard
verifies all four roles (world, world-off, camera, render) against `docs/fingerprints.json` and writes
nothing — `grep -c writeFileSync scripts/check-fingerprints.mjs` printed `0`. Every run printed
`4 role(s) re-minted against the engine`, exit 0, no `FAIL`; `docs/fingerprints.json` was never
modified. Baseline on unchanged master: the same line, exit 0, and RaceScreen 35 files / 428 tests.

| # | Commit | Extraction | `index.jsx` lines | RaceScreen tests | Fingerprints |
| --- | --- | --- | ---: | --- | --- |
| 1 | `c4488b29` | `viewerFrameProbe.js` — the viewer-probe frame payload | 2,069 | 35 / 428 green | 4 roles, no FAIL |
| 2 | `d0fe02bd` | `raceResults.js` — finish order and result payload | 2,044 | 35 / 428 green | 4 roles, no FAIL |
| 3 | `47b8a9f3` | `raceLoopDiagnostics.js` — HUD diagnostics and the hold probe | 1,906 | 35 / 428 green | 4 roles, no FAIL |
| 4 | `835ea1de` | `burstParticles.js` — one step instead of two copies | 1,880 | 35 / 428 green | 4 roles, no FAIL |
| 5 | `e4259f14` | `battleSlowmo.js` — the slow-motion clock | 1,843 | 35 / 428 green | 4 roles, no FAIL |
| 6 | `8b6e0531` | `renderInterpolation.js` — the interpolation buffer fill | 1,833 | 35 / 428 green | 4 roles, no FAIL |
| 7 | `71e0ee8d` | `stateOverlaySelection.js` — the overlay line selection | 1,785 | 35 / 428 green | 4 roles, no FAIL |
| 8 | `fcd4e61f` | `raceWorldSetup.js` — the race-world resolution | 1,681 | 35 / 429 green (+1 new); `buildIdentitySource` 5/5 | 4 roles, no FAIL |
| 9 | `1d946fd7` | `racerDisplayFields.js` — the render-only racer fields | 1,667 | 35 / 429 green | 4 roles, no FAIL |
| 10 | `cdc69d16` | `raceCamera.js` — the camera, built and seeded | 1,651 | 35 / 429 green; `CameraDirector.test.js` green (817 across the 36 files) | 4 roles, no FAIL |
| 11 | `ac95159f` | `trackScene.js` — track lights and effects | 1,624 | 35 / 429 green | 4 roles, no FAIL |

Four further commits carry no code motion:

- `11130a4f` — **guard routing follows the split.** `check-ending-frame` and `check-runin-frame`
  named `index.jsx` by FILE in their `GUARD.files`, so a change to code in it selected them. That
  code now lives in the eleven modules, so they are named in both lists — a change to any of them
  selects these guards exactly as the same change did before. Declaration only. Same commit:
  `docs/SIM.md`'s generated engine-reach block regenerated (`gen-engine-reach-doc --check` had
  gone red: 204 → 215 files).
- `21d8be89` — `index.jsx`'s header now says what the file owns and names the eleven modules.
- `967586f4` — **found by running the script suite.** `docs/SHIP-CEREMONY.md` carries a generated
  block of engine-reach counts; the hull grew by the eleven modules (204 → 215), so
  `gen-ceremony-costs.test.mjs` went red. Regenerated by its own script (`--counts`); 7/7.
- `07467ddb` — **found by running the script suite, not by the per-extraction check.** The assertion
  added to `raceActionWiring.test.js` in extraction 8 spelled `createRaceFromIdentity(raceCoreParams)`
  as text, and `scripts/engine-reach.test.mjs` treats a literal call of the engine constructor in any
  tracked file as a race construction that must import an entry point. Now a regex; same assertion.

### No extraction was reverted

Every move passed both checks first time. The two places the per-step check could not see were
caught by the end-of-run checks and repaired in their own commits (`11130a4f`, `07467ddb`,
`967586f4`).

## Two decisions inside "verbatim", stated so nobody rediscovers them

- **The burst particles' two copies were NOT identical.** The RACING copy shrinks each particle's
  radius (`p.r *= 0.97`); the FINISHED copy does not. One function now, and that difference is its
  `shrink` argument — `true` while racing, `false` once finished — **kept, not unified**, because
  unifying it would change what the ending draws. Nothing records whether the difference was
  intended. It is named in `burstParticles.js`'s header and at the FINISHED call site.
- **Tests that read `index.jsx`'s SOURCE constrained what could move.** `buildIdentitySource.test.js`
  (`RA_BUILD`'s three consumers), `ceremonySkip.test.jsx` (the click handlers and the wrapper),
  `stayOnTheFinish.test.jsx` (the hand-over timer), `render-layout-separation.test.mjs` (the
  `renderRaceFrame` call) and `CameraDirector.test.js` (`detectBattleGroup` on the render path) all
  hold text in that file. **Their anchors were left where they are** — the camera marker builder, the
  live-truth line, the hand-over and the handlers stayed. **Exactly one source-reading test was
  re-pointed:** `raceActionWiring.test.js`, because extraction 8 moved the very seam it holds. It now
  reads `index.jsx` AND `raceWorldSetup.js` — the precedent is `CameraDirector.test.js`, which did the
  same when FRAME-INPUTS-1 split its render path — and gained one test that `index.jsx` resolves the
  world through `resolveRaceWorld` and hands its `raceCoreParams` to the engine. **Sabotage:**
  replacing the stage-applied dynamics with the raw loader in `raceWorldSetup.js` reddens it
  (1 failed / 4 passed), and changing the engine call in `index.jsx` reddens the new test.

## Documents touched by the moves

- `docs/FORCE-MAP.md`, `docs/branding.md` — the **paired symbol citations** into `index.jsx`
  (`check-fallback-agreement` RULE F) were re-pointed in every commit that shifted their lines. Two
  moved to `raceWorldSetup.js` (`baseSpeedConfig`, `rowLayoutConfig`). One was repaired rather than
  shifted: `branding.md` cited "RaceScreen loads `raceData` from `sessionStorage.activeRace`" paired
  with the symbol `lcData` — lead-change overlay code that passed the guard by sitting in range — and
  it now points at the `activeRace` read it describes. RULE F: 69 citations, 0 disagree, at the end.
- `docs/SIM.md` — the generated engine-reach list, regenerated by its own script.
- `docs/SHIP-CEREMONY.md` — only its generated engine-reach counts block, regenerated by its own
  script.

## Test counts at the end

- **Full client suite** (`npx vitest run --maxWorkers=6`, at `21d8be89`): **281 files, 4,951 tests,
  all passed**, retry disabled, 4 m 12 s. The one later commit (`07467ddb`) changes only
  `raceActionWiring.test.js`, re-run alone: 5/5.
- **RaceScreen subset:** 35 files, 429 tests (428 on master + 1 added).
- **Script suite** (`node --test` over every tracked `scripts/**/*.test.mjs`, as `verify` discovers
  them): first run at `07467ddb` — 650 tests, 648 passed, **1 failed** (the SHIP-CEREMONY counts,
  repaired in `967586f4`), 1 skipped. Re-run at `967586f4` with this report and the BACKLOG / INDEX
  edits in the tree: **650 tests, 649 passed, 0 failed, 1 skipped.**
- **Final `check-fingerprints --mint`** at `21d8be89`: 4 roles re-minted against the engine, exit 0,
  no FAIL; `docs/fingerprints.json` unmodified.

## Noticed and left

- **Line-only citations into `index.jsx` are now further from true.** `docs/FORCE-MAP.md` and
  `docs/branding.md` carry `index.jsx:NNNN`-style links with no symbol (RULE F cannot see them, by its
  own declaration), and many were already stale on master — e.g. `index.jsx:1096`, `:927`, `:961`.
  Code comments in `index.jsx` itself cite its own old line numbers (`(:423)`, `(:1108)`,
  `(:1760-1773)`, `(:378)`). None was rewritten: re-deriving each claim is a citation audit, not this
  piece.
- **Two harnesses still TRANSCRIBE what is now a module.** `scripts/render-layout-separation.test.mjs`
  and `scripts/render-fingerprint.mjs` attach race numbers and render state "for the same reason the
  component does"; `attachRacerDisplayFields` is now importable and could be the one home. Both are
  in or near the fingerprint path, so that is a measured change for another piece, not a tidy-up here.
- **The burst-particle shrink difference** (above) is a question for the owner's eye, not a defect
  established by anything.
- **The state-overlay comment in `index.jsx`** that says COMEBACK uses last-index anti-repeat is
  wrong — COMEBACK_ZOOM and LEAD_CHANGE use the no-repeat Set, as the code shows and as
  `stateOverlaySelection.js` now states. The old comment was left where it stands, beside the refs.
- **What else could still move**, not done to keep the risk bounded: the scoreboard tick (it sets
  React state), the ceremony's DOM beats (React setters), and the camera marker builder (held in this
  file by `buildIdentitySource.test.js`'s `RA_BUILD` text anchors).

## The closing checks, as printed

```
check-index: 7 directories — 776 reports, 0 unindexed, 776 links, 0 dangling.
check-doc-links: 892 relative links across 63 living-doc files; 0 dangling.
check-language-closed: 1220 in-scope file(s) scanned, 27 with German, 27 frozen allowance(s), 0 failure(s).
ENGINE REACH: 13 of 22 path(s) can change the race:
  client/src/screens/RaceScreen/battleSlowmo.js
  client/src/screens/RaceScreen/burstParticles.js
  client/src/screens/RaceScreen/index.jsx
  client/src/screens/RaceScreen/raceCamera.js
  client/src/screens/RaceScreen/raceLoopDiagnostics.js
  client/src/screens/RaceScreen/raceResults.js
  client/src/screens/RaceScreen/raceWorldSetup.js
  client/src/screens/RaceScreen/racerDisplayFields.js
  client/src/screens/RaceScreen/renderInterpolation.js
  client/src/screens/RaceScreen/stateOverlaySelection.js
  client/src/screens/RaceScreen/trackScene.js
  client/src/screens/RaceScreen/viewerFrameProbe.js
  scripts/check-ending-frame.mjs
```

The engine-reach answer is the expected one and is not a finding: `index.jsx` is a DRIVER, so it and
everything it imports are in the hull, and every new module is new content there. The mint tripwire
will name these paths; **this piece mints nothing** — every role was verified unchanged after every
extraction, and a fingerprint is never minted on this branch's authority.
