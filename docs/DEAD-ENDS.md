# DEAD-ENDS — approaches already tried, and why they were dropped

**Purpose.** One exclusion list so no ideation round (Plan-Claude, CC, Copilot, owner) re-proposes
a mechanism the project already built, measured, and retired. **Read this before proposing any
race-mechanism change, and before any diagnosis — the git history is the first source, not the
last resort.** Distilled from the full git history (997 commits, 2026-04-19 … 07-26),
docs/LESSONS.md (183 lessons), and reports/. Living document — append, never silently drop.

## The frame (read first)

- **The servo is NOT a failure.** The shipped servo world (`@ce73592`) is the ONLY working solution
  to date: fair (band-reach and zero Holm-unfair rows, both to the gate in [FAIRNESS.md](FAIRNESS.md)), _some_ action, physics envelope respected.
  Every attempt to replace or substantially improve it has so far produced nothing measurably better.
  It stays shipped until something beats it on a measurement. The goal is to IMPROVE it, not disprove it.
- **The pillars (non-negotiable).** Identical racers (one type per race). Simultaneous mass start from
  staggered start rows. Fair = equal win-chance from every start row, provable per race. Action = real
  position fights incl. honest blocking. Continuous honest motion, zero overlap. One rule set for all
  tracks. Simple and clean.
- **The core hard problem.** With identical racers a lucky early leader on clear track cannot be caught
  by an equal-speed pack, so it escapes and the front row wins — unless something stops that. The servo
  stops it by secretly steering each racer to a random target rank: fair, but scripted (Lessons 181/182).

## STRUCTURAL FINDING — some of the unfairness is in the TRACK, not the mechanism

The M1/M2 sweep (2026-07-11) found the fairness-gate blocker on luger-hill and searound is a
**pre-existing baseline start-row bias built into those track geometries — not the action mechanism
on top.** Consequence: any new concept must be measured for start-row fairness on BOTH an open and a
closed track, because a mechanism can look fair on one geometry and fail on another for reasons that
have nothing to do with the mechanism. This is the same open/closed split that later killed Evolution
Act 2 (Lesson 182).

---

## A. Overlap / traffic physics — WORKS, shipped, the honest-motion base (not a dead end)

Took many iterations to get right; listed so nobody rebuilds it. This is the reusable foundation for
any concept: continuous motion, zero pass-through.

- **brake-to-match-and-hold** (2026-06-05) replaced the fixed-% speed brake — a racer matches the
  speed of the one ahead and holds station rather than braking blindly.
- **Geometric gate + body-based speed-brake** (2026-06-08) — non-penetration in real body units, both axes.
- **hard separation as pure backstop** (2026-06-25) — L4/L5 hard separation kept active by default;
  fixed an open-track fairness regression.
- **OVL-C sustained-overlap escape** (2026-06-20) — a free-side lateral impulse so a locked pair
  separates from both sides at once.
- **look-before-brake / look-ahead lane-change** (2026-07-03/04) — take a free lane and pass at speed
  instead of braking first; brake only when no lane is free. Clearance-coupled, non-penetration structural.
  **This is exactly the honest blocking/overtake behaviour the pillars want** — reuse it.

## B. Servo-internal ACTION mechanisms built, measured, and REMOVED

Each was a real, shipped-capable lever, swept, found NOT to be the winning mechanism, and deleted
(recoverable in git). Do not re-propose without new reasoning.

- **Rubber-band (elastic pull to field median)** — early version removed 2026-07-07 Stage 1. A later
  **"cap-the-lead" redesign** (median-gap proportional brake on the leader, 2026-06-30) was also
  built and did not become the answer.
- **PULK-surge** (forward surge pass for the pack) — shipped ON briefly, then removed 2026-07-07
  Stage 2; the cohesion bias already did the work.
- **Show-target / Rank-Proto** (rank-space controller, 2026-07-06) — removed Stage 3. Steering RANK
  not position is a dead end (Lesson 172).
- **Governor family** — multiple variants built and retired: progressive rubber-band field, dead-zoned
  edge-limiter, ahead-median cohesion **leader-brake** (retired Stage C 2026-07-05), **TAIL-LIFT**
  (removed Stage 4). A limiter/cap cannot create a contest (Lesson 160).
- **contest-injector (rank-blind director spotlight)** (Stage A1, 2026-07-05, default OFF) — did not win.
- **Classic reactive director** (removed 2026-07-13 S4) — replaced by hero choreography.
- **M1 PulkFrontContest + M2 pack-spring** (2026-07-11) — M1 feasible-but-not-winning, **M2 pack-spring
  NOT feasible**; both removed CLEANUP S1. ("Pack-spring" = a spring binding the pack — note for anyone
  re-proposing "just hold the field together with a spring": already found infeasible.)
- **PulkRaceDirector** (predecessor group-contest engine) — removed CLEANUP S2 2026-07-13.
- **Lead rotation, pack release, universal band-arrival, Carousel** (removed 2026-07-23) — front
  lead-swap engine, pack-release servo branch, universal band-arrival force, role-biased front rotation.
  All proven dead, fingerprints unchanged. Carousel recoverable at archive/carousel-sweep-final.
- **Comebacker pre-arm** (removed 2026-07-15).
- **Front-distance Leash** (sim-only 2026-07-20, never shipped, REJECTED) — continuously braking the
  leader to the floor. Made runaway WORSE (braked leader dumped into pack, fresh escapee promoted).
  **Owner's deeper reason: braking "the leader" also brakes the 2nd-place racer, himself a leader vs the
  rest — it brakes the whole front, not just the breakaway.** Do not re-propose continuous leader braking.

## C. Start-row / dormant experiments deleted (2026-07-09)

Built behind flags to make the start row fair by direct manipulation, none won, all deleted:
**TEF**, **ROW_SPLIT**, **V4 start-row** (startRowBoostMult), **tier2**. Direct start-row boosting was
tried and did not produce provable row-fairness.

## D. Greenfield replacements tried and dropped (2026-07-25/26)

- **EVOLUTION Act 1 — assignment-follows-field** (reverted). Target rank follows the live field. Broke
  the fairness floor AND deadened the finale. **Lesson 181:** fairness and finale contest are the SAME
  static-slot restoring force — weakening the pull removes both.
- **EVOLUTION Act 2 — finale front-compression, fixed + adaptive** (reverted). Scheduled-dice front
  tightening in the finale window. Same global dose did OPPOSITE things open vs closed. **Lesson 182:**
  no single track-agnostic finale-dice law lifts both topologies (structural physics — open re-expands,
  closed churns).
- **Handicap-Pursuit** (greenfield, retired). Stagger grid by ability. **Moot: racers are identical.**
  Reusable asset proven: overlap-free 2D traffic core (0 violations). **Lesson 183.** Recoverable at
  archive/handicap-pursuit-089c7d2.

## E. Ideas killed by owner experience BEFORE rebuild (2026-07-26)

- **Time-staggered / pursuit start** — REJECTED: opposite of action; released apart, each runs clear
  track alone. Mass simultaneous start is mandatory.
- **Different abilities / any handicap** — moot; identical racers.
- **Drafting / slipstream to bind the pack** — **ALREADY BUILT and shipped** (`draftingBoost`/cone/
  max-distance in raceBehavior.js) and it did NOT solve it. Reason (owner): draft acts only a few metres
  behind the leader (finite range) — once a breakaway is GONE there is no draft to pull chasers up, so
  **the draft cannot catch a breakaway.** It keeps an already-tight pack tight; it cannot re-gather an
  escaped leader. Draft was present FIRST, before the servo, and still did not suffice.

## F. The deepest walls (constraints behind the specific failures)

- **Lesson 160** — a limiter/cap cannot CREATE a contest, only bound one.
- **Lesson 172** — steer position, never rank.
- **Lesson 178** — action lives in ORCHESTRATION, not liberation; freeing the servo just settles the field.
- **Lessons 181 / 182 / 183** — (above).
- **New (2026-07-26, owner + code-verified; wording made precise 2026-07-29 after COMBO15 shipped)** — with
  identical racers, a breakaway once formed cannot be reeled in by ANY continuous physical force (draft has
  finite range; braking the leader brakes the whole front — STEER-CAP-1 reconfirmed this from the other side:
  capping the boost to close the gap WIDENED it, Lesson 189). That physical-force impossibility STANDS. What
  the original bullet under-enumerated is the _class of non-physical-force solutions_: a mechanism does not
  have to CATCH the breakaway or PREVENT it — it can make the breakaway **irrelevant to the FAIRNESS result**
  by shaping the re-roll DRAW so the finishing order lands each racer in the band of its drawn place
  regardless of who led the chaos. **This is the shipped answer (COMBO15, 2026-07-29):** the leader may still
  break away in chaos, but the band-aware draw bias redistributes the FINISH into drawn bands (arrival
  85–90%), so the escape stops deciding the race without ever being physically caught. So the precise wall is:
  PREVENT a breakaway (hard coupling / format), OR make it irrelevant to the result — either by FORMAT
  (elimination = drama at the back; sector scoring = many finish lines; re-pack/restart = reset the field) OR
  by DRAW (bias the re-roll toward the drawn band, the Cliff Law's correct sign, Lesson 184) — but NEVER by a
  continuous physical force that tries to catch it after the fact.
- **Project Principle 9** — the camera is not a solution; action must exist in the physics.

## G. The action / fair-arrival line (2026-07-27 … 07-29) — what died so COMBO15 could ship

The multi-week hunt that ended in the shipped COMBO15 world (chaos steer + band-aware re-roll bias + 0.15
chaos window, master `@175a475`, tag `v-ship-combo15`). These are the retired arms; the SHIPPED mechanism is
documented in [FAIRNESS.md](FAIRNESS.md) and [../reports/parity/REBASELINE.md](../reports/parity/REBASELINE.md),
not here.

- **Admission-only action family (ACTION-BUILD-4 … 7 + ACTION-NIGHT-1) — FOUR kills, DEAD.** A series that
  tried to manufacture sustained P1 uncertainty from the ADMISSION side only (frozen runtime budget): authored
  traffic density, open-lane invariants, lane-conditional skips, proximity floors, authored cast/order. Each
  improved a fairness or continuity sub-metric but NONE bought sustained P1 uncertainty — the front stayed
  decided. **Why dead:** authored density/cast is still a decided race (Lesson 185); action needs a live
  undecided re-roll window, which the admission side cannot create without a runtime force. Proof:
  reports/evolution/ACTION-BUILD-4.md … ACTION-BUILD-7.md + ACTION-NIGHT-1.md (the overnight confirm).
- **Band-corridor / free-band family (ACTION-FREEBAND-1/2) — DEAD, preregistered closure honored.** Make
  racers reach their drawn band by a positional corridor: a HARD wall pinned the band but crushed the contest
  (frontContest 28–36% vs ship 42–68%) and still fell below ship arrival; a SOFT spring leaked arrival off a
  cliff (69→46%) without raising the contest. The dial is a **CLIFF, not a slope** (Lesson 184). **Why dead:**
  any post-dice positional force is an opponent force. The preregistered gate (arrival ≥ ship+10 with contest
  within 10pp and DEAD-BORING ≤ ship) was met by NO cell, so the line auto-closed. Proof:
  reports/evolution/ACTION-FREEBAND-1.md + ACTION-FREEBAND-2.md. (Superseded by the WORKING sign of the same
  goal: bias the DRAW, not the position — shipped as COMBO15.)
- **Choreo-release family (CHOREO-RELEASE-1/2) — DEAD, three confirmations.** Lift the frozen-budget
  constraint and RELEASE each racer to the ship's re-roll once it reaches home. Arrival-SAFE (band-hold worked,
  80/75% at AT90) but the finish stayed DEAD-BORING because the outcome was already decided; the time-curve ran
  the WRONG way (more dice time → more dead-boring), and a strong-steer variant confirmed it a third time.
  **Why dead:** a decided race is flat however its motion is released (Lesson 185). Proof:
  reports/evolution/CHOREO-RELEASE-1.md + CHOREO-RELEASE-2.md.
- **Boost-side steer cap (STEER-CAP-1) — DEAD, backfired 6/6.** Cap the chaos-steer upper clamp to shrink
  space-sprint's chaos hole. It WIDENED the gap on all three tracks at both caps. **Why dead:** the chaos
  P1–P2 gap is set by the chasers' climb, not the leader's knob — throttling the boost slows the pursuers
  (Lesson 189, the Wrong-Lever Law). The space-sprint residual (~1.6× ship) is documented as accepted, not
  chased with this lever. Proof: reports/evolution/STEER-CAP-1.md.
- **Blind A/B viewer (`?eye=A/B`) — DEAD tooling, replaced by the proof-of-live standard.** A coin-flip
  blind-mapping URL switch for owner eye-tests. It never armed twice: path-navigation dropped the query before
  mount, and the injected flags never passed raceCore's plan whitelist (silent no-op). **Why dead:** a viewer
  with no liveness assertion is indistinguishable from a no-op (Lesson 187); cost two evenings. Replaced by the
  proof-of-live triple (badge + console + runtime assertion) and, going forward, DevScreen presets over the
  real config keys — NOT a `?world`/`?eye` URL hack. Proof: reports/evolution/EYE-SETUP-2.md.

## H. Avoidance feel — proposals closed by owner (2026-07-31)

The RACER-FLAPPING / RACER-MOTION line shipped two keepers (margin hysteresis `softSteeringObstacleMargin` 0.5,
lateral acceleration cap `maxLateralAccelPerStep` 0.0005). Two related avoidance ideas are CLOSED:

- **Ease the hard-separation push (the "glide-apart" proposal) — CLOSED by owner decision, 2026-07-31.**
  RACER-MOTION-1 identified the hard-separation non-penetration pass (direct `physicalY` writes) as the dominant
  lateral-jerk source and proposed rate-limiting it so overlapping racers glide apart instead of stepping.
  **Why closed:** the owner declined the trade — _"without it we get far too many overlaps."_ The non-penetration
  safety stays UNTOUCHED; the acceptable Sanftheit win (the integrator acceleration cap) was taken instead, and it
  is provably fairness-neutral (HOLM-300-COMBINED). Reopening the hard-separation trade is the **owner's call
  alone**. Proof: reports/evolution/RACER-MOTION-1.md, RACER-MOTION-2.md.
- **The 0.4 s fixed timer for avoidance commitment — EARNED KILL.** RACER-FLAPPING-1 shipped a 24-frame
  side-commit to stop the traffic left-right flap. **Why dead:** it fixed the one targeted racer (Arrow 17→0
  reversals) but synchronised the FIELD — dramatic flappers rose 1→6 — because a shared clock couples agents that
  must be independent. Replaced by per-agent geometric margin hysteresis (RACER-FLAPPING-2). Cross-reference
  **Lesson 190** (the Synchronization Law). Proof: reports/evolution/RACER-FLAPPING-1.md.

## I. The camera unit redefined as a fraction of each track's own width (2026-08-05)

**The idea, and it is a good one.** `visibleCorridors: 1.0` should mean "one width of _this_ road",
not "one fixed 300 px reference". It makes the number mean the same THING everywhere, it is what the
owner originally assumed it meant, and it removes the oddity that a narrow track shows more than two
of its own road widths at his LEADER 1.0.

**Built as a probe and measured.** No code change was even needed to test it — `referenceWidthFor`
returns `max(referenceCorridorPx, trackWidthPx)`, so setting the reference to each track's own width
IS his unit, expressed in the shipped config.

**KILLED BY THE OWNER'S EYE, for a reason no measurement here would have produced.** He ran it on
searound at the values his unit delivers (LEADER 0.62 / OVERVIEW 1.25) and rejected it: **a smaller
window means the world moves through it faster, and the picture became restless.** The fixed
reference has a virtue nobody had written down — a fixed amount of world means the same SENSE OF
CAMERA SPEED on all ten tracks. See Lesson 200.

**The measurements agreed with him afterwards, on a different axis:** under his unit the breathing
got _worse_ on every track (searound 1.000x -> 2.032x, and the corridor guarantee went from binding
0% of frames to 100%), and racer-size spread widened from 1.500x to 2.132x. But the measurements were
run because he had already rejected it; they did not find it.

**Why this is recorded rather than forgotten.** It is the obvious proposal, it will occur to the next
person within a month, and its flaw is invisible from the code — it lives entirely in how the result
FEELS. What shipped instead was Lesson 199's fix: keep the unit, and stop the road overruling him.

## J. Counting finished racers as company at the finish (2026-08-05)

**The idea, and it is a natural one — expect it to be proposed again.** `companyGuarantee` skips
finished racers (`if (!r || r.finished) continue;`). At the finish 32–38 of 39 are home, so a promise
named "do not show emptiness" computes against 1–7 racers while the screen is full, and widens the
shot for a single back-marker. The obvious repair is to let finished racers COUNT: then the promise
satisfies itself once enough are home, with no finish-specific special case.

**MEASURED, AND IT IS WORSE.** On the owner's marked race and on dirt-oval:

|                                  | widening frames |              widest |
| -------------------------------- | --------------: | ------------------: |
| baseline                         |         54 / 58 |     2.9752 / 2.9592 |
| finished racers count as company |     **55 / 59** | **2.8760 / 2.8443** |

**WHY, and this is the part to remember.** The anchor in FINISH_OVERVIEW is the FIXED lookback point
— `finishOverviewLookbackPx` behind the line — not the field. Finished racers run out _away_ from
that point exactly as stragglers fall _back_ from it, so including them adds more distant company
rather than nearer company. The idea assumes the anchor sits where the racers are; it deliberately
does not, and that is the whole reason the finish shot works.

**What was shipped instead** (FINISH-COMPANY-1, the owner's own proposal): the guarantee stops
applying once the leader plus `minRacersVisible` are home — 0 widening frames on both tracks.

## K. The corridor overlay — a Dev Screen picture to settle where the track is (2026-08-09)

**What was built.** `corridorOverlay.js`, a Dev Screen overlay (default OFF) that drew the LOGICAL
corridor and a cross on the frame centre, with its own `defaults.js` key, a Dev Screen toggle and a
hook in `renderRaceFrame`. The point was to answer a dispute the numbers could not settle: on
river-run, is the camera actually leaving the track, or does it only look that way?

**Why it was dropped.** It never delivered the deciding picture — the background did not blit in the
capture and the red edges still did not draw — so it claimed no verdict, and the owner dropped it
rather than spend another block making a diagnostic work. **The code is preserved at
`archive/corridor-overlay-1` (`4dbfba8c`) and nowhere else**; its findings are on master as
[CORRIDOR-OVERLAY-1](../reports/night/CORRIDOR-OVERLAY-1.md) and
[CEREMONY-REGRESSION-BISECT-1](../reports/night/CEREMONY-REGRESSION-BISECT-1.md).

**THE QUESTION IT WAS BUILT FOR IS STILL OPEN, and this is the part that matters.** It found a real
factor of two before it was dropped: `EditorShape.getPosition(t, offset)` treats the offset as
NORMALISED against `track.width`, so the same `width: 300` is a **FULL** width to the physics and the
camera (a racer at 0.5 sits 150 px out; the camera divides by two) and a **HALF** width to the code
that draws the track edges (`getPosition(0, 1.0)` reaches 300 px). **A guarantee expressed in track
widths may therefore be keeping a promise about a corridor the viewer cannot see** — which would make
every "world in shot" number mean one thing to the camera and another to the eye.

That is not a dead end; it is an unanswered question with a strong lead. **Whoever picks it up should
start from `archive/corridor-overlay-1`, not from scratch** — the overlay is 90 % of a working
instrument, and the two reports inventory what was already ruled out.

## L. Neighbour-limited pair loop by a sorted t-window (2026-06-06, reverted `fb988587`)

**What was built.** Report [08-neighbor-pairloop](../reports/perf/08-neighbor-pairloop.md): the pair
loop sorted the field by `t` each step and evaluated only pairs inside a window `T_WINDOW = 0.09`,
with the pair body wrapped in an `evalPair` closure so the walk could be done in two passes.

**Why it was dropped.** Measured against the baseline frame log at 70 racers on Space Sprint and it
**REGRESSED**: mean +0.73 ms, P90 +2.35 ms, max +3.39 ms, worst spike run 16 → 43 frames. The cause
was named at the time: the per-step sort and the closure cost more than the window saved, because in
a dense pack `T_WINDOW = 0.09` selected essentially the whole field, so the T-break fired on zero
pairs while every pair still paid for the machinery.

**DO NOT READ THIS AS "WINDOWING THE PAIR LOOP IS DEAD", and this is the whole reason the entry is
here.** It is evidence about THAT window and THAT implementation, and all three of its premises have
since changed:

- **The window was 9–45× too wide.** `T_WINDOW = 0.09` was derived from the mixed-unit avoidance
  metric, which **no longer exists** — `8292d9db` replaced it with the two-axis geometric gate. The
  bound re-derived against today's gate is 0.002–0.010 depending on track length.
- **It had no Y axis, and the Y axis is the strong one.** Measured in
  [PAIR-REACH-ANALYSIS](../reports/night/PAIR-REACH-ANALYSIS.md): at 100 racers the t-axis alone
  leaves 18 % of pairs, t AND y together leave 3.4 %. This project had in fact already shipped a
  Y-rejection once (`8bd7180`, reports 11 and 12) and lost it in the same refactor.
- **The sort is already paid for.** SIDE-FREE-CULL-1 builds a `tFrac`-sorted index every step for
  `isSideFree`, at 0.83 % of the step — and a prefilter that keeps the original loop order does not
  need the index at all, only two scalars and two `continue`s. No closure either.

**The successor SHIPPED the same night this entry was written** — see
[PAIR-PREFILTER-1](../reports/night/PAIR-PREFILTER-1.md), a two-axis field bound proven a strict
superset of both gates, world fingerprint byte-identical. A reader who finds the 2026-06 failure
must find this paragraph with it, which is why both are named here.

## M. Framing the finish line during the run-in — what actually died, corrected 2026-08-12

**THIS ENTRY WAS WRONG FOR ONE DAY AND THE CORRECTION IS THE USEFUL PART.** Written the morning of
2026-08-12, it concluded "do not re-propose bounding somebody else's shot" and recommended a
dedicated RUN_IN camera state instead. By that evening the state shape had been measured, found to
reach only 14.9% / 18.5% of the endgame, and REPLACED by a bound on somebody else's shot — which
now works. The entry is rewritten rather than appended to because leaving the wrong exclusion
standing would have banned the thing that shipped.

**WHAT WAS ACTUALLY TRIED, in order:**

1. **An UNANCHORED zoom ceiling** (`feat/finish-framed` `6e94a086`, never merged). A
   `pointGuarantee` on the finish line applied from `endgameThreshold` to whatever state was
   running. **FAILED, three times, finally emptying the frame of racers for 51 consecutive frames
   on Luger Hill seed 9** with the camera centre still a healthy 0.62 track widths from the spine.
2. **A dedicated RUN_IN camera STATE** (RUNIN-STATE-1). Fixed the emptiness structurally — a
   LEADER-family state has an anchor — but **REACHED ALMOST NONE OF THE ENDGAME**: 14.9% of the
   window on Luger Hill, 18.5% on Searound, and no frames at all in 3 of 8 races on each track,
   because the endgame lock is consulted only when `decideTransition` permits a transition and a
   shot entered just before the threshold holds its own gate across it. It would also have
   **suppressed the photo-finish slow motion**, which RaceScreen triggers off `hudState`.
3. **The bound again, ANCHORED** (RUNIN-OWNS-1) — SHIPPED. Same ceiling, applied to whatever state
   is running, plus the one repair the trace in step 1 identified.

**SO THE DEAD END IS NARROWER THAN IT LOOKED, AND THIS IS THE LESSON.** The ceiling was never the
defect. **A large zoom change delivered during the `tracking` phase inside a state whose
`_focusAnchorRacer` returns null is the defect** — the zoom-about-the-anchor correction
(CAMERA-SIDEJUMP-1) is skipped there, so the pan target runs away from the pan lerp at
`worldPos x axisScale x dZoom` per frame. Measured: the pan target was CORRECT on every empty
frame while the delivered offset trailed it by 535 -> 1115 px. The magnitude scales with
`|world position| x axis scale`, which is why it was fatal on an open track (axis 1.5) and
invisible on a closed one (axis 0.42). Pointing that one correction at the framing anchor took 51
empty frames to **0** with the ceiling untouched.

**TWO THINGS THAT OUTLIVE THIS ENTRY.** The **glide** is what makes a big zoom change safe — it
moves pan and zoom on one ease, so the anchor is framed consistently by construction; master does a
LARGER 2.13 -> 4.00 change at the PHOTO_FINISH seam inside a glide and it costs nothing. And **"the
camera centre is near the track" does not mean the camera is pointed at the race**: that excursion
was ALONG the track, so the centre metric read 0.62 track widths while the frame held zero racers.

**STILL DEAD, and do not re-propose:**

- **A wide-end bound on the line requirement taken from the FIELD's own extent.** At the endgame the
  field is strung out over most of the track, so it is far wider than any shot and on an open track
  binds nothing at all. Principled to read, weak to measure.
- **A wide-end bound at OVERVIEW's width.** It binds HARD and costs the design its point: measured,
  it pins the ceiling for the first 60% of the shot and cuts the line's in-frame share from 78.2% /
  93.1% to 26.2% / 34.0%. Kept in the record because it is the obvious next suggestion and because
  it is the one lever that would fix the Searound centre reading — it is a real trade, priced, not a
  dead end, and it is the owner's call.
- **Bounding at the projection's own minimum**, which measures IDENTICAL to no bound at all —
  `resolveCamera` already clamps there, so it would be a second authority on one question.

## N. The endgame corridor FLOOR — bounding the finish shot by the track's width (2026-08-13/14)

**`endgameCorridorFloor`, built over nine commits on `feat/front-group`, NEVER SHIPPED, and superseded
by CONTENDER-ZOOM-1.** The branch is deleted; the code is archived at the tag
`archive/front-group`, and the four FRONT-GROUP reports and `scripts/endgame-width-truth.mjs` are on
master.

**THE IDEA.** In the endgame, never let the shot close tighter than the corridor is wide — the full
width certainly shows everyone racing side by side, so a floor on the visible width should keep the
finishers in frame.

**WHY IT FAILED, and the finding is worth more than the mechanism: THE CORRIDOR IS THE WRONG QUANTITY
IN BOTH DIRECTIONS.** A corridor bound only ever constrains ACROSS the track. A zoom change moves
BOTH directions at once. The racers who leave the frame at a finish leave ALONG the road, not beside
it — **100% of the racers the floor saved left along the track** — so:

- Forcing the shot OPEN to the corridor's width did help, **but by accident**: it bought LONGITUDINAL
  room as a side effect of asking for lateral room. FRONT-GROUP-7.
- Tightening to the corridor's width — the same quantity, aimed the other way — **cost 24.4 points of
  participants-whole** (57.3% → 81.7% not whole), because it took away the very room that was holding
  them. CONTENDER-ZOOM-1 §4.

**"Showing the whole width certainly shows everyone" is FALSE in this geometry.** The finish shot's
binding dimension is longitudinal and no width-based quantity can see it.

**WHAT REPLACED IT IS NOT A CORRECTED FLOOR.** The corridor survives only as a CAP — never tighter
than the track is wide is gone; never WIDER than the track is wide remains — and the thing that
decides how far the shot closes is now the CONTENDER SET, which is a set of racers rather than a
width. Different quantity, opposite direction, different mechanism.

**Two hypotheses tested and REFUTED along the way**, recorded so they are not re-proposed: binding on
the field's actual lateral EXTENT rather than the full width cut racers rather than saving them
(0.0% → 12.0%); and padding with the DRAWN sprite instead of `_drawnBodyWidthRefPx` did not recover
them, so the body-padding gap was not what the plain floor had been paying for.

**Do not re-propose a width-based bound on the finish shot.** A longitudinal bound is a different
proposal and is not excluded by this entry.

## O. An EVEN close during the run-in — six shapes, one geometry (2026-08-16/17)

**Do not build a seventh shape for "zoom in at a uniform speed" while the ends of the close are
fixed. It is not a tuning problem and it is not an architecture problem — it is excluded by the
geometry.**

**What the owner asked for**, and it is a reasonable ask: "zoom out until the leader and the finish
line are visible, then zoom in softly, at the speed that is necessary for that particular track, but
at a UNIFORM speed — one that ought to be calculable."

**Six shapes were built and measured; five were reverted.**

| shape | what stopped it |
| --- | --- |
| RUNIN-PIN-1 — pin the line and the leader on screen, absorb the gap with zoom | the target-versus-delivered lerp: the camera cannot be commanded to a screen position |
| RUNIN-ANCHOR-1/-2 — make the line the anchor, then give it its own placement value | it works, and it costs the accepted build; no placement value has a solution on ice-track or seatrack |
| RUNIN-RATE-1 — release the hold when a calm CONSTANT rate can still make it | **this camera has no constant rate to borrow** — every sibling is a duration or a time constant |
| RUNIN-EVEN-1 — walk the zoom evenly toward `_lineCeiling` | the destination **runs away**; the walk catches it and inherits its acceleration. Cross-track spread 2.08× → **13.6×** |
| RUNIN-EVEN-2 — same walk, toward the active state's own zoom (stationary) | fixed the spread (→ 2.27×) and the walk is **invisible**: `_lineCeiling` binds on a median **91%** of closing frames |
| RUNIN-SCHEDULE-1 — schedule the line's PLACE in frame so the zoom comes out even | the schedule needs the line **outside the frame** on **9 of 9** tracks, up to **2.46×** the room ahead of the anchor |

**THE FINDING.** Keeping the line in frame requires `zoom ≤ room / needed`. `needed` falls to zero at
the crossing so that bound rises **hyperbolically**, while `room` shrinks as the leader travels
forward across the frame. **`_lineCeiling` is the BOUNDARY of the admissible set, not one option
among several — it is already the fastest close that keeps the promise.** An even close is a chord
between two fixed ends; the boundary is convex; they cross. See Lesson 208.

**BEFORE TOUCHING THE DIRECTOR FOR THIS, RUN `node scripts/diag/runin-line-schedule.mjs`.** It prices
a proposed close in the line's own units — the share of the room ahead of the anchor that the
schedule needs the line to sit at — and a share above 1 is a shape that cannot keep the promise. One
run, no production change, and it is what would have made five of the six shapes unnecessary.

**What is NOT excluded.** Moving an END of the close: opening less wide, or crossing at a wider shot.
Both flatten the chord without touching the boundary, and both are the owner's taste rather than
anything derivable — so they are a question to put to him, not a block to start.

## What this leaves open (not tried, not excluded)

Formats that make a breakaway irrelevant rather than catching it: **elimination** (last-at-call out of
contention), **sector / intermediate scoring** (winner = best across several lines), a **mandatory
re-pack / neutralization** that re-randomizes release order (start-row memory erased), or a **mandatory
detour** each racer must pay. All unproven; each must be measured against **equal win-chance by start
row**, on BOTH an open and a closed track (see the structural finding above), from one global rule.
