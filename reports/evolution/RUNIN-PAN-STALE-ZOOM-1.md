# RUNIN-PAN-STALE-ZOOM-1 — the aim was resolved at one zoom and drawn at another, and it is the crossing's swing

**Date:** 2026-08-26 · **Branch:** `feat/runin-level-set-1`, extended rather than replaced · **NOT
MERGED, and must not be** — the owner's eye decides, and he judges this and the level-set rule
together on one build.

**One key, no default, no new number.** The repair adds a method and one gated call site. It touches
no config value, no threshold and no fraction. **The CAMERA fingerprint MOVES and that is expected**;
RENDER follows; **WORLD and WORLD-OFF do not move**, verified against the record rather than argued.

## THE DEFECT, ESTABLISHED AT SOURCE BEFORE ANYTHING WAS CHANGED

The spec handed me a diagnosis. I read the file first, and the diagnosis is right — but the reason it
reaches the crossing is sharper than "the window ends one frame too early", and it is worth stating
exactly, because it is what decides the repair's scope.

**`_setTargets` resolves the pan using `this.zoom` as it stands when it runs, and stores the answer as
a SCREEN OFFSET:** `targetOffsetX = -camX × effectiveZoom` ([CameraDirector.js:4197](../../client/src/modules/camera/CameraDirector.js)).
That is a product taken from the **world origin**, so an error in the zoom is multiplied by the
subject's distance from that origin — about 3,545 world px in the traced race.

**The zoom then moves after `_setTargets` on the path the crossing takes.** The pre-`_setTargets`
zoom lerp exists, and its header says exactly why — *"so that targetOffsetX is computed with the
post-lerp zoom"* — **but it is gated on `tSpaceLerpActive`, which is the ENTRY phase alone**
(`_lerpPhase === 'entry' && _camT !== null && …`). On the follow path the zoom is lerped afterwards,
inside the branch, so the aim always belongs to the PREVIOUS frame's zoom.

**The existing correction does not reach it.** The `_schedZoom` block re-states the aim for exactly
this reason, and its own header records the browser measurement that put it there. Its scope is
`_scheduleComposing() && _runInBinding`. **On the anatomy trace, across the 105 frames from the
crossing to the finish-overview handoff, `runInActive`, `runInBinding` and `scheduled` are false on
every single one** — while the largest zoom move of the race is happening. The correction is simply
not on.

**And the SIDEJUMP pivot below is not this, which is why nothing had caught it.** That pivot moves
`offsetX` — where the camera IS — so the anchor keeps its screen position across a zoom change. The
staleness is in `targetOffsetX` — where the camera is AIMED. The pan then lerps the first toward the
second. So the picture holds still on the frame of the step and then SLIDES, for as long as the lerp
takes to chase an aim that is wrong. **That is the two-part signature the anatomy measured** — a throw
at the crossing, and a slide that outlives the width — and it falls out of the code once the two
quantities are read apart.

## THE REPAIR

One method, `_restatePanTargetAtDrawnZoom()`. It scales the stored offset by `e1/e0`, which names the
**same camera world position at the drawn zoom** — `resolveCamera`'s answer re-expressed, never
re-decided. No framing rule is re-run.

**One mechanism, one home.** The arithmetic that was inline in the `_schedZoom` block is now the
method's body and the block calls it; the follow path calls the same method. It carries its own state
in `_panTargetEff` (the zoom the aim currently stands at), which makes it **idempotent** — the second
call on a frame finds a ratio of 1 and declines — and that is what allows two call sites without two
copies. `_lastResolvedPanTarget.effectiveZoom` is deliberately NOT reused for this: the shipped
invariant 6 asserts the drawn zoom DIFFERS from it, so writing the correction back there would have
made that test inert instead of failing.

**The glide is still excluded, at the call site, unchanged.** CAMERA-GLIDE-TARGET-1 resolves the
glide's endpoint at the destination zoom on purpose; re-expressing it would undo that.

## THE SCOPE IS A MEASURED DECISION, AND THIS IS THE BLOCK'S MAIN FINDING

**The staleness is general. The repair is not, and the first build I measured proves why it must not
be.** Called on every follow frame, the correction reaches the whole race — because **that branch
also carries the ENTRY phase**, whose convergence test is `|targetOffsetX - offsetX| < _entryConvergencePx`.
Moving the aim moves when a state stops entering and starts tracking. A pan correction silently
becomes a **state-machine timing change**.

`scripts/tracking-lag.mjs`, on the unscoped build against the branch-tip baseline:

| state | baseline median → unscoped | baseline p95 → unscoped |
| --- | --- | --- |
| LEADER_ZOOM | 4.99 → **5.08** | 9.84 → 9.70 |
| BATTLE_ZOOM | 5.82 → 5.81 | 10.16 → **10.06** |
| LEAD_CHANGE | 4.66 → 4.64 | 7.50 → 7.45 |

Gated on **`_runInAfterDeadline`** — the endgame close's own "the close is running", true on 105 of
105 frames of the defect window and false for the whole race before the deadline — the same build
measures:

| state | frames | median pp | p95 pp |
| --- | --- | --- | --- |
| BATTLE_ZOOM | 8626 → 8626 | 5.82 → 5.82 | 10.16 → 10.16 |
| COMEBACK_ZOOM | 159 → 159 | 4.84 → 4.84 | 7.40 → 7.40 |
| LEADER_ZOOM | 13282 → 13282 | 4.99 → 4.99 | 9.84 → 9.84 |
| LEAD_CHANGE | 8473 → 8473 | 4.66 → 4.66 | 7.50 → 7.50 |
| OVERVIEW | 4130 → 4130 | 2.75 → 2.75 | 16.00 → 16.00 |
| **PHOTO_FINISH** | 2089 → 2089 | **2.89 → 2.95** | **8.65 → 8.64** |

**Exactly one state moves, and it is the one that runs inside the window.** That is structural, not
lucky. **And the scope costs nothing at the crossing** — every figure in the acceptance table below
is identical between the scoped and unscoped builds, to the digit.

## THE ACCEPTANCE READING — the harness re-run against the built code

`scripts/diag/runin-anatomy.mjs` was carried onto this branch from `archive/runin-seed13-anatomy-1`
and run on both arms of the same commit: the branch tip with the change, and with it reverted.
`scripts/diag/runin-pan-swing.mjs` reduces its per-frame rows to the columns the anatomy tabulated.

**THE HARNESS CONFIRMS ITS OWN FIGURES ON THE BUILT TREE.** The before-arm reproduces
RUNIN-SEED13-ANATOMY-1 §4 to the digit — and it also reproduces EVENT ONE exactly: 0.150 s before the
line the width steps **197.7 → 386.3 px in one frame**.

| race | §4 recorded | my before-arm | **after** | removed | leader off canvas |
| --- | --- | --- | --- | --- | --- |
| mountainstreet 20 s32 | 1,011 | **1010.5** | 78.7 | **92%** | 14 → **0** |
| **river-run 20 s13** | 973 | **972.9** | 69.6 | **93%** | 21 → **0** |
| river-run 20 s49 | 959 | **959.1** | 71.4 | **93%** | 89 → 101 |
| seatrack 20 s7 | 892 | **892.2** | 38.9 | **96%** | 9 → **0** |
| mountainstreet 20 s24 | 869 | **868.5** | 62.4 | **93%** | 19 → **9** |
| river-run 20 s18 | 447 | **447.1** | 57.8 | **87%** | 37 → 37 |
| city-circuit 20 s7 | 414 | **413.6** | 61.1 | **85%** | 0 → 0 |
| dirt-oval 20 s171 | 202 | **202.4** | 54.6 | **73%** | 0 → 0 |

**The aim's own framing error, pooled over the eight races: 12,400 → 881 px, 92.9% removed** — inside
the 90–97% the report predicted, which is the number the build was commissioned against.

**And the picture stops sliding once the size has arrived** — the owner's own description. Path length
of the subject across the frames where the delivered width is flat within 1%:

| race | travel before → after | removed | worst single frame |
| --- | --- | --- | --- |
| **river-run 20 s13** | 191.4 → **59.5 px** | **69%** | 21.4 → **6.1 px** |
| river-run 20 s49 | 180.8 → 48.0 | 73% | 16.0 → 3.8 |
| seatrack 20 s7 | 207.9 → 122.9 | 41% | 16.0 → 5.3 |
| mountainstreet 20 s32 | 267.5 → 186.8 | 30% | 22.6 → 5.8 |
| mountainstreet 20 s24 | 202.8 → 134.7 | 34% | 19.8 → 5.4 |
| river-run 20 s18 | 156.2 → 90.7 | 42% | 18.3 → 4.5 |
| city-circuit 20 s7 | 93.9 → 67.6 | 28% | 9.7 → 5.6 |
| dirt-oval 20 s171 | 160.6 → 157.7 | 2% | 11.3 → **6.4** |

## WHAT DID NOT GET BETTER, SAID PLAINLY

**Two of the eight races do not clear on "leader on canvas", and one gets worse.**

- **river-run seed 18: 37 → 37 frames, max overshoot 75 px, unchanged to the pixel.**
- **river-run seed 49: 89 → 101 frames, max overshoot 129 → 246 px. WORSE.**

**This is not the repair failing; it is the repair working and revealing a different defect.** The aim
on seed 49 is now correct — its framing error fell 959 → 71 px — and the point it correctly aims at is
the **pair midpoint**, which is not the leader. The wrong aim happened to drift toward the leader on
that race; the right one does not. That is the shape already on record twice:
RUNIN-CONTENDER-GUARANTEE-1's *"a SPAN is not a PRESENCE"* and LATE-LEAD-AXIS-1's *"the winner is only
ever lost SIDEWAYS"*. **Fixing it means changing the guarantee or the anchor, which this block was
told not to touch** — see proposal B.

**Seed 13, the race the owner will look at, goes 21 frames → 0, max overshoot 302 px → 0.**

## AN OPEN QUESTION ABOUT THE RECORD, NOT REPAIRED HERE

`docs/CAMERA_DIRECTOR.md`'s tracking-lag entry records, for THIS branch, frame counts **10923, 159,
17169, 9373, 4323, 1865**. The branch tip **with my change reverted** measures **8626, 159, 13282,
8473, 4130, 2089**. Five of six differ, **without this block's change applied**, so the discrepancy is
not this block's. I first mis-read it as my own regression and was wrong; measuring the reverted arm
is what corrected it, and it is why that arm was run at all.

Either that re-measurement did not run and the older table was carried forward, or something outside
`depends=client/src/modules/camera/` moved the race itself. **The identity line reports
`roster=none (index strings)`, and a racer's NAME is physics** (`stablePairBit` hashes `r.name`), so
the roster is the obvious suspect. **Not chased, not repaired, and deliberately not overwritten** —
recorded here and in the stamp so the next reader inherits the question rather than the confusion.

## VERIFICATION

Routing decided, and its verdict on the world is itself evidence: **`world-fingerprint` was SKIPPED
with "nothing changed"** — the change lies outside the world's declared closure. It was minted anyway,
because a skip is a routing decision and not a measurement.

| role | recorded | engine, this build | verdict |
| --- | --- | --- | --- |
| **world** | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **UNMOVED** ✓ |
| **world-off** | `854018ee5d3d83e1` | `854018ee5d3d83e1` | **UNMOVED** ✓ |
| camera | `0434cd0385eacc7b` | `aad7a6e76816c2ba` | **MOVED — expected** |
| render | `57b2eb101d806b22` | `928811f17436ddad` | **MOVED — follows the camera** |

**THE "RECORDED" COLUMN IS THIS BRANCH'S RECORD, AND THAT IS THE RIGHT COMPARISON — but it is not
what `master` says today, so it is stated rather than left to trip someone.** `master` records
`world bc01b74fd4f3cfc8 · camera c6033c1f5c4d67f2 · render 1f55627fe213a31c · world-off
daf78ff18eca83c6`. The branch predates that: `master` has since re-minted, and a track seed
(`server/seeds/tracks/garden-path.json`) moved on it. **No commit on this branch has ever touched
`docs/fingerprints.json`** — `git log master..HEAD -- docs/fingerprints.json` is empty — so the file
here is simply master's older copy, carried along.

The question this block has to answer is *"did MY change move anything relative to the tree I am
changing"*, so the engine was minted on this branch and compared to this branch's record. **Anyone
merging this will re-mint against master's** and should expect all four to differ for reasons that
belong to master, not to this repair.

**NOTHING WAS RE-MINTED.** `--mint` verifies against the engine; it does not write. `git status` is
clean and `docs/fingerprints.json` is byte-identical to the branch's parent. **A visible change needs
the owner's eye first**, and this one has not had it.

**Tests:** 887 camera tests pass, including the shipped invariant 6 and the SIDEJUMP regression. Six
new tests in `panStaleZoom.test.js`, **each carrying its own sabotage** — the property on a single
moving frame, on every moving frame of a widening shot, the scope gate (frames before the endgame are
byte-identical), inertness on a static zoom, idempotence, and that the resolver's record is not
overwritten. Each sabotage arm was run and asserts the opposite.

## SOURCE HYGIENE

Product change is `client/src/modules/camera/CameraDirector.js` alone: one field, one method, one
inline block replaced by a call, one gated call site. No key, no default, no fingerprint written.

Also added: `panStaleZoom.test.js`; `scripts/diag/runin-anatomy.mjs`, carried from
`archive/runin-seed13-anatomy-1` so the instrument and the repair it validates live together; and
`scripts/diag/runin-pan-swing.mjs`, new, measure-only.

**The width STEP is untouched.** So are the level set, the forward view and the naturalness envelope.

## CONFORMITY — asked against delivered

| the spec asked | delivered |
| --- | --- |
| extend `feat/runin-level-set-1`, do not open a new branch | extended; pushed; **not merged** |
| establish the mechanism at source, do not take the diagnosis on trust | §1 — and it sharpened the diagnosis: the gate is `tSpaceLerpActive`, i.e. entry only |
| re-state the aim at the DRAWN zoom, scoped to `_schedZoom`'s mechanism | built as one method; the `_schedZoom` block now calls it |
| one mechanism, one home — if the pattern is elsewhere, fix it in one place | one implementation, idempotent, two call sites; the inline copy is gone |
| do not touch the width schedule, level set, forward view, naturalness envelope | none touched |
| camera fp will move, report as expected, do not re-mint quietly | reported; **record untouched** |
| world and world-off must not move; if world moves, stop | both unmoved, verified against the record |
| render may follow; say so | it did; said |
| tests, each provable by sabotage | 6 tests, 6 sabotage arms |
| re-run the anatomy harness and confirm its figures | all eight §4 figures reproduced to the digit |
| report, INDEX in the same commit, hygiene, conformity, ≥2 own proposals | this file; 5 proposals, 3 mine |

**Departure, stated rather than buried:** the spec's test *"frames before the run-in are unchanged"*
and its instruction *"fix it in the one place"* pull opposite ways, because the staleness is general.
**I scoped to `_runInAfterDeadline` and measured both readings**, so the spec's test now holds exactly
— and §"THE SCOPE" is the evidence for choosing that over the general build.

**Not done:** no browser eye-check of my own. The headless director does not reproduce the owner's
excursion (`project_browser_vs_headless`), so the picture is his to judge.

## PROPOSALS — none ordered, none built

### A — Ease the ADMIT, which he asked for on 2026-08-26 and is NOT in this build
Start from `archive/runin-chance-set-1`: the predicate, its sweep driver and its price are measured.

### B — MINE: give the run-in a PRESENCE term for the leader, not only a span
Seeds 49 and 18 keep the leader off canvas because the shot correctly frames the pair midpoint. The
guarantee bounds a SPAN; nothing asserts the winner is IN it. This is the third block to arrive at
that sentence, which is an argument for building it rather than restating it.

### C — MINE: assert the invariant on every frame in the director, behind the existing diagnostic seam
The property — `targetOffsetX / effX(zoom) === -camX` — is cheap and exact. `_detour` already walks
every frame. A dev-only assertion would have caught this the day the schedule handed back, instead of
after an owner noticed the picture moving and three blocks measured around it.

### D — MINE: make "what did I move" a two-arm harness rather than a habit
Every wrong turn in this block came from comparing against a RECORDED number instead of the tree's
own baseline — first the window, then the frame counts. Running any camera instrument twice on one
commit, with the change reverted, is what settled both. A `--baseline=HEAD` flag on the diag drivers
would make that the cheap default.

### E — Re-establish the tracking-lag record, or retire the frame counts from it
The entry records six frame counts as evidence of "identical to the digit" and five of them no longer
reproduce on the tree they describe. Either re-measure and correct, or stop recording counts that
depend on things outside the stamp's `depends=`.

## WHAT OUTLIVES THIS REPORT

The aim and the zoom are the same age again inside the endgame, and 92.9% of the swing at the crossing
is gone with them. A scope that is a measurement rather than a preference, and the unscoped build's
cost recorded so nobody re-derives it. Two races that still lose the leader sideways, named as a
different defect with a proposal attached. And an open question about a record that says "identical to
the digit" about numbers that are not.
