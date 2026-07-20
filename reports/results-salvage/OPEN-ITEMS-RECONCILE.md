# Open-Items Reconciliation — historical planning notes vs master `c22fd86`

*Read-only audit, 2026-07-14. Every verdict cites a file/symbol at the current tip. No code changed.*
*Fingerprint `fa4e3796e1e5f1a5` (unchanged — audit is read-only).*
*(Audited the existing working copy at master `c22fd86`, equivalent to the /tmp clone at the same tip.)*

## Full table

| ID | Concern (one line) | Verdict | Source evidence | In BACKLOG? |
|---|---|---|---|---|
| A1 | Phase-boundary inventory exists + complete | **DONE** | `docs/PHASE-CONTRACT.md` inventories all 6 boundaries (pulkStart/pulkEnd/transitionEnd/choreoOutcomeStart/corridorStart/corridorEnd) | — (is a doc) |
| A2 | P-controller gain invisible / mis-scaled | **DONE** | `bonusStrengthMultiplier` (=2.0; `DEFAULT_PULK_BIAS_GAIN` racePlanner.js:85) is a DevScreen control (`DynamicsTuningSection.jsx`). "test near 1.25" = owner experiment, not a code state | n/a |
| A3 | One value sets hero-cast start AND OUTCOME start? | **DONE (separated)** | hero cast anchors at pulkStart (~0.25) (heroChoreography.js:121, heroCurveGenerator.js:38); `choreoOutcomeStart` (0.5) drives PULK-end/OUTCOME (racePlanner.js:146) — different boundaries | n/a |
| A4 | rowEnvMult/pulkBiasGain/computePulkBiasedTarget inert when PULK collapsed | **DONE (reachable)** | all present; PULK window `[0.25,0.5)` is OPEN at shipped `choreoOutcomeStart 0.5`, so the bias path is reachable (racePlanner.js:85,137) | n/a |
| A5 | `corridorStart ?? transitionEnd` fallback must not be deleted | **DONE (present)** | racePlanner.js:160 `phaseFractions.corridorStart ?? phaseFractions.transitionEnd`; :396 comment "transitionEnd keeps its corridorStart-fallback role … not deleted (C-3)" | n/a |
| A6 | bonusFadeDuration functionless-but-present under choreo | **DONE (present, functionless)** | present in racePlanner.js + defaults.js; racePlanner.js:396 "Under choreo `bonusFadeDuration` becomes functionless … not deleted" | n/a |
| B1 | Nobody steered to rank 1 (nextCluster starts at cluster 2) | **DONE (by design)** | heroCurveGenerator.js:378-379 — winner deliberately cast to cluster **rank 2** (still B1), "leaves rank 1 to be won by the run-out". Intentional, not a gap | no (private) |
| B2 | clampIntensityToBudget is whole-cast from winner geometry — should be per-hero | **STILL-OPEN** | heroCurveGenerator.js:147/154 — one `realizedIntensity` derived from the winner's feasibility, applied to the whole cast (:457) | no (private) |
| B3 | "comebacker" is a count metric — want eye-defined | **STILL-OPEN** | still count-based: `comebackMinPositionsGained` (=2) is the trigger (CameraDirector.js:537,1106) | partial (BACKLOG:292 COMEBACK freq) |
| B4 | cameraPlan emitted but CameraDirector doesn't consume it (reactive via _b1Indices) | **STILL-OPEN** | `buildCameraPlan`/`cameraPlan` only in heroCurveGenerator.js; CameraDirector uses `_b1Indices` via `updateRacePlan()` (CameraDirector.js:206-207,494-544) — no cameraPlan consumption | no (private) |
| B5 | maxSimultaneousCrossings defined but not enforced | **STILL-OPEN** | `maxSimultaneousCrossings: 2` defined (heroCurveGenerator.js:61); no other reference → unenforced | no (private) |
| B6 | minHeroes/maxHeroes config not exposed in DevScreen | **STILL-OPEN** | present only in heroCurveGenerator.js; 0 DevScreen references | no (private) |
| B7 | PHOTO_FINISH missing as its own DevScreen zoom-profile accordion | **PARTIAL** | a Photo-Finish section exists (CameraAdvancedSection.jsx:1107 "8b · Photo-Finish", enable + leadProgress) but it is NOT a full zoom-profile accordion like Overview/Leader/Battle | RACE-ACTION.md limitations |
| B8 | comebackMinPositionsGained default + still the trigger | **STILL-OPEN** | default **2** (defaults.js:171); still the comeback trigger (CameraDirector.js:537) | partial (BACKLOG:292) |
| C1 | reactive governor/director (governorDirectorEnabled, applyGovernor, ~17 knobs) | **SUPERSEDED** | 0 non-test source hits for governorDirectorEnabled/applyGovernor/governorDirector{LeaderBrake,PullStrength,CatchThreshold,LingerBrake} | n/a |
| C2 | PulkRaceDirector (pulkRaceDirectorEnabled, pulkRaceMaxLeadHoldMs) | **SUPERSEDED** | 0 hits for pulkRaceDirectorEnabled/applyPulkRaceDirector/PulkRaceDirector/pulkRaceMaxLeadHoldMs | n/a |
| C3 | M1 applyPulkFrontContest + M2 pulkSpring | **SUPERSEDED** | 0 hits for applyPulkFrontContest, pulkSpring | n/a |
| C4 | rubber-band (raceRubberBand.js, flatBoost, rubberBand) | **SUPERSEDED** | 0 hits for raceRubberBand, rubberBand, flatBoost | n/a |
| C5 | v4-OFF / directorV4Enabled / pulkLeadRotationEnabled flags | **SUPERSEDED** | 0 hits — mechanism now unconditional (defaults.js "SHIPPED ON / UNCONDITIONAL") | n/a |
| C6 | showRubberBandDiag toggle | **SUPERSEDED** | 0 hits | n/a |
| C7 | tefAlpha/tefMaxGap (TEF) | **SUPERSEDED** | 0 hits | n/a |
| D1 | diag toggles pollute the world-hash config | **DONE (resolved)** | showGovernorDiag/enableFrameLog still exist (they should), but are NOT referenced in `exportRaceConfig.js` / `raceConfigWorld.js` → excluded from the world hash | n/a |
| D2 | maxLateralSpeedPerStep does two jobs (lane-change + tLat) | **STILL-OPEN** | raceBehavior.js:403 `vLatMax` (lane-change) AND :507 `tLat = lbHalfSpan / vLatMax` (longitudinal room) — both roles live | no (private) |
| D3 | Speed-clamp sprawl: three uncoordinated ceilings | **STILL-OPEN** | reRoll (defaults:258), director `pulkEnvelopeMaxEffect` 0.12 (defaults:290), OUTCOME `maxMult 1.1`/`minMult 0.85` (racePlanner:78-79) — separate, not consolidated | RACE-ACTION.md limitations |
| D4 | raceGovernor.js misnamed; rename deferred (Q5) | **STILL-OPEN** | file still `client/src/modules/raceGovernor.js` | no (private) |
| E1 | Chaos runaway — leader brake flat, not gap-scaled | **STILL-OPEN** | flat: raceGovernor.js:130 `leaderSpreadFactor * (1 - leaderBrake)` | no BACKLOG; **RACE-ACTION.md:226-229** |
| E2 | Lead grows during PULK (Swift race), unmeasured | **STILL-OPEN / UNCLEAR** | no code addresses it; no measurement found | **not tracked anywhere** |
| E3 | PULK→OUTCOME speed jump (pinned 1.0 in PULK, returns in OUTCOME) | **STILL-OPEN (by design)** | racePlanner.js:474 "Pre-OUTCOME … trajectoryMult target pinned to 1.0, EXCEPT …" — differential is intentional | not in BACKLOG (accepted design?) |
| E4 | Pre-existing start-row WIN bias (luger-hill/dirt-oval/searound) | **STILL-OPEN** | measurement stands (dirt-oval p=0.0024) | **yes — BACKLOG:812** |
| E5 | P-1 longitudinal overlap on open tracks (relied on removed rubber-band) | **STILL-OPEN (re-verify)** | root-cause partly moot post-rubber-band-removal | **yes — BACKLOG:663,731** (already flagged RE-VERIFY) |
| E6 | Re-Gate all four closed tracks on `9cfa953` | **STILL-OPEN** | no commit/tag confirms completion | **yes — BACKLOG:26** |
| E7 | SIM/PARITY seams O1–O6 (FORCE-PARITY.md) | **STILL-OPEN (mostly benign)** | O1-O4, O6 still listed; **O5 RESOLVED** (FORCE-PARITY.md:94, aux sweep tools deleted). None is an active divergence at default | **yes — docs/FORCE-PARITY.md** |
| F1 | BACKLOG marks master-merge "UNCERTAIN" though it's done | **STALE MARKER (confirmed)** | BACKLOG:27 "Master-merge … UNCERTAIN (2026-07-14)" — but merge IS done: fast-forward `e1d5a2b`, tag `v1-race-action-merged`, `feat/race-action` deleted, repo master-only. (Report only — owner approves refresh.) | BACKLOG:27 (to correct) |

## Group tallies
- **A: 6/6 DONE** — phase/servo/bonus mechanics all resolved or documented.
- **B: 1 DONE, 6 STILL-OPEN, 1 PARTIAL** — B1 done (by design); B2–B6, B8 open; B7 partial.
- **C: 7/7 SUPERSEDED** — every removed-mechanism symbol proven absent from non-test source.
- **D: 1 DONE, 3 STILL-OPEN** — D1 resolved (diag excluded from hash); D2/D3/D4 open hygiene.
- **E: 6 STILL-OPEN, 1 with a resolved sub-part (O5)** — E1–E7 all live; O5 closed.
- **F: 1 stale marker** — master-merge "UNCERTAIN" is wrong.

---

## STILL-OPEN / UNCLEAR — where each belongs

### Already tracked in repo docs (BACKLOG / FORCE-PARITY / RACE-ACTION) — no new backlog entry needed
- **E4** start-row WIN bias — BACKLOG:812
- **E5** P-1 longitudinal overlap — BACKLOG:663/731 (already flagged RE-VERIFY)
- **E6** Re-Gate on 9cfa953 — BACKLOG:26
- **E7** SIM/PARITY seams O1–O4,O6 — FORCE-PARITY.md (O5 resolved)
- **E1** chaos-runaway flat brake — RACE-ACTION.md:226-229 limitations
- **D3** speed-clamp sprawl — RACE-ACTION.md limitations
- **B7** PHOTO_FINISH zoom-profile accordion — RACE-ACTION.md limitations
- **B3/B8** comebacker definition/frequency — partially BACKLOG:292

### NOT tracked in any repo doc — big themes worth a BACKLOG entry (owner decision)
- **B2** per-hero intensity budget (currently whole-cast from winner geometry)
- **B4** camera foresight: consume `cameraPlan` instead of reactive `_b1Indices`
- **E2** "lead grows during PULK" (Swift race) — unmeasured, untracked
- **E3** PULK→OUTCOME speed differential — confirm as accepted design or log as an item

### Small / private (fine to leave in the owner's planning doc, not repo backlog)
- **B5** enforce `maxSimultaneousCrossings`
- **B6** expose minHeroes/maxHeroes in DevScreen
- **D2** disentangle `maxLateralSpeedPerStep`'s two roles
- **D4** rename `raceGovernor.js` (Q5)

### Stale repo-doc marker to correct (report-only per spec)
- **F1** BACKLOG:27 master-merge "UNCERTAIN" → the merge is DONE (`v1-race-action-merged`). Owner to approve a BACKLOG refresh (and BACKLOG:26's stale cross-ref to "ROADMAP.md:418 in progress", since ROADMAP was updated to "Still open: Re-Gate").
