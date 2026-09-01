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
3. **The start window** (`raceElapsed < startWindowMs`) → the start's own shot, and nothing else.
   BATTLE, COMEBACK and LEAD_CHANGE cannot fire for its whole length, which is the promise the two
   clocks it replaced existed to keep. **Which** shot is the start's rule and is §3a-start below:
   OVERVIEW while the shot is opening, LEADER_ZOOM from the hand-over on.
4. **Endgame** (`leaderProgress > endgameThreshold`) → LEADER_ZOOM, with LEAD_CHANGE allowed
   through — a lead swap near the line is the most dramatic moment there is.

   **THIS LOCK DOES NOT ACTUALLY OWN THE ENDGAME**, and it is worth knowing because it looks as
   though it does. The branch is only consulted when `decideTransition` permits a transition at all,
   and a shot entered just before the threshold holds its own gate across it. Measured over sixteen
   races (two tracks x eight seeds): the window from the threshold to the first crossing is 40–48%
   PHOTO_FINISH — its pre-line gate fires at `photoFinishLeadProgress` — and most of the rest
   belongs to whichever shot was already running. **This is exactly why the run-in (§3a) bounds the
   zoom of whatever state is running instead of trying to be a state**: a state chosen here reaches
   only about a sixth of the endgame, measured.

5. **The weighted pool** — every eligible candidate, one weighted draw.

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
7. **T-space zoom lerp**, when the T-space lerp is active — a special case of step 9, kept here
   because the entry path advances `_camT` and its zoom together.
8. `_setTargets()` — the framing rule (§3). **It answers HOW WIDE and stops.**
9. **The frame's zoom is settled, once, for every path** — schedule, glide, cut or follow. This is
   the ordering RUNIN-ORDER-FIX-1 introduced and it is the load-bearing step in this list.
10. **`_resolvePanTarget()` — the aim, resolved at the zoom step 9 just settled.**
11. One of three branches writes `offsetX/offsetY`: **glide**, **cut**, or **follow**. The glide and
    follow branches each pivot the DELIVERED offset about the anchor when the zoom moved (§2a).
12. Entry-convergence gate → promote `entry` to `tracking`, start the phased observer.
13. `_computePhasedPanTarget()` — lead-in / follow / lead-out advance `_camT` for NEXT frame.
14. Diagnostics, then return `{ zoom, offsetX, offsetY }`.

**WHY 8, 9 AND 10 ARE IN THAT ORDER, and it is the whole of RUNIN-ORDER-FIX-1.** An aim is stored as
a screen offset — `world × scale` — so it is only meaningful beside the scale it was taken at.
Resolving it inside `_setTargets` meant taking it at the PREVIOUS frame's zoom and drawing it at this
one's, multiplied by the subject's distance from the world origin. RUNIN-VIABLE-1 measured the
consequence: the aim's own across-track component is identically **0.00 px** — the framing rule never
aims sideways — yet the subject moved up to **59 px** across the picture, and **all 221** across-track
jumps landed on frames drawn at a different scale than their aim was resolved at. Splitting the width
question from the aim question, and settling the zoom between them, took that to **1.22 px worst over
eight races and zero jumps**.

**Four corrections were deleted by that ordering and are not coming back**: two re-statements that
scaled the aim after the fact (VIEWER-INVARIANTS-2's, scoped to the composing schedule, and
RUNIN-PAN-STALE-ZOOM-1's, scoped to the endgame close). **Two pivots STAY** and are not the same
thing — see §2a below and §3.3.

**`targetOffsetX/Y` are owned exclusively by `_resolvePanTarget`.** `_computePhasedPanTarget` only
moves `_camT`. Two writers to the pan target is how the camera acquires a fight with itself.

### 2a. The pivots, which the ordering did NOT replace

The glide and follow branches each re-apply this frame's zoom change about the anchor before the pan
smoother runs. **They are not compensations for the old ordering and deleting them is measured to be
wrong**: RUNIN-ORDER-FIX-1 removed all four corrections at once and the worst sideways jump went from
59 px to **360 px**, the jump count from 30 to **209**.

The reason is that the ordering and the pivot act on different quantities. The ordering fixes where
the aim is RESOLVED. The pivot carries the smoother's **screen-space lag** through a zoom change:
with `offset_old = target_old + lag`, the pivot's `offset_old − anchor.x × axisX × dz` comes out as
`target_new + lag` exactly. Only the aim's treatment was ever wrong.

**Their scope is the follow and glide branches and must not be widened.** RUNIN-PIVOT-SCOPE-1
measured that too: applied to entry frames as well, the level-set guarantee cut a member on **48
frames**. Restricted to the branches above, the same build cuts none.

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

  **AND SO DOES THE FINISH LINE (RUNIN-LINE-1, 2026-08-17).** The run-in's `line` ceiling was in the
  `Math.min` and then the cap raised the zoom past it, re-applying only the contender guarantee — so
  the shot closed past its own finish line. That is the defect the owner rejected the run-in for:
  measured, **593 frames across six of the ten tracks, up to 608 px outside the canvas**, and it
  **predates the hold** — master loses the line on the same nine tracks at the same progress. The
  line is now re-applied after the cap for the same reason the contenders are, and `_lineCeiling`'s
  own header already called the finish line "a guaranteed SUBJECT of the run-in". Same standing,
  same clamp.

  **THE CONSEQUENCE IS LARGER THAN THE DIFF AND IS THE THING TO KNOW: the cap no longer moves the
  shot at all before the crossing.** It used to move the delivered zoom on **5019 of 7441**
  photo-finish frames; it now moves it on **0**, because in every one of those frames the line
  ceiling was the *argmin* — the cap was not adding tightening on top of the tightest constraint, it
  was overriding it. The two are structurally exclusive there. **And its own promise barely notices:
  contenders NOT WHOLE 8.8% → 8.7%** on ten tracks × three seeds. Whether a cap that costs the
  finish line and buys a tenth of a point is worth keeping is the owner's call; nothing was removed.

  A third name, `line-after-cap`, exists for the case where the line clamps the cap to a value above
  the pre-cap minimum. **It did not fire once in 57,366 measured frames** and is kept only so the
  probe cannot go back to misnaming a line-clamped frame — the defect recorded in the next paragraph.

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

**It survived RUNIN-ORDER-FIX-1 and its bounds are now measured on both sides — see §2a.** Deleting
it costs 59 px → 360 px of sideways jump; widening it to the entry path costs the level-set
guarantee 48 cut frames. The follow and glide branches are its scope.

### 3.4a The level ceiling's continuity contract (RUNIN-EASED-ADMIT-1)

**The level guarantee's width is a continuous function of its demand, in both directions, and it
leaves by arriving rather than by vanishing.** One rule, `_levelEaseTo`, in log space on a smoothstep
over `runInOpenMs` — the duration the release already used. No key was added.

**Why it exists, and it is a cause rather than a smoother.** The term had three boundaries and
stepped at all of them, while its own demand stayed smooth:

| boundary | what it did | measured |
| --- | --- | --- |
| admit | assigned the new demand outright | the width moved by a member's full demand in one frame |
| target moves mid-ease | anchored its start ONCE and interpolated toward a live target with a running clock, so an elapsed fraction `e` was applied to the new ratio | river-run seed 18: ceiling 1.3703 → 2.4251, **×1.77**, on the frame the set dropped 2→1 — *while the ease was already running* |
| exit | returned `Infinity` and cleared its state when the set emptied or the run-in stopped composing | mountainstreet seed 32: `guaranteed` 1.3139 → 4.0, **×3.05**, at the crossing |

`preLevel` — the shot that would have been — is smooth across all of those frames. **So the picture's
discontinuity was never the demand's; it was this term failing to be a continuous function of it.**
The repair gives the quantity the contract it lacked: re-anchor whenever the target moves, ease from
where it is, and disengage only once it has both arrived AND nothing is still asking it to be wider.

**Two consequences worth knowing.** The ceiling now outlives `_runInComposingNow` by at most
`runInOpenMs`, so the run-in hands back over a window rather than on a frame — the shot it hands back
TO is unchanged. And a newly admitted member is **not** fully guaranteed while the width grows onto
him, which is the trade the owner accepted on 2026-08-26.

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

## 3a-start. The start — one window, one rule (START-ONE-WINDOW-1, 2026-08-21)

**The owner judged this on a production build on 2026-08-21 and accepted it.**

**What happens, in the order it happens:**

1. **The formation and its shot.** The ceremony ends with the field framed and the camera at rest on
   it. Nothing about that changed; §3's framing rule and the ceremony's own beats own it, and the
   start takes it as given.
2. **At the gun the shot OPENS and the camera STANDS STILL.** The anchor is a fixed world point — the
   one the ceremony left at the centre of the picture — so the zoom widens around it and the pan does
   not move. Measured on dirt-oval: **3 world px of camera travel in the first 200 ms.**
3. **When the leader reaches his place in frame, the camera follows him** — the ordinary racing shot,
   the ordinary time constant, and `leaderForwardFrac` placing him, exactly as everywhere else in the
   race. "His place" is that same `leaderForwardFrac`, read from the framing rule rather than chosen,
   so the two can never drift apart. It happens **once**.
4. **The whole of it is ONE window, `startWindowMs`**, and for its full length the start framing owns
   the picture: **no BATTLE, no COMEBACK, no LEAD_CHANGE.** Measured on all ten tracks: the start
   framing held it for the whole window, to the last frame, with nothing else on screen. The value
   lives in `defaults.js` and is not restated here.

### The three clocks that became one, and why the third stayed

| was | now |
| --- | --- |
| `START_PHASE_DURATION` — a hard-coded 3 s of forced OVERVIEW, anchored on the field's CENTROID | **gone** |
| `postStartHoldMs` — forced LEADER, counted ON TOP of that 3 s | **gone** |
| OVERVIEW's `minStateHold` — blocking every transition inside both | **KEPT, and untouched** |
| — | **`startWindowMs`, whose shipped value is the sum the first two always produced** |

**WHY `minStateHold` STAYED, and a later reader must not "simplify" it a second time.** It is not a
start mechanism. It is **general**: six per-state values in `defaults.js`, resolved per state in
`cameraTimingComputation.js`, and read in **three** places — the transition hold gate for whatever
state is running, the value stored on each state entry, and the **phased observer's lead-out
trigger**, which every state uses. Deleting it would change the whole race, not the start.

**So the start window owns the STATE instead of deleting the minimum.** It returns a state on every
frame of the window, and the one transition it needs — the hand-over — is released through the
**existing** per-entry override (`_activeStateMinHoldMs = 0`), the same idiom a same-state repeat
already uses. It self-heals: that transition is not a repeat, so the new state's own minimum is
restored on the next frame. **Nothing outside the window is affected.**

### What the field centroid was, and why it went

Before this, the first three seconds anchored on the field's CENTROID — "before a leader exists, hold the
whole field so nobody is cropped at the gun". The centroid moves the instant the race does, so that
branch **panned**: 187 world px in the first 400 ms on dirt-oval. Four blocks in a row tried to
explain that motion as smoothing, as a hold, as an anchor change and as the world clamp; it was the
anchor doing exactly what it was written to do. The fixed point does the same job — nobody is cropped
— without moving.

## 3a. The run-in — the endgame's zoom, on top of the framing rule (RUNIN-OWNS-1, 2026-08-12)

> ### READ THIS BEFORE DESIGNING ANYTHING FOR THE CLOSE
>
> **An EVEN close and "the finish line stays in frame" cannot both be had while the two ends of the
> close are fixed.** This is not a tuning problem and not an architecture problem — it is excluded by
> the geometry, and it cost **six shapes over two days** to establish.
>
> Keeping the line in frame requires `zoom ≤ room / needed`. The distance `needed` falls to zero at
> the crossing, so that bound rises **hyperbolically**, while `room` SHRINKS as the leader travels
> forward across the frame. **`_lineCeiling` is therefore the BOUNDARY of the admissible set, not one
> option among several — it is already the fastest close that keeps the promise.** An even close is a
> chord between two fixed ends; the boundary is convex; they cross.
>
> The last shape measured the price exactly: an even schedule needs the line placed at up to
> **2.46× the entire room ahead of the anchor** — roughly two frame-widths outside it — on **9 of 9**
> measured tracks. The five before it each hit a different wall (the delivered-versus-target lerp; no
> placement value having a solution; the camera having no constant rate to borrow; a destination that
> runs away; a walk that is invisible because the ceiling binds on a median 91% of closing frames).
>
> **Run `node scripts/diag/runin-line-schedule.mjs` before touching the director for this.** It
> prices a proposed close in the line's own units in one run, with no production change: a required
> share above 1 is a shape that cannot keep the promise. What IS still open is moving an END — open
> less wide, or cross at a wider shot — and both are the owner's taste rather than a derivation.
>
> Full record: [DEAD-ENDS §O](DEAD-ENDS.md), [Lesson 208](LESSONS.md),
> [reports/evolution/RUNIN-LINE-1.md](../reports/evolution/RUNIN-LINE-1.md).

**What the owner asked for:** when the run-in begins, open far enough that the finish is visible,
then come back in continuously to the close shot, keeping the line in frame the whole way — so he
can see how much race is left and whether anyone still has a chance.

**It owns the FRAMING of the endgame, not its state slot,** and that distinction is the design. The
run-in does not compete for which shot is running; it READS whichever one is and bounds that shot's
zoom. Switched by `runInShot`.

**The window** is `endgameThreshold` to the first crossing. Both ends already existed: the first is
where the director has always declared the endgame, the second is where the finish sequence takes
over the picture with its own authored moves. That key moved on 2026-08-18 (ENDGAME-THRESHOLD-095),
which **halved the window** — and it is a state gate as well, so it is the one camera change in this
sequence that moved which STATE the director is in rather than only how tightly it frames. Its value
lives in `client/src/modules/storage/defaults.js` and is not restated here.

**THE SHOT IS HELD, THEN CLOSED IN ONE SWEEP (RUNIN-HOLD-1) — this is the shipped shape.** Left
alone, `_lineCeiling` begins closing on the frame the window opens, and measured that made the first
seconds a crawl: about 3.6 s of lead-in at roughly 95 px/s of picture flow, below the rate at which
anything reads as movement. So the opening shot is held — which is free with respect to the promise,
because the held shot is the WIDEST the run-in ever asks for and a wider shot keeps the line in frame
trivially — and then closed once.

**The release is DERIVED, not chosen, and no key was added.** The sweep lasts `runInOpenMs`, so it
begins at the moment from which one sweep of that length still arrives at the line: when the leader's
REMAINING TIME to the line has fallen to the sweep's length. The pace is measured over the RUN-IN's
OWN span, not the whole race — the field DECELERATES into the finish, and a whole-race average was
wrong by about six times, predicting 1.25 s where 7.4 s remained. If the window is shorter than one
sweep the close simply begins at once and is compressed, which is correct; a pause in the middle
would not be.

**The corridor cap can no longer override the line (RUNIN-LINE-1).** `_setTargets` honoured
`_ceilings.line` in its `Math.min` and then let the corridor cap raise the composed zoom back above
it — so the one term that knows where the finish line is was being overruled by a term that does
not. The line is re-applied after the cap for the same reason the contender guarantee already was.
**593 overridden frames → 0.**

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
**0 empty frames on every track**. The in-frame share and the time to first sight are a function of
the opening pace and are quoted above for the shipped `runInOpenMs` — **86.6%** and **1.1 s**. (The
figures **73.4%** and **2.5 s** that stood here belonged to the 3000 ms opening and were left behind
when RUNIN-PACE-1 moved it to 1250 ms; corrected 2026-08-18.) The guard that watches this
continuously is `check-runin-frame`'s third question, which asks every frame from the threshold to
the crossing whether the line is on screen and splits its losses by cause — overridden by another
term, or merely trailed by the pan.

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

## 3b. The endgame — the schedule, his twelve requirements, and the two switches (ENDGAME-LAND-CLEAN-1, 2026-08-22)

> **What §3a owns and what this owns.** §3a is the RUN-IN: the mechanism that bounds whatever shot is
> running so the finish stays framable, and the geometry that makes an even close impossible. This
> section is the ENDGAME: the last stretch of the race as the OWNER defined it, the requirements he
> set for it, and the two behaviours added to meet them. Nothing here restates §3a; where the two
> touch, this section points.

### The mechanism, in one page

*Written before the implementation, deliberately. A stranger should be able to follow it without
reading a line of the director, and it should be possible to say what any frame of the endgame does
by pointing at a sentence here.*

#### What the endgame IS

**One authored camera move that runs from shortly before the endgame threshold to the winner's
crossing, and hands back nothing.** It is not a bound the shot settles against; a bound has no
opinion about motion, and the picture stands still whenever the bound does. It is a POSITION FOR
EVERY FRAME.

It is a PHASE, not a per-frame test. It latches on once and stays on. Every flicker between a wide
shot and a tight one this camera has ever produced came from asking a per-frame question about
something that should have been asked once.

#### When it opens

Two conditions, and it needs both:

1. **The leader is within one opening-span of the threshold** — the widen must FINISH at the
   threshold, so it must START one span before it. The span is `runInOpenMs`, the key that already
   paces the opening; the rate is observed over that same span, so the estimator introduces no
   second number.
2. **The finish can actually be framed** — the width the line needs is a finite number this frame.

The second condition exists because the first one alone latched the phase on frames where there was
nothing to widen to: the ramp then ran on the clock while the segment was inert, and arrived
part-way up a curve it had never travelled.

The opening is a GLIDE, because two quantities change discontinuously at that instant: the width
opens by whatever the line requires, and the leader's place in frame flips to its mirror. Pan and
zoom must move on ONE ease or the frame empties between them.

#### What sets the width at each moment

**The SCHEDULE, and nothing else.** For the whole phase the schedule is the sole author of the zoom.
It is written in log space — a scale change is perceived logarithmically — and eased with a
smoothstep, which is continuous in rate and bounded in acceleration by construction.

It has two segments that meet at the threshold:

| | from | to | parameterised by |
| --- | --- | --- | --- |
| **WIDEN** | the width the camera stands at when the phase latches | the width the finish needs | its own span, carried |
| **CLOSE** | the width delivered at the turn | the active state's own factor | the leader's progress to the line |

The widen ends either at the threshold or the moment the shot is already as wide as the line needs,
whichever comes first — waiting for the clock after the shot has arrived is dead time, and it
compresses the whole close into the last twentieth of the race.

The close is parameterised by progress rather than by wall clock **so that it lands exactly at the
crossing** however the field paces itself.

#### Who is framed

The active state chooses its subject; the endgame does not take the state's slot. What the endgame
adds is WHERE that subject sits and WHO counts as present:

- **The leader starts behind frame centre and walks back to his ordinary place**, on the same
  parameter the zoom closes on — one move, not two. Starting at the mirror of his ordinary position
  puts two thirds of the frame ahead of him instead of one third, which is most of the width the
  design saves.
- **Racers the race has decided are eased out of the framing.** The judgement is made from what is
  visible on track — the gap and the closing rate — never from the race plan. It is ONE-WAY and
  needs two consecutive checks, so it cannot flicker; the easing moves every field the framing reads,
  not just the screen position.

#### What closes it, and where it arrives

**The crossing closes it.** Both the close's parameter and the leader's walk back reach 1 exactly at
the line, so the endgame arrives rather than being switched off: the shot is at `_leaderZoom` or
`_photoFinishZoom` — whichever is running — with the leader at his ordinary framing position and the
state's own composition underneath. **There is no seam and nothing to hand over.**

#### The invariants — what must be true of every frame

1. **ONE AUTHOR.** While the schedule composes, nothing else writes the zoom. Not a state's entry
   snap, not a stand-down, not a glide, not a hold.
2. **MONOTONE AND CONTINUOUS.** The width never reverses inside a segment and never steps between
   frames.
3. **THE RAMP ADVANCES ONLY ON FRAMES IT CAN RUN.** A frame with no computable target holds the
   width it last placed; the parameter does not move. A held width does not move the anchor, which
   is what stops the demand and the delivery feeding each other.
4. **RE-ANCHOR, NEVER STEP.** When the target moves for a reason outside the schedule — the state
   changes, the endpoint factor flips, the segment resumes — the ramp starts again from where the
   camera IS and eases to the new target over what remains. It never jumps to the new curve.
5. **THE LINE STAYS FINDABLE.** The close may not go tighter than the width at which the finish is
   inside the subject's own region. It is a FLOOR under the schedule, not a second author: it cannot
   make the shot jump, because the close starts at or wider than it and it shrinks monotonically,
   and it releases exactly at the crossing.
6. **THE PAN IS EXPRESSED AT THE ZOOM THE FRAME IS DRAWN WITH.** An offset is a product taken from
   the world origin, so a zoom the pan was not resolved at is multiplied by the anchor's distance
   from that origin. The correction re-expresses the resolved answer; it never re-decides it.

#### What the endgame deliberately does NOT do

It does not choose the state, pick the subject, or steer. The geometric guarantees still widen the
shot if a subject would be cut — **a guarantee widens, it never steers**. The endgame replaces the
STATE's width authority for the duration of the phase and nothing else's.


**Where each part of that page lives in the code** (ENDGAME-REWRITE-1). Four of the five headings are
findable by name, which is the point of the rewrite rather than a side effect of it:

| the page says | the code says |
| --- | --- |
| when it opens | `_scheduleEngaged` |
| what sets the width — the widen | `_scheduleWiden` |
| what sets the width — the close | `_scheduleClose` |
| the ramp's parameter | `_scheduleFittedProgress` |
| invariant 1, one author | `_scheduleComposing`, read by all five sites that enforce it |
| who is framed | `_forwardFracNow` (the walk back) and `_updateContentionWatch` |
| invariant 5, the line stays findable | `_lineCeiling`, applied as a floor inside `_scheduleClose` |

The sections below state the same design in the terms the OWNER set it in — his window, his twelve
requirements, the two conflicts and the two keys. The page above is the mechanism; what follows is
what it is answerable to.

### WHY IT IS A SCHEDULE AND NOT A CEILING — the measurements that decided it

**These numbers are the record of why the endgame is as it is.** They lived above the switch that
chose between the two designs; that switch is retired (RETIRE-RUNIN-LEGACY-1), so they live here,
beside the mechanism they justify. The comparison is the SCHEDULE against the ceiling-and-hold arm
that preceded it, on nine scorable tracks at seed 9 — his config first, then the shipped defaults.

| | ceiling-and-hold | the schedule |
| --- | --- | --- |
| **STANDSTILL** — share of the spec window with the picture static | 43% (26% shipped) | **17%** (18%) |
| **THE LONGEST STATIC RUN** — the number he actually complained about | 2017 ms | **550 ms**, both arms |
| **TIMING** — winner and line both visible by the deadline | 0 of 9 tracks | **9 of 9** (8 of 9 shipped) |
| **ARRIVAL** — worst error against the leader-view / photo-finish factor | 48% | **6%** |
| **WIDTH** — widest endgame frame | 6.1 corridors (6.1) | **4.4** (5.4) |
| **SMOOTHNESS** — worst `\|d²ln(width)/dt²\|` | 78.3 | **13.3** (22.0) |
| **MONOTONICITY** | — | **9 of 9 tracks, both arms**, held by the ratchet in `_setTargets` |
| **RACERS CUT** — contender-off-canvas frames | 59 (109) | **35** (33) |

**The last row is the one that settles the argument.** A wider, moving shot was expected to cost
racers at the edges and it does the opposite: the schedule's shot is wider than the old one through
the part of the endgame where the field is still spread, so the guarantee it overrides was arguing
for width the schedule had already provided.

**And the smoothness figure carries a warning that is now a lesson.** 78.3 → 13.3 is a
SMOOTHED second derivative, and a smoothed metric of this shape is exactly what hid a single-frame
jump for two blocks running — see Lesson 218. The figure is kept because it is what was measured on
the day; it is not the reason to believe the endgame is smooth. That reason is the acceptance sheet's
item 6, which grades the worst SINGLE frame.

### The window, and it is his

**The endgame runs from the endgame threshold to the winner's crossing, and NOTHING outside that
window is in scope.** He said so on 2026-08-24 when a gate was failing on frames from the middle of
a race: his requirements apply from that point onwards only. The threshold is the existing key
`endgameThreshold`; its value lives in `defaults.js` and nowhere else.

That scoping is not a convenience. Before it, invariant 2 was failing on group-framing states that
run legitimately in mid-race, and the temptation was to give the invariant a duration rule so those
frames would pass. **He was explicit that it does not need one — it needs scoping.** A rule loosened
until the wrong frames pass no longer says anything about the right ones.

### The shape of the move: a widen, then a close, and ONE author

The endgame is a **schedule**, not a ceiling. A ceiling has no opinion about MOTION — it permits any
path underneath it, including standing still and then jumping — and standing still is what the
measurements found: 43% of the endgame at a standstill, the longest freeze over two seconds.

The schedule is authored in **log space** with smoothstep easing, because the eye judges width
multiplicatively: the same number of pixels is a different move at a wide shot than at a tight one.
It has two parts.

- **The widen**, ending at the threshold. It opens to whatever the finish needs, which by §3a is the
  line's own ceiling and nothing else.
- **The close**, from the threshold to the crossing. Along it the schedule is the **SOLE AUTHOR of
  the zoom**. Not one candidate among several in a `Math.min`, not a floor a state may undercut —
  the sole author.

**Why sole authorship, and it was measured before it was written.** Five separate places in
`CameraDirector.js` wrote the zoom inside the window, and the picture strobed because they disagreed
frame to frame: the state's own entry snap, the OVERVIEW stand-down, the LEAD_CHANGE stand-down, the
run-in's held zoom, and the glide's pivot. Each was individually reasonable. **A quantity with five
authors has no design; it has an argument, and the viewer watches the argument.** The repairs are
listed under "the five authors" below, each with the test that fails without it.

### His twelve requirements, and the sheet that grades them TOGETHER

They were fixed before the work started and were not changed during it. `scripts/endgame-sheet.mjs`
grades all twelve from one pass of a race's own frames, **in a real browser, on the production build,
with the browser's own camera seed**, and `scripts/viewer-invariants.mjs` prints the sheet on EVERY
race it runs. That is the point of the file: before it, each block repaired the one item it was aimed
at and reported the numbers of that item, and something else broke unwatched every time.

| # | The requirement | How it is graded |
| --- | --- | --- |
| 1 | At the deadline, the winner AND the line are on screen | both, from the delivered frame — not a margin |
| 2 | The crossing sits at one of the two factors the director already carries | `_leaderZoom` or `_photoFinishZoom`, within a tolerance on a comparison |
| 3 | The close begins early and runs slowly and continuously | **reported, not gated** — where the widest frame falls, the span after it, the rate it then holds |
| 4 | Never as wide as today's shot | against **today's own measured widest frame**, supplied to the sheet; no invented ceiling |
| 5 | The viewer can always tell where the line is | the visible SHARE of the band; partial counts; **frames with none of it is the verdict** |
| 6 | No jump | the **worst SINGLE frame**, never an average. The bound is `ln 2` — halving or doubling the picture between two frames is not a camera move |
| 7 | The line, the leader and everyone still in with a chance are in frame | frames with any contender off canvas |
| 8 | A pause is allowed; a long standstill is not | **reported as a cost, not gated** — his requirement says so in as many words |
| 9 | The finish happens near the middle of the frame, and the winner is never cut | **his own figure** for the placement; "never cut" is the SUBJECT's inner region |
| 10 | The leader's walk back through the run-in stays | the leader is ever behind centre inside the window |
| 11 | Never a frame without the course; no reversal of the close | frames with no course on canvas, plus re-openings |
| 12 | Nothing before the window changes | by comparing two runs, not from one |

**Items 3, 8 and 12 carry no pass/fail on purpose.** Two of them are costs he asked to be SHOWN
rather than bounded, and the third cannot be answered from a single race. A row that cannot be graded
from the picture says so rather than carrying an easier number in its place — Lesson 218.

### THE TWO PROVEN CONFLICTS — neither is a bug, and both are his to overturn

**Item 7 against item 9.** "Everyone still in with a chance" is answered geometrically by
`_abreastContenders` — within one body length NOW — while the contention watch answers it by
projection. Holding a racer the geometry still calls a contender pulls the frame back off the winner
and corners him: measured, city-circuit put the winner at `x = 0.105` with 24 cut frames, breaking
items 9 and 2 together. Releasing him leaves exactly one racer at the frame edge on a minority of
races. **Item 9 took the win, on his own sentence that the crossing is the moment.**

**Item 4 against item 5.** Keeping the band findable costs width, and width is exactly what item 4
bounds. Both numbers are reported side by side on every run; no setting maximises both.

### The two keys this added, and what each one IS

Both live in `defaults.js` with every other camera default, and both have a Dev Screen control in
**7 · Endgame** — this project's rule is that a behaviour the owner might want to compare must be
flippable without editing anything.

- **`contentionWatch`** — from the threshold on, the camera keeps asking which racers can still WIN,
  **from what is visible on track** (the gap and the speed difference), never from the race plan; he
  was emphatic about that. A racer the race has decided is eased out of the framing over the run-in's
  own opening span, so the shot is not anchored on someone who finished fifth a second down.
  **The verdict is ONE-WAY and needs two consecutive checks** — that is the no-flicker constraint, and
  it is why the answer cannot oscillate. The check interval is its own key, `contentionCheckMs`.
  **The easing must move every field the framing reads.** Its first form eased `x` and `y` only and
  moved nothing at all, because `getPanTarget` computes a pair's midpoint from `t`.
- **`bandFloor`** — the endgame's width floor guarantees the finish inside the SUBJECT's own region
  rather than the companion margin. It is tighter, so it asks for a wider shot; measured, that is what
  puts the band back on screen where it was leaving it. It buys item 5 and spends item 4, which is the
  second conflict above. **It introduces no new number** — one existing constant in place of another.

**Both ship on.** That is a decision, not a default that drifted: the owner judged a production build
with both switched on, on 2026-08-24, and accepted it. Both switches are kept so the two behaviours
can still be compared.

### The five authors, and the other repairs — each with the test that fails without it

Every item below is an empirical finding, not a preference. Each has a test that fails if the repair
is removed; that is the standard for anything on this list.

1. **The five zoom authors during the close.** The stand-downs and the entry snaps are guarded so the
   schedule composes alone, and the run-in's hold no longer abdicates.
2. **The glide's pan re-expressed at the DRAWN zoom, scoped away from the glide itself.** The pan
   target and the zoom were computed at different scales; unscoping the pivot regressed the side jump
   and was reverted on that measurement.
3. **The carried ramp advances only on RUNNABLE frames.** Advancing it on frames that could not run it
   is what turned a stagnation into an amplitude.
4. **The camera seed comes from the RACE seed**, so a race can be stood in; unseeded "Start Race" keeps
   its variety. Lesson 219 is why every headless harness was blind before this.
5. **The winner's placement and the leader's walk back** — items 9 and 10, both graded on the picture.
6. **`check-runin-frame` grades HIS SENTENCE**: the band on the canvas, with the browser's camera seed
   and a corrected band sampler. The sampler had been walking a segment 300x too long, because
   `getPosition`'s lateral argument is NORMALISED (see §3.2). **Do not weaken this guard to go green.**

### THE CORRECTION TO `f0cb5179` — the pan lag was NOT why, and that merge message cannot be rewritten

`f0cb5179`'s message says the line goes off screen **"and the pan lag is why"**, and names fixing the
lag as the thing that must happen first. **That is false, and it was falsified by measurement two days
later.** `PAN-LAG-ACCOUNT-1` decomposed the endgame frame by frame across forty runs: **the pan's
residual is 0.0 px on all of them**, and the ZOOM beats the pan on 35 of 36 endgame runs. The
414–891 px figure the merge message rests on was misnamed — it is not lag in the follower, it is the
frame being written by the zoom about the world origin while the follower does exactly what a
first-order follower does and nothing else (Lesson 217).

**The message is in the history, and history is not rewritten here, so the correction lives in the
documents instead** — in this section, in `docs/DEAD-ENDS.md` §P, and in `PAN-LAG-ACCOUNT-1`'s own
report. Anyone who reads that merge message and reaches for the smoothing constant will find the
refutation from any of the three. **The lever is the zoom's schedule, which is what this section
describes.**

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
- **The racer types' DRAWING CODE, not just their pixels** — and this is wider than the line above.
  `client/src/modules/racer-types/` is inside **no instrument's closure at all**: render 55 files,
  camera 36, and `engine-reach` reports it cannot reach the engine. So a diff confined to a racer
  type selects no fingerprint and none of the three would run even if it did. **A change to how a
  racer is drawn is covered by the owner's eye and by nothing else.** The measurement and the
  reasoning live once, in
  [SHIP-CEREMONY.md § THE THREE FINGERPRINTS](SHIP-CEREMONY.md); this entry points at it because
  this is the list a camera reader checks.
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

<!-- MEASURED: tracking-lag (median/p95 pp per state) @ ed627ae7 2026-09-01 depends=client/src/modules/camera/ -->
**RE-STAMPED, NOT RE-MEASURED, FOR AIM-LEVERS-1 (2026-09-01), and the reason is a fingerprint
rather than a judgement.** That block adds two camera keys whose defaults are OFF
(`leaderAimRoomFloorPx` 0, `leaderBodyAspectMax` null). With both at their defaults the CAMERA
fingerprint is byte-identical — re-run on the settled tree and equal to the value recorded in
[docs/fingerprints.json](fingerprints.json) — so the delivered picture is the same to the byte and no
number below can have moved. Re-running the lag measurement
would have confirmed what the fingerprint already proves (R15a). **If either key is ever turned ON by
default, every figure here must be re-measured for real.**
**RE-MEASURED IN FULL FOR LEADER-LATERAL-BUILD-1, AND EVERY FIGURE IS IDENTICAL TO THE DIGIT
(2026-08-26)** — 8626/5.81/10.05, 159/4.84/7.40, 13282/5.07/9.71, 8473/4.64/7.45, 4130/2.75/16.00,
2089/2.81/8.59. Run rather than argued: the change moves the pan target in `LEADER_ZOOM`, which is
the state this table's third row measures, so no byte-identical argument was available.

**AND THE REASON IT DID NOT MOVE IS A COUNT, NOT A CLAIM.** "The change cannot have affected this"
would have been wrong — it can, and does. Instrumented on this harness's own race (n=40, seed 5601,
all ten tracks), the leader's lateral guarantee **fires on 178 of 14,795 `LEADER_ZOOM` frames, 1.20%**,
and every racer in it carries a drawn body, so the rule is genuinely exercised here rather than
silently inert. 178 frames is 1.3% of the 13,282 this row pools, which is far too few to move a median
and, at two decimal places, a p95 as well. The figure is unmoved because the rule is RARE, which is
the whole design — not because it is absent.

**RE-MEASURED IN FULL FOR RUNIN-EASED-ADMIT-1, AND EVERY FIGURE IS IDENTICAL TO THE DIGIT
(2026-08-26)** — 8626/5.81/10.05, 159/4.84/7.40, 13282/5.07/9.71, 8473/4.64/7.45, 4130/2.75/16.00,
2089/2.81/8.59. Run rather than argued: the change is inside `client/src/modules/camera/` and moves
the CAMERA fingerprint, so the usual byte-identical argument was unavailable. It did not move these
because this harness's race (n=40, seed 5601) is measured on the tracking lag per state, and the
repair changes only how the level ceiling's own value moves between frames.

**RE-MEASURED IN FULL FOR RUNIN-PIVOT-SCOPE-1, AND ALL SIX FRAME COUNTS ARE IDENTICAL (2026-08-26)**
— 8626, 159, 13282, 8473, 4130, 2089. That is the load-bearing half of this entry: the repair moves
where the aim is resolved, and a frame count would only move if it had also moved when a state stops
entering and starts tracking. It did not, which is what the pivot's restricted scope buys.

Four states improved, one median moved the other way, and COMEBACK_ZOOM and OVERVIEW are identical to
the digit on both percentiles:

| state | median pp | p95 pp |
| --- | --- | --- |
| BATTLE_ZOOM | 5.82 -> 5.81 | 10.16 -> **10.05** |
| COMEBACK_ZOOM | 4.84 -> 4.84 | 7.40 -> 7.40 |
| LEADER_ZOOM | 4.99 -> **5.07** | 9.84 -> **9.71** |
| LEAD_CHANGE | 4.66 -> **4.64** | 7.50 -> **7.45** |
| OVERVIEW | 2.75 -> 2.75 | 16.00 -> 16.00 |
| PHOTO_FINISH | 2.95 -> **2.81** | 8.64 -> **8.59** |

**The baseline is this branch's own tip, measured, not the figures the entry below records** — for
the reason the 2026-08-26 entry beneath already gives, and that discrepancy is still open and still
not this block's.

**RE-MEASURED IN FULL FOR RUNIN-PAN-STALE-ZOOM-1, AND EXACTLY ONE STATE MOVED: PHOTO_FINISH median
2.89 -> 2.95 pp and p95 8.65 -> 8.64 (2026-08-26).** Every other state is identical to the digit,
both percentiles and all six frame counts included — 8626, 159, 13282, 8473, 4130, 2089.

**THE BASELINE IS THE BRANCH TIP, MEASURED, NOT THE FIGURES THE ENTRY BELOW RECORDS.** That is a
deliberate choice and it exposes something. This block ran the harness twice on the same commit —
once with its change and once with the change reverted — because the only honest baseline for "what
did I move" is the tree I am moving it from. **The reverted run reads 8626 / 159 / 13282 / 8473 /
4130 / 2089, which is not the 10923 / 159 / 17169 / 9373 / 4323 / 1865 the entry below records for
this same branch.** Five of the six frame counts differ, and they differ WITHOUT this block's change
applied, so **the discrepancy is not this block's and is not repaired here.** It is reported in
[RUNIN-PAN-STALE-ZOOM-1](../reports/evolution/RUNIN-PAN-STALE-ZOOM-1.md) as an open question about
the record rather than silently overwritten: either that re-measurement did not run and the older
table was carried forward, or something outside `depends=` — the harness roster, which the identity
line reports as `roster=none (index strings)`, is the obvious suspect given that a racer's NAME is
physics — moved the race itself since.

**WHY IT MOVED AT ALL, AND WHY ONLY THERE.** The repair re-expresses the pan target at the zoom the
frame is drawn with, scoped to `_runInAfterDeadline` — the endgame close. PHOTO_FINISH is the state
that runs inside that window, so it is the only one that can move, and the gate is what makes that a
structural statement rather than a lucky one. **An earlier revision of this block did NOT scope it**,
calling the correction on every follow frame, and the harness caught what that costs: LEADER_ZOOM
median 4.99 -> 5.08 pp, BATTLE_ZOOM p95 10.16 -> 10.06, LEAD_CHANGE 4.66 -> 4.64. The follow branch
also carries the ENTRY phase, whose convergence test reads `|targetOffsetX - offsetX|`, so moving the
aim moves when a state stops entering — a pan correction becoming a state-machine timing change
across the whole race. The scope exists because that was measured, not feared.

**RE-MEASURED IN FULL FOR RUNIN-LEVEL-SET-BUILD-1, AND EXACTLY ONE FIGURE MOVED: PHOTO_FINISH median
3.08 -> 3.00 pp (2026-08-25).** Every other state is identical to the digit, both percentiles and all
six frame counts included — 10923, 159, 17169, 9373, 4323, 1865 — and PHOTO_FINISH's own frame count
is unchanged, so the state ran exactly as long and followed a little closer while it did.

**IT WAS RUN, AND THIS TIME IT HAD TO BE.** Every earlier entry here could rest on the CAMERA
fingerprint coming back byte-identical. That sentence is unavailable to this block: **the camera
fingerprint MOVED** (see [fingerprints.json](fingerprints.json) for where the values live), because
the block adds a width authority that composes during the run-in. So the only honest answer was the
measurement.

**AND THE SIGNATURE IS THE DESIGN'S, which is the reason to believe it.** The new term is scoped to
the run-in, whose window opens at the endgame threshold — by which point every state except
PHOTO_FINISH and LEADER_ZOOM has left. A figure moving in BATTLE_ZOOM or OVERVIEW would have been
evidence of a leak rather than of a better shot. The table below carries the new figure.
**RE-STAMPED, NOT RE-MEASURED, FOR BACKLOG-SORTED-1 (2026-08-23).** That change adds a COMMENT to
`camera/CameraDirector.js` — the owner's decision to document `_lfEntryByState` in place rather than
delete it — and **not one executable character changed**. It was not left as an argument from the
diff: `npm run verify`'s own routing selected the CAMERA and RENDER fingerprints, because that file
is inside both closures, and **both came back byte-identical to the values in
[fingerprints.json](fingerprints.json)**. A frame sequence that hashes identically cannot have a
different tracking lag, so the measurement whose answer cannot have changed is not run.

Stamped at the parent commit `fd9037d5` per the guard's two-step, and corrected to `fa14ca0c` —
the commit that actually carried the comment — in this follow-up.


**RE-STAMPED, NOT RE-MEASURED, FOR THE MAX_CAM_ZOOM NOTE (2026-08-23) — and this is the strongest
version of that argument the stamp has carried.** That change adds a COMMENT to
`camera/projection.js`, which is inside this stamp's `depends=` directory, so the guard asks. **Not
one executable character changed.** And it was not left as an argument from the diff: `npm run
verify`'s own routing selected the CAMERA and RENDER fingerprints — `projection.js` is inside both
closures — and **both came back BYTE-IDENTICAL to the values in
[fingerprints.json](fingerprints.json)**, which is where they live and where this note deliberately
does not copy them to. A frame sequence that hashes identically cannot have a different tracking lag,
so the measurement whose answer cannot have changed is not run.

**RE-STAMPED, NOT RE-MEASURED, FOR CEREMONY-SKIP-1 — and the reason is a fact rather than a
judgement.** That block adds `nextBeatStart` to `camera/startCeremony.js`, which is inside this
stamp's `depends=` directory, so the guard asks. **The tracking lag cannot have moved:** the switch
ships OFF, so no drawn frame changes without a click; nothing in the harness clicks; and a ceremony
BEAT BOUNDARY is not an input to this measurement at all — it measures how far the camera sits behind
its subject during the TRACKING phase, which begins after the ceremony is over. **A measurement whose
answer cannot have changed is not run.**

Stamped at the parent commit `42b46184` per the guard's two-step, and corrected to `d46fd443`, this branch's own
commit in the follow-up.

**RE-MEASURED IN FULL FOR RETIRE-RUNIN-LEGACY-1, AND EVERY FIGURE IS IDENTICAL TO THE DIGIT** —
10923, 159, 17169, 9373, 4323, 1865 frames and both percentiles on every state. That block deletes
the endgame's second implementation outright, so the guard is right to ask; and four byte-identical
fingerprints are an argument about a different instrument's sampling, not a measurement of these
numbers.

**This stamp's ID is also repaired here.** ENDGAME-REWRITE-1's stamp script wrote its own regex
source into the document, so the id has read `tracking-lag \(median/p95 pp per state\)` since that
block. The guard never noticed because it finds a stamp by its own pattern and never compares the id
to anything — a corrupted id is a silently accepted one.

**RE-MEASURED IN FULL FOR ENDGAME-REWRITE-1, AND EVERY FIGURE IS IDENTICAL TO THE DIGIT** —
10923, 159, 17169, 9373, 4323, 1865 frames and both percentiles on every state, PHOTO_FINISH
included at 3.08 / 8.79. It was RUN rather than argued from the fingerprints, and the distinction
matters here more than usual: that block RE-WRITES the endgame path — a dead helper removed, five
inline copies of one predicate replaced by a name, and a 385-line function split into a sequence of
named steps — so the guard is right to ask, and "CAMERA came back byte-identical" is an argument
about a different instrument's sampling rather than a measurement of these numbers.

**RE-MEASURED IN FULL FOR ENDGAME-LAND-CLEAN-1, AND THIS IS THE FIRST TIME THE SWITCHES ARE ON.**
Every entry above this one could rest on the same sentence — the switches default off, so nothing
shipped moves — and that sentence is now retired: `contentionWatch` and `bandFloor` SHIP ON, so this
harness runs the endgame the viewer gets. **Only PHOTO_FINISH moved, and it moved the right way:
median 3.54 -> 3.08 pp, p95 8.91 -> 8.79 pp.** Every other state is identical to the digit, frame
counts included — 10923, 159, 17169, 9373, 4323, 1865 — and PHOTO_FINISH's own frame count is
unchanged too, so the state ran for exactly as long and simply followed a little closer while it did.

**That signature is the design's, and it is the reason to believe the measurement.** The endgame's
width authority reaches PHOTO_FINISH and no other state, because the window opens at the endgame
threshold and every other state has left by then; a change that moved BATTLE_ZOOM or OVERVIEW here
would be evidence of a leak, not of a better shot. The table below carries the new figures.

**RE-MEASURED IN FULL FOR ENDGAME-COMPLETE-1, AND EVERY FIGURE IS IDENTICAL TO THE DIGIT** —
frame counts included. That block adds `bandFloor` beside `contentionWatch`, and BOTH default to
`false`, so nothing shipped moves with them off. This is the measurement that says so rather than the
assumption; the switches' effect with them ON is on the acceptance sheet, in the browser, where it
belongs.

**RE-MEASURED IN FULL FOR CONTENTION-WATCH-1, AND EVERY FIGURE IS IDENTICAL TO THE DIGIT** —
frame counts included. That block adds the contention watch behind `contentionWatch`, whose default
is `false`, so no behaviour changes with it off; this is the measurement that says so rather than the
assumption. The switch's effect with it ON is measured in the report, on the browser, where it
belongs.

**RE-MEASURED IN FULL FOR VIEWER-INVARIANTS-2, AND PHOTO_FINISH IMPROVED SHARPLY — median
4.51 -> 3.54, p95 19.50 -> 8.91.** Every other state is identical to the digit, frame counts
included. This is an INDEPENDENT reading of that block's repair: the pan target was being resolved at
one zoom and the frame drawn at another, and because an offset is `-camX x effectiveZoom` the error
was multiplied by the anchor's distance from the world origin. PHOTO_FINISH is where the endgame's
zoom moves fastest, so it is where the mismatch was largest — and this table, which samples the
tracking phase and knows nothing about that block's browser measurements, halves its p95 there.

**RE-MEASURED IN FULL FOR VIEWER-INVARIANTS-1, AND EVERY FIGURE IS IDENTICAL TO THE DIGIT** —
frame counts included. That block adds CAMERA-SIDEJUMP-1's zoom-about-the-anchor pivot to the GLIDE
branch, scoped to frames where the endgame schedule authors the zoom. This table samples the
TRACKING phase only, and the change lives entirely inside glide frames, so the two do not overlap by
a single sample. Worth stating rather than assuming: the browser measurement that motivated the
change reports the leader running 2806 px off the canvas on frames this table never looks at.

**RE-MEASURED IN FULL FOR ENDGAME-REPAIR-1. Only PHOTO_FINISH moved, and it moved BACK: median
4.62 -> 4.51, p95 21.49 -> 19.50.** Every other state is identical to the digit, frame counts
included. PHOTO_FINISH is the one state the endgame's width authority reaches with
`_focusAnchorRacer` null, so it is the only one any change to that authority can touch — the same
sentence the two entries below make, and this block moves it in the direction those entries called
worse. The cause is the same three cuts: the OVERVIEW entry snap, the LEAD_CHANGE entry snap and the
period-2 strobe all displaced the subject on the frames they fired, and none of them fires now.

**RE-STAMPED, NOT RE-MEASURED, FOR CAMERA-SEED-AND-LINE-1 — and the reason is a fact, not a
judgement.** That block's only file under this stamp's `depends=` directory is the NEW
`camera/cameraSeed.js`, which derives the camera's random seed from the race's. It is imported by
`RaceScreen` alone and is **not in `tracking-lag.mjs`'s load closure** — the harness sets the
camera seed itself, through `raceDriver`'s identity, and never reaches the browser screen. The
director itself is untouched by that block: its diff is empty.

**RE-MEASURED IN FULL FOR ENDGAME-SCHEDULE-2. Only PHOTO_FINISH moved — median 5.59 -> 4.62,
p95 16.61 -> 21.49** — and it is the only state the endgame's own width authority reaches with
`_focusAnchorRacer` null. The pair moves in opposite directions because the schedule's carried ramp
follows the leader's fitted progress rather than his raw one: the TYPICAL frame is better placed,
while the frames where the fit and the physics disagree most are worse. Every other state is
identical to the digit. Worth
recording HOW that came about, because for one build it was not. ENDGAME-SCHEDULE-2 lets the endgame
SCHEDULE author the zoom outright, and the first placement of that assignment was AFTER the follow
branch — which left `update()`'s zoom-about-the-anchor pivot correcting only the lerp's own small
delta while the schedule moved the zoom by much more. An unpivoted zoom change is CAMERA-SIDEJUMP-1's
own defect, and `_focusAnchorRacer` returns null in PHOTO_FINISH, so that is where it landed:
**PHOTO_FINISH p95 16.61 -> 90.72 pp**, the subject sliding most of a frame from where the framing
rule puts him. Moving the assignment BEFORE the branch chain, so the pivot sees the whole change,
returns every figure in this table to the value below.

**RE-MEASURED IN FULL FOR ENDGAME-SCHEDULE-1.** Every frame count and both percentiles moved a
little, and PHOTO_FINISH moved in both directions at once — p95 **25.39 -> 16.61**, median
**3.11 -> 5.59**. Read that pair together: the endgame's schedule places the shot rather than letting
it settle against a bound, so the WORST following errors are gone (the p95 is the shot lurching after
a bound moved) while the TYPICAL error rises, because a shot that is deliberately travelling is never
exactly where a table that assumes a settled shot says it should be.
**THIS TABLE CANNOT SAY WHETHER THE ENDGAME FOLLOWS WELL** — `intended` here is the framing table's
STATIC answer, and the run-in deliberately places the leader away from it (RUNIN-GLIDE-1's mirror).
The endgame's own following is measured by `scripts/diag/endgame-spec.mjs`.

**RE-MEASURED IN FULL FOR SHIP-MINIMAP-ONE-SOURCE, AND EVERY FIGURE IS IDENTICAL TO THE DIGIT.** The
merge puts two files under this stamp's `depends=` directory, so the guard asks — and it was RE-RUN
rather than re-stamped, which is the stronger answer and the one the ship called for. **It is stamped
at `30cee205`, the commit that actually changed those files, and NOT at the merge**: THE SHIP ORDER's
`PENDING` placeholder cannot be used here, because the regex requires a hex SHA and an unparseable
stamp is not reported — it is silently dropped, which in this document means ZERO stamps and the
guard's own loud-failure rule firing. It would have
been defensible to argue: `Minimap.js` is not in `tracking-lag.mjs`'s load closure (8 files, walked
rather than remembered), and `cameraTimingComputation.js` changes what the director READS without
changing what it DOES, which the unmoved CAMERA fingerprint independently says. Both arguments are
true and neither is a measurement. Frame counts and both percentiles are unchanged from the table
below.

**RE-STAMPED, NOT RE-MEASURED, FOR MINIMAP-ONE-SOURCE-1 — and the reason is a fact, not a
judgement.** That block's only source file is `Minimap.js`, which sits inside this stamp's
`depends=` directory and so trips the guard, and **is not in `tracking-lag.mjs`'s load closure**:
that closure is 8 files, and `closureOf` was RUN to say so rather than the claim being carried over
from the two entries below that say the same thing. The measurement cannot see the minimap — it
reads the director's framing, and the minimap is pure render that takes no part in the projection.
The figures below are the PHOTO-FINISH-STATE-1 run, unchanged.

**RE-MEASURED IN FULL FOR PHOTO-FINISH-STATE-1, AND EVERY FIGURE IS IDENTICAL TO THE DIGIT.** That
block adds PHOTO_FINISH to `ALL_STATES` in `cameraTimingComputation.js`, which is inside this
stamp's `depends=` directory, and it genuinely changes what the director READS: the state's own
profile in `defaults.js` now supplies its `minStateHold`, its `maxStateDuration` and its
`maxEntryDurationMs`, where before each of those fell back silently to another state's number
because the key was absent from the map entirely. So the guard asked, and the answer had to be
measured rather than argued.

| state         | frames | median pp | p95 pp |
| ------------- | ------ | --------- | ------ |
| BATTLE_ZOOM   | 10923  | 5.30      | 9.77   |
| COMEBACK_ZOOM | 159    | 4.84      | 7.40   |
| LEADER_ZOOM   | 17169  | 3.72      | 9.32   |
| LEAD_CHANGE   | 9373   | 4.42      | 7.42   |
| OVERVIEW      | 4323   | 2.48      | 16.00  |
| PHOTO_FINISH  | 1865   | 3.00      | 8.79   |

(ENDGAME-LAND-CLEAN-1's run, which differs from ENDGAME-SCHEDULE-1's only in PHOTO_FINISH's two
percentiles — that run read 3.54 / 8.91. The PHOTO-FINISH-STATE-1 run the paragraph below describes read
BATTLE_ZOOM 10935 / 5.30 / 9.77, COMEBACK_ZOOM 162 / 6.84 / 7.50, LEADER_ZOOM 17175 / 3.73 / 9.06,
LEAD_CHANGE 9378 / 4.42 / 7.26, OVERVIEW 4248 / 2.43 / 16.00, PHOTO_FINISH 1865 / 3.11 / 25.39.)

**WHY NOTHING MOVED, WHICH IS THE PART WORTH READING.** Not because the state is rare — it runs
1865 frames here, and 206-279 frames on nine of the ten fingerprint tracks, held 3.4-4.7 s. Not
because the new values are unread either: forcing PHOTO_FINISH's cap to 2000 ms changes the
transition-reason counts on city-circuit (`hold-elapsed` 89 -> 159, `finish-drama-forced` 60 -> 0),
so the profile is reaching the hold gate. It is because **during PHOTO_FINISH every transition
resolves back to PHOTO_FINISH**, and `_transition` does its entry work only when the state actually
changes — so a self-transition is a deliberate no-op and a different hold gate changes only which
bypass wins the race to produce it. What ends this shot is `finishPhase.js`, not the hold gate.
The three Dev Screen controls on the PHOTO_FINISH row are now WIRED and still cannot move it.
CAMERA and RENDER are unmoved for the same reason, and were run rather than reasoned from.

**RE-MEASURED IN FULL FOR START-ONE-WINDOW-1 — TWICE, and the second run is this one: the block’s
documentation sweep touched a comment in `CameraDirector.js`, which is inside this stamp’s
`depends=` directory, so the guard asked again and the answer was measured rather than argued. Every
figure below is identical to the first run. THE FRAME COUNTS MOVED against the previous ship — which
is the point.**
Every camera block above this one changed FRAMING and left the state sequence alone; this one
replaces the start’s state rule, so which state is running when is a different answer.
**BATTLE_ZOOM 9701 → 10935, LEAD_CHANGE 7786 → 9378, COMEBACK_ZOOM 644 → 162, LEADER_ZOOM 17630 →
17175, OVERVIEW 4303 → 4248**, PHOTO_FINISH unchanged at 1865. The old post-start hold forced
LEADER_ZOOM for seven seconds regardless of the picture; the window now holds OVERVIEW until the
leader reaches his place, so the seconds it used to spend in LEADER are spent elsewhere and every
later state’s cooldown starts from a different moment. **The per-state LAG is steady or better
everywhere it moved** — BATTLE median 5.65 → 5.30, LEADER 3.82 → 3.73, OVERVIEW 2.43 — so the
sequence changed and the following did not get worse.

**RE-MEASURED IN FULL FOR ZOOM-PIVOT-START-1, AND EXACTLY THE TWO STATES THAT SHOULD HAVE MOVED DID.** That block removes the `_runInActive` scope from the zoom-about-the-anchor correction, so it now reaches every group shot — the three states where `_focusAnchorRacer` returns null. **Every frame count is unchanged** (BATTLE_ZOOM 9701, COMEBACK_ZOOM 644, LEADER_ZOOM 17630, LEAD_CHANGE 7786, OVERVIEW 4303, PHOTO_FINISH 1865), because this is framing and not state selection. **BATTLE_ZOOM p95 9.97 → 9.56** and **PHOTO_FINISH p95 35.66 → 25.03** (median 3.50 → 3.11); LEADER_ZOOM, LEAD_CHANGE and COMEBACK_ZOOM are identical to the digit, which is the check that the correction did not re-point itself where it already worked. **OVERVIEW is identical too, and that is not a null result**: this table measures the TRACKING phase only, and the start window this block was written for is the ENTRY phase, which it excludes by construction.

**RE-STAMPED, NOT RE-MEASURED, FOR FALLBACK-MIRRORS-1 — same corroboration as the entry below.**
That block deletes four copied defaults from `cameraTimingComputation.js`, which is inside this
stamp's `depends=` directory and inside `tracking-lag.mjs`'s load closure, so the guard tripped as
designed. **CAMERA and RENDER were measured on that block's tree and are BYTE-IDENTICAL** to their
recorded values (which live in [fingerprints.json](fingerprints.json)). No camera decision and no
framing changed, so the lag inside states cannot have moved. The table below is unchanged; only the
stamp moved.

**RE-STAMPED, NOT RE-MEASURED, FOR ENDGAME-FALLBACK-1 — and the corroboration is arithmetic rather
than an argument.** That block deletes a literal `0.85` from `cameraTimingComputation.js`, which IS
inside this stamp's `depends=` directory and inside `tracking-lag.mjs`'s load closure, so the guard
tripped as designed. What settles it is not the usual "the tool cannot reach the file" reasoning —
it can — but something stronger: **CAMERA and RENDER were measured on that block's tree and are
BYTE-IDENTICAL** to their recorded values (which live in [fingerprints.json](fingerprints.json) and
are deliberately not copied here). No camera decision and no framing changed anywhere, so the lag
inside states cannot have moved either. The deleted literal was
unreachable from every shipped path — that is the block's whole finding — and the two fingerprints
are the measurement that proves it. The table below is unchanged; only the stamp moved.

**RE-MEASURED IN FULL FOR ENDGAME-THRESHOLD-095, AND THIS IS THE FIRST ENTRY HERE WHERE THE FRAME
COUNTS MOVED.** The endgame threshold went 0.9 -> 0.95 on the owner's decision, and that key is a
STATE GATE as well as the run-in's window — so unlike every camera block above it, this one changes
which state the director is in, not merely how tightly it frames. The counts say so: **BATTLE_ZOOM
9406 -> 9701, COMEBACK_ZOOM 605 -> 644, LEADER_ZOOM 17788 -> 17630, LEAD_CHANGE 7789 -> 7786**, with
OVERVIEW and PHOTO_FINISH identical (4303 / 1865) because neither is eligible in the stretch the
threshold moved. A later endgame means ~160 frames that used to be LEADER_ZOOM are now whatever the
ordinary priority order picks, and BATTLE takes most of them.

**Every tail improves and one median jumps.** LEAD_CHANGE p95 **31.33 -> 7.12** and LEADER_ZOOM
**9.49 -> 8.72**, PHOTO_FINISH **37.36 -> 35.66**, BATTLE **10.99 -> 9.97**: the run-in's opening is
the steepest zoom in the race and the lag is proportional to the zoom rate, so a window that starts
later spends less of each state inside it. **COMEBACK_ZOOM's median goes 1.15 -> 14.23 and must not
be read as a regression** — it is 644 frames, it swung 13.73 -> 2.01 -> 1.15 across the three blocks
above on samples of the same size, and the direction reverses with whichever races happen to carry a
comeback into the endgame. It is the one row on this page that has never been stable enough to
carry an argument.

**It was RE-MEASURED rather than re-stamped, and the reason is the same fact the entries below turn
on**: `defaults.js` IS in `tracking-lag.mjs`'s load closure. The guard flagged only the staged test
file, which cannot reach the measurement — but the key that moved can, so an argument from the test
file alone would have been true and beside the point.

**RE-MEASURED IN FULL FOR RUNIN-BACK-1, AND EVERY NUMBER WENT BACK TO WHERE IT WAS BEFORE
RUNIN-AHEAD-1.** That block's forward bound is removed, so the two FORWARD states it had moved
return exactly: **LEADER_ZOOM 4.00 → 4.05 median and 9.03 → 9.49 p95; LEAD_CHANGE 4.54 → 4.57 and
29.00 → 31.33.** Every other state is unchanged and every frame count is identical. The table below
is once again the RUNIN-HOLD-1 table, digit for digit — which is the strongest available statement
that the removal is exact and left nothing behind. CAMERA and RENDER say the same thing: both
returned to their pre-RUNIN-AHEAD-1 values.

**RE-MEASURED IN FULL FOR RUNIN-AHEAD-1, AND EXACTLY THE TWO STATES THAT SHOULD HAVE MOVED DID.**
The forward-extent bound applies only where the framing has a FORWARD look to reclaim, so the
prediction before running it was: the two FORWARD states move, the CENTRED photo finish does not,
and no frame count changes. That is the reading. **LEADER_ZOOM median 4.05 → 4.00 pp and p95
9.49 → 9.03; LEAD_CHANGE median 4.57 → 4.54 and p95 31.33 → 29.00** — both IMPROVED, because a
leader held further forward in frame is closer to where the pan is already heading. **PHOTO_FINISH
is identical to the digit at 4.81 / 37.36**, which is the CENTRED contract holding, and BATTLE_ZOOM,
COMEBACK_ZOOM and OVERVIEW are identical too. **Every frame count is identical** (9406 / 605 /
17788 / 7789 / 4303 / 1865): no state decision moved.

**RE-STAMPED, NOT RE-MEASURED, FOR RUNIN-START-1 — and the reason is a fact, not a judgement.**
That block added ONE TEST under `client/src/modules/camera/`, which is inside this stamp's
`depends=` directory, so the guard tripped as designed: it deliberately cannot tell a change that
matters from one that does not, and says so in its own header. **What settles it is that
`scripts/tracking-lag.mjs` cannot reach a test file** — its load closure is `lib/raceDriver.mjs` and,
through it, `defaults.js`, `EditorShape.js`, `CameraDirector.js`, `raceCore.js`, `durationModel.js`,
`rowLayout.js`, `racer-types/index.js`, plus `frameGeometry.js` and `framingRule.js` imported
directly. `CameraDirector.test.js` is in none of them and nothing under `scripts/` imports it. The
same argument MINIMAP-MARKS-1 used, on the same guard, for the same reason. **And here it is
corroborated arithmetically: CAMERA and RENDER were re-measured on that block's tree and are
BYTE-IDENTICAL, so no camera behaviour changed at all.** The table below is unchanged from
`7f792a7c`; only the stamp moved.

**RE-MEASURED IN FULL FOR RUNIN-LINE-1, AND ONE STATE MOVED — THE ONE THE REPAIR ACTS IN.** The
corridor cap stopped closing past the finish line, and the cap's only scope is `PHOTO_FINISH`. So
the expectation was that PHOTO_FINISH would move and nothing else would, and that is exactly the
reading: **PHOTO_FINISH median 5.44 → 4.81 pp, p95 33.94 → 37.36 pp**, with every other state's
median and p95 identical to the digit and **every frame count identical to the digit** — 9406 / 605
/ 17788 / 7789 / 4303 / 1865, which is the proof no state decision moved. The median IMPROVES
because the shot is no longer tightened past the line and a given world lag is a smaller fraction of
a wider frame; the tail rises because the frames the cap used to hold tight are now the frames the
run-in is still opening through. A guard that could not tell those apart would have been re-stamped
on an argument — this was re-run.

**RE-MEASURED IN FULL FOR RUNIN-HOLD-1 — the first time since this stamp was written that the
change actually reached the measurement.** The two preceding entries below re-stamped without
re-measuring, correctly, because `Minimap.js` is not in `tracking-lag.mjs`'s load closure.
`CameraDirector.js` is, and RUNIN-HOLD-1 changes when the shot closes, so the numbers were re-run
rather than argued about. The table further down carries them; every frame count is identical and
the movement is entirely in the tails.

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
| BATTLE_ZOOM   | 9701   | 5.71      | 9.97   |
| COMEBACK_ZOOM | 644    | 14.23     | 16.22  |
| LEADER_ZOOM   | 17630  | 3.82      | 8.72   |
| LEAD_CHANGE   | 7786   | 4.42      | 7.12   |
| OVERVIEW      | 4303   | 2.65      | 16.00  |
| PHOTO_FINISH  | 1865   | 3.50      | 35.66  |

OVERVIEW median 2.65 pp against every other state pooled 4.56 pp (ratio 0.58×).

**RE-MEASURED FOR RUNIN-HOLD-1, AND EVERY FRAME COUNT IS IDENTICAL TO THE DIGIT.** That is the
first thing to read here and it is the proof the block owes: 9406 / 605 / 17788 / 7789 / 4303 /
1865, unchanged, so **no state decision moved anywhere** — the run-in still reads the states rather
than competing with them. Only the LAG inside states moved.

**IT MOVED IN THE TAILS, WHICH IS WHERE THE CHANGE LIVES.** The run-in now HOLDS its opening shot
for 77–85% of the endgame window and then closes in one 1.13–1.30 s sweep, instead of tightening
continuously across the whole window. The closing is therefore concentrated: the same total travel
happens in about a fifth of the time, so during those seconds the camera trails its subject further
than it used to, and at no other time does it trail differently.

The p95s that rose are exactly the endgame states: PHOTO_FINISH **26.85 → 33.94**, LEAD_CHANGE
**22.17 → 31.33**, with BATTLE_ZOOM 10.55 → 10.99 and LEADER_ZOOM 9.32 → 9.49 barely moving.
**Medians are flat everywhere** (LEADER_ZOOM and OVERVIEW identical to the digit), which says the
ordinary tracking is untouched — the endgame window is a small fraction of a 60-second race, so its
frames land in each state's tail and nowhere else.

**COMEBACK_ZOOM's median FELL, 2.44 → 1.15 pp**, on an unchanged 605 frames. It is the smallest
sample on the page and the one that has swung before (13.73 → 3.06 at RUNIN-1); a 605-frame median
is not a stable statistic and this is not read as an improvement.

**THIS IS THE COST THE OWNER IS BEING ASKED TO JUDGE**, not a regression to fix: a held shot that
then sweeps is a bigger move in less time, and a camera that trails during an authored move is what
an authored move looks like. If the tails read as sloppy on screen, the lever is the sweep's length
(`runInOpenMs`), not the hold.

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
lateral guarantee's arithmetic and `lateralShiftToFit`'s one-dimensionality (see the LEADER-LATERAL-BUILD-1 note below for the one deliberate exception); the min-draw floor and its
zoom-independence; name-tag layout, occlusion and the start-formation exception; the config loader's
defaults-under / stored-over / unknown-ignored rule; every framing validation band and its
reject-not-clamp behaviour; the engine-input list; the detour recorder's non-interference; the
render path's `detectBattleGroup` contract; and every camera decision at once, via the fingerprint.

**LEADER-LATERAL-BUILD-1 — the leader's own lateral guarantee, and the one place this design is
deliberately two-dimensional.** `LEADER_ZOOM` names the leader as its anchor but runs the CORRIDOR
guarantee, and CAMERA-LATERAL-1 pins the anchor to the centreline, so until this block the leader's
sideways position was an input to nothing. Adding him to `_applyLateralGuarantee`'s subject list does
NOT fix it — measured at 0 changed frames of 2,019 — for two independent reasons: the corridor edges
are always in that list and `lateralShiftToFit` intersects intervals, so a subject lying inside them
cannot narrow the answer; and the corridor does not fit the frame on 100% of `LEADER_ZOOM` frames, so
the helper is permanently in its "split the difference" branch, which is decided by the extremes
alone.

So he gets his own interval from `lateralAdmissibleForBody`, computed on his four drawn body corners
against the real frame, and the corridor's answer is CLAMPED into it. Three properties make that safe
rather than a return of the defect the one-dimensionality note warns about:

- **An empty interval is honoured, not worked around.** When no sideways move fits him he is being
  lost ALONG the track and the shift is left alone. That residual belongs to the zoom.
- **The step is BOUNDED** (`leaderLateralMaxPx`). A rectangle test will rescue an along-track loss by
  sliding a long way sideways — that is the recorded 500 world px chase — and the bound is what stops
  it. Past the bound the leader stays partly clipped, deliberately.
- **It is scoped to `LEADER_ZOOM`** at the call site, by state and not by anchor kind, because
  OVERVIEW shares the `leader` anchor and is not in this rule.

A margin (`leaderLateralMarginPx`) keeps his body inside the edge because the guarantee is computed on
the pan TARGET while the picture arrives through the smoother, always some way behind it. With no
margin the rule reports "he fits" on 383 of the 394 frames that still clipped — the promise is made at
the edge and broken before it is drawn. This is the job `innerFramePct` does for every other subject.

Measured over ten tracks x ten races: the clip rate falls **4.18% -> 1.29%** pooled (69.1% of clipped
frames removed; space-sprint 15.4% -> 3.3%), the camera holds the centre on **90.27%** of frames, the
along-track residual is **unchanged at 830 frames**, and the picture's largest single-frame movement is
unchanged — 93 of 100 races carry a >=120 px frame in BOTH arms, which is pre-existing pan motion. No
extra easing was added and none is needed: the shift moves the pan TARGET, and the existing pan
smoother is what turns it into a travel.

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
- **~~Two code fallbacks disagree with the shipped defaults~~ — RESOLVED, and the whole class with
  it.** This read as an open item naming `comebackMinStartGap` and `comebackMaxCurrentRankPct` until
  2026-08-19. Both stopped copying their default when MIRRORS-BY-REFERENCE converted
  `cameraTimingComputation.js`, and `outcomePhaseThreshold` had already left the list on 2026-08-10
  (OUTCOME-PHASE-75, where the owner decided the value and its three sites stopped copying it).
  **`scripts/check-fallback-agreement.mjs` now reports `0 disagree, 0 on the exception list`** for
  the whole repository — see [VERIFY-RULES R14](VERIFY-RULES.md), which owns the rule. The guard is
  still what fails when a new one appears, and the values are still not stated here.
- **`START_PHASE_DURATION` is gone** (START-ONE-WINDOW-1, 2026-08-21). It was a constant rather than
  a control, and CAMERA-TAGS-1 had measured it about five seconds short of when the field actually
  spreads. The start is one window now, `startWindowMs`, and it IS a control — see §3a-start.

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
