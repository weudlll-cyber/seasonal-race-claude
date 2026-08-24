# LATE-LEAD-HUNT-1 — races where a top finisher was outside the camera at the finish

**Date:** 2026-08-24 · **Branch:** `diag/late-lead-hunt-1` (off `master` at `656d3702`) ·
**SEARCH AND DIAGNOSE ONLY — nothing changed, nothing proposed as work.**

**It is not rare and it is reproducible.** Across **1,260 races** a top-5 finisher is fully off canvas
during the closing stretch in **663 of them**. The winner himself is off canvas in **10.0%** of races.
**Two different faults are involved, not one**, and they separate perfectly — see §3.

**It did NOT go away.** The same seed on the tree as it stood on 2026-08-23 produces **byte-identical**
results to today, on 21 of 21 races checked. Nothing that shipped since removed it (§4).

---

## 1. THE HIT LIST — watch one of these

**How to reproduce:** Quick Test, the track and field size named, the seed typed into the seed field.
`u` is the run-in's own progress parameter — **0 when the closing window opens, 1 at the line** — so
"u 0.771–1.000" means *from three-quarters of the way through the closing move, right to the finish.*

### The winner himself, still off canvas at the line

| track | racers | **seed** | frames off | u-window | which edge |
| --- | --- | --- | --- | --- | --- |
| **river-run** | 20 | **49** | **99** | 0.000–0.997 | top |
| **river-run** | 20 | **23** | **92** | 0.759–0.993 | top |
| river-run | 40 | 30 | 81 | 0.750–0.997 | bottom |
| river-run | 20 | 32 | 77 | 0.794–0.996 | bottom |
| **mountainstreet** | 20 | **13** | **59** | 0.828–0.996 | bottom |
| river-run | 40 | 23 | 37 | 0.899–0.997 | top |
| luger-hill | 40 | 11 | 35 | 0.901–1.000 | top |
| river-run | 20 | 55 | 30 | 0.915–0.998 | top |
| mountainstreet | 20 | 34 | 26 | 0.927–0.997 | top |
| seatrack | 20 | 5 | 26 | 0.930–0.999 | bottom |

**Start with river-run 20 seed 49** — the winner is outside the frame for 99 frames of the closing
move, off the **top**.

### dirt-oval at 20, where he saw it — a top-3 finisher off at the line

| track | racers | **seed** | position | frames off | u-window | edge |
| --- | --- | --- | --- | --- | --- | --- |
| dirt-oval | 20 | **195** | P3 | 128 | 0.000–0.996 | left/top |
| **dirt-oval** | 20 | **230** | **P3** | **118** | **0.771–1.000** | **left** |
| dirt-oval | 20 | 23 | P3 | 117 | 0.765–0.999 | left |
| dirt-oval | 20 | 157 | P3 | 112 | 0.783–0.999 | left |
| dirt-oval | 20 | 184 | P3 | 98 | 0.823–1.000 | left |
| dirt-oval | 20 | 140 | P3 | 92 | 0.813–1.000 | left |
| dirt-oval | 20 | 157 | P2 | 88 | 0.830–0.999 | left |
| dirt-oval | 20 | 109 | P2 | 84 | 0.833–1.000 | left |

**`dirt-oval`, 20 racers, seed 230 is the cleanest case in the whole sweep** — the third-place
finisher is off the **left** (i.e. **behind**) for 118 consecutive frames, from u 0.771 to the line,
one unbroken window. It is the case used for the then-versus-now test in §4.

### One strong case per track

| track | racers | seed | position | frames off | edge |
| --- | --- | --- | --- | --- | --- |
| dirt-oval | 20 | 195 | P3 | 128 | left/top |
| space-sprint | 40 | 29 | P3 | 124 | top |
| seatrack | 20 | 45 | P3 | 118 | top |
| luger-hill | 40 | 24 | P3 | 114 | bottom/right/left |
| river-run | 40 | 4 | P2 | 114 | bottom |
| ice-track | 40 | 14 | P3 | 110 | left/bottom |
| searound | 40 | 39 | P3 | 102 | top |
| mountainstreet | 20 | 59 | P2 | 101 | bottom |
| city-circuit | 20 | 45 | P2 | 99 | right/bottom/left |

---

## 2. The definitions, and why each follows from his sentence

His sentence: *"a racer in the top places who was outside the camera at the finish."*

**"TOP PLACES" — not chosen. Reported per finishing position, 1 to 5, so he draws the line.** He said
"not only the winner", so picking a cut-off would be inventing the thing he declined to specify. The
table below is the answer; every position is reported separately.

**"AT THE FINISH" — the closing stretch, in the schedule's own unit.** The frames on which the run-in
is composing, measured by `_runInProgress`, which is **0 exactly where the closing window opens and 1
exactly at the line** (`CameraDirector.js:3634`, and it is clamped monotone). That is the schedule's
own parameter, not a progress threshold chosen here.

**"OUTSIDE THE CAMERA" — reported as OFF and CLIPPED separately, and tested on the BODY.** A
centre-in-frame test has misled this project before — LABEL-OVERLAP-3 read a shot as tight when it
was the widest of the race — so each racer is bounded by a circle of radius half his **larger** drawn
dimension, projected with the renderer's own transform (`renderRaceFrame.js:129/132/153`):

- **OFF** — the whole bound is outside the canvas. **Nothing of him is drawn.**
- **CLIPPED** — the bound crosses an edge. Part of him is drawn, part is not.

Using the *larger* dimension makes OFF a conservative claim: a racer counted as off canvas is off it
on any reading.

### Per finishing position — 1,260 races

| finishing position | races with him **OFF** | races with him **CLIPPED** | median frames off, when off |
| --- | --- | --- | --- |
| **P1 (winner)** | **126 (10.0%)** | 335 (26.6%) | 33 |
| P2 | 153 (12.1%) | 530 (42.1%) | 39 |
| P3 | 234 (18.6%) | 700 (55.6%) | 52 |
| P4 | 376 (29.8%) | 826 (65.6%) | 60 |
| P5 | 546 (43.3%) | 971 (77.1%) | 68 |

**The gradient is the finding in one line: the further back a top-5 finisher placed, the more likely
he spent the finish outside the picture.** Clipping is not marginal either — better than half of all
third-place finishers are cut by an edge at some point in the closing stretch.

---

## 3. The mechanism — **TWO faults, not one, and they do not overlap**

Grouping every hit by **when** the racer was off canvas produces a perfectly clean split:

| | **GROUP A — the opening transient** | **GROUP B — lost to the back edge** |
| --- | --- | --- |
| hits | 250 | **1,185** |
| when | off **only** at the window opening, u ≤ 0.05 | **still off at the line**, u > 0.90 |
| positions | **P1 ×114**, P2 ×63, P3 ×41, P4 ×20, P5 ×12 | P5 ×534, P4 ×356, P3 ×193, P2 ×90, **P1 ×12** |
| edges | **right 52%**, bottom 31%, top 15%, left 2% | **left 42%**, top 33%, right 13%, bottom 12% |
| camera anchored on him | 1.9% | **0.0%** |
| anchored on somebody else | 82% | 4% |
| no single anchor at all | 16% | **96%** |
| races affected | — | **616 of 1,260 (48.9%)** |

**GROUP C — anything in between — is EMPTY. Zero hits.** The two groups are not two ends of one
distribution; they are two different events.

**GROUP A is the run-in's opening glide.** It fires at u ≈ 0, it hits the FRONT of the field
(P1 is the single largest group), it throws them off the **right** — ahead — and on 82% of its frames
the camera is anchored on somebody else. This is the shot swinging to its new framing: for about half
a second the leader is outside the picture he is about to be the subject of.

**GROUP B is the one that matches his complaint, and it is the forward view's own cost.** It hits the
BACK of the top five (P4 and P5 are 75% of it), throws them off the **left** — behind — and on **96%
of its frames there is no single anchor at all**. The racer is **never** the subject: `anchoredOnHim`
is **0.0%**. He is simply behind the leader by more than the frame holds behind the leader.

**WHICH TERM SET THE WIDTH, across all 86,997 off-frames:**

| term | frames | share |
| --- | --- | --- |
| **`state`** | 82,931 | **95.3%** |
| `guarantee` | 3,147 | 3.6% |
| `company` | 917 | 1.1% |
| `guarantee-after-cap` | 2 | 0.0% |

**The code path, named.** The width on 95.3% of these frames is `_stateCamZoom()` — the active shot's
own zoom factor — composed in `_setTargets` and, through the endgame, the value
`_scheduleClose` closes toward. Where the racer sits relative to it is decided by the leader's
placement in frame, `_forwardFracNow` / `leaderForwardFrac`: the leader is placed behind the middle
so that most of the frame lies ahead of him, which is exactly the owner's forward-view requirement,
and it leaves correspondingly little frame behind him. **Group B is that trade-off, measured.** It is
not the contender set: the contender guarantee accounts for 3.6% of these frames, consistent with
RUNIN-CONTENDERS-1's finding that the set decides the width on 3–5% of closing frames.

**Per track and field size — hit races (any top-5 finisher fully off):**

| track | 20 racers | 40 racers |
| --- | --- | --- |
| city-circuit | 23/60 (38.3%) | 38/60 (63.3%) |
| dirt-oval | 73/240 (30.4%) | 36/60 (60.0%) |
| ice-track | 25/60 (41.7%) | 44/60 (73.3%) |
| luger-hill | 31/60 (51.7%) | 40/60 (66.7%) |
| mountainstreet | 35/60 (58.3%) | 16/60 (26.7%) |
| river-run | 41/60 (68.3%) | 34/60 (56.7%) |
| searound | 21/60 (35.0%) | 41/60 (68.3%) |
| seatrack | 47/60 (78.3%) | 33/60 (55.0%) |
| space-sprint | 36/60 (60.0%) | 49/60 (81.7%) |

**dirt-oval at 20 — where he saw it — is the LOWEST rate in the whole table.** It is not a
dirt-oval problem; it is everywhere, and it is worse almost everywhere else.

---

## 4. Then versus now — **the fault is present on BOTH trees**

**The brief's premise needed checking first, and one third of it was wrong.** Of the three things
named as having shipped in between, **`SEED-REAL-RACE-1` was ALREADY on master on 2026-08-23** —
`racePlanSeed: startSeed` is present in the 2026-08-23 tree. Only two shipped after that date: the
Race Action stages and the run-in names, both confirmed absent there (`raceActionStage.js` and
`runInArrived` do not exist at `07956299`).

**The test.** The cleanest hit — `dirt-oval`, 20 racers, **seed 230**, third place off canvas for 118
frames — was run against `07956299` (master as it stood on 2026-08-23, taken with `git archive` so no
worktree registration was involved) and against master today, with the **same instrument** copied
into both trees.

| | THEN (2026-08-23) | NOW (today) |
| --- | --- | --- |
| P1 | off 28, clipped 4, u 0–0, right | **identical** |
| P2 | off 21, clipped 5, u 0–0, right | **identical** |
| **P3** | **off 118**, clipped 20, u 0.7706–1, left | **identical** |
| P4 | off 142, clipped 13, u 0.7235–1, left | **identical** |
| P5 | off 174, clipped 16, u 0.6604–1, left | **identical** |
| closing frames | 585 | 585 |

**Widened to 20 more races: 21 of 21 byte-identical, 4 hits on each tree.**

**SO NOTHING REMOVED IT, AND THERE IS NOTHING TO BISECT.** A bisect over the three ships would be
theatre: the fault is present on both trees, so no ship can have removed it. **Today's
non-reproduction is about the seed or the settings, not about the tree.** That is consistent with
what the three changes are: the Race Action stages bite only at a non-quiet stage and the default is
quiet; the run-in names change what a label says; and the seed change affects the browser's Start
Race path, which a harness that passes seeds explicitly never uses.

**What this means for him practically:** the race he remembers is almost certainly still there — under
a seed he no longer has, because before `SEED-REAL-RACE-1` a normal Start Race drew no recoverable
seed. The hit list in §1 is the replacement: those seeds are typed in and reproduce.

---

## 5. What the sweep could not support

- **`garden-path` is entirely unmeasured. 0 of 120 races produced a finishing order** — it does not
  finish inside the harness's frame budget. This is the third separate sweep this week in which that
  track has vanished, and every figure above rests on **nine** tracks.
- **This is a search, not a rate estimate**, as instructed. The per-position percentages are honest
  for this corpus — 1,260 races, 240 seeds on dirt-oval 20 and 60 seeds on each other cell — but the
  seeds are consecutive integers from 1, not a random sample, and the tracks are unequally weighted.
- **Everything is headless.** The harness drives the real `CameraDirector` but not the real frame
  loop; the camera's own record says no instrument has ever run the browser's camera. A
  frame-timing-dependent effect would not appear here.
- **The body bound is a circle on the larger dimension**, not the rotated sprite rectangle. It makes
  OFF conservative and CLIPPED generous; a racer counted CLIPPED might be fully visible if his long
  axis happens to lie along the edge.
- **Group A's cause is inferred, not proven.** Its signature — u ≈ 0, front of the field, off the
  right, anchored elsewhere — matches the opening glide, but no glide-internal quantity was read.

---

## 6. Source hygiene, and verification

**Read-only.** No production file was touched. The diff is this report, its INDEX line, and three
diagnostics under `scripts/diag/`.

**No fingerprints, no browser gate, no client suite — and that is a reason, not an omission.**
Nothing changed that any of them can see: the four instruments hash the RACE, the DIRECTOR's
decisions and the DRAW CALL SEQUENCE from the shipped defaults, and this block alters none of those.
`npm run verify`'s own routing selected only the document guards and the script suite, which is
routing confirming the claim rather than the claim asserting itself.

**Nothing is reconstructed.** The binding term is read from the director's own `_framingProbe.binding`,
the anchor from `anchorRacerIndex`, the closing-stretch parameter from `_runInProgress`, and the
screen transform is the renderer's own. **The harness is committed** rather than discarded, under
CLEANUP-2026-08-24's proposal 3 — a sweep whose numbers appear in a document should land with it.

**Machine and pool:** `os.cpus().length` = **14 logical cores**; pool sized at `min(16, cores − 2)` =
**12**, the project's own convention. 1,260 races in roughly nine minutes across two phases.

| guard | result |
| --- | --- |
| `check-doc-links` · `check-index` · `check-config-claims` · `check-language-closed` · `script-suite` | PASS |

---

## 7. Build vs spec — conformity

| the spec asked | status |
| --- | --- |
| search and diagnose only; change nothing | **done** |
| state the three definitions up front, with reasons | **done** — §2, before any number |
| report per finishing position so he draws the line | **done** — §2 table, P1–P5 |
| report OFF and CLIPPED separately | **done** — both columns, body-based test |
| dirt-oval at 20 first, then other tracks and 40 | **done** — 240 seeds on dirt-oval 20, then 60 seeds on every other cell |
| say how many seeds were swept | **done** — §5 |
| per hit: seed, track, size, position, frames, where, which term set width and anchor | **done** — §1 and §3, all read from the probe |
| one mechanism or several? name or group them | **done** — §3: **two**, disjoint, Group C empty |
| then-versus-now on the cleanest hit | **done** — §4, byte-identical; **no bisect, because nothing was removed** |
| if present on both trees, say so plainly | **done** — §4 |
| read the core count and size the pool | **done** — 14 → 12 |
| no fingerprints, browser gate or client suite, with the reason | **done** — §6 |
| hit list FIRST and prominent | **done** — §1 |
| push the branch; merge the report only | **done** |

**One correction to the brief, flagged rather than absorbed:** `SEED-REAL-RACE-1` had already shipped
by 2026-08-23, so only two of the three named changes are candidates at all — and neither removed
anything.

---

## 8. PROPOSALS — candidate directions, each costed against the forward view

**His requirement that the leader drifts back behind the middle so one can see ahead is NOT under
revision. Every cost below is stated against it.**

**1. Group A and Group B should never be worked on together.** (Mine.) They share a symptom and
nothing else: opposite edges, opposite ends of the field, opposite moments, and an empty gap between
them. A single "keep the top five in frame" change aimed at both would be tuned against two
populations at once — which is how this strand has been burned before. **Cost of ignoring this:** a
fix that improves one and is scored on the sum of both.

**2. Group A is the cheaper and safer of the two, and it hits the WINNER hardest.** P1 is its largest
group (114 of 250 hits) and its window is short — a median of 29 frames at u ≈ 0. It is the opening
glide, which already has its own duration key. **Cost against the forward view: none.** The glide
happens before the forward-placed framing is established, so lengthening or easing it takes nothing
from the room ahead of the leader. **This is the one direction in this report that does not trade
against his requirement.**

**3. Group B cannot be fixed without paying the forward view, and the price should be stated before
anyone tries.** 96% of its frames have no anchor and 0.0% have the missing racer as subject: he is
off the back edge because the frame's room is ahead of the leader. Buying him back means either
widening the closing shot — which shrinks the finish he asked to be close — or moving the leader back
toward the middle, which is the requirement itself. **There is no third option in the geometry**, and
RUNIN-LINE-1 already established that the two ends of the close cannot both be moved freely.

**4. "How many top-5 finishers were visible at the line" is the number this project lacks.** (Mine.)
It took 1,260 races to find out; the director knows the finishing order and its own transform at the
line, so the count is available for free at the moment the race ends. Having it per race would turn
this class of question from a sweep into a lookup — and it is the number his eye is actually
computing when he says a finish felt wrong. **Cost:** none to the picture; one more instrument to
keep honest, and §6 of RUNIN-NAMES-1 is the standing warning about instruments that go blind.

**5. `garden-path` has now failed to finish in three consecutive sweeps and should be looked at
once.** (Mine.) 0 of 120 races here, 0 of 16 in RUNIN-CONTENDERS-1. Either the harness's frame budget
is too short for it or the track genuinely does not finish under these settings — and nobody knows
which, while every closing-stretch measurement quietly rests on nine tracks. **Cost:** nothing to the
forward view; it is a harness question, and it is cheap.

**6. The CLIPPED column may matter more than the OFF column, and nobody has asked him.** (Mine.)
55.6% of third-place finishers are cut by an edge at some point in the closing stretch, against 18.6%
fully off. A half-drawn racer at the frame edge may read as "not in the picture" to a viewer exactly
as a missing one does — or may not matter at all. **This report deliberately does not guess**, which
is why the two columns are separate. **Cost of finding out:** one question, and the hit list in §1
already contains cases of each kind to look at.
