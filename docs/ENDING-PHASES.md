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

<!-- MEASURED: straggler-truth (phase 6 duration, zoom-out lead, stragglers in shot) @ d6df5184 2026-09-24 depends=client/src/modules/camera/CameraDirector.js via=scripts/straggler-truth.mjs -->

★★ **RE-MEASURED AT `c008f21f` (NIGHT-2026-09-24D), IDENTICAL TO THE DIGIT** — 6.87/5.20/7of7/7of20/132f,
8.65/6.12/11of11/13of40/187f, 5.18/3.17/1of1/20of20/10f, 6.97/4.67/6of6/40of40/100f. Same reason as
its sibling: the `via=` closure reaches `raceGovernor.js`, which piece 3(d) edited. **Run, not
argued**, though 3(d) only ADDS exported functions that nothing in the governor's path calls.
★ All four rows of the current table stand.

★★★ **RE-MEASURED AT `3aeb169f` (CHASE-SHIP-1, 2026-09-23) — EVERY ROW MOVED, AND ONE SENTENCE
THIS SECTION CARRIED IS NOW FALSE.** `node scripts/straggler-truth.mjs`, seed 9, the command this
stamp names:

| track | n | kind | phase 6 lasts | zoom-out begins BEFORE the last crossing | unfinished in shot | any racer in shot | settled frames |
| ----- | - | ---- | ------------- | ---------------------------------------- | ------------------ | ----------------- | -------------- |
| dirt-oval | 20 | closed | **6.87 s** | **5.20 s** | 7 of 7 | 7 of 20 | **132** |
| dirt-oval | 40 | closed | **8.65 s** | **6.12 s** | 11 of 11 | 13 of 40 | **187** |
| river-run | 20 | open | **5.18 s** | **3.17 s** | 1 of 1 | 20 of 20 | **10** |
| river-run | 40 | open | **6.97 s** | **4.67 s** | 6 of 6 | 40 of 40 | **100** |

★ **This is the table that is CURRENT.** The one further down — 4.85/9.12/3.68/6.80 with two empty
rows — is the PRE-CHASE record, kept as history because every entry between here and there says
*"identical to the digit"* about it.

★★★ **THE SENTENCE THAT IS NOW FALSE, NAMED RATHER THAN QUIETLY EDITED.** This section has said
since STAMP-RESTAMP-1 that *"at 20 racers there are no settled frames at all, which is why those two
rows have no counts to give."* **Both 20-racer rows now have settled frames** — 132 on dirt-oval and
10 on river-run — so both rows now carry counts. The claim was a true observation about the ending
as it then was, not a rule about 20-racer races, and the ship moved it. It is corrected in place
below and left visible here because a reader who remembers the old sentence needs to know it was
measured false rather than forgotten.

★★ **WHY IT MOVED, AND WHY THAT IS NOT AN ENDING CHANGE.** Nothing in `CameraDirector.js` and no
ending default is touched by this ship. Phase 6 is EVENT-DRIVEN — it ends when the last racer is
home — so its duration is a property of the RACE, and CHASE-SHIP-1 changed the race
(`chaseAfterOutcomeEnabled: true`, `'gap'`, `5`). The direction is what the chase was measured to
do: the field arrives **more spread out at the back** on the closed track (phase 6 4.85 → 6.87 s at
20 racers) and **less spread out at the front** on the 40-racer rows (9.12 → 8.65 s), and the ending
therefore reaches its settled shot where it previously never got there at all.

★ **The zoom-out still begins before the last crossing on all four rows**, which is this section's
load-bearing claim, and the lead GREW on ALL FOUR (2.70 → 5.20, 5.73 → 6.12, 1.28 → 3.17,
4.57 → 4.67). **The range is now 3.17–6.12 s**, where it was 1.28–5.73 s.

★★ **RE-MEASURED AT `5cbc72e5` (CHASE-PARITY-DIAG-1), IDENTICAL TO THE DIGIT** —
4.85/2.70/0f, 9.12/5.73/7of7/8of40/164f, 3.68/1.28/0f, 6.80/4.57/3of3/40of40/94f. Same reason:
`defaults.js` sits in the closure and that commit touched it. Run, not argued.

★★ **RE-MEASURED IN FULL FOR CHASE-AFTER-OUTCOME (`b4ec7ed4`), AND EVERY ROW IS IDENTICAL TO THE
DIGIT** — 4.85/2.70/0f, 9.12/5.73/7of7/8of40/164f, 3.68/1.28/0f, 6.80/4.57/3of3/40of40/94f. ★ A real
source change this time — `raceGovernor.js` — so the run was warranted rather than ceremonial. The
numbers hold because the extension's three keys all default to today's race.

**RE-MEASURED IN FULL FOR COMEBACK-PRECEDENCE-1 (2026-09-10), AND EVERY ROW IS IDENTICAL TO THE DIGIT** — phase 6, lead, unfinished-in-shot, in-shot and settled frames on all four rows. Run rather than argued, and run a second time on HEAD's own `CameraDirector.js` with the change lifted out; the two runs agree exactly. ★ **CORRECTED 2026-09-19 — the second half of this reason stopped being true the day after it was written, and the numbers are unaffected.** It said `scripts/straggler-truth.mjs` drives `raceDriver`, *"which delivers no cameraPlan, so no comebacker is ever cast"*. That was true on 2026-09-10 and false from **2026-09-11**, when CAMERA-PLAN-BLIND-1 (`9288b1d4`) gave the instruments the plan the product gives them: `raceDriver` builds the delivery at `scripts/lib/raceDriver.mjs:506` and calls it once per frame at `:571`, so a comebacker IS cast here and the detector does receive him. **The entry's measured numbers stand** — they were re-measured in full again on 2026-09-19 for PLANNED-COMEBACK-ONLY-1 and came back identical to the digit — because the surviving half of the reason is the load-bearing one: **phase 6 begins after the winner is home, past the finish latches (`_inPhotoFinish`, `_inFinishDrama`, `_inFinishMode`) that the comeback path returns above in any case.** The dated claim is left visible rather than rewritten, because what it got wrong is a fact about the HARNESS and not about phase 6.

**RE-STAMPED 2026-09-04 (ITEM7-MEMBERSHIP-1) WITHOUT RE-MEASURING, DELIBERATELY.** `CameraDirector.js` changed, so this stamp's `depends=` moved and the guard asked. **The change is a pure SPLIT and cannot move these numbers**: the geometric loop of `_abreastContenders` was lifted into `_abreastSurvivors`, which `_abreastContenders` now calls before applying its own two guards and its unchanged fallback. No framing decision, no default, no threshold and no ease was touched, and the only edit inside the moved code is a `pathLen > 0` test that is dead on the path `_abreastContenders` takes. **All four fingerprints were run against the record and all four match** — camera and render included, which are the two that would move if the shot or the draw sequence had. Nothing was re-run; the stamp records that the dependency moved inertly.

**RE-STAMPED 2026-09-04 (DEAD-LINES-1) WITHOUT RE-MEASURING, DELIBERATELY.** `CameraDirector.js` changed, so this stamp's `depends=` moved and the guard asked. **The change is two DELETIONS and can move nothing**: an unused `pairGuarantee` import that was never called, and `const framing = framingFor(this.state)`, an assignment nothing read whose right-hand side was checked before the line was cut — `framingFor` is `return FRAMING_BY_STATE[state] ?? FRAMING_BY_STATE.LEADER_ZOOM`, a pure table lookup with no side effect. **All four fingerprints were run against the record and all four match**, camera and render included. Nothing was re-run; the stamp records that the dependency moved inertly.

**RE-STAMPED 2026-09-03 (FIELD-RETIRED-1) WITHOUT RE-MEASURING, DELIBERATELY.** `CameraDirector.js` changed, so this stamp's `depends=` moved and the guard asked. **The change cannot have moved these numbers**: it adds two fields to `_framingProbe`, which `git grep` shows is read by tests and by nothing in the camera, and **all four fingerprints were run against the record and all four match** — camera and render included, the two that would move if the shot or the draw sequence had. Nothing was re-run; the stamp records that the dependency moved inertly.
**RE-MEASURED IN FULL FOR AIM-ROOM-COMBINED-1, ON THE TREE CARRYING BOTH THE AIM ROOM FLOOR AND THE
REPAIRED COMPANY GUARANTEE, AND EVERY FIGURE IS IDENTICAL TO THE DIGIT (2026-09-02)** — 6.18/4.57,
7.53/5.75, 4.45/2.30, 5.95/4.38, the same racers in shot (5/5, 6/6, -/-, 7/7) and the same
settled-frame counts (94, 165, 0, 83). That is the THIRD tree in a row on which this window has not
moved, and the strongest of the three: the camera fingerprint moved on all of them, so no
byte-identical argument was available on any, and this one changes both the aim and the guarantee
that widens around it. Phase 6 is the settled shot AFTER the pull-back's own duration is up, and
these four numbers are answers about WHEN thresholds are crossed — neither change moves a threshold
or the schedule.

**RE-MEASURED IN FULL, TWICE, FOR AIM-ROOM-SHIP-1 AND AGAIN FOR AIM-ROOM-REPAIR-1 ON THE REPAIRED
TREE, AND EVERY FIGURE IS IDENTICAL TO THE DIGIT BOTH TIMES (2026-09-02)**
— 6.18/4.57, 7.53/5.75, 4.45/2.30, 5.95/4.38, the same racers in shot (5/5, 6/6, -/-, 7/7) and the
same settled-frame counts (94, 165, 0, 83). **The condition the previous entry set was met and
honoured**: `leaderAimRoomFloorPx` is now defaulted **ON** at 360, so it was re-measured rather than
re-stamped, exactly as that entry required. The camera fingerprint DID move for this ship, so no
byte-identical argument was available and none was used.

**Why it did not move, as a mechanism rather than a hope:** the floor reduces the leader's forward
placement during `LEADER_ZOOM`, and phase 6 is the settled shot AFTER the pull-back's own duration is
up — the zoom-out has already taken the frame off the leader's forward bias by then. The four numbers
here are answers about WHEN thresholds are crossed, and the floor moves neither the thresholds nor the
schedule. Note this is a genuinely stronger result than the identical-figures entries above it,
because here the picture demonstrably changed elsewhere and this window still did not.
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

★★ **RE-MEASURED IN FULL FOR CLEANUP-2026-09-19 (`eca8a6bb`), AND EVERY FIGURE IS IDENTICAL TO THE
DIGIT** — 4.85/2.70 with 0 settled frames, 9.12/5.73 with 7 of 7 and 8 of 40 over 164, 3.68/1.28 with
0, and 6.80/4.57 with 3 of 3 and 40 of 40 over 94. All four rows of the table below, unchanged. That
is the **third** consecutive tree on which this window has not moved.

★ **Run rather than argued, again, and the decision was taken in advance rather than after seeing the
numbers.** Every edit in that branch is comments and report prose, and `engine-reach --check` reports
*"none of N path(s) carry a change that can reach the race engine"*. ★ The reason to measure anyway is
the SIBLING stamp: `docs/CAMERA_DIRECTOR.md`'s tracking-lag moved on the commit before this one, on a
change that looked just as inert from here. One of the two camera-dependent stamps moving is worth
more than an argument about the other.

★ **Why the stamp moved to `eca8a6bb` when its `depends=` did not change.** `CameraDirector.js` is
untouched and still last changed at `cef4241e`; what moved is the `via=` IMPORT CLOSURE —
`scripts/straggler-truth.mjs` reaches `racePlanner.js`, which the branch edits. Both halves of the
guard must hold, so the stamp takes the later of the two.

★★ **RE-MEASURED IN FULL FOR PLANNED-COMEBACK-ONLY-1 (2026-09-19) ON `cef4241e`, AND EVERY FIGURE IS
IDENTICAL TO THE DIGIT** — 4.85/2.70 with 0 settled frames, 9.12/5.73 with 7 of 7 unfinished and 8 of
40 in shot over 164 settled frames, 3.68/1.28 with 0, and 6.80/4.57 with 3 of 3 and 40 of 40 over 94.
All four rows of the table below, unchanged.

★★ **IT WAS RUN, NOT ARGUED, AND AN ARGUMENT WAS AVAILABLE.** That commit's edit to
`CameraDirector.js` — this stamp's whole declared `depends=` — is comments only, and
`scripts/engine-reach.mjs --check` says so in its own words: *"in the hull but INERT — same tokens,
same line breaks between them — comments only"*. That would have been a stronger inertness case than
several of the deliberate re-stamps recorded below. It was not used, because the `via=` closure also
picks up `comebackDetector.js` and `heroCurveGenerator.js`, which this commit does change in earnest,
and phase 6 is a camera window. ★ **The sibling stamp in `docs/CAMERA_DIRECTOR.md` was re-measured in
the same pass and MOVED**, which is the reason to distrust the argument here: one of the two
camera-dependent stamps did move on this commit.

★ **Why it did not move, as a mechanism rather than a hope:** the change decides WHO the camera may
take a COMEBACK_ZOOM shot on, and phase 6 begins after the winner is home — past the finish latches
(`_inPhotoFinish`, `_inFinishDrama`, `_inFinishMode`) that the comeback path returns above in any
case. These four numbers are answers about WHEN thresholds are crossed, and no threshold moved.

★★★ **RE-MEASURED ON MASTER, 2026-09-19 (STAMP-RESTAMP-1). EVERY NUMBER BELOW MOVED, AND SO DID
TWO OF THE SENTENCES UNDER THEM.** `node scripts/straggler-truth.mjs`, seed 9, the command this stamp
names. ★ **SUPERSEDED AT CHASE-SHIP-1 (2026-09-23) — these are the PRE-CHASE numbers**, and the
current table is at the top of this section:

| track | n | kind | phase 6 lasts | zoom-out begins BEFORE the last crossing | unfinished in shot | any racer in shot | settled frames |
| ----- | - | ---- | ------------- | ---------------------------------------- | ------------------ | ----------------- | -------------- |
| dirt-oval | 20 | closed | **4.85 s** | **2.70 s** | — | — of 20 | **0** |
| dirt-oval | 40 | closed | **9.12 s** | **5.73 s** | 7 of 7 | 8 of 40 | **164** |
| river-run | 20 | open | **3.68 s** | **1.28 s** | — | — of 20 | **0** |
| river-run | 40 | open | **6.80 s** | **4.57 s** | 3 of 3 | 40 of 40 | **94** |

★ **THE LAST THREE COLUMNS ARE NOT THE OLD ONES.** The instrument reports `unfinMin` / `allMin` /
`settled` now — the fewest unfinished racers in shot on any SETTLED frame, the fewest racers of any
kind, and how many settled frames there were — where the table used to carry "still running then" and
"of those, off canvas". They are different questions, so the old values are not comparable to these
and are not shown beside them. ★★ **CORRECTED AT CHASE-SHIP-1 (2026-09-23).** This paragraph used
to end *"At 20 racers there are no settled frames at all, which is why those two rows have no counts
to give"* — true of the race as it then was, and **false since the chase shipped**: both 20-racer
rows now settle (132 frames and 10) and both carry counts in the current table at the top of this
section. The empty cells in the PRE-CHASE table above are therefore a fact about that race, not
about 20-racer races.

**"~2.9 s at 20 racers" was wrong, and it still is** — it is **3.68 s** on the open track and
**4.85 s** on the closed one, and it still grows with the field: **6.80 s** and **9.12 s** at 40.
(It read 4.45 / 6.18 / 5.95 / 7.53 before this measurement.) ★ **UPDATED AT CHASE-SHIP-1
(2026-09-23): 5.18 / 6.87 at 20 and 6.97 / 8.65 at 40.** The rejected "~2.9 s" is further from the
truth than ever, and phase 6 still grows with the field — but by LESS than it did, because the
chase's effect on this fixture is larger at 20 racers than at 40.

★★ **"the zoom-out starts ~1.4 s before it ends" — THE DISMISSAL NO LONGER HOLDS, AND THIS IS THE
CORRECTION THAT MATTERS.** The range is now **1.28–5.73 s** before the last crossing. This paragraph
used to say the range was 2.30–5.75 s and that "the separate measurement that recorded 4.4–5.9 s
stands; 1.4 s does not". **On river-run at 20 racers it is 1.28 s — below the figure this document
dismissed** — and the 4.4–5.9 s claim is not supported by any row here either. What survives is only
the weaker statement: the lead grows with the field, and at 40 racers it is 4.57–5.73 s.

★★ **UPDATED AT CHASE-SHIP-1 (2026-09-23), AND THE PARAGRAPH ABOVE'S CONCLUSION SURVIVES ITS OWN
NUMBERS MOVING.** The range is now **3.17–6.12 s** and at 40 racers **4.67–6.12 s**. The low end rose
above 1.4 s, so that specific dismissal would now hold again — **but it is not reinstated**, because
a claim that was measured false once is not made true by a later race changing under it; what this
row shows is that the figure was never a property of the ending, only of whichever race was run.
★ The 4.4–5.9 s claim is STILL not supported: two of the four rows sit outside it, one below and
one above. The weaker surviving statement is unchanged and is the one to rely on.

**THE ENDING OVERLAPS THE RACE, AND IT SHOWS THE RACERS IT IS WAITING FOR.** The in-shot columns are
a snapshot of ONE frame and must not be read as the state of the ending. **The camera then opens and
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
  of the RACE (the note under the phase table has the MEASURED figures; it is not ~2.9 s).
  *(Corrected 2026-09-03: this said "the ~2.9 s figure is UNVERIFIED", while the note it points at —
  at `:198` of this same document — says that figure "was wrong" and gives the measurement that
  replaced it. `de524663` (STRAGGLER-TRUTH-1, 2026-08-19) wrote the correcting note higher up and did
  not update this back-reference, so the document contradicted itself for 15 days. The numbers are
  deliberately not restated here — the note is their one home in this file.)*
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
