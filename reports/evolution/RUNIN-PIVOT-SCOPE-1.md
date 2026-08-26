# RUNIN-PIVOT-SCOPE-1 — he is right that it is more than 59 px, and the experiment worked

**Date:** 2026-08-26 · **Branch:** `feat/runin-level-set-1` · **PART A SHIPPED on the branch, NOT
MERGED** — his eye decides. **PART B changed nothing.**

---

# PART B FIRST — WHAT HE ACTUALLY SEES, IN A UNIT HE CAN PICTURE

**He is right, and the 59 px figure was answering a different question than the one he was asking.**

Every number this strand has published — 59 px, 973 px, 2,427 px — measures **how far a RACER moves
inside the picture**. He is watching **how far the PICTURE moves**. Those are different quantities,
and the second had never been measured. A camera can travel a long way while the racer it follows
barely shifts on screen, because the racer travels with it.

**The biggest thing he sees is the world at the edge of the frame sliding up to 635 screen px in one
frame — about half the width of the canvas — and it is NOT the same event the 59 px figure
describes.**

Measured over the closing phase on the eight late-step races (seeds 13 and 49 are two of them), the
screen motion splits into two parts that look completely different:

| | what it is | worst, before this block |
| --- | --- | --- |
| **PAN term** | the whole picture sliding sideways | 22–70 px/frame |
| **ZOOM term** | the picture expanding or contracting about its centre, measured at the corner where it is largest | **214–565 px/frame** |
| **total** | | **236–635 px/frame** |

**The zoom term is five to ten times the pan term.** That is why his eye and the 59 px figure
disagree and both are honest: 59 px is the subject, near the middle, where the zoom term is smallest;
565 px is the world at the corner, where it is largest. A racer held near the centre while the world
tears past the edges is exactly *"it jumps back and forth very fast"*.

**The camera's own centre barely moves** — 6 to 27 world px in its worst frame, 1.8%–5.4% of the
visible width. So this is not a pan at all in the sense he used the word. **It is the width change,
seen from the edge of the frame.**

**Frame rate does not rescue it, and this corrects an assumption.** RUNIN-SEED13-ANATOMY-1 found the
subject's swing grows as the rate falls (1,163 px at 50 Hz vs 973 at 60), and that is true of the PAN
term — it scales with how much world a frame covers. **The ZOOM term is rate-invariant:** on seed 13
it reads 358.33 / 358.43 / 358.45 px at 50 / 60 / 90 Hz. A faster browser does not help with the part
that dominates, because a scheduled zoom step is a discontinuity, not a speed.

**After Part A the pan term is largely gone and the zoom term is untouched:**

| race | pan before → after | zoom before → after | total before → after |
| --- | --- | --- | --- |
| river-run 20 s13 | 44.46 → **10.22** | 358.43 → 358.43 | 402.90 → **368.65** |
| river-run 20 s18 | 69.53 → **15.34** | 565.24 → 565.24 | 634.77 → **580.58** |
| seatrack 20 s7 | 52.80 → **12.27** | 321.16 → 321.16 | 373.10 → **331.30** |

**Perceptible camera-motion events fall from 13 to 2 across the eight races** — and both survivors
are zoom events, not pan ones.

**So, plainly: the sideways jolt is gone. The big movement he is describing is not, because it is the
width step and this piece does not touch the width.** It is up to ~580 screen px at the frame corner
on river-run seed 18, ~369 px on seed 13, in a single frame, at any frame rate.

*How "perceptible" was decided, rather than asserted:* a frame counts only if it moves more than 5×
that same race's median per-frame motion **and** more than 1% of the visible frame width (~13 px at
1280). The first makes it a discontinuity rather than a pan; the second stops an almost-still race
reporting its own noise. Four frames cleared the ratio but not the floor and are reported as below
notice rather than dropped.

---

# PART A — THE EXPERIMENT WORKED

**The named experiment: restrict the pivot to exactly the frames old-P5 covered.** It succeeds, and
the level-set regression was the pivot's scope, not the ordering.

| | RUNIN-ORDER-FIX-1 arm B (pivot widened) | **this build (pivot restricted)** |
| --- | --- | --- |
| level-set frames cut | **48** | **0** |
| level-set tests | 2 failing | **passing** |
| `zoomPivot` tests | 2 failing | **passing** |
| worst across-track jump, 8 races | 1.22 px | **1.22 px** |
| across-track jumps > 4 px | 0 | **0** |
| camera suite | 6 failing | **885 / 885** |

**The benefit is identical and the regression is gone.** The restricted build reproduces arm B to the
digit on every race, so nothing was traded away to remove the 48 cut frames.

The across-track figures against the branch baseline:

| race | baseline | **built** |
| --- | --- | --- |
| river-run 20 s18 | 59.07 | **0.04** |
| river-run 20 s49 | 42.64 | **0.03** |
| river-run 20 s13 | 39.40 | **0.05** |
| seatrack 20 s7 | 38.63 | **0.78** |
| mountainstreet 20 s24 | 22.79 | **1.22** |
| dirt-oval 20 s171 | 22.96 | **0.12** |
| city-circuit 20 s7 | 21.45 | **0.02** |
| mountainstreet 20 s32 | 20.72 | **0.83** |
| **jumps > 4 px, pooled** | **30** | **0** |

## The three tests that pinned the old ordering

All three are replaced rather than deleted, and their ground is now covered by the ordering itself:

- **`panStaleZoom.test.js` (6 tests) — DELETED with its patch**, and replaced by
  `panOrdering.test.js` (4 tests, each with a sabotage arm). The sabotage there is the OLD ORDER:
  resolve the aim, then move the zoom underneath it.
- **`ENTRY/TRACKING endpoint still tracks the live zoom`** — rewrote its mechanism, kept its meaning.
  "Live" meant the pre-transition zoom, which was the defect's other face. It now pins that the
  endpoint tracks the zoom it is resolved at, with the stale case as its sabotage.
- **`the pan target names the same world position at the zoom the frame is drawn with`** (invariant 6)
  — **its assertion is inverted, which is what it asked for.** It required the two scales to DIFFER
  and said it would go inert if they ever stopped. They have stopped, and not by inertia: the aim is
  now resolved at the drawn scale by construction. It asserts agreement to 1e-6.

## `resolveCamera`'s adaptation loop — measured, and it is not a factor

The candidate RUNIN-ORDER-FIX-1 raised and did not measure. Post-ordering, any residual scale
mismatch **is** the adaptation loop, so it can be read straight off the trace: **1,203 of 1,243
closing-phase frames (96.8%) differ — at a worst relative gap of 2.3e-7.** That is the float
round-trip through `camZoomForEffX`/`effX`, not adaptation. It sits four orders of magnitude below
the 1e-4 bucket where the measured across-track step is still 0.00 px. **It accounts for nothing, and
it did not account for the level-set regression** — the pivot's scope did.

## What this piece does NOT remove

**The width step is untouched and he will still see it.** So are the two other causes RUNIN-VIABLE-1
named: the state/level crossover (9 handovers, worst a factor of 2.35) and the span-versus-presence
term. The eased admit is a separate piece. **Everything in Part B's zoom column is that width step**,
and it is the biggest thing on the screen.

## VERIFICATION

| role | recorded | engine | verdict |
| --- | --- | --- | --- |
| **world** | `dc4647be0f55ebdb` | same | **UNMOVED** |
| **world-off** | `854018ee5d3d83e1` | same | **UNMOVED** |
| camera | `0434cd0385eacc7b` | `7d8f2c61dbc39b65` | **MOVED — expected** |
| render | `57b2eb101d806b22` | `77736acc202ab6f2` | **MOVED — follows** |

**NOTHING RE-MINTED.** `docs/fingerprints.json` is untouched; `--mint` verifies against the engine, it
does not write. As in RUNIN-PAN-STALE-ZOOM-1, the recorded column is THIS BRANCH's record — master's
differs for reasons that belong to master.

**Re-confirmed, and none regressed:** the twelve level-set races (`levelSet.test.js` 17/17), the
finish line in frame (`check-runin-frame` PASS on both tracks), the leader on canvas through the
crossing, `zoomPivot` 5/5, and the full camera suite at **885/885**.

**Stamps re-measured, not re-stamped:** `tracking-lag` — **all six frame counts identical**
(8626/159/13282/8473/4130/2089), four states improved, LEADER_ZOOM's median 4.99 → 5.07 with its p95
9.84 → 9.71; `straggler-truth` — identical to the digit.

## SOURCE HYGIENE

**Lines: 5,199 → 5,122 in `CameraDirector.js` (−77).** The change is an ordering, so the file got
smaller rather than larger — which is the test the spec set for it.

**Extracted:** `_setTrackTargets` split at the boundary that already existed. It answers HOW WIDE and
stops; the aim moved to `_resolvePanTarget()`, called from `update()` after the zoom is settled.

**Removed, and each proven unreferenced tree-wide with `git grep` before deletion:**

| removed | was |
| --- | --- |
| `_restatePanTargetAtDrawnZoom()` (37 lines) | the re-statement helper; the ordering is its general answer, so it disappeared into it |
| `_panTargetEff` field + its 7-line note | the helper's idempotence state |
| the `_schedZoom` re-statement call | VIEWER-INVARIANTS-2's patch |
| the `_runInAfterDeadline` re-statement call | RUNIN-PAN-STALE-ZOOM-1's patch |
| three duplicated zoom writes | the glide's, the cut's and the follow's, now one hoisted transition |
| `panStaleZoom.test.js` (6 tests) | replaced by `panOrdering.test.js` |

**Comments:** the file header's claim that `_setTargets` owns `targetOffsetX/Y` was corrected — it no
longer does. The CAMERA-SIDEJUMP-1 and VIEWER-INVARIANTS-1 notes keep their measurements and their
reasoning and now name the right mechanism, per the standing instruction not to delete why something
was tried. **Documents corrected in the same commit:** `docs/CAMERA_DIRECTOR.md` §2 (the update()
order, rewritten), new §2a (the pivots and why the ordering did not replace them), §3.3 (cross-linked
with both measured bounds), and `docs/ENDING-PHASES.md`'s stamp.

**WHAT I NOTICED AND LEFT, with the reason:**

- **`_lastPivotAnchorX` stays.** The pivot stays, so its diagnostic does. Readers:
  `scripts/diag/runin-anatomy.mjs:304`, `scripts/diag/start-frame-capture.mjs:299`, and
  `zoomPivot.test.js`.
- **The two pivots are still two call sites, not one.** Unifying them is what cut the level set on 48
  frames. **Left deliberately, and that is now a documented bound rather than an oversight.**
- **`_setTrackTargets` is still ~380 lines** even after the split. Out of scope; see proposals.
- **The stale conflict marker in `reports/evolution/INDEX.md`** (`||||||| 5204b10b`) — third report in
  a row that records it. Still out of scope, still there.
- **RUNIN-VIABLE-1's "five mechanisms compensate for one ordering property"** is wrong on master and
  RUNIN-ORDER-FIX-1 corrected it only in its own report. Proposal D there still stands.

## CONFORMITY

| asked | delivered |
| --- | --- |
| PART B first, if cheaper to sequence | done first; it changed nothing and it did reset what Part A is judged against |
| restrict the pivot to exactly old-P5's frames | done: the follow branch's non-entry path and the glide branch, both unchanged from where they were |
| report level-set frames 48 → ? | **48 → 0** |
| report the three tests | all three named, replaced, and what covers them now |
| across-track figures beside the unrestricted arm | table above; identical to the digit |
| settle `resolveCamera`'s adaptation | measured: 96.8% of frames, worst 2.3e-7 — accounts for nothing |
| do not ship if the regression persists | it did not persist; shipped on the branch, unmerged |
| camera motion per frame, world + fraction of frame | §B(a) |
| apparent motion of the background | §B(b), split into pan and zoom terms |
| every fast movement ranked, cause per event | §B(c), 13 events with per-event causes |
| which a viewer would perceive, and how I decided | stated as a rule with both thresholds and the count it discards |
| 50 / 60 / 90 Hz | §B; the pan term scales, the zoom term does not |
| plain paragraph: what is the biggest thing he sees | the opening of Part B |
| reuse RUNIN-VIABLE-1's instrument, say if extended | **extended** — it could not express camera motion; `camCentre`, `visibleW/H`, `effXNow/effYNow`, `binding` and a `--fps` clock added, plus a new summariser |
| world and world-off must not move | both unmoved |
| camera fp moves, reported, never re-minted quietly | reported; record untouched |
| no leftover fields, comments or tests | hygiene section, with what was left and why |

## PROPOSALS

### A — The width step is now the whole of what he sees; do the eased admit next
Part B settles the priority. The pan is 10–15 px and the zoom is 358–565 px. Every remaining
perceptible event is a zoom event. `archive/runin-chance-set-1` holds the predicate and its price.

### B — MINE: make the level→state handover slope-continuous
RUNIN-VIABLE-1 measured 9 handovers, every one producing a step, worst ×2.35. `Math.min` is
continuous in value and not in derivative. A short log-space blend — the device the corridor cap
already uses — would remove them without changing either bound's meaning.

### C — MINE: measure the zoom term the way Part B does, as a standing instrument
`runin-camera-motion.mjs` splits screen motion into pan and zoom. Nothing else in the tree does, and
the figure that actually matches the owner's eye is the one it computes. It should be what a run-in
change is judged on, instead of a subject-displacement figure that reads ten times smaller.

### D — MINE: bound the single-frame zoom step directly
Every proposal in this strand attacks the step's CAUSE — membership, handover, easing. None bounds
the EFFECT. A ceiling on how much the visible width may change in one frame, applied last, would put
a number on the worst case regardless of which authority caused it — and Part B gives the unit to
state it in.

### E — Split `_setTrackTargets` further
It is still ~380 lines mixing ceiling composition, corridor cap, ratchet and level set. The zoom/aim
split proved the seams are real.

## WHAT OUTLIVES THIS REPORT

The owner's objection, confirmed with a number: what he sees is up to 580 screen px at the frame
corner, and it is the width step, not the pan. A measure that finally matches his eye instead of
under-reading it tenfold. And a repair that removes the sideways jolt without costing the level set a
single frame — because the experiment that found the difference was one change and one test run.
