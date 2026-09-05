# OPEN-LIST-TRUTH-1 — ten open items checked against the tree

**2026-09-05.** Branch `docs/open-list-truth-1` off master `e22c6611`.
**DOCUMENTATION ONLY.** No behaviour, no threshold, nothing minted.
**Ten items, checked at source. ONE closes. Three one-line corrections made. Eight stay open.**

Not an audit and not a census: the list was given closed and finite, and it was not widened.

---

## THE TABLE

| # | item | verdict | the file and line that decided it |
| --- | --- | --- | --- |
| 1 | The closing phase ends whatever was running | **CLOSED** → PART TWO **D32** | `CameraDirector.js:1663` forces `LEADER_ZOOM` past `_endgameThreshold`; returns at `:1680`; `LEAD_CHANGE` the only exception at `:1668-1673` |
| 2 | The action dial | **OPEN** | Built end to end — `defaults.js:1153`, `raceActionStage.js`, `SetupScreen.jsx:537`, `RaceScreen/index.jsx:475-476`. Chosen **only** in `DevScreen/sections/RaceDefaults.jsx:71-87`; no host-facing surface carries it |
| 3 | Cancel Race (the open half of PR-G) | **OPEN** | Not in the client at all. The other half is wired at `RaceScreen/index.jsx:1763-1765` |
| 4 | TLH-3 — offline fallback + status banner | **OPEN** | `client/src/modules/storage/defaultTracks.js` does not exist; no fallback-mode or status-banner code in `client/src` |
| 5 | Race identity / the seed | **OPEN** | `SetupScreen.jsx:533` seeds the plan, but `RaceScreen/index.jsx:476` and `:483` read the host's stored config at race start |
| 6 | Comeback beats to the camera (D14) | **OPEN** | `comebackDetector.js:64-75` keeps `role === 'comebacker'`; the `beats` array is dropped |
| 7 | The render fingerprint's blind spot | **OPEN** | `frameCameraInputs.js:39` declares 5 fields + 1 method; `render-fingerprint.mjs:447-449` supplies 3 |
| 8 | `routing.mjs`'s missing check | **OPEN** | `scripts/lib/routing.mjs:41-43` records it |
| 9 | The three remnants | **FIXED HERE** | `verify.mjs:642`, `MORNING.md:153`, `BACKLOG.md:45` |
| 10 | Deployment — domain, TLS, data | **OPEN** | `BACKLOG.md` D30: *"Still his, and not decided here"* |

---

## 1 · THE CLOSING PHASE ENDS WHATEVER WAS RUNNING — **CLOSED**

**The instruction is BUILT.** `client/src/modules/camera/CameraDirector.js:1663` —
`if (leaderProgress > this._endgameThreshold)` — returns `CAM_STATE.LEADER_ZOOM` at `:1680`, under
the comment *"Endgame — leader past threshold → LEADER, bypasses cooldown"*. It admits exactly one
exception, `LEAD_CHANGE` at `:1668-1673`, itself weight-gated since CAMERA-WEIGHTS-1.

**It is not frame-exact, and that is the delay CLOSING-CUT-1 measured.** `_pickNextState` (`:1544`)
is reached only through `_transition` (`:1788`), which `update()` calls only when `decideTransition`
returns TRANSITION — gated by `holdGate = minHold === 0 ? 0 : Math.max(minHold, stateCap)` at `:956`.
So the force lands at the running shot's **next decision point**.

★ **AND THE TWO BOUNDARIES ARE NOT THE SAME MOMENT.** Established while checking this, and it is the
part that makes CLOSING-CUT-1's four-phases-at-the-cut consistent with a force that exists: the force
fires at `_endgameThreshold`, while the run-in begins COMPOSING earlier — `_runInComposingNow` is set
at `:3505` after `_scheduleEngaged(...)`, and `:3493` uses `_endgameThreshold` as that schedule's
**deadline**, not its start. Between the two moments the previous shot is still running.

★ **THE LIMIT AND ITS PRICE, both verified at source before this was written.**
`CameraDirector.js:1675-1678` (RUNIN-OWNS-1) states the run-in owns the endgame's FRAMING, not its
state slot, and that taking the slot *"cost the photo finish its slow motion, which RaceScreen
triggers off `hudState === 'PHOTO_FINISH'`"*. Both halves hold:

- the branch at `:1674-1683` returns a state and touches no framing;
- `client/src/screens/RaceScreen/index.jsx:943` — `const isPhotoFinish = hud === 'PHOTO_FINISH'` —
  feeds `isSlowmoState` and selects `photoFinishSlowmoFactor` at `:946-947`.

*(The brief cited `1676-1680` for that comment; on the tree it is `1675-1678`. The comment is
verbatim as described.)*

**SUPERSEDED BY THE TREE — two sentences, named as the rules require.** The closed section's own
line *"nothing in `CameraDirector.js` ends a running phase at that boundary today"*, and the
**BACKLOG-VERDICTS-1 verdict of 2026-09-02** that repeated it. Both are wrong about the tree as it
stands. Every measurement either carried is untouched.

## 2 · THE ACTION DIAL — **OPEN**

**What EXISTS, end to end:**

| | |
| --- | --- |
| the stages | `defaults.js:1151` (`RACE_ACTION_STAGE_IDS`) and `:1153` (`RACE_ACTION_STAGES`) over `pulkChallengerBoost` and `pulkLeaderBrake` |
| the default | `defaults.js:47` — `raceActionStage: 'quiet'` |
| the resolver | `client/src/modules/raceActionStage.js` — `normalizeRaceActionStage`, `raceActionStageValues`, `applyRaceActionStage` |
| chosen in the UI | `DevScreen/sections/RaceDefaults.jsx:71-87` — three buttons over `RACE_ACTION_STAGE_IDS` |
| travels with the race | `SetupScreen.jsx:537` — normalised into the race payload |
| reaches the race | `RaceScreen/index.jsx:475-476` — `applyRaceActionStage(loadRaceDynamicsConfig(), raceActionStage)`, and `:483` `buildWorldConfig({ raceActionStage })` |

**WHAT ACTION-LEVERS-1 ESTABLISHED about the two keys** (290 cells, all ten tracks, N = 30, cited as
that report's finding): `pulkLeaderBrake` 0.05 → 0.15 moves lead changes −37% → +31% and the leader's
longest hold +55% → −33%; `pulkChallengerBoost` 0.03 → 0.12 moves them −10% → +17% and +8% → −16%.
**Neither moves field spread or the finish gap on any track.**

**Still open, in one line:** the stage is chosen in the Dev Screen and on no host-facing surface,
which is what the section's own heading asks for.

## 3 · CANCEL RACE — **OPEN**

**Not in the client at all.** `grep -rni "cancelrace|cancel race|abortRace|/cancel"` over
`client/src` and `server/src`, tests excluded, returns **nothing**. The other half of PR-G is wired:
`RaceScreen/index.jsx:1763` `requestFullscreen` and `:1765` `exitFullscreen`.

*(`BACKLOG.md:1166` cites `index.jsx:1717-1719` for those calls; on the tree they are at
`1763-1765`. The tree wins; the claim itself is unchanged.)*

## 4 · TLH-3 — **OPEN**

`client/src/modules/storage/defaultTracks.js` **does not exist** (`ls` refuses it). A search of
`client/src` for `fallbackMode`, `statusBanner`, `status banner`, `code-bundle` and `codeBundle`,
tests excluded, returns **nothing**. Both halves — the code-bundle fallback and the status banner —
are absent.

## 5 · RACE IDENTITY / THE SEED — **OPEN**

**What the seed DOES fix:** `SetupScreen.jsx:533` — `racePlanSeed: startSeed`, drawn once before the
race exists, so the race plan is a pure function of the value in the payload. The payload also
carries the roster (`:508`) and the action stage (`:537`).

**What it does NOT fix:** the world the race runs in. `RaceScreen/index.jsx:476` calls
`loadRaceDynamicsConfig()` and `:483` calls `buildWorldConfig(...)`, which gathers
`raceDynamicsConfig`, `raceBehaviorConfig`, `rowLayoutConfig`, `baseSpeedConfig`, `autoScaleConfig`,
`frameTimingConfig` and `cameraConfig` through the same loaders the race path uses
(`exportRaceConfig.js:79-92`) — **read from the host's storage at race start**. So the same seed on
two machines is two races, and neither operator changed anything.

**HIS DECISION, 2026-09-05, recorded and not designed:** a new short value is to REPLACE the seed as
the thing that repeats a race. Recorded as **PART TWO D33**.

## 6 · COMEBACK BEATS TO THE CAMERA (D14) — **OPEN**

**Both ends re-established at source:**

- **CONSUMED:** `client/src/modules/camera/comebackDetector.js:64-75` — `setPlan(cameraPlan)` walks
  `cameraPlan.heroes` and keeps `h.index` where `h.role === 'comebacker'`, into `this._cast`.
- **DISCARDED:** everything else on each hero, the per-hero `beats` array included. Nothing under
  `client/src/modules/camera/` reads a hero's beats — the only `beats` occurrences there are two
  JSDoc `@param` lines (`CameraDirector.js:784`, `comebackDetector.js:62`) and the start ceremony's
  own unrelated beats (`CameraDirector.js:5204`, `:5211`, `:5260`, `:5279`).

**HIS DECISION, 2026-09-05:** this is to be **MEASURED first** — night piece L, which was not
reached. Recorded as **PART TWO D33**.

## 7 · THE RENDER FINGERPRINT'S BLIND SPOT — **OPEN, and the count is settled**

**THE DECLARED LIST, at source.** `client/src/screens/RaceScreen/frameCameraInputs.js:39` —
`FRAME_CAMERA_FIELDS` holds **FIVE** fields: `state`, `anchorRacerIndex`,
`comebackLockedRacerIndex`, `hudState`, `runInArrived`. `frameCameraInputs()` then attaches the
method `detectBattleGroup` (`:65`), so a live frame's `camera` has **six members**.

**WHAT THE INSTRUMENT SUPPLIES.** `scripts/render-fingerprint.mjs:447-449` — a hand-written literal
with **THREE**: `hudState`, `comebackLockedRacerIndex`, `detectBattleGroup`.

**★ SO BOTH EARLIER RECORDS ARE RIGHT, ABOUT DIFFERENT QUANTITIES, and that is the disagreement
resolved:**

- **THREE declared fields are absent** from the instrument — `state`, `anchorRacerIndex`,
  `runInArrived`.
- **The blindness costs TWO behaviours**, because only two of the three are read by live drawing
  code: `renderRaceFrame.js:212` (`camera?.anchorRacerIndex`, the focus racer) and `:220`
  (`camera?.runInArrived`, names-from-arrival). **`camera.state` is read by no live code** — its
  only two occurrences are comments recording its removal (`frameCameraInputs.js:15`,
  `renderRaceFrame.js:284`).

**HIS DECISION, 2026-09-05:** take it into a night run. Recorded as **PART TWO D33**. The item's own
entry under THE SEVEN THAT ARE HIS is left exactly as it stands.

## 8 · `routing.mjs`'S MISSING CHECK — **OPEN**

`scripts/lib/routing.mjs:41-43` records it in the file itself: there is no `routing.test.mjs`, and
nothing extracts a guard's `await import(u("…"))` literals to check they are inside its resolved set.
The property holds today **by inspection, not by construction**. Unchanged since
GATE-WIRED-AND-CAUSED-1 named it; nothing here was built.

## 9 · THE THREE REMNANTS — **FIXED**

| site | before | after |
| --- | --- | --- |
| `scripts/verify.mjs:642` | `The seven skips above are each correct` | `The ${skipped.length} skips above are each correct` — the count is read, not written, so it cannot go stale again |
| `docs/MORNING.md:153` | `2. **Is 27 MB worth it?**` — an open question | struck, marked **ANSWERED 2026-09-05 — `date-fns` STAYS, PART TWO D29** |
| `docs/BACKLOG.md:45` | `the answers are PART TWO's DECISIONS D10–D24` | `PART TWO's DECISIONS, from D10 onward` — the series is named rather than bounded, with a note that the range went stale twice |

## 10 · DEPLOYMENT — **OPEN**

Still his, and untouched: `docs/BACKLOG.md` D30 states *"Still his, and not decided here: a domain,
which reverse proxy terminates TLS, and where the data lives."*

---

## SOURCE HYGIENE

| file | before | after | what moved |
| --- | --- | --- | --- |
| `docs/BACKLOG.md` | 4420 | 4438 | the closing-phase section (45 lines) lifted out of PART ONE and rewritten into PART TWO as **D32**; **D33** added; line 45's stale range named |
| `docs/MORNING.md` | 208 | 209 | the `date-fns` question struck and marked answered |
| `scripts/verify.mjs` | 781 | 781 | one string interpolation; **no logic** |
| `reports/evolution/OPEN-LIST-TRUTH-1.md` | 0 | 232 | this report |
| `reports/evolution/INDEX.md` | — | — | one entry |

**Noticed and deliberately left:**

- **`BACKLOG.md:1166` cites `RaceScreen/index.jsx:1717-1719` for the fullscreen calls; they are at
  `1763-1765`.** The claim it supports is still true, and the entry is an OPEN item whose place the
  brief says to keep unchanged. Named here, not edited.
- **The commit hook refused a first attempt** because a sentence in D32 stated `endgameThreshold`'s
  value. Correct: documents state no config values. The number was removed and the key named
  instead. Recorded because the guard doing its job is worth the line.
- **`DEPLOY-NOTES.md` and `ARCHITECTURE.md:1018-1033` both describe TLH-3 as deferred**, which is
  still accurate; item 4 needed nothing there.

---

## CHECKS

`npm run verify` on this branch — the doc guards plus the script suite, which `scripts/verify.mjs`
selects because it changed:

```
  PASS  check-doc-facts     0.3s          PASS  check-config-claims 2.4s
  PASS  check-hooks-installed 0.3s        PASS  check-measured-stamps 4.0s
  PASS  check-doc-links     0.5s          PASS  fingerprint-containment 17.7s
  PASS  check-fallback-agreement 1.5s     PASS  check-writable      32.1s
  PASS  check-index         1.6s          PASS  script-suite        81.0s
  PASS  check-language-closed 1.8s

  wall clock 81.2s — PASS 11   FAIL 0   SKIP 16
```

The client suite is not selected (no `client/` path changed), so it was run separately:
**241 files, 4,476 tests, 0 failures, 269.88 s.** Both green.

Nothing else was run, and nothing here could change a measured answer.

---

## FINGERPRINTS

Documents plus one string in a script, so none can move.
`node scripts/engine-reach.mjs --check` on the changed paths, **verbatim**:

```
ENGINE REACH: none of 4 path(s) carry a change that can reach the race engine.
  4 outside the hull (cannot reach the engine at all): docs/BACKLOG.md, docs/MORNING.md, scripts/verify.mjs, reports/evolution/OPEN-LIST-TRUTH-1.md
```

It selects nothing. **NOTHING WAS MINTED.**
