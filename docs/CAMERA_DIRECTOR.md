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
on every frame of a seeded race across all ten tracks. The value it must match is in
[docs/fingerprints.json](fingerprints.json) — this document deliberately does not carry a copy. A refactor
that tidies code must not move the picture, and that is provable rather than arguable. It covers the
DIRECTOR only; the render path (sprite scale, name-tag layout, drawing) is out of scope by
construction and must be argued another way.

---

## 1. The files, and what each one is FOR

| File                                                                 | For                                                                                                                                                                 | Not for                                                                   |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `CameraDirector.js`                                                  | The state machine and the camera's own motion: which shot we are on, and where the camera is this frame.                                                            | Anything answerable without a camera — see the rows below.                |
| `projection.js`                                                      | THE world↔screen mapping. Every zoom formula, guardrail and diagnostic goes through it.                                                                             | Deciding anything. It converts.                                           |
| `zoomUnit.js`                                                        | The corridor unit: turning "how much world is in shot" into a `cam.zoom`, and back.                                                                                 | The per-state settings themselves.                                        |
| `framingConfig.js`                                                   | Resolving a raw config into framing numbers, with every default and validation band.                                                                                | Producing a `cam.zoom` — it knows nothing of the projection or the track. |
| `cameraTimingComputation.js`                                         | Resolving a raw config into timing numbers, with every timing fallback.                                                                                             | Anything spatial.                                                         |
| `framingRule.js`                                                     | The framing rule: who must stay in frame, where the subject sits, and the zoom ceilings that honour it.                                                             | Moving a centre. The guarantees WIDEN; they never steer.                  |
| `frameGeometry.js`                                                   | Rectangle geometry: how far the frame reaches along a direction.                                                                                                    | Cameras.                                                                  |
| `resolveCamera.js`                                                   | Viewport clamping: fitting a desired shot inside the world bounds.                                                                                                  | Choosing the desired shot.                                                |
| `panTarget.js`                                                       | The world point a state centres on, given its subjects.                                                                                                             | Zoom.                                                                     |
| `battleGroup.js`                                                     | Who is fighting whom, from positions and thresholds.                                                                                                                | Cameras. Pure, stateless.                                                 |
| `comebackDetector.js`                                                | Who is coming through the field, from rank history.                                                                                                                 | Whether the camera cuts to them.                                          |
| `transitionDecision.js`                                              | Whether the camera changes state this frame, and why — as a value a test can read.                                                                                  | Performing the transition. It decides; it does not act.                   |
| `finishPhase.js`                                                     | HOW A RACE ENDS: the whole finish sequence — the approach gate, the fork between the photo finish and the drama, both ends, and the three hold-gate bypasses. Pure. | Owning any of the six finish latches. It answers; the director remembers. |
| `detourRecorder.js`                                                  | The per-transition diagnostic frame log.                                                                                                                            | Anything. It never writes a camera value — that is the whole point.       |
| `CameraDirectorDiag.js`                                              | The diagnostics mixin: the HUD panels and the frame-log ring buffer.                                                                                                | Direction. Read-only by design.                                           |
| `lapUtils.js`, `openTrackCamera.js`, `Minimap.js`, `cameraMarker.js` | Lap arithmetic; the open-track base zoom for the render transform; the minimap; the reproducible-moment marker.                                                     | —                                                                         |

**The one-way rule.** The director imports from the modules; no module imports from the director.
`CameraDirectorDiag.js` is installed onto the prototype by `Object.defineProperties` at the bottom of
`CameraDirector.js` precisely so it can use `this.*` without an import cycle.

---

## 2. The state machine

### 2.1 States

| State           | Shot                                                                                                                                                                                           |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OVERVIEW`      | The establishing shot — the widest setting of the same rule every other state runs.                                                                                                            |
| `LEADER_ZOOM`   | The current leader, framed forward so the pack behind him fills the frame.                                                                                                                     |
| `BATTLE_ZOOM`   | A detected group fighting behind the lead.                                                                                                                                                     |
| `COMEBACK_ZOOM` | A racer climbing through the field.                                                                                                                                                            |
| `LEAD_CHANGE`   | The racer who has just taken the lead, with the racer he passed.                                                                                                                               |
| `PHOTO_FINISH`  | The top two contesting the line. The tightest shot in the race, and it has its own setting — it used to borrow BATTLE's, so the most dramatic moment was never closer than an ordinary battle. |

Two finish sub-phases are flags rather than states, because they are OVERVIEW and LEADER_ZOOM with a
different anchor and a lock: `_inFinishDrama` (the pulse on the winner) and `_inFinishMode`
(FINISH_OVERVIEW, held on a fixed point behind the line so later finishers cross in shot).
`hudState` reports them. That fixed point is `finishOverviewLookbackPx` (world px
before the line) — moved here from ARCHITECTURE.md's deleted camera section, which was the only
place the knob was named.

**The finish MOVE is one motion (FINISH-MOTION-1).** At the hand-off to FINISH_OVERVIEW the camera
glides — pan and zoom together, on one smoothstep ease, over `finishOverviewZoomOutDurationMs` — from
the framing it was in to the lookback framing. It is deliberately outside `transitionGrammar`: the
finish is an authored moment, and a 'cut' finish is not a thing anyone wants. It has no T-space
anchor; releasing `_camT` is what keeps the winner's runout from dragging the camera past the line,
structurally rather than by a special case. Before this, the finish was exempt from the grammar and
the pan target stepped **2708 px in one frame** while the zoom eased separately.

**The whole ending is stated in one place: [`finishPhase.js`](../client/src/modules/camera/finishPhase.js).**
Approach → the moment (photo finish OR drama, never both) → aftermath, with every transition carrying
a machine-readable reason. Six latches drive it; five of them decide only which shot (plus the HUD
label) and `_inFinishMode` is the one that also FRAMES. If you are changing how a race ends, read
that file and `reports/evolution/FINISH-SEAM-1.md` first — the latter lists every knob and what is
and is not covered by a test.

### 2.2 The priority chain (`_pickNextState`)

Evaluated in strict order on every `_transition()`:

0. **Photo-finish lifecycle.** Once entered, the director owns the state until **the two contenders
   the shot is following are home** (or everybody is — the safety net). Not `finishedCount >= 2`:
   measured, those differ by 6–57 frames on every finishing track and the second racer across is
   usually neither of the pair, so the old condition could end the shot before the pair it exists to
   show had both crossed. There is deliberately NO wall-clock cap: under photo-finish slow motion a
   wall-time timer expired during the approach, before the winner crossed, and ate the winner text.
1. **Finish.** First crossing → either PHOTO_FINISH (top two close) or the drama pulse. **Both then
   PAUSE** for `finishDramaDurationMs` before the zoom-out — the drama from the crossing, the photo
   finish from the moment its contenders are home. One dial for both; 0 means no held frame at all.
   Then → FINISH_OVERVIEW, which is absolute and admits no further transitions.
2. **Pre-line photo-finish entry**, a once-only latch evaluated in `update()` and consumed here.
3. **Start phase** (`raceElapsed < 3000 ms`) → OVERVIEW.
4. **Post-start hold** (`+ postStartHoldMs`) → LEADER_ZOOM, so BATTLE cannot fire on the natural
   clustering at the gun. The `+` is the whole point: it is a DURATION added to the 3 s overview
   above, not a time from the gun, so the hold ends at 3000 ms plus the value. This is the only
   place that key is read — the race planner read it too, as an absolute time, until
   POST-START-HOLD-UNIFY removed that reading.
5. **Endgame** (`leaderProgress > endgameThreshold`) → LEADER_ZOOM, with LEAD_CHANGE allowed
   through — a lead swap near the line is the most dramatic moment there is.

   **THIS LOCK DOES NOT ACTUALLY OWN THE ENDGAME**, and it is worth knowing because it looks as
   though it does. The branch is only consulted when `decideTransition` permits a transition at all,
   and a shot entered just before the threshold holds its own gate across it. Measured over sixteen
   races (two tracks x eight seeds): the window from the threshold to the first crossing is 40–48%
   PHOTO_FINISH — its pre-line gate fires at `photoFinishLeadProgress` — and most of the rest
   belongs to whichever shot was already running. **This is exactly why the run-in (§3a) bounds the
   zoom of whatever state is running instead of trying to be a state**: a state chosen here reaches
   only about a sixth of the endgame, measured.

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

**A state in `FRAMING_BY_STATE` is described by three things and only three** — and the qualifier is
not decoration. The table has SIX rows (LEADER_ZOOM, LEAD_CHANGE, BATTLE_ZOOM, COMEBACK_ZOOM,
OVERVIEW, PHOTO_FINISH), which are exactly the six members of `CAM_STATE`. **Two things this document
calls "states" elsewhere are not in it, and neither is described by the three below:**

- **COUNTDOWN is not a camera state at all.** It is a race PHASE. The opening runs through
  `updateCountdown` and `startCeremony.js`, whose geometry is the track's extent easing to the
  field's extent — a different mechanism with a different vocabulary, not a row that was forgotten.
- **FINISH_OVERVIEW is not in `CAM_STATE` either.** It is a MODE — `_inFinishMode`, read by four
  framing sites — and `hudState` reports it as if it were a state, which is where the name in §2 and
  §8 comes from. It has no row here, so `framingFor` falls through to **LEADER_ZOOM's framing**. That
  fallback is a default, not a decision: nobody chose LEADER's anchor and guarantee for the finish
  hold, and this document should not be read as saying they did. **It is genuinely undescribed, and
  writing that down is more useful than inventing a description for it.**

The three things:

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

  **THE PHOTO FINISH IS NO LONGER A PAIR SHOT — CONTENDER-ZOOM-1, shipped 2026-08-14 and default ON
  via `contenderZoom`.** The framed set was `ordered.slice(0, 2)` in three places — the gate, the
  capture and the consumer — and was therefore exactly two racers, always, while 26 of 27 measured
  photo finishes had more than two racers level at entry. It is now the **contender set**: everyone
  who is BOTH nearly level with the leader AND on a free lane. **Neither condition is a new number.**
  "Nearly level" is one body length, which is `pairContact`'s own along-track touch distance for two
  equal racers; "free lane" is `halfWidthA + halfWidthB` across the track, the engine's own overlap
  test, with `rowLayout`'s unit that one `physicalY` is `trackWidth / 2` world px. The race is
  LANE-FREE, so "same lane" had to be geometric — there are no discrete lanes to read.

  **Captured once at entry, never re-sorted**, which is what FINISH-PAIR-1 bought: a set re-derived
  every frame moves the picture on every swap. In practice the set is **2, 3 or 4** racers.
  `contenderGuarantee` takes the minimum `pairGuarantee` over every pair in the set, so **at n = 2 it
  IS `pairGuarantee`, to the bit** — which is why the OFF arm is byte-identical to what shipped
  before.

  **AND THE CORRIDOR RUNS THE OTHER WAY HERE.** Everywhere else in this file the corridor is a
  GUARANTEE — a floor on how much world is in shot, composed with `Math.min` on the zoom. In the
  photo finish it is also a **CAP**: the shot is never *wider* than the road, composed with
  `Math.max`. Two opposite senses of one word, which is why the GLOSSARY now carries both.

  **The cap ARRIVES rather than appears.** Its scope is `state === PHOTO_FINISH`, and a state change
  is instantaneous, so it used to engage in a single frame and take the target from 2.47 to 10.02 —
  the jump the owner saw as the camera leaping. It is now blended in over `corridorCapArriveMs`
  (1500 ms), in log space, so the same limit arrives as a move. Setting it to 0 restores the jump.

  **The contenders WIN if the two conflict**, because the first rule is that every participant stays
  visible. The cap is a ceiling on the zoom, the contender guarantee a floor, and the floor is
  applied last.

  **One diagnostic defect is recorded here because it cost three reports and two builds:** `_binding`
  was computed as the argmin over `_ceilings` while the cap was applied to `guaranteed` afterwards,
  so on every frame the cap decided the shot the probe still named whichever ceiling was smallest.
  A diagnostic that misattributes authority is worse than none. It now names `corridor-cap` and
  `guarantee-after-cap` explicitly.

- **ZOOM** — how much world is in shot, in standard corridors.

Frame POSITION is not a fourth setting. It follows from "is there anything worth seeing ahead of the
subject?", answered once per state in `framingRule.js`.

The ceilings are combined with `Math.min` in one place, BEFORE the camera moves. That is deliberate:
a limit computed first means the camera never zooms in and then backs out, and in-then-out is
pumping.

### 3.1 The unit

`visibleCorridors` is how much world is across the frame in STANDARD corridors — a fixed reference
width (`referenceCorridorPx`), not this track's own. That is what makes one number
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

## 3a. The run-in — the endgame's zoom, on top of the framing rule (RUNIN-OWNS-1, 2026-08-12)

**What the owner asked for:** when the run-in begins, open far enough that the finish is visible,
then come back in continuously to the close shot, keeping the line in frame the whole way — so he
can see how much race is left and whether anyone still has a chance.

**It owns the FRAMING of the endgame, not its state slot,** and that distinction is the design. The
run-in does not compete for which shot is running; it READS whichever one is and bounds that shot's
zoom. Switched by `runInShot`.

**The window** is `endgameThreshold` to the first crossing. Both ends already existed: the first is
where the director has always declared the endgame, the second is where the finish sequence takes
over the picture with its own authored moves.

**It composes the whole window.** The engagement is performed as a GLIDE, because the framing it
asks for changes in both quantities at once on that frame. Measured without it, the frame goes empty
for a handful of frames on six of ten tracks, every one at run-in progress 0.006–0.016. The glide
moves pan and zoom on one ease, which is what makes a large zoom change safe here as at every state
change.

**The glide runs on `runInOpenMs`, its own key**, in the ending controls beside the post-crossing
zoom-out it borrowed for one day. Two motions at different moments for different reasons: coupling
them meant tuning either moved the other. At the shipped 1250 ms the opening is calm without costing
the line — in frame 86.6% of the run-in, first in shot 1.1 s after the window opens — against 500 ms
(hectic) and 3000 ms (73.4%, line arriving at 2.5 s). The post-crossing zoom-out measures 3000 ms at
every pace, which is the proof they are independent.

**The two bounds, and neither is a new number:**

1. **The line** — `pointGuarantee` from the anchor's own place in the frame to the finish, i.e.
   `room / distance`. Wide when the finish is far, tightening by itself as the leader closes. There
   is no curve and no knob; the division is the whole of it.
2. **The active state's own zoom** — already the first term of the `Math.min` every shot is composed
   with, so it needed no code at all. A leader shot closes to the leader zoom, a photo finish to the
   photo-finish zoom, and the run-in can never tighten past the shot underneath it.

**Nothing is handed over.** As the leader arrives the line's requirement passes above the state's
setting, stops being the smallest term, and what is left is the shot that was always there.
`hudState` and the photo-finish slow motion are untouched.

**ONE THING IS NOT UNTOUCHED: THE ANCHOR TRAVELS.** While the run-in composes, the subject starts at
the MIRROR of its own placement — behind centre, so most of the frame lies toward the finish — and
travels back to that placement as the leader closes, arriving exactly there at the line. The same
progress measure drives it and the zoom, so the shot opens-and-back and tightens-and-forward as one
motion, and the crossing shot is the ordinary shot with no seam.

It invents no number: the end of the travel is the framing table's own answer, the start is that
answer mirrored about the centre. A CENTRED state therefore does not move at all, which is why the
photo finish keeps its framing. It was also where the width was going — a leader at
`leaderForwardFrac` leaves only a third of the frame ahead of him toward the line, so the shot had to
be **3.01x** wider than the distance demands (Searound 2.15x). `_forwardFracNow()` is the single
place that answer lives, and **the guarantees and the pan bias must both read it** — while they
disagreed, every guarantee sized the shot for an anchor the pan did not deliver.

**The line is a guaranteed SUBJECT, so it uses `targetInnerFramePct`**, not the company margin — the
rule §3 already states. That is what "well in frame" means here: at the company margin the shot is
minimal to 1.05x, so the line sits ON the edge where the tracking lag alone pushes it out.

**Measured on ALL TEN TRACKS (3 seeds each):** the run-in composes **100%** of the endgame window and
the line is in frame on **73.4%** of those frames, against a no-feature baseline of **9.8%**. The
line is first in shot a median **2.5 s** after the window opens, and the opening itself takes
**2.9 s**. **0 empty frames on every track.**

**ONLY THE LINE DECIDES THE WIDTH, and that was measured rather than assumed.** At the widest frame
of every one of the nine finishing tracks the binding term is the LINE; over the whole run-in it
binds 86–98% of frames and the state's own zoom the rest. **The field guarantee is `Infinity`
throughout** — it retires after the ceremony — and the company guarantee never binds at the widest
frame. Field coverage is reported as INFORMATION (94.6% of composed frames hold
`minRacersVisible` or more) and bounds nothing.

**THE COST, and it is what to watch.** The pull-out is whatever the line requires, so on closed
tracks whose finish is most of a lap away at the threshold it still reaches the whole world
(city-circuit and ice-track 100%; dirt-oval 72%, luger-hill 40%, river-run 21%). The zoom at the
crossing is within **0.03%** of the feature being off on most tracks and **3.58%** at worst
(space-sprint).

**TWO ODD MOVEMENTS, ONE MECHANISM.** The delivered zoom is a `Math.min` over ceilings, so where the
ARGMIN changes the zoom is continuous but its RATE is not — and the pan lag is proportional to that
rate, so the subject's screen position reverses direction at the corner. Traced on luger-hill seed 9:
the framing subject drifts to (910, 490) and returns, turning at the exact frame the binding term
goes line → state. **A tighten-rate limit was built against it and measured out**: the rate derivable
from `runInOpenMs` barely moves the corner (221 → 192 px) and every rate that does move it costs the
crossing shot an order of magnitude (3.58% → 23.83% or worse). A rate limit IS a delay in arriving,
and the crossing is where arrival is due. See RUNIN-PACE-1 §3.

**AND ONE WIDTH THAT IS NOT THE LINE'S.** On ice-track the line asks for 68-87% of the world and
**`resolveCamera` delivers 100%** — it steps the zoom down 10% at a time trying to bring the pan
target inside `innerFramePct`, the world-bounds clamp makes that impossible, and the loop stops only
at the projection floor with `targetInInnerFrame` still false. The widening achieves nothing. It is
pre-existing and fires wherever a pan target sits near the world edge at a wide shot; repairing it
means changing `resolveCamera`, which is the last step for every state on every frame. Not done
here — see RUNIN-PACE-1 §2.

---

## 4. Battle detection

`battleGroup.js`. A group qualifies when all four hold at once:

1. **Closeness** — all pairwise arc distances ≤ `battlePulkThresholdT`.
2. **Isolation** — no non-member within `battleIsolationThresholdT` (zero disables it).
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

### The camera check — four commands, and they are runnable

Every command below was RUN on 2026-08-06 at commit `e8db4bf1` on an OTHERWISE IDLE machine, and the
output is pasted verbatim, not summarised. A documented command that nobody has executed is a guess
about your own repository.

**A correction to the costs first, because it matters more than the numbers.** The durations in the
first version of this section (~223 s, ~224 s, ~34 s) were measured while a twenty-run test study was
saturating the CPU, and were then presented as what the commands cost. They are 5–6× the idle
figures below. A duration measured under contention and quoted as a cost is not a cost.

**The pasted output is real, with ONE substitution.** Every line, count and frame number is exactly what the command printed; the HASHES are replaced by a pointer. That is not a hedge — it is the same rule this document follows everywhere else: a current fingerprint value has exactly one home, and a transcript in a document is still a copy. Run the command to see the digits.

**1. Did any DIRECTOR decision move?**

```
$ node scripts/camera-fingerprint.mjs
CAMERA <camera value — see docs/fingerprints.json> (seed=5601 camSeed=1439767152, 10 tracks, 40 racers, default config)
  city-circuit     <per-track hash>  5046 frames
  dirt-oval        <per-track hash>  5588 frames
  garden-path      <per-track hash>  12001 frames
  ...
  space-sprint     <per-track hash>  3777 frames

  Covers the DIRECTOR only — state, phase, anchor, zoom, offsets, camT, targets.
  Not the render path (sprite scale, name-tag layout, drawing).
[ra-elapsed-ms 35414] (35.4s)
```

**The flags that matter:** `--quiet` prints the combined hash alone and nothing else, which is what
you want in a script. Without it you get the per-track breakdown above, which is what you want when
the hash HAS moved — it tells you on which of the ten tracks, and a single track moving means
something quite different from all ten moving. `--company-only` is a PROBE and its output is
explicitly not a baseline; the header says so on the line.

**2. Did anything that reaches the CANVAS move?**

```
$ node scripts/render-fingerprint.mjs
RENDER <render value — see docs/fingerprints.json> (seed=5601 camSeed=1439767152, 10 tracks, 40 racers,
  frames [0, 90, 600, 1500, 2400, 3300, 3450, 3580, 3650, 3900, 4300, 4520, 4750, 5100, 5300, 5450] of 5600)
  ...
  space-sprint     <per-track hash>  227176 ops / 16 frames

  Covers the DRAW CALL SEQUENCE — sprites, text, styles, transforms, order.
  Blind to the rasteriser and to the artwork itself (sprites are hashed by identity).
[ra-elapsed-ms 33442] (33.4s)
```

`--coverage` prints which of the sixteen sample frames landed in the finish on each track. The
`[warmup] … FAILED: Image is not defined` lines are EXPECTED and not an error: there is no DOM image
loader in the harness, so sprites are hashed by identity instead of by pixels — which is exactly the
blindness the next paragraph is about.

**WHAT THE RENDER FINGERPRINT DOES NOT SEE**, stated here because a change detector people trust is
more dangerous than one they do not:

- **The rasteriser and the artwork.** Sprites are hashed by IDENTITY, not by pixels. Replace the
  artwork inside `duck.png` and this hash does not move.
- **Particles and surface trails.** Their draw calls run, but the harness never fills their buffers,
  so both layers are no-ops in it. Found by a sabotage that swapped them and did NOT move the hash.
- **Anything between two sample frames.** Sixteen frames out of 5600. A flicker lasting less than a
  sample interval is invisible to it by construction.
- **`garden-path`'s ending** — that track never finishes inside the window, so the late sample points
  measure nothing there. `--coverage` prints the matrix.
- **Slow motion**, and every diagnostic overlay: read-only by design, unasserted by consequence.

**3. Do the camera's own units still hold?**

```
$ cd client && npx vitest run src/modules/camera
 Test Files  17 passed (17)
      Tests  721 passed (721)
   Duration  17.06s
```

**4. How far behind its subject does the camera sit?** `node scripts/tracking-lag.mjs` — output in
the next section. ~7 minutes; it is the only one of the four you would not run casually.

**The expected fingerprint values are deliberately NOT printed in this document.** There is exactly
one home for them — [docs/fingerprints.json](fingerprints.json) — and `node scripts/check-fingerprints.mjs`
fails if a current value appears anywhere else. The hashes inside the pasted output above are part of
a verbatim transcript of one run on one commit, which is a historical record, not a live claim.

### The tracking lag, as measured today — and it had drifted

<!-- MEASURED: tracking-lag (median/p95 pp per state) @ MINIMAP_TAIL_SHA 2026-08-15 depends=client/src/modules/camera/ -->

**RE-STAMPED AGAIN FOR MINIMAP-TAIL-1, on exactly the argument below.** That block washes the
stretch of band behind the finish on open tracks — the same file, the same reason, the same
unchanged table. The paragraph that follows is the whole justification and it did not weaken:
`Minimap.js` is still not in `tracking-lag.mjs`'s load closure.

**RE-STAMPED, NOT RE-MEASURED, FOR MINIMAP-MARKS-1 — and the reason is a fact, not a judgement.**
That block added start and finish marks to `client/src/modules/camera/Minimap.js`, which is inside
this stamp's `depends=` directory, so the guard tripped as designed: it deliberately cannot tell a
change that matters from one that does not, and says so in its own header. **What settles it here is
that `scripts/tracking-lag.mjs` cannot reach the file.** Its load closure is seven files —
`lib/raceDriver.mjs` and, through it, `defaults.js`, `EditorShape.js`, `CameraDirector.js`,
`raceCore.js`, `durationModel.js`, `rowLayout.js`, `racer-types/index.js`, plus `frameGeometry.js`
and `framingRule.js` imported directly — and `Minimap.js` is in none of them. The only importers of
`Minimap.js` are the DRAW path (`renderRaceFrame.js`) and two consumers of its panel CONSTANTS
(`overlayGeometry.js`, `WinnerCard.test.jsx`), and those constants did not change. A file the
measurement never loads cannot move its numbers. **The table below is unchanged from `a2cb638b`;
only the stamp moved.**

**RE-MEASURED ON THE SHIP (`eea0acf2`), because neither branch's table describes the merged tree.**
The run-in and RESOLVE-CONVERGE-1 were measured apart and shipped together, so the numbers below are
taken on the merge itself rather than carried over from either side. **One cell moved and it is the
smallest one on the page: LEAD_CHANGE median 4.56 → 4.55 pp.** Every other frame count, median and
p95 is identical to the digit. That single hundredth is the convergence repair, and it is where it
should be — the repair acts on ice-track alone (per-track camera hash `a083c940ba3400c7` →
`54dc4193568e9c91`, the other nine byte-identical), so a pooled figure over ten tracks is the only
place it could show at all, and it shows this small.

**RE-MEASURED FOR RESOLVE-CONVERGE-1, and nothing moved at all.** That block stops `resolveCamera`
widening when widening brings the pan target no closer to the inner frame. It is the last step of
every state on every frame, so it had to be re-measured rather than argued about — but on the shipped
configuration the loop never takes a step in the first place (172226 frames across ten tracks and
three seeds, zero firings), so the expectation was a null result and the measurement is what makes it
one. **Every frame count, median and p95 in the table below is identical to the digit.**

**RE-MEASURED FOR RUNIN-PACE-1, and LEAD_CHANGE's tail is the price of the owner's own pace.** The
opening moved 3000 ms -> **1250 ms** at his request, and the lag is proportional to the zoom rate, so
**LEAD_CHANGE p95 goes 10.72 -> 22.17 pp** by construction. What it buys is the line: in frame 73.4%
-> **86.6%** of the run-in, first in shot 2.5 s -> **1.1 s**. Measured at 1000 / 1250 / 1500 ms the
p95 reads 23.14 / 22.17 / 21.12, so the trade is smooth and his 1250 sits in the middle of it.
PHOTO_FINISH is unchanged at 29.80 — that tail is the closing corner, which §3 of the report shows
cannot be removed by a rate limit without breaking the crossing shot.

**RE-MEASURED FOR RUNIN-WIDTH-1, and the slower pull-out is visible here as one number.**
**LEAD_CHANGE's p95 falls 25.19 → 10.72 pp** — the tail the previous cut introduced is gone, because
the lag is proportional to the ZOOM RATE and the opening now takes 2.9 s instead of 0.5 s. That is
the owner's "hectic", measured. BATTLE improves with it (11.01 → 10.10); LEADER and OVERVIEW are
unchanged; PHOTO_FINISH is unchanged at 29.80, which says the remaining tail is at the CLOSE and not
the opening. COMEBACK_ZOOM swings on a small and shrinking sample (695 → 395 frames) and should not
be read as a trend.

**The frame counts fell again and that is the glide, not the states**: this instrument samples the
TRACKING phase only, and the engagement glide now occupies 3 s of it rather than half a second. No
state decision changed — the run-in adds no state.

**RE-MEASURED FOR RUNIN-GLIDE-1, and the tails are the price of the run-in composing the whole
endgame again.** The previous cut bought its flat table by starting the run-in late; this one starts
it at the threshold by instruction, so the shot is moving through more of the endgame and the states
it moves through show it — **LEAD_CHANGE p95 7.15 → 25.19** and **PHOTO_FINISH p95 33.59 → 29.80**
(that one IMPROVED, because the anchor travel means the photo finish no longer has to be opened as
far to hold the line). OVERVIEW is untouched, as always: it is not eligible inside the endgame.

**The medians barely move** (LEADER 3.85 → 4.05, LEAD_CHANGE 4.46 → 4.59, BATTLE unchanged), so these
are tails and not a steady lag. **COMEBACK_ZOOM's median falls 13.73 → 2.01** — the same effect with
its sign reversed: a comeback shot running into the endgame is held wider, and a wider shot has a
smaller lag as a fraction of the frame.

**THE FRAME COUNTS MOVED, and that is the glide rather than the states.** BATTLE 9668 → 9586,
COMEBACK 755 → 695, LEAD_CHANGE 8089 → 7969: this instrument samples the TRACKING phase only, and
the run-in's engagement glide spends its first half-second in the glide phase instead. No state
decision changed — the run-in adds no state.

**RE-MEASURED AGAIN FOR RUNIN-MINIMAL-1, AND THE LATER START GAVE FIVE STATES BACK.** Making the
run-in wait until the line fits inside OVERVIEW's width means it no longer touches the shots that
run earlier in the endgame, and the figures say so exactly: **BATTLE_ZOOM, COMEBACK_ZOOM,
LEADER_ZOOM and LEAD_CHANGE are all back to their pre-run-in values to two decimals**, including
LEAD_CHANGE's p95, which the first cut had tripled (7.10 → 21.81 → **7.15**), and COMEBACK_ZOOM's
median, which it had moved by a factor of four (13.73 → 3.06 → **13.73**). OVERVIEW never moved.

**THE WHOLE COST IS NOW IN ONE ROW: PHOTO_FINISH's p95, 16.51 → 33.59 pp.** That is not a surprise
and it is not hidden — it is where the run-in now lives. It engages late, often after the photo
finish has begun, and holds that shot about twice as wide as its own setting so the line stays in
frame; a shot whose zoom is moving is a shot the pan trails. **The median barely moves (5.68 →
5.71), so this is a tail, not a steady lag.** It is the number to judge the trade by, and it is the
thing to watch on screen.

The block below is the previous re-measurement and is kept because its verdict still stands.

**RE-MEASURED FOR RUNIN-OWNS-1, AND THIS IS WHERE THE RUN-IN'S COST SHOWED UP.** The run-in bounds
the zoom of whatever shot is running through the endgame, so it moves the zoom inside states that
were previously steady — and a moving zoom is exactly what this instrument measures the camera
trailing.

**THE FRAME COUNTS ARE IDENTICAL IN EVERY STATE** (9668 / 755 / 17788 / 8089 / 4303 / 1865, all
unchanged), which is the first thing to check and the proof that the run-in changed no state
decision anywhere. Only the LAG inside states moved.

**The medians barely move; the p95 — the tail, which is where a lurch shows up — moves a lot:**

| state         | median           | p95                     |
| ------------- | ---------------- | ----------------------- |
| LEAD_CHANGE   | 4.45 → 4.46      | **7.10 → 21.81** (3.1×) |
| PHOTO_FINISH  | 5.68 → 4.87      | **16.51 → 27.73**       |
| BATTLE_ZOOM   | 5.72 → 5.71      | 9.98 → 11.03            |
| LEADER_ZOOM   | 3.85 → 3.79      | 8.61 → 8.88             |
| COMEBACK_ZOOM | **13.73 → 3.06** | 16.22 → 16.50           |
| OVERVIEW      | 2.65 → 2.65      | 16.00 → 16.00           |

**READ IT AS A TAIL, NOT AS A REGRESSION IN TRACKING.** The endgame window is a small fraction of a
60-second race, so the frames the run-in touches land almost entirely in each state's tail. The
camera trails further during the seconds it is opening or closing the shot, and it trails no
differently at any other time — which is why the medians are flat. OVERVIEW is untouched in both
figures because it is not eligible inside the endgame.

**COMEBACK_ZOOM's median improving from 13.73 to 3.06 is the same effect with its sign reversed**: a
comeback shot that runs into the endgame is now held WIDER, and a wider shot has a smaller lag
measured as a fraction of the frame.

**That verdict was superseded the same day** — RUNIN-MINIMAL-1's later start returned every one of
those rows to its pre-run-in value. The paragraph is kept because the SHAPE of the finding was
right: a moving zoom shows up as a tail in whichever state the run-in is touching. It simply
touches only one of them now.

**RE-MEASURED FOR FINISH-PAIR-1, and one row moved — the one that should have.** That change makes
the photo-finish shot frame the pair it is actually following instead of the live top two, so the
only state whose ANCHOR it can touch is PHOTO_FINISH. It is also the only row that moved: median
6.37 → 5.68 pp and p95 20.73 → 16.51 pp, on the identical 1865 frames. The camera now sits closer to
its subject during the shot, and the p95 — the tail, which is where a lurch shows up — improved by
more than four points. Every other state is unchanged in frames, median and p95 alike. The pooled
"every other state" figure moves 4.64 → 4.62 pp only because PHOTO_FINISH is inside that pool.

**RE-MEASURED, NOT RE-STAMPED, for CEREMONY-OPENING-2 — and re-measuring was the only honest
option.** That block lengthens the opening: the track's own beat goes from 1400 ms to 3000 and the
starters' board no longer overlaps the push-in travel, so the ceremony runs 18.0 s against 14.4 at 40
racers. A change to how long the camera spends before the gun is exactly the kind that could move
these numbers, and no argument from a fingerprint could have settled it — the camera fingerprint
moves in this block by design.

**The verdict: every median and every p95 is unchanged to two decimals, and the frame counts moved by
a handful** (BATTLE_ZOOM 9661 → 9668, COMEBACK_ZOOM 753 → 755, LEADER_ZOOM 17796 → 17788,
LEAD_CHANGE 8090 → 8089, OVERVIEW 4304 → 4303). That is the expected shape: the ceremony is longer,
so the 60-second race reaches its states a little differently, but the TRACKING behaviour inside each
state is untouched. Worth having measured rather than assumed — it is the difference between knowing
and expecting.

**These figures carry a stamp, and fails if the camera
changes after it.** They are hand-copied on purpose: the measurement takes about seven minutes, so
generating them would put seven minutes inside a documentation guard, and a guard that slow gets
disabled. The guard therefore checks FRESHNESS, not accuracy — it never re-runs the measurement,
and it says so itself. It also covers nothing else on this page; see its header for the list.

`scripts/tracking-lag.mjs`, default invocation (n=40, raceSeed 5601, camSeed 1439767152, 60 s,
1280×720 — the CAMERA-ANCHOR-TRUTH-1 measurement context), `OVERVIEW trackingTC=0.25 entryTC=1.5`:

| state         | frames | median pp | p95 pp |
| ------------- | ------ | --------- | ------ |
| BATTLE_ZOOM   | 9406   | 5.70      | 10.55  |
| COMEBACK_ZOOM | 605    | 2.44      | 15.57  |
| LEADER_ZOOM   | 17788  | 4.05      | 9.32   |
| LEAD_CHANGE   | 7789   | 4.55      | 22.17  |
| OVERVIEW      | 4303   | 2.65      | 16.00  |
| PHOTO_FINISH  | 1865   | 5.33      | 26.85  |

OVERVIEW median 2.65 pp against every other state pooled 4.64 pp (ratio 0.57×).

**RE-MEASURED FOR ZOOM-PACE-5, AND AGAIN EXACTLY ONE ROW MOVES.** PHOTO_FINISH's median goes
**5.06 → 5.33 pp** and its p95 **26.61 → 26.85**, on an unchanged frame count of 1865; every other
state is identical to the digit and pooled is unmoved at 4.64. The corridor cap now arrives over
1500 ms instead of in one frame, so the shot spends longer moving and the live camera trails it for
more of the shot — a slightly larger lag, in exchange for the step the owner objected to.

**THIS STAMP WENT STALE ON MASTER AND CI CAUGHT IT.** The guard's own header warns about exactly the
path taken: `npm run verify` was run while the camera change was still UNCOMMITTED, so the guard
printed its PENDING line — a report, not a failure — and the run read green. The moment the change
was committed the stamp was stale, and the next CI run went red. **The PENDING line is the warning,
and it has to be acted on before the commit, not after.**

**RE-MEASURED FOR CONTENDER-ZOOM-1, AND EXACTLY ONE ROW MOVES — which is the point of measuring it.**
PHOTO_FINISH's median lag rises **4.71 → 5.06 pp** and its p95 FALLS **29.80 → 26.61**, on an
**unchanged frame count of 1865**. Every other state is identical to the digit, and pooled moves only
4.63 → 4.64.

The shape is what the change predicts rather than a surprise. The photo-finish shot now sizes itself
on however many racers are still contesting the line instead of always on two, so on the frames where
a third or fourth is abreast the target zoom is wider and the live camera has further to travel —
which is a slightly worse median. The p95 improving at the same time is the other half: the WORST
lag came from the shot chasing a pair whose separation jumped, and a set sized on everyone abreast
moves less abruptly. **The frame count being unchanged is the tell that this is a framing change and
not an occupancy one** — the table's own standing lesson, stated three paragraphs below.

**Re-measured for OUTCOME-PHASE-75, and COMEBACK_ZOOM moved so far that re-stamping would have been
wrong.** Its frame count fell from **2103 to 753** and its median lag rose from **8.34 to 13.73 pp**.
That is the threshold change doing exactly what it says: the decisive phase now opens at 0.75 of the
leader's run instead of 0.65, so COMEBACK is eligible for a shorter window and the shots it does win
are later, faster ones — a climb resolving at speed is a harder subject to track than one caught
early, which is why the lag inside the state is worse while every other state is unchanged. **The
camera is not tracking worse; it is spending that state on a harder subject and much less often.**
LEAD_CHANGE picks up most of the freed frames (7069 → 8090).

Two earlier movements are kept here because they explain the rest of the table. Re-measured for
CEREMONY-HANDOVER-1: OVERVIEW's frame count fell from 5199 to 3603 and LEADER's median lag from 4.46
to 3.92 pp — the start ceremony and the field guarantee that carries past the gun changed what the
camera is DOING in those early seconds, so the same 60 s divides differently between the states.

**The lesson this table keeps teaching: a frame COUNT here is an occupancy measurement, not a
tracking one.** Three of the four times these numbers have moved, what changed was how long the
camera spends in a state, not how well it follows. Read the counts and the medians as two different
findings.

**Re-measured for MIN-RACERS-5, and this time it is NOT a ceremony-length change.** Raising
`minRacersVisible` 3 → 5 widens the shot on the frames where the company guarantee binds, and the
camera tracks a wider shot slightly more closely in percentage-of-frame terms: LEADER's median
3.91 → 3.77 pp and p95 8.66 → 8.62, pooled 4.78 → 4.74 (ratio 0.54× → 0.55×). Every frame count is
unchanged, which is the tell — the states divide the race exactly as before, so nothing about WHEN
the camera is doing what moved; only how far behind it sits while doing it. **The stamp guard caught
this**, and it was right to: the change is small, real, and would otherwise have sat here as a stale
number nobody re-checked.

**Re-measured for CEREMONY-TRUTH-1, and it moved again the same way.** Giving the director the
digits beat lengthened the planned ceremony by 3 s, so the same 60 s of race divides differently once
more: BATTLE 9652 → 9655, LEADER 17512 → 17522, OVERVIEW 4308 → 4303, and BATTLE's p95 9.98 → 9.99,
COMEBACK's median 8.33 → 8.34 and p95 15.58 → 15.57. Nothing about tracking changed. **This is now
twice in two blocks that a ceremony change moved these numbers**, which is worth stating plainly:
any change to the opening's LENGTH owes this measurement, and it costs about 90 seconds, not the
seven minutes below.

**Re-measured for CEREMONY-TIME-1, and the re-measurement is the point.** The opening grew from
5.2 s to 14.4 s at a small field, which touches `client/src/modules/camera/` and made this stamp
stale. It was tempting to re-stamp deliberately on the argument that ceremony TIME cannot move
mid-race tracking — and that argument was wrong. Every median but one is identical, but the frame
counts moved by a handful (BATTLE 9651 → 9652, LEADER 17514 → 17512, LEAD_CHANGE 7066 → 7069,
OVERVIEW 4305 → 4308) and LEADER's median moved 3.92 → 3.91 pp. Small, and real: a longer opening
divides the same race differently between the states, exactly as CEREMONY-HANDOVER-1 found. **The
lesson is the one the guard exists for — "this cannot have moved the numbers" is a hypothesis, and
this one cost 84 seconds to refute.**

**Re-measured for START-BOARD-2, and nothing moved that matters.** The ceremony's beats changed
length (the board got its own duration and the countdown became their sum), so the camera
fingerprint moved and this stamp had to be renewed. Every median and every p95 is IDENTICAL to the
digit; the frame counts move by a handful (BATTLE 9657 -> 9651, LEADER 17522 -> 17514, OVERVIEW
4302 -> 4305) because a longer countdown shifts where in the race the 60 s window lands. The
tracking path itself was not touched.

**Re-measured again for CEREMONY-HOLD-TARGET-1, and ONE row moved.** OVERVIEW: 3603 → 4302 frames,
median 3.27 → 2.60 pp. Every other row is identical to the digit. The reason is the mechanism that
block repaired: OVERVIEW's target used to ease away from the ceremony's framing for the first
1.7 s of the race, so the pan was resolved every frame against a zoom that was still moving and the
camera spent the start catching up. With the framing held, the target stands still and the lag with
it — which is why the state's median falls without anything in the tracking path changing. The
frame count rises for the same reason the previous re-measure named: the start divides differently
between the states.

**These numbers replace stale ones, and the staleness is the point.** The convention list below previously stated
"LEADER 2.05 pp, OVERVIEW 6.78 pp, every other state pooled 3.78 pp" as CURRENT figures. Running the
command they cite produces none of those. Nothing had lied: the camera moved twice since they were
written (FINISH-MOTION-1, FINISH-COMPANY-1 — both moved the camera fingerprint), the figures did not
follow, and no guard could notice because a prose number has no home. Note also that OVERVIEW is now
the TIGHTEST state rather than the loosest, which reverses the reading the old figures supported.

They are still hand-copied here, and that is a known gap rather than an oversight: making them
generated means a seven-minute measurement in the loop, which is more than a documentation guard
should cost. What they now carry is a DATE and a COMMIT, so a reader can see how old they are — the
minimum a remembered number owes.

### What is protected, and what only by convention

**The render path is no longer convention-only.** `scripts/render-fingerprint.mjs`
hashes the SEQUENCE of draw calls — sprite placement, text, styles,
transforms and layer order — at **sixteen** fixed frames across all ten tracks, by driving the real
`renderRaceFrame()` through a recording context. FINISH-WINDOW-1 extended the run from 3400 to 5600
frames and added ten late sample points, because the ending sits at frames 3330–5587 and the
instrument had never reached it — on 9 of 10 tracks it now samples the finish shot, a frame mid
zoom-out and the resting frame (`--coverage` prints the matrix; garden-path never finishes). It covers what the camera fingerprint structurally
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
  transition REASONS are now return values. **The figures live under "The tracking lag, as measured today" above**, measured on a stated date
  at a stated commit; the ones that used to sit here were stale by the time anyone read them.
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
- **Two code fallbacks disagree with the shipped defaults** (`comebackMinStartGap`,
  `comebackMaxCurrentRankPct`). Only a bare-config caller sees a fallback, so this is latent rather
  than active. The values are not stated here — `scripts/check-fallback-agreement.mjs` holds both
  sides of every one of them, and it is the guard that fails when a new one appears.
  **`outcomePhaseThreshold` left this list on 2026-08-10** (OUTCOME-PHASE-75): the owner decided the
  value, and its three sites then stopped copying it — two read the default, and the diagnostic HUD
  carries no fallback at all. That is the shape the other two should follow, and it is why the fix
  is not "align the literal".
- **`START_PHASE_DURATION = 3000`** is a constant, not a control, and CAMERA-TAGS-1 measured it about
  five seconds short of when the field actually spreads.

---

## 8. THE OWNER'S VERDICTS — what his eye has actually judged

**What this section is FOR, and why it is not §6.** §6 records what a _test_ protects. This records
what a _person_ decided. They are different kinds of fact and neither substitutes for the other: a
green fingerprint says nothing moved, and only his eye says the picture is right. Before this
existed, that record lived in a chat-side document outside the repo — one camera with two
descriptions, which is the failure this project keeps paying for. The description lives above; the
judgements live here.

**What this is NOT.** Not a chronicle. The block-by-block history is `reports/evolution/` and the git
log, and duplicating it is what retiring the chat document was meant to end. One line per judgement,
with its date and — where one exists — the measurement that framed it.

### 8.1 Approved by his eye

| what he judged                                                                                                                 | when                                   | the evidence, and the measurement behind it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **The road no longer bounds the leader shot** — LEADER/OVERVIEW/COMEBACK limited by his setting and the COMPANY guarantee only | 2026-08-05                             | mountainstreet, seed 5601, toggle ON, _"nein das passt"_ ("no, that's fine") — and decisive because he saw **both regimes**: a torn-apart field where the guarantee opens the shot, and a tight pack where the camera holds his 1.0. **His verdict is about the leader shot's bounding and nothing else.** [CAMERA-COMPANY-ONLY-3](../reports/evolution/CAMERA-COMPANY-ONLY-3.md) §"his approval also covers" reads that verdict as closing the CAMERA-ANCHOR-TRUTH-1 debt (§4a, §4c, stages 1a/1b) on the grounds that the work "was present in every build he ran". **Present in the build is not judged**: he was never shown it and said nothing about it, so it is not UNSEEN and it is not APPROVED. Narrowed here on 2026-08-12; the report is the lab journal and is left as written. **THE DEBT IS NOW HALF CLOSED, BY MEASUREMENT RATHER THAN BY A SITTING** ([ANCHOR-TRUTH-EYE-1](../reports/night/ANCHOR-TRUTH-EYE-1.md)). **§4a is CLOSED: the anchored corridor changes the shipped picture by 0.00 points of frame on all 50,407 frames of ten tracks, in both field regimes** — because THIS VERY VERDICT retired the corridor from the single-anchor states, leaving only a PAIR fallback that never fires. There is nothing for an eye to see, and there would be again only if the corridor ever returned to those states. **§4c is OPEN and is visible**: OVERVIEW's `trackingTC` is a fifth of a frame apart at p95 and 28.8% of OVERVIEW frames differ by more than 10 pp. A ten-minute sitting is prepared in that report. §1a shipped no behaviour and was never eye-testable. |
| **`minRacersVisible`: he judged 5, and the code now ships 5. RESOLVED.**                                                       | judged 2026-08-05, resolved 2026-08-09 | **The disagreement was real and is recorded here rather than tidied away**: he judged 5 on 2026-08-05 while `defaults.js` kept shipping 3, so the company guarantee ran on 3 everywhere for four days and this row used to read as if the two numbers agreed. **Resolved by MIN-RACERS-5 in HIS favour**: his eye overrules the measurement, and the measurement says why he can be right — I reported the guarantee binding ~0% at n=65 and recommended raising it, which held for the PACK case only; on a SPREAD field it binds and widens a lot at 5, and the sweep never covered that case. Two mirrors of the number moved with it (`DEFAULT_MIN_RACERS_VISIBLE` in `framingConfig.js`, and the Dev Screen slider, which now reads the defaults instead of a literal). **The spread-field sweep is still owed** — it would quantify what he saw, and it is the one measurement that could still argue with him. Note the second consequence he should watch for: this key also decides when the finish overview stops widening for stragglers (`finishedCount >= 1 + minRacersVisible`), which now happens at 6 home instead of 4.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| **The finish is ONE motion** — pan and zoom on one ease, no jump at the crossing                                               | 2026-08-05                             | The measured defect was a **2708 px pan-target step in one frame** (dirt-oval, 144× the median of the frames before it); after, peak per-frame motion 2708 → 72 px with total travel unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **The finish pause, the travel and the resting point** — three judgements, one date, separated below                           | 2026-08-05                             | **WHAT HE WATCHED:** the single moment the pair shot ends, with his own photo-finish settings, on the two tracks the handover named — Dirt Oval (longest gap between the pair crossing) then City Circuit (longest old hold). **WHAT HE SAID:** recorded in merge `421e8f9a` — _"the pause, the travel and the resting point are what he asked for."_ All three are his, not inferred; the handover asked him for exactly those three ([FINISH-WINDOW-1](../reports/evolution/FINISH-WINDOW-1.md) §9). **THE MEASUREMENT THAT FRAMED IT:** the pause starts when the two contenders the shot was FOLLOWING are home — 6–57 frames later than `finishedCount >= 2`, and on 5 of 9 tracks the second racer across is neither of the pair. **WHAT HIS APPROVAL DOES NOT CARRY:** he moved the lookback slider across the range the handover named; **beyond it the resting point stops following on some tracks** — that is the world edge, its numbers are in FINISH-WINDOW-1 §5, and it is a limit he was told about rather than one he approved.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| **The company guarantee retires once the company is home**                                                                     | 2026-08-05                             | City Circuit, last thirty seconds, _"schaut besser aus jetzt"_. Baseline widened for 54 frames (4.5489 → 2.9752) after the shot had already come to rest; after, 0. Cost he accepted: the last back-marker sits 11% inside the frame instead of 23%.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |

### 8.2 Rejected by him — and both are natural ideas that will return

These live in [DEAD-ENDS.md](DEAD-ENDS.md) with their full reasoning **and all their numbers**; they
are listed here so a reader of the camera reference finds them at all.

**What is repeated here is the REASON, never the measurement — deliberately.** A bare pointer does
not stop the idea being re-proposed; the reason does, and the reason is the part that cannot go
stale. A number in two homes drifts, and the ceremony's own cost column proved that this week: it sat
at `~85 s` for the camera fingerprint through two mints because it was only ever corrected where
somebody happened to be looking. So the numbers live in DEAD-ENDS alone.

| what he rejected                                                               | when       | why, in one line                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------ | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The zoom unit as a fraction of each track's own width** ([§I](DEAD-ENDS.md)) | 2026-08-05 | Tested by him on searound and rejected: **a smaller window means the world moves through it faster, and the picture became restless.** The fixed reference has a virtue nobody had written down — a fixed amount of world means the same SENSE OF CAMERA SPEED on all ten tracks. The measurements agreed afterwards, but were run _because_ he had already rejected it; they did not find it. |
| **Counting finished racers as company at the finish** ([§J](DEAD-ENDS.md))     | 2026-08-05 | Refuted by measurement, not by eye: it widens the shot **further**, not less. The FINISH_OVERVIEW anchor is the fixed lookback point, **not the field**, so finished racers run out _away_ from it exactly as stragglers fall _back_ from it. The idea assumes the anchor sits where the racers are; it deliberately does not.                                                                 |

### 8.3 THE STANDING GAP — what his eye has NOT seen

**This is the honest limit on every "owner-approved" claim above, and it should be read before
quoting one.**

- **Tracks: TEN of ten** (his own count, 2026-08-12 — it was three when this section was written and
  seven on 2026-08-09). His words, kept in the original because they are the evidence:
  _"ich habe alle Rennen gesehen"_ — "I have seen all the races." Asked afterwards what came out of
  it, he reported **no findings**.
  **THE COUNT REACHING TEN CHANGES NOTHING ABOUT THE NAMES, and that is the part to read.** §8.1 and
  §8.2 carry evidence for mountainstreet, searound and City Circuit; the night reports add
  mountainstreet and searound for the board and ceremony work and river-run for the label offset. The
  rest were judged in sittings that produced no written evidence. **So the COUNT is his and the NAMES
  are still not recoverable from this repository** — a claim about a specific unnamed track has
  exactly as little behind it here at ten as it had at seven. A total is not per-track evidence, and
  "no findings" is a statement about a sitting, not a certificate on each track in it.
- **States:** he has seen LEADER, OVERVIEW, BATTLE and — since the finish work — PHOTO_FINISH and
  FINISH_OVERVIEW. **COMEBACK_ZOOM and LEAD_CHANGE have had no targeted pass**, and he declined one
  over the finish states before FINISH-WINDOW-1 gave him endings on nearly every race.
- **The START has now been judged.** It was not, when this section was written, and the line here
  said so. The ceremony and runners'-board work of 2026-08-08/09 was driven by his eye on the start
  frame directly — the board's duration, its legibility at 100 starters, the searching pause before
  the gun — on mountainstreet and searound. What that does NOT cover: the start on the other eight
  tracks, and the formation's framing as such rather than what is drawn over it.
- **The re-ordered OPENING has been judged, once.** On 2026-08-12, on a **production build** (R10 in
  [VERIFY-RULES.md](VERIFY-RULES.md)), at **40 and 100 racers**: the brand card, the track's own beat
  with nothing over it, the board arriving after the camera's travel instead of standing across it,
  and the two-line header. **What that covers** is the opening as a SEQUENCE — the order of the beats
  and their proportions — at both ends of the field-size range, in the regime he is meant to judge in
  (the beats are not all fixed lengths; the board's scales with the roster, and
  `client/src/modules/camera/startCeremony.js` is where that is decided). **What it does NOT cover,
  and this is the whole reason the bullet exists: it was ONE SITTING on ONE build, not a pass across
  tracks.** It says nothing about how the opening frames any particular track's geometry, nothing
  about the field sizes between the two he saw, and — since the brand card and the corner logo are
  DOM rather than canvas — nothing there is reachable by any fingerprint either. His eye is the only
  instrument those two have.

**The consequence, stated so nobody over-reads the table:** an approval is evidence about the track
and the state it was given on. It is not a general certificate, and a change that alters a state he
has never watched has no eye behind it at all.
