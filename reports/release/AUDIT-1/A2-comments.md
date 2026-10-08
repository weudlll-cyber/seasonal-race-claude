# AUDIT-1 — A2 Comments and headers (and part of A1 Source)

Tree: C:/tmp/a1 at origin/master e164bb68; deploy/* from C:/tmp/a1v (feat/vps-install). This was read-only: nothing in either tree was changed.
In scope: 1032 files (client/src, client/e2e, client/scripts, client root *.js, server/src, server/utils, server/scripts, shared, scripts, deploy).
The scanners and their raw output are in `findings/_a2-work/`: scan.mjs, classify.mjs, missing.mjs, refs.mjs and lineref.mjs, plus *.txt and headers.json.

**Coverage (task 3):** the 40 largest files were hand-read in five read-only sub-reviews.
- Groups A–D are in. They cover sim-fairness.mjs, defaults.js, five camera files, six race-engine modules and nine screen/Dev Screen files: 25 of the 40 files. Their results are in "Addendum — task 3" below as A2-32 onward.
- Group E is **not** in. It covers 15 script and server files: exp-runaway-leader, viewer-invariants, check-fallback-agreement, verify, comeback-beats, render-fingerprint, goldenRunner, check-runin-frame, observers/report, raceDriver, raceStore, check-measured-stamps, endgame-spec, camera-replay, engine-reach. Its review had not returned at hand-back, so those files are covered only by the mechanical checks.

## Findings

| id | category | severity | file:line | evidence (quoted) | proposed verdict | proposed fix |
|---|---|---|---|---|---|---|
| A2-01 | header | low | shared/nameLimits.mjs:2 | `// File:        nameLimits.js` (the file is `.mjs`; `Path:` on line 3 is correct) | SAFE-CLEANUP | `File: nameLimits.mjs` |
| A2-02 | header | low | 9 production files (list below) | e.g. server/utils/atomicWriteJson.js:1 starts with `import …`, so the file has no header at all | SAFE-CLEANUP | Add the standard header. Affected: client/src/modules/{exportRaceConfig,raceConfigWorld,raceLengths,raceStep}.js (informal "name.js — …" first line); server/utils/atomicWriteJson.js (no header); server/utils/isSafeAssetFilename.js; server/scripts/dev-start.js; server/scripts/restart-dev.js (`// server/scripts/restart-dev.js`); client/scripts/sweep-bufferPct-driver.mjs |
| A2-03 | header | info | client/src/modules/raceCore.js:2, client/src/racer-types/serverRacerTypes.js:2 | `// File:        client/src/modules/raceCore.js` with no `Path:` line | SAFE-CLEANUP | Split into File: + Path: |
| A2-04 | header | info (convention) | scripts/** (211 of 223 non-test files) | 124 files use `// File: scripts/x.mjs` (the full path, which is correct) with no `Path:`; 87 have no File:/Path: header, of which 76 are scripts/diag/* | LEAVE, or decide the convention once | Note that scripts/gen-engine-reach-doc.mjs:23/158 already parses two header styles ("Style 2 — the summary sits on the filename line"). A mass rewrite is churn with no reader benefit. If the owner wants one form, extend the header rule to scripts/ |
| A2-05 | header | low | test files: 16 client tests have File: but no Path:; 101 test files have no header; 10 e2e files use the full-path-in-File: variant | see "Header list" | SAFE-CLEANUP (low priority) | Only fix these as part of the test files' own work |
| A2-06 | header | info | deploy/racearena:4 | `# Path:        deploy/racearena   (installed to /usr/local/bin/racearena by deploy/install.sh)` | LEAVE | A trailing note on Path:. It is accurate, and parsers would need to tolerate it |
| A2-07 | stale-identifier | medium | client/src/modules/camera/CameraDirector.js:948 | `` `_runInAfterDeadline` … is set in `_scheduleTargetZoom` `` — no such method exists. It is set in `_updateRunIn` at CameraDirectorRunIn.js:225: `this._runInAfterDeadline = p >= deadline \|\| this._runInWidenDone;` | SAFE-CLEANUP | Name `_updateRunIn` (CameraDirectorRunIn.js) |
| A2-08 | stale-identifier | medium | client/src/modules/camera/CameraDirector.js:2312 | `` See `_runInAnchorPoint`. `` — the identifier exists nowhere in the repository except this comment | SAFE-CLEANUP | Point at the real run-in anchor code, or drop the "See" |
| A2-09 | stale-identifier + contradiction | medium | client/src/modules/racePlanner.js:649-654 | `` All zero for every other variant, because every increment sits behind `heldFree`. `_eArrivalMults` holds one entry per staged comebacker `` versus the next lines: `` Read-only measurement, filled for EVERY variant `` and `const _arrivalObs = new Map();`. `_eArrivalMults` no longer exists | SAFE-CLEANUP | Rewrite the block around `_arrivalObs` |
| A2-10 | stale-identifier | low | client/src/modules/raceBehavior.js:42 | `` `_tIndexOrder` holds slots into `_tIndexRacer`/`_tIndexTf` `` — the array is `_tIndexSlots` (line 46) | SAFE-CLEANUP | `_tIndexOrder` → `_tIndexSlots` |
| A2-11 | stale-identifier / contradiction | medium | client/src/modules/camera/cameraTimingComputation.js:34-35 | `` That is one better than `POST_START_HOLD_MS` beside it, which is duplicated and unguarded. `` — no `POST_START_HOLD_MS` exists. The key was retired (START-ONE-WINDOW-1, line 156), and startWindow.test.js:266-267 asserts `postStartHoldMs` is undefined | SAFE-CLEANUP | Drop the sentence, or say it was retired |
| A2-12 | stale-identifier | low | client/src/modules/viewerProbe.js:91; scripts/endgame-sheet.mjs:50 | `` ENDGAME-REPAIR-1's `wild-frame.mjs` already `` — scripts/diag/wild-frame.mjs no longer exists (it is only mentioned in reports/evolution/*) | SAFE-CLEANUP | Say "the retired scripts/diag/wild-frame.mjs (ENDGAME-REPAIR-1 report)" |
| A2-13 | stale-identifier | low | server/src/seedDelivery.js:11 | `A shipped record is delivered WHOLE. Laps, default racer, winners, max racers, everything.` — "winners" (the setting) was removed 2026-10-06 | SAFE-CLEANUP | Drop "winners" from the example list |
| A2-14 | stale-identifier (code, A1) | medium | server/src/routes/tracks.js:515 | `defaultWinners: 3,` is still seeded into every track created via POST /api/tracks. It is also in all 10 server/seeds/tracks/*.json (e.g. dirt-oval.json:8). No production code reads it | NEEDS-OWNER | Removing it changes stored track records and the shipped seed records, which ties into seed versions and redelivery. Behaviour is invisible, but the data shape changes. Pair it with the test fixtures in A2-15 |
| A2-15 | stale-identifier (tests) | low | client/src/test/fixtures/sampleTracks.js:13…157; trackLoader.test.js:273,344 (`'defaultWinners'` in PASSTHROUGH_FIELDS); TrackManager.test.jsx:116-170; devScreenChapters.guard.test.jsx:107; client/src/test/raceScreenMount.js:79 `winners: 3`; e2e camera-polish-ux-verification.spec.js:110,462,499,673 and d9-smoke.spec.js:395 `winners: 3`; ResultScreen*.test.jsx, cancelRace/testRace.test.jsx `winners: 3` in race payloads | Fixtures still carry the removed count. raceSeed.test.jsx:291 asserts the payload has no `winners` | SAFE-CLEANUP (tests only) | Drop the dead field from fixtures. Keep the deliberate "old stored value" tests (raceSeed.test.jsx:282, raceHistory.test.js:77, racesVerify.test.js:220) |
| A2-16 | contradiction (line ref) | low | 11 drifted `file:line` references (table below) | e.g. server/src/index.js:62 `` `reportStartupReadiness` … defaults to `console.warn` (startupReadiness.js:95) `` — it is at startupReadiness.js:121 | SAFE-CLEANUP | Replace line numbers with symbol names (the arrow form check-fallback-agreement already prefers) |
| A2-17 | contradiction (line ref) | low | client/src/screens/RaceScreen/cancelRace.test.jsx:24 | `` `index.jsx:1760-1773` already owns it `` — index.jsx has 1661 lines | SAFE-CLEANUP | Cite the symbol |
| A2-18 | contradiction (line ref) | low | scripts/diag/late-lead-axis.mjs:95 | `` `_runInProgressOf` (CameraDirector.js:4188) `` — CameraDirector.js has 3734 lines, and the method is defined at CameraDirectorRunIn.js:702 | SAFE-CLEANUP | Cite CameraDirectorRunIn.js `_runInProgressOf` |
| A2-19 | contradiction (line ref) | low | server/scripts/restart-dev.js:3 | `Env defaults live solely in dev-start.js (L129 — no duplication).` — dev-start.js has 41 lines, and LESSONS "Lesson 129" is about physics | SAFE-CLEANUP | Drop "(L129" |
| A2-20 | contradiction (line ref) | low | server/src/index.js:65 | `Playwright waits on a URL — client/playwright.config.js:64` — line 64 is `retries: 0`. The webServer `url:` entries are at :112 and :127 | SAFE-CLEANUP | Cite `webServer[].url` |
| A2-21 | console-log | info | client/src/screens/RaceScreen/index.jsx:579 and :1201 | `console.info(`[RA CAMERA LIVE TRUTH] commit=…` (every race start) and `…first anchored entry…` (once per race). Both have eslint-disable-next-line, and the comment says "This line stays forever." | LEAVE — category (a) deliberate, but it is **unguarded**: it runs for every user of a production install, not only on dev builds | If the owner wants a quieter production console, gate it behind the test-aids/diagnostic switch (a behaviour change, so NEEDS-OWNER) |
| A2-22 | console-log | info | client/src/modules/camera/detourRecorder.js:191 | `console.info(`[RA CAMERA DETOUR] …` — the recorder only exists `if (t.detourEnabled)` (CameraDirector.js:628) | LEAVE — category (c) behind a diagnostic flag | — |
| A2-23 | console-log | info | client/src/screens/RaceScreen/CameraMarkerHUD.jsx:60 | `console.info(`[RA CAMERA MARK] …` — fires only when the user presses M (the camera marker tool) and carries eslint-disable | LEAVE — category (c) user-triggered diagnostic | — |
| A2-24 | console-log | info | server/src/index.js:52, :70 | `[ra-sweep]` boot housekeeping and the `RaceArena server running on port …` banner. Both carry eslint-disable with a reason ("STDOUT BY DECISION (the owner, 2026-09-06)") | LEAVE — category (a) operator log | — |
| A2-25 | naming | low | scripts/parity/replay.mjs:113-114 | `const winnerMs = real.results.find(…)?.finishTime;` — `finishTime` is in SECONDS (raceCore.js:806 `finishTime: r.finishTimeMs / 1000`), and the result is correctly labelled `winnerMarginSec` | SAFE-CLEANUP | Rename to `winnerSec`/`secondSec` |
| A2-26 | naming | low | scripts/diag/micro-divergence.mjs:262 | `timeMs: r.finishTime` — seconds (sim-fairness.mjs:1852 `r.finishTime = r.finishTimeMs / 1000`), and printed as seconds at :339 `winner margin ${marginA.toFixed(2)}s` | SAFE-CLEANUP | Rename to `timeSec` |
| A2-27 | naming (language rule) | low | client/src/screens/DiagnoseVerteilung/DiagnoseVerteilung.jsx (+ App.jsx:17,143; App.test.jsx:22; testAidsRoute.test.jsx:17; headlessRaceSimulator.js:13; check-fallback-agreement.mjs:168) | A German file, folder and component name ("distribution diagnosis"). CLAUDE.md: "No German … including file names". check-language-closed misses it because it is a single word with no umlaut (its declared blind spot) | SAFE-CLEANUP, but confirm the route URL is not derived from the name before renaming | Rename to e.g. `DistributionDiagnostics` |
| A2-28 | naming (language rule) | low | client/src/modules/camera/CameraDirector.test.js:2460,2488,2839,3016,4060 (`Etappe 6: Observer Phase (Lead-In / Mitlaufen / Lead-Out)`); client/src/modules/rowLayout.test.js:111 (`'Weltall-Strecke: …'`); CameraDiagnosticsHUD.test.jsx:170 (`Etappe 27`) | German words in test titles and comments that the guard cannot see | SAFE-CLEANUP | Use "Stage N", "follow", "space track". "Etappe NN" is also a project-history label (memory: Etappe 18/19), so keep the number |
| A2-29 | naming (language rule, known) | medium | client/src/screens/DevScreen/sections/TrackManager.jsx:156 | `'Eine Default-Strecke kann nicht gelöscht werden. Entferne zuerst den Default-Status.'` — a German USER-FACING alert. The same applies to BrandingProfiles.jsx and PlayerGroupsManager.jsx, and server/src/auth/session.js has German comment markers | Already known: frozen as "PRE-EXISTING" in scripts/check-language-closed.mjs:159-171 ("the entries that should shrink over time"). The fix changes visible text, so it is the owner's call to schedule, not a mechanical cleanup | Translate, update the paired tests (TrackManager.test.jsx:616,628 etc.), and lower the allowlist counts |
| A2-30 | todo | — | (none) | No TODO / FIXME / XXX / HACK marker in any of the 1032 in-scope files (case-sensitive word match) | — | — |
| A2-31 | commented-code | — | (none) | No block of 2+ commented-out code lines in production source. Every candidate was documentation (see "False positives rejected") | — | — |

### A2-16 detail — drifted line references (symbol named in the comment is not within ±12 lines of the cited line)

| comment at | cites | symbol | symbol actually at |
|---|---|---|---|
| client/e2e/appReady.js:45 | SetupScreen.jsx:263 (and :265, :720, :899) | `canStartBase` | SetupScreen.jsx:280 |
| client/src/screens/TrackEditor/raceView.js:57 | zoomUnit.js:160 | `visibleCorridors` | zoomUnit.js:130 |
| scripts/camera-fingerprint.mjs:283 | RaceScreen/index.jsx:1492 | `rpPhase` | index.jsx:1144 (use) |
| scripts/lib/raceDriver.mjs:586 | RaceScreen/index.jsx:1492 | `rpPhase` | index.jsx:1144 |
| scripts/diag/comeback-beats.mjs:32 | RaceScreen/index.jsx:1008-1014 | `getCameraPlan` | index.jsx:903 |
| scripts/diag/comeback-beats.mjs:369 | CameraDirector.js:1624 | `_pickNextState` | CameraDirector.js:294-400 region |
| scripts/diag/comeback-hold-measure.mjs:16 | CameraDirector.js:1059 | `_lastTransitionReason` | CameraDirector.js:1089 |
| scripts/diag/endgame-spec.mjs:101 | CameraDirector.js:2990 | `endgameThreshold` | CameraDirector.js:613/858/1048 |
| scripts/diag/late-lead-axis.mjs:95 | CameraDirector.js:4188 | `_runInProgressOf` | CameraDirectorRunIn.js:702 (also A2-18) |
| server/src/index.js:62 | startupReadiness.js:95 | `reportStartupReadiness` | startupReadiness.js:121 |
| server/src/staticClient.js:82 | startupReadiness.js:95 | `reportStartupReadiness` | startupReadiness.js:121 |

Only 44 references could be checked this way: they are the ones whose comment also names a symbol present in the target file. Drift among them is 11 of 44 (25%). A citation without a named symbol cannot be checked mechanically, and the same drift rate is likely there.

## Removed identifiers asked for by name

- `listRacesInPeriod`, `loadReplay`: **no occurrence** anywhere in scope. They are clean.
- `Podium Spots`: only in raceSeed.test.jsx:287 (a negative assertion) and shared/podium.mjs:7 (history). Both are correct.
- `defaultWinners`: production code at server/src/routes/tracks.js:515 (A2-14), in seeds, and in test fixtures (A2-15).
- `winners` as a *setting*: defaults.js:27 (history, correct) and seedDelivery.js:11 (A2-13). Every other `winners` is the stored race's winner LIST (raceStore, raceHistory, RaceHistory.jsx), which is live and correct.

## False positives rejected

- **Commented-code candidates that are documentation**: scripts/lib/dataReach.mjs:139-141 (quotes sim-fairness's code as an example), scripts/sim/observers/pulk-contest.mjs:108-110 (usage example), scripts/lib/routing.mjs:74-80 (example GUARD declaration), scripts/sim/observers/runaway-parade.mjs:188-197 (record-shape doc), scripts/diag/sprite-premise.mjs:10 (formula quote), client/src/modules/raceStep.test.js:11-17 (the retired inline formula, quoted on purpose), CameraDirectorCeilings.js:8-12, defaults.js:770-771, SetupScreen.jsx:699-700, check-seed-versions.mjs:27-28, scripts/diag/corridor-default-sum.mjs:9-10, leader-lateral-ba.mjs:7-8 (prose lists).
- **Historical mentions, correct as history**: `_levelRiseFrom` (CameraDirectorLevelSet.js:372 "It anchored … ONCE"), `MIN_ROWS` (startBoardRendering.js:176 "renamed from"), `visibleTagRacers` (nameTagLayout.js:14 "WHAT REPLACED WHAT"), `boardHoldMs` (startCeremony.js:200 "is GONE"), `getRoster` (raceStore.js:615 "There is no getRoster twin"), `_UPPER_CASE` (CameraDirector.js:129), `crop-sprite-sheets.mjs` (check-fallback-agreement.mjs:639/1038, check-seed-versions.mjs:273: the deletion incident), `panStaleZoom.test.js` (check-tags.mjs:84, panOrdering.test.js:4), `routing.test.mjs` (routing.mjs:44-45 "THERE IS NO"), `uploadBoundsAgreement.audit.test.js` / `nameTagLayout.degrade.test.js` ("supersedes" / "replaces"), `client/src/modules/raceShortKey.js` (shared/raceShortKey.mjs:10, canonicalJson.mjs:17 "used to live").
- **Not identifiers**: commit hashes (`be7e6872`, `f16ab4de`, `d94a7b9d`, `d73ec6a9`, `c299fdf7`), the stored race id `QN3HDP`, `.seed-versions.json` (a runtime file written into an install's data dir, so absent from the repo by design), `/runtime-config.js` and `/assets/index-OLD.js` (URLs), `name.js` / `file.js` / `thing.js` / `fix.mjs` (placeholders in docs and fixtures), glob patterns `*.test.mjs`.
- **Prefix matches**: viewerProbe.js:605 `errTarget` / `errPan` — the fields are `errTargetX/Y`, `errPanX/Y` (608-615). The comment names the pair, which is fine.
- **Line-ref heuristic misses**: comeback-hold-measure.mjs:57 cites `racePlanner.js:1287 heldFree`, which is exactly right (the matched symbol was a neighbour). goldenRunner.mjs:329 `raceCore.js:290-302` is within a few lines of the keys and was not counted.
- **PULK vs pack**: `pulk*` keys and `pack*` names look like two names for one concept, but docs/GLOSSARY.md:30/50/320 defines PULK as the race PHASE (a declared loanword) and "pack" as the field. LEAVE.
- **Pre-existing German allowlisted by check-language-closed**: covered once in A2-29, not repeated.

## Totals

- Header scan: 1032 files.
  - Production (non-test) files: 552.
    - Formal header: 378 (client/src 297, server/src 44, server/utils 7, shared 5, scripts 12, client root 6, deploy 2 + 1 with a note; shared counted as 5 + 1 wrong).
    - Full-path-in-File: variant: 126 (scripts 124, client/src 2).
    - Wrong value: 1 (shared/nameLimits.mjs).
    - Missing: 96 (client/src 4, client/scripts 1, server/utils 2, server/scripts 2, scripts 87).
  - Test files: 480.
    - Formal: 280.
    - Variant: 42.
    - File: without Path: 16.
    - Missing: 101 (client/src 69, e2e 6, server/src 2, scripts 24).
- Findings: 31 rows.
  - stale-identifier / contradiction: 15 rows (A2-07…A2-20), of which 5 are medium.
  - console-log: 4 rows (6 call sites, none is unflagged debug output).
  - naming: 5 rows.
  - header: 6 rows.
  - todo: 0.
  - commented-code: 0.
- Verdicts: NEEDS-OWNER 1 (A2-14). Owner-scheduled known debt 1 (A2-29). Optional owner decision on the production console 1 (A2-21). Everything else is SAFE-CLEANUP or LEAVE.

## Header list (full)

Legend: P = production, T = test. "variant" = the header exists and is correct, but File: carries the full path and there is no Path: line.


### Wrong or incomplete File:/Path: values

```
T client/src/modules/buildIdentityReason.test.js :: no Path: line
T client/src/modules/buildIdentitySource.test.js :: no Path: line
T client/src/modules/buildIdentityWorktree.test.js :: no Path: line
T client/src/modules/buildInfo.test.js :: no Path: line
T client/src/modules/buildPillPoll.test.js :: no Path: line
T client/src/modules/camera/cameraSeed.test.js :: no Path: line
T client/src/modules/camera/finishPhase.test.js :: no Path: line
T client/src/modules/camera/transitionDecision.test.js :: no Path: line
T client/src/modules/cameraConfigDiff.test.js :: no Path: line
T client/src/modules/cameraConfigSurvival.test.js :: no Path: line
T client/src/modules/configDiffStores.test.js :: no Path: line
T client/src/modules/configPerKeyReject.test.js :: no Path: line
T client/src/modules/heroCurveGenerator.test.js :: no Path: line
T client/src/modules/parity/recordingContext.test.js :: no Path: line
T client/src/screens/DevScreen/sections/CameraAdvancedSection.test.jsx :: no Path: line
T client/src/screens/RaceScreen/hudLayout.test.js :: no Path: line
P shared/nameLimits.mjs :: File: "nameLimits.js" != nameLimits.mjs
T client/src/modules/arrivalShape.test.js :: File: carries full path, no Path:
P client/src/modules/raceCore.js :: File: carries full path, no Path:
P client/src/racer-types/serverRacerTypes.js :: File: carries full path, no Path:
T client/e2e/appReady.js :: File: carries full path
T client/e2e/auth.setup.js :: File: carries full path
T client/e2e/e2e-env.js :: File: carries full path
T client/e2e/race-history-never-vanishes.spec.js :: File: carries full path, no Path:
T client/e2e/race-history-real-route.spec.js :: File: carries full path, no Path:
T client/e2e/race-history.spec.js :: File: carries full path
T client/e2e/race-identifier.spec.js :: File: carries full path
T client/e2e/race-save.spec.js :: File: carries full path
T client/e2e/seed-field-typing.spec.js :: File: carries full path, no Path:
T client/e2e/teams-session.spec.js :: File: carries full path
T server/src/races/trustBoundary.audit.test.js :: File: carries full path, no Path:
P scripts/analyze-camera-log.mjs :: Path: has trailing note
P scripts/audit-bundle-address.mjs :: File: carries full path, no Path:
P scripts/audit-gate.mjs :: File: carries full path, no Path:
P scripts/audit-local.mjs :: File: carries full path, no Path:
P scripts/audit-offline-render.mjs :: File: carries full path, no Path:
P scripts/camera-fingerprint.mjs :: File: carries full path, no Path:
P scripts/camera-replay.mjs :: File: carries full path, no Path:
T scripts/camera-seed-determinism.test.mjs :: File: carries full path, no Path:
P scripts/check-client-build.mjs :: File: carries full path, no Path:
P scripts/check-config-claims.mjs :: File: carries full path, no Path:
T scripts/check-config-claims.test.mjs :: File: carries full path, no Path:
P scripts/check-config-keys.mjs :: File: carries full path, no Path:
T scripts/check-config-keys.test.mjs :: File: carries full path, no Path:
P scripts/check-conflict-markers.mjs :: File: carries full path, no Path:
T scripts/check-conflict-markers.test.mjs :: File: carries full path, no Path:
P scripts/check-container-paths.mjs :: File: carries full path, no Path:
T scripts/check-container-paths.test.mjs :: File: carries full path, no Path:
P scripts/check-doc-facts.mjs :: File: carries full path, no Path:
T scripts/check-doc-facts.test.mjs :: File: carries full path, no Path:
P scripts/check-doc-links.mjs :: File: carries full path, no Path:
P scripts/check-ending-frame.mjs :: File: carries full path, no Path:
P scripts/check-fallback-agreement.mjs :: File: carries full path, no Path:
P scripts/check-fingerprint-payload.mjs :: File: carries full path, no Path:
T scripts/check-fingerprint-payload.test.mjs :: File: carries full path, no Path:
P scripts/check-fingerprints.mjs :: File: carries full path, no Path:
T scripts/check-fingerprints.test.mjs :: File: carries full path, no Path:
P scripts/check-frame-camera-inputs.mjs :: File: carries full path, no Path:
T scripts/check-frame-camera-inputs.test.mjs :: File: carries full path, no Path:
P scripts/check-golden-races.mjs :: File: carries full path, no Path:
T scripts/check-golden-races.test.mjs :: File: carries full path, no Path:
P scripts/check-hooks-installed.mjs :: File: carries full path, no Path:
T scripts/check-hooks-installed.test.mjs :: File: carries full path, no Path:
P scripts/check-image-starts.mjs :: File: carries full path, no Path:
P scripts/check-index.mjs :: File: carries full path, no Path:
P scripts/check-language-closed.mjs :: File: carries full path, no Path:
T scripts/check-language-closed.test.mjs :: File: carries full path, no Path:
P scripts/check-measured-stamps.mjs :: File: carries full path, no Path:
T scripts/check-measured-stamps.test.mjs :: File: carries full path, no Path:
P scripts/check-runin-frame.mjs :: File: carries full path, no Path:
P scripts/check-seed-versions.mjs :: File: carries full path, no Path:
T scripts/check-seed-versions.test.mjs :: File: carries full path, no Path:
P scripts/check-standings-invariant.mjs :: File: carries full path, no Path:
P scripts/check-tags.mjs :: File: carries full path, no Path:
P scripts/check-tooltip-values.mjs :: File: carries full path, no Path:
T scripts/check-tooltip-values.test.mjs :: File: carries full path, no Path:
P scripts/check-writable.mjs :: File: carries full path, no Path:
T scripts/check-writable.test.mjs :: File: carries full path, no Path:
P scripts/ci-docs-only.mjs :: File: carries full path, no Path:
T scripts/ci-docs-only.test.mjs :: File: carries full path, no Path:
P scripts/company-bind-truth.mjs :: File: carries full path, no Path:
P scripts/company-spread-sweep.mjs :: File: carries full path, no Path:
P scripts/configure.mjs :: File: carries full path, no Path:
P scripts/contender-truth.mjs :: File: carries full path, no Path:
P scripts/corridor-truth.mjs :: File: carries full path, no Path:
P scripts/corridor-width-truth.mjs :: File: carries full path, no Path:
P scripts/data-export.mjs :: File: carries full path, no Path:
P scripts/diag/camera-curve.mjs :: File: carries full path, no Path:
P scripts/diag/comeback-band.mjs :: File: carries full path, no Path:
P scripts/diag/comeback-beats.mjs :: File: carries full path, no Path:
P scripts/diag/comeback-hold-measure.mjs :: File: carries full path, no Path:
P scripts/diag/endgame-spec.mjs :: File: carries full path, no Path:
P scripts/diag/judder-census.mjs :: File: carries full path, no Path:
P scripts/diag/line-ceiling-terms.mjs :: File: carries full path, no Path:
P scripts/diag/micro-divergence.mjs :: File: carries full path, no Path:
P scripts/diag/motion-continuity-census.mjs :: File: carries full path, no Path:
P scripts/diag/replay-stored-race.mjs :: File: carries full path
P scripts/diag/runin-forward-reach.mjs :: File: carries full path, no Path:
P scripts/diag/runin-line-schedule.mjs :: File: carries full path, no Path:
P scripts/diag/runin-pin-drift.mjs :: File: carries full path, no Path:
P scripts/diag/start-formation.mjs :: File: carries full path, no Path:
P scripts/diag/start-frame-capture.mjs :: File: carries full path, no Path:
P scripts/diag/width-authority.mjs :: File: carries full path, no Path:
P scripts/edge-crossing.mjs :: File: carries full path, no Path:
P scripts/edge-slice-truth.mjs :: File: carries full path, no Path:
P scripts/endgame-sheet.mjs :: File: carries full path, no Path:
P scripts/endgame-width-truth.mjs :: File: carries full path, no Path:
P scripts/engine-reach.mjs :: File: carries full path, no Path:
P scripts/exp-anchor-truth-ab.mjs :: File: carries full path, no Path:
P scripts/exp-gs-confirm-gate.mjs :: File: carries full path, no Path:
P scripts/exp-gs-honest-150.mjs :: File: carries full path, no Path:
P scripts/exp-rebaseline-150.mjs :: File: carries full path, no Path:
T scripts/fingerprint-default.test.mjs :: File: carries full path, no Path:
P scripts/finish-band-truth.mjs :: File: carries full path, no Path:
P scripts/finish-motion-truth.mjs :: File: carries full path, no Path:
P scripts/finish-pair-truth.mjs :: File: carries full path, no Path:
P scripts/floor-reach-truth.mjs :: File: carries full path, no Path:
P scripts/gen-ceremony-costs.mjs :: File: carries full path, no Path:
T scripts/gen-ceremony-costs.test.mjs :: File: carries full path, no Path:
P scripts/gen-engine-reach-doc.mjs :: File: carries full path, no Path:
T scripts/gen-engine-reach-doc.test.mjs :: File: carries full path, no Path:
P scripts/golden/goldenRace.mjs :: File: carries full path, no Path:
P scripts/gun-window-truth.mjs :: File: carries full path, no Path:
P scripts/his-shot-truth.mjs :: File: carries full path, no Path:
P scripts/label-bench-matrix.mjs :: File: carries full path, no Path:
P scripts/label-bench.mjs :: File: carries full path, no Path:
P scripts/label-degrade-truth.mjs :: File: carries full path, no Path:
P scripts/label-names-truth.mjs :: File: carries full path, no Path:
P scripts/label-occlusion-truth.mjs :: File: carries full path, no Path:
P scripts/lib/cameraPlanDelivery.mjs :: File: carries full path, no Path:
P scripts/lib/ceremonySamples.mjs :: File: carries full path, no Path:
P scripts/lib/cheapMode.mjs :: File: carries full path, no Path:
P scripts/lib/ciUnconditional.mjs :: File: carries full path, no Path:
P scripts/lib/dataReach.mjs :: File: carries full path, no Path:
P scripts/lib/fingerprintCheck.mjs :: File: carries full path, no Path:
T scripts/lib/fingerprintCheck.test.mjs :: File: carries full path, no Path:
P scripts/lib/frameBox.mjs :: File: carries full path, no Path:
P scripts/lib/hisArm.mjs :: File: carries full path, no Path:
P scripts/lib/inertChange.mjs :: File: carries full path, no Path:
P scripts/lib/pngFrame.mjs :: File: carries full path, no Path:
P scripts/lib/raceDriver.mjs :: File: carries full path, no Path:
P scripts/lib/racerFacts.mjs :: File: carries full path, no Path:
P scripts/lib/routing.mjs :: File: carries full path, no Path:
P scripts/lib/runinAccepted.mjs :: File: carries full path, no Path:
T scripts/lib/runinAccepted.test.mjs :: File: carries full path, no Path:
P scripts/lib/storedRaceReplay.mjs :: File: carries full path
P scripts/lib/testFileExclude.mjs :: File: carries full path, no Path:
P scripts/lib/trackScope.mjs :: File: carries full path, no Path:
T scripts/lib/trackScope.test.mjs :: File: carries full path, no Path:
T scripts/lib/trackScopeWiring.test.mjs :: File: carries full path, no Path:
P scripts/lib/verifyMarker.mjs :: File: carries full path, no Path:
T scripts/lib/verifyMarker.test.mjs :: File: carries full path, no Path:
P scripts/lib/write-verified.mjs :: File: carries full path, no Path:
T scripts/lib/write-verified.test.mjs :: File: carries full path, no Path:
P scripts/line-visible-truth.mjs :: File: carries full path, no Path:
P scripts/migrate.mjs :: File: carries full path
P scripts/minimap-truth.mjs :: File: carries full path, no Path:
P scripts/outcome-phase-window.mjs :: File: carries full path, no Path:
P scripts/pair-reach-census.mjs :: File: carries full path, no Path:
T scripts/pair-reach-census.test.mjs :: File: carries full path, no Path:
P scripts/pan-lag-account.mjs :: File: carries full path, no Path:
P scripts/parity/goldenRunner.mjs :: File: carries full path, no Path:
P scripts/parity/replay.mjs :: File: carries full path, no Path:
P scripts/parity/soak.mjs :: File: carries full path, no Path:
P scripts/phys-bench-fit.mjs :: File: carries full path, no Path:
P scripts/phys-bench-matrix.mjs :: File: carries full path, no Path:
P scripts/phys-bench.mjs :: File: carries full path, no Path:
P scripts/prove-changed.mjs :: File: carries full path, no Path:
T scripts/prove-changed.test.mjs :: File: carries full path, no Path:
T scripts/raceDriver.test.mjs :: File: carries full path, no Path:
P scripts/record-golden-races.mjs :: File: carries full path, no Path:
P scripts/render-fingerprint.mjs :: File: carries full path, no Path:
P scripts/resolve-converge-truth.mjs :: File: carries full path, no Path:
P scripts/retry-ledger-reporter.mjs :: File: carries full path, no Path:
P scripts/scoreboard-bench.mjs :: File: carries full path, no Path:
P scripts/serve-production.mjs :: File: carries full path, no Path:
P scripts/setup-hooks.mjs :: File: carries full path, no Path:
T scripts/sim-fairness.characterisation.test.mjs :: File: carries full path, no Path:
P scripts/sprite-size-truth.mjs :: File: carries full path, no Path:
P scripts/straggler-truth.mjs :: File: carries full path, no Path:
P scripts/tracking-lag.mjs :: File: carries full path, no Path:
P scripts/verify.mjs :: File: carries full path, no Path:
P scripts/viewer-invariants.mjs :: File: carries full path, no Path:
T scripts/w-ref-one-home.test.mjs :: File: carries full path, no Path:
P scripts/zoom-pace-truth.mjs :: File: carries full path, no Path:
P scripts/zoom-rate-truth.mjs :: File: carries full path, no Path:
P deploy/racearena :: Path: has trailing note
```

### Missing header (no File:/Path: lines). Kind: informal = the first lines name the file; comment = a description with no file name; none = no leading comment

```
T	none	client/src/components/EffectConfig/EffectConfig.test.jsx
T	none	client/src/components/PresetThumbnail/PresetThumbnail.test.jsx
T	comment, no file name	client/src/modules/autoSpriteScale.test.js
T	none	client/src/modules/baseSpeedConfig.test.js
T	none	client/src/modules/branding/useActiveBrandProfile.test.js
T	comment, no file name	client/src/modules/camera/CameraDirector.test.js
T	informal (names file)	client/src/modules/camera/cameraMarker.test.js
T	none	client/src/modules/camera/cameraTimingComputation.test.js
T	informal (names file)	client/src/modules/camera/frameGeometry.test.js
T	informal (names file)	client/src/modules/camera/framingRule.test.js
T	informal (names file)	client/src/modules/camera/item7Membership.test.js
T	comment, no file name	client/src/modules/camera/leaderLateral.test.js
T	informal (names file)	client/src/modules/camera/levelSet.test.js
T	comment, no file name	client/src/modules/camera/Minimap.test.js
T	comment, no file name	client/src/modules/camera/openTrackCamera.test.js
T	informal (names file)	client/src/modules/camera/panOrdering.test.js
T	comment, no file name	client/src/modules/camera/panTarget.test.js
T	comment, no file name	client/src/modules/camera/resolveCamera.test.js
T	informal (names file)	client/src/modules/camera/zoomUnit.test.js
T	comment, no file name	client/src/modules/cameraConfig.test.js
T	comment, no file name	client/src/modules/diagnostics/analyzeFrameLog.test.js
T	comment, no file name	client/src/modules/diagnostics/trackCorridor.test.js
T	informal (names file)	client/src/modules/engineInputs.test.js
P	informal (names file)	client/src/modules/exportRaceConfig.js
T	none	client/src/modules/exportRaceConfig.test.js
T	informal (names file)	client/src/modules/parity/planConfigMirror.test.js
T	comment, no file name	client/src/modules/periodPoints.test.js
P	informal (names file)	client/src/modules/raceConfigWorld.js
T	comment, no file name	client/src/modules/raceConfigWorld.test.js
P	informal (names file)	client/src/modules/raceLengths.js
T	informal (names file)	client/src/modules/raceLengths.test.js
P	informal (names file)	client/src/modules/raceStep.js
T	comment, no file name	client/src/modules/raceStep.test.js
T	comment, no file name	client/src/modules/stateOverlayTemplates.test.js
T	informal (names file)	client/src/modules/storage/configValidate.test.js
T	none	client/src/modules/storage/storage.test.js
T	comment, no file name	client/src/modules/track-editor/catmullRom.diagnostic.test.js
T	comment, no file name	client/src/modules/track-editor/catmullRom.test.js
T	comment, no file name	client/src/modules/track-editor/EditorShape.test.js
T	none	client/src/modules/track-editor/trackStorage.test.js
T	comment, no file name	client/src/modules/track-effects/bgImageCache.test.js
T	comment, no file name	client/src/modules/track-effects/effects/bubbles.test.js
T	comment, no file name	client/src/modules/track-effects/effects/dust.test.js
T	comment, no file name	client/src/modules/track-effects/effects/fireflies.test.js
T	comment, no file name	client/src/modules/track-effects/effects/mud.test.js
T	comment, no file name	client/src/modules/track-effects/effects/rain.test.js
T	comment, no file name	client/src/modules/track-effects/effects/stars.test.js
T	comment, no file name	client/src/modules/track-effects/effects/wave.test.js
T	comment, no file name	client/src/modules/track-effects/index.test.js
T	none	client/src/racer-types/spriteLoader.test.js
T	comment, no file name	client/src/screens/DevScreen/sections/fileReadFailure.test.jsx
T	none	client/src/screens/DevScreen/sections/NameTagVisibilitySection.test.jsx
T	comment, no file name	client/src/screens/DevScreen/sections/PeriodEvaluation.test.jsx
T	none	client/src/screens/DevScreen/sections/SpriteSizeRangeSection.test.jsx
T	comment, no file name	client/src/screens/RaceScreen/ceremonySkip.test.jsx
T	informal (names file)	client/src/screens/RaceScreen/drawing/boardPortraitFit.test.js
T	comment, no file name	client/src/screens/RaceScreen/drawing/dotSprites.test.js
T	informal (names file)	client/src/screens/RaceScreen/nameTagLayout.test.js
T	comment, no file name	client/src/screens/RaceScreen/raceSession.test.js
T	comment, no file name	client/src/screens/RaceScreen/stayOnTheFinish.test.jsx
T	informal (names file)	client/src/screens/SetupScreen/chipContrast.test.js
T	informal (names file)	client/src/screens/SetupScreen/PlayerGroupPicker.test.jsx
T	informal (names file)	client/src/screens/SetupScreen/playerGroups.test.jsx
T	informal (names file)	client/src/screens/SetupScreen/quickTestCap.test.jsx
T	none	client/src/screens/TrackEditor/TrackEditor.effects.test.jsx
T	none	client/src/screens/TrackEditor/TrackEditor.shortcuts.test.jsx
T	comment, no file name	client/src/screens/TrackEditor/trackEditorHelpers.test.js
T	comment, no file name	client/src/screens/TrackEditor/trackEditorSave.test.js
T	none	client/src/screens/TrackEditor/useHistory.test.js
T	comment, no file name	client/src/test/fixtures/sampleTracks.js
T	comment, no file name	client/src/utils/formatRaceTime.test.js
T	comment, no file name	client/src/utils/mathUtils.test.js
T	comment, no file name	client/src/utils/slugify.test.js
T	informal (names file)	client/e2e/arrival-shape.spec.js
T	informal (names file)	client/e2e/comeback-cast-probe.spec.js
T	informal (names file)	client/e2e/comeback-precedence.spec.js
T	informal (names file)	client/e2e/garden-path-finishes.spec.js
T	informal (names file)	client/e2e/held-comebacker.spec.js
T	informal (names file)	client/e2e/quicktest-vs-harness.spec.js
P	comment, no file name	client/scripts/sweep-bufferPct-driver.mjs
T	informal (names file)	server/src/buildIdentity.test.js
T	informal (names file)	server/src/routes/crossTeamAccess.audit.test.js
P	none	server/utils/atomicWriteJson.js
P	comment, no file name	server/utils/isSafeAssetFilename.js
P	comment, no file name	server/scripts/dev-start.js
P	informal (names file)	server/scripts/restart-dev.js
T	informal (names file)	scripts/check-fallback-agreement.test.mjs
T	informal (names file)	scripts/check-index.test.mjs
T	informal (names file)	scripts/check-standings-invariant.test.mjs
T	informal (names file)	scripts/check-tags.test.mjs
T	informal (names file)	scripts/configure.test.mjs
P	comment, no file name	scripts/diag/acceptance-orders.mjs
P	comment, no file name	scripts/diag/aim-levers-sum.mjs
P	comment, no file name	scripts/diag/aim-levers.mjs
P	comment, no file name	scripts/diag/along-residual.mjs
P	comment, no file name	scripts/diag/anchor-room-gap.mjs
P	none	scripts/diag/binding-census.mjs
P	comment, no file name	scripts/diag/company-ceiling-who.mjs
P	comment, no file name	scripts/diag/company-lost-where.mjs
P	comment, no file name	scripts/diag/company-under-floor.mjs
P	comment, no file name	scripts/diag/corridor-default-sum.mjs
P	comment, no file name	scripts/diag/gp-defaults-table.mjs
P	comment, no file name	scripts/diag/gp-durations.mjs
P	comment, no file name	scripts/diag/gp-exit.mjs
P	comment, no file name	scripts/diag/gp-repro.mjs
P	comment, no file name	scripts/diag/headcount-price-sum.mjs
P	comment, no file name	scripts/diag/headcount-price.mjs
P	comment, no file name	scripts/diag/late-lead-axis-geom.mjs
P	comment, no file name	scripts/diag/late-lead-axis-room.mjs
P	comment, no file name	scripts/diag/late-lead-axis-sum.mjs
P	comment, no file name	scripts/diag/late-lead-axis.mjs
P	comment, no file name	scripts/diag/late-lead-hunt-run.mjs
P	comment, no file name	scripts/diag/late-lead-hunt-sum.mjs
P	comment, no file name	scripts/diag/late-lead-hunt.mjs
P	comment, no file name	scripts/diag/leader-lag-sum.mjs
P	comment, no file name	scripts/diag/leader-lag-tc.mjs
P	comment, no file name	scripts/diag/leader-lag-truth.mjs
P	comment, no file name	scripts/diag/leader-lateral-ba.mjs
P	comment, no file name	scripts/diag/leader-lateral-minimal.mjs
P	comment, no file name	scripts/diag/leader-lateral-sum.mjs
P	comment, no file name	scripts/diag/leader-setback-need.mjs
P	comment, no file name	scripts/diag/leader-setback-sum.mjs
P	comment, no file name	scripts/diag/level-set-built-run.mjs
P	comment, no file name	scripts/diag/level-set-built.mjs
P	comment, no file name	scripts/diag/level-step-when.mjs
P	comment, no file name	scripts/diag/margin-both-axes-sum.mjs
P	comment, no file name	scripts/diag/margin-both-axes.mjs
P	comment, no file name	scripts/diag/midrace-clip-by-state.mjs
P	comment, no file name	scripts/diag/midrace-clip-sum.mjs
P	comment, no file name	scripts/diag/midrace-leader-clip.mjs
P	none	scripts/diag/outcome-parity.mjs
P	comment, no file name	scripts/diag/riverrun-pan-anatomy.mjs
P	comment, no file name	scripts/diag/room-floor-estimate.mjs
P	comment, no file name	scripts/diag/routing-cost.mjs
P	comment, no file name	scripts/diag/routing-replay.mjs
P	comment, no file name	scripts/diag/runin-aim-axes.mjs
P	comment, no file name	scripts/diag/runin-aim-sum.mjs
P	comment, no file name	scripts/diag/runin-anatomy.mjs
P	comment, no file name	scripts/diag/runin-authors.mjs
P	comment, no file name	scripts/diag/runin-camera-motion.mjs
P	comment, no file name	scripts/diag/runin-contender-guarantee-anchor.mjs
P	comment, no file name	scripts/diag/runin-contender-guarantee-run.mjs
P	comment, no file name	scripts/diag/runin-contender-guarantee-sum.mjs
P	comment, no file name	scripts/diag/runin-contender-guarantee.mjs
P	comment, no file name	scripts/diag/runin-contenders-run.mjs
P	comment, no file name	scripts/diag/runin-contenders-sum.mjs
P	comment, no file name	scripts/diag/runin-contenders.mjs
P	comment, no file name	scripts/diag/runin-level-set-run.mjs
P	comment, no file name	scripts/diag/runin-level-set-sum.mjs
P	comment, no file name	scripts/diag/runin-level-set.mjs
P	comment, no file name	scripts/diag/runin-pan-swing.mjs
P	comment, no file name	scripts/diag/runin-track-sweep.mjs
P	comment, no file name	scripts/diag/sprite-premise.mjs
P	comment, no file name	scripts/diag/suite-timing.mjs
T	informal (names file)	scripts/endgame-sheet.test.mjs
T	informal (names file)	scripts/engine-reach.test.mjs
P	informal (names file)	scripts/exp-arrival-shape.mjs
P	informal (names file)	scripts/exp-band-scale.mjs
P	informal (names file)	scripts/exp-camera-bisect.mjs
P	informal (names file)	scripts/exp-fair-arrival.mjs
P	informal (names file)	scripts/exp-fairness-recheck.mjs
P	comment, no file name	scripts/exp-flapping-gate.mjs
P	informal (names file)	scripts/exp-gate-retune.mjs
P	informal (names file)	scripts/exp-roster-matrix.mjs
P	informal (names file)	scripts/exp-runaway-leader.mjs
P	informal (names file)	scripts/exp-speed-candidates.mjs
P	informal (names file)	scripts/fingerprint-default.mjs
T	informal (names file)	scripts/lib/ceremonySamples.test.mjs
T	informal (names file)	scripts/lib/inertChange.test.mjs
T	informal (names file)	scripts/lib/oneHome.test.mjs
T	informal (names file)	scripts/lib/raceDriverWorld.test.mjs
T	informal (names file)	scripts/render-fingerprint.test.mjs
T	informal (names file)	scripts/render-layout-separation.test.mjs
T	informal (names file)	scripts/retry-ledger-reporter.test.mjs
T	informal (names file)	scripts/scoreboard-parity.test.mjs
P	informal (names file)	scripts/sim/observers/cohesion.mjs
T	informal (names file)	scripts/sim/observers/cohesion.test.mjs
P	informal (names file)	scripts/sim/observers/comeback-reality.mjs
P	informal (names file)	scripts/sim/observers/escape-episodes.mjs
T	informal (names file)	scripts/sim/observers/escape-episodes.test.mjs
P	informal (names file)	scripts/sim/observers/fairness-stats.mjs
P	informal (names file)	scripts/sim/observers/front-liveliness.mjs
P	informal (names file)	scripts/sim/observers/gap-metrics.mjs
T	informal (names file)	scripts/sim/observers/gap-metrics.test.mjs
P	informal (names file)	scripts/sim/observers/hero-adherence.mjs
P	informal (names file)	scripts/sim/observers/outcome-front-battle.mjs
T	informal (names file)	scripts/sim/observers/outcome-front-battle.test.mjs
P	informal (names file)	scripts/sim/observers/physics-tax.mjs
T	informal (names file)	scripts/sim/observers/physics-tax.test.mjs
P	informal (names file)	scripts/sim/observers/pulk-contest.mjs
P	informal (names file)	scripts/sim/observers/release-contest.mjs
T	informal (names file)	scripts/sim/observers/release-contest.test.mjs
P	informal (names file)	scripts/sim/observers/report.mjs
P	informal (names file)	scripts/sim/observers/runaway-parade.mjs
T	informal (names file)	scripts/sim/observers/runaway-parade.test.mjs
T	informal (names file)	scripts/track-defaults.test.mjs
T	informal (names file)	scripts/verify.test.mjs
```

### Variant: File: carries the full (correct) path, no Path: line

```
T client/src/modules/arrivalShape.test.js
P client/src/modules/raceCore.js
P client/src/racer-types/serverRacerTypes.js
T client/e2e/appReady.js
T client/e2e/auth.setup.js
T client/e2e/e2e-env.js
T client/e2e/race-history-never-vanishes.spec.js
T client/e2e/race-history-real-route.spec.js
T client/e2e/race-history.spec.js
T client/e2e/race-identifier.spec.js
T client/e2e/race-save.spec.js
T client/e2e/seed-field-typing.spec.js
T client/e2e/teams-session.spec.js
T server/src/races/trustBoundary.audit.test.js
P scripts/audit-bundle-address.mjs
P scripts/audit-gate.mjs
P scripts/audit-local.mjs
P scripts/audit-offline-render.mjs
P scripts/camera-fingerprint.mjs
P scripts/camera-replay.mjs
T scripts/camera-seed-determinism.test.mjs
P scripts/check-client-build.mjs
P scripts/check-config-claims.mjs
T scripts/check-config-claims.test.mjs
P scripts/check-config-keys.mjs
T scripts/check-config-keys.test.mjs
P scripts/check-conflict-markers.mjs
T scripts/check-conflict-markers.test.mjs
P scripts/check-container-paths.mjs
T scripts/check-container-paths.test.mjs
P scripts/check-doc-facts.mjs
T scripts/check-doc-facts.test.mjs
P scripts/check-doc-links.mjs
P scripts/check-ending-frame.mjs
P scripts/check-fallback-agreement.mjs
P scripts/check-fingerprint-payload.mjs
T scripts/check-fingerprint-payload.test.mjs
P scripts/check-fingerprints.mjs
T scripts/check-fingerprints.test.mjs
P scripts/check-frame-camera-inputs.mjs
T scripts/check-frame-camera-inputs.test.mjs
P scripts/check-golden-races.mjs
T scripts/check-golden-races.test.mjs
P scripts/check-hooks-installed.mjs
T scripts/check-hooks-installed.test.mjs
P scripts/check-image-starts.mjs
P scripts/check-index.mjs
P scripts/check-language-closed.mjs
T scripts/check-language-closed.test.mjs
P scripts/check-measured-stamps.mjs
T scripts/check-measured-stamps.test.mjs
P scripts/check-runin-frame.mjs
P scripts/check-seed-versions.mjs
T scripts/check-seed-versions.test.mjs
P scripts/check-standings-invariant.mjs
P scripts/check-tags.mjs
P scripts/check-tooltip-values.mjs
T scripts/check-tooltip-values.test.mjs
P scripts/check-writable.mjs
T scripts/check-writable.test.mjs
P scripts/ci-docs-only.mjs
T scripts/ci-docs-only.test.mjs
P scripts/company-bind-truth.mjs
P scripts/company-spread-sweep.mjs
P scripts/configure.mjs
P scripts/contender-truth.mjs
P scripts/corridor-truth.mjs
P scripts/corridor-width-truth.mjs
P scripts/data-export.mjs
P scripts/diag/camera-curve.mjs
P scripts/diag/comeback-band.mjs
P scripts/diag/comeback-beats.mjs
P scripts/diag/comeback-hold-measure.mjs
P scripts/diag/endgame-spec.mjs
P scripts/diag/judder-census.mjs
P scripts/diag/line-ceiling-terms.mjs
P scripts/diag/micro-divergence.mjs
P scripts/diag/motion-continuity-census.mjs
P scripts/diag/replay-stored-race.mjs
P scripts/diag/runin-forward-reach.mjs
P scripts/diag/runin-line-schedule.mjs
P scripts/diag/runin-pin-drift.mjs
P scripts/diag/start-formation.mjs
P scripts/diag/start-frame-capture.mjs
P scripts/diag/width-authority.mjs
P scripts/edge-crossing.mjs
P scripts/edge-slice-truth.mjs
P scripts/endgame-sheet.mjs
P scripts/endgame-width-truth.mjs
P scripts/engine-reach.mjs
P scripts/exp-anchor-truth-ab.mjs
P scripts/exp-gs-confirm-gate.mjs
P scripts/exp-gs-honest-150.mjs
P scripts/exp-rebaseline-150.mjs
T scripts/fingerprint-default.test.mjs
P scripts/finish-band-truth.mjs
P scripts/finish-motion-truth.mjs
P scripts/finish-pair-truth.mjs
P scripts/floor-reach-truth.mjs
P scripts/gen-ceremony-costs.mjs
T scripts/gen-ceremony-costs.test.mjs
P scripts/gen-engine-reach-doc.mjs
T scripts/gen-engine-reach-doc.test.mjs
P scripts/golden/goldenRace.mjs
P scripts/gun-window-truth.mjs
P scripts/his-shot-truth.mjs
P scripts/label-bench-matrix.mjs
P scripts/label-bench.mjs
P scripts/label-degrade-truth.mjs
P scripts/label-names-truth.mjs
P scripts/label-occlusion-truth.mjs
P scripts/lib/cameraPlanDelivery.mjs
P scripts/lib/ceremonySamples.mjs
P scripts/lib/cheapMode.mjs
P scripts/lib/ciUnconditional.mjs
P scripts/lib/dataReach.mjs
P scripts/lib/fingerprintCheck.mjs
T scripts/lib/fingerprintCheck.test.mjs
P scripts/lib/frameBox.mjs
P scripts/lib/hisArm.mjs
P scripts/lib/inertChange.mjs
P scripts/lib/pngFrame.mjs
P scripts/lib/raceDriver.mjs
P scripts/lib/racerFacts.mjs
P scripts/lib/routing.mjs
P scripts/lib/runinAccepted.mjs
T scripts/lib/runinAccepted.test.mjs
P scripts/lib/storedRaceReplay.mjs
P scripts/lib/testFileExclude.mjs
P scripts/lib/trackScope.mjs
T scripts/lib/trackScope.test.mjs
T scripts/lib/trackScopeWiring.test.mjs
P scripts/lib/verifyMarker.mjs
T scripts/lib/verifyMarker.test.mjs
P scripts/lib/write-verified.mjs
T scripts/lib/write-verified.test.mjs
P scripts/line-visible-truth.mjs
P scripts/migrate.mjs
P scripts/minimap-truth.mjs
P scripts/outcome-phase-window.mjs
P scripts/pair-reach-census.mjs
T scripts/pair-reach-census.test.mjs
P scripts/pan-lag-account.mjs
P scripts/parity/goldenRunner.mjs
P scripts/parity/replay.mjs
P scripts/parity/soak.mjs
P scripts/phys-bench-fit.mjs
P scripts/phys-bench-matrix.mjs
P scripts/phys-bench.mjs
P scripts/prove-changed.mjs
T scripts/prove-changed.test.mjs
T scripts/raceDriver.test.mjs
P scripts/record-golden-races.mjs
P scripts/render-fingerprint.mjs
P scripts/resolve-converge-truth.mjs
P scripts/retry-ledger-reporter.mjs
P scripts/scoreboard-bench.mjs
P scripts/serve-production.mjs
P scripts/setup-hooks.mjs
T scripts/sim-fairness.characterisation.test.mjs
P scripts/sprite-size-truth.mjs
P scripts/straggler-truth.mjs
P scripts/tracking-lag.mjs
P scripts/verify.mjs
P scripts/viewer-invariants.mjs
T scripts/w-ref-one-home.test.mjs
P scripts/zoom-pace-truth.mjs
P scripts/zoom-rate-truth.mjs
```

## Addendum — task 3: comments contradicting the code beside them (sub-reviews A–D)

Every row is a comment fix, so all are **SAFE-CLEANUP**: they change no behaviour. The exception is A2-50, which is a probable code bug and is **NEEDS-OWNER**.

Shared pattern: about a third of the medium rows describe a key as "OFF / not shipped". That was true before the 2026-09-16 to 2026-10-01 ships turned these keys ON: gapBrakeEnabled, chaseAfterOutcomeEnabled, contenderZoom, labelNamesWhenRoom, leaderAimRoomFloorPx, hardSeparationEnabled. When a key ships ON, the ship ceremony should include a grep for its "OFF" comments.

| id | category | severity | file:line | evidence (comment versus code) | verdict | fix |
|---|---|---|---|---|---|---|
| A2-32 | contradiction | medium | client/src/modules/raceCore.js:286-289 | "GAP-BRAKE-1 … Default OFF, so a store that has never heard of it produces today's race byte-identically" vs :290 fallback `DEFAULT_RACE_DYNAMICS_CONFIG.gapBrakeEnabled` = `true` (defaults.js:1251) | SAFE-CLEANUP | Say "shipped ON since 2026-09-16" |
| A2-33 | contradiction | medium | scripts/sim-fairness.mjs:4511-4513, :4525 | "★ INERT TODAY: the shipped default is `gapBrakeEnabled: false`" vs defaults.js:1251 `true` | SAFE-CLEANUP | Same |
| A2-34 | contradiction | medium | client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx:181, :1536 | "Resetting returns it to SHIPPED, which is OFF." / subtitle "…SHIPPED OFF." vs defaults.js:1251 `gapBrakeEnabled: true`. The same card's :1540 says "SHIPPED ON since 2026-09-16" | SAFE-CLEANUP (the subtitle is UI text) | Correct the subtitle and the comment |
| A2-35 | contradiction | medium | DynamicsTuningSection.jsx:230-231 | "returns all three to shipped, which is the extension OFF" vs defaults.js:1117 `chaseAfterOutcomeEnabled: true` | SAFE-CLEANUP | — |
| A2-36 | contradiction | medium | client/src/modules/storage/defaults.js:805-815; client/src/modules/camera/framingRule.js:399-402; CameraDirectorCeilings.js:70-73 | "DEFAULT OFF, AND IT IS A MEASURED VERDICT … `_photoFinishContenders` is captured as `slice(0, 2)`" vs defaults.js:824 `contenderZoom: true` and CameraDirector.js:1734 `this._contenderZoom ? this._abreastContenders(ordered) : ordered.slice(0, 2)` | SAFE-CLEANUP | Add a "superseded 2026-10-01" note, as the other blocks have |
| A2-37 | contradiction | medium | CameraAdvancedSection.jsx:1999-2001 | "The KEY and the OFF default are LABEL-DEGRADE-1's" vs defaults.js:924 `labelNamesWhenRoom: true` | SAFE-CLEANUP | — |
| A2-38 | contradiction | medium | framingRule.js:623 (`@param roomFloorPx`); also client framingConfig.js:143-144 | "0/absent = OFF, the shipped default" vs defaults.js:977 `leaderAimRoomFloorPx: 360`. CameraDirector.js:2772-2777 already records this exact false claim being corrected once | SAFE-CLEANUP | — |
| A2-39 | contradiction | low | defaults.js:1508 | "Opt-in for testing." vs :1524 `hardSeparationEnabled: true` (and :1509 "Default TRUE") | SAFE-CLEANUP | — |
| A2-40 | contradiction | medium | defaults.js:1333-1335; DynamicsTuningSection.jsx:1137 (UI subtitle) | "(2.0 = shipped full …) Winning set: EARLY + POST full" vs `areaBonusEarly: 1.0`, `areaBonusPost: 1.0` with racePlanner.js:1070 `scale = phaseStrength / _areaRefStrength` (ref 2.0) → half strength | SAFE-CLEANUP (text) | Say "1.0 = half of reference" or state the scale |
| A2-41 | contradiction | medium | client/src/screens/RaceScreen/index.jsx:809; DynamicsTuningSection.jsx:1726 (subtitle); controlInfo.js:396 (help text) | "EMA smoothing for cosmetic updates (camera lerp, track effects)" / "applied to camera movement" vs index.jsx:1165 `camDirRef.current.update(…, rawDt)`. smoothDt only reaches effects (:815), and :864-866 says so itself | SAFE-CLEANUP (UI help text) | Say "track effects only" |
| A2-42 | contradiction | medium | CameraAdvancedSection.jsx:1195-1196 (help text) | "Requires Race Plan (open track ≥ 60 s only)." vs defaults.js:1054 `racePlanMinDurationSec: 30`; the gate (raceCore.js:245-249) has no open-track condition | SAFE-CLEANUP | — |
| A2-43 | contradiction | medium | BehaviorTuningSection.jsx:367 (subtitle) | "controls when the brake kicks in (how close, how directly behind) and how strongly" vs one control, `avoidanceWarmupMs` (:371-396) | SAFE-CLEANUP | — |
| A2-44 | contradiction | medium | client/src/screens/RaceScreen/nameTagLayout.js:237-241 | "NO SHIPPED CALLER SETS IT any more" (`exemptAll`) vs renderRaceFrame.js:311 `exemptAll: namesFromArrival` | SAFE-CLEANUP | — |
| A2-45 | contradiction | medium | client/src/modules/camera/CameraDirectorRunIn.js:81-83, :524 | the CLOSE lands "on the ACTIVE STATE'S OWN zoom … `_stateCamZoom()`" vs :204 `const endZoom = this._inPhotoFinish ? this._photoFinishZoom : this._leaderZoom;` (and :199-203 says it is explicitly NOT `_stateCamZoom()`) | SAFE-CLEANUP | — |
| A2-46 | contradiction | medium | CameraDirectorCeilings.js:144-158; CameraDirector.js:3210-3211, :3282, :3301-3304 | `_corridorCapWeight` "hangs on … `_runInProgress` … PAST THE RUN-IN it is 1" / "null outside the pair states" vs Ceilings.js:171-177: 0 unless `PHOTO_FINISH`, smoothstep over `_corridorCapArriveMs` from `_photoFinishEnteredTs` | SAFE-CLEANUP | — |
| A2-47 | contradiction | medium | CameraDirectorCeilings.js:361 (`_lineCeiling` @returns), :333-335 | "Infinity when the run-in is not composing this frame" vs a body (:363-408) that never checks composing; `_scheduleEngaged` (RunIn.js:313) relies on a finite value before engagement | SAFE-CLEANUP | — |
| A2-48 | contradiction | medium | CameraDirector.js:3236-3239 | the `line` term is "one more ceiling among the others" vs :3240 `line: _scheduled ? Infinity : _runInCeiling`, which is always Infinity, so the `'line-after-cap'` label (:3418-3419) is unreachable | SAFE-CLEANUP (comment). The dead label is an A1 note | — |
| A2-49 | contradiction | medium | CameraDirector.js:163 (`tcToLerpFactor` doc) | "90% convergence ≈ 3.45 × TC" vs :169 `1 - 0.1^(1/(tc*60))`, which converges 90% at exactly 1 × TC | SAFE-CLEANUP | "90% at 1 × TC" |
| A2-50 | contradiction / probable bug | medium | client/src/modules/viewerProbe.js:414 vs :623-628 | The file's own rule: "THE SECOND ARGUMENT OF `getPosition` IS NORMALISED, NOT WORLD PX … walks a segment 300x too long". Invariant 3 still calls `f.shape.getPosition(tAt, (k / 40 - 0.5) * f.trackWidthPx)` | NEEDS-OWNER (the instrument's verdicts change; invariant 3 is too lenient) | Apply the bandPct fix to invariant 3 and re-measure |
| A2-51 | contradiction | medium | CameraDirectorRunIn.js:153-158, :574-580 | the line is guaranteed inside `COMPANY_FRAME_PCT` ("1.11x instead of 1.43x") vs `bandFloor: true` (defaults.js:721), where Ceilings.js:375-378 maps it to `_innerFramePct` 0.7 | SAFE-CLEANUP | — |
| A2-52 | contradiction | medium | CameraDirectorLevelSet.js:267-268, :277-280 | "Admitting him is instant … may RISE only along a smoothstep" / "Infinity whenever the run-in is not composing" vs `_levelEaseTo` (:403-447), which eases both ways and returns eased values for `runInOpenMs` after composing | SAFE-CLEANUP | — |
| A2-53 | contradiction | medium | client/src/modules/racePlanner.js:1350-1354 | "(b) FREE means UNSTEERED … expressed as band steering" vs :1355-1360 and :1432-1440, which never change strictness (:1425-1432 says band steering was removed) | SAFE-CLEANUP | — |
| A2-54 | contradiction | medium | client/src/modules/heroCurveGenerator.js:20 | "ISOLATED: not wired into the race path (Step 3)." vs racePlanner.js:16 import + :1131 call on every race | SAFE-CLEANUP | — |
| A2-55 | contradiction | medium | client/src/modules/raceGovernor.js:72, :90-92 | "This is the code objecting … It refuses a configuration" vs `assertNaturalnessFloor` / `isWithinNaturalnessFloor` called only by naturalnessFloor.test.js | SAFE-CLEANUP (or wire it in: NEEDS-OWNER) | — |
| A2-56 | contradiction | medium | client/src/modules/raceBehavior.js:113 | "physicalY is set by computeRowPhysicalY … before this is called" vs :117 `racer.physicalY = 0`; raceCore.js:225-230 computes physicalY AFTER | SAFE-CLEANUP | Reverse the stated order |
| A2-57 | contradiction | medium | raceCore.js:22-29 | "KEY DIFFERENCE FROM THE SIM: separate passes, different order" vs sim-fairness.mjs:127 importing `stepRacePhysics` and :1786 "executes the BROWSER's real per-step advance" | SAFE-CLEANUP | — |
| A2-58 | contradiction | medium | scripts/sim-fairness.mjs:527-530, :723-729, :700-708 | The CLI docs for `--frontLeashMaxLengths`, `--heroChaosAreaBonus` and `--rerollVariant` describe effects. The hooks are "GONE" (:1899-1903), `HERO_CHAOS_AREABONUS_OFF` is never read, and `REROLL_VARIANT` is only echoed (:6042). All three flags are inert | SAFE-CLEANUP (doc) / A1: remove the inert flags | — |
| A2-59 | contradiction | low | sim-fairness.mjs:800-817, :1689 (`--physics-tax`, `--speed-source`); :1533, :850 (pulk 0.25/0.5 "byte-identical"; shipped 0.15 / 0.6); :660 (PulkLeadRotation "Default OFF", which is unconditional); :646 and defaults.js:1088 ("0 = shipped" pulkBoostHeadroom, which is 0.1); :11-16 (header finishT/baseSpeed formula gone); :823 (`--tracks`, where the flag is `--track`) | Stale CLI docs and header | SAFE-CLEANUP | — |
| A2-60 | contradiction | low | Group B lows: RunIn.js:141-142/343-344 ("a fifth of a second" vs `runInOpenMs` 1250); RunIn.js:685-686, :654-656, :12-13, :16, :43-45; CameraDirector.js:240-241, :556 / :2072 ("five"/"four" states vs six), :3529; Ceilings.js:264-267 (`anchorScreenPointRaw` IS imported at :47); framingRule.js:146, :419-420, :776; LevelSet.js:463 ("NO CALLER" vs a call at :536); orphaned or misplaced doc blocks at RunIn.js:31-62, :599-607, LevelSet.js:36-46, CameraDirector.js:2546-2553, :2799, :257-259, :408-409, :2087 | See the per-item quotes in the group B notes | SAFE-CLEANUP | — |
| A2-61 | contradiction | low | Group C lows: racePlanner.js:1925-1926 (fall-back is now `'pursuer'`), :1771-1772 (`netFrameFraction` does not exist), :22-23 (the governor does not use the PRNG), :539-541 (pass order and formula); heroCurveGenerator.js:13-14, :159 ("±20%" vs 0.10/0.15); raceGovernor.js:15 (RaceScreen does not import it), :403 ("≤ 4 heroes", now up to 7); raceBehavior.js:1407-1408, :49-50, :69-78; raceCore.js:13 (`runRaceHeadless` not used); viewerProbe.js:6, :790-791 ("Five" vs six invariants) | — | SAFE-CLEANUP | — |
| A2-62 | contradiction | low | Group D lows: DynamicsTuningSection.jsx:54-55 ("0.75 x 300 = 225"; LEADER is 0.85 → 255), :1599-1600, :180, :1228 ("5 rotation controls", the array has 7); CameraAdvancedSection.jsx:65, :1869; nameTagLayout.js:74, :541 ("two seconds" vs `labelFormHoldMs` 1200), :68-70; BehaviorTuningSection.jsx:7 ("priority mode config" does not exist); controlInfo.js:387, :391 (also LEAD_CHANGE); index.jsx:210-211 (HISTORY-MISSING-2 boolean does not exist), :1375 (`raceRng` not in file); SetupScreen.jsx:240-241 (raceCore reads it, not index.jsx); defaults.js:578-579 (`SCREEN_TRANSITION_MS` is in endingSchedule.js:73, not TransitionContext.jsx), :1280 ("0.249 canvas widths", now ≈0.22) | — | SAFE-CLEANUP | — |
| A2-63 | contradiction (line ref) | low | ~40 more drifted `file:line` citations found by hand (groups A–D) | e.g. defaults.js:1095/1097/1125 → raceGovernor.js:258/160/289; defaults.js:1293 raceCore.js:577 → 587-595; sim-fairness.mjs:784, :4505, :4507, :4510, :4533, :4534, :1280, :1240, :2661, :1910; racePlanner.js:186, :621, :738, :788, :800 (`defaults.js:1220` → 1319), :997; heroCurveGenerator.js:521; raceBehavior.js:86, :133, :764, :955, :992; raceCore.js:53, :472; CameraDirector.js:1170 (~1833 → ~3627), :3638/:3651/:3683 (~723 → 1170); RaceScreen/index.jsx:1412, :1417 (1760-1773 beyond EOF → 1374-1387), :1425, :1428; SetupScreen.jsx:186, :890, :894; TrackEditor.jsx:721 (`effectWorld` → trackScene.js:64) | SAFE-CLEANUP | Cite symbols, not line numbers |

**Revised totals including the addendum:** 63 rows.
- Medium: 5 from the mechanical pass plus 26 from the addendum.
- NEEDS-OWNER: 2 (A2-14 defaultWinners in stored and seed records; A2-50 viewerProbe invariant 3).
- Owner-scheduled: A2-29 (German UI text) and A2-21 (production console line).
- All the rest are SAFE-CLEANUP or LEAVE.
