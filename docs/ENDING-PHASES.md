# The ending — every phase from the winner crossing to the settled result screen

**What this document owns:** the INVENTORY of the ending. What happens, in order, what decides how
long each part lasts, where that length lives, and whether the Dev Screen can reach it. It is the
map a change to the ending starts from — the start ceremony has one block of controls in ceremony
order, and this is the survey the ending's equivalent is built on.

**What it is NOT:** the values. Those live in `client/src/modules/storage/defaults.js`, and this
document deliberately states none of them.

**Where the ending's FRAMING comes from, which is not in this table (RUNIN-1, 2026-08-12).** Every
phase below inherits a shot the RUN-IN composed: from the moment the leader is within reach of the
line, the run-in bounds whatever shot is running, opening wide-and-back over `runInOpenMs` and
closing to the ordinary shot exactly at the crossing — where this table begins. So phase 2's width
is set before phase 2 starts, and nothing here decides it.
[CAMERA_DIRECTOR §3a](CAMERA_DIRECTOR.md) is its one home; this line exists so a reader looking for
"what decides how the ending LOOKS" is not left with only durations. **This document owns the
LENGTHS; the camera document owns the FRAMING.**

---

## The two kinds of phase, because they need opposite treatment

**TIMED** — a duration somebody chose. A slider is meaningful.

**EVENT-DRIVEN** — it lasts until something happens in the race. **These get NO slider.** A control
that cannot change what it names is a defect this project has already paid for three times
(`PHOTO_FINISH.minStateHold`, the lookback above 400 px, the "two clocks" of `postStartHoldMs`), and
the correct response is to say so in this table instead of building one.

---

## The phases, in order

| # | phase | what happens | what decides its length TODAY | where that lives | Dev Screen? |
| --- | --- | --- | --- | --- | --- |
| 1 | **Photo-finish check** | one-shot test of whether the top two are close enough for the group shot | **EVENT-DRIVEN** — fires at a leader-progress threshold, not after a duration | `photoFinishLeadProgress`, `photoFinishCloseThresholdT` | yes (thresholds, not a length) |
| 2 | **Photo-finish / drama shot** | tight top-2 group shot with slow-motion, or the single-winner LEADER_ZOOM pulse | `finishDramaDurationMs` | defaults.js | yes |
| 3 | **Slow-motion factor** | physics slowed during the photo-finish shot | `photoFinishSlowmoFactor` — a RATE, not a length; it stretches phase 2 rather than adding a phase | defaults.js | yes |
| 4 | **Hold before the zoom-out** | the winner held before the camera releases | **none — it is the tail of phase 2.** There is no separate hold; FINISH_OVERVIEW begins when the drama duration expires | — | no, and none is needed |
| 5 | **Zoom-out** | smooth pull back to the overview | `finishOverviewZoomOutDurationMs` | defaults.js | yes |
| 6 | **The wait for the stragglers** | the rest of the field crosses and freezes on the line | **EVENT-DRIVEN** — ends when `finishedCount >= nRacers` (`RaceScreen/index.jsx`), i.e. when the last racer's `t` reaches `finishT`. **NO SLIDER, EVER.** Measured — see below the table | the race | **no — by design** |
| 7 | **Hold on the finish picture** | extra time on the settled shot after the field is home | `finishHoldAfterLastMs` (ENDING-HOLD-1) | defaults.js | yes — **on by default; 0 is the escape hatch** |
| 8 | **Winner card** | the card naming the winner, over the race picture | `min(winnerCardMs, finishPauseMs)` — a TENANT of phase 9, it cannot extend the ending | defaults.js + `WinnerCard.jsx` (`winnerCardWindowMs`) | yes |
| 9 | **Pause before the result screen** | the settled picture until the screen changes | `finishPauseMs` | defaults.js | yes |
| 10 | **Screen transition** | fade to black, navigate, fade in | **A HARD-CODED CONSTANT: 320 ms + a 50 ms settle** | `contexts/TransitionContext.jsx` | **NO — hidden constant** |
| 11 | **Podium build-up** | 3rd, 2nd, winner (held two beats), then the ranking | `4 x podiumRevealBeatMs`; the classes come off one beat later | defaults.js + `ResultScreen/index.jsx` | yes |
| 12 | **Result screen settled** | the final screen, identical to the pre-feature DOM | — | — | — |

### Phase 6, MEASURED — and both of the old numbers were wrong

<!-- MEASURED: straggler-truth (phase 6 duration, zoom-out lead, stragglers in shot) @ 966ee56f 2026-08-26 depends=client/src/modules/camera/CameraDirector.js -->
**RE-MEASURED IN FULL FOR LEADER-LATERAL-BUILD-1, AND EVERY FIGURE IS IDENTICAL TO THE DIGIT
(2026-08-26)** — 6.18/4.57, 7.53/5.75, 4.45/2.30, 5.95/4.38, the same racers in shot (5/5, 6/6, -/-,
7/7) and the same settled-frame counts (94, 165, 0, 83). Run rather than argued: the change adds a
term to the pan in `LEADER_ZOOM`, and a race enters the ending from whatever the camera was doing
just before it, so "the windows are disjoint" is not by itself a proof. Phase 6's four numbers are
answers about WHEN thresholds are crossed; the new term moves only where the camera aims ACROSS the
corridor, and it is scoped out of the run-in and the finish entirely.

**RE-MEASURED IN FULL FOR RUNIN-EASED-ADMIT-1, AND EVERY FIGURE IS IDENTICAL TO THE DIGIT
(2026-08-26)** — 6.18/4.57, 7.53/5.75, 4.45/2.30, 5.95/4.38, the same racers in shot and the same
settled-frame counts. **It had to be run this time**: the level ceiling now outlives
`_runInComposingNow` by up to `runInOpenMs`, so the run-in's hand-back overlaps the start of the
ending and the two windows are no longer disjoint. The durations are unmoved anyway, because they
are answers about WHEN thresholds are crossed and the repair moves only the width's path between
frames.

**RE-MEASURED IN FULL FOR RUNIN-PIVOT-SCOPE-1, AND EVERY FIGURE IS IDENTICAL TO THE DIGIT
(2026-08-26)** — 6.18/4.57, 7.53/5.75, 4.45/2.30, 5.95/4.38, the same racers in shot and the same
settled-frame counts. Run rather than argued: the repair re-orders where the aim is resolved on every
path including this one, so the usual "the windows do not overlap" argument does not cover it. Phase
6's lengths are answers about WHEN thresholds are crossed and the repair moves only WHERE the camera
aims, which is why the CAMERA fingerprint moved and these four durations did not.

**RE-MEASURED IN FULL FOR RUNIN-PAN-STALE-ZOOM-1, AND EVERY FIGURE IS IDENTICAL TO THE DIGIT
(2026-08-26)** — 6.18/4.57, 7.53/5.75, 4.45/2.30, 5.95/4.38, the same racers in shot (5/5, 6/6, -/-,
7/7) and the same settled-frame counts (94, 165, 0, 83).

**IT WAS RUN RATHER THAN ARGUED, AND THIS TIME THE USUAL ARGUMENT WAS NOT EVEN AVAILABLE.** Earlier
entries could rest on the run-in releasing before phase 6 begins, so the two windows never overlap.
That sentence does not cover this block: its repair is scoped to `_runInAfterDeadline`, which is
TRUE for the whole of phase 6 — the close is still "running" long after the run-in has handed the
width back. So the endgame is inside the changed window by construction, and the only honest answer
was the measurement.

**Why it did not move anyway:** phase-6 durations and zoom-out leads are answers about WHEN
thresholds are crossed, and the repair moves only WHERE the camera aims — it re-expresses the pan
target at the drawn zoom and changes no schedule, no threshold and no width. The CAMERA fingerprint
moved and these four durations did not, which is the distinction stated as a measurement.

**RE-MEASURED IN FULL FOR RUNIN-LEVEL-SET-BUILD-1, AND EVERY FIGURE IS IDENTICAL TO THE DIGIT
(2026-08-25)** — all four phase-6 durations and all four zoom-out leads.

**IT WAS RUN RATHER THAN ARGUED.** Every earlier entry here could rest on the CAMERA fingerprint
coming back byte-identical; that sentence is unavailable to this block, because **the camera
fingerprint MOVED**. The measurement is the answer instead of the inference.

**And the reason it did not move is structural rather than lucky.** The new width authority is scoped
to the run-in, and `_updateRunIn` releases at the FIRST crossing — phase 6 begins after the winner is
home, so the two windows do not overlap by a single frame, which is what this section says a few
paragraphs down for a different reason.
**RE-STAMPED, NOT RE-MEASURED, FOR BACKLOG-SORTED-1 (2026-08-23).** That change adds a COMMENT to
`camera/CameraDirector.js` — the owner's decision to document `_lfEntryByState` in place rather than
delete it — and **not one executable character changed**. It was not left as an argument from the
diff: `npm run verify`'s own routing selected the CAMERA and RENDER fingerprints, because that file
is inside both closures, and **both came back byte-identical to the values in
[fingerprints.json](fingerprints.json)**. A frame sequence that hashes identically cannot have a
different phase-6 duration, zoom-out lead or straggler count, so the measurement whose answer cannot have changed is not run.

Stamped at the parent commit `fd9037d5` per the guard's two-step, and corrected to `fa14ca0c` —
the commit that actually carried the comment — in this follow-up.


**RE-MEASURED IN FULL FOR RETIRE-RUNIN-LEGACY-1, AND IDENTICAL TO THE DIGIT** — 6.18/4.57,
7.53/5.75, 4.45/2.30, 5.95/4.38, the same racers in shot and the same settled-frame counts. Run
rather than argued, for the reason the tracking-lag entry gives. **The stamp's id is repaired here
too**, for the reason recorded beside that one.

**RE-MEASURED IN FULL FOR ENDGAME-REWRITE-1, AND IDENTICAL TO THE DIGIT** — 6.18/4.57, 7.53/5.75,
4.45/2.30, 5.95/4.38, the same racers in shot and the same settled-frame counts. Run rather than
argued, for the reason the entry under the tracking-lag stamp gives: that block rewrites the endgame
path, so a null result has to be measured to be worth anything.

**RE-MEASURED IN FULL FOR ENDGAME-LAND-CLEAN-1, WITH THE SWITCHES ON, AND IDENTICAL TO THE DIGIT** —
6.18/4.57, 7.53/5.75, 4.45/2.30, 5.95/4.38, and the same racers in shot and the same settled-frame
counts. **Every entry below this one is justified by "the switch defaults off", and that reason has
just expired:** `contentionWatch` and `bandFloor` ship ON from this block. So the claim rests only on
the structural one now, and it is the stronger of the two — the endgame's width authority owns a
window that CLOSES at the first crossing, and phase 6 BEGINS there. The two never overlap by a frame.

**RE-MEASURED IN FULL FOR ENDGAME-COMPLETE-1, AND IDENTICAL TO THE DIGIT AGAIN** — same four
pairs. Both of that block's switches default off, and phase 6 begins at the first crossing in any case.

**RE-MEASURED IN FULL FOR CONTENTION-WATCH-1, AND IDENTICAL TO THE DIGIT AGAIN** — same four
pairs. The switch defaults off, and phase 6 begins at the first crossing in any case.

**RE-MEASURED IN FULL FOR VIEWER-INVARIANTS-2, AND IDENTICAL TO THE DIGIT AGAIN** — same four
pairs, same standing reason.

**RE-MEASURED IN FULL FOR VIEWER-INVARIANTS-1, AND IDENTICAL TO THE DIGIT AGAIN** — same four
pairs, same reason as every entry below it: the run-in's window closes on the first crossing and
phase 6 begins there.

**RE-MEASURED IN FULL FOR ENDGAME-REPAIR-1, AND IDENTICAL TO THE DIGIT AGAIN** — 6.18/4.57,
7.53/5.75, 4.45/2.30, 5.95/4.38, the same four pairs as the table below. Same reason as the entry
that follows, and it is structural rather than lucky: every change that block makes is inside the
endgame's width authority, whose window CLOSES on the first crossing, and phase 6 BEGINS there.

**RE-MEASURED IN FULL FOR ENDGAME-SCHEDULE-2, AND IDENTICAL TO THE DIGIT AGAIN**, for the reason the
entry below already gives: the run-in's window closes on the first crossing and phase 6 begins there,
so nothing this table measures is downstream of a change to the endgame's width authority.

**RE-MEASURED IN FULL FOR ENDGAME-SCHEDULE-1, AND EVERY FIGURE IS IDENTICAL TO THE DIGIT.** That
block rewrites the endgame's width authority in `CameraDirector.js`, which is this stamp's whole
`depends=`, so the guard asked and the answer was measured rather than argued. 6.18/4.57, 7.53/5.75,
4.45/2.30, 5.95/4.38 — the same four pairs as below. Expected, and worth saying why: the run-in's
window closes on the first crossing (`finishedCount > 0`) and phase 6 BEGINS at that crossing, so
the two do not overlap by a single frame.

The two numbers this section used to carry were flagged as unverified on 2026-08-14, because nothing
in the repository measured them. `scripts/straggler-truth.mjs` does now. **One CLOSED track and one
OPEN one, at 20 and at 40 racers, seed 9:**

| track | n | phase 6 lasts | zoom-out begins BEFORE the last crossing | still running then | of those, off canvas |
| ----- | - | ------------- | ---------------------------------------- | ------------------ | -------------------- |
| dirt-oval | 20 | **6.18 s** | **4.57 s** | 11 of 20 | **11** |
| dirt-oval | 40 | **7.53 s** | **5.75 s** | 29 of 40 | **27** |
| river-run | 20 | **4.45 s** | **2.30 s** | 7 of 20 | **6** |
| river-run | 40 | **5.95 s** | **4.38 s** | 33 of 40 | **28** |

**"~2.9 s at 20 racers" was wrong** — it is **4.45 s** on the open track and **6.18 s** on the closed
one, and it grows with the field: 5.95 s and 7.53 s at 40.

**"the zoom-out starts ~1.4 s before it ends" was wrong, and wrong in the direction the audit
suspected.** It starts **2.30–5.75 s** before the last crossing. The separate measurement that
recorded 4.4–5.9 s stands; 1.4 s does not.

**THE ENDING OVERLAPS THE RACE, AND IT SHOWS THE RACERS IT IS WAITING FOR.** The last two columns of
the table are a snapshot of ONE frame — the first of the pull-back, when the shot is still at its
tightest — and they must not be read as the state of the ending. **The camera then opens and
travels.**

**Measured per frame in the SETTLED shot** — from the pull-back's own duration being up to the last
crossing — **every remaining still-running racer is in the picture**: 5 of 5 on dirt-oval at 20
racers, 6 of 6 at 40, 7 of 7 on river-run at 40, where the shot holds all 40 racers at once. The
camera centre moves about **300 world px further into the course** while the zoom opens roughly
four-fold, and then settles.

**So the lookback point is where the move ENDS, not where the camera sits throughout.**
`finishOverviewLookbackPx` is a fixed world point and FINISH_OVERVIEW does settle on it — but it
**goes and gets the field first**, which is why later finishers cross in shot.

**An earlier reading of this section said the ending waits for racers it is not showing. That was
measured on the wrong frames and is WITHDRAWN** — the owner tested the ending on 2026-08-22 and it is
correct. The durations above stand; the interpretation was wrong. See
[STRAGGLER-TRUTH-2](../reports/evolution/STRAGGLER-TRUTH-2.md).

**One structural note the fixed instrument surfaced:** on river-run at 20 racers the zoom-out leads
the last crossing by less than the pull-back's own length, so **that ending never reaches its settled
shot before the race is over.** Nothing is wrong with it; it is simply a short phase 6.

### The card's own fades

`WINNER_CARD_FADE_MS` (450 ms, `WinnerCard.jsx`) is a **hidden constant** and deliberately so: it
mirrors the opening brand card's CSS transition so the race begins and ends on the same movement.
Making it a slider would invite the two ends to drift apart. It is named here rather than left to be
discovered.

---

## Phases whose length is a NUMBER IN THE CODE with no control

1. **The screen transition (#10)** — 320 ms + 50 ms in `TransitionContext.jsx`. It is part of every
   ending and of every other screen change in the app, which is exactly why it has no ending-specific
   control: a slider here would be a slider on the whole application's navigation.
2. **The winner card's fades (#8)** — 450 ms each way, `WINNER_CARD_FADE_MS`. Reasoned above.
3. **The podium's class teardown (#11)** — the fifth beat, derived from `podiumRevealBeatMs` rather
   than typed, and invisible: every element is already at its final appearance when it happens.

**None of the three is proposed as a new key.** Each is a constant for a stated reason, and the
reason is in the source beside it.

---

## Phases that are EVENT-DRIVEN and must never get a slider

- **#1 the photo-finish check** — a predicate on the race, not a duration.
- **#6 the wait for the stragglers** — it ends when the last racer arrives. Its length is a property
  of the RACE, and the fair-arrival world makes it short on purpose (the ~2.9 s figure is
  UNVERIFIED — see the note under the phase table).
  A "wait longer" control here would either do nothing (everyone is already home) or hold a still
  picture while pretending to wait for arrivals that have happened. `finishHoldAfterLastMs` (#7) is
  the honest version of that wish and is named for what it actually does.

  **The owner settled this on 2026-08-12 and the shape is his:** _"das Rauszoomen sollte schon
  beginnen wenn der erste / die ersten im Ziel sind … Aber wenn der letzte ins Ziel kommt sollte das
  Bild noch ein wenig stehen bleiben"_ — the zoom-out keeps its present trigger (phase 5, off the
  FIRST crossing), and the extra time goes on the settled picture after the LAST. Gating the
  zoom-out on `finishedCount >= nRacers` was proposed and **rejected**: it would move phase 5 behind
  phase 6 and make the pull-back's start a property of the slowest racer.

**If the owner wants arrivals to watch, the lever is the race, not the ending** —
[PROJECT-PRINCIPLES §9](PROJECT-PRINCIPLES.md): the camera cannot manufacture a contest the race did
not produce, and neither can a pause.

---

## The total

`endingSchedule.js` computes it: `hold + pause + transition + 4 x podiumBeat`. **The Dev Screen shows
it read-only and never asks anyone to add it up** — that sum previously existed only in a reader's
head, across four sliders in two cards.
