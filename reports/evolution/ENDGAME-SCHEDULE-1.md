# ENDGAME-SCHEDULE-1 — the endgame is a SCHEDULE, not a ceiling

**Branch:** `exp/endgame-schedule`, off master at `182fa3ac`. **Not merged. Nothing minted.**
Answers the specification of 2026-08-23. Supersedes the shape in ENDGAME-SETTLE-1, which he
rejected for standing still.

---

## 0. The answer

**Every ceiling the endgame has ever used is a BOUND, and a bound has no opinion about motion.** The
picture stops whenever the bound does — which is exactly what he saw. Lengthening the phase, as the
last attempt did, bought more standstill rather than more movement, because nothing in the design
was ever responsible for the shot MOVING.

**A schedule is responsible for exactly that.** It is a position for every frame, moving through the
whole phase and arriving at a stated place at a stated moment. Two smoothstep segments meeting at
`endgameThreshold`: WIDEN to the narrowest width that shows the winner and the line, finishing at
his 95% deadline; then CLOSE to the leader-view or photo-finish factor, landing at the crossing.

| requirement | today | **winner** |
| --- | ---: | ---: |
| **STANDSTILL** — share of the spec window (his config) | 43% (worst 61%) | **17% (worst 24%)** |
| **STANDSTILL** — longest static run, both arms | **2017 ms** | **550 ms** |
| **MONOTONICITY** — closes and never re-opens | 9/9 | **9/9** his · 8/9 shipped |
| **SMOOTHNESS** — worst \|d²ln(width)/dt²\| | 78.3 | **13.1** his · **11.6** shipped |
| **ARRIVAL** — worst error vs the leader/photo-finish factor | 48% | **6%** |
| **TIMING** — winner + line visible by 95% | **0/9** | **9/9 on both arms** |
| **WIDTH** — widest endgame frame, median | 6.1 corridors | **4.4** his · **5.4** shipped |
| racers cut — contender-off-canvas frames | 59 · 109 | **35 · 33** |

**All seven requirements are met on his config.** One track (river-run, shipped defaults only)
re-opens by 1.23% over 3 frames; §6 names it.

---

## 1. His diagnosis was right, and here is the number behind it

`scripts/diag/endgame-spec.mjs` measures the seven requirements separately and never blends them.
The window is **race progress [0.95, the crossing]** — the span requirements 1 and 2 bracket — and it
is a property of the RACE, identical across arms, so a candidate cannot flatter itself by engaging
later and measuring fewer of its own bad frames.

**The standstill threshold is this project's own number, not a new one.** RUNIN-HOLD-1 measured the
crawl it existed to remove as "roughly 95 px/s of picture flow, below the rate at which anything
reads as movement". A zoom change moves a point at the frame edge — 640 px from centre — at
`640 × |d ln(width)/dt|`, so

> **STANDSTILL ⟺ |d ln(width)/dt| < 95/640 = 0.1484 ln/s**

On that measure **today stands still for 43% of the endgame, with a longest single freeze of
2.0 seconds.** That is what he was looking at.

---

## 2. The design, and why each part is forced

```
p < 2·threshold − 1     nothing. The ordinary racing shot.
p ∈ [·, threshold]      WIDEN  — smoothstep from the current shot to the narrowest width that
                                 shows winner AND line, FINISHING at the threshold
p ∈ [threshold, 1]      CLOSE  — smoothstep to the leader-view (0.75 corridors) or photo-finish
                                 (0.4) factor, parameterised by progress so it lands at the crossing
```

- **The deadline is `endgameThreshold` = 0.95**, because requirement 1 makes that instant a
  deadline. The move that makes both visible must be **finished** there, not started there — which
  is why the run-in now begins *before* the threshold rather than at it.
- **The endpoint is one of his two named factors**, `_leaderZoom` or `_photoFinishZoom`, and
  explicitly **not** `_stateCamZoom()`: during the endgame the director may still be running
  OVERVIEW, whose zoom is far wider, and aiming at it would let the endpoint move under the ramp.
- **Smoothstep** is C¹ with a bounded second derivative, so requirements 3 and 6 hold by
  construction. Its rate is zero at exactly two instants: the **turn**, where any continuous camera
  must pass through zero whatever curve it uses, and the **arrival**, which is what landing on a
  value means. Requirement 7 permits the first; requirement 2 requires the second.
- **Log space**, because a scale change is perceived logarithmically.
- **The widen may not take more of the race than the close does** — `2·threshold − 1`, i.e. 0.90 at
  the shipped 0.95. Derived from the existing key and symmetric; see §4 for what it costs to omit.

**Nothing per-track. One rule, ten tracks. No new tuning number:** the two constants are his own
`endgameThreshold` and `runInOpenMs`, and §5 shows the second barely matters.

---

## 3. Requirement 5 is what made this solvable

Every earlier attempt was built on "the line stays framed", and §64's impossibility proof assumed
it. He has retired that: the viewer only needs to **know where the line is**.

So the line is guaranteed inside **`COMPANY_FRAME_PCT` (0.9)** — this project's own constant for
"in frame, near the edge is acceptable", the region a *companion* must sit inside — instead of the
subject's `innerFramePct` (0.7). That is **1.11× of width instead of 1.43×**, and it is the whole of
requirement 4's saving.

**1.0 was tried first and is the cheaper-looking wrong answer.** It puts the line exactly ON the
frame edge, where the pan's own lag takes it straight back out: requirement 1's deadline failed on
2 of 3 probe tracks with the line a few pixels outside. The 11% is what buys the deadline.

**After the deadline the line is free to leave**, and it does. The viewer knows where it is because
he was shown it at the deadline, the minimap carries the mark throughout, and the distance is
visibly shrinking.

---

## 4. Four defects the measurements found, each of which would have shipped silently

1. **The schedule was competing for the width instead of owning it.** As one more entry in
   `_setTargets`'s `Math.min`, any wider term overrode it and the picture sat against *that* bound,
   motionless. Measured on mountainstreet: the shot held OVERVIEW's 800 px from 94.9% to 97.0% of
   the race and then **dived at −2.3 ln/s** the frame the state changed — standstill and abruptness
   from one cause. The schedule now **replaces** the `state` term for the phase; the geometric
   guarantees are untouched.
2. **The anchor never travelled.** `_runInSweepU` has no "release" in a scheduled endgame, so it
   returned 0 forever and pinned the leader at the *mirror* of his framing position for the whole
   phase. The shot arrived at the crossing correctly sized and pointed in the wrong place.
3. **The room was measured from where the framing rule INTENDS the subject, not where he is.** The
   world-edge clamp displaces the pan, and on an open track the finish sits at the world's end —
   exactly where that clamp bites hardest. The schedule matched its own demand to the pixel
   (741 = 741) and the line still sat **44 px past the right edge** at the deadline. It now measures
   from the anchor's actual screen position under the camera last drawn with: one frame stale,
   self-correcting, and it replaces an assumption with an observation.
4. **The engagement stepped the anchor and the zoom-only harness could not see it.**
   `_forwardFracNow` flips from `leaderForwardFrac` to its mirror at that instant, every guarantee
   measures its room from that position, and the shot **jumped 5.67× in one frame**. The director's
   own suite caught what the harness could not. `_beginRunInGlide` — the existing, tested absorber,
   already `runInOpenMs` long — now runs at engagement, so the glide *is* the opening move.

---

## 5. The attempt table

One line each. Nine scorable tracks (garden-path's race never finishes at seed 9), seed 9,
100 racers open / 40 closed, both arms.

| # | what was tried | verdict |
| --- | --- | --- |
| 1 | **Schedule, two smoothsteps, endpoint = live `_stateCamZoom()`** | wide states pinned it; 43% standstill, −2.3 ln/s dive at the state change |
| 2 | Endpoint = `_leaderZoom`/`_photoFinishZoom`; schedule **replaces** the state term | standstill 43→19%; mountainstreet still missed the deadline |
| 3 | `_runInSweepU` released on the close | anchor travels again; jerk 15.3 → 13.5 |
| 4 | Line guaranteed at `innerFramePct` **1.0** | line sits ON the edge; deadline failed 2 of 3 probes |
| 5 | Line at **`COMPANY_FRAME_PCT` 0.9** | **kept** — deadline holds, 1.11× instead of 1.43× |
| 6 | Demand measured from the anchor's **actual** screen position | **kept** — deadline 9/9 |
| 7 | **Follow the schedule directly** when it binds (no first-order chase) | **kept** — longest standstill 1117→550 ms, deadline 7/9→9/9 |
| 8 | …the same, **without** it (chase retained) | 26%/45% standstill, 1117 ms, req1 7/9 — the snap earns its place |
| 9 | **Ratchet** the close (never wider than it has been) | **kept** — monotone 9/9, and see §6 |
| 10 | **Floor** the close at the widest contender demand since the deadline | seatrack standstill 17→57%, 1333 ms freeze, arrival 141% wide — dropped |
| 11 | Do nothing about reversals | space-sprint re-opens 4 frames; dropped in favour of #9 |
| 12 | Widen length `runInOpenMs` **800 / 1800 / 2500 ms** | indistinguishable from 1250 on every metric — **his 1250 stands** |
| 13 | Deadline **0.93** | req1 9/9 → **3/9**, width 4.4 → 6.1 corridors, 8 tracks wider — dropped |
| 14 | Deadline **0.90** | req1 **1/9**, width 8.3 corridors, 9 tracks wider — dropped |
| 15 | Engagement bounded to `2·threshold − 1` | **kept** — see §4, without it one early frame owns the whole race |
| 16 | `_beginRunInGlide` at engagement | **kept** — removes the 5.67× one-frame jump |

**Two results worth keeping even if the design changes again:** his `runInOpenMs` is already right,
and **moving the deadline earlier is strictly worse on every requirement at once** — earlier means
the line is further, so the opening must be wider (requirement 4) *and* the close starts before the
line is visible (requirement 1). 0.95 is not a compromise; it is the optimum.

---

## 6. The one conflict, named and priced

**Requirement 3 (never re-open) meets his standing rule that all participants stay visible
(CONTENDER-ZOOM-1, his own words).** As a pair spreads at the line, the contender guarantee asks for
width the schedule has already closed past. Something must give.

| | monotonicity | racers cut (contender-off-canvas frames, his · shipped) |
| --- | --- | --- |
| today | 9/9 | 59 · 109 |
| schedule, no ratchet | 8/9 | 34 · 26 |
| **schedule + ratchet (shipped)** | **9/9 his, 8/9 shipped** | **35 · 33** |

**The ratchet was rejected once on a misreading, and the correction matters.** The baseline runs
that said "0 cut frames" **predated the counter** — the field was absent and read as zero. Against
that phantom the ratchet looked like it was buying monotonicity with racers. Measured properly it is
doing the opposite: **it cuts far fewer contenders than today does**, on both arms, because the
schedule's shot is wider than today's through the part of the endgame where the field is still
spread. *A metric that is missing must never be read as good.*

**What still fails:** on the **shipped defaults only**, river-run re-opens **1.23% over 3 frames**
(50 ms). Under his own config it does not. That is the one place requirement 3 is not met, and its
size is stated rather than rounded away.

---

## 7. Fingerprints, tests, hygiene

| role | recorded | measured on this branch | |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **unmoved** |
| world-off | `854018ee5d3d83e1` | `854018ee5d3d83e1` | **unmoved** |
| camera | `f64c2ae531f14253` | `184dbbc30702d181` | moved — a camera change must |
| render | `7d553406f41ff176` | `75964fe992bca496` | moved — the render fingerprint reaches the finish |

**Nothing minted. His eye is owed.**
- **CAMERA and RENDER move**, as a camera change must. Measured fresh, **not minted**.
- **`npm run verify` green.** The camera suite is **390 passing**.
- **Nineteen existing tests moved, and none was deleted.** Eleven describe hold-then-sweep, which is
  still in the director behind `runInSchedule: false` — they are **pinned to that arm**, so they
  still guard real code. Eight were generic machinery (OVERVIEW convergence, the dt-scaled lerp, the
  D6 probes) whose fixture puts the leader at `t = 1.0` with `finishT = 1.0` — **on the finish line,
  where the endgame owns the width by design** — and are pinned for the same reason.
- **Four new tests** pin what makes it a schedule: the placed value is monotone through the close;
  the endpoint is one of his two factors and nothing else; a wider state does not pin it; it cannot
  engage early. End-to-end monotonicity and arrival are established by the ten-track measurement,
  not by a two-racer fixture, and the tests say so.
