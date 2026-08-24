# RUNIN-NAMES-1 — names instead of numbers once the closing zoom has arrived

**Date:** 2026-08-24 · **Branch:** `feat/runin-names-1` (off `master` at `5204b10b`) ·
**NOT MERGED — it waits for his eye. Pushed to origin.**

**What is here:** from the moment the run-in's closing zoom arrives at its target, every racer shows
its NAME instead of its number, overlap allowed, for the rest of the race. Before that moment every
label is what it was.

**Two things the brief assumed turned out not to be true, and both are reported rather than worked
around:** the photo-finish names mechanism it says to reuse **had already been deleted**, and the
render fingerprint **cannot see this change at all** because the harness hands the renderer a
hand-written camera literal. Details in §1 and §6.

---

## 1. The mechanism the brief said to reuse — it was REMOVED, and the parameter it left behind is what I reused

**The brief:** *"The photo finish already shows names for every racer in frame, overlap deliberately
allowed — the owner decided that on 2026-08-09 and accepted it on 2026-08-10. Establish that
mechanism at source FIRST and reuse it."*

**At source, it is gone.** `renderRaceFrame.js` reads `exemptAll: false`, and the paragraph above it
records why: it used to read `exemptAll: camera?.state === 'PHOTO_FINISH'`, and **LABEL-OVERLAP-FIX-1
removed it because the premise was refuted by measurement.** LABEL-OVERLAP-3 measured that shot at
**1951 world px — the WIDEST of the entire race**, wider than OVERVIEW's, with **40 of 41 names
overlapping and 9 clipped off the canvas edge**. The shot the exemption was written for was not the
shot it was firing in; the guarantee that widens the frame had moved underneath it.

**So the honest statement is not "give it an earlier trigger".** The mechanism's TRIGGER was deleted
as wrong. What survives, deliberately, is the layout's `exemptAll` **parameter** — kept after its
only caller went, with its own docblock saying so (*"NO SHIPPED CALLER SETS IT any more … The
parameter is kept because the layout should still be able to say what 'exempt everyone' means"*) and
with both its arms pinned by `nameTagLayout.test.js`.

**That parameter is what this block reuses, and no second way to choose name-or-number was built.**
The layout already had both halves — `wideLabelOf` offers the name, `exemptAll` draws it whatever it
covers and whatever the hold says. What is new is a trigger that is a statement about the **WIDTH**,
made by the thing that authors the width, instead of a **STATE** standing in for one. That is
precisely the failure LABEL-OVERLAP-FIX-1 diagnosed, so repeating it would have been the one
unacceptable outcome.

---

## 2. The trigger — chosen by measurement, and three candidates refuted

**CHOSEN: `CameraDirector.runInArrived`** — a one-way latch, set when the schedule's **CLOSE segment
has run** (`_runInAfterDeadline`) **and the leader has reached the line** (`_diagLeaderProgress >= 1`).

**Why that is the right one.** §3b puts the close's arrival exactly at the line, in its own words:
*"Both the close's parameter and the leader's walk back reach 1 exactly at the line, so the endgame
arrives rather than being switched off."* `ENDING-PHASES.md` says the same from the other side: the
run-in closes *"to the ordinary shot exactly at the crossing — where this table begins."* So the
arrival is not a moment I chose; it is where the schedule is defined to land. Both terms already
existed and neither is a number introduced here.

**What was rejected, and why — every one of these was MEASURED over ten tracks x two seeds, not
argued:**

| candidate | what it does | verdict |
| --- | --- | --- |
| `runInActive && stateBinding` | delivered zoom == the state's own factor | **fires at run-in OPEN** (0.928–0.943, the frame before the widen moves anything), **not monotone** (7 of 20 flip more than once), **never fires** on 4 | REJECTED |
| `runInActive && afterDeadline && stateBinding` | as above, restricted to the close | fires on **7 of 18**; one fires at close-parameter **u=0.0797 in OVERVIEW** | REJECTED |
| `_runInProgress >= 1` | the schedule's own close parameter at its own endpoint | fires on **6 of 18 — AND ALL SIX ARE PHOTO FINISHES.** The photo-finish shot keeps the schedule composing past the line; every other race stops composing on the crossing frame and freezes the parameter at 0.9969–0.9994 | REJECTED — it fails "must fire in BOTH cases" by construction |
| a zoom-value comparison (`zoom / endZoom >= tolerance`) | delivered width vs the close's endpoint | robust (18/18) but **needs a tolerance I would have to invent**, and it is exactly the "zoom-value comparison of your own" the brief forbids. Measured for completeness: the widen bottoms out at u≈0.40 and the zoom returns to within 1% of the endpoint at **u≈0.97** | REJECTED |

**`_runInProgress >= 1` is the one worth dwelling on**, because it is the schedule's own sentence in
the schedule's own units and it looks like the obvious answer. It is a photo-finish-only trigger in
practice. That is measured, it is in the test file's header, and a future reader tempted by it should
start there.

**No progress threshold, no config key, no zoom comparison and no second clock was added.**

### What the trigger reads in each of the two arrival cases

The latch is **blind to the photo finish** — asserted by test and pinned in source — and that is
exactly what makes it fire in both. What differs is the **WIDTH the shot arrived at**, which lives in
the schedule's endpoint and not in the latch:

| the race | the close's endpoint (`_scheduleClose`) | measured at the switch |
| --- | --- | --- |
| **photo finish** | `_photoFinishZoom` — the tighter factor | `_inPhotoFinish === true`, **18 of 18** races |
| **not a photo finish** | `_leaderZoom` — the wider factor | `_inPhotoFinish === false`, **18 of 18** races |

The non-photo-finish arm was **forced and measured**, not assumed: re-run with the photo-finish
close-check disabled, every race still switched, with `_inPhotoFinish` false at the switch.

---

## 3. What was built

| file | change |
| --- | --- |
| `camera/CameraDirector.js` | `_runInArrived`, the one-way latch, plus a `runInArrived` getter published for the renderer. **Nothing in the camera reads it.** |
| `RaceScreen/frameCameraInputs.js` | `runInArrived` added to `FRAME_CAMERA_FIELDS`, the declared and guarded renderer contract |
| `RaceScreen/renderRaceFrame.js` | one flag read once; it drives `wideLabelOf` and `exemptAll` and nothing else |
| `RaceScreen/nameTagLayout.js` | `exemptAll` now drops **nobody** — see §4 |

---

## 4. One defect found while building it, and the fix is scoped

**A nameless racer LOST HIS LABEL ENTIRELY after the arrival.** The exemption branch requires
`e.wide`, and `e.wide` exists only when the wide form is **strictly wider** than the narrow one. A
racer with no name has neither: his wide form resolves to his own number, the same string at the same
width. So he fell through to the ordinary clearance test — and with every named racer around him now
holding a full-width box by exemption, he was **dropped**. Measured: two nameless racers in a packed
field of six lost their labels altogether.

**That is the exemption making things worse for exactly the racer it cannot help**, and it would have
broken two of the brief's requirements at once — *"a racer without a name keeps its number"* and
*"hide no label"*.

**The fix:** under `exemptAll`, a racer with no wider form is placed with the form he has. He keeps
his number and is not judged against the picture. He still **draws** a number without any special
case: `racerRendering.js` re-derives the wide text as `r.name ?? ''`, which is empty for him, so the
draw falls back to the number label — the same string the layout measured.

**Scoped to `exemptAll` on purpose.** The per-racer `exempt` is LABEL-FOCUS-1's, it is the only
exemption that runs **before** the arrival, and widening it too would have moved a picture this block
promised not to touch. The tidier-looking change was the wrong one.

---

## 5. What happens after the crossing — A DECISION, not a side effect

**THE LABELS STAY NAMES.** From the arrival they remain names for the rest of the race — through the
photo-finish/drama shot, through the zoom-out, through the stragglers crossing, through the hold on
the finish picture, until the result screen. The latch is per-race and is never cleared.

**Why, rather than reverting at some point:** `ENDING-PHASES.md` phase 6 is *"the rest of the field
crosses and freezes on the line"* — event-driven, and on these races it runs for hundreds of frames
after the winner is home. That is precisely when *"a viewer wants to know who is coming"*, and it is
the longest stretch of the ending. Reverting to numbers at the crossing would switch names off at the
exact moment the most people are still arriving.

**It is also the only shape with no second trigger.** Any revert needs a moment to revert AT, and
that moment would be a new mechanism for a quantity nothing else measures — the thing this strand has
been burned by repeatedly.

**Measured:** names are on for **215–419 frames** per race after the switch, and went back off on
**0 of 40** runs.

**If he wants it otherwise on screen**, the honest place is a revert at the result-screen transition,
which is a boundary that already exists. It is proposal 3 and it is his call.

---

## 6. Fingerprints — and why the render one CANNOT answer here

`npm run verify` routed and ran; `PASS 14 · FAIL 0 · SKIP 10`.

| role | recorded | this branch | verdict |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | **not selected by routing** — no engine-hull file in the diff | correctly untouched |
| world-off | `854018ee5d3d83e1` | **not selected** | correctly untouched |
| camera | `0434cd0385eacc7b` | `0434cd0385eacc7b` | **UNMOVED** — as required |
| render | `57b2eb101d806b22` | `57b2eb101d806b22` | **UNMOVED — and this is NOT evidence. See below.** |

**World and camera did not move, which is the requirement.** The camera fingerprint ran in full and
came back byte-identical: nothing here touches the shot.

### THE RENDER FINGERPRINT IS BLIND TO THIS CHANGE, and its silence must not be read as a pass

The brief expected render to move — *"the RENDER one samples drawn frames and label text is drawn, so
it may well move"*. It did not, and the reason is a defect in the instrument rather than a fact about
the picture.

**`scripts/render-fingerprint.mjs` builds the renderer's `camera` argument as a HAND-WRITTEN LITERAL
with three fields** — `hudState`, `comebackLockedRacerIndex`, `detectBattleGroup`. It does **not**
call `frameCameraInputs()`. So in that harness `camera.runInArrived` is `undefined`, the switch never
fires, and the hash cannot move whatever this block does.

**This is the exact defect `FRAME-INPUTS-1` was created to end**, still live in the harness: its own
header records that `RaceScreen/index.jsx` "used to assemble that object as a LITERAL at the call
site, listing three fields by hand", which made `anchorRacerIndex` undefined on every frame of every
live race. The screen was fixed; **the instrument was not**. Two consequences beyond this block:
`camera.state` and `camera.anchorRacerIndex` are also undefined there, so **LABEL-FOCUS-1's
subject-keeps-its-name has never been exercised by the render fingerprint either.**

**It was NOT fixed here, deliberately.** Repairing it would define `state` and `anchorRacerIndex`,
turn on the focus exemption inside the instrument, and move the render hash — conflating an
instrument repair with a label change in one hash, and a measurement-tool change is its own block
under VERIFY-RULES R2. **Proposal 1.**

**What replaces it as evidence:** the seam was measured directly, through the real
`frameCameraInputs`, over 40 runs — §7.

---

## 7. Verification, and what actually proves the feature works

**Unit tests: 24 new assertions in 2 files. 10 sabotages, all 10 CAUGHT.** Each sabotage is a real
edit to a real source file, tests run against it, then the file restored from its in-memory original;
the tree was confirmed byte-identical to a safety stash afterwards.

| # | property | sabotage | verdict |
| --- | --- | --- | --- |
| S1 | the latch is OFF before the arrival | initialise it to `true` | **CAUGHT** |
| S2 | it is blind to the photo finish | require `_inPhotoFinish` | **CAUGHT** |
| S3 | it uses the measured terms | latch on `_runInProgress >= 1` | **CAUGHT** |
| S4 | it NEVER un-fires | assign the condition instead of latching | **CAUGHT** |
| S5 | the arrival reaches the renderer | drop it from `FRAME_CAMERA_FIELDS` | **CAUGHT** |
| S6 | numbers BEFORE the arrival | hard-code the flag true | **CAUGHT** |
| S7 | names for EVERY racer after it | leave `exemptAll` false | **CAUGHT** |
| S8 | the name is on offer whatever the toggle says | return no wide form | **CAUGHT** |
| S9 | a nameless racer keeps his number, unhidden | remove the §4 branch | **CAUGHT** |
| S10 | the focus exemption still behaves as it did | drop `exempt` from the branch | **CAUGHT** |

**TWO OF MY OWN TESTS WERE INITIALLY WORTHLESS AND THE SABOTAGES ARE WHAT SHOWED IT.** Both the
director test and the label test *replicated* the production expression rather than calling it — so
sabotaging the production line left them green. That is the one thing a test must not do. Both files
now also pin the production statement as SOURCE, following `modules/engineInputs.test.js`'s precedent
in this tree, and S3/S4/S6 are caught by those pins. Stated here because a reader should know which
half of each file does which job: the behavioural half tests the RULE, the pinned half tests the LINE.

### The end-to-end measurement, which is what the render fingerprint could not give

Driven through the real `CameraDirector` and the real `frameCameraInputs`, ten tracks x two seeds x
two arms (shipped, and with the photo-finish close-check disabled):

| | result |
| --- | --- |
| finishing races | **36 of 40** (garden-path does not finish inside the harness window, both seeds) |
| names came ON | **36 of 36** |
| photo-finish arrivals | **18** |
| non-photo-finish arrivals | **18** |
| switch point | leader progress **1.0000–1.0003** — at the crossing, as designed |
| frames with names on | **215–419** per race |
| ever went back OFF after ON | **0 of 40** |

---

## 8. Source hygiene

- **English throughout**; no new verbatim quotation. `check-language-closed` PASS.
- **No config value stated** in any document by this block; no new config key exists to state.
  `check-config-claims` PASS (it was not selected by routing — this block changed no document until
  this report).
- **No schema, no version bump, no migration.** `check-config-keys` and `check-fallback-agreement`
  PASS.
- **One home:** the arrival is the director's; the renderer reads it and re-decides nothing. The
  brief's "no second mechanism" is enforced by a test that fails on `camera.zoom >` or
  `leaderProgress >` appearing in `renderRaceFrame.js`.
- **Formatting** ran before the fingerprints were measured (R0b).
- Report registered in `reports/evolution/INDEX.md` in the same commit.

---

## 9. Build vs spec — conformity

| the spec asked | status |
| --- | --- |
| names from the closing zoom's arrival | **done** |
| establish the existing mechanism at source FIRST and reuse it | **done — and it had been deleted; §1 says so plainly** |
| use the quantity that already states the arrival; invent nothing | **done** — both terms pre-existed; §2 names what was rejected and why |
| no progress threshold / config key / zoom comparison / second clock | **done** — and a test forbids the last two by name |
| state which quantity, why, and what was rejected | **done** — §2, with measurements |
| MONOTONE within a race | **done** — one-way latch; 0 of 40 reversals measured |
| fires in BOTH arrival cases, and say what it reads in each | **done** — 18 and 18, both arms measured; §2 |
| before the arrival, labels unchanged to the pixel | **done** — the pre-arrival expression is untouched; a test compares the whole layout against one computed with the old parameters |
| nothing about camera / shot / schedule / race changes | **done** — camera fingerprint unmoved; the latch is read by nothing in the camera |
| overlap allowed; no de-overlap rule, nothing hidden or shrunk | **done** — and §4 fixes a case where a label WAS being hidden |
| a nameless racer keeps its number | **done** — §4 |
| after-crossing behaviour as a STATED decision | **done** — §5 |
| tests + sabotages, recorded | **done** — §7, 10/10 caught |
| fingerprints reported against the recorded values | **done** — §6, including why one of them cannot speak |
| world and camera must not move | **done** — camera measured unmoved; world not selected by routing |
| production build + badge | **done** — §10 |
| push the branch, do not merge | **done** |

**One thing I did beyond the brief**, flagged rather than buried: the `exemptAll` completion in §4.
It is inside the mechanism being reused, it is required by two of the brief's own constraints, and it
is scoped so nothing pre-arrival moves.

**Nothing in the spec was left undone.**

---

## 10. The build

Production build of this branch, served on the standing preview port; API on 4000.

**Badge: `build 53e09ecc · feat/runin-names-1`** — no `+dirty`, so the picture on screen is
reproducible from that commit, and that commit is at origin.

**Verified serving, not merely started:** one listener on each port; `http://localhost:4173/` serves
`assets/index-JA1iTCSK.js`; fetching that JS over HTTP shows
`commit:―53e09ecc―, branch:―feat/runin-names-1―, dirty:false`, and the string `runInArrived` is
present in the bundle — so the switch is actually in the build he will judge. `GET /api/health` on
4000 answers 200.

**What the owner will look at:** watch a race to the line. Through the whole closing sweep the labels
are numbers; at the crossing every racer's label becomes its name, overlap and all, and stays a name
while the rest of the field arrives.

---

## 11. PROPOSALS

**1. Fix the render fingerprint's camera literal — it is FRAME-INPUTS-1's own defect, still live in
the instrument.** (Mine.) §6: the harness hands `renderRaceFrame` a three-field literal, so
`state`, `anchorRacerIndex` and now `runInArrived` are all undefined inside the instrument that
exists to notice drawing changes. **It cannot see the focus racer's name, and it could not see this
block.** The fix is one line — call `frameCameraInputs(cd)` — but it WILL move the render hash,
because the focus exemption starts firing inside the harness. It therefore needs its own block with a
before/after mint, exactly as VERIFY-RULES R2 requires of a measurement-tool change. **Until then,
"render unmoved" means less than it looks for anything label-related.**

**2. `exemptAll` should probably drop nobody in the `exempt` arm either.** (Mine.) §4 fixed the
blanket case and deliberately left the per-racer one, because changing it would move a pre-arrival
picture this block promised not to touch. But the same hole is there: a FOCUS racer with no name is
dropped by the clearance test, which contradicts LABEL-FOCUS-1's "the racer the camera is on keeps
its name for the whole race". It is latent today only because every shipped roster supplies a name.
A small block, with the camera and render fingerprints as its gate.

**3. Where the names should STOP is his to decide, and there is a boundary ready.** §5 builds "they
stay names to the end" and says why. If he wants numbers back at some point, the result-screen
transition is a boundary that already exists and would need no new mechanism. Anything earlier — at
the zoom-out, say — would need a trigger nothing currently measures, and that is the shape this
strand keeps paying for.

**4. The arrival latch is a reusable answer to "the ending has begun".** (Mine.) `runInArrived` is
the first quantity in this tree that says, one-way and in both race kinds, that the closing shot has
landed. Several ending behaviours are currently keyed to states or durations that only approximate
it — the winner card's window and the straggler wait among them. Worth knowing it exists before the
next one is keyed to something looser.

**5. The trigger deserves a browser check, because every measurement here is headless.** The
memory of this project is explicit that the headless director does not reproduce the browser's
excursions and that no instrument has ever run the browser's camera. Nothing above contradicts that —
the seam measurement uses the real director but not the real frame loop. His eye is the gate, and
that is the right gate here; but if names ever look late or early on screen, the first thing to
suspect is frame timing at the crossing, not the latch.
