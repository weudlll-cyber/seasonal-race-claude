# Git tags — permanent anchors and cleanup record

**Owns:** the git-tag register — every permanent anchor and return point, and the record of what was cleaned up. A guard depends on the entry format below.

> **HOW TO REGISTER A TAG, because a guard depends on it.** Write it as a list item whose first
> token is the backticked name followed immediately by the backticked short SHA:
>
> ```
> - `pre/example` (`abc1234`, 2026-08-05) — why this return point exists.
> ```
>
> `scripts/check-tags.mjs` parses exactly that shape, in both directions. An entry written any other
> way is **silently unchecked** — not a failure, which is worse. A tag name in running prose is NOT a
> declaration, deliberately: a tag name is indistinguishable from a BRANCH name, and this register
> discusses branches at length. A declaration under a heading marked RETIRED or COLLAPSED is treated
> as history and skipped, so **never record a LIVE tag under one**.

This repo uses a lot of `pre/*` and `backup/*` working-session step-tags. They are scaffolding: safe
return points captured before/after a risky step. Once a phase closes, that history lives in the commit
messages and the phase docs, so the step-tags are collapsed. This file records which tags are permanent
and what was retired.

## How a return point is obtained (TAG-SWEEP-1, 2026-08-14)

**A ship's return point is `v-ship-<name>^1` — the first parent of its merge commit — so `pre/ship-*`
tags are derivable and 16 of the 19 were deleted rather than kept.** Three were verified NOT
derivable and are kept below with the reason: a tag cut on the feature branch instead of master
(`combo15`), a register commit landing between the tag and the merge (`ceremony-opening`), and a
ship with no merge commit at all to take a first parent from (`the-night`).

## Permanent anchors (do NOT delete)

### stable/*

- `stable/pre-overlap-closed-20jun` (`712f334`) — the stable return point for the entire
  overlap-closed state. Owner-designated permanent anchor.
- `stable/pre-governor-04jul` (`d9c9cd3`) — pre-governor baseline (surge + rubber-band intact,
  no governor), captured before the race-action director work.

### race-action-complete

- `race-action-complete` (`7af058b`) — end of the race-action phase: choreography + PulkLeadRotation
  shipped, cleaned, documented (see [RACE-ACTION.md](RACE-ACTION.md)), and tested. The stable baseline for
  the Stage-7 merge to master (no longer the tip — master has moved on through the post-race-action work).
- `v1-race-action-merged` (`e1d5a2b`) — the race-action arc merged to master.

### v-*-complete (phase endpoints, retained)

- `v-parity-complete` (`2e27850`) — the sim↔browser parity phase endpoint. Its thirteen `pre/*`+`backup/*`
  step-tags were collapsed onto it and deleted; **this anchor survived and is live at origin.** It is
  declared HERE, not in the _Parity phase — COLLAPSED_ section below, because a declaration under a
  RETIRED/COLLAPSED heading is deliberately skipped by `check-tags` — so recording a LIVE tag there
  would have left it unguarded in both directions. (TAG-GUARD-3.)
- `v-perf-complete` (`858bc4f`) — performance phase.
- `v-camera-perf-complete` (`36ddc9c`) — camera performance / autorun.
- `v-branding-phase1-complete` (`b9a2f03`) — branding phase 1.
- `v-datadir-complete` (`425242d`) — DATA_DIR hardening.
- `v-clean-state-complete` (`ab71825`) — clean-state checkpoint.
- `v-phaseD-complete` (`1b6f270`) — phase D.
- `v-security-hardening-complete` (`3075f5c`) — security hardening.
- `v-outcome-0.6-complete` (`5646d23`) — OUTCOME-start 0.6 endpoint.
- `v-rowenv-easing-complete` (`5f5c03b`) — rowEnvMult easing shipped dormant.
- `v-rowenv-default-on-complete` (`db27fc4`) — rowEnvMult easing flipped default ON.
- `v-b2-heroes-complete` (`8bf54ca`) — B2-Heroes "Attack & Fall" shipped ON (`b2AttackHeroes=3`).
- `v-retune-cleanup-complete` (`e0f6950`) — the **retune → dead-mechanisms cleanup → DevScreen reorg →
  greenfield-wrap** phase endpoint (2026-07-23). One anchor for the whole arc: the G/strength retune
  (defaults `0.75/0.5`, ON fingerprint `e93ffa70dad562a1`), the removal of the carousel / pack-release /
  universal-band-arrival mechanisms (both fingerprints byte-identical), the DevScreen regroup, and the
  port of the greenfield measurement keepers + evidence record onto master. The five per-step
  `pre/*`+`backup/*` tags were collapsed onto this and deleted — see the collapse table below.
- `b4-complete` (`03e28cf`) — camera-foresight B4 endpoint.
- `backup/lbb-gate-complete` (`7883d45`) — look-before-brake gate endpoint (a `backup/*` name, but a
  completed-phase anchor; retained).

### Cleanup + archive endpoints (2026-07-20)

- `v-cleanup-complete` (`8b98f0a`) — the 5-step repository cleanup arc endpoint: archived closed experiments +
  concept reviews (step 1), removed closed sweep/diag drivers (step 2), salvaged `results/` `.md` docs +
  freed ~1 GB local scratch (step 3), docs catch-up + pulklr retirement (step 4), branch/tag hygiene
  (step 5). The `pre/cleanup-step1..4` scaffolding tags were collapsed onto this and deleted.
- `archive/diag-look-before-brake` (`c32cc61`) — the entire `diag/look-before-brake` branch history,
  preserved as a permanent tag before the branch was deleted (2026-07-20). Holds the look-before-brake
  diagnostics AND the `--jobs` sweep parallelism (`0c20f9b`); the `--jobs` BACKLOG item cherry-picks from
  here rather than a live branch.
- `archive/greenfield-proto-final` (`2663f7b`) — the entire `pre/greenfield-proto` branch history,
  preserved as a permanent tag before the branch was deleted (2026-07-23). Holds the greenfield night
  run in full: the physics-tax measurement, the open-loop **composer prototype** (deliberately NOT
  ported — measured, dominated, retired with the branch), the G/strength screens, and the retune gate.
  The keepers were ported to master in the greenfield wrap; this tag is where the un-ported prototype
  code lives on.
- `archive/carousel-sweep-final` (`2e6b597`) — the entire `pre/carousel-sweep` branch history,
  preserved as a permanent tag before the branch was deleted (2026-07-23). Holds the carousel
  window-control sweep that produced the "suppression, not selection" verdict — the measurement that
  justified deleting the lead-rotation mechanism from master.

### The corridor overlay — archived when the owner dropped it (2026-08-09)

Built to settle a dispute the numbers could not: on river-run, is the camera leaving the track? It
never produced the deciding picture, so the owner dropped it. **Its findings are on master as
reports; this tag preserves the CODE, which is not** — `corridorOverlay.js`, its `defaults.js` key,
the Dev Screen toggle and the `renderRaceFrame` hook. The branch was deleted at origin.

- `archive/corridor-overlay-1` (`4dbfba8c`, 2026-08-09) — the overlay, and the reason to keep it:
  the question it was built for is STILL OPEN. `width: 300` is a FULL width to the physics and the
  camera and a HALF width to the track-edge drawing code, so a guarantee expressed in track widths
  may be promising a corridor the viewer cannot see. Start here rather than from scratch — see
  [DEAD-ENDS.md](DEAD-ENDS.md) §K.

### COORD-SYSTEM — one ruler for the wrapper (2026-08-14)

**The owner judged it on a production build on 2026-08-14 and accepted it.** The overlays inside
`.race-canvas-wrapper` are anchored in percentages rather than pixels; at his 1037x583 the corner
clearance becomes 12.96 CSS px instead of 16. **No fingerprint moved** — all three were re-run fresh
on the final tree and are unmoved, so nothing was minted. See
[SHIP-COORD-SYSTEM.md](../reports/evolution/SHIP-COORD-SYSTEM.md), whose section 4 records the blind
spot this ship exposed: a visible change that no fingerprint can see.

  after the source clean-up.
- `v-ship-coord-system` (`f78869bc`, 2026-08-14) — the merge itself.

### BRANCH-CLEANUP — two branches archived so the record survives the branch (2026-08-14)

**A branch is a poor archive: it is mutable, it can be deleted by anyone, and it says "work in
progress" to every reader who lists it.** These two were kept as record for weeks because deleting
them would have destroyed evidence. The evidence is now either on master or under a permanent tag, so
the branches went. The EVIDENCE was moved FIRST and the branches deleted after — in that order, never
the other way.

- `archive/front-group` (`87a08af4`, 2026-08-14) — the endgame corridor floor, nine commits, built
  and retired without ever shipping. `endgameCorridorFloor` and `endgameFloorBindsExtent`, their Dev
  Screen control, and the group machinery FRONT-GROUP-6 removed. **Superseded by CONTENDER-ZOOM-1:
  the corridor is the wrong quantity in BOTH directions, constraining only ACROSS the track while the
  racers who leave a finish shot leave ALONG it** — see [DEAD-ENDS.md](DEAD-ENDS.md) §N. This tag
  holds the CODE only; reports FRONT-GROUP-1/2/3/7 and `scripts/endgame-width-truth.mjs` are on
  master, brought across before the branch was deleted.
- `archive/finish-framed` (`6e94a086`, 2026-08-14) — the finish line as a guaranteed subject, two
  commits, and **its head commit declares itself RED and says do not merge**: its own guard reported
  51 frames with no racer on screen on luger-hill seed 9. That honesty is why it was kept and why it
  is archived rather than discarded. Superseded by `feat/runin-state` (merged `eea0acf2`), which
  reached the same goal by another route. Two things reached master separately — the guard
  (`2a7e1bdf`, a later version than this one) and its `pointGuarantee` tests, which covered a
  function that had shipped with none. See [DEAD-ENDS.md](DEAD-ENDS.md) §M.

### FINISH-BAND — the finish line is a line, not a hair (2026-08-13)

**The owner judged it on a production build on 2026-08-13, on dirt-oval and garden-path — the two
tracks his rejection came from — and ACCEPTED it.** What ships is a checkered band across the
whole corridor, flat on the racing surface and drawn UNDER the racers, with the edge posts and the
gold accent kept. It replaces a marking that measured **7.7 screen px deep and painted 486 px² at
every zoom on every track**, which he judged on production on 2026-08-12 and REJECTED as too faint
to find.

**The fault was the brief rather than the build**, and that is why this entry exists at all: he
rejected a GANTRY standing OVER the track, which would hide the racers passing under it; that was
read as "edges only", and FINISH-READABLE-1 deleted the ground band instead of repairing it. A flat
marking painted ON the surface covers nobody. **30 screen px deep against 9**, clamped so it is never
deeper than half the road is wide; painted area at the mid-race shot goes **31–65×**. Real area on
10 of 10 tracks, and the under-racers ordering is measured at the tightest endgame zoom rather than
argued.

**THE BRANCH WAS BROUGHT FORWARD BEFORE ANYTHING WAS MINTED.** It was cut off `e1f53781`, 26 commits
behind, so every fingerprint its report carries was measured against a base that no longer exists;
none of it was minted. RENDER moved and is minted; WORLD and CAMERA were **run in full on the merged
tree** rather than argued from `engine-reach`, and both are byte-identical. Values live in
[fingerprints.json](fingerprints.json).

**And the band did not change size across the forward merge**, measured on all ten tracks at three
shots — which is the screen-size design proving itself against a camera that moved a great deal
underneath it. What moved was the SHOT: garden-path's tightest endgame zoom went 5.17 → 4.98, and the
band measured the same 30.0 px in it either way.

  restore a finish marking that is two checkered posts and a gold hairline, 7.7 px deep, with the
  RENDER value `c962df5334277f95`.
- `v-ship-finish-band` (`354859bc`, 2026-08-13) — **the ship.** The forward merge is inside it: the
  branch was merged with master first, re-measured, and only then merged out.

### ENDGAME-THRESHOLD — the endgame opens at 95% (2026-08-18)

**The owner's decision, 2026-08-18.** He had been running 0.95 himself, judged it on a production
build on 2026-08-17, and **explicitly waived a before/after sweep** — so no ten-track measurement
stands behind this number and none is claimed. One key in `defaults.js`; the Dev control, its range
and its 1% step are untouched.

**One value, two readers, and both are the run-in's**: the state machine's endgame gate and
`_runInWindowOpen`. So the endgame declares later and the run-in's window is **half as long**.

**This is the first camera ship in this sequence where STATE DECISIONS moved** rather than only
framing, and the tracking-lag frame counts are how it shows: BATTLE_ZOOM 9406 → 9701, COMEBACK_ZOOM
605 → 644, LEADER_ZOOM 17788 → 17630, LEAD_CHANGE 7789 → 7786, with OVERVIEW and PHOTO_FINISH
identical because neither is eligible in the stretch the threshold moved. Every tail improves.

**WORLD and WORLD-OFF were MEASURED, not argued**, and the closure walk is why: `defaults.js` is
inside **all four** instruments' declared closures, because the race's keys and the camera's live in
one file. "It is only a camera key" is a claim about the CONTENTS of the diff, not about the file it
sits in — so only a measurement can settle it. Both are byte-identical. `engine-reach` was
deliberately not leaned on: on a committed merge its verdict is not evidence. Values live in
[fingerprints.json](fingerprints.json).

**A stored 0.95 is dropped by this change** — confirmed against the real `pruneStored` rather than
assumed — so the owner follows the default at the same number, and the key stops being shadowed.

- `v-ship-endgame-095` (`740f605c`, 2026-08-18) — **the ship.** The return point is
  `v-ship-endgame-095^1`, which restores an endgame declared at 0.9 and a run-in window twice as
  long, with the CAMERA value `6ae77f12daf23f78` and the RENDER value `a870f5f9e79cb444`.

### RUNIN-HOLD — the run-in holds the opening shot and closes once (2026-08-17)

**The owner judged this on a production build on 2026-08-17 and ACCEPTED it.** Three framing changes
in one merge, one tag, one mint.

**The corridor cap no longer overrides the finish line's own ceiling** (RUNIN-LINE-1). `_setTargets`
honoured `_ceilings.line` in its `Math.min` and then let the corridor cap raise the composed zoom
back above it — so the one term that knows where the finish line is was being overruled by a term
that does not. The repair is one clause, and the instrument was built BEFORE it rather than after:
`check-runin-frame` gained a **third question** — is the line in frame from the endgame threshold to
the crossing, on ten tracks — which splits its losses by cause, overridden against merely trailed,
so a future regression names itself instead of appearing as a single number.

**The opening shot is HELD, then closed in ONE sweep** (RUNIN-HOLD-1). Left alone `_lineCeiling`
begins closing on the frame the window opens, which measured about 3.6 s of lead-in at roughly
95 px/s of picture flow — below the rate at which anything reads as movement. **The release is
derived, not chosen**: the sweep lasts `runInOpenMs`, so it begins when the leader's remaining time
to the line has fallen to that length. That time is measured over the RUN-IN's own span, because the
field decelerates into the finish and a whole-race average was wrong by about six times. No key was
added.

**The leader is where the owner put him** (RUNIN-BACK-1) — a little before the centre of frame,
easing to a little after it — and RUNIN-AHEAD-1's forward bound, which contradicted that
specification, is removed with nothing in its place. Placing the leader behind centre is itself the
reason the frame does not reach past the line. **It narrowed nothing**: the extra width the bound
bought carried no racer, the whole field spanning 600–830 px inside a frame the line was forcing to
2668.

**Defaults are not touched.** `endgameThreshold` keeps its shipped value; the Dev control merely
steps it in 1% instead of 5%.

**Five further shapes were built, measured and REVERTED on the branch, and none is in this tree** —
RUNIN-PIN-1, RUNIN-ANCHOR-1, RUNIN-RATE-1, RUNIN-EVEN-1/-2 and RUNIN-SCHEDULE-1. What they
established is the finding the report opens with: an even close and "the finish line stays in frame"
cannot both hold while the two ends of the close are fixed, because `_lineCeiling` is the **boundary
of the admissible set** rather than one option among several.

**CAMERA and RENDER both move; WORLD and WORLD-OFF cannot.** Decided by the instruments' own
declarations rather than asserted: walking `scripts/lib/routing.mjs` `closureOf` from each declared
reach entry, **none** of the 17 merged files lies inside `fingerprint-default.mjs`'s closure (36
files), while CAMERA's closure (36) and RENDER's (55) both contain `CameraDirector.js`, the single
production file this ship changes. **`engine-reach` was deliberately not leaned on** — on a committed
merge it has no working-tree diff to read, so its verdict there is not evidence. Values live in
[fingerprints.json](fingerprints.json).

- `v-ship-runin-hold` (`48f954a4`, 2026-08-17) — **the ship.** The return point is
  `v-ship-runin-hold^1`, which restores a run-in that begins closing the moment its window opens and
  a corridor cap that can override the line, with the CAMERA value `ff2bc42af377b5cf` and the RENDER
  value `0e04fa4a5e9c3b85`.

### MINIMAP — the minimap says where the race starts, ends, and is never raced (2026-08-15)

**The owner judged the marks and the unraced tail on a production build on 2026-08-15 and ACCEPTED
both.** They ship as ONE ship — one merge, one tag, one mint — because master gets a visible change
once.

The minimap drew the band, its two edges and the racer dots. On an open track the band runs on past
the finish and looked there exactly as it does before it, so **there was no way to see how much race
was left.** It now carries a start mark, a finish mark, and a wash over the stretch that is never
raced.

**Both marks are bars across the band at `getPosition(t, ±0.5)` — the SAME segment the world's finish
gate spans**, since `drawOpenTrackFinishLine` extrudes `getPosition(ft, 0)` by `openTrackHW`, which is
`trackWidthPx / 2`, which is the width `getPosition` offsets by. The mark and the line the racers
cross cannot drift apart by construction rather than by agreement. Solid green starts, a black/white
checker finishes, and **where the two coincide — every closed track — one mark carries both** rather
than two bars stacking into a smear.

**Sizes were chosen against a measurement.** The bar is 12–22 panel px on the ten shipped tracks and
its ends land within 1.5 panel px of the drawn band edge, both measured across all ten. An earlier
reading assumed ~50 px and would have drawn a blob on half the game.

**The unraced tail is built from the mark's own source, and that is the whole design.** Driving the
shipped `renderMinimap` through a recording context on all ten tracks at four finish positions gives
a **seam of 0.000000 panel px** against the checker, every case. The alternative — the band's own
index-paired `getEdgePoints` — was rejected with numbers: the two parameterisations disagree by up to
502 world px on luger-hill, an along-track offset that would have put the seam visibly off the mark.

**No config key was added**, and the minimap still reads nothing but the shape it is handed.

**RENDER moved and is minted; WORLD, WORLD-OFF and CAMERA did not move.** That was decided by the
guards' own declarations rather than asserted: walking `scripts/lib/routing.mjs`'s `closureOf` from
each instrument's declared `reach`, none of the six merged files lies inside WORLD/WORLD-OFF or
CAMERA, while RENDER's closure contains both changed source files. **`engine-reach` was deliberately
not leaned on** — on a committed merge it has no working-tree diff to read, so its verdict there is
not evidence. Values live in [fingerprints.json](fingerprints.json).

**One claim in the branch's own report is retracted inside it**: "dark wedges at the ends of an open
band". The canvas has one band colour across 110601 px and there is no darker region anywhere. What
is really there is that an open band's two end caps are never stroked.

- `v-ship-minimap` (`8a2dacab`, 2026-08-15) — **the ship.** Two blocks in one merge; the return point
  is `v-ship-minimap^1`, which restores a minimap with no start mark, no finish mark and no tail,
  with the RENDER value `0d5854a652c69d87`.

### CONTENDER-ZOOM — the photo finish frames everyone still abreast (2026-08-14)

**The owner judged it on a production build on 2026-08-14 and ACCEPTED it.** The photo-finish shot is
now framed on everyone still fighting for the win rather than on a fixed pair, and it is never wider
than the road.

**A racer is a contender when he is BOTH nearly level with the leader AND on a free lane** — one on
the same lane as somebody ahead cannot win, because he would have to move aside and then still
overtake, and the shot is far too short for both. **Neither condition is a new number:** both are the
engine's own geometry from `pairContact` — `contactLength` (one body length between equal racers) for
level, `contactWidth` with `rowLayout`'s `physicalY` unit for the lane. The race is lane-free and
`physicalY` is continuous, so "same lane" had to be geometric.

**Detection and duration are unchanged.** The gate still enters on the top two, and
`_photoFinishContendersHome` still reads the leading two — letting the framed set decide when the
shot ENDS stretched the photo finish by 85% and produced 59 empty frames.

**The corridor cap ships as part of the same feature and is not separable.** Priced apart it costs
nothing: 3.4% contenders-not-whole with it nulled against 3.4% with it arriving, and empty frames
46 → 35. **It arrives over `corridorCapArriveMs` rather than appearing** — its scope is a state
predicate, which is a cut, and it used to switch on in one frame and take the target 2.47 → 10.02.
Hanging it on the run-in's continuous progress was built first and FAILED: the cap escaped the finish
shot and tightened OVERVIEW from 1.5 corridors to 0.469.

**Measured, ten tracks × three seeds:** contenders not whole **10.3% → 3.4%**; crossing zoom median
**99%**, opening only where racers are genuinely abreast; photo-finish frames 7468 against master's
7441; `check-runin-frame` green on both halves. CAMERA and RENDER moved and are minted; WORLD was RUN
rather than argued and is unmoved. Values live in [fingerprints.json](fingerprints.json).

  to restore a photo finish framed on `ordered.slice(0, 2)` with no corridor cap, CAMERA
  `d7a8fe54072df6d7` and RENDER `d1c9d5d0da6a964f`.
- `v-ship-contender-zoom` (`0bd07dba`, 2026-08-14) — **the ship.** It carries five diagnosis reports
  as well as the change: three of them record wrong attributions of mine that measurement overturned,
  and they are kept deliberately so the next person down this path does not repeat them.

### CAMERA-ENDING-WINDOW — the camera's own fingerprint can see the ending (2026-08-13)

**The instrument changed, not the product, and that is the whole entry.** Not one line of camera
behaviour moves here. `camera-fingerprint.mjs` ran `while (finishedCount < N)`, so it stopped on the
exact frame the ending BEGINS and had never rendered a FINISHED frame — which meant ENDING-PICTURE-1,
the block that makes the director compose the ending at all, was invisible to the camera's own change
detector. The record said so in three separate places, and said it as though it were a property
rather than a hole. **The window is now DERIVED** from `endingOnRaceScreenMs()`, the same arithmetic
RaceScreen sets its navigate-away timer from, so a future change that lengthens the ending lengthens
the window with it. CAMERA moved once, deliberately, and is minted; WORLD and RENDER were re-run in
full and are unchanged. Values live in [fingerprints.json](fingerprints.json).

**The proof is the off arm, and it is exact.** With `endingKeepsFinishShot` false — the arm in which
the director does not compose the ending — the extended instrument reproduces the predecessor value
BYTE-IDENTICALLY, so no frame before the last crossing moved and the entire fingerprint move is the
ending. A sabotage firing only from the SECOND all-home frame onward moves the default arm and leaves
that control untouched; removing it returns the hash. **9 of 10 tracks contribute 300 FINISHED
frames**, and the instrument now prints that count and refuses to run if none does — so the blindness
cannot come back quietly. Cost 44 s against ~29 s.

  Reset here to restore a camera fingerprint that stops at the last crossing, with the CAMERA value
  `c1556053b1824758` and `docs/fingerprints.json` carrying RUNIN-1's mint.
- `v-ship-camera-ending-window` (`96f7a0ae`, 2026-08-13) — **the ship.** An instrument change that
  moves a baseline is the case a ceremony exists for, so it was run in full rather than argued: both
  other fingerprints measured, the off arm measured, and the move proved by sabotage and restored.

### STAMP-COMPLETE — the stamp guard answers about everything it is responsible for (2026-08-13)

**A guard that scans one file and prints a confident green line.** `check-measured-stamps` ran bare
over `docs/CAMERA_DIRECTOR.md` and nothing else, so a stale stamp in any other living document was
invisible — the identical shape INDEX-COMPLETE-1 had fixed in `check-index` the previous day. It now
scans the whole living-doc set, discovered by the SAME rule `check-doc-links` uses so that "a living
doc" has one definition. **Proved by sabotage in both directions on one tree**: with a stale stamp
appended to `docs/ENDING-PHASES.md`, the old guard exits 0 reporting "1 stamp across 1 document, 0
stale" and the new one exits 1 naming the document and the commit that invalidated it.

It defaults to ALL rather than refusing without arguments, following INDEX-COMPLETE-1's reasoning:
refusing helps only the person who runs it bare, while defaulting makes the cheapest invocation the
complete one. It still reads git HISTORY, which was re-examined and left alone — the question a stamp
raises is historical, and the PENDING pass already reports the working tree without failing on it.

**It unblocked something the same day.** `docs/SHIP-CEREMONY.md` recorded that its hand-counted
`eleven` could not be stamped BECAUSE this guard scanned one file. Re-counted and stamped.

- `v-guard-stamp-complete` (`758a95ac`, 2026-08-13) — **the merge.** No fingerprint moves; this is a
  guard, and it is tagged because a guard widening its own reach is exactly the kind of change a
  later reader needs to be able to date.

### RUNIN — the run-in glides wide-and-back, and only the line sets the width (2026-08-12)

**The endgame gets a shot that shows the line.** From the moment the leader is within reach of the
finish, one progress measure — the leader's remaining distance ALONG THE TRACK, so it is monotone —
drives both the anchor placement and the zoom: the shot opens wide-and-back over `runInOpenMs` and
closes to the ordinary shot exactly at the crossing, with no seam and no handover. **It adds no
camera state**, which is deliberate and was checked in the source rather than after the fact:
RaceScreen starts the photo-finish slow motion off `hudState`, so a RUN_IN state holding the slot at
the line would have suppressed it outright. Line in frame over the run-in window **9.8% → 86.6%**
pooled across ten tracks, first in shot 1.1 s after the window opens, **0 empty frames on every
track at every pace tested**. The trade is the tracking-lag tail — LEAD_CHANGE p95 10.72 → 22.17 pp —
and it is proportional to the zoom rate by construction. CAMERA and RENDER moved and are minted;
WORLD is unchanged and was re-run in full rather than inferred. Values and the two-part attribution
live in [fingerprints.json](fingerprints.json).

**Five shapes were built and four were replaced**, each by the measurement of its own limit — the
history is in the six RUNIN reports, and [DEAD-ENDS.md](DEAD-ENDS.md) carries what must not be
retried, including the tighten-rate limit that cost the crossing shot an order of magnitude.

  `v-ship-resolve-converge`. Reset here to restore an endgame with no run-in at all — no `runInShot`
  or `runInOpenMs` keys — and the CAMERA/RENDER pair `64432e18a7e62188` / `096f2726c45ed853`.
- `v-ship-runin` (`eea0acf2`, 2026-08-12) — **the ship.** Two keys, both defaulting to the new
  behaviour. **The off-arm promise was measured on this tree, not assumed**: with `runInShot` false
  both instruments reproduce the predecessor values exactly, so the run-in and the convergence repair
  shipped beside it change nothing until the run-in composes.

### RESOLVE-CONVERGE — a widening step has to buy something (2026-08-12)

**The last step of every shot stops paying width for nothing.** `resolveCamera` pursued its
inner-frame guarantee by stepping the zoom down 10% at a time and never asked whether the steps were
getting anywhere; where the world-bounds clamp holds the target at the world edge they cannot, so it
ran to the projection floor, handed over the whole world, and left the target further outside than it
started. It now takes a step only when the step strictly reduces how far outside the inner frame the
target lands — a comparison, no new number. **The up-front "is it reachable" test was rejected on
evidence**: the clamp has two regimes and where the world already FITS the frame, widening genuinely
helps, so a test written from the other regime alone would have shipped wrong.

**NOTHING WAS MINTED, and that is the measurement rather than an omission.** Over 172226 frames the
loop fires zero times on the shipped configuration, so CAMERA and RENDER are byte-identical to the
values already in [fingerprints.json](fingerprints.json), and the WORLD cannot be reached at all
(`engine-reach --check`: none of 4). The defect is reachable only under a forward-anchored wide shot
near the world edge, which is the run-in shipped beside this.

  here to restore a `resolveCamera` that widens to the projection floor whenever the pan target falls
  outside `innerFramePct`, whether or not widening can bring it back.
- `v-ship-resolve-converge` (`d7eca25d`, 2026-08-12) — **the ship.** No key: it is a defect repair
  with no second position worth offering, and both fingerprints prove it changes nothing until the
  condition that triggers it exists. `scripts/resolve-converge-truth.mjs` ships with it and measures
  the SHIPPED function rather than a copy — it reconstructs `_setTrackTargets`'s arguments from the
  director's own `_framingProbe` and self-checks every frame against the `targetZoom` actually set.

### FINISH-PAIR — the photo finish frames the pair it is following (2026-08-11)

**The camera stops lurching at the finish, and NOTHING about the race moved.** The shot captured its
two contenders once at entry while the FRAMING guaranteed the live top two by `t`, re-sorted over the
whole field every frame with no finished filter — and a finished racer does not stop, `raceCore`
coasts it on a run-out decay, so a later finisher overtakes an earlier one and the guaranteed slot
walked backwards through the finishing order. Every swap moved the pair distance discontinuously and
the picture lurched. CAMERA and RENDER moved and are minted; the WORLD is unchanged and is the
control that says the engine was not touched. Values live in [fingerprints.json](fingerprints.json).
**Reversals of the picture on his race 5 → 2**, and the cost that was feared inverted: the winner is
in frame for 100 % of the shot against 87–91 % before.

  restore a photo finish whose guarantee follows the live top two by `t`, with no
  `photoFinishContenderFraming` key, and the CAMERA/RENDER pair `afd7461071cf2eec` /
  `c11a7e87d9a9126c`.
- `v-ship-finish-pair` (`b5c4ab40`, 2026-08-11) — **the ship.** One key, defaulting to the FIX rather
  than to today's behaviour, because he asked for a defect to be fixed and not for a taste to be
  offered. Hysteresis was measured first across eleven holding windows and lost: at short windows it
  is WORSE than the defect, and it only matches pinning at a window longer than the shot itself. Two
  instrument blind spots are recorded rather than repaired — the shared driver runs a nameless field
  and no slow motion, and without either the defect does not reproduce at all.

### ENDING-PICTURE — the ending gets a picture worth holding (2026-08-12)

**The hold, and the picture it was supposed to be holding.** `finishHoldAfterLastMs` goes from 0 to
1500 — his own podium beat — and the card-free tail grows from 500 to 2000 ms. But the ending was
holding nothing: the camera's transform was replaced by the IDENTITY the frame the phase flipped
(on an open track an 853×470 window at world (0,0) with **0 of 20 racers in it**; on a closed one the
whole world as a map), and a full-canvas scrim reading "Loading results…" was drawn over all of it.
Both predated the hold by months. The director is now consulted through FINISHED and the splash is
retired, each behind a key defaulting to the fix. RENDER moved and is minted; values live in
[fingerprints.json](fingerprints.json). **CAMERA is unchanged and that is NOT evidence about this
ship** — `camera-fingerprint.mjs` stops at the last crossing and renders no FINISHED frame, which is
recorded beside the value.

**That last sentence was true when this tag was cut and is no longer true of the instrument**, and
it is left standing rather than edited because it is what the ship was judged against.
CAMERA-ENDING-WINDOW-1 (2026-08-13) derived the instrument's window from `endingOnRaceScreenMs()`,
the same arithmetic the race screen navigates away on, so it now renders the ending. The blindness
this paragraph records is measured, not remembered: with `endingKeepsFinishShot` false the extended
instrument reproduces this ship's CAMERA value exactly, which is precisely why that value could say
nothing about a ship that only acts once the key is on.

  to restore an ending that flips to an identity transform at the last crossing and draws the
  "RACE FINISHED! / Loading results…" scrim over it, with `finishHoldAfterLastMs` absent, and the
  RENDER fingerprint at `c0fd1e8eda539867`.
- `v-ship-ending-picture` (`a20c701f`, 2026-08-12) — **the ship.** Three keys in total across the two
  blocks, all defaulting to the fixed behaviour because he asked for a defect repaired rather than a
  taste offered. The zoom-out trigger is deliberately UNCHANGED: gating it on
  `finishedCount >= nRacers` was proposed and rejected by him, since it would make the pull-back's
  start a property of the slowest racer. New guard `check-ending-frame.mjs` renders a real FINISHED
  frame and refuses a full-canvas fill at the identity transform — tracking the matrix is what stops
  it flagging the track's own background — proven by sabotage, 1.1 s.

> **DATE CORRECTION, 2026-08-12.** The two sections below and their four tags were dated 2026-08-13.
> That date was never observed — it came from a task specification and propagated. Every date here is
> now read from `git log --date=iso` on the commit it names: `6de86e6a` 2026-08-11 18:15 (WINNER-CARD
> ship), `235333d5` 2026-08-11 15:56 (its return point), `eb051889` 2026-08-11 15:56 (PODIUM-BUILD
> ship), `0da0b574` 2026-08-11 13:29 (its return point). The same wrong date reached three
> `defaults.js` notes, one in `ResultScreen.css` and one test header, all corrected the same way and
> from the same source. The reports that discuss it are append-only and were NOT edited — see the
> CORRECTION section of [reports/night/NIGHT-2026-08-12.md](../reports/night/NIGHT-2026-08-12.md).

### WINNER-CARD — the ending names the winner (2026-08-11)

**The counterpart to the opening's brand card, and NOTHING about the race moved.** At the end of a
race a card names the winner — race number, name, colour — over the race picture, in the brand's
accent where a brand is chosen and in the podium's gold where none is. All three fingerprints were
re-measured on the shipping tree and none of them changed; values live in
[fingerprints.json](fingerprints.json). **The render fingerprint is BLIND to it** — it records canvas
draw calls and the card is DOM, so its unmoved hash is evidence about the picture underneath and not
about the card. The owner's eye is the only instrument that saw it.

  restore an ending with no winner card at all: no `winnerCardMs` key, and `finishPauseMs` back at
  its pre-card length before the card's read time was allowed to set it.
- `v-ship-winner-card` (`6de86e6a`, 2026-08-11) — **the ship, at his SECOND look.** The first
  placement sat on the MINIMAP, which is drawn INTO the canvas and therefore appears in none of the
  files that name the other overlays — reading the sources could not find it and did not. What
  shipped is placed against a MEASURED occupancy map of the finish frame, and anchored in
  PERCENTAGES rather than pixels: on the owner's machine the canvas displays at 0.81 scale, never
  1:1, so a pixel offset agreed with the minimap at no scale anyone uses. Measured overlap with every
  other occupant is 0 at canvas scales 0.81 and 0.51. The card is a TENANT of `finishPauseMs` —
  `min(winnerCardMs, finishPauseMs)` — so it cannot make the ending longer at any setting, and 0 on
  either key removes it.

### PODIUM-BUILD — the result screen arrives instead of appearing (2026-08-11)

**The ending answers the opening, and NOTHING about the race moved.** The podium is built up — 3rd,
then 2nd, then the winner held for twice as long, and only then the ranking and everything below it.
All three fingerprints were re-measured on the shipping tree and none of them changed; values live in
[fingerprints.json](fingerprints.json). What keeps it cosmetic is structural rather than asserted: a
revealed element carries NO class, so the end of the sequence is byte-for-byte the DOM the screen
rendered before the feature existed.

  to restore a result screen that appears complete in one frame, with no `podiumRevealBeatMs` key,
  no build-up, and no brand accent on the winner's arrival. It also restores `CLAUDE.md`'s claim of
  _"exactly two"_ owner quotations — which was already wrong when this tag was cut, and is the
  reason that sentence is now a list.
- `v-ship-podium-build` (`eb051889`, 2026-08-11) — **the ship.** One key, `podiumRevealBeatMs`, and
  every other time in the sequence is a whole multiple of it, so the total is `4 x beat`. **1500 ms
  is the OWNER'S number, not the one that was proposed:** he watched it on a production build at 700
  and moved the slider himself. Two escape hatches make a 6.0 s ending affordable — any click or key
  press completes it at once, and 0 restores the previous screen exactly, scheduling no timer and
  applying no class. A system asking for reduced motion never starts it.

### RENDER-SAMPLER-CEREMONY — the instrument follows the ceremony again (2026-08-11)

**RENDER moves and the product does not.** The render fingerprint sampled the start ceremony at five
typed milliseconds, and CEREMONY-OPENING moved the starters board past the last of them: the board,
the settled beat and the countdown digits were outside the hash. The points are DERIVED from the
schedule now, one per beat. **CAMERA, WORLD and WORLD-OFF were re-measured on the same tree and none
of them moved** — that is the acceptance, not a footnote, because an instrument that starts seeing
more must not move anything it was already seeing. Values live in
[fingerprints.json](fingerprints.json).

  Reset here to restore the five fixed countdown sample points and a render hash that cannot see the
  starters board, its heading, the settled beat or the digits. Proven rather than asserted: the
  board heading changed under those points is byte-identical.
- `v-ship-render-sampler-ceremony` (`9cee5875`, 2026-08-11) — **the ship.** The countdown points
  come from `ceremonyScheduleFor`, one per beat at its midpoint, plus a second inside the board's
  fade; the brand is turned on in the harness so the BRAND beat exists to be sampled at all. Five
  countdown frames per track become seven, and the marker carries the BEAT rather than a
  millisecond, so a beat that stops being sampled moves the hash instead of going quiet. What it
  still cannot see is named in the harness: the brand CARD and the corner logo are DOM.

### CEREMONY-OPENING — the race opens on the brand, then on the track (2026-08-11)

One strand, one merge commit. **The opening was re-ordered and it is the owner's own shape**: the
brand's logo and the chosen race name first, then the whole track with nothing over it, then the
starters board. **CAMERA and RENDER both move**; WORLD and WORLD-OFF do not, and the world hash was
re-measured on the shipping tree rather than argued about. Values live in
[fingerprints.json](fingerprints.json).

- **KEPT, NOT DERIVABLE (TAG-SWEEP-1):** `v-ship-ceremony-opening^1` is `3130af70`, a `ship(register)`
  commit that landed between this tag and the merge, so the derivation returns a different (later)
  commit than the tag does.
- `pre/ship-ceremony-opening` (`09e69786`, 2026-08-11) — master immediately BEFORE the ship. Reset
  here to restore the 1400 ms track beat, the starters board that comes up during the push-in travel
  and stands across it, the single-line `STARTERS · 40` heading, and a ceremony with no brand card in
  it. It also restores the opening's old length: 14.4 s at 40 racers against 18.0 after.
- `v-ship-ceremony-opening` (`c7038569`, 2026-08-11) — **the ship.** The opening is re-ordered to the
  owner's shape and the starters board stops standing across the push-in travel: `boardStartMs` was
  `venueMs`, so the track's own moment was 1400 ms and the camera's move happened under a board. It
  is 3000 ms and a clear picture now, with a brand card before it when a brand is set. Six beats, six
  sliders in one block, and a derived total. **The event-title clearance is NOT in this ship** — it
  was specified, then dropped on the owner's instruction because he accepts the board as it looks
  today, and it was never committed.

### SHIP-THE-STANDINGS — the live standings stop costing the browser a layout (2026-08-10)

Four branches, one merge commit, 29 files, and **nothing that moves the race or the picture**: all
four fingerprints were re-measured and are unchanged. That is the acceptance rather than a footnote —
the standings are DOM, not canvas, so a moved RENDER hash would have meant something had reached the
drawing. Values live in [fingerprints.json](fingerprints.json).

  to restore the 250 ms hard-coded standings tick, the rows in normal flow with the place badge on
  each racer's row, the racer icon repeated on every row, and the panel running off the bottom of the
  window at a hundred racers.
- `v-ship-the-standings` (`942af34d`, 2026-08-10) — **the ship.** Fourteen layouts per hundred frames
  become one — fourteen being exactly one per cadence tick — and a MutationObserver over 25 s of a
  100-racer race recorded 728–833 mutations of which every one was `scoreboard-card:style`: an
  overtake is a transform and nothing else. Also the owner's three pixel changes (the `#` dropped, the
  scrollbar overlaid, the icon moved into the header), which take the name box from 113.67 px to
  137.67 and a representative name from 13 characters to 18. See
  [../reports/evolution/SCOREBOARD-SLOT-LAYER.md](../reports/evolution/SCOREBOARD-SLOT-LAYER.md).
  **His eye is owed on all of it**, and on a production build — which is the other thing this ship
  changed: [VERIFY-RULES.md](VERIFY-RULES.md) R10 now says an eye test or a perf log is taken on one.

### STRIP-AND-SHIP — the layout separation, the dead clock, and the generated counts (2026-08-10)

Three blocks, one merge commit, and **nothing that moves the picture or the race**: all four
fingerprints were re-measured on the branch and are unchanged, which is how a strand with no business
touching either proves it did not. Values live in [fingerprints.json](fingerprints.json). The strand's
one behaviour question — waking the dead `postStartHoldMs` floor — was deliberately NOT taken; it is
a rebaseline and it is the owner's, and the report measures what it would cost.

- `pre/strip-and-ship` (`f69f66fb`, 2026-08-10) — master immediately BEFORE the strand. Reset here to
  restore `renderRaceFrame` reading the backing store for layout, the planner's dead
  `postStartHoldMs` floor, and the typed counts in the ship ceremony.

### SHIP-THE-NIGHT — the pair loop culls, and the decisive phase starts later (2026-08-10)

Eight branches, one merge commit. **WORLD unchanged through two engine changes** — the pair-loop
deduplication and the two-axis cull — on all ten per-track values, separately and merged, which is
the correctness proof for a cull rather than a side note. **CAMERA and RENDER moved** with
`outcomePhaseThreshold` 0.65 → 0.75. Values live in [fingerprints.json](fingerprints.json).

- **KEPT, NOT DERIVABLE (TAG-SWEEP-1):** `v-ship-the-night` points at a commit with ONE parent — the
  ship has no merge commit, so there is no first parent to derive a return point from.
- `pre/ship-the-night` (`24d1ed2c`, 2026-08-10) — master immediately BEFORE the ship. Reset here to
  restore the 0.65 decisive phase and the unculled pair loop.
- `v-ship-the-night` (`a4cb669a`, 2026-08-10) — **the ship.** The race costs about 20 % less to
  compute (fixed-work measurement: the world fingerprint's own ten-track run, 128.3 s against
  160.4 s), and the camera treats the last quarter of the leader's run as decisive instead of the
  last third. See [../reports/night/PAIR-PREFILTER-1.md](../reports/night/PAIR-PREFILTER-1.md) and
  [../reports/night/OUTCOME-PHASE-75.md](../reports/night/OUTCOME-PHASE-75.md).
  **The owner's eye is still owed on the 0.75 change** — he chose the value, but has not yet seen it
  run; `pre/ship-the-night` is the one-command way back if he does not like it.

### SHIP-ROUTING — the maintenance strand, and the router it replaced (2026-08-09)

Documentation and tooling only: nothing under `client/` moved, and **all four fingerprints were
re-run and are unchanged** — which is how a strand that has no business touching the race or the
picture proves it did not. Values live in [fingerprints.json](fingerprints.json).

  restore the pre-declaration verifier.
- `v-ship-routing` (`d14e063d`, 2026-08-09) — **the ship: CEREMONY-HOLD-CENTRE-1's reports landed,
  CORRIDOR-OVERLAY-1 archived, and verify's routing moved from a hand-maintained table to the
  guards' own declarations.** 25 files, six routing misses closed. See
  [../reports/night/VERIFY-ROUTING-2.md](../reports/night/VERIFY-ROUTING-2.md).
- `archive/verify-routing-1` (`d47daa8f`, 2026-08-09) — **the FIRST declaration-based router,
  superseded.** Its design shipped in VERIFY-ROUTING-2; its diff did not, because it was written
  against a `verify.mjs` that VERIFY-COST-3 and VERIFY-BASE-1 rewrote afterwards, so merging it
  would have meant resolving three versions of one file against each other. This tag preserves that
  implementation — its `routing.mjs`, its `routing.test.mjs` and its own `verify.mjs`. **Its report
  IS on master** (landed at this ship); only the code is here. Branch deleted at origin.

### SHIP-CONFIG — a stored config holds what he CHOSE (2026-08-09)

Two blocks, one strand, one merge. Every config store used to write the WHOLE resolved object, so one
slider move froze several hundred keys and a default that changed afterwards could never reach him.
Now only what differs from the default is stored, and a one-time prune reaches the config already in
his browser. **All four fingerprints were re-run on the merged master and none moved** — and the
record says plainly that they could not have seen this change anyway, because the harnesses never
call a loader. Values live in [fingerprints.json](fingerprints.json).

  restore the save-everything storage behaviour. Its world is the same world the ship has, so
  returning changes what is STORED, never who wins.
- `v-ship-config` (`fff64bc9`, 2026-08-09) — **the ship: CONFIG-DIFF-1 + CONFIG-DIFF-2 merged to
  master.** 17 files. See [../reports/evolution/SHIP-CONFIG.md](../reports/evolution/SHIP-CONFIG.md).

### SHIP-THREE — the owner's 5, and two guards (2026-08-09)

Three blocks, two strands, one merge. The owner's `minRacersVisible` verdict shipped alongside the
maintenance work that makes the verifier refuse an empty plan and a new guard that a fallback agrees
with the default it mirrors. **The race did not change again**: WORLD has now held its value for
twenty-eight blocks and two ships, while CAMERA and RENDER moved for the framing change alone —
the maintenance strand was shown not to touch the picture by re-running both on the combined branch
rather than carrying the values over. Values live in [fingerprints.json](fingerprints.json).

  restore the pre-ship picture and the pre-refusal verifier. Its world is the same world the ship
  has, so returning changes what is drawn and how verify behaves, never who wins.
- `v-ship-three` (`f1c3d18d`, 2026-08-09) — **the ship: MIN-RACERS-5 + VERIFY-BASE-1 +
  FALLBACK-GUARD-1 merged to master.** 16 files. See
  [../reports/evolution/SHIP-THREE.md](../reports/evolution/SHIP-THREE.md).

### SHIP-THE-LINE — the picture line ships (2026-08-09)

The theme line that ran from the start ceremony through the labels, the start board and the perf
benches, merged to master as ONE commit. **The race did not change and the picture did**: the WORLD
fingerprint is the same value it has held for twenty-five blocks, while CAMERA and RENDER were both
re-minted — which is the correct signature for a line whose whole subject was what the viewer sees.
Values live in [fingerprints.json](fingerprints.json), not here.

  point: reset here to restore the pre-ship picture. Its world is the same world the ship has, so
  returning here changes what is drawn, never who wins.
- `v-ship-the-line` (`c5099b3a`, 2026-08-09) — **the ship: the theme line merged to master.** Race
  numbers, the label occlusion rule with its two exemptions, the start board through eight blocks,
  the ceremony timings and the countdown repair, the frame-input seam, the verify/hook cost work, the
  camera-doc corrections, the three perf benches and the `isSideFree` neighbour cull. 254 files. See
  [../reports/evolution/SHIP-THE-LINE.md](../reports/evolution/SHIP-THE-LINE.md).

### COMBO15 ship + the action/fair-arrival line (2026-07-29)

COMBO15 (chaos steer + band-aware re-roll bias + 0.15 chaos window) was the shipped world **at this ship**; it
has since advanced through two avoidance engine changes to the current world `dc4647be0f55ebdb` (see the
_Engine changes since COMBO15_ subsection below). The ship
anchors are permanent; the four experiment branches that fed the multi-week action/fair-arrival hunt were
archived as permanent `archive/*` tags and their remote branches deleted (branch hygiene, owner-approved).

- `v-ship-combo15` (`175a475`) — **the ship: COMBO15 as the default world merged to master.** New shipped
  fingerprint `ded0a126048e4cdb` (replaces the pre-combo15 anchor `7c70b1eae7d31e22`; OFF invariant
  `f8f7d9c2fd3283e9` unchanged). See [../reports/evolution/MERGE-SHIP-1.md](../reports/evolution/MERGE-SHIP-1.md)
  and [FAIRNESS.md](FAIRNESS.md).

### Reversal points for a rewritten master (do NOT delete)

- `archive/master-9d025aa9-accidental-chain-merge` (`9d025aa9`, 2026-08-08) — master as it briefly
  stood after `feat/verify-cost-2` was merged into it. That branch was cut from
  `feat/start-board-1`, not from master, so the merge carried **50 files** of unapproved ceremony
  work — the camera hold, the runners' board, the race numbers — onto master with no eye test and
  no ship ceremony. Master was reset to `434501af` and force-pushed under the owner's explicit
  one-time authorisation; **this tag is what makes that reset reversible, and it is the only place
  that state exists.** The tooling the merge was supposed to carry was re-landed from
  `feat/verify-cost-2-tooling`, which was cut from master. The lesson is in
  [SHIP-CEREMONY.md](SHIP-CEREMONY.md): a branch's content is what it changes relative to MASTER,
  not relative to the branch it was cut from.

### The label line — archived when the race-number design replaced it (2026-08-07)

Four branches built to solve "names ON racers". The owner chose the race-number design, which removes
that problem, so all four were archived as tags and their branches deleted (CLEANUP-BEFORE-NUMBERS-1).
**Their reports are on master as history**; these tags preserve the CODE, which is not.

- `archive/label-stagger-1` (`7368f58d`, 2026-08-07) — the stagger placement that measurably creates
  as many overlaps as it removes, plus the exact overlap trigger, which was dropped for having no job
  left once labels are 2-3 characters.
- `archive/label-shrink-1` (`7a2f1750`, 2026-08-07) — the shrink rule: cleared every overlap at every
  field size and was rejected by the owner at the picture. Its label-box unification IS on master.
- `archive/start-sequence-1` (`d84c7205`, 2026-08-07) — the roll call in waves. Its countdown finding
  IS on master; the wave partition and wave clock are here only.
- `archive/roll-call-pairing-1` (`8cc12197`, 2026-08-07) — leader lines and wave dimming. **The most
  likely to be plundered again:** pairing a label to its racer is the same problem a race number has.

- `pre/start-formation` (`b62ffc0b`, 2026-08-07) — the return point: master state right BEFORE the start
  formation shipped, i.e. the last build in which a racer sprite could be drawn ON TOP of a name tag.
  Restores render fingerprint `1f83ecc1fcb6fa9a`; the world and camera fingerprints are the same on
  both sides of the ship, because the change is presentation-only.
  See [../reports/night/START-FORMATION-1.md](../reports/night/START-FORMATION-1.md).
- **KEPT, NOT DERIVABLE (TAG-SWEEP-1):** this tag is on the FEATURE branch, not master — it is an
  ancestor of `v-ship-combo15^2` rather than `^1`, and it is the same commit as
  `archive/fair-arrival-merged`. The derivation would return `a12b6ab7`, three days older.
- `pre/ship-combo15` (`215afde`) — the return point: master state right BEFORE COMBO15 shipped.
- `pre/clean-sweep` (`dad4077`) — the return point before CLEAN-SWEEP-1 (dead-arm removal + local audit) and
  the DOC-SYNC-1 doc pass that followed. Master state at the end of DOCS-1.
- `archive/fair-arrival-merged` (`215afde`) — the `exp/fair-arrival` line (its work is on master via the
  merge `175a475`; this anchors the pre-ship state). Reports on master: `FAIR-ARRIVAL-*`, `CHAOS-STEER-1`,
  `PULK-SPECTACLE-1`, `EYE-SETUP-{1,2}`, `STEER-CAP-1`, `FAIR-ARRIVAL-GATE`, `MERGE-SHIP-1`.
- `archive/chain-choreo-final` (`15c1d58`) — the entire `exp/chain-choreo` history (the admission-only
  action family: ACTION-BUILD-1..7 + ACTION-NIGHT-1 + CHAIN-SIM/INT/ABLATE + DRAMA + FRONT-AUTOPSY). Reports
  copied to master in DOCS-1 STAGE 1. DEAD (section G, [DEAD-ENDS.md](DEAD-ENDS.md)).
- `archive/free-band-final` (`aa21576`) — the entire `exp/free-band` history (the band-corridor family:
  ACTION-FREEBAND-1/2, the cliff). Reports copied to master. DEAD.
- `archive/choreo-release-final` (`109abd6`) — the entire `exp/choreo-release` history (per-racer conditional
  release: arrival-safe but decided-finale-flat; CHOREO-RELEASE-1/2). Reports copied to master. DEAD.

### Engine changes since COMBO15 — RACER-FLAPPING-2 + RACER-MOTION-2 (2026-07-31)

Two `pre/*` return points captured before the two avoidance engine changes that followed COMBO15. Each restores
a distinct shipped world by fingerprint; registered here in DOC-SYNC-2 (they were live at origin but had no
entry). Full fingerprint lineage: [SIM.md](SIM.md); reports:
[../reports/evolution/INDEX.md](../reports/evolution/INDEX.md) (RACER-FLAPPING-2, RACER-MOTION-2, HOLM-300-COMBINED).

- `pre/flapping` (`d0870326`, 2026-07-31) — the pre-RACER-FLAPPING-2 state: restores plain **COMBO15**
  (`ded0a126048e4cdb`), before the avoidance margin hysteresis (`softSteeringObstacleMargin` 0.5).
  RACER-FLAPPING-2 shipped `62400c8e88cdbe59`.
- `pre/motion` (`e99b034d`, 2026-07-31) — the pre-RACER-MOTION-2 state: restores **COMBO15 + margin hysteresis**
  (`62400c8e88cdbe59`), before the lateral acceleration cap (`maxLateralAccelPerStep` 0.0005). RACER-MOTION-2
  shipped the current world `dc4647be0f55ebdb`.

### Camera detour fix — CAMERA-GLIDE-TARGET-1 (2026-08-01)

Return point captured before the first CAMERA-DETOUR fix (cause D: the glide endpoint was computed at the live,
still-easing zoom instead of the destination zoom). Presentation-only — the world fingerprint is unchanged
(`dc4647be0f55ebdb`); cause C (the containment clamp) is deliberately left for the next block.

- `pre/glide-target` (`2e20e1f3`, 2026-08-01) — the pre-fix state: the two CAMERA-DETOUR diagnosis reports +
  the gated frame log, before `_setClosedTrackTargets`/`_setOpenTrackTargets` were changed to resolve the pan
  endpoint at the destination zoom. Restores the shipped world `dc4647be0f55ebdb` (the fix moves no fingerprint).
- `pre/overview-framing` (`e1c6f90b`, 2026-08-01) — the pre-change state before OVERVIEW-FRAMING-1 (the owner's
  framing rule: OVERVIEW frames the leader + N racers at a derived zoom with a sprite-size floor, centre behind
  the leader, leader always in-frame — replacing the fixed toward-shape-centre radial offset). Sits at the
  CAMERA-GLIDE-TARGET-1 (cause-D) commit; restores the shipped world `dc4647be0f55ebdb` (presentation only).

### Camera projection refactor — CAMERA-PROJECTION-1 (2026-08-01, branch `camera-refactor`)

Return point captured before the camera gained a single world↔screen projection and lost the ~28 open/closed
branches that existed only because closed computed world-relative and open computed fixed-absolute. The refactor
is behaviour-preserving by construction — proven by a frame-by-frame replay diff, not by a fingerprint (the
simulation is untouched and no simulation file is in the diff).

- `pre/projection` (`54cbe5d4`, 2026-08-01) — the pre-refactor state: the two CAMERA-REFACTOR measurement
  reports, before `projection.js` existed and while `_setClosedTrackTargets` / `_setOpenTrackTargets` /
  `_closedOffsetY` were still three separate functions. Camera-only; the shipped world `dc4647be0f55ebdb` is
  untouched on both sides of this tag.

### Camera zoom unit — CAMERA-ZOOM-UNIT-1 (2026-08-02, branch `camera-refactor`)

Return point captured before the camera's five separate zoom formulas — four states on an absolute
`spriteScale` screen-scale, OVERVIEW on a target SPRITE SIZE normalised by a start-grid packing quantity —
became ONE rule whose parameter is TRACK WIDTHS. The picture deliberately CHANGES here: the owner chose
clean round defaults over reproducing the old framing, so this tag is the only way back to the old picture.

- `pre/zoom-unit` (`2488124f`, 2026-08-02) — the pre-change state: `spriteScale` per state, OVERVIEW's
  `overviewTargetScreenPx / (2 x W_ref / racersPerRow)` derivation, and the retired `overviewClosedTrackZoom`
  / `overviewMinEffZoom` keys still present. Camera-only; the shipped world `dc4647be0f55ebdb` is untouched
  on both sides of this tag. Config schema v17 (v18 is the track-widths schema).

### Camera picture fixes — CAMERA-PICTURE-FIXES-1 (2026-08-02, branch `camera-refactor`)

Return point captured before two MEASURED defects that both move the picture were cleared, ahead of the
framing block so its effect is not judged through a known error: the forward-bias span formula
(`|cos|·W + |sin|·H`, 1.436x over the geometric extent at the owner's 74 deg heading) and the render-time
sprite floor (`Math.max(proportionalScreenPx, minTargetScreenPx)`, which the owner does not want).

- `pre/picture-fixes` (`854e2f87`, 2026-08-02) — the post-zoom-unit state: `leaderForwardFrac` 0.66
  displacing 23.0pp instead of 16.0pp on a diagonal heading, the sprite floor still binding, and
  `overviewOffsetPx` still present as a dead key. Camera/render only; the shipped world
  `dc4647be0f55ebdb` is untouched on both sides of this tag. Config schema v18.

### Camera framing — CAMERA-FRAMING-1 (2026-08-02, branch `camera-refactor`)

Return point captured before the second half of the owner's camera design: every state described by
ANCHOR (who the camera is on) + GUARANTEE (who must stay in frame) + the already-shipped track-widths
zoom, with frame position derived from one principle rather than being a fourth setting. The picture
CHANGES here, most of all in LEAD_CHANGE — which holds 37.6% of all frames and had never been designed
(it fell into `panTarget`'s default centroid branch and never received the forward bias).

- `pre/framing` (`74bf88b1`, 2026-08-02) — the pre-change state: LEAD_CHANGE undefined in `panTarget.js`,
  PHOTO_FINISH borrowing BATTLE's zoom, the min-visible floor and the containment clamp both STEERING,
  and the floor's single-effZoom per-axis defect still live. Camera-only; the shipped world
  `dc4647be0f55ebdb` is untouched on both sides. Config schema v19.

### Camera company guarantee — CAMERA-COMPANY-1 (2026-08-02, branch `camera-refactor`)

Return point captured before the min-racers floor came BACK, as a guarantee rather than a floor. It was
deleted in CAMERA-FRAMING-1 as "a guarantee phrased as a headcount"; the owner corrected that reading —
it was a DRAMATURGICAL guarantee ("do not show emptiness"), and its absence is visible in his
post-framing screenshot: the leader huge and alone, _"das ist nicht spannend"_ ("that is not
exciting"). The
concept was right,
the arithmetic was broken (one axis scale on both axes — the bsX/bsY family — competing with a zoom
number that meant something different on every track). Both are fixed, so the idea returns cleanly.

- `pre/company` (`5383750b`, 2026-08-02) — the state with corridor and pair guarantees only, where
  nothing catches a LEADER setting of 1 or below when the shot goes empty. Camera-only; the shipped
  world `dc4647be0f55ebdb` is untouched on both sides. Config schema v20.

### Camera company guarantee, made proportionate — CAMERA-COMPANY-2 (2026-08-02, branch `camera-refactor`)

Return point captured before the guarantee stopped being over-cautious. CAMERA-COMPANY-1 shipped it
correct in KIND and too strong in DEGREE: `innerFramePct` (0.7) and `reach` (0.66) multiplied, so a
companion was allowed only 46% of the frame chord, and the owner's 40-racer break-away widened to 2.32
track widths where he asked for 1.0. The owner's decision here: **visible with a margin is enough** —
a guaranteed companion does not have to sit inside the subject's safe region.

- `pre/company-2` (`cfd47cd5`, 2026-08-02) — the state where the company guarantee reads
  `innerFramePct` and applies ONE scalar `reach` in every direction, so it promises company inside the
  safe region and delivers one racer fewer. Camera-only; the shipped world `dc4647be0f55ebdb` is
  untouched on both sides. Config schema v20.

### Camera zoom unit becomes a standard corridor — CAMERA-REFERENCE-WIDTH-1 (2026-08-03, branch `camera-refactor`)

Return point captured before the zoom unit stopped dividing by each track's OWN corridor. Measurement
found the reason the owner could see: a racer's height on screen came out as 1.9 / (racers per row) on
all ten tracks, because the track width cancels on both sides — the camera divides by it and the
start-grid packing sizes the sprite from it. Searound is the extreme on both counts (narrowest
corridor, biggest animal) so its racer filled 31.7% of the frame against Mountainstreet's 9.5%. The
unit now divides by a Dev Screen reference width instead, applied as `max(reference, actual)`.

- `pre/reference-width` (`1abc9383`, 2026-08-03) — the last state where `trackWidths` means the
  track's own corridor, the zoom unit carries its own full-track-width clamp, and the setting's range
  starts at 1.0. Camera-only; the shipped world `dc4647be0f55ebdb` is untouched on both sides. Config
  schema v20 (this block ships v21, which discards a stored v20 camera config).

### Camera follows along the track, sits on the centreline across it — CAMERA-LATERAL-1 (2026-08-03, branch `camera-refactor`)

Return point captured before the anchor stopped carrying the subject's LANE. The reference-width block
tightened the shot (600 -> 225 world px on the 300 px tracks), which made an old defect visible rather
than causing it: a lead change between racers in different lanes threw the picture sideways by 62-84
world px, 28-37% of the shot. The camera now follows ALONG the track exactly as before and sits on the
corridor CENTRELINE across it, with a lateral guarantee that shifts only when a guaranteed subject
would otherwise leave the frame.

- `pre/lateral` (`3b06f78f`, 2026-08-03) — the state where the pan anchor carries the subject's lateral
  position on both axes. Camera-only; the shipped world `dc4647be0f55ebdb` is untouched on both sides.
  Config schema v21 on both sides.

### Config schema removed for good — CAMERA-NO-SCHEMA-1 (2026-08-03, branch `camera-refactor`)

Return point captured before the camera config's `schemaVersion` was deleted. The owner's standing
instruction, given four times: no schema, no version bumps, no migrations — he is the only person
testing, there is nothing to migrate from and nobody to migrate for. The versioning was actively
harmful: v20 and v21 each DISCARDED his stored camera config and he retyped it. Replaced by sane
loading — defaults underneath, stored values on top, unknown or retired keys ignored — which gives the
Lesson 193 protection with no versioning at all. `WORLD_SCHEMA_VERSION` in `raceConfigWorld.js` is a
different thing and STAYS: a browser<->sim handshake on the exported world, which must abort loudly
rather than be half-honoured, and which never touches his settings.

- `pre/no-schema` (`41d2ed38`, 2026-08-03) — the last state carrying `schemaVersion: 21`, its equality
  check in the loader and its save-time stamp. Camera-only; the shipped world `dc4647be0f55ebdb` is
  untouched on both sides.

### The readability floor returns — CAMERA-MIN-DRAW-1 (2026-08-03, branch `camera-refactor`)

Return point captured before the minimum drawn size came back. CAMERA-PICTURE-FIXES-1 removed the
render sprite floor on the reading that a racer's size should say how far in the camera is and nothing
else — right about the implementation, wrong about the purpose. The owner found the cost himself: the
Space Sprint START formation used to overlap slightly and no longer did, because the rockets had
shrunk 29% (32.0 -> 22.8 screen px). The floor returns as a FRACTION OF THE FRAME and drawing-only,
with a test pinning that it cannot reach the zoom. First block to run the new MINT TRIPWIRE: minted
`dc4647be0f55ebdb`, unchanged.

- `pre/min-draw` (`766a6f94`, 2026-08-03) — the state with no minimum drawn size at all, where a racer
  on the three widest tracks is drawn at 3.17% of frame height in OVERVIEW. Shipped world
  `dc4647be0f55ebdb` untouched on both sides.

### Name tags: the unit, and readability before count — CAMERA-TAGS-1 (2026-08-03, branch `camera-refactor`)

Return point captured before name tags stopped being "top N by race position". Three independent
designs converged on the same skeleton; the accepted reframe is that the owner's two goals are not in
tension — ten labels on a clump are unreadable AND cover more racers than one would, so decluttering
buys both. Stage 1 of three: the unit and label-vs-label occlusion. Stages 2 (priority from the
director's anchor + guarantee set) and 3 (multi-slot placement, sprite avoidance) are named in the
module header. Minted `dc4647be0f55ebdb`, unchanged.

- `pre/tags` (`77a7812d`, 2026-08-03) — the state where `tagVisibleMaxCount` selects the top 10 by
  race position with no decluttering at all, and the label size is `max(8, round(11/effZoom))`.
  Shipped world `dc4647be0f55ebdb` untouched on both sides.

### The camera deep clean, before the merge — CAMERA-HYGIENE-1 (2026-08-03, branch `camera-refactor`)

Return point captured before the hygiene pass the owner asked for BEFORE the merge, so master gets one
clean landing. Its acceptance test is the good kind: hygiene must not move the picture, and that is
PROVABLE — `scripts/camera-fingerprint.mjs` hashes every camera decision over ten seeded races, and
every commit in this block holds it bit-identical at `deddc4b483a0689b`.

- `pre/camera-hygiene` (`48069246`, 2026-08-03) — the pre-clean state: `QUICK_TEST_NAMES` duplicated
  in two files, four independent reference-canvas constants, a dead `_clampCentreToBounds`. Shipped
  world `dc4647be0f55ebdb` and camera fingerprint `deddc4b483a0689b` on both sides.

### The four weights made to work — CAMERA-WEIGHTS-1 (2026-08-04, branch `camera-refactor`)

Return point captured before the state-selection weights became an acceptance propensity. The HUD
audit found all four inert; the diagnosis was not a dead wire but a dead EFFECT — 73.2% of selections
had no candidate and 16.7% had exactly one, and a single candidate was returned without its weight
being read, so eligibility decided 90% of the state distribution. **This block deliberately MOVES the
camera fingerprint** — it is a change detector, not a prohibition. Camera `deddc4b483a0689b` ->
`4b33c4d31bec93ea`; the shipped world `dc4647be0f55ebdb` is untouched.

- `pre/weights` (`0c875e08`, 2026-08-04) — the state where a weight is a tie-break among coincidences,
  `overviewWeight` 0.3 -> 10 moves OVERVIEW's share by 1.8pp, and the endgame exception fires
  LEAD_CHANGE even with its weight at 0.

### The unattended night — CAMERA-HYGIENE-2 (2026-08-04, branch `camera-refactor`)

Return point captured before the deep clean that finished what CAMERA-HYGIENE-1 parked: four
extractions out of `CameraDirector.js` (2935 -> 2487), sixteen dead constants, twenty redundant
timing mirrors, and the HUD's "is the label true / is it needed" columns. **Camera fingerprint
`4b33c4d31bec93ea` held BIT-IDENTICAL at every one of the eight commits** — unlike CAMERA-WEIGHTS-1
before it, this block moves nothing. The mint tripwire fired twice (defaults.js and the Dev Screen
section left `camera/`); shipped world `dc4647be0f55ebdb` unmoved both times.

- `pre/camera-hygiene-2` (`be649aa9`, 2026-08-04) — the state where sixteen timing fallbacks are
  duplicated between `CameraDirector.js` and `cameraTimingComputation.js`, `clampActiveCount` is a
  getter returning a literal 0 with a test asserting it, and eighteen gate tests are coin flips
  because a weight became a propensity one commit earlier.

### The picture becomes a measurement — RENDER-FINGERPRINT-1 (2026-08-04, branch `camera-refactor`)

Return point captured before the render path got its own change detector. Every camera block until
now ended with "the picture did not move" as an ARGUMENT: the camera fingerprint covers what the
DIRECTOR decides and stops at the edge of the canvas, which is why the battle-focus darkening had to
be checked by eye. **New instrument `RENDER ae7e9243bd2add8b`** (`scripts/render-fingerprint.mjs`) —
it hashes the SEQUENCE of draw calls, not the pixels, so it needs no browser and holds on any
machine. Camera `4b33c4d31bec93ea` and world `dc4647be0f55ebdb` unmoved; mint tripwire fired and was
checked.

- `pre/render-fingerprint` (`9ae13a4e`, 2026-08-04) — the state where the draw sequence is ~210
  lines inside RaceScreen's rAF callback closed over 42 pieces of component state, so nothing but a
  browser can drive it; and `PHASE` is declared in three separate files.

### THE CAMERA REFACTOR LANDED — CAMERA-MERGE-1 (2026-08-04)

`camera-refactor` merged to master with full history at `87961ca6` (41 commits, ~20 blocks, four
days), then the branch deleted. Master's previous tip `e5f0afa6` was OVERVIEW-FRAMING-1, which the
owner rejected and CAMERA-FRAMING-1 superseded; it is an ancestor of the merge, so the record stays
while the code does not — verified, see the report.

- `archive/camera-refactor` (`202772c2`, 2026-08-04) — the branch tip, preserved permanently before
  the branch was deleted. **Do not delete.**

**The fifteen `pre/*` tags this branch produced STAY VALID and stay registered.** They are listed
individually above, block by block, and each still names a real return point in master's history now
that the branch is merged with its commits intact — a merge with history does not orphan them. They
are step-tags rather than permanent anchors, so they may be collapsed onto a phase endpoint later;
until somebody decides that, they are the cheapest way back into any single block of the refactor:
`pre/projection`, `pre/zoom-unit`, `pre/picture-fixes`, `pre/framing`, `pre/company`,
`pre/company-2`, `pre/reference-width`, `pre/lateral`, `pre/no-schema`, `pre/min-draw`, `pre/tags`,
`pre/camera-hygiene`, `pre/weights`, `pre/camera-hygiene-2`, `pre/render-fingerprint`.

### The framing measures from where things are — CAMERA-ANCHOR-TRUTH-1 (2026-08-04, branch `anchor-truth`)

Return point captured before the first post-merge camera block. Three defects measured during the
refactor and never repaired turned out to share one root: **the framing computes from an idealised
point at the centre of the frame instead of from where things actually are** — `corridorGuarantee`
divides by the chord THROUGH THE CENTRE while `companyGuarantee` and the lateral guarantee already
measure from the anchor's real screen position. The block is staged so the proof is the order:
Stage 1 (behaviour-free — the transition decision becomes a testable return value, and the documents
that describe an INTENT stop being read as a STATE) must hold **both** fingerprints bit-identical,
so any later movement is attributable to a named Stage 2 commit.

- `pre/anchor-truth` (`c299fdf7`, 2026-08-04) — master's tip after CI-AUDIT-GREEN-1, verified before
  branching. Baselines recorded on the untouched tree and both matched: camera
  `4b33c4d31bec93ea`, render `ae7e9243bd2add8b`, world `dc4647be0f55ebdb`.

### THE ROAD STOPS BOUNDING THE LEADER SHOT — CAMERA-COMPANY-ONLY-3 (2026-08-05)

`anchor-truth` merged to master WITH FULL HISTORY at `bf74d6ec` (sixteen commits, four blocks:
CAMERA-ANCHOR-TRUTH-1, BUILD-TRUTH-1, NIGHT-1, CAMERA-COMPANY-ONLY-3). Never squashed — several
commits in the line CORRECT earlier ones, and that record is how this project reasons about itself.

**OWNER-APPROVED** on `exp/company-only` @ `d2ecc27c`, mountainstreet seed 5601, toggle ON,
_"nein das passt"_ — having seen BOTH regimes, a torn-apart field where the company guarantee opens
the shot wide and a tight pack where the camera holds his 1.0. His approval also covers the
anchor-truth work, which had had no eye test until then.

**FINGERPRINTS**: camera `1db71e7fffc1c9f6` → **`7a33faf2ec131437`** — exactly the probe value minted
with his toggle ON, which is the cross-check that nothing else moved with the fold; render
`ae7e9243bd2add8b` → **`73ba53ba9fea12c7`**; world **`dc4647be0f55ebdb` UNMOVED** — no engine was
touched anywhere in this work. CI green at origin before the merge: run `30997930991` at `bfe51bc7`.

- `v-company-only-complete` (`bf74d6ec`, 2026-08-05) — the phase endpoint: the merge commit itself.
  **Permanent.**
- `archive/company-only` (`5c8dea3c`, 2026-08-05) — the entire `exp/company-only` probe branch,
  preserved before the branch is retired. It holds the switch as it existed while he judged it, which
  is the state his PASS refers to. **Do not delete** — deleting the record of a decision is how a
  project forgets why.
- `pre/anchor-truth` (`c299fdf7`) stays valid and stays registered above; a merge with history does
  not orphan it.

### THE END OF A RACE BECOMES SAYABLE — FINISH-SEAM-1 (2026-08-05)

The finish sequence existed only as six latches and three if-chains split across `update()` and
`_pickNextState()`. Two earlier blocks named this seam as the precondition for extracting the state
selection and stopped at it. `finishPhase.js` now states the whole ending — approach, the moment,
the aftermath — with every transition carrying a machine-readable reason. Behaviour-free: all three
fingerprints bit-identical at the one source commit.

- `pre/finish-seam` (`b363bd94`, 2026-08-05) — master's tip before the branch, baselines measured on
  the untouched tree: camera `7a33faf2ec131437`, render `73ba53ba9fea12c7`, world
  `dc4647be0f55ebdb`.

## Active-phase tags (temporary scaffolding — to collapse later)

Step-tags from the runaway phase (now CLOSED 2026-07-29, see below) and any later work — safe return points, not permanent anchors. They collapse into
that phase's `*-complete` endpoint when it closes (incremental history then lives in commits + docs).

### Evolution — greenfield experiments (new regime: branch, drop-not-revert)

- **handicap-pursuit experiment recoverable @`089c7d2` (branch retired 2026-07-26).** First greenfield
  experiment (`exp/handicap-pursuit`, off master): a standalone sim-only prototype of the handicap-pursuit
  concept. PROTO-1 (longitudinal) PASSED, PROTO-2 (lateral traffic) KILLED, and the world clarification
  (identical racers) made the whole ability-handicap premise moot (see LESSONS.md #183). Per the experiment
  regime the branch was DROPPED (not reverted); its two reports live on master
  (`reports/evolution/PURSUIT-PROTO-{1,2}.md`) and the full branch tip is preserved at the lightweight tag
  **`archive/handicap-pursuit-089c7d2`** (→ `089c7d2`). The sim code (`scripts/exp/pursuit-sim*.mjs`) is an
  experiment artifact and lives only at that archived SHA; the reusable overlap-free traffic core is
  documented in LESSONS #183 for the peloton line.

Declared (TAG-GUARD-3 backfill):

- `archive/handicap-pursuit-089c7d2` (`089c7d2`) — the entire `exp/handicap-pursuit` branch history, preserved before deletion.

### Evolution Act 2 — finale front-compression (CLOSED 2026-07-26)

- **Act 2 finale builds recoverable @`8d5e9fd`/@`7404bd9`/@`197763d`, reverted** (three `git revert`
  commits, newest first). The flag-gated finale front-compression arc — a scheduled-dice overlay on the
  gap-cap re-roll (fixed gates `8d5e9fd`, DevScreen toggle `7404bd9`, adaptive spread-scaled gates
  `197763d`) — was verified byte-identical (ON `7c70b1eae7d31e22` / OFF `f8f7d9c2fd3283e9`) but its decisive
  adaptive SCREEN failed the "one track-agnostic law lifts BOTH topologies" bar (root cause structural
  physics; see `reports/evolution/FINALE-ADAPTIVE-SCREEN.md`). Owner closed Act 2; all three builds reverted
  for source hygiene, the five `reports/evolution/FINALE-*.md`+`AFF-*.md` kept as the lab journal.
  Scaffolding tags: `pre/finale-compression`, `pre/finale-devscreen`, `pre/finale-adaptive`,
  `pre/finale-remove`. The living code reads as if Act 2 was never built; the builds are recoverable at the
  three SHAs above. Permanent close anchor on origin: **`backup/finale-closed-26b2c34`** (→ `26b2c34`).

Declared, so both directions of `check-tags` can see them (TAG-GUARD-3 backfill):

- `pre/finale-compression` (`37971d6`) — before the fixed dice overlay on the gap-cap re-roll.
- `pre/finale-devscreen` (`8d5e9fd`) — before the DevScreen toggle build.
- `pre/finale-adaptive` (`98e9e5f`) — before the adaptive spread-scaled gates, the decisive screen.
- `pre/finale-remove` (`197763d`) — before the three reverts that closed Act 2.
- `backup/finale-closed-26b2c34` (`26b2c34`) — the permanent close anchor for Act 2.

### Evolution Act 1 — assignment-follows-field (CLOSED 2026-07-26)

- **AFF build recoverable @`cd520e0`, reverted** (`git revert cd520e0`). The flag-gated
  assignment-follows-field build (Act 1) was verified byte-identical (ON `7c70b1eae7d31e22` / OFF
  `f8f7d9c2fd3283e9`) but SCREENed NEGATIVE (pooled band-reach 71.1%→66.8%, below the 70% floor —
  verified force-removal diagnosis). Owner closed Act 1; the build was reverted for source hygiene, the
  three `reports/evolution/AFF-*.md` kept as the lab journal. Scaffolding tags: `pre/aff-build`
  (`86e0d6d`) and `pre/aff-remove` (`0fed3ee`). The living code reads as if AFF was never built; the full
  build is recoverable at `cd520e0`. Permanent close anchor on origin: **`backup/aff-closed-fc6afbf`** (→ `fc6afbf`).

Declared, so both directions of `check-tags` can see them (TAG-GUARD-3 backfill):

- `pre/aff-build` (`86e0d6d`) — before the assignment-follows-field build.
- `pre/aff-remove` (`0fed3ee`) — before the revert that closed Act 1.
- `backup/aff-closed-fc6afbf` (`fc6afbf`) — the permanent close anchor for Act 1.

### Runaway phase — CLOSED (2026-07-29)

**Status: CLOSED.** The runaway problem was SOLVED by the **gap-reroll cohesion mechanism** (shipped default
`gapRerollEnabled` ON, G=0.5 / strength=1.0, 2026-07-26): the N=200 × 10-track confirm cut runaway-winner
**23% → 8.3%** and generalized cleanly. The two flagged follow-ups were resolved WITHOUT new mechanisms: the
**Distance Leash** was built sim-only and REJECTED (it made runaway WORSE — a braked leader dumps into the
pack and promotes a fresh escapee; see the leash result reports), and the **Late Challenger** was never needed
once gap-reroll shipped. COMBO15's v2 duration-relative PULK watchdog (`chaosGap ≤ ship×1.5`, [FAIRNESS.md](FAIRNESS.md))
now stands as the permanent guard against a disproportionate early breakaway. Baseline + fix reports:
`reports/` runaway/parade baseline (`f40a7a6`) + the gap-reroll confirm; baseline state recoverable at
`2e14663`. Endpoint anchor: `backup/exp-runaway-baseline-complete` (`f40a7a6`) — retained as the phase's
permanent close anchor.

### Parity phase — COLLAPSED (2026-07-25)

The sim↔browser parity phase is complete; its 13 `pre/*`+`backup/*` step-tags are collapsed onto the single
anchor **`v-parity-complete`** and deleted (local + origin). **Phase summary:** the four step-order
divergences (**D-INIT / D-RUNOUT / D-NAME / D-ROWCOUNT**) were closed with the sim adopting the browser's
real `raceCore.stepRacePhysics`; the golden soak proved `realArm == simArm` **600/600 byte-identical**; the
owner's three-seed browser cross-check passed **word-for-word**; the owner picked **150 px/s** and the single
re-baseline landed (pooled band-reach **71.0%**, resolving BASELINE-INVALIDATED →
[reports/parity/REBASELINE.md](../reports/parity/REBASELINE.md)); and the gap-reroll knobs were flipped to
the confirmed candidate **G=0.5 / strength=1.0** after the ten-track confirm gate
([reports/parity/GS-CONFIRM-GATE.md](../reports/parity/GS-CONFIRM-GATE.md)). End-state shipped-default
fingerprints: **ON `7c70b1eae7d31e22` / OFF `f8f7d9c2fd3283e9`**. Full narrative lives in the linked
`reports/parity/*.md` docs (DIVERGENCE-AUDIT, GOLDEN-SOAK, STEP-ORDER-ARC, REBASELINE, GS-CONFIRM-GATE), the
commit messages, and this file's git history (where the per-tag prose is preserved).

**Collapse record — every tag deleted here, name → SHA (the commits stay findable forever; this table is the
index).**

| Deleted tag                            | SHA       |
| -------------------------------------- | --------- |
| `pre/rng-isolation`                    | `285c6e5` |
| `pre/plan-grid-unification`            | `fe8565e` |
| `pre/race-init-extraction`             | `72b8605` |
| `pre/step-order-alignment`             | `0bd146f` |
| `pre/speed-duration-model`             | `34584f7` |
| `pre/speed-150-rebaseline`             | `bde0bc0` |
| `pre/gs-flip`                          | `6d246d0` |
| `backup/rng-isolation-64e0f65`         | `64e0f65` |
| `backup/plan-grid-unification-05a5d14` | `05a5d14` |
| `backup/parity-arc-48f92d9`            | `48f92d9` |
| `backup/speed-150-rebaseline-4b707cb`  | `4b707cb` |
| `backup/gs-confirm-evidence-1865990`   | `1865990` |
| `backup/gs-flip-6f438ea`               | `6f438ea` |

13 tags deleted (local + origin), collapsed onto **`v-parity-complete`** — the annotated parity phase
endpoint anchor on the phase-close commit (150 px/s, gap-reroll G=0.5/s=1.0, fingerprints
ON `7c70b1eae7d31e22` / OFF `f8f7d9c2fd3283e9`).

### Retune / cleanup / greenfield phase — COLLAPSED (2026-07-23)

The four ship-steps of this phase — the **G/strength retune** (`247b843`), the **dead-mechanisms
cleanup** (`08b09b7`), the **DevScreen reorg** (`e529411`), and the **greenfield wrap** (`79ac945`) —
were each captured with a `pre/*` and a `backup/*` step-tag as they landed. At phase close all of those
were **collapsed onto `v-retune-cleanup-complete` (`e0f6950`)** and deleted, along with a batch of older
loose `pre/*` scaffolding from the runaway/gap-reroll/carousel investigations that had never been
collapsed. Both fingerprints are unchanged across the whole arc (ON `e93ffa70dad562a1`,
OFF `72c3360fb75225ef`) and every ship was owner eye-approved. The removed mechanism code is separately
recoverable at `git show pre/dead-mechanisms-cleanup`'s SHA (see table) and the greenfield prototype at
`archive/greenfield-proto-final`.

**Collapse record — every tag deleted here, name → SHA (the insurance: the commits stay findable
forever, this file is the index).**

| Deleted tag                              | SHA       |
| ---------------------------------------- | --------- |
| `pre/browser-seed`                       | `ffbd214` |
| `pre/browser-seed-ux`                    | `7830bb2` |
| `pre/carousel-build`                     | `9c5af2f` |
| `pre/carousel-sweep-base`                | `45516fc` |
| `pre/dead-mechanisms-cleanup`            | `0555f9d` |
| `pre/devscreen-reorg`                    | `a7c662e` |
| `pre/exp-runaway-baseline`               | `2e14663` |
| `pre/g-retune-ship`                      | `7d0db3e` |
| `pre/gapreroll-browser`                  | `3464295` |
| `pre/gapreroll-confirm`                  | `2e5f121` |
| `pre/gapreroll-default-on`               | `45e774b` |
| `pre/gapreroll-smallG-diag`              | `ddb847d` |
| `pre/gapreroll-windowfix`                | `5163215` |
| `pre/greenfield-wrap`                    | `aa1f128` |
| `pre/leash-phase1`                       | `fa76916` |
| `pre/p1-contest-baseline`                | `4196367` |
| `pre/release-sweep`                      | `869615b` |
| `pre/runaway-concept`                    | `8b98f0a` |
| `pre/runaway-formation-diag`             | `cff7474` |
| `pre/runaway-gapreroll`                  | `adc54c7` |
| `pre/runaway-speed-source`               | `b4a1327` |
| `backup/gapreroll-shipped-1594f39`       | `1594f39` |
| `backup/g-retune-shipped-247b843`        | `247b843` |
| `backup/dead-mechanisms-cleanup-08b09b7` | `08b09b7` |
| `backup/devscreen-reorg-e529411`         | `e529411` |
| `backup/greenfield-wrap-79ac945`         | `79ac945` |

26 tags deleted (local + origin). The two analysis branches `pre/greenfield-proto` and
`pre/carousel-sweep` were deleted in the same close, their history preserved as
`archive/greenfield-proto-final` and `archive/carousel-sweep-final` (see Permanent anchors + Branches).

### Cleanup arc — COLLAPSED (2026-07-20)

The four `pre/cleanup-step1..4` scaffolding tags were **collapsed onto `v-cleanup-complete`** and deleted
(local + origin) at the end of cleanup step 5. Permanent recovery is by commit hash, which never expires:
the step-2 deletions are recoverable at `c441e7c~1`, the step-4 deletions at `0bb639d~1`.

## Branches

**`master` only.** The two greenfield analysis branches were deleted at the retune/cleanup phase close
(2026-07-23), each preserved first as a permanent `archive/*` tag so nothing was lost:

- `pre/greenfield-proto` → `archive/greenfield-proto-final` (`2663f7b`). Its keepers (escape-episodes +
  physics-tax observers, `exp-gate-retune.mjs`, the evidence record) had already been ported to master;
  the composer prototype was deliberately left behind and now lives only on the archive tag.
- `pre/carousel-sweep` → `archive/carousel-sweep-final` (`2e6b597`). Its "suppression, not selection"
  verdict is captured in LESSONS/SIM; the mechanism it studied is already gone from master.

Neither was ever a merge candidate — both carried prototypes that must not reach master, so porting was
by explicit keep-list, never by merge. Earlier, `diag/look-before-brake` was archived the same way (tag
`archive/diag-look-before-brake` @ `c32cc61`, deleted 2026-07-20).

**2026-07-29 — the four action/fair-arrival experiment branches were deleted after the COMBO15 ship**, each
preserved first as a permanent `archive/*` tag (owner-approved branch hygiene, per the handicap-pursuit
precedent). `exp/fair-arrival` was MERGED to master (its work ships as COMBO15); the other three are DEAD
lines whose reports were copied to master in DOCS-1 STAGE 1:

- `exp/fair-arrival` → `archive/fair-arrival-merged` (`215afde`) — merged via `175a475`.
- `exp/chain-choreo` → `archive/chain-choreo-final` (`15c1d58`).
- `exp/free-band` → `archive/free-band-final` (`aa21576`).
- `exp/choreo-release` → `archive/choreo-release-final` (`109abd6`).

No non-master branches remain.

## Complete tag set (after the parity phase close, 2026-07-25)

This was the FULL tag set **at the 2026-07-25 parity-phase close — 25 tags**. It is a dated snapshot;
the current origin set is **41 tags** (the 16 additions since are listed in the addendum below). The 13
parity `pre/*`+`backup/*` step-tags were collapsed onto **`v-parity-complete`** and deleted (see the _Parity
phase — COLLAPSED_ record above); everything else is a permanent keeper:

- `archive/carousel-sweep-final`
- `archive/diag-look-before-brake`
- `archive/greenfield-proto-final`
- `b4-complete`
- `backup/browser-seed-complete` (`869615b`)
- `backup/exp-runaway-baseline-complete` (`f40a7a6`) _(runaway phase CLOSED 2026-07-29 — permanent close anchor; the gap-reroll shipped the fix)_
- `backup/lbb-gate-complete`
- `race-action-complete`
- `stable/pre-governor-04jul` _(permanent anchor — NEVER delete)_
- `stable/pre-overlap-closed-20jun` _(permanent anchor — NEVER delete)_
- `v-b2-heroes-complete`
- `v-branding-phase1-complete`
- `v-camera-perf-complete`
- `v-clean-state-complete`
- `v-cleanup-complete`
- `v-datadir-complete`
- `v-outcome-0.6-complete`
- `v-parity-complete` _(new — sim↔browser parity phase endpoint; 150 px/s, gap-reroll G=0.5/s=1.0, fingerprints ON `7c70b1eae7d31e22` / OFF `f8f7d9c2fd3283e9`)_
- `v-perf-complete`
- `v-phaseD-complete`
- `v-retune-cleanup-complete`
- `v-rowenv-default-on-complete`
- `v-rowenv-easing-complete`
- `v-security-hardening-complete`
- `v1-race-action-merged`

### Additions since 2026-07-25 (current origin total: 45 tags)

Reconciled against `git ls-remote --tags origin` on 2026-07-31 (DOC-SYNC-2); the 2026-07-29 (DOC-SYNC-1) count
was 41. The 4 tags added since DOC-SYNC-1:

- **Engine changes since COMBO15 (2026-07-31):** `pre/flapping` (`d0870326`) and `pre/motion` (`e99b034d`) —
  registered above in the _Engine changes since COMBO15_ subsection.
- **HYGIENE-1-era return points (registered SHIP-GUARD-1, 2026-07-31):** `pre/hygiene` (`a4103bb4`,
  2026-07-29) — sits at the DOC-SYNC-1 report commit (`docs(evolution): DOC-SYNC-1 report — living docs synced
to COMBO15`); a docs-only return point, restores the COMBO15 world unchanged (no fingerprint move).
  `pre/router-7` (`83f5c8d9`, 2026-07-29) — sits at the HYGIENE-1 STEP 4 commit (`chore(hygiene): local audit
tool + --purge-tmp + scratch off the OneDrive tree`); a tooling/hygiene return point from the HYGIENE-1 arc
  (react-router 6→7, audit tooling), restores the COMBO15 world unchanged (no fingerprint move).

The 16 tags added after the parity-phase snapshot above (to DOC-SYNC-1):

- **COMBO15 ship + fair-arrival line (2026-07-29):** `v-ship-combo15` (`175a475`), `pre/ship-combo15`
  (`215afde`), `pre/clean-sweep` (`dad4077`), and the four experiment archives
  `archive/{chain-choreo-final,free-band-final,choreo-release-final,fair-arrival-merged}` — see the
  _COMBO15 ship + the action/fair-arrival line_ subsection under Permanent anchors.
- **Evolution Act 1/Act 2 close anchors + scaffolding (2026-07-26):** `backup/aff-closed-fc6afbf`,
  `backup/finale-closed-26b2c34`, and the scaffolding tags `pre/aff-build`, `pre/aff-remove`,
  `pre/finale-compression`, `pre/finale-devscreen`, `pre/finale-adaptive`, `pre/finale-remove` — see the
  _Evolution Act 1/Act 2 CLOSED_ sections above.
- **Greenfield experiment archive:** `archive/handicap-pursuit-089c7d2` — see the _Evolution — greenfield
  experiments_ section.

Declared in the parseable form (TAG-GUARD-3 backfill — both were already recorded with their
SHAs above, but inside a sentence rather than at the start of a list item, so the guard could not see them):

- `pre/hygiene` (`a4103bb`) — the DOC-SYNC-1 report commit; a docs-only return point.
- `pre/router-7` (`83f5c8d`) — the HYGIENE-1 STEP 4 commit; a tooling/hygiene return point.

## Retired in Step 6d (race-action arc tag collapse)

**177 `pre/*` and `backup/*` step-tags** created during the race-action arc (the Great Pulk Cleanup —
every step-tag after `stable/pre-overlap-closed-20jun`) were deleted, locally and on origin, after phase
completion. Their incremental history is preserved in the commit messages and in `docs/RACE-ACTION.md`.

The **36 older `pre/*` / `backup/*` step-tags** from unrelated earlier phases (auth, branding, offline,
background-cache, recover-admin, and the 19–20 June sim-parity / overlap / band lead-in) were **not**
touched.

The full list of the 177 retired tags is recorded below for the archive.

### Retired tags (177)

- `backup/4a-asymmetric-fix`
- `backup/4a-cleanup-docs-and-test`
- `backup/battle-isolation-default-0`
- `backup/browser-fallback-bonusmult-fix`
- `backup/cam-leader-zoom-fix-24jun`
- `backup/cam-leader-zoom-floor-24jun`
- `backup/city-circuit-geometry-expanded`
- `backup/cleanup-s1-m1-pulkspring`
- `backup/cleanup-s2-pulkracedirector`
- `backup/cleanup-s3-deflag`
- `backup/cleanup-s4-classic-director`
- `backup/cleanup-s5a-rename-choreo`
- `backup/cleanup-s5bi-rehome`
- `backup/cleanup-s5biii-devscreen-order`
- `backup/cleanup-s6a-sweep-cleanup`
- `backup/cleanup-s6a2-sweep-followup`
- `backup/cleanup-s6b-docs`
- `backup/cleanup-s6b2-doc-truth-audit`
- `backup/closed-duration-realized`
- `backup/commit-a-legacy-forces-removed`
- `backup/commit-b-priority-ovlc-removed`
- `backup/cumulative-t-fix`
- `backup/default-flip-v4-world`
- `backup/dirt-oval-geometry-expanded`
- `backup/docs-refresh-architecture`
- `backup/docs-refresh-backlog`
- `backup/docs-refresh-kraeftelandkarte`
- `backup/docs-refresh-roadmap`
- `backup/docs-refresh-sim`
- `backup/garden-path-geometry-expanded`
- `backup/governor-core`
- `backup/governor-edge-limiter`
- `backup/ice-track-geometry-expanded`
- `backup/lessons-learned-30jun`
- `backup/look-before-brake`
- `backup/lookahead-lane-change`
- `backup/perf-render-arc-complete`
- `backup/phase-boundary-hardening`
- `backup/photo-finish-predictive`
- `backup/pulk-lead-rotation-starvguard`
- `backup/raceplan-min-duration-knob`
- `backup/rb-dynamics-default-on`
- `backup/reroll-realized-duration`
- `backup/rubber-band-cap-the-lead`
- `backup/rubber-band-diag-hud`
- `backup/setup-raceplan-threshold`
- `backup/sim-dead-scaffold-cleanup`
- `backup/sim-determinism-seeded-shuffle`
- `backup/sim-fairness-passthrough-telemetry`
- `backup/sim-finisht-parity-fix`
- `backup/sim-reroll-cli-flags`
- `backup/sim-shared-config-defaults-fix`
- `backup/soft-steering-layer1-active`
- `backup/surface-particle-pooling-done`
- `backup/surge-default-on`
- `backup/surge-exclude-top3`
- `backup/sweep-instrumentation-pulklr`
- `pre/4a-asymmetric-fix`
- `pre/4a-cleanup-docs-and-test`
- `pre/action-1`
- `pre/action-sweep-r1`
- `pre/areabonus-parity`
- `pre/battle-arc-closeness`
- `pre/battle-isolation-default-0`
- `pre/bg-layer-promotion`
- `pre/boost-headroom`
- `pre/brake-1-tipbrake`
- `pre/breakaway-diag`
- `pre/browser-fallback-bonusmult-fix`
- `pre/canvas-isolation-probe`
- `pre/city-circuit-geometry`
- `pre/cleanup`
- `pre/cleanup-s1-m1-pulkspring`
- `pre/cleanup-s2-pulkracedirector`
- `pre/cleanup-s3-deflag`
- `pre/cleanup-s4-classic-director`
- `pre/cleanup-s5a-rename-choreo`
- `pre/cleanup-s5bi-rehome`
- `pre/cleanup-s5bii-devscreen`
- `pre/cleanup-s5biii-devscreen-order`
- `pre/cleanup-s6a-sweep-cleanup`
- `pre/cleanup-s6a2-sweep-followup`
- `pre/cleanup-s6b-docs`
- `pre/cleanup-s6b2-doc-truth-audit`
- `pre/closed-duration-prediction`
- `pre/closedsff-reference-fix`
- `pre/cohesion-stage0`
- `pre/cumulative-t-fix`
- `pre/default-flip-v4-world`
- `pre/delete-dormant-experiments`
- `pre/director-rebuild`
- `pre/dirt-oval-geometry`
- `pre/doc-sync-governor-pivot`
- `pre/docs-refresh-architecture`
- `pre/docs-refresh-backlog`
- `pre/docs-refresh-kraeftelandkarte`
- `pre/docs-refresh-roadmap`
- `pre/docs-refresh-sim`
- `pre/draw-piece-isolation`
- `pre/garden-path-geometry`
- `pre/governor-core`
- `pre/governor-diag-hud-hero`
- `pre/governor-diag-hud-spread`
- `pre/governor-director-a1`
- `pre/governor-edge-limiter`
- `pre/governor-length-bound`
- `pre/governor-neighbor-gap`
- `pre/governor-rubber-band-redesign`
- `pre/governor-stage-c`
- `pre/ice-track-geometry`
- `pre/lbb-dedicated-differential`
- `pre/lessons-146-150`
- `pre/lessons-learned-30jun`
- `pre/look-before-brake`
- `pre/look-before-brake-harden`
- `pre/lookahead-lane-change`
- `pre/ovl-weg1-antrieb-cap-20jun`
- `pre/perf-hud`
- `pre/phase-boundary-hardening`
- `pre/photo-finish-15a`
- `pre/photo-finish-predictive`
- `pre/photo-finish-text-fix`
- `pre/probe-recovery`
- `pre/pulk-action`
- `pre/pulk-action-2`
- `pre/pulk-action-3`
- `pre/pulk-action-4`
- `pre/pulk-action-6`
- `pre/pulk-action-7`
- `pre/pulk-action-client`
- `pre/pulk-action-final`
- `pre/pulk-baseline-measure`
- `pre/pulk-contest-sweep`
- `pre/pulk-lead-rotation`
- `pre/pulk-lead-rotation-brakeset`
- `pre/pulk-lead-rotation-flatboost`
- `pre/pulk-lead-rotation-holdfix`
- `pre/pulk-lead-rotation-starvguard`
- `pre/pulk-race-action-measure`
- `pre/pulk-race-director`
- `pre/pulk-reopen`
- `pre/pulk-surge-core`
- `pre/raceplan-min-duration-knob`
- `pre/rank-proto`
- `pre/rank-proto-stufe2`
- `pre/rank-proto-stufe2b`
- `pre/rank-proto-stufe2c`
- `pre/rb-dynamics-default-on`
- `pre/remove-diag-scaffold`
- `pre/remove-race-zones`
- `pre/reroll-realized-duration`
- `pre/rubber-band-cap-the-lead`
- `pre/rubber-band-diag-hud`
- `pre/runaway-leader-measure`
- `pre/setup-raceplan-threshold`
- `pre/shared-t-update`
- `pre/sim-action-metric`
- `pre/sim-dead-scaffold-cleanup`
- `pre/sim-fairness-passthrough-telemetry`
- `pre/sim-finisht-parity-fix`
- `pre/sim-reroll-cli-flags`
- `pre/sim-shared-config-defaults-fix`
- `pre/smoothing-quality`
- `pre/soft-steering-layer1`
- `pre/softer-lane-change`
- `pre/splash-line-baked-sprite`
- `pre/spread-default`
- `pre/step5-pulk-collapse`
- `pre/strip-down`
- `pre/surface-particle-pooling`
- `pre/surge-default-on`
- `pre/surge-devscreen-knobs`
- `pre/surge-exclude-top3`
- `pre/surge-telemetry-agg`
- `pre/sweep-instrumentation-pulklr`
- `pre/v4-choreography`
- `pre/weights`
- `pre/camera-hygiene`
- `pre/camera-hygiene-2`
- `pre/render-fingerprint`
- `pre/company`
- `pre/company-2`
- `pre/framing`
- `pre/lateral`
- `pre/min-draw`
- `pre/no-schema`
- `pre/reference-width`
- `pre/tags`
- `pre/picture-fixes`
- `pre/v4-on-trunk`
- `pre/zoom-unit`
