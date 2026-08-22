# ENDGAME-LAND-CLEAN-1 — the accepted picture, re-implemented cleanly onto master

**2026-08-22 · branch `ship/endgame-land` off master `182fa3ac` · THE LANDING. The owner judged the
served production build `index-BEdanP55.js` (`exp/endgame-schedule` @ `bbc63869`) with both switches
ON and ACCEPTED it. This block writes that design onto master ONCE, as a decision rather than an
excavation, and proves the result is the same picture.**

---

## 0 · THE ANSWER, FIRST

**The clean implementation IS the accepted build.** Not "equivalent", not "measured the same" — the
same source, one commit, written from the design rather than merged from eight nights of work.

| The question the brief asked | The answer, and how it was proved |
| --- | --- |
| Is the diff a decision or an excavation? | **One commit, 33 files.** The eight-night branch is not merged and never will be; it is archived as an annotated tag and deleted at the origin. |
| Does the clean code reproduce the accepted build? | **Yes, and at source level.** Every production file is byte-identical to `bbc63869`; `CameraDirector.js` differs by **two comment lines**, which repoint two citations from dropped diagnostics to the report that carries those measurements. |
| Do the twelve verdicts hold? | **960 of 960 identical** — twelve items x 80 races, ten tracks, both field sizes, both configs, seeds 1/2/3/9. |
| CAMERA and RENDER? | Equal to the branch's **digit for digit on both arms** — see §2. |
| WORLD and WORLD-OFF? | **Unmoved**, measured rather than argued. |
| The `verify` blocker? | **Closed**, by the shipped defaults, with the guard untouched — see §1. |

**The one thing that is NOT digit-for-digit is the browser sheet's reported FIGURES, and §3 is about
that.** It is measured, not explained away: the instrument does not reproduce itself digit for digit
either, and the same figures move by the same amounts when the SAME build is run twice.

---

## 1 · THE BLOCKER, AND IT CLOSED THE RIGHT WAY

`npm run verify` had been red on `check-runin-frame` since VIEWER-INVARIANTS-2. The brief's condition
was absolute: master must not go red, the clean implementation must close it, and **the guard must not
be weakened to go green** — "that guard now encodes his own sentence and is the most valuable thing
this thread produced."

**It closed on the defaults, and the guard was not touched.** With `contentionWatch` and `bandFloor`
shipping ON, `check-runin-frame` passes on **all nine scorable tracks — 0 frames outside the region,
0 off canvas, on every one**. The guard's source is byte-identical to the branch's.

That is the shape a blocker should close in. The guard was right; the picture was wrong; the fix that
the owner accepted with his eye is the fix that satisfies the guard. Nothing had to be argued.

---

## 2 · THE EQUALITY PROOF — four independent ways, and the strongest one is the cheapest

His condition was the safety net for the whole night: *"the clean implementation must reproduce the
accepted build exactly. ANY DIFFERENCE MEANS SOMETHING WAS LOST IN THE REWRITE. Find it, do not
explain it away."*

### 2.1 · Source — the shipped code IS the accepted build

`git diff bbc63869 HEAD` over every production file this block touches:

```
  2+/2-   client/src/modules/camera/CameraDirector.js
  0+/0-   client/src/modules/camera/cameraSeed.js
  0+/0-   client/src/modules/camera/cameraTimingComputation.js
  0+/0-   client/src/modules/viewerProbe.js
  0+/0-   client/src/screens/RaceScreen/index.jsx
  0+/0-   client/src/screens/DevScreen/sections/CameraAdvancedSection.jsx
  0+/0-   scripts/endgame-sheet.mjs
  0+/0-   scripts/viewer-invariants.mjs
  0+/0-   scripts/check-runin-frame.mjs
```

**The two lines in `CameraDirector.js` are both comments**, and both do the same thing: they repoint a
citation from a diagnostic this block DROPS to the report that carries the same measurement.

```
-        // (`scripts/diag/wild-frame.mjs`, which runs the BROWSER's camera seed): the delivered
+        // (reports/evolution/ENDGAME-REPAIR-1.md, measured with the BROWSER's camera seed): the delivered
-        // (`scripts/diag/endgame-demand.mjs`):
+        // (reports/evolution/ENDGAME-REPAIR-1.md §2.2):
```

**This is the whole proof, and everything after it is corroboration.** A behavioural difference is not
merely unlikely; it is impossible from a diff of two comments. It also settles §3 in advance: any
difference the browser reports cannot have come from the code.

### 2.2 · The two deterministic instruments, on BOTH arms

The fingerprints are frame-exact over ten tracks, so they are the digit-for-digit test the browser
cannot be. Both arms were measured, because an equality that holds only where the switches are on
would not say the OFF behaviour survived the rewrite either.

| Arm | CAMERA | RENDER | Against |
| --- | --- | --- | --- |
| Clean branch, both switches forced OFF | `9190967072af639e` | `2e8eae1d5ef7c7be` | **equals** the accepted branch's own recorded pair |
| Accepted branch, both switches forced ON | `0434cd0385eacc7b` | `57b2eb101d806b22` | **equals** the clean branch's shipped pair |
| Clean branch AS SHIPPED (both on) | `0434cd0385eacc7b` | `57b2eb101d806b22` | measured again on the final tree — §5 |

Read the table as a square: each implementation was measured in each configuration, and the two
diagonals agree. **The director's entire decision stream and the whole draw-call sequence are
identical, on both arms, digit for digit.**

### 2.3 · The twelve verdicts — 960 of 960

`scripts/endgame-sheet.mjs` through `viewer-invariants.mjs`: **80 races** — ten tracks, both field
sizes (his 40 / shipped 100 roster), both configs, seeds 1/2/3/9 — on the production bundle in
Chromium with the browser's own camera seed. 4734 s.

**Every one of the twelve verdicts is identical on every one of the 80 races. 960 comparisons, 0
differences.** The pooled figures agree too:

| | accepted | clean |
| --- | --- | --- |
| failing races per item — 1 / 2 / 4 / 5 / 6 / 7 / 9 / 10 / 11 | 1 / 0 / 2 / 1 / 0 / 12 / 0 / 3 / 0 | **1 / 0 / 2 / 1 / 0 / 12 / 0 / 3 / 0** |
| frames with NO band | 3 | **3** |
| widest | 13.572 corridors | **13.572** |
| worst single frame | 0.0371 ln | **0.0371** |

The sheet's own summary line, from the clean run:

```
  FAILING RACES per item —  1:1  2:0  4:2  5:1  6:0  7:12  9:0  10:3  11:0   of 76 races
  POOLED — worst single frame 0.0371 ln | widest 13.57 corridors | frames with NO band 3 | winner cut on 0 race(s)
```

Item 7's twelve are the conflict this thread proved and did not hide: one racer at the frame edge on
twelve races, taken deliberately so the winner is not cornered at the crossing. It is the same twelve
on both builds.

---

## 3 · WHERE IT IS NOT DIGIT-FOR-DIGIT, AND WHAT THAT ACTUALLY IS

**201 of the sheet's reported FIGURES differ between the two runs, across 79 of the 80 races.** The
brief says find it rather than explain it away, so it was measured rather than reasoned about.

**The reasoning alone would have been enough to be suspicious of the sheet rather than of the code** —
§2.1 makes a behavioural difference impossible — and the shape of the differences said the same thing
before anything was run: 70 of them are `crossing.camZoom` disagreeing in the **fourteenth
significant digit**, and 44 are a frame count off by ONE.

**So the instrument was asked to reproduce itself.** The same build, the same defaults, the same
seeds, run a second time:

```
SAME BUILD, RUN TWICE — races compared: 11
  verdicts differing: 0 of 132
  races with ANY figure difference: 11 of 11
    10  crossing.camZoom      3  crossing.frame       2  sheet.i3_rateMed
     8  frames                2  sheet.frames         2  sheet.i8_longestMs
     5  sheet.i12_pre         2  sheet.i3_closeSpan   2  windowStates
  largest RELATIVE differences:
     21.053%  sheet.i6_worst      garden-path|9|his|40
     18.255%  sheet.i8_longestMs  garden-path|9|his|40
     18.219%  sheet.frames        garden-path|9|his|40
```

**Every field that differs between the accepted build and the clean one also differs when the SAME
build is run twice, in the same rank order, at the same magnitudes** — including the 21% on
garden-path, whose race never finishes at seed 9 and whose window is therefore ended by a timeout
rather than by a crossing. And in both comparisons the verdicts are identical: 960 of 960 across the
builds, 132 of 132 across the repeat.

**The honest statement is therefore precise: the sheet's VERDICTS are digit-for-digit equal; the
sheet's FIGURES are equal to within an instrument that does not reproduce itself digit for digit.**
The browser drives a real bundle through a virtual clock, and a virtual clock pinned to
`performance.now`, `Date.now` and `requestAnimationFrame` still leaves the page one frame of slack at
the ends of a run. Digit-for-digit is not available from this instrument to ANY implementation,
including the accepted one, so it cannot be the test that separates them — and the two instruments
that ARE frame-exact both say equal.

**What that costs, and it is written down rather than left to be discovered:** the sheet cannot detect
a change smaller than about one frame per race, and on garden-path it cannot detect one smaller than
about 20% of the endgame's own figures. Anything relying on the sheet to settle a difference at that
size must repeat the run first — Lesson 211, which this is the second instance of.

**One limitation of the repeat run, stated rather than buried:** 9 of its 20 races failed with
`ERR_CONNECTION_REFUSED` — its second app server did not survive the launch — so the noise floor rests
on **11 races**, spanning eight tracks and both field sizes. It is enough to establish that the noise
exists and which fields carry it; it is not a full sweep, and it is not claimed as one.

---

## 4 · WHAT SHIPPED, AND THE CHECKLIST THAT COULD NOT LOSE AN ITEM

The brief named the empirical fixes that must not be lost in the rewrite, each needing its own test.
All are present; none is carried by prose alone.

| The fix | Where it lives | What fails without it |
| --- | --- | --- |
| The five stroboscope authors | `CameraDirector.js` — the stand-downs, the entry snaps, the run-in's hold | the schedule stops being the sole author; item 6 |
| The glide's pan at the DRAWN zoom, scoped away from the glide | `CameraDirector.js` | the side-jump regression the unscoped version measured |
| The carried ramp advances only on runnable frames | `CameraDirector.js` | a stagnation returns as an amplitude |
| The camera seed from the race seed | `cameraSeed.js` + `cameraSeed.test.js` + `camera-seed-determinism.test.mjs` | a race cannot be stood in; Lesson 219 |
| The schedule as SOLE zoom author in the close | `CameraDirector.js` + its tests | the strobe |
| `contentionWatch` — one-way, two consecutive checks, `contentionCheckMs`, easing every field the framing reads | `CameraDirector.js`, `defaults.js`, `cameraTimingComputation.js` | the easing that moved nothing, because `getPanTarget` reads `t` |
| `bandFloor` | same three files | the band leaves the screen; item 5 |
| The winner at his own fraction of the frame | `endgame-sheet.mjs` item 9 | the top-left-corner crossing |
| The leader's walk back | item 10 | the walk is silently lost |
| `check-runin-frame` grading his sentence | `scripts/check-runin-frame.mjs` | the guard grades a margin, not the picture |
| The Dev Screen toggles | `CameraAdvancedSection.jsx` + 3 tests | the keys become unreachable, or wire to each other |

**The defaults.** `contentionWatch` and `bandFloor` ship ON. That is stated as a decision and not as a
tuning: he judged the served production build with both on and accepted it. **Both switches stay**, so
he can still compare — the Dev Screen controls are in section 7 · Endgame.

### Sources consolidated, and what was removed

**Six diagnostics were dropped** as superseded by the sheet, which grades what each of them graded and
grades it on the picture: `diag/wild-frame.mjs`, `diag/camera-determinism.mjs`,
`diag/endgame-demand.mjs`, `diag/endgame-strobe.mjs`, `diag/notfindable-census.mjs`,
`diag/endgame-leadchange.mjs`. **`diag/endgame-spec.mjs` was KEPT** — it measures the endgame's own
following, which the sheet does not, and `CAMERA_DIRECTOR.md` §3a already points at it for that.
The two citations those removals orphaned are the two comment lines in §2.1.

### No dead lever beside a live one — measured, not asserted

```
camera keys in DEFAULT_CAMERA_CONFIG: 99   (product files walked: 464)
READ BY THE PRODUCT: 99
READ NOWHERE AT ALL — dead levers: 0
READ ONLY BY scripts/, never by the product: 0
```

**Its first version printed 99 of 99 as "scripts only"** — `path.join` normalises to backslashes on
Windows, so the product filter matched nothing. It was caught by reading the output rather than the
verdict, which is Lesson 218's habit and Lesson 209's failure mode. The census now throws if the walk
finds no product files or if every key lands in one bucket.

**A lexical census has a hole and it is named:** a key read only by a whitelist that never returns it
would count as live. That exact defect cost this thread a day — `contentionWatch` reached
`computeTimingFromConfig` and stopped there. What proves the three new keys are live is not this
census but the fingerprints: forcing them changes CAMERA and RENDER, which a key the director cannot
see could not do.

---

## 5 · THE FINGERPRINTS — all four measured fresh on the tree that becomes master

Measured on the branch tip. Master was already an ancestor of this branch, so THE SHIP ORDER's
catch-up merge is a no-op and the branch tip's tree IS the merged tree.

| Role | Before | After | |
| --- | --- | --- | --- |
| WORLD | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **unmoved** |
| WORLD-OFF | `854018ee5d3d83e1` | `854018ee5d3d83e1` | **unmoved** |
| CAMERA | `f64c2ae531f14253` | `0434cd0385eacc7b` | **MINTED** |
| RENDER | `7d553406f41ff176` | `57b2eb101d806b22` | **MINTED** |

**WORLD and WORLD-OFF were RUN, not argued from a closure statement**, and the reason is the one this
repository has now written four times: `defaults.js` is inside all four instruments' declared closures
because the race's keys and the camera's share one file. "It is only a camera key" is a claim about the
CONTENTS of a diff, not about the file it sits in, and only a measurement can settle it. Both came back
byte-identical.

**CAMERA and RENDER are minted, and this is a mint the ceremony's own rule permits**: the owner judged
the picture on a production build and accepted it. The values are the ones §2.2 predicted, measured a
second time on the final tree.

---

## 6 · THE DOCUMENTS — one home each, extended rather than duplicated

- **`docs/CAMERA_DIRECTOR.md` §3b** — the endgame's design: the window and whose it is, the schedule
  and why it has exactly one author, the twelve requirements as a table with how each is graded, the
  two proven conflicts, the two new keys, and the checklist of empirical fixes with the test that
  fails without each. It points at §3a for the run-in's geometry rather than restating it.
- **`docs/DEAD-ENDS.md` §P** — the pan lag as the endgame's lever, and the correction to `f0cb5179`.
- **`docs/LESSONS.md`** — 218, the proxy law, built from the three green numbers that sat beside a
  rejecting owner: the smoothed metric that hid a single-frame jump, the percentage that hid a black
  screen, and the arrival check that graded a number instead of the picture. 219, the fixed-seed law:
  the harness that ran a camera no user sees. **The fifth lesson — the guard that graded on
  `undefined` — is a sixth INSTANCE on Lesson 209 rather than a new entry**, because it is the same
  law (a check that cannot fail is indistinguishable from one that passes) and the brief asked for one
  home each.
- **`docs/SHIP-CEREMONY.md` step 0a** — the one-race browser gate, already written in by
  VIEWER-INVARIANTS-2 and exercised by this ship. Its result is in §7.
- **`docs/ENDING-PHASES.md`** and **`docs/CAMERA_DIRECTOR.md`'s tracking-lag block** — both MEASURED
  stamps re-run rather than re-stamped. Every previous entry under both rests on "the switch defaults
  off"; that reason expires here, and it is said so in the document rather than left for a reader to
  notice.

### The correction that history cannot carry

`f0cb5179`'s merge message states that the line goes off screen **"and the pan lag is why"**, and
names fixing the lag as the prerequisite for adopting the line's definition. **It is false.**
`PAN-LAG-ACCOUNT-1` measured the pan's residual at **0.0 px on all forty runs** and found the ZOOM
beating the pan on **35 of 36** endgame runs; the 414-891 px the message rests on is the frame being
written by the zoom about the world origin, not the follower falling behind — a follower approaches
from behind and mathematically cannot overshoot (Lesson 217).

A merge message cannot be rewritten. **So the correction is placed where a reader would actually meet
it** — `CAMERA_DIRECTOR.md` §3b (the document that owns the camera), `DEAD-ENDS.md` §P (the document
that owns retired approaches) and `PAN-LAG-ACCOUNT-1` (the report that did the measuring). Anyone who
reads that message and reaches for a smoothing constant now finds the refutation from any of three
directions, rather than from a banner at the top of one report.

---

## 7 · THE SHIP

**Step 0a — the browser gate, on the production bundle, run for this ship:**

```
── VIOLATIONS PER INVARIANT ──
  1-course          0 frame(s) in   0 race(s)
  2-leader          0 frame(s) in   0 race(s)
  3-line            0 frame(s) in   0 race(s)
  4-widthstep       0 frame(s) in   0 race(s)
  4-panstep         0 frame(s) in   0 race(s)
  5-tootight        0 frame(s) in   0 race(s)
  5-toowide         0 frame(s) in   0 race(s)
  winner OFF CANVAS at the crossing: 0 of 9  |  states owning the crossing: PHOTO_FINISH 9
  POOLED — worst single frame 0.0339 ln | widest 10.89 corridors | frames with NO band 0 | winner cut on 0 race(s)

viewer-invariants: 10 race(s) in 671s — 0 window violation(s) in 0 race(s), 0 crossing violation(s)
Every frame of every race swept satisfied all five invariants. PASS
```

**Nine of nine crossings are owned by PHOTO_FINISH and the winner is on canvas on every one.** That is
the requirement WINNER-CROSSING-1 opened, closed and measured on the shipped defaults: the state badge
in his screenshot read OVERVIEW, and OVERVIEW no longer owns a crossing anywhere.

**Steps that do not apply, named rather than skipped.** 1, 1a, 4, 5, 6 and 9 all concern the SHIPPED
WORLD — the paired fairness gate, the runaway budget, REBASELINE, the fingerprint lineage, the golden
and replay re-pins, and the canonical-doc sweep. **The world does not move here and §5 measured that
rather than assuming it**, so none of those has anything to record. Step 10, the owner's eye, is what
this whole block is downstream of: he judged `index-BEdanP55.js` on 2026-08-24 and accepted it, and
§2.1 proves the shipped source is that build.

**The merge, and CI green for exactly that SHA.** The merge commit is `d4bad558`; CI run `32544203979`
reports `success` with `headSha` `d4bad558190330a190234e8b7fc65b2eb9ece03f`. All four fingerprints
were re-measured ON THE MERGE COMMIT and reproduce `docs/fingerprints.json` — the minted values are
what the merged tree produces, not values carried across from a branch.

**The experiment branch is archived, not merged.** `exp/endgame-schedule` carries eight nights of
excavation and its history is worth keeping and not worth putting on master. It is tagged annotated as
`archive/exp-endgame-schedule` and deleted at the origin; the tag names what it was and what it
proved.

---

## 8 · WHAT IS OPEN, AND IT IS HIS

Two of these were open before this block and are unchanged by it; the third is new and small.

1. **Item 7 against item 9 — the conflict this block resolved BY DECIDING.** One racer sits at the
   frame edge on twelve of eighty races because the alternative corners the winner. **Taken on his own
   sentence that the crossing is the moment.** If he would rather see every geometric contender than
   have the winner centred, it reverses with one condition — and it costs items 9 and 2, measured.
2. **Item 4 against item 5.** Findable band costs width. Both figures are on every sheet; no setting
   maximises both.
3. **The sheet's noise floor.** §3 establishes it at about one frame per race and about 20% of the
   endgame figures on garden-path. It is a property of the instrument, it is now written down, and
   nothing in this ship depends on resolution finer than it.
