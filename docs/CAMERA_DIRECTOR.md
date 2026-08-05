# The Camera — Architecture Reference

**Last rewritten:** 2026-08-04 (CAMERA-HYGIENE-2), against the code as it stands on `camera-refactor`.

**What this document is FOR:** the shape of the camera — which file owns what, the order things
happen in, and the reasoning that is not visible from any single file. Read it before changing the
camera; it is written for somebody arriving in six months who was not here for any of this.

**What this document is NOT for, deliberately:** the config table. There used to be one here, and by
the time it was next read it listed eight keys that no longer existed and four defaults that were
wrong. Every camera setting has ONE canonical home — its entry in
[`defaults.js`](../client/src/modules/storage/defaults.js) and its tooltip on the Dev Screen, which
sit next to the value they describe and move with it. This file does not repeat them.

**The acceptance test for any change here.** `node scripts/camera-fingerprint.mjs` hashes every
decision the director makes — state, lerp phase, anchor, zoom, both offsets, `camT`, both targets —
on every frame of a seeded race across all ten tracks. Current: **`1db71e7fffc1c9f6`**. A refactor
that tidies code must not move the picture, and that is provable rather than arguable. It covers the
DIRECTOR only; the render path (sprite scale, name-tag layout, drawing) is out of scope by
construction and must be argued another way.

---

## 1. The files, and what each one is FOR

| File | For | Not for |
|---|---|---|
| `CameraDirector.js` | The state machine and the camera's own motion: which shot we are on, and where the camera is this frame. | Anything answerable without a camera — see the rows below. |
| `projection.js` | THE world↔screen mapping. Every zoom formula, guardrail and diagnostic goes through it. | Deciding anything. It converts. |
| `zoomUnit.js` | The corridor unit: turning "how much world is in shot" into a `cam.zoom`, and back. | The per-state settings themselves. |
| `framingConfig.js` | Resolving a raw config into framing numbers, with every default and validation band. | Producing a `cam.zoom` — it knows nothing of the projection or the track. |
| `cameraTimingComputation.js` | Resolving a raw config into timing numbers, with every timing fallback. | Anything spatial. |
| `framingRule.js` | The framing rule: who must stay in frame, where the subject sits, and the zoom ceilings that honour it. | Moving a centre. The guarantees WIDEN; they never steer. |
| `frameGeometry.js` | Rectangle geometry: how far the frame reaches along a direction. | Cameras. |
| `resolveCamera.js` | Viewport clamping: fitting a desired shot inside the world bounds. | Choosing the desired shot. |
| `panTarget.js` | The world point a state centres on, given its subjects. | Zoom. |
| `battleGroup.js` | Who is fighting whom, from positions and thresholds. | Cameras. Pure, stateless. |
| `comebackDetector.js` | Who is coming through the field, from rank history. | Whether the camera cuts to them. |
| `detourRecorder.js` | The per-transition diagnostic frame log. | Anything. It never writes a camera value — that is the whole point. |
| `CameraDirectorDiag.js` | The diagnostics mixin: the HUD panels and the frame-log ring buffer. | Direction. Read-only by design. |
| `lapUtils.js`, `openTrackCamera.js`, `Minimap.js`, `cameraMarker.js` | Lap arithmetic; the open-track base zoom for the render transform; the minimap; the reproducible-moment marker. | — |

**The one-way rule.** The director imports from the modules; no module imports from the director.
`CameraDirectorDiag.js` is installed onto the prototype by `Object.defineProperties` at the bottom of
`CameraDirector.js` precisely so it can use `this.*` without an import cycle.

---

## 2. The state machine

### 2.1 States

| State | Shot |
|---|---|
| `OVERVIEW` | The establishing shot — the widest setting of the same rule every other state runs. |
| `LEADER_ZOOM` | The current leader, framed forward so the pack behind him fills the frame. |
| `BATTLE_ZOOM` | A detected group fighting behind the lead. |
| `COMEBACK_ZOOM` | A racer climbing through the field. |
| `LEAD_CHANGE` | The racer who has just taken the lead, with the racer he passed. |
| `PHOTO_FINISH` | The top two contesting the line. The tightest shot in the race, and it has its own setting — it used to borrow BATTLE's, so the most dramatic moment was never closer than an ordinary battle. |

Two finish sub-phases are flags rather than states, because they are OVERVIEW and LEADER_ZOOM with a
different anchor and a lock: `_inFinishDrama` (the pulse on the winner) and `_inFinishMode`
(FINISH_OVERVIEW, held on a fixed point behind the line so later finishers cross in shot).
`hudState` reports them. That fixed point is `finishOverviewLookbackPx` (default **300** world px
before the line) — moved here from ARCHITECTURE.md's deleted camera section, which was the only
place the knob was named.

### 2.2 The priority chain (`_pickNextState`)

Evaluated in strict order on every `_transition()`:

0. **Photo-finish lifecycle.** Once entered, the director owns the state until the second racer
   crosses (or all have). There is deliberately NO wall-clock cap: under photo-finish slow motion a
   wall-time timer expired during the approach, before the winner crossed, and ate the winner text.
1. **Finish.** First crossing → either PHOTO_FINISH (top two close) or the LEADER_ZOOM drama pulse;
   pulse expired → FINISH_OVERVIEW, which is absolute and admits no further transitions.
2. **Pre-line photo-finish entry**, a once-only latch evaluated in `update()` and consumed here.
3. **Start phase** (`raceElapsed < 3000 ms`) → OVERVIEW.
4. **Post-start hold** (`+ postStartHoldMs`) → LEADER_ZOOM, so BATTLE cannot fire on the natural
   clustering at the gun.
5. **Endgame** (`leaderProgress > endgameThreshold`) → LEADER_ZOOM, with LEAD_CHANGE allowed
   through — a lead swap near the line is the most dramatic moment there is.
6. **The weighted pool** — every eligible candidate, one weighted draw.

### 2.3 What a weight MEANS, because it is not obvious

**A weight is how often you take this shot when it is offered.** 0 means never — the state does not
appear, anywhere, including through the endgame exception. 0.7 means take it about seven times in
ten and otherwise stay on the leader. 1 or more means always, and outranks a lower weight when two
shots compete.

It is an absolute propensity, not a relative share, because a share promises something the camera
cannot deliver: eligibility is not under its control, so if a battle never becomes eligible no weight
can give it 70% of anything.

**Holds gate, weights choose — in that order.** The holds and cooldowns decide whether a shot is
OFFERED; they are what stops the picture flicking between states and no weight can override them. The
weight decides whether an offered shot is TAKEN. A declined offer falls through to LEADER, never to a
second pick — a second pick would make a low weight boost whatever came next.

> **If you are writing a test that says "the gate opened, therefore the state was entered", pin the
> weight.** Otherwise the test is a coin flip. Eighteen were, and the suite failed about one run in
> ten. `ALWAYS_TAKE` in `CameraDirector.test.js` exists for this.

### 2.4 What `update()` does, in order

The order matters and parts of it are load-bearing:

1. Record ranks (comeback detector) and leader tracking.
2. Compute `stateAge`, `minHold`, `stateCap`; evaluate the one-shot photo-finish gate.
3. BATTLE early exits — group dispersed, or a member drifted into P1/P2.
4. LEAD_CHANGE interrupt out of LEADER_ZOOM.
5. The general hold gate → `_transition()`.
6. **T-space entry lerp** — during entry, advance `_camT` along the TRACK toward the target, so the
   camera travels the curve instead of cutting across the infield.
7. **Zoom lerp BEFORE `_setTargets`**, when the T-space lerp is active. Without this, `_setTargets`
   computes the pan at the pre-lerp zoom while the renderer draws at the post-lerp zoom — a per-frame
   mismatch proportional to `camX × Δzoom`, visible as camera jumps whenever `dt` varies.
8. `_setTargets()` — the framing rule (§3).
9. One of three branches writes `offsetX/offsetY`: **glide**, **cut**, or **follow**.
10. Entry-convergence gate → promote `entry` to `tracking`, start the phased observer.
11. `_computePhasedPanTarget()` — lead-in / follow / lead-out advance `_camT` for NEXT frame.
12. Diagnostics, then return `{ zoom, offsetX, offsetY }`.

**`targetOffsetX/Y` are owned exclusively by `_setTargets`.** `_computePhasedPanTarget` only moves
`_camT`. Two writers to the pan target is how the camera acquires a fight with itself.

---

## 3. The framing rule

A state is described by three things and only three:

- **ANCHOR** — who the camera is on. The only genuinely per-state part (`_framingSubjects`).
- **GUARANTEE** — who must stay in frame. Applied as a zoom CEILING: it WIDENS the shot and never
  moves a centre. **Every guarantee measures the room from where the ANCHOR actually sits**, not
  from the frame's centre (CAMERA-ANCHOR-TRUTH-1).

  **WHICH GUARANTEE BINDS WHICH STATE — changed 2026-08-05, CAMERA-COMPANY-ONLY-3.** The
  single-anchor states (LEADER, OVERVIEW, COMEBACK) are limited by **the owner's own setting and the
  COMPANY guarantee, and by nothing else**. The CORRIDOR is no longer their ceiling. **The reason in
  his words: the road is not who matters, the racers are.**

  It was removed because it silently overruled him — his LEADER 1.0 delivered anything from 300 to
  688 world px on Mountainstreet as the road turned (96.2% of frames), which is the restlessness he
  complained about, while the COMPANY guarantee reading his own `minRacersVisible` could not be heard
  underneath it. See Lesson 199.

  The corridor still exists and is still the PAIR states' fallback when fewer than two contenders are
  present — but **measured: that fallback fired on 0 of 11,813 pair frames**, so it is defensive
  rather than load-bearing, and it is kept knowingly on that basis.
- **ZOOM** — how much world is in shot, in standard corridors.

Frame POSITION is not a fourth setting. It follows from "is there anything worth seeing ahead of the
subject?", answered once per state in `framingRule.js`.

The ceilings are combined with `Math.min` in one place, BEFORE the camera moves. That is deliberate:
a limit computed first means the camera never zooms in and then backs out, and in-then-out is
pumping.

### 3.1 The unit

`visibleCorridors` is how much world is across the frame in STANDARD corridors — a fixed reference
width (`referenceCorridorPx`, shipped at 300), not this track's own. That is what makes one number
mean the same picture on a narrow track and a wide one. A track wider than the reference keeps its
own width, so a setting can never ask to crop the corridor it is measured in.

> **The lesson this unit encodes:** a number compared against something on screen must be expressed
> as a fraction of the screen. Four separate defects on this branch were the same mistake.

### 3.2 The across-track pin (`_centrelineAt`)

The camera follows the subject ALONG the track exactly as it always did. Only the component ACROSS
the corridor is replaced by the centreline, because carrying the subject's LANE threw the picture
sideways at every lead change — measured at 62–84 world px, 28–37% of the shot.

**This looks like the camera saga's original defect and is not.** That bug pinned BOTH axes and was
an accident. This pins one and is deliberate. If you are here because "the camera does not follow the
racer", check the ALONG axis first.

### 3.3 Zoom about the anchor

Screen position is `worldPos × effZoom + offset`. When the zoom changes and the offset lerp only
creeps toward its new target, the anchor SLIDES across the frame faster than the pan can follow — it
lurches to the edge and the pan slowly recovers. The follow branch re-applies each frame's zoom delta
around the anchor's world position first, so every zoom source is lurch-free without touching any of
them individually.

### 3.4 What is NOT here any more, and must not come back

- **The containment clamp.** It claimed to be a no-op mid-glide and was measured ACTIVE on 23 of 23
  glide frames, correcting the pan by up to −390 px. It had become a rail steering the pan away from
  the glide it was interpolating. Keeping subjects in frame is the GUARANTEE's job, which widens.
- **The min-visible zoom FLOOR.** A second zoom authority that read where racers happened to be and
  pulled the zoom out around them, fighting the state's own setting and ratcheting frame to frame.
  The concept came back as the COMPANY guarantee — a pre-move limit, which is what it should always
  have been.

The residual trail that the clamp used to hide is the tracking lag. It is measured and reported
rather than papered over. See §6.

---

## 4. Battle detection

`battleGroup.js`. A group qualifies when all four hold at once:

1. **Closeness** — all pairwise arc distances ≤ `battlePulkThresholdT`.
2. **Isolation** — no non-member within `battleIsolationThresholdT` (0 disables).
3. **Positional** — frontmost at rank 3 or worse (P1/P2 are LEADER territory), seed rank span ≤ 3,
   frontmost inside `battleMinTopN`.
4. **Expansion** — greedy, capped by `battleMaxGroupSize` and `battleMaxGroupRankSpan`.

**The unit is arc, not pixels, and this was learned the hard way.** World px meant 1.5% of a lap on
one track and 4.9% on another across the 3072–6144 px worlds, so one knob could not mean the same
closeness twice and rejected every real cluster on the large ones. Raw `t` will not do either: it
accumulates across laps, and two racers either side of the start/finish seam must read as adjacent.

BATTLE **enters and exits on the same measure**, so the hysteresis is one somebody chose.

At entry the group's stable indices are stored and the camera follows the group's LIVE centroid.
Lookups go through `findByIndex`, because `renderInterpolation` hands the camera a fresh spread-copy
of every racer each frame and a stored object reference stops being `===` anything.

---

## 5. Execution order and call sites

```
RaceScreen  (useEffect [raceData, fadeNavigate])
│
├── new CameraDirector(worldW, worldH, isOpenTrack, config, drawnBodyWidthRefPx, shape, trackWidthPx)
│   └── setRandomSeed(seed)          ← once, before the first update(); makes a marked moment replayable
│
└── requestAnimationFrame loop  (one rAF per frame; `cancelled` guards React StrictMode's double-invoke)
    │
    ├── [COUNTDOWN]  camDir.updateCountdown(racers, ts, elapsed, durationMs, cW, cH)
    │
    └── [RACING]     camDir.updateRacePlan(b1Indices)      ← race start; resets the comeback roster
                     camDir.setCameraPlan(plan)            ← once, mid-race, when the heroes are cast
                     camDir.update(renderRacers, ts, raceState, CANVAS_W, CANVAS_H, smoothDt)
                     camDir.detectBattleGroup(st.racers)   ← render only, for the battle-focus darkening
                     ctx.setTransform(...)
```

`update()` is called exactly once per frame, from `RaceScreen/index.jsx`. `updateConfig(config)`
live-applies a new config without reconstruction; it takes effect on the next `_transition()`.

**`detectBattleGroup` is public on purpose.** The render path used to reach into `_detectPulkGroup`,
and a render file reaching into an engine private is the exact shape the mint tripwire exists to
catch. The call site uses optional chaining, so a rename would fail silently — there is a contract
test at both ends.

---

## 6. What is protected by tests, and what only by convention

**The render path is no longer convention-only.** `scripts/render-fingerprint.mjs`
(**`a10bf3f293f2ee06`**) hashes the SEQUENCE of draw calls — sprite placement, text, styles,
transforms and layer order — at six fixed frames across all ten tracks, by driving the real
`renderRaceFrame()` through a recording context. It covers what the camera fingerprint structurally
cannot: what actually reaches the canvas. Run it on any block whose diff can reach a `ctx.` call.

**Protected — a change breaks a test:** the zoom unit's invariance; the six-state framing table;
corridor / pair / company guarantees on every heading; the company guarantee inside its region; the
lateral guarantee's arithmetic and its one-dimensionality; the min-draw floor and its
zoom-independence; name-tag layout, occlusion and the start-formation exception; the config loader's
defaults-under / stored-over / unknown-ignored rule; every framing validation band and its
reject-not-clamp behaviour; the engine-input list; the detour recorder's non-interference; the
render path's `detectBattleGroup` contract; and every camera decision at once, via the fingerprint.

Added by CAMERA-ANCHOR-TRUTH-1: **the state machine's five transition reasons and its hold gate**
(`decideTransition` returns `{action, reason}`, and precedence — which was behaviour hiding in the
order of five OR-ed conditions — is pinned); **the photo-finish gate predicate**; and **the OVERVIEW
time-constant defaults**, with the reason for each attached to the assertion.

**Convention only — nothing fails if it breaks:**

- **The tracking lag ITSELF.** Still unasserted as a quantity — no test fails if the camera trails
  further. But the two entries that used to sit here have moved up into the protected list
  (CAMERA-ANCHOR-TRUTH-1): the `trackingTC` DEFAULTS are now pinned with their reasons, and the
  transition REASONS are now return values. Current figures, re-measured with
  `scripts/tracking-lag.mjs`: LEADER 2.05 pp, OVERVIEW 6.78 pp (was 13.78 at `trackingTC` 1.5),
  every other state pooled 3.78 pp.
- **Slow motion.** Physics-time scaling in the render loop has no camera-side test.
- **The HUD overlay and every diagnostic flag.** Read-only by design, unasserted by consequence.
- **The world-bounds clamp.** Named as the cause of two measured residuals; nothing pins it.
- **The rasteriser, the artwork, and the sprite blit.** What is left of the render hole after
  RENDER-FINGERPRINT-1.
- **Particles and surface trails.** Their draw calls run but the render fingerprint's harness never
  fills their buffers, so both layers are no-ops in it. Found by a sabotage that swapped them and
  did NOT move the hash.

---

## 7. Open items

- **The tracking lag** — measured, unfixed, the owner's call.
- **The world-bounds clamp** — cause of the 0.601-vs-0.66 framing residual and part of the lateral
  residual; still unexamined.
- **The corridor guarantee vs. the anchor position** — it sizes assuming a centred anchor while the
  forward bias moves it.
- **`targetInnerFramePct`** is live but has no Dev Screen control, against the project's
  everything-is-UI-configurable principle.
- **Three code fallbacks disagree with the shipped defaults** (`outcomePhaseThreshold` 0.75 vs 0.65,
  `comebackMinStartGap` 0.4 vs 0.25, `comebackMaxCurrentRankPct` 0.1 vs 0.2). Only a bare-config
  caller sees the fallbacks, so this is latent rather than active.
- **`START_PHASE_DURATION = 3000`** is a constant, not a control, and CAMERA-TAGS-1 measured it about
  five seconds short of when the field actually spreads.
