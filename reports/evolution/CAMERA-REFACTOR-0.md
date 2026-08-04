# CAMERA-REFACTOR-0 — the branch, the finished diagnosis, and the inventory

Workspace + diagnosis + inventory for the camera refactor. **Changes no behaviour**: the only files in the
commit are this report and its INDEX entry. No engine ceremony (no mint, no REBASELINE, no SIM.md, no gate) —
struck by the owner for camera work; the physics is protected by the DIFF instead.

---

## BUILD-VS-SPEC CONFORMITY (step by step)

| Step | Status | Note |
|---|---|---|
| **A** — branch off master, push to origin | DONE | Name `camera-refactor` used as proposed. |
| **B1** — bisect the leader-zoom regression | DONE | Deterministic 3-rung replay of the owner's seed. **Verdict: older than both tags** — with a caveat and a named owner check. |
| **B2** — clarify the bogus measurement | DONE | The number was wrong; the owner is right. The planner's *explanation* is **refuted** — I found a different cause and a real latent defect. |
| **B3** — justify or concede the track split | **CONCEDED** | No technical justification survives Grundpfeiler 6. Also: the split as described does not exist — OVERVIEW-FRAMING-1 changed open tracks too. |
| **B4** — find every lap-blind site | DONE | 11 sites, file + line + live/fallback. |
| **C1–C6** — inventory | DONE | |
| **D** — eye-accepted behaviour inventory | DONE | 24 behaviours; 6 flagged as probably never consciously accepted. |
| **E** — revert recommendation | DONE | Recommendation: **revert on master** — but for a different reason than the spec anticipated. |
| VERIFICATION — no simulation file in the diff | DONE | See below. |
| COMMIT — one commit on the branch, `docs(camera)`, report + INDEX only | DONE | |

**Declared deviations**

1. **B1 could not be closed by replay alone.** The regression does **not** reproduce headlessly at the shipped
   default config on the owner's exact seed. I bisected anyway (three rungs, deterministic) and the answer is
   unambiguous *for what I could measure*; the residual is an owner check, stated precisely in B1.
2. **I ran the camera test suite once** (567 tests, 11 files) — not as verification of a docs-only commit, but as
   the C5 measurement. Called out under "over-securing" below.

---

## PART A — the branch

```
master           e5f0afa6  feat(camera): OVERVIEW frames the leader + N racers (OVERVIEW-FRAMING-1)
camera-refactor  e5f0afa6 + this commit      (pushed to origin, tracking origin/camera-refactor)
```

`camera-refactor` branches off master at `e5f0afa6` and is pushed. Origin is no longer master-only for the
duration of this project. Master is untouched by this block.

---

## PART B — the finished diagnosis

### Method (shared by B1 and B2)

One real race, recorded once, replayed through several camera code versions — so the **only** variable is the
camera code.

```
node scripts/sim-fairness.mjs --track=dirt-oval --racer=horse --seed=5601 --races=1 --racers=20 \
     --track-defaults --dump-frames=<scratch>/dirt-oval-5601.json --skip-main-output
  → 5746 frames, finishT=2 (2 laps), world 3072x2047, 20 racers
```

**One correction to the existing harness (`scripts/exp-camera-bisect.mjs`), which matters:** the director calls
`Math.random()` in `_weightedRandomPick` and `_scheduleNextOverview`. Replaying rungs without seeding it gives
each rung a **different event sequence** — my first run showed LEADER-family frame counts of 2166 / 1853 / 1816
across three rungs whose LEADER code is identical. Every number below comes from a replay with `Math.random`
replaced by a seeded mulberry32 reset per rung; the frame counts then match exactly (1585 / 2166) across all
three, which is the proof that the sequences are identical.

---

### B1 — the leader-zoom regression: **older than both tags**

Three rungs, deterministic, shipped `DEFAULT_CAMERA_CONFIG` taken from **each rung's own** `defaults.js`:

| rung | commit | LEADER-family, lap 1 | LEADER-family, lap 2 |
|---|---|---|---|
| R0 `pre/glide-target` (neither fix) | `2e20e1f3` | zoom **4.344**, visible world **707 px**, floor binds 0.0% | zoom **4.344**, **707 px**, 0.0% |
| R1 `pre/overview-framing` (glide fix only) | `e1c6f90b` | zoom **4.344**, **707 px**, 0.0% | zoom **4.344**, **707 px**, 0.0% |
| R2 master (glide + OVERVIEW-FRAMING-1) | `e5f0afa6` | zoom **4.344**, **707 px**, 0.0% | zoom **4.344**, **707 px**, 0.0% |

(1585 LEADER-family frames in lap 1, 2166 in lap 2, identical on all three rungs.)

**Two findings, kept separate.**

**(a) Neither commit changed the LEADER framing — at all.** Identical to three decimals on every rung, in both
laps. The diffs agree: `e5f0afa6` touches only `case CAM_STATE.OVERVIEW` inside `_setTargets` (plus the two new
config keys); `e1c6f90b` touches only the `_lerpPhase === 'glide'` branch of
`_setClosedTrackTargets`/`_setOpenTrackTargets`, which moves the pan *endpoint* during the 500 ms glide and never
the zoom. **So the leader zoom going wide in lap 2 did not come from OVERVIEW-FRAMING-1 and did not come from the
glide fix.**

**(b) The mechanism that *can* make LEADER_ZOOM wide, and that *is* lap-asymmetric, is the min-visible zoom
floor** (`_zoomFloorForMinVisible` + the `_leaderPhaseZoomFloor` ratchet, `CameraDirector.js:2694-2740`) — shipped
in LEADER-MINVIS-1, far older than both tags and untouched by either. It is the only term in LEADER_ZOOM that
depends on where the *field* is rather than on config. Measured on the same recording (`minRacersVisible = 8`):

```
  lap | frames |     p05 |     p25 |  median |     p75      <- min-visible zoom floor
   1  |   2720 |   4.771 |   8.572 |  10.201 |  12.932
   2  |   3025 |   4.272 |   7.140 |  10.737 |  12.914
```

The floor only *binds* (and so widens the camera) when the profile zoom exceeds it. Profile zoom = `spriteScale ×
2.400` on this world:

```
  spriteScale 1.81  -> leaderZoom  4.34   binds lap1   0.0%   lap2   5.3%
  spriteScale 2.5   -> leaderZoom  6.00   binds lap1  11.7%   lap2  16.6%
  spriteScale 3     -> leaderZoom  7.20   binds lap1  14.1%   lap2  25.3%
  spriteScale 4     -> leaderZoom  9.60   binds lap1  41.0%   lap2  38.8%
```

At the shipped default (1.81) the split is 0.0% → 5.3%. At a tighter leader zoom — which is what the owner has
been running in every camera session on record (`exp-camera-bisect.mjs:61` documents *"owner's tested LEADER zoom
3, min-visible 8"*) — it is **14.1% → 25.3%**: the floor forces the camera wide nearly twice as often in lap 2 as
in lap 1, and it does so *without any state change*, so the HUD keeps saying FOLLOWING LEADER throughout. That is
exactly the shape of the owner's two screenshots.

**Verdict: older than both tags.** The bisect is decisive on that question. Reverting either commit cannot fix
the leader zoom.

**What I want the owner to compare (the part the replay cannot settle).** The replay runs the *shipped default*
config; the owner's browser runs his *stored* config, and the effect above is entirely a function of his
`LEADER_ZOOM spriteScale` and `minRacersVisible`. One race settles it:

> Same track, same seed 5601, same LEADER zoom you had in the screenshots — but set **Dev Screen → Camera
> Advanced → "Min racers visible" to 0** (which disables the floor, `CameraDirector.js:2695`). If lap 2 now
> frames like lap 1, the min-visible floor is the cause and I have the fix boundary. If lap 2 is *still* wide,
> the cause is something my instrument does not see and I will need the `[RA CAMERA DETOUR]` trace from that
> race.

---

### B2 — the bogus measurement: **the number was wrong, and here is why** (straight)

**The claim.** OVERVIEW-FRAMING-1 reported: *"on these large 3072-px closed ovals the front five racers span
roughly HALF the world width"* and *"the sprite floor binds 100% at every tested minSpriteFrac"*.

**The owner is right. The number is wrong by a factor of ~16.** Measured over all 5746 frames of the same
recording, front 5 by running order:

```
  median box extent :  95 px = 3.1% of world width
  worst  box extent : 176 px = 5.7% of world width
```

Even the **whole 20-racer field** only spans a median 319 px = 10.4% of the world. Nothing in this race, at any
moment, spans half the world.

**The planner's proposed cause is REFUTED.** The hypothesis was that `[...racers].sort((a, b) => b.t - a.t)` uses
per-lap `t`, so from lap 2 a leader at t≈0.05 sorts below a backmarker at t≈0.95. That is not how `t` works in
this codebase: `raceStep.advanceRacerT` **adds** to `racer.t` with no wrap (`raceStep.js:117-133`); `lapUtils.js`
documents *"t accumulates past 1 each lap"*; `mathUtils.js:24-28` exists precisely because *"r.t accumulates
across laps (lap 2: t=1.x) and closed-track back rows start at NEGATIVE t, so callers must normalize before any
same-lap distance check."* `r.t` **is** race position, and the sort is correct. Measured on the same recording:

```
  worst cumulative-t spread inside the top-5 group : 0.0280 laps
  frames where that spread >= 0.5 lap             : 0 / 5746
```

The group never mixes racers a lap apart. Not once.

**What actually made the report's numbers wrong.** I could not re-derive the exact arithmetic — the measurement
harness was a scratch script and was not committed with the block, so it cannot be re-read. But I can show that
its *other* headline claim is impossible at the same time, and that the pair of claims points at a real defect.

Replaying master's `_setOverviewGroupTargets` on the recording, at the three canvas sizes the report used:

```
  canvas      | zoomFit (med) | zoomCeil | zoomFloor | decided by  | targetZoom | sprite on screen
  1280x720    |          17.3 |    2.358 |     1.940 | CEIL  100%  |      2.358 | 2.19% of frame width
  1920x1080   |          26.0 |    2.358 |     2.910 | FLOOR 100%  |      2.910 | 1.80% of frame width
  2560x1440   |          34.7 |    2.358 |     3.880 | FLOOR 100%  |      3.880 | 1.80% of frame width
```

Three things follow.

1. **At the canvas the product actually runs (`CANVAS_W = 1280`, `CANVAS_H = 720`, hard-coded at
   `client/src/screens/RaceScreen/index.jsx:95-96`), the sprite floor never binds.** The **ceiling**
   (`_overviewSnapZoom`, derived from `overviewTargetScreenPx`) decides 100% of frames. "The floor binds ~100%"
   is false for the shipped app.
2. **The floor binds at 1920 and 2560 because it is resolution-dependent** — which directly contradicts the
   report's own check 3 ("resolution independence: fractional framing identical at 1280/1920/2560"). The sprite
   is 2.19% of frame width at 1280 and 1.80% at 1920/2560. Not identical.
3. **That resolution dependence is a real defect** (see C6): `_setOverviewGroupTargets`
   (`CameraDirector.js:2325-2327`) computes the floor as
   `overviewMinSpriteFrac × frameSize.width / (refBody × axisX)` where `axisX = CANVAS_W / worldW` is a **fixed
   1280-referenced** scale. Live canvas pixels are divided by a constant, so the floor scales linearly with the
   canvas. It is latent today only because the canvas is a hard-coded constant.

**Straight answer:** the report's "front-5 span half the world / floor binds ~100%" is wrong. The front 5 span
3.1% of the world. The floor binds 0% at the only canvas the product runs at. The stated cause (per-lap `t`) is
also wrong. And the two claims were only mutually consistent because a units bug made the floor grow with the
canvas — which the report then read as "resolution independent" because it happened to bind at two of the three
sizes it sampled.

---

### B3 — the track split: **CONCEDED, and it is worse than a split**

There is no technical justification that survives Grundpfeiler 6, and I am not going to invent one. Taking the
report's three stated reasons in turn:

- *"(a) the owner's defect and all measurement are closed"* — that is a statement about coverage, not about the
  rule. It argues for measuring open tracks, not for exempting them.
- *"(b) the open-track uniform-zoom path has different zoom semantics that my per-axis box-fit was not validated
  against (it broke four existing open-track overview-zoom tests)"* — this is the honest reason, and it is
  "it was harder on open tracks", which the spec explicitly rules out. Note *what* it says: the same rule
  produced a different answer on the open path, i.e. the two paths do not agree about what OVERVIEW means. That
  is the defect, not the excuse.
- *"(c) keeping open on its accepted behaviour preserves attribution"* — **this one is factually untrue.**
  OVERVIEW-FRAMING-1 also removed `_applyOverviewRadialOffset` from the open path (`git show e5f0afa6`, the
  `_setTargets` hunk: the open branch went from `_applyOverviewRadialOffset(basePanTarget)` to a bare
  `leaderPos`). Open tracks previously got a 150-world-px shift toward the shape centre and now get none. So
  open-track OVERVIEW **did** change, its attribution was **not** preserved, and the "closed only" scope claim in
  both the report and the INDEX entry is inaccurate.

**It must go.** What it takes:

1. One OVERVIEW framing rule expressed in **frame fractions and world units**, with the per-axis world→screen
   scale as a parameter (`bsX/bsY` closed, `OPEN_TRACK_BASE_ZOOM` on both axes open). The rule's inputs are
   already topology-agnostic — group bounding box, inner-frame fraction, sprite fraction, leader clamp. Only the
   projection differs, and the projection is exactly the thing the refactor should make explicit and enforced
   (see Proposals).
2. The four open-track overview-zoom tests that the rule "broke" must be **re-read, not preserved**: they encode
   the old whole-track behaviour, which is what the rule replaces. Either the rule is right for both topologies
   and those tests get rewritten, or the rule is wrong — but "the rule is right on closed and the old tests are
   right on open" is not a state the codebase may sit in.
3. The open-track radial-offset removal needs to be **declared as a behaviour change** wherever it currently
   reads as "unchanged" (report §scope, INDEX line 17, and `docs/CAMERA_DIRECTOR.md` §4.4).

---

### B4 — every lap-blind site in the camera path

The class of bug: `r.t` is **cumulative across laps** (and starts **negative** for closed-track back rows), while
`shortestArcDeltaT`/`tFrac` are **lap-normalized**. A site is lap-blind when it uses one where it needs the other,
or when it ignores that a value can leave `[0,1]`.

| # | File:line | What it does wrong | Path |
|---|---|---|---|
| 1 | [CameraDirector.js:787](../../client/src/modules/camera/CameraDirector.js#L787) | Photo-finish pre-line gate: `shortestArcDeltaT(ord[0].t, ord[1].t)` — **lap-normalized closeness used as a finishing-order gap**. `ord` is ranked by cumulative `t`, so a 2nd-place racer exactly one lap down reads as gap ≈ 0 → spurious PHOTO_FINISH + slow-motion at 97% progress. **LIVE** |
| 2 | [CameraDirector.js:1173](../../client/src/modules/camera/CameraDirector.js#L1173) | Same test at the first crossing (`closeFinish`). Same defect, same consequence. | **LIVE** |
| 3 | [panTarget.js:47](../../client/src/modules/camera/panTarget.js#L47) | `tMid = (r0.t + r1.t) / 2`. Correct for two racers on the same lap *including across the seam* (cumulative `t` is continuous there) — **wrong whenever they differ by a whole lap**: the "arc midpoint" of t=1.5 and t=0.5 is t=1.0, half a lap from both. *Note: INDEX line 20 records this as a "wrap bug (per-lap t wraps at the seam)" — that mechanism is wrong; the bug is lapping, not the seam.* | LIVE, but only ever fed `_focusRacers` (top-3), so the lapped case is currently unreachable. Latent trap in a shared pure primitive whose JSDoc says nothing about laps. |
| 4 | [CameraDirector.js:892](../../client/src/modules/camera/CameraDirector.js#L892) | PHOTO_FINISH entry `fT = (fr[0].t + fr[1].t) / 2` — same arithmetic-mean form as #3. | LIVE (top-2 only) |
| 5 | [CameraDirector.js:1521](../../client/src/modules/camera/CameraDirector.js#L1521) | PHOTO_FINISH transition `focusT` — same form again, third copy. | LIVE (top-2 only) |
| 6 | [CameraDirector.js:1094](../../client/src/modules/camera/CameraDirector.js#L1094) | BATTLE-DIAG snapshot `fT` — same form, fourth copy. | diagnostic |
| 7 | [CameraDirector.js:922](../../client/src/modules/camera/CameraDirector.js#L922) `_camT` | `_camT` is written by `+= _tDelta(...)` and **never normalized where it is written or stored**; it is normalized only at the three closed-track *read* sites (`((_camT % 1) + 1) % 1`, lines 2421 / 2524 / 2573 / 2603 / 2642 / 2669) — which is itself redundant, because `EditorShape.getPosition` already normalizes closed `t` (`EditorShape.js:107`). **Measured: `_camT` sits outside [0,1] on 2929 / 5379 frames = 54.5%, range [0.125, 1.954].** Behaviour is correct; the *representation* is a cumulative track parameter living in a field everything else documents as [0,1]. | **LIVE** |
| 8 | [CameraDirectorDiag.js:399](../../client/src/modules/camera/CameraDirectorDiag.js#L399) | Frame-log legend: `ct: 'camT (track param 0–1, null if not in T-space)'`. Measured false 54.5% of the time (#7). This is the spec's "camT exceeding 1 in the frame logs". | diagnostic |
| 9 | [CameraDirectorDiag.js:408](../../client/src/modules/camera/CameraDirectorDiag.js#L408) | Frame-log legend: `t: 'path-progress 0–1'` for the per-racer snapshot. False in both directions — `r.t` reaches `finishT` (2.0 here) and starts negative. **This is the most likely origin of the "per-lap t" belief that B2 had to refute**: the only place in the repo that documents what `t` is, in the diagnostic the camera work has been reading for a week, says it is 0–1. | diagnostic |
| 10 | [lapUtils.js:25](../../client/src/modules/camera/lapUtils.js#L25) | `currentLap(t, maxLaps) = min(floor(t) + 1, maxLaps)` — for a negative back-row `t` this returns **0**. Measured: 10 of 20 racers have `t < 0` at the gun; at least one racer has `t < 0` on 22 frames (0.4%). Consumed by `raceCore.js:621` (`r.lap`, which reaches the results screen's `finishOrder`) and `overlayRendering.js:73` (the LAP n/m overlay). | **LIVE**, user-visible, small |
| 11 | [CameraDirector.js:1576-1584](../../client/src/modules/camera/CameraDirector.js#L1576) and [:2446-2453](../../client/src/modules/camera/CameraDirector.js#L2446) | The FINISH_OVERVIEW lookback normalization (`normT`/`lookbackFrac`/`lookbackT`) is **correct**, and is written out twice, verbatim, in two places. Not lap-blind — but it is the seam-handling that everything else omits, duplicated instead of shared. | LIVE (both) |

**Not lap-blind, checked and clear:** every ranking sort (`b.t - a.t`, 14 sites), `leaderProgress = leader.t /
finishT`, `_updateLeaderTracking`'s `gap = leader.t - second.t`, `_scheduleNextOverview`, `_detectPulkGroup` /
`_isOriginalGroupStillValid` (arc-normalized closeness is the *right* measure there), `_applyLeaderForwardBias`
(normalizes `tA`/`tB` correctly), `_containAnchorInFrame` and `_focusAnchorRacer` (world x/y only, no `t`).

**One adjacent defect found in the same sweep, not lap-blind but worth the same fix pass:**
[CameraDirector.js:1826](../../client/src/modules/camera/CameraDirector.js#L1826) — `_recordDetourFrame` computes
its "anchor" as `getPanTarget(this.state, this._focusRacers(racers), this._shape)`. For BATTLE_ZOOM that is the
**top-2 arc midpoint**, but the camera is actually pointed at the battle-**group** centroid (ranks ≥ 3,
`_setTargets:2556-2563`). The diagnostic reports a different point than the one the camera is framing, for the
one state where the difference is largest.

---

## PART C — the inventory

### C1 — shape and size

**Files on the camera path** (source | test):

| File | src | test |
|---|---:|---:|
| `modules/camera/CameraDirector.js` | **2977** | 6812 |
| `modules/camera/CameraDirectorDiag.js` | 433 | — |
| `modules/camera/cameraTimingComputation.js` | 365 | 229 |
| `modules/camera/Minimap.js` | 130 | 83 |
| `modules/camera/resolveCamera.js` | 117 | 226 |
| `modules/camera/panTarget.js` | 74 | 146 |
| `modules/camera/lapUtils.js` | 26 | 54 |
| `modules/camera/openTrackCamera.js` | 21 | 23 |
| `modules/cameraConfig.js` | 348 | 947 |
| `modules/cameraMigrations.js` | 333 | — |
| `screens/DevScreen/sections/CameraAdvancedSection.jsx` | **1528** | 68 |
| `screens/RaceScreen/CameraDiagnosticsHUD.jsx` | 553 | 264 |
| `screens/RaceScreen/CameraFrameLogHUD.jsx` | 161 | — |
| `screens/RaceScreen/CameraStateHUD.jsx` | 113 | 78 |
| **total** | **7179** | **8930** |

`CameraDirector.js` is 41% of the source and its test file is the largest file in the module by a wide margin.

**States** (6): `OVERVIEW`, `LEADER_ZOOM`, `BATTLE_ZOOM`, `COMEBACK_ZOOM`, `LEAD_CHANGE`, `PHOTO_FINISH`.
Plus two **pseudo-states** that exist only as `hudState` values and boolean flags, not as `CAM_STATE` members:
`FINISH` (`_inFinishDrama`) and `FINISH_OVERVIEW` (`_inFinishMode`). That asymmetry — two of the eight things the
viewer sees are not states — is a structural fact worth naming.

**Transitions.** All routed through one `_transition()` → `_pickNextState()` priority chain: photo-finish
lifecycle guard (P0) → finish override (P1) → pre-line photo-finish entry (P1.5) → start phase (P2) → post-start
hold (P2.1) → endgame (P2.5) → weighted random pool (BATTLE / LEAD_CHANGE / COMEBACK / OVERVIEW) → LEADER_ZOOM
default. Plus three transitions fired directly from `update()` outside the chain: BATTLE dispersal exit, BATTLE
P2-drift exit, LEAD_CHANGE interrupt. Measured on the recorded race: **18 transitions over 5746 frames**, 9
distinct edges.

**How many distinct code paths can write `offsetX`/`offsetY` in a single frame?**

`this.offsetX/offsetY` are assigned at **19 statement sites** in `CameraDirector.js` (2 constructor, 6 in the
`update()` branch block, 2 in the zoom-about-anchor correction, 2 in the pan lerp, 4 in `_containAnchorInFrame`,
6 in `updateCountdown`). Reachable in **one** `update()` frame:

| branch | writers that can run in the same frame |
|---|---|
| `glide` | glide interpolation → `_containAnchorInFrame` = **2** |
| `cut` | snap → `_containAnchorInFrame` = **2** |
| `follow`, T-space active | `_leadChangeSnapPending` snap → pin to target → `_containAnchorInFrame` = **3** |
| `follow`, pixel lerp | `_leadChangeSnapPending` snap → zoom-about-anchor correction → pan lerp → `_containAnchorInFrame` = **4** |

So: **up to 4 sequential writers per frame**, across **3 mutually exclusive branches**, with one function
(`_containAnchorInFrame`) reachable from all three. `updateCountdown()` is a 4th, separate entry point that
writes them directly and never consults `_setTargets`.

`targetOffsetX/Y` have **4** writers (`_setClosedTrackTargets`, `_setOpenTrackTargets`,
`_setOverviewGroupTargets`, `updateCountdown`). `zoom` has **7**; `targetZoom` has **13**.

---

### C2 — dead and legacy code

**Dead module constants in `CameraDirector.js` — 17, all declared and never read** (verified by reference count):
`_MAX_STATE_DURATION`, `_ENDGAME_PROGRESS_THRESHOLD`, `_BATTLE_PULK_THRESHOLD_T`, `_BATTLE_MIN_DURATION_MS`,
`_FINISH_DRAMA_DURATION`, `_POST_START_HOLD_MS`, `_BATTLE_COOLDOWN_MS`, `_BATTLE_MAX_DURATION`,
`_MIN_STATE_HOLD_MS`, `_TC_OVERVIEW`, `_TC_LEADER`, `_TC_BATTLE`, `_TC_COMEBACK`, `_OVERVIEW_COOLDOWN_MS`,
`_TRANSITION_T_CONVERGENCE`, `_DEFAULT_MAX_ENTRY_DURATION_MS`, `_DEFAULT_OVERVIEW_OFFSET_PX`. Every one is a
*copy* of a constant that `cameraTimingComputation.js` owns. **Not needed for migration — pure dead weight.**

**A Dev Screen control that does nothing.** `overviewClosedTrackZoom` is marked `@deprecated 2026-06-04 …not read
at runtime` in `defaults.js:211`, and `cameraTimingComputation.js:73-75` confirms it was retired. It still has a
**live slider** at `CameraAdvancedSection.jsx:634-647`, labelled "OVERVIEW Closed Zoom", with a tooltip that
describes behaviour it does not have: *"1.0 = no pan (camera frozen), 1.3 = 30% zoom-in giving pan room."* The
owner can move it and nothing happens. **Dead weight; the key stays for migration, the control must go.**

**Dead director state.** `_overviewOffsetPx` is assigned every `_computeTimingConfig` (`CameraDirector.js:438`)
and read nowhere since `_applyOverviewRadialOffset` was deleted. The whole chain
`cameraStateProfiles.OVERVIEW.overviewOffsetPx` → `computeTimingFromConfig` → `this._overviewOffsetPx` is dead.
The config key is needed for migration; the timing plumbing and the director field are not.

**Dead methods.** `_getBattleFocusRacer()` (`CameraDirector.js:2083`) has no production caller — only a test.
`exportDetourLog()` (`:1890`) has no caller at all; the detour log reaches the owner via `console.info` only.

**Legacy paths that are genuinely needed.** The `spritePctOfCanvas` branch (`_computeZoomLevels:373-383`) is the
v2/v3 fallback and is reachable through the migration chain — keep. `cameraMigrations.js` v5→v17 — keep, it is
the migration. The `'legacy'` transition grammar — keep, it is the bare-caller fallback and finish-mode OVERVIEW
still routes through it.

**Misfiled, not dead.** `modules/camera/lapUtils.js` contains **no camera code**. `REFERENCE_FPS` is consumed by
`durationModel.js` and `raceBaseSpeed.js` (engine); `currentLap` by `raceCore.js` and `overlayRendering.js`;
`lapProgress` by `RaceScreen/index.jsx`. Nothing in `modules/camera/` imports it. Its tests live in
`CameraDirector.test.js`.

---

### C3 — duplication

**1. `OPEN_TRACK_BASE_ZOOM = 1.5` is defined twice** — `CameraDirector.js:30` and `openTrackCamera.js:11`.
Nothing imports it from `openTrackCamera.js`; `RaceScreen/index.jsx:40-41` imports the *constant* from
`CameraDirector` and the *function* `effectiveZoom` from `openTrackCamera`, and `effectiveZoom` defaults to its
own copy. **They can drift silently and nothing would catch it** — `effectiveZoom(z)` called without the second
argument would use the shadow copy. One test asserts `OPEN_TRACK_BASE_ZOOM === 1.5`, but only the
`CameraDirector` export.

**2. `CANVAS_W = 1280` / `CANVAS_H = 720` are defined three times** — `CameraDirector.js:51-52` (as
`CANVAS_W`/`CANVAS_H_REF`), `RaceScreen/index.jsx:95-96`, `CameraDiagnosticsHUD.jsx:14,230`. The director's copy
is a *reference* scale (`bsX = CANVAS_W / worldW`), the RaceScreen's is the *actual* canvas, and the HUD's is a
third assumption about both. They happen to be equal, which is precisely why the B2 unit bug is invisible.
**Nothing catches divergence.**

**3. Every fallback constant in `CameraDirector.js` is a copy of one in `cameraTimingComputation.js`** — see C2.
Since the director's copies are dead, the duplication is currently harmless *and* undetectable.

**4. Measured drift between the code fallbacks and the shipped defaults.** Running
`computeTimingFromConfig(null)` against `computeTimingFromConfig(DEFAULT_CAMERA_CONFIG)` gives **22 scalar
disagreements**. Most are the profiles-vs-flat path (the `tc*`/`lf*` family) and are structural. **Four are
genuine drift on top-level keys with identical meaning on both paths:**

| key | code fallback | shipped default |
|---|---:|---:|
| `endgameThreshold` | 0.85 | **0.90** |
| `outcomePhaseThreshold` | 0.75 | **0.65** |
| `comebackMinStartGap` | 0.40 | **0.25** |
| `comebackMaxCurrentRankPct` | 0.10 | **0.20** |

A bare `new CameraDirector()` runs a materially different director than the app does, and no test compares them.

**5. `getComebackDiagData` has a fifth copy of those defaults, drifted again** —
`CameraDirectorDiag.js:44-48,85` uses `?? 5` (window), `?? 3` (min gain), `?? 0.75` (outcome threshold) against
the director's `?? 4`, `?? 2`, `?? 0.65`. The COMEBACK diagnostic can display thresholds that are not the ones
being applied.

**6. The FINISH_OVERVIEW lookback computation is written twice, verbatim** — `CameraDirector.js:1576-1584` and
`:2446-2453` (B4 #11).

---

### C4 — unmeasured assumptions

Not every comment — the ones that assert *behaviour* and are wrong or unproven.

| Assertion | Where | Measured |
|---|---|---|
| `_containAnchorInFrame(...)` *"safety rail (no-op mid-glide)"* | `CameraDirector.js:979` | **False.** On the recorded race at shipped defaults the clamp moved the pan on **20 / 561 glide frames (3.6%)**, and CAMERA-DETOUR-2 measured 23/23 on the owner's live trace. It is a no-op in the *follow* branch (0 / 5185 frames) — the comment is on the wrong branch. |
| *"With grammar (A) cut + centered steady-state tracking this should be ~0 (the rail is a safety net)"* | `CameraDirector.js:1764-1765` | Stale premise: grammar (A) `cut` is **not** the shipped grammar — `glide` is (`DEFAULT_CAMERA_CONFIG.cameraTransitionGrammar`). Measured `cut`-branch frames on the recording: **0**. The comment describes a configuration nobody runs. |
| `ct: 'camT (track param 0–1)'` | `CameraDirectorDiag.js:399` | **False** — outside [0,1] on **54.5%** of frames, range [0.125, 1.954]. |
| `t: 'path-progress 0–1'` (racer snapshot) | `CameraDirectorDiag.js:408` | **False** — `r.t` runs to `finishT` (2.0 here) and starts negative. |
| `targetInFrame` getter — *"Whether the last pan-resolved target landed inside the inner frame"* | `CameraDirectorDiag.js:248-251` | **Stale on 786 / 786 closed-track OVERVIEW frames (100%)**. `_setOverviewGroupTargets` writes `targetZoom`/`targetOffset` directly and never sets `_lastResolvedPanTarget`, so the getter reports whatever the *previous* state left behind. |
| *"Expressed as a fraction of the frame, so the framing is identical at any resolution"* (OVERVIEW min sprite size tooltip) | `CameraAdvancedSection.jsx:679` | **False** — B2 (3): 2.19% of frame width at 1280 vs 1.80% at 1920/2560. |
| *"The owner expects this floor to bind rarely"* (same tooltip) | `CameraAdvancedSection.jsx:679` | A tooltip that states an expectation instead of a behaviour. At the shipped canvas the floor is inert below ~2.2% (slider range starts at 1.0%), so the lower half of the control does nothing. |
| *"Target sprite screen size during OVERVIEW **on open tracks** … Only affects open tracks. Default 18 px."* | `CameraAdvancedSection.jsx:658` | **Two errors.** `overviewTargetScreenPx` drives `_overviewSnapZoom` on **both** topologies (`_transition:1411-1441`), and since OVERVIEW-FRAMING-1 that value is the *deciding* term on closed tracks (B2: CEIL 100%). The stated default (18) is not the shipped default (28). |
| *"OPEN keeps its existing whole-track overview"* / *"keeping open on its accepted behaviour preserves attribution"* | `OVERVIEW-FRAMING-1.md`, INDEX line 17 | **False** — the open path lost its radial offset in the same commit (B3). |

---

### C5 — test coverage, honestly

**567 tests across 11 files, all green** on the branch (`vitest run` over the camera path).

| Behaviour class | Protected by | Honest status |
|---|---|---|
| Zoom derivation (`_computeZoomForSpriteScale`, `_computeZoomLevels`), cross-track scale invariance | ~40 tests | **Well protected.** Safe to refactor. |
| `resolveCamera` viewport/zoom-adaptation contract | 226 lines of dedicated tests | **Well protected.** Pure function, safe. |
| Config resolution + migration v2→v17 | `cameraConfig.test.js`, 947 lines | **Well protected** — though `cameraMigrations.js` (333 lines) has **no test file of its own**; it is covered only through `cameraConfig`. |
| State machine: pulk detection, cooldowns, min-hold, weighted pick, endgame, finish drama, photo-finish | ~150 tests | **Well protected as a state machine.** Almost all drive `cd.state` directly or through short synthetic sequences. |
| Framing invariants: leader-always-framed (OVERVIEW), containment clamp, per-axis mapping, zoom-about-anchor, glide endpoint constancy | 5 dedicated describe blocks (FOCUS-1/3/5, SIDEJUMP-1, GRAMMAR-1, GLIDE-TARGET-1, OVERVIEW-FRAMING-1) | **Protected as invariants** — these are the good ones, written as "X can never happen" rather than "X equals 3.4". This is the pattern the refactor should preserve. |
| **Transition grammar as a whole** (cut vs glide vs legacy interaction with observer phase, `_camT`, the clamp) | — | **Convention only.** Individual pieces have tests; the composition does not. This is where the last three camera bugs lived. |
| **The write-order in `update()`** (4 sequential offset writers, C1) | — | **Convention only.** No test asserts which branch wrote the offset, or that the clamp ran last. |
| **`_setOverviewGroupTargets` vs `resolveCamera` agreement** | — | **Convention only.** OVERVIEW-closed is the one state that bypasses `resolveCamera` entirely, so the world-edge and inner-frame guarantees are re-implemented rather than shared, and nothing tests that the two implementations agree. |
| **Multi-lap behaviour** | — | **Nothing.** Not one camera test runs a race past `t = 1`. Every lap-blind site in B4 is unprotected. |
| **`CameraDirectorDiag.js`** (433 lines) | — | No own test file; partly exercised via `CameraDirector.test.js` (the Etappe-10 diagnostic-fields block). |
| **`CameraFrameLogHUD.jsx`** (161 lines) | — | **No test at all.** |
| **Lap-blind formula in `panTarget`** | `panTarget.test.js:54` | **Negative coverage.** The one `t` assertion is *"calls shape.getPosition with tMid=(t0+t1)/2"* — the test **locks in** the lap-blind formula. Fixing B4 #3 requires changing this test. |
| `lapProgress` / `currentLap` | 12 tests in `CameraDirector.test.js:14-33` | Tests for functions that live in `modules/camera/` but are consumed only by the engine and the results screen (C2). None covers the negative-`t` case that B4 #10 measures. |

**Bottom line for the refactor's safety:** the *leaf* maths is well covered and can be moved freely. The
*orchestration* — `update()`'s branch structure, write order, and the interaction between `_lerpPhase`,
`_observerPhase` and `_camT` — is held together by convention alone. Any refactor that touches the state machine
or the transition grammar is unprotected; any refactor confined to projection and typed positions is not.

---

### C6 — units, determined from the usage site

| Value | Name suggests | **Actually is (at the usage site)** | Verdict |
|---|---|---|---|
| `zoom`, `targetZoom` | zoom | **cam.zoom** — a topology-relative factor, *not* a world→screen scale. Must be multiplied by `bsX`/`bsY` (closed) or `OPEN_TRACK_BASE_ZOOM` (open) to become one. | The single most-confused value in the module. It appears in 20 assignments and every one requires the reader to know which multiplier applies. |
| `offsetX`, `offsetY` | offset | **canvas pixels** (`ctx.translate(cam.offsetX, cam.offsetY)`, `index.jsx:1213`) | Correct, undocumented. |
| `effectiveZoom` (from `resolveCamera`) | zoom | **world → screen scale** (px per world unit) | Correct — and *different* from `zoom`. Two things named "zoom" in the same call chain, one relative and one absolute. |
| `camX`, `camY` (from `resolveCamera`) | camera position | **world units, viewport top-left** | Correct, documented. |
| `_bsX`, `_bsY` | — | **canvas px per world px**, at the *reference* 1280×720 — not at the live canvas | The trap behind B2 (3). |
| `_camT`, `_transitionTargetT`, `focusT`, `_lastFocusT` | track parameter | **cumulative** track progress, unbounded, can be negative | **Name disagrees with use** — documented as [0,1] in the frame log (B4 #7, #8). |
| `_battleLockT`, `tMid` | track parameter | **cumulative**, averaged as if bounded | **Name disagrees with use** (B4 #3-#6). |
| `_leadOutDistanceT`, `_entrySpeedEstimate` | t / t-per-frame | **t per frame** — but multiplied by `FRAME_RATE` and a duration in **seconds** at `:914` and `:1542` | Correct, but the seconds/frames mix is unstated. |
| `overviewMinSpriteFrac` | fraction of frame width | **fraction of frame width, divided by a 1280-referenced scale** → resolution-dependent | **Name disagrees with use.** B2 (3). |
| `overviewTargetScreenPx` | screen px | **screen px at the reference canvas**, on *both* topologies | Name fine; the Dev Screen tooltip is wrong about scope (C4). |
| `_drawnBodyWidthRefPx` | px | **world px** (racer's drawn body width in world space) | **Name disagrees with use** — "Px" here means world px, while `overviewTargetScreenPx` a few lines away means canvas px. They are multiplied together in `_transition:1424`. |
| `finishOverviewLookbackPx` | px | **world px along the path** (divided by `shape.getTotalLength()`) | Name fine; the "along the path, not euclidean" part is undocumented. |
| `_leaderForwardFrac` | fraction | **fraction of the frame along the motion axis**, applied via a screen-space projection back to world units | Correct; the round-trip is the subtlest arithmetic in the file (`:1691-1706`). |
| `_innerFramePct` | percent | **fraction 0–1**, not a percent | **Name disagrees with use** (`0.7`, not `70`). |
| `spriteScale` | scale | **relative to natural density-scaled size**; `drawnBodyWidthRefPx` cancels out | Correct and well documented (L82). |
| `battlePulkThresholdT`, `battleIsolationThresholdT`, `photoFinishCloseThresholdT`, `leadChangeMinGap` | t | `…ThresholdT` are **lap fractions** (arc-normalized). `leadChangeMinGap` is a **cumulative-t** difference. | Same `T` suffix, two different quantities — the confusion B4 #1/#2 turns into a bug. |

**Six names disagree with their use:** `_camT`/`focusT` family, `_battleLockT`/`tMid`, `overviewMinSpriteFrac`,
`_drawnBodyWidthRefPx`, `_innerFramePct`, and the `…ThresholdT` / `…MinGap` pair.

---

## PART D — the inventory of eye-accepted behaviours

**This is the refactor's budget.** Each row: what it does · when it fires · what "right" looks like · how the
owner notices it missing. Derived from the code, the camera reports, and `DEFAULT_CAMERA_CONFIG` — not from
memory. Provenance column: **A** = an evolution report records the owner's eye accepting it; **I** = implied
accepted (it has been on screen through many accepted sessions and he has never objected); **?** = I suspect he
has never consciously accepted it.

### D.1 — The states

| # | Behaviour | Trigger | Right looks like | Missing looks like | Prov. |
|---|---|---|---|---|---|
| 1 | **OVERVIEW** — wide shot of the leading group | scheduled by weighted pick after `overviewStartDelay` (15 s), `overviewCooldownMs` (15 s), `overviewTargetCount` (2 per race) | ~1300 world px visible on dirt-oval, sprites ~28 screen px, leader toward the front with the field behind | The race never "breathes"; no wide shot between close-ups | I |
| 2 | **LEADER_ZOOM** — follow the front-runner | pool default; also forced during post-start hold (7 s) and endgame (>90% progress) | ~700 world px visible; leader **forward-framed** at 0.66 of the frame, pack behind | Camera sits behind or beside the leader; pack out of shot | **A** (FOCUS-3) |
| 3 | **BATTLE_ZOOM** — tight group shot of a mid-field scrap | ≥3 racers within `battlePulkThresholdT` (0.05 lap), frontmost at rank ≥3 and ≤`battleMinTopN` (10), rank span ≤5, 8 s cooldown | Tight on the group centroid; the group fills the frame | Fights happen off-screen; camera stays on the leader | I |
| 4 | **COMEBACK_ZOOM** — follow a racer climbing the field | outcome phase (>65% or plan-driven), a cast comebacker gained ≥2 places in 4 s from ≥25% back, 10 s cooldown | Locked on one named racer working forward | Comebacks pass unseen | I |
| 5 | **LEAD_CHANGE** — cut to the new leader | confirmed lead swap (gap ≥0.002 t, held 800 ms), 5 s cooldown; also allowed through the endgame block | Camera is on the *new* leader from the first frame of the shot | The overtake happens off-frame or the camera stays on the loser | **A** (LEAD_CHANGE work) |
| 6 | **PHOTO_FINISH** — top-2 group shot at a close finish | pre-line one-shot gate at 97% progress with top-2 within 0.03 lap; fallback at the first crossing | Both contenders in one tight frame across the line, in slow motion | A photo finish plays as an ordinary leader shot | I |
| 7 | **FINISH drama pulse** — 1.5 s hold on the winner | first crossing (non-photo-finish) | Winner held tight for 1.5 s, HUD reads FINISH | The race cuts straight to the wide shot | I |
| 8 | **FINISH_OVERVIEW + lookback** — pull back to a fixed point 300 world px *before* the line | after the drama pulse or the photo finish | Camera glides out over 3 s to a **stationary** frame showing the approach, so the rest of the field crosses in shot | Camera drifts forward with the winner's runout; later finishers cross off-screen | I |
| 9 | **Finish pause** — 2.5 s before the leaderboard | all racers finished | Beat of silence on the finish frame | Results screen snaps in immediately | I |

### D.2 — The transition grammar

| # | Behaviour | Trigger | Right looks like | Missing looks like | Prov. |
|---|---|---|---|---|---|
| 10 | **Glide is the default transition** — pan *and* zoom ease together on one bounded 500 ms smoothstep | every non-finish state entry | One smooth continuous move; never a snapped zoom with a crawling pan | Hard cuts return (the owner's explicit verdict: too abrupt) | **A** (GRAMMAR-1) |
| 11 | **Cut is available and still correct** | `cameraTransitionGrammar: 'cut'` | Frame 1 lands correctly framed, zero acquisition | — | **A** (FOCUS-3, later superseded as default) |
| 12 | **The glide starts from the framing the eye last saw** — captured *before* the OVERVIEW/LEAD_CHANGE zoom snaps | every glide entry | No hybrid "snapped zoom + gliding pan" | A visible zoom pop at the start of every transition | **A** (GRAMMAR-1) |
| 13 | **The glide endpoint is computed at the destination zoom** | `_lerpPhase === 'glide'` | The camera steers at a point that does not move during the glide | The ~1150 px endpoint walk returns — the camera travels the wrong way then corrects | Report exists (GLIDE-TARGET-1); **owner acceptance still pending** |
| 14 | **Zoom happens about the anchor, not the world origin** | any zoom change during follow | The leader stays put on screen while the zoom changes | The leader lurches to the frame edge, then the pan crawls back | **A** (SIDEJUMP-1) |
| 15 | **The anchor is contained in the inner 70% of the frame** | LEADER_ZOOM / LEAD_CHANGE / COMEBACK_ZOOM, every frame | The leader can never leave the inner region, however fast he moves | The pan lag lets the leader ride the edge (69% of frames at fast+tight before FOCUS-1) | **A** (FOCUS-1) |
| 16 | **The screen mapping is per-axis** (`bsX` on X, `bsY` on Y) | closed non-square worlds | Forward-framing and containment behave the same on vertical and horizontal track sections | Edge-riding and a 44% clamp rate on tall worlds | **A** (FOCUS-5) |
| 17 | **Minimum racers visible = 8** — the camera never zooms tighter than the zoom that keeps 8 racers on canvas | LEADER_ZOOM / LEAD_CHANGE | You always see who the leader is racing against | Leader alone in an empty frame | I — **and this is B1's suspect** |
| 18 | **That floor is rate-limited asymmetrically** — loosen instantly, tighten ≤0.005/frame | whenever the binding racer flips | No zoom swim in a dense field | Zoom and pan oscillate frame to frame | **A** (JITTER-1) |

### D.3 — Framing details and chrome

| # | Behaviour | Trigger | Right looks like | Missing looks like | Prov. |
|---|---|---|---|---|---|
| 19 | **Start phase** — 3 s locked wide on the **centroid of the whole field** | `raceElapsed < 3000` | Nobody is cut off at the gun | Back-row racers off-frame at the start | I |
| 20 | **Countdown zoom-in** — ease-out cubic from a very wide start to the OVERVIEW zoom over 4 s, centred on the start pulk | COUNTDOWN phase | A slow settle onto the grid, arriving without a jump into the first racing frame | Hard pop at the gun | I |
| 21 | **Slow motion in BATTLE and PHOTO_FINISH** — 0.5× with a 0.3 s fade, ≥2 s minimum in BATTLE; photo-finish releases immediately | on entering/leaving those states | The scrap plays out slowly, then resumes without a jolt | Fights and photo finishes play at full speed | I |
| 22 | **Focus darkening** — non-group racers darkened 40% during BATTLE | with the slowmo fade | Attention is on the group | Group indistinguishable from traffic | I |
| 23 | **Name tags** — visible while ≤10 racers are on screen | `tagVisibleMaxCount` | You can read who is who at close zooms, and the tags do not clutter the wide shot | Tags everywhere, or never | I |
| 24 | **Minimap** — 280×160 PiP bottom-left, whole track, leader ringed white | RACING and FINISHED | Always know where on the lap the action is | Lost orientation during close-ups | I |
| 25 | **State overlay text** — a narrative line per state, 3.5 s, anti-repeat | OVERVIEW / BATTLE / COMEBACK / LEAD_CHANGE / photo-finish winner | A line of commentary that does not repeat within a race | Silent screen | I |
| 26 | **Camera-state HUD badge** — OVERVIEW / FOLLOWING LEADER / BATTLE / COMEBACK / FINISH, colour-coded, fading | `showCameraStateHud` (default on) | The badge names the shot you are watching | You cannot tell which shot is running | I |

### D.4 — Diagnostics and controls (behaviour the owner uses, not behaviour he watches)

| # | Behaviour | Prov. |
|---|---|---|
| 27 | **`[RA CAMERA LIVE TRUTH]`** — one commit-stamped race-start console line: resolved grammar · observer phase after entry · per-key config source. The tool that settles "stale bundle vs stale config" in a glance. | **A** (FOCUS-4) |
| 28 | **`[RA CAMERA DETOUR]`** — gated per-transition frame log, 3 frames before + 30 after, with the anchor's screen position projected using the *same* offset/zoom the renderer committed. | **A** (DETOUR-1/2 — the owner ran it) |
| 29 | **Frame-log ring buffer + export/copy HUD** — 600 frames, ~28 fields, self-documenting legend. | I |
| 30 | **The Dev Screen camera panel** — 43 sliders across BATTLE detection, event weights, OVERVIEW, transitions, LEADER zoom, LEAD_CHANGE, COMEBACK, slowmo, finish and photo-finish; every one live-applied via `updateConfig()`. | I — but see the flags below |

### D.5 — Behaviours I suspect the owner has NEVER consciously accepted

These exist because they were built, not because they were chosen. **This distinction is the point of the
exercise**; each one is a candidate to delete rather than to preserve.

1. **LEAD_CHANGE dominates the race.** Measured on the recorded race at shipped defaults: LEAD_CHANGE holds
   **37.6% of all frames** (2160 of 5746, ~36 s of a ~96 s race) — more than LEADER_ZOOM (27.7%), more than
   BATTLE (18.1%), more than triple OVERVIEW (10.9%). That is an emergent product of `leadChangeMinDuration 1.5s`
   + `maxStateDuration 8000` + `leadChangeCooldownMs 5000` meeting a field that swaps the lead constantly since
   COMBO15. Nobody chose "the lead-change shot is the primary shot of a RaceArena race". **Worth putting in front
   of his eye as a question, not a bug.**
2. **`overviewClosedTrackZoom` — a slider that does nothing**, with a tooltip that describes behaviour it does not
   have (C2). He has certainly moved it. It has certainly never done anything since 2026-06-04.
3. **The OVERVIEW min-sprite floor is inert below ~2.2%** at the shipped canvas, and its slider starts at 1.0%
   (C4). The lower half of a control the owner was just given does nothing.
4. **The whole OVERVIEW-FRAMING-1 feature** — explicitly rejected, still on master. Part E.
5. **Open-track OVERVIEW lost its 150 px radial offset** in that same commit, undeclared (B3). If he accepted
   open-track OVERVIEW framing at some point, that acceptance no longer describes the code.
6. **The `'legacy'` transition grammar still governs finish-mode OVERVIEW.** Every other entry glides; the
   finish-mode zoom-out runs the pre-FOCUS-3 entry path with a temporarily overwritten entry TC
   (`_transition:1443-1446`). So the single most-watched transition in the race — the pull-back after the winner
   crosses — is the only one not using the accepted grammar. The comment calls it "a mandatory dramatic glide,
   exempt"; there is no record of the owner choosing that exemption.

---

## PART E — recommendation

**Revert OVERVIEW-FRAMING-1 on master, source-only, as one commit.**

The spec anticipated that B1 would decide this. It did not decide it the way it expected — **the leader-zoom
regression did not come from OVERVIEW-FRAMING-1**, so "reverting removes a live defect" is not available as an
argument. I still recommend the revert, on three other grounds:

1. **Master's job on this project is to be the known-good fallback, and a rejected feature disqualifies it from
   that job.** The owner's stated reason for a branch is that he can step back at any moment. Stepping back onto
   a master that carries a feature he rejected is not stepping back.
2. **The feature's justification is now measured false.** B2 shows its two headline measurements ("front-5 span
   half the world", "the floor binds ~100%") are wrong, and B3 shows its scope claim ("closed only, open
   unchanged") is wrong. It also permanently removed the open-track radial offset with no measurement of the
   open path at all. That is a feature standing on three retracted claims — it should not be the fallback state.
3. **Reverting on master is strictly cheaper than reverting on the branch.** It is one commit, it isolates a
   single attributable change, and it leaves the branch free to carry only *new* work. Reverting on the branch
   instead would mean master and branch differ by a revert *and* by the refactor, and any future "what did the
   camera do at the fallback point?" question would need both diffs read together.

**Shape of the revert.** Source files only — `CameraDirector.js`, `CameraDirector.test.js`,
`cameraTimingComputation.js`, `defaults.js`, `CameraAdvancedSection.jsx`. **Keep** `OVERVIEW-FRAMING-1.md`, its
INDEX entry, the `pre/overview-framing` tag and its TAGS register line: the lab journal records what was tried,
and this report's B2/B3 corrections attach to it. The report and INDEX entry should gain one line pointing here.
Verified clean: **0 commits have touched those source paths since `e5f0afa6`**, so the revert applies without
conflict.

**Not recommended:** reverting the glide fix (`e1c6f90b`). B1 shows it changes nothing about the leader zoom, and
GLIDE-TARGET-1's standing invariant test is a genuine improvement. Its owner acceptance is still pending, which
is a reason to *get* the acceptance, not to revert.

**The owner decides.** If he prefers master frozen exactly as it is, the alternative is to make the revert the
branch's first commit — which costs the branch one commit of "undo" before any "do", and leaves master carrying a
rejected feature for the duration.

---

## VERIFICATION

The whole verification for this block, per the spec: **the diff contains no simulation file.**

```
$ git diff --stat master..camera-refactor
 reports/evolution/CAMERA-REFACTOR-0.md | (new)
 reports/evolution/INDEX.md             | 1 +
```

Two files: this report and its INDEX entry. **No source file of any kind is in the diff**, so a fortiori no
simulation file.

**Paths I treated as simulation** (the set that would have required a fingerprint had any been touched):
`client/src/modules/raceStep.js`, `raceCore.js`, `raceBehavior.js`, `raceGovernor.js`, `racePlanner.js`,
`raceBaseSpeed.js`, `raceDynamicsConfig.js`, `raceBehaviorConfig.js`, `durationModel.js`, `raceLengths.js`,
`heroChoreography.js`, `heroCurveGenerator.js`, `rowLayout.js`, `headlessRaceSimulator.js`,
`client/src/modules/parity/**`, `client/src/modules/storage/defaults.js` (mixed — carries engine defaults),
`scripts/sim-fairness.mjs` and the `scripts/exp-*.mjs` harnesses. None appear in the diff.

The three scratch measurement scripts written for this block live in the session scratchpad and are deliberately
**not** committed — they are throwaway instruments, and `scripts/exp-camera-bisect.mjs` already covers the
committed-harness role (its `Math.random` gap is noted in B1 and should be fixed if it is used again).

---

## What I could not determine, and why

1. **The exact arithmetic that produced "the front five span half the world."** The OVERVIEW-FRAMING-1
   measurement harness was a scratch script, not committed with the block, so it cannot be re-read. I can show
   the claim is false, and I can show the mechanism (the resolution-dependent floor) that made its two claims
   look mutually consistent, but I cannot reconstruct the exact miscalculation.
2. **Whether the owner's live leader-zoom regression is the min-visible floor.** The replay says the mechanism
   exists and is lap-asymmetric (0%→5.3% at defaults, 14%→25% at his working zoom), and the bisect says neither
   tagged commit caused it. It does not reproduce at shipped defaults, so the magnitude he saw depends on his
   stored config. The one-race check is named in B1.
3. **Whether the 3.6% mid-glide clamp activity I measured is the same phenomenon as CAMERA-DETOUR-2's 23/23.**
   Different config and different track; both refute "no-op mid-glide", but I cannot say they are one effect.
4. **Whether `docs/CAMERA_DIRECTOR.md` §7 "Known Issues" still describes reality.** I read its structure for the
   canonical-home question but did not audit its 387 lines against the code; that belongs with the doc sweep the
   refactor will need, not with this block.

*(Naming note: the spec refers to `CAMERA.md`. The canonical home is `docs/CAMERA_DIRECTOR.md`, with
`docs/camera-target-architecture.md` and `docs/CAMERA_TUNING_DIAGNOSIS.md` alongside it. Three camera docs is
itself a ONE CANONICAL HOME question for the refactor.)*

---

## What I judged to be over-securing, and what I did instead

The spec asked for this judgement explicitly.

1. **Running the full 3374-test suite, the four CI guards, or a fingerprint.** This commit contains a Markdown
   file and one INDEX line. A green test suite would prove nothing that the diff does not already prove, and the
   guards run in CI. **I ran neither.** I did run the camera suite once — 567 tests, 11 files, all green — but as
   the **C5 measurement** (how much of the camera is actually protected), not as verification. It would have
   been over-securing as verification and is not reported as such.
2. **Re-proving CAMERA-DETOUR-2's "clamp active 23/23 frames".** The spec offers it as a known example of an
   unmeasured assertion. Re-measuring an already-measured finding is securing the same thing a second way. **I
   measured the assertions that had never been measured instead** (C4: five new ones), and reported my clamp
   number only because it came free from the same replay and *extends* the finding to a second config.
3. **A separate replay per B-question.** B1, B2 and C4 all needed the same recorded race through the same
   director. **One recording, three instruments** — rather than three recordings, which would have been three
   chances for the recordings to differ.
4. **What I did *not* trim, because the spec says not to:** diagnose before fixing — this block fixes nothing,
   including the eight defects it names; and one change per commit — one commit, docs only.

---

## PROPOSALS

### P1 — where I would draw the first refactor's boundary

**The prompt: the smallest change that installs the enforced projection and the typed position/lap distinction
without touching the state machine or the transition grammar.**

Two new leaf modules and one mechanical substitution. Nothing in `_pickNextState`, `_transition`, the grammar
branches, or `update()`'s control flow moves.

**(a) `camera/projection.js` — one object that owns world→screen, constructed once per race.**

```js
// makeProjection({ worldW, worldH, canvasW, canvasH, isOpenTrack })
//   .toScreen(worldPt, camZoom)  -> {x, y} canvas px
//   .effZoomX(camZoom) / .effZoomY(camZoom)
//   .frameFrac(worldLen, camZoom) -> fraction of frame width
```

It is the **only** place `bsX`/`bsY`/`OPEN_TRACK_BASE_ZOOM`/`CANVAS_W` appear. Enforced by construction: it takes
`canvasW` as an argument, so a formula cannot mix live canvas pixels with a reference scale — **B2 (3) and the
`overviewMinSpriteFrac` resolution bug become unrepresentable**, and the three `CANVAS_W = 1280` copies (C3 #2)
collapse to one. Call sites replaced: `_computeZoomForSpriteScale`, `_containAnchorInFrame`,
`_applyLeaderForwardBias`, `_closedOffsetY`, `_setClosedTrackTargets`, `_setOpenTrackTargets`,
`_setOverviewGroupTargets`, `_zoomFloorForMinVisible`, `_countVisibleRacers`, `updateCountdown`,
`_recordDetourFrame` — 11 sites, all mechanical.

**(b) `camera/trackPos.js` — two named types instead of one overloaded number.**

```js
racePos(r)   // cumulative t: ranking, progress, gaps, leads. NEVER passed to getPosition.
lapFrac(t)   // ((t % 1) + 1) % 1: geometry, arc closeness, seam. NEVER compared for order.
arcMidpoint(tA, tB)   // the lap-correct midpoint — replaces (tA + tB) / 2 in all four copies
```

Enforced by naming and by two lint-shaped rules the tests can assert: *no raw `.t` arithmetic outside
`trackPos.js`*, and *`getPosition` is only ever called with a `lapFrac`*. This makes **B4 #1-#7 and #10** either
fixed or impossible to write, and removes the redundant `((_camT % 1) + 1) % 1` at six read sites (the shape
already normalizes).

**Why this is the right boundary.** It is the largest change with the *smallest* blast radius: every touched
function is a leaf with dedicated tests (C5 says the leaf maths is well protected), and none of them is in the
orchestration layer that C5 says is protected by convention alone. It also unblocks B3 for free — once the
projection is a parameter rather than an `isOpenTrack` branch, the OVERVIEW rule can be written once for both
topologies, which is what Grundpfeiler 6 requires.

**What it must NOT include, to stay attributable:** no change to `update()`'s branch structure, no change to who
writes `offsetX/offsetY` or in what order, no change to the grammar, no change to any config default. Every
behaviour in Part D must be bit-for-bit identical afterwards — and unlike the engine, that is provable here by
**replaying the recorded seed-5601 race before and after and diffing the per-frame `{zoom, offsetX, offsetY}`
stream.** That replay diff is the camera's honest equivalent of a fingerprint, it costs seconds, and it should
become the standing check for every mechanical camera refactor.

### P2 — delete before you refactor: the zero-risk pass

Before any restructuring, one commit that removes what provably does nothing. It shrinks the surface the refactor
has to carry and it is verifiable by the same replay diff (which must be byte-identical):

- the **17 dead constants** in `CameraDirector.js` (C2) — ~35 lines;
- the dead `_overviewOffsetPx` chain (director field + timing plumbing; the config key stays for migration);
- the dead `_getBattleFocusRacer()` and its test, and the uncalled `exportDetourLog()`;
- the **"OVERVIEW Closed Zoom" slider** (C2) — a control that has done nothing since 2026-06-04 and whose tooltip
  lies about it;
- the duplicate `OPEN_TRACK_BASE_ZOOM` in `openTrackCamera.js` (C3 #1) — re-export from `CameraDirector`, or move
  both into `projection.js` from P1;
- move `lapUtils.js` out of `modules/camera/` (C2 — it contains no camera code) and its 12 tests with it.

Cost: one commit, no behaviour, one replay diff. Benefit: `CameraDirector.js` loses its most misleading 60 lines,
and the next reader stops wondering which of two `OPEN_TRACK_BASE_ZOOM`s is live.

### P3 — fix the diagnostics before trusting them again

Three of the last four camera investigations were steered by instruments that were wrong (C4). Before the next
diagnosis run:

- correct the frame-log legend (`ct` is not 0–1; `t` is cumulative and can be negative) — **B4 #9 is the most
  likely source of the "per-lap t" belief this report had to spend a section refuting**;
- make `targetInFrame` either honest for closed-track OVERVIEW or explicitly `null` there (currently stale 100%
  of the time);
- point `_recordDetourFrame`'s anchor at the state's *actual* pan target, not the top-2 midpoint;
- collapse `getComebackDiagData`'s fifth copy of the COMEBACK defaults onto the director's resolved values (C3
  #5), so the panel cannot show thresholds that are not being applied.

None of these changes a pixel. All of them change what the next diagnosis can be trusted to say.

### P4 — one small, high-value fix the inventory surfaced

**B4 #1/#2 — the photo-finish gate.** It measures a *finishing-order* gap with a *lap-normalized* function, so a
second-placed racer exactly one lap down reads as "dead heat" and triggers a photo-finish shot plus slow motion
at 97% progress. It is two lines (`CameraDirector.js:787` and `:1173`), it is on the live path, its failure is
visible and absurd, and it is exactly the kind of defect the typed `racePos`/`lapFrac` split from P1 would make
unwriteable. Fix it *with* P1, as the proof that the split earns its keep.
