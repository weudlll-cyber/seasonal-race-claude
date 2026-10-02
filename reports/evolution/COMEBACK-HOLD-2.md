# COMEBACK-HOLD-2 — the comeback shot holds until the racer reaches 3rd

**2026-10-02, branch `ship/owner-cosmetic-defaults` (on `268eeb33`). Not minted, not merged.**
Replaces the gain-stop rule of [COMEBACK-HOLD-1](COMEBACK-HOLD-1.md); built on the measurement
[COMEBACK-DURATION-1](COMEBACK-DURATION-1.md).

**The owner's decision, 2026-10-02.** The comeback shot holds until the comeback racer has reached
3rd place or better, for at least 8 s and at most 20 s, and never into the final scene. "Final scene"
is the EARLIEST of the camera's end-of-race entries:
- the endgame (leader past the endgame threshold);
- the photo-finish gate;
- the finish sequence (first racer home).

Whichever comes first ends the shot, overriding the 8 s minimum.

## What ends the shot now

| | where |
| --- | --- |
| **the final scene, at once, minimum or not** — reason `comeback-final-scene` | flag `comebackFinalSceneDue`, `client/src/modules/camera/CameraDirector.js:1059`; decision `transitionDecision.js:123`, ahead of every other comeback reason |
| **the target place, after the minimum** — reason `comeback-target-reached` | flag `comebackTargetReached`, `CameraDirector.js:1045` (rank ≤ `comebackTargetRank`, 3, `client/src/modules/storage/defaults.js:394`, no Dev Screen control); decision `transitionDecision.js:130` |
| **the maximum** — reason `hold-elapsed` | COMEBACK_ZOOM `maxStateDuration` 15000 → **20000**, `defaults.js:205` |
| **the minimum** | `comebackMinDuration` 8 s, unchanged |

**The three final-scene entries, and their triggers:**
- **the endgame** — the leader past `endgameThreshold`. `_pickNextState` answers it with the endgame
  shot (`CameraDirector.js:1773`), but only at the next transition, so before this piece a running
  comeback shot would have carried on into it. **This is the entry the new flag exists for.**
- **the photo-finish gate** — `photoFinishGateReady`, `CameraDirector.js:1026`.
- **the first racer home** — `forceFinishDrama`, `finishPhase.js:281`.

The last two already transitioned out of any state. They are part of the flag so the rule reads as
one, and the shot they start is unchanged.

**The final scene's own shot starts on the same frame.** The comeback ends through the ordinary
`_transition` → `_pickNextState`. The endgame's answer is the same LEADER_ZOOM it gives from any
state, and the photo finish and the finish sequence are entered from the same flags as before. The
endgame test asserts the next state is LEADER_ZOOM on that same `update`.

**The rank** is the comeback detector's own: a new pure read, `latestRank`
(`comebackDetector.js:166`), of the history `recordRanks` already keeps. There is no second tracker.

**Removed, with every reader:** `comebackGainStopMs`, the detector's `gainedWithin`, the reason
`comeback-gain-stopped`, and the measurement script's `--gain-stop-ms` arm and 2 s gain column.

**Kept:** the guard that never re-picks a running comeback (the repeat path cannot pass the maximum).

**The Dev Screen.** The per-state table's "Max state duration" field accepted at most 15000 ms, so it could not show the new 20000. `check-config-keys` RULE C refused the commit. The field's maximum is now 20000 (`CameraAdvancedSection.jsx`); the shipped value was not moved to fit the control.

## Measured — the same 750 races as COMEBACK-DURATION-1

The seeds come from [COMEBACK-DURATION-1-seeds.csv](COMEBACK-DURATION-1-seeds.csv): Quick-Test seeds
with the Quick Test's default names. Closed tracks have 20 and 40 racers; open tracks 20, 40 and 80
(the `long` name set for 80). Instrument: `scripts/diag/comeback-hold-measure.mjs` with this
branch's shipped config. Runtime: 765 s, at most 10 processes at once.

- **Shot length** — from the first frame in COMEBACK_ZOOM to the first frame out of it.
- **Final-scene overlap** — a shot with at least one frame in COMEBACK_ZOOM while the final scene
  was due: leader past `endgameThreshold`, any racer home, or the photo finish running. The
  instrument counts these frames (`finalSceneFrames`); it does not assume them.

| field | races | comeback shots | length median / p90 / max (s) | ended by reaching 3rd | by the 20 s cap | by the final scene | other | **final-scene overlap** |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| closed, 20 | 150 | 98 | 10.52 / 20.00 / 20.00 | 74 of 98 | 15 of 98 | 9 of 98 | 0 of 98 | **0** |
| closed, 40 | 150 | 111 | 14.70 / 20.00 / 20.00 | 65 of 111 | 26 of 111 | 20 of 111 | 0 of 111 | **0** |
| open, 20 | 150 | 97 | 8.18 / 17.40 / 20.00 | 81 of 97 | 2 of 97 | 14 of 97 | 0 of 97 | **0** |
| open, 40 | 150 | 97 | 11.00 / 18.38 / 20.00 | 79 of 97 | 2 of 97 | 16 of 97 | 0 of 97 | **0** |
| open, 80 | 150 | 60 | 13.07 / 18.08 / 20.00 | 40 of 60 | 2 of 60 | 18 of 60 | 0 of 60 | **0** |

**Final-scene overlap: 0 of 463 shots.**

**Reading it:**
- Most shots now end the way the owner asked: the racer reaches 3rd. That is 62–84% per field.
- The 20 s cap binds most on closed tracks with 40 racers: 26 of 111.
- The final scene cuts more shots as the field grows: from 9 of 98 to 18 of 60.

## The Quick-Test seed to look at

**Ice Track, 40 racers, Quick-Test seed 4896.**
- The comeback shot starts at race time **47.4 s** (headless).
- It holds **14.7 s** and ends when the racer reaches 3rd, from 19th.
- In a 40-racer Quick Test with the default names (the owner's setup), a browser run can place the
  shot a frame or two differently.

## Tests

`client/src/modules/camera/comebackHold.test.js`, rewritten, 12 tests. Every bound is READ from
`defaults.js`.

| guarantee | sabotage | went red |
| --- | --- | --- |
| ends at rank ≤ 3 after 8 s | the target comparison made impossible | "ENDS AT THE TARGET…" |
| never before 8 s unless the final scene | the minimum dropped from the target flag | "NEVER BEFORE the minimum…" |
| never above 20 s | the cap doubled inside the hold gate | "NEVER ABOVE the maximum…" |
| never into the final scene — endgame | the endgame condition removed | "NEVER INTO THE ENDGAME…" |
| never into the final scene — finish | the first-racer-home condition removed | "NEVER INTO THE FINISH…" |
| never re-picked | the repeat guard removed | "NEVER ABOVE the maximum…" and "ENDS AT THE TARGET…" |

The gain-stop tests went with the rule.

**One existing test changed.** `CameraDirector.test.js`, the closed-track pan-centring test for
COMEBACK_ZOOM, ran the comeback with its leader at 0.9 under a config whose `endgameThreshold` is
0.85. That state can no longer exist, so the leader moved to 0.8. The ranks, and the targeted 3rd,
are unchanged.

Camera suite: **1026 passed**.

## Fingerprints — not minted

`node scripts/engine-reach.mjs --check` with the changed paths: the five camera and defaults files can
reach the race, so every role was verified with `check-fingerprints.mjs --mint`, which writes nothing.
- **World: unchanged.**
- **Camera and render: identical to this branch's previous values** (`f79cdf8c03418c5f`,
  `87eb0a87809a3f59`; record `be48503a324429cb` / `90344c0f0361cbf1`). The fingerprint's pinned
  races contain no comeback shot this rule changes. That is the same blind spot COMEBACK-HOLD-1
  noted.

## Files, lines before → after

| file | before | after |
| --- | --- | --- |
| `client/src/modules/storage/defaults.js` | 1637 | 1636 |
| `client/src/modules/camera/CameraDirector.js` | 5526 | 5543 |
| `client/src/modules/camera/comebackDetector.js` | 285 | 276 |
| `client/src/modules/camera/transitionDecision.js` | 143 | 152 |
| `client/src/modules/camera/cameraTimingComputation.js` | 488 | 489 |
| `client/src/modules/camera/comebackHold.test.js` | 165 | 156 |
| `client/src/modules/camera/CameraDirector.test.js` | 8230 | 8233 |
| `scripts/diag/comeback-hold-measure.mjs` | 398 | 404 |
| `client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx` | 2118 | 2120 |
| `docs/FORCE-MAP.md` | citation line only | |
| `docs/CAMERA_DIRECTOR.md`, `docs/ENDING-PHASES.md` | stamp + one dated note each | |

## Noticed and left

- **No living document described the gain-stop rule.** The mentions in `docs/CAMERA_DIRECTOR.md`
  and `docs/ENDING-PHASES.md` are dated re-measurement notes and stay as history; `docs/FORCE-MAP.md`
  has none.
- **The camera fingerprint still cannot see a comeback rule.** A pinned race with a comeback shot
  would let it.
- **The `refactor/camera-director-split` branch** (P1) was cut before this piece. It will need to
  take this change before it can merge.
