# RUNIN-VIABLE-1 — is the run-in repairable, or is a redesign cheaper?

**Date:** 2026-08-26 · **Branch:** `diag/runin-viable-1`, off master, with `feat/runin-level-set-1`
merged in so the diagnosis runs the code the owner will be looking at · **DIAGNOSE AND ASSESS ONLY**
— nothing built, nothing repaired, no key added, no default touched, no fingerprint minted.

**Read-only, and the omissions are deliberate:** no fingerprints, no browser gate, no client suite.
This block changes no product file, so all three would be measuring the tree they already agree
with. The three new files are diagnostic scripts under `scripts/diag/`.

## WHY THIS BLOCK EXISTS

The owner has been in this strand since 2026-08-23. The pattern each time is the same: a symptom is
measured, explained, repaired — and the next one surfaces underneath it. **Six symptoms, several
repairs, no convergence:** the late lead change · the winner off canvas · across-track departures ·
the width step · the pan thrown out at the crossing · and now a sideways jolt at the line.

**The owner, 2026-08-26 (rendered in English, per the closed quotation rule):** *if we do not find a
solution for the finish sequence as a whole before long, we may have to rethink from scratch how to
build a finish that works, is simple, and looks good.*

So this block does not chase the seventh symptom. It answers one question with numbers.

---

# PART A — HIS OBSERVATION IS CORRECT, AND IT IS THE SIZE

**In his terms: it is not the aim along, and it is not the aim across. IT IS THE SIZE.**

He said the camera always aims at the middle, so the focus should only ever move forward along the
line, never sideways — and that what he sees is a sideways jump. **Both halves of that are right, and
they are not in contradiction.** The aim really is always the middle. The sideways motion is the
WIDTH CHANGE arriving as a sideways displacement of the picture.

**The aim never moves across the track. Measured, not asserted:** over the closing window on all
eight late-step races, the maximum across-track component of the pan target is

| stage | what it is | max \|across\|, world px |
| --- | --- | --- |
| `anchorPoint` | the subject itself — pair midpoint or leader | **0.00 on all 8 races** |
| `afterBias` | + the forward bias | **0.00 on all 8** |
| `afterLateral` | + the lateral-shift term | **0.00 on all 8** |
| `resolvedAim` | what `resolveCamera` decided | **0.00 on 6**; 20.88 and 17.87 on the two closed tracks |

Zero. Not "small" — identically zero to the precision recorded, on every frame the framing rule
controls. **There is no lateral term misbehaving, no anchor wandering sideways, no edge fitting
pushing the shot off the centreline.** The premise this strand could have doubted is sound.

**And yet the subject moves sideways in the picture**, against the very point the framing rule chose
for it:

| race | worst across, screen px | jumps > 4 px | across travel |
| --- | --- | --- | --- |
| river-run 20 s18 | **59.07** | 5 | 119.4 |
| river-run 20 s49 | 42.64 | 3 | 85.3 |
| **river-run 20 s13** | **39.40** | 6 | 155.0 |
| seatrack 20 s7 | 38.63 | 7 | 155.3 |
| dirt-oval 20 s171 | 22.96 | 1 | 58.2 |
| mountainstreet 20 s24 | 22.79 | 3 | 73.4 |
| city-circuit 20 s7 | 21.45 | 3 | 77.2 |
| mountainstreet 20 s32 | 20.72 | 2 | 45.8 |

**Every one of those jumps is on a frame drawn at a different scale from the one its aim was resolved
at.** 221 of 221 across-track jumps over the full trace, 0 unexplained. And because "the zoom is
moving" is true on nearly every frame of a closing stretch, that coincidence alone would prove
little — so the magnitude relation was measured instead, and it is a clean dose–response:

| \|drawnEff / resolvedEff − 1\| | frames | median across step | worst |
| --- | --- | --- | --- |
| < 1e-4 | 683 | **0.00 px** | 5.31 |
| 1e-4 … 1e-3 | 226 | 0.07 px | 3.24 |
| 1e-3 … 1e-2 | 178 | 0.43 px | 2.85 |
| 1e-2 … 1e-1 | 98 | 1.47 px | 6.69 |
| > 1e-1 | 27 | **9.64 px** | **58.11** |

Four orders of magnitude, monotone. Where the drawn zoom matches the resolved zoom the picture does
not move sideways at all; where they diverge by more than 10% the subject jumps by tens of pixels.
(The converse test is reported and is weak on its own: only **23** frames in the whole corpus have a
static zoom, and none of them jumps. The dose–response is what carries the argument.)

**THE MECHANISM, IN ONE SENTENCE.** The framing rule chooses where the camera sits so that the
subject lands on its intended screen point **at the zoom it was handed**. The frame is then drawn at
a different zoom. The stored aim is a world position, and it is honoured exactly — but honouring a
world position at a changed scale puts the subject somewhere else on the screen, and because the
track runs diagonally across the picture at the line, most of that displacement is **across** it.

On river-run seed 13, at 0.150 s before the line, the aim is resolved at effective zoom 3.641 and
the frame is drawn at 1.864 — a factor of 1.95 — and the subject moves from 0.24 px off its intended
point to **−36.75 px across** in one frame. At the crossing it swings the other way to **+39.40**.
That is his sideways jolt, and its cause is the width step, not the aim.

---

# PART B — THE INVENTORY

## B0 — every mechanism that can move the SIZE or the AIM during the run-in

Found by enumerating every write to `zoom` / `targetZoom` / `offsetX` / `targetOffsetX` in
`CameraDirector.js` and following each back to its author. **Completeness is claimed for the writes
and NOT for the reads** — see "what could not be established".

**SIZE — 16 mechanisms.**

| # | mechanism | for | fires | reads | knows about the others? |
| --- | --- | --- | --- | --- | --- |
| 1 | endgame schedule (`_runInCeiling` via `_ceilings.state`) | the authored close | while composing | race progress | **yes — it stands the others down** |
| 2 | contender guarantee | keep the pair in frame | always | pair geometry | no |
| 3 | company ceiling | the company promise | until home | field | no |
| 4 | field ceiling | ceremony promise | until retired | field | no |
| 5 | line ceiling (`_ceilings.line`) | the run-in outside the schedule | endgame | line distance | no |
| 6 | state zoom (`stateZoom`) | the state's own width | always | state | no |
| 7 | corridor cap + weight | width ≤ road width | endgame | road | **partly** — applied after the `min`, then re-`min`'d against the guarantee |
| 8 | run-in ratchet (`_runInRatchet`) | never re-widen | composing + after deadline | previous frame | **yes — reads the composed result** |
| 9 | level-set ceiling | the owner's one-length rule | endgame | level set | **partly** — applied last, after the ratchet |
| 10 | zoom lerp (follow) | smoothing | not composing | targetZoom | no |
| 11 | glide zoom interpolation | transitions | glide | glide endpoints | **yes — stands down under the schedule** |
| 12 | schedule's direct write (`zoom = targetZoom`) | schedule is a position | composing | — | yes |
| 13 | cut snap | hard cuts | on cut | — | no |
| 14 | LEAD_CHANGE zoom snap | lead changes | on transition | state | **yes — guarded by `!_scheduleComposing()`** |
| 15 | OVERVIEW re-entry snap | state entry | on transition | state | **yes — same guard** |
| 16 | contention release (`_updateContentionWatch`) | drop a fading racer | every 250 ms | closing rate | no — it changes #2's membership |

**AIM — 12 mechanisms.**

| # | mechanism | moves | knows about the others? |
| --- | --- | --- | --- |
| 1 | anchor choice (`_focusAnchorRacer` / photo-finish pair) | the subject | no |
| 2 | forward bias (`_forwardFracNow`) | along | no |
| 3 | lateral shift | across | no |
| 4 | `resolveCamera` world-edge clamp | both | no |
| 5 | `resolveCamera` zoom-adaptation loop | **both — and the SIZE** | it widens to fit; #1–#9 of SIZE do not know |
| 6 | `_offsetYFor` (Y resolved separately) | across | no |
| 7 | pan re-statement at drawn zoom | both | **yes — idempotent, excludes the glide** |
| 8 | SIDEJUMP pivot | both | no |
| 9 | glide pivot | both | **yes — scoped to `_schedZoom`** |
| 10 | glide absolute pan interpolation | both | yes |
| 11 | pan lerp | both | no |
| 12 | T-space entry pin | both | yes |

## B1 — how many can move the same quantity in the same frame

**Measured over 1,243 frames of closing stretch: a mean of 2.25–2.69 width authorities are live at
once, with a maximum of 4.** That is far fewer than the sixteen the source suggests — most stand down
outside their window, which is the design working.

**But only TWO ever actually set the width: `state` and `level`.** Across all eight races the binding
authority is one of those two and never anything else.

## B2 — which pairs are ordered by an explicit rule, and which merely compose

**Explicitly ordered (a rule says who wins):** the schedule over the guarantee/company/field
(ENDGAME-SCHEDULE-2, which stands them down and records what they *would* have asked); the two state
snaps under `!_scheduleComposing()`; the glide's zoom under `_schedZoom`; the ratchet reading the
composed result; the level ceiling applied last.

**Merely composing (no rule — they meet in a `Math.min` and whoever is smaller wins):** the
guarantee, company, field, line and state ceilings among themselves; the corridor cap against the
result; **and, decisively, `state` against `level`.**

**`min` is continuous in VALUE but not in DERIVATIVE.** While one bound is the argmin the width
follows its curve; the instant another becomes the argmin the width starts following a curve with a
different slope, and nothing makes the two agree at the crossover. **Every handover is therefore a
place a step can appear with no single mechanism being wrong.** Measured:

| | count |
| --- | --- |
| handovers over 1,243 frames | **9** |
| width steps > 2% | 90 |
| **steps that land on a handover frame** | **9 — every handover produces one** |
| worst step at a handover | **0.853 ln — a factor of 2.35 in one frame** |

Only one pair ever meets: **`level → state` 8×, `state → level` 1×.** The other 90% of the width
steps are *within* one author — the schedule closing quickly, which is intended motion, not a defect.

## B3 — how many of the six symptoms are interactions rather than single defects

| # | symptom | interaction, or one mechanism wrong? |
| --- | --- | --- |
| 1 | late lead change | **one defect** — the guarantee bounds a SPAN, nothing asserts the winner is inside it |
| 2 | winner off canvas | **the same one defect** — span, not presence |
| 3 | across-track departures | **the same one defect**, on the other axis |
| 4 | the width step | **interaction** — `level` and `state` meeting in a `min` (9/9 handovers step) |
| 5 | the pan thrown out at the crossing | **ordering** — aim resolved at one zoom, drawn at another |
| 6 | the sideways jolt at the line | **the same ordering**, measured here |

**So the honest count is not "mostly interactions". It is three causes behind six symptoms:** one
missing term (1–3), one crossover (4), and one pipeline ordering (5–6).

**AND THE ORDERING IS WHY THE STRAND HAS NOT CONVERGED.** `CameraDirector.js` already contains
**five** separate pieces of machinery compensating for the same property, each scoped to a different
subset of frames:

| line | mechanism | scope |
| --- | --- | --- |
| 1125 | VIEWER-INVARIANTS-2 — re-state the aim at the drawn zoom | while the schedule composes |
| 1154 | CAMERA-GLIDE-TARGET-1 — resolve the glide endpoint at the destination zoom | the glide (a deliberate *exclusion*) |
| 1177 | VIEWER-INVARIANTS-1 — pivot the glide's pan | glide frames under the schedule |
| 1272 | RUNIN-PAN-STALE-ZOOM-1 — re-state the aim at the drawn zoom | follow frames after the deadline |
| 1322 | CAMERA-SIDEJUMP-1 — pivot the delivered offset about the anchor | follow frames |

**Five patches, one property, five different frame-subsets — and two of them preserve OPPOSITE
invariants.** The re-statement (1125, 1272) preserves the camera's world position and lets the
subject move on screen; the pivot (1322) preserves the subject's screen position and lets the camera
move. The pan lerp then blends between them every frame. Each repair was correct about its own
subset and none of them removed the cause, which is exactly the non-convergence the owner is
describing — and it is a property of the ORDER of the pipeline, not of any of the five.

---

# PART C — THE VERDICT: **REPAIRABLE**

**Not because the strand has been going well, but because the measurements say the hard part is
already right and the remaining faults are three, named, and bounded.**

The single strongest piece of evidence is Part A's zero. **The framing rule — the part a redesign
would have to replace — is correct.** It puts the aim exactly where it intends, on both axes, on
every frame of every race measured. A redesign would be rewriting the one component with no
defects in it. What is wrong sits in the plumbing around it: the order in which size and aim are
computed, one crossover, and one missing term.

## The remaining defects — three

**1. THE ORDERING (subsumes symptoms 5 and 6).** The aim is resolved at a zoom the frame is not
drawn at. **Cost today:** up to 59 px of sideways subject movement, up to 2,427 px of aim error at
the worst crossing, the leader off canvas, and *five* compensating mechanisms whose interaction
surface is itself now a source of faults. **The repair is a re-ordering, not a rewrite:** compute the
ceilings → apply the frame's zoom transition → *then* resolve the pan at the zoom just settled.
`targetZoom` is computed inside `_setTargets` and the pan is resolved a few lines later in the same
function, so this is a split of one function at a boundary that already exists. **It should delete
four of the five patches above rather than add a sixth** — which is the test of whether it is the
right fix.

**2. THE PRESENCE (subsumes symptoms 1, 2, 3).** The guarantee bounds a span; nothing asserts the
winner is inside it. Already established twice before this block (RUNIN-CONTENDER-GUARANTEE-1's *"a
SPAN is not a PRESENCE"*, LATE-LEAD-AXIS-1's *"the winner is only ever lost SIDEWAYS"*) and
confirmed again in RUNIN-PAN-STALE-ZOOM-1, where a correctly-aimed camera left the leader off canvas
on 2 of 8 races. **Cost:** one added term in the framing rule; no new mechanism.

**3. THE CROSSOVER (symptom 4).** `level` and `state` meet in a `Math.min` with no rule about the
meeting. **Cost:** 9 handovers in 1,243 frames, every one producing a visible step, the worst a
factor of 2.35 in one frame. **The repair is a slope-continuous handover** — the eased admit the
owner already asked for on 2026-08-26 is one form of it, and `archive/runin-chance-set-1` already
holds the instrument and the price.

## How I know the list is complete

Not by assertion, and the claim is bounded rather than absolute:

- **Across-track motion is fully accounted.** 221 of 221 jumps fall on zoom-mismatched frames, **0
  unexplained**, with a monotone dose–response over four orders of magnitude.
- **Width steps are fully partitioned.** Every step > 2% is either inside one author (intended close)
  or on a handover (9/9). There is no third category.
- **The aim's own across component is identically zero**, so no fourth defect can be hiding in the
  framing rule's placement.
- **The write set is exhaustive by construction**: every mechanism in B0 came from enumerating
  assignments to the four quantities, not from memory.

**What that does NOT cover, stated plainly:** eight races on five tracks, at 60 Hz, with the run-in
and the level set as they stand on `feat/runin-level-set-1`. It covers the closing window only, and
it says nothing about a seventh symptom outside it.

## Against the cost of continuing

**Redesign is not cheaper, and the estimate is the reason.** A replacement run-in still has to
satisfy every requirement on the record — everyone who can still win in frame on both axes; the
leader drifting back behind the middle so one can see ahead; the finish line visible; no abrupt
change; names from the closing zoom. Those requirements are what produced the guarantee, the level
set, the schedule, the ratchet and the corridor cap in the first place. **A new run-in would
re-derive most of that list**, and it would do so without the six symptoms' worth of measurement
that is now attached to the existing one — including the fact, established only today, that the
framing rule places the aim perfectly. **The three defects above are a smaller, better-specified
piece of work than re-deriving five mechanisms and re-measuring them against nine tracks.**

**The one honest caveat:** if the ordering repair does *not* delete four of the five compensating
patches, that is evidence the coupling is deeper than this block found, and the verdict should be
re-opened. **That test is cheap and it is the first thing to run.**

---

## WHAT COULD NOT BE ESTABLISHED

- **The inventory is exhaustive for WRITES, not for READS.** Every mechanism in B0 was found by
  enumerating assignments to `zoom`/`targetZoom`/`offsetX`/`targetOffsetX`. A mechanism that changes
  the picture by changing what another one *reads* — a config key, the subject set, the level-set
  membership — appears only where it happened to surface. `_updateContentionWatch` is in the list for
  that reason and there may be others.
- **The converse test in Part A is under-powered.** Only 23 of 1,235 frame-pairs have a genuinely
  static zoom. None of them jumps, but that is 23 samples, and the dose–response is doing the work.
- **No browser run.** The headless director is known not to reproduce the owner's excursion, so every
  screen-pixel figure here is the harness's picture, not his. The *relations* — aim across is zero,
  jolts track zoom mismatch — are structural and should survive; the magnitudes may not.
- **Closed tracks show a small non-zero `resolvedAim.across`** (20.88 px city-circuit, 17.87 px
  dirt-oval) that the four framing stages do not: `resolveCamera` is introducing it. It is an order
  of magnitude below the jolts and was not chased.
- **A stale conflict marker is sitting in `reports/evolution/INDEX.md`.** Line 849 of master's copy
  carries a literal `||||||| 5204b10b` from a merge that was committed unresolved. It predates this
  block, `check-index` does not detect it, and **this block deliberately did not fix it** — the
  bounds say change nothing. It is recorded here so it is not lost.

## SOURCE HYGIENE

No product file was touched. Three new diagnostic scripts, all measure-only:
`scripts/diag/runin-aim-axes.mjs` (the along/across probe), `scripts/diag/runin-aim-sum.mjs` (Part
A's tables), `scripts/diag/runin-authors.mjs` (Part B's handover counts). The branch also carries
`feat/runin-level-set-1` merged in, unchanged, as the code under study.

No key, no default, no fingerprint, no test, no config claim. Read-only guards only.

## CONFORMITY — asked against delivered

| asked | delivered |
| --- | --- |
| branch `diag/runin-viable-1` off master, code under study `feat/runin-level-set-1` | done, merged in as its own commit |
| diagnose and assess only; change nothing, add no key | no product file touched |
| say why the block exists, plainly, at the top | first section, with his verdict in English per the closed quotation rule |
| Part A: aim decomposed along/across, frame by frame, seed 13 + the other late-step races | 8 races, 5 tracks, 1,235 frame-pairs |
| every across-track jump gets its cause named | 221 of 221 charged, 0 unexplained, plus a dose–response |
| answer his sentence in his terms | "it is the SIZE" — stated first |
| Part B: exhaustive inventory, say so if unsure | 16 size + 12 aim; completeness claimed for writes only, and the gap named |
| how many can move the same quantity in one frame | measured: mean 2.25–2.69 live, max 4, but only 2 ever bind |
| which pairs are ordered, which merely compose | listed; `state` vs `level` is the one that merely composes |
| how many symptoms are interactions | 3 causes behind 6 symptoms: 1 missing term, 1 crossover, 1 ordering |
| Part C: commit to one of three | **REPAIRABLE**, with three named defects and the test that would re-open it |
| browser path, camera seed from the race seed | `cameraSeedForRace(raceSeed)` on every run |
| read the core count before launching | 14 |
| read-only, state the reason | stated at the top |
| report + INDEX in the same commit, push, merge the report only | done |

## PROPOSALS — none ordered, none built

### A — Do the ordering repair, and judge it by what it DELETES
Split `_setTargets` at the boundary that already exists: ceilings → zoom transition → resolve the pan
at the settled zoom. **Acceptance is not "the jolt is smaller" but "four of the five compensating
patches are gone."** If they cannot go, re-open this verdict.

### B — MINE: make the handover slope-continuous instead of value-continuous
`Math.min` is the wrong composition for two curves that must meet without a visible step. A blend
over a short window — the same log-space device the corridor cap already uses — would remove the
9/9 handover steps without changing either bound's meaning.

### C — MINE: give the guarantee a PRESENCE term
The third block to reach this sentence. A span does not assert membership; the winner is lost
sideways because nothing says he must be inside the frame.

### D — MINE: assert Part A's zero as a permanent invariant
`anchorPoint.across`, `afterBias.across` and `afterLateral.across` are identically zero today. That is
the single most valuable fact this block found, and nothing in the tree protects it. A test pinning
it would make any future lateral term declare itself instead of being discovered by eye.

### E — Record the instrument beside the claim
`runin-aim-axes.mjs` is the only thing in the tree that can decompose the aim. It exists now because
this block wrote it; nothing points at it from the documents whose claims depend on it.

## WHAT OUTLIVES THIS REPORT

The owner's observation, confirmed and inverted: the aim is exactly the middle, and the sideways
motion is the width arriving as a displacement. A verdict with a number behind each of its three
remaining defects. And the reason six symptoms produced no convergence — five separate patches for
one ordering property, two of them preserving opposite invariants — which is a fact about the code,
not a judgement about the effort spent on it.
